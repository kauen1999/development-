// src/modules/auth/next-auth.d.ts

import type { DefaultSession, DefaultUser } from "next-auth";

/**
 * Extend the built-in `Session` and `User` types.
 * Ensures that `ctx.session.user` is always fully typed.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: UserRole;
  }
}

/**
 * Reusable role type
 */
type UserRole = "USER" | "ADMIN" | "ORGANIZER";
