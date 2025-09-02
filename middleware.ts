// middleware.ts (TEMP with debug headers)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readCsrfCookie, setCsrfCookie } from "@/lib/csrf";

const PROTECTED = ["/gallery", "/family", "/albums", "/dashboard", "/me", "/account"];

async function readAuthToken(req: NextRequest) {
  const { getToken } = await import("next-auth/jwt");
  const secret = process.env.NEXTAUTH_SECRET;

  // Try v5 cookie name
  let token = await getToken({
    req,
    secret,
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  });

  // Fallback to v4 cookie name
  if (!token) {
    token = await getToken({
      req,
      secret,
      cookieName:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
    });
  }
  return token;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const res = NextResponse.next();

  // CSRF cookie on all GETs
  if (req.method === "GET") {
    const existing = readCsrfCookie(req);
    if (!existing) setCsrfCookie(res);
  }

  // Debug what cookies/secret middleware sees
  const cookieHeader = req.headers.get("cookie") || "";
  res.headers.set("x-mw-cookie-names", cookieHeader.split(";").map(s => s.trim().split("=")[0]).join(","));
  res.headers.set("x-mw-has-secret", process.env.NEXTAUTH_SECRET ? "yes" : "no");

  if (PROTECTED.some((base) => pathname.startsWith(base))) {
    const token = await readAuthToken(req);
    res.headers.set("x-mw-has-token", token ? "yes" : "no");

    if (!token) {
      const callback = `${pathname}${search || ""}`;
      const signInUrl = new URL("/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", callback);
      return NextResponse.redirect(signInUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|site.webmanifest|sitemap.xml|api/auth).*)"],
};
