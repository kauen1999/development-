// src/modules/artist/artist.schema.ts
import { z } from "zod";

export const createArtistSchema = z.object({
  name: z.string().min(1, "Nome do artista é obrigatório"),
  image: z.string().url().optional(),
  bio: z.string().optional(),
  createdByUserId: z.string().cuid(),
  sessionId: z.string().cuid().optional(), 
});

export const updateArtistImageSchema = z.object({
  name: z.string().min(1, "Nome do artista é obrigatório"),
  image: z.string().url("URL inválida"),
});

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistImageInput = z.infer<typeof updateArtistImageSchema>;
