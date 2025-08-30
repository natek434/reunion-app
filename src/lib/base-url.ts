// lib/base-url.ts
import { headers } from "next/headers";

export function getBaseUrl() {
  // Prefer explicit env; fallback to request headers for dev
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
