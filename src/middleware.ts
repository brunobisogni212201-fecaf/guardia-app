import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/privacy"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/geo/heatmap"];
const PROTECTED_PATHS = ["/dashboard", "/analyze", "/buscas"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const pathname = request.nextUrl.pathname;

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isPublicPrefix = PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
  const isProtectedPath = PROTECTED_PATHS.some(p => pathname.startsWith(p));

  if (!token && (isProtectedPath || pathname.startsWith("/dashboard") || pathname.startsWith("/analyze"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (token && (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
