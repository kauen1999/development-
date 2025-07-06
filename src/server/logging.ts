import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const isServer = typeof window === "undefined";

/**
 * Global Pino logger instance.
 * 
 * - Pretty-printed logs in development (server-side only)
 * - Structured JSON logs in production
 */
export const logger = isDevelopment && isServer
  ? pino({
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
      level: "debug",
    })
  : pino({
      level: "info",
      formatters: {
        level(label) {
          return { level: label };
        },
        bindings(bindings) {
          return {
            pid: bindings.pid,
            hostname: bindings.hostname,
          };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });

/**
 * Standardized logging functions.
 * 
 * Usage:
 *   log.info("User created", { userId });
 *   log.error("Payment failed", { error });
 */
export const log = {
  info: (message: string, data?: object) => logger.info(data ?? {}, message),
  warn: (message: string, data?: object) => logger.warn(data ?? {}, message),
  error: (message: string, data?: object) => logger.error(data ?? {}, message),
  debug: (message: string, data?: object) => logger.debug(data ?? {}, message),
};
