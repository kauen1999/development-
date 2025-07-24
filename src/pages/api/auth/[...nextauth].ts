// src/pages/api/auth/[...nextouth].ts
import NextAuth from "next-auth";
import { authOptions } from "../../../modules/auth/auth-options";
export default NextAuth(authOptions);
