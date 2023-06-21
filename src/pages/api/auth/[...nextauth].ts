import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import LinkedInProvider from "next-auth/providers/linkedin";
import CredentialsProvider from "next-auth/providers/credentials";
// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { env } from "../../../env/server.mjs";
import { prisma } from "../../../server/db/client";
import { compare } from "bcryptjs";

interface SignIn {
  user: {
    /** The user's postal address. */
    address: string;
  };
}

export const authOptions: NextAuthOptions = {
  // Include user.id on session
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (user.email) {
        console.log("existing user signed in");
        return true;
      } else {
        console.log("brand new user signed in");
        console.log("SignIn else (Account):", account);
        console.log("SignIn else (User):", user);
        return { redirect: { destination: "newUser" } };
      }
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  // Configure one or more authentication providers
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      async authorize(credentials, req) {
        if (credentials) {
          const result = await prisma.user.findFirst({
            where: { email: credentials.email },
          });

          console.log(result);

          if (!result) {
            throw new Error("Usuario no encontrado por favor registrate");
          }

          const checkPassword = await compare(
            credentials.password!,
            result.password
          );

          if (!checkPassword || result.email !== credentials.email) {
            throw new Error("El usuario o contraseña no coinciden");
          }

          if (result) {
            return result;
          } else {
            return null;
          }
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    newUser: "/auth",
  },
};

export default NextAuth(authOptions);
