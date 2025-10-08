// lib/client/base-url.ts
export function getBaseUrlClient() {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (envUrl) return envUrl;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
