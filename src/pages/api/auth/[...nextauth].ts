import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import LinkedInProvider from "next-auth/providers/linkedin";
// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { env } from "../../../env/server.mjs";
import { prisma } from "../../../server/db/client";

import { trpc, type RouterOutputs } from "../../../utils/trpc";

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
        console.log(account);
        console.log(user);
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
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
    // ...add more providers here
  ],
  pages: {
    newUser: "/auth",
  },
};

export default NextAuth(authOptions);
