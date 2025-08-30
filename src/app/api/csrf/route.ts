// src/app/api/csrf/route.ts
import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";

export async function GET() {
  const CSRF_COOKIE = "csrf-token";
  const store = await nextCookies();
  let token = store.get(CSRF_COOKIE)?.value || null;

  if (!token) {
    // Generate token using Web Crypto (Edge-safe)
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    token = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");

    // Set cookie on the response
    const res = NextResponse.json({ token });
    res.cookies.set({
      name: CSRF_COOKIE,
      value: token,
      path: "/",
      sameSite: "strict",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }

  return NextResponse.json({ token });
}
