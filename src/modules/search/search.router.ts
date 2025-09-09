// src/modules/search/search.router.ts
import { router, publicProcedure } from "@/server/trpc/trpc";
import { searchInputSchema } from "./search.schema";
import { getAvailableCities, searchGlobal } from "./search.service";

export const searchRouter = router({
  getAvailableCities: publicProcedure.query(() => getAvailableCities()),
  global: publicProcedure
    .input(searchInputSchema)
    .query(({ input }) => searchGlobal(input)),
});
