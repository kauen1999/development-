import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/server/db/client";
import { z } from "zod";

const createEventSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  salesStartsAt: z.string().datetime(),
  salesEndsAt: z.string().datetime(),
  capacity: z.number().min(1),
  organizerId: z.string().cuid("Invalid organizer ID"),
});

export default async function createEventHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const input = createEventSchema.parse(req.body);

    const organizerExists = await prisma.user.findUnique({
      where: { id: input.organizerId },
    });

    if (!organizerExists || organizerExists.role !== "ORGANIZER") {
      return res.status(400).json({ message: "Invalid organizer" });
    }

    const event = await prisma.event.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        salesStartsAt: new Date(input.salesStartsAt),
        salesEndsAt: new Date(input.salesEndsAt),
        capacity: input.capacity,
        organizerId: input.organizerId,
      },
    });

    return res.status(201).json({ event });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: err.errors });
    }

    console.error("Create event error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
