// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

// Rotas públicas (não exigem sessão)
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/favicon.ico",
  "/_next",
  "/.well-known",
  "/auth",

  // tRPC públicos usados na home/listagens
  "/api/trpc/auth.register",
  "/api/trpc/event.list",
  "/api/trpc/event.listByDate",
  "/api/trpc/event.getById",

  // ✅ Fluxo de recuperação de senha (páginas e endpoints)
  "/forgot-password",
  "/reset-password", // página que lê ?token=...
  "/api/auth/password-reset/request",
  "/api/auth/password-reset/confirm",
];

const PROTECTED_PATHS = ["/checkout", "/pagamento", "/buydetails"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}
function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname.startsWith(p));
}

type AppJWT = JWT & { profileCompleted?: boolean };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Libera todas as rotas de API (inclui /api/trpc e webhooks)
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // ✅ Libera rotas públicas explícitas
  if (isPublic(pathname)) return NextResponse.next();

  // ✅ Checa sessão (NextAuth JWT)
  const raw = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const token = raw as AppJWT | null;

  // Sem sessão → manda pro /login com callbackUrl
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Em páginas protegidas, exige perfil completo
  if (isProtected(pathname) && !Boolean(token.profileCompleted)) {
    const redirectUrl = new URL("/auth", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// ✅ Aplica em tudo, exceto assets estáticos
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.well-known).*)"],
};
