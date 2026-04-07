import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const pathname = request.nextUrl.pathname;

  const publicPaths = ["/", "/api/auth", "/login", "/register"];
  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(path));

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (token && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};