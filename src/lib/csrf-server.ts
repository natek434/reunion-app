// src/lib/csrf-server.ts
import type { NextRequest } from "next/server";
import { cookies as nextCookies } from "next/headers";

type AnyReq = Request | NextRequest;
const CSRF_COOKIE = "csrf-token";

/** Read CSRF cookie, awaiting Next.js dynamic API when available. */
export async function readCsrfFromReq(req: AnyReq): Promise<string | null> {
  // Preferred: Next's request-scoped cookie store
  try {
    const store = await nextCookies(); // <-- MUST await in route handlers
    return store.get(CSRF_COOKIE)?.value ?? null;
  } catch {
    // Fallback: parse Cookie header (useful in tests, odd contexts)
    const raw = req.headers.get("cookie") ?? "";
    const m = raw.match(/(?:^|; )csrf-token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

/** Throw if CSRF header/cookie missing or mismatched for mutating methods. */
export async function assertCsrf(req: AnyReq): Promise<void> {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const header = req.headers.get("x-csrf-token");
  const cookie = await readCsrfFromReq(req);
  if (!header || !cookie || header !== cookie) {
    throw new Error("Invalid CSRF token");
  }
}

/** Wrapper to enforce CSRF on POST/PATCH/DELETE handlers. */
export function withCsrf<TCtx = any>(
  handler: (req: AnyReq, ctx: TCtx) => Promise<Response>
): (req: AnyReq, ctx: TCtx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      await assertCsrf(req);
    } catch {
      return new Response("Forbidden", { status: 403 });
    }
    return handler(req, ctx);
  };
}
