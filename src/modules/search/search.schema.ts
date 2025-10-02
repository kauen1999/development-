  // src/modules/search/search.schema.ts
  import { z } from "zod";

  export const searchInputSchema = z.object({
    query: z.string().optional(),
    city: z.string().optional(),
  });

  export type SearchInput = z.infer<typeof searchInputSchema>;
