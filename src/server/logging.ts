import pino from "pino";

export const logger = pino


// ({
//   level: process.env.NODE_ENV === "production" ? "info" : "debug",
//   transport:
//     process.env.NODE_ENV !== "production"
//       ? {
//           target: "pino-pretty", // ✅ corrige abaixo se isso ainda der erro
//           options: {
//             colorize: true,
//           },
//         }
//       : undefined,
// });