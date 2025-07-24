// src/utils/trpc.ts
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";
// ATENÇÃO: devtoolsLink só em dev!
import { devtoolsLink } from "trpc-client-devtools-link";
import { type AppRouter } from "../server/trpc/router/_app";

// Função para definir a URL base (SSR/client/produção)
const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // Browser usa o relativo
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

export const trpc = createTRPCNext<AppRouter>({
  config() {
    // Links da chain do tRPC: só usa devtools em dev
    const links = [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
      }),
    ];

    // Só inclui o devtoolsLink em ambiente de desenvolvimento
    if (process.env.NODE_ENV === "development") {
      links.unshift(devtoolsLink());
    }

    return {
      transformer: superjson,
      links,
    };
  },
  ssr: false, // Mantém SSR desabilitado (comum em SPA Next.js + tRPC)
});

/**
 * Inference helper for inputs
 * @example type HelloInput = RouterInputs['example']['hello']
 **/
export type RouterInputs = inferRouterInputs<AppRouter>;
/**
 * Inference helper for outputs
 * @example type HelloOutput = RouterOutputs['example']['hello']
 **/
export type RouterOutputs = inferRouterOutputs<AppRouter>;
