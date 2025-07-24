// src/pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth";
import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import LinkedInProvider from "next-auth/providers/linkedin";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/server/db/client";
import { env } from "@/env/server.mjs";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
    }),
    LinkedInProvider({
      clientId: env.LINKEDIN_CLIENT_ID,
      clientSecret: env.LINKEDIN_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Credenciais inválidas.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        console.log("Tentando login com:", credentials);
        console.log("Usuário encontrado:", user);
        console.log("Senha salva no banco:", user?.password);

        if (!user || !user.password) {
          throw new Error("Usuário ou senha incorretos.");
        }

        const passwordMatches = await compare(
          credentials.password,
          user.password
        );
        if (!passwordMatches) {
          throw new Error("Usuário ou senha incorretos.");
        }

        // Retorne todos os campos do usuário exatamente como vêm do banco
        // mas garanta que id, email, name sejam sempre string
        return {
          ...user,
          id: String(user.id),
          email: user.email || "",
          name: user.name || "",
          image: user.image || "",
        };
      },
    }),
  ],
  pages: {
    newUser: "/auth",
  },
  callbacks: {
    async signIn({ user }) {
      return !!user.email;
    },
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = (user?.id || token?.sub || "") as string;
        session.user.role = user?.role || token?.role;
      }
      return session;
    },
  },
  secret: env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
