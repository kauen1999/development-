import { Context } from "../trpc/context";

export const findNewAccountNotification = async (
  ctx: Context,
  title: string,
  userId: string
) => {
  const notification = await ctx.prisma.notification.findFirst({
    where: {
      userId: userId,
      title: title,
    },
  });

  console.log("Dentro de la funcion findNewAccountNotification:", notification);

  if (notification?.title == "¡Acabas de crear tu cuenta con exito!") {
    return true;
  }
};
