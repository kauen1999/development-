import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const isLocal = typeof window === "undefined" && isDev;

export const logger = isLocal
  ? pino({
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    })
  : pino(); // Produção: sem transport para evitar erro
