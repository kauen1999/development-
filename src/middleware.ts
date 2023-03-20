import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export { default } from "next-auth/middleware";

export async function middleware(req: NextRequest) {
  console.log("Works middleware");

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout/:path*"],
};
