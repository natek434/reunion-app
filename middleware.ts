// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readCsrfCookie, setCsrfCookie } from "@/lib/csrf"; // the Edge-safe helpers

// Only base prefixes for auth-gating; CSRF cookie is handled for ALL GETs below
const PROTECTED = ["/gallery", "/family", "/albums", "/dashboard", "/me", "/account"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // (A) Ensure CSRF cookie exists on every GET (site-wide)
  if (req.method === "GET") {
    const res = NextResponse.next();
    const existing = readCsrfCookie(req);
    if (!existing) setCsrfCookie(res); // sets SameSite=Lax; httpOnly=false; secure in prod
    return res;
  }

  // (B) Auth-gate protected sections
  if (PROTECTED.some((base) => pathname.startsWith(base))) {
    const { getToken } = await import("next-auth/jwt");
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const signInUrl = new URL("/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets so all pages (incl. /event) get the CSRF cookie
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|site.webmanifest|sitemap.xml).*)",
  ],
};
