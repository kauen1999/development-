// src/modules/auth/auth-options.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../server/db/client";
import { AuthService } from "./service";
import type { UserRole } from "@/types/next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await AuthService.validateCredentials(credentials.email, credentials.password);
        if (!user) return null;
        const profileCompleted = await AuthService.isProfileComplete(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileCompleted,
          image: user.image ?? "/imagens/perfil-de-usuario.webp"
        };  
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.profileCompleted = user.profileCompleted;
        token.image = user.image ?? "/imagens/perfil-de-usuario.webp";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.profileCompleted = token.profileCompleted as boolean;
        session.user.image = (token.image as string) ?? "/imagens/perfil-de-usuario.webp";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
