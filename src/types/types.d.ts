// src/types/types.d.ts
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN"  | "PROMOTER" | "FINANCE" | "SUPPORT";
  photo?: string;
  createdAt: string;
  updatedAt: string;
}
