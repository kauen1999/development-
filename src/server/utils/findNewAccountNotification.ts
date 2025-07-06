// src/server/utils/findNewAccountNotification.ts

import type { Context } from "../trpc/context";

const NEW_ACCOUNT_TITLE = "You have successfully created your account!";

// Checks whether a user has already received the new account creation notification.
export const findNewAccountNotification = async (
  ctx: Context,
  title: string,
  userId: string
): Promise<boolean> => {
  const notification = await ctx.prisma.notification.findFirst({
    where: {
      userId,
      title,
    },
  });

  return notification?.title === NEW_ACCOUNT_TITLE;
};
