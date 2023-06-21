import { prisma } from "../db/client";
import { Prisma, User } from "@prisma/client";

export const createUser = async (input: Prisma.UserCreateInput) => {
  return (await prisma.user.create({
    data: input,
  })) as User;
};
