import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: "ADMIN" | "USER";
    profileCompleted: boolean;
  }

  interface Session {
    user: {
      id: string;
      role?: "ADMIN" | "USER";
      profileCompleted: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: "ADMIN" | "USER";
    profileCompleted: boolean;
  }
}
