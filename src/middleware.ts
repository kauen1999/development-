// src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      if (!token) return false;
      if (token.role === "ADMIN") return true; // Admin nunca bloqueia
      return Boolean(token.profileCompleted);
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/checkout/:path*", "/comprar/:path*"],
};
