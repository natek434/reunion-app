"use client";

/** Read a cookie value in the browser (URL-safe). */
export function getCookie(name: string): string | null {
  // Escape any regex metacharacters in the cookie name
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match start of string or ";", optional spaces, then name=VALUE until the next ";"
  const pattern = new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`);
  const match = document.cookie.match(pattern);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Ensure a CSRF token exists in cookies and return it.
 * If missing, it fetches /api/csrf (which sets the cookie) and returns the token.
 */
export async function ensureCsrfToken(): Promise<string> {
  let t = getCookie("csrf-token");
  if (t) return t;

  const res = await fetch("/api/csrf", { method: "GET", cache: "no-store" });
  if (res.ok) {
    // API returns { token } and also sets the cookie
    const data = await res.json().catch(() => ({}));
    t = (data && data.token) || getCookie("csrf-token") || "";
  } else {
    // final attempt: maybe the cookie was set anyway
    t = getCookie("csrf-token") || "";
  }
  return t;
}

/**
 * Optional convenience wrapper: do a fetch that always includes X-CSRF-Token.
 * If you pass a FormData body, it won't set Content-Type (browser will).
 */
export async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await ensureCsrfToken();
  if (!token) throw new Error("Missing CSRF token");

  const headers = new Headers(init.headers || {});
  if (!headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", token);

  // Set Content-Type for JSON bodies when not already set
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isFormData && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}
