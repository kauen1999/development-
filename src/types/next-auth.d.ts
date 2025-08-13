// src/types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";
import type { Role } from "@prisma/client";

type ExtraUserFields = {
  id: string;
  role: Role;
  profileCompleted: boolean;
};

declare module "next-auth" {
  interface Session {
    user: ExtraUserFields & DefaultSession["user"];
  }

  interface User extends DefaultUser, ExtraUserFields {}
}

declare module "next-auth/jwt" {
  interface JWT extends ExtraUserFields {
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  }
}
