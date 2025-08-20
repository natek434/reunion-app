// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// middleware.ts
const PROTECTED = ["/gallery", "/family", "/dashboard", "/me", "/account"];


export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // only guard protected paths
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const signInUrl = new URL("/signin", req.url);
      // send them back after sign-in
      signInUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

// Match subpaths too
export const config = {
  matcher: ["/gallery/:path*", "/family/:path*", "/dashboard/:path*", "/me/:path*", "/account/:path*"],
};
