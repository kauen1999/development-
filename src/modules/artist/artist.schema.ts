import { z } from "zod";

export const createLocalArtistSchema = z.object({
  name: z.string().min(1),
  image: z.string().url().optional(),
  bio: z.string().optional(),
  createdByUserId: z.string().cuid(),
});

export const promoteArtistSchema = z.object({
  artistId: z.string().cuid(),
});

/** ✅ novo: atualizar banner (image) do artista */
export const updateArtistImageSchema = z.object({
  name: z.string().min(1, "Nome do artista é obrigatório"),
  image: z.string().url("URL inválida"),
});

export type UpdateArtistImageInput = z.infer<typeof updateArtistImageSchema>;
