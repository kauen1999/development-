// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/favicon.ico",
  "/_next",
  "/.well-known", // ex: devtools
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NUNCA intercepte as rotas do NextAuth
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Libere caminhos públicos
  if (isPublic(pathname)) return NextResponse.next();

  // Exemplo simples: se não tem token, mande pra /login com callback
  const hasToken = req.cookies.has("next-auth.session-token") || req.cookies.has("__Secure-next-auth.session-token");
  if (!hasToken) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Evite interceptar tudo: exclua api/auth, estáticos etc.
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.well-known).*)",
  ],
};
