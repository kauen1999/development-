import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { CreateUserInput } from "../schema/user.schema";
import { createUser } from "../services/user.service";

export const registerHandler = async ({
  input,
}: {
  input: CreateUserInput;
}) => {
  try {
    const hashedPassword = await bcrypt.hash(input.password, 12);
    const user = await createUser({
      email: input.email,
      name: input.name,
      password: hashedPassword,
      provider: "local",
    });

    return {
      status: "success",
      data: {
        user,
      },
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Correo Electrónico Existente",
      });
    }
    throw error;
  }
};
