import type { TypeOf } from "zod";
import { object, string } from "zod";

export const createUserSchema = object({
  name: string({ required_error: "Name is required" }),
  email: string({ required_error: "Email is required" }).email("Invalid email"),
  password: string({ required_error: "Password is required" })
    .min(8, "Password must be more than 8 characters")
    .max(32, "Password must be less than 32 characters"),
  cpassword: string({ required_error: "Please confirm your password" }),
}).refine((data) => data.password === data.cpassword, {
  path: ["cpassword"],
  message: "Las contraseñas no coinciden",
});

export type CreateUserInput = TypeOf<typeof createUserSchema>;
