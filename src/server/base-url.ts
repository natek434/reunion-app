// lib/server/base-url.ts
import "server-only";
import { headers } from "next/headers";

export function getBaseUrlServer() {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "").trim().replace(/\/+$/, "");
  if (envUrl) {
    try { return new URL(envUrl).toString(); } catch { /* ignore */ }
  }
  const h = headers();
  const proto = (h.get("x-forwarded-proto") || "http").split(",")[0].trim() || "http";
  const host = (h.get("x-forwarded-host") || h.get("host") || "localhost:3000").split(",")[0].trim();
  return `${proto}://${host}`;
}
