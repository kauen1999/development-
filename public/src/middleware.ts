// src/middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/checkout/:path*"], // Altere para os caminhos que quer proteger!
};
