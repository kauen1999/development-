import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { findNewAccountNotification } from "@/server/utils/findNewAccountNotification";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const notificationRouter = createTRPCRouter({
  /**
   * Delete a notification by ID (only for logged-in user)
   */
  deleteNotification: protectedProcedure
    .input(z.object({ id: z.string().cuid("Invalid notification ID") }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Create a new notification (blocks duplicate welcome message)
   */
  createNotification: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { title, description } = input;
      const userId = ctx.session.user.id;

      if (title === "¡Acabas de crear tu cuenta con exito!") {
        const isBlocked = await findNewAccountNotification(ctx, title, userId);
        if (isBlocked) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Duplicate welcome notification blocked." });
        }
      }

      return ctx.prisma.notification.create({
        data: {
          title,
          description,
          userId,
        },
      });
    }),

  /**
   * Get all notifications for the logged-in user (newest first)
   */
  getAllNotifications: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
});
