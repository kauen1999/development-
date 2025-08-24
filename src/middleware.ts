// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/favicon.ico",
  "/_next",
  "/.well-known",
  "/auth",
  "/api/trpc/auth.register",
  "/api/trpc/event.list",
  "/api/trpc/event.listByDate",
  "/api/trpc/event.getById",
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

  // ✅ Pule qualquer coisa em /api (inclui /api/webhooks e /api/trpc)
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // ✅ Libere caminhos públicos
  if (isPublic(pathname)) return NextResponse.next();

  const raw = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const token = raw as AppJWT | null;

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isProtected(pathname) && !Boolean(token.profileCompleted)) {
    const redirectUrl = new URL("/auth", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// ✅ Matcher simples: aplica em tudo, menos assets estáticos
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.well-known).*)"],
};
