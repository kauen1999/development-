// src/modules/auth/auth-options.ts

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types/next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        // Validação simples de payload
        if (
          !credentials ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        // Busca usuário no banco
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) {
          return null;
        }

        // Compara hash
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) {
          return null;
        }

        // Verifica se perfil está completo
        const profileCompleted = Boolean(
          user.dniName && user.dni && user.phone && user.birthdate
        );

        // Retorna payload que alimenta o JWT
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          profileCompleted,
          image:
            user.image ??
            "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png",
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.profileCompleted = user.profileCompleted;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.profileCompleted = token.profileCompleted as boolean;
        session.user.image = token.image as string;
      }
      return session;
    },
    async redirect({ baseUrl, url }) {
      // mantém rotas internas
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // ao tentar acessar /login com erro, manda pra /dashboard
      if (url.includes("/login")) return `${baseUrl}/dashboard`;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
