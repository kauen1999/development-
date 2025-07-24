// src/pages/api/trpc/[trpc].ts
import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter } from "@/server/trpc/router/_app";
import { createContext } from "@/server/trpc/context";
import { env } from "@/env/server.mjs";

// Handler responsável por processar todas as chamadas tRPC via /api/trpc
export default createNextApiHandler({
  router: appRouter,
  createContext,

  // Handler de erro para debug (ativado apenas em desenvolvimento)
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error, type }) => {
          console.error(`❌ [tRPC] ${type} error on "${path}": ${error.message}`);
        }
      : undefined,
});
