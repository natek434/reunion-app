// src/lib/csrf.ts
import type { NextRequest, NextResponse } from "next/server";
export const CSRF_COOKIE = "csrf-token";

export function newCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function readCsrfCookie(req: NextRequest): string | null {
  return req.cookies.get(CSRF_COOKIE)?.value ?? null;
}

export function setCsrfCookie(res: NextResponse, token = newCsrfToken()) {
  res.cookies.set({
    name: CSRF_COOKIE,
    value: token,
    path: "/",
    sameSite: "strict",
    httpOnly: true, // must be readable by client JS
    secure: process.env.NODE_ENV === "production",
  });
  return token;
}
