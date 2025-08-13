// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/favicon.ico",
  "/_next",
  "/.well-known",
  "/auth",
  "/api/trpc/auth.register"
];

const PROTECTED_PATHS = ["/checkout", "/pagamento", "/buydetails"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignora rotas internas do NextAuth
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Libera caminhos públicos
  if (isPublic(pathname)) return NextResponse.next();

  // Obtém token JWT do NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Se não logado → redireciona para login
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Se rota protegida e perfil incompleto → redireciona para /auth
  if (isProtected(pathname) && !token.profileCompleted) {
    const redirectUrl = new URL("/auth", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.well-known).*)",
  ],
};
