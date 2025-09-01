// lib/with-rate-limit.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ipFromHeaders, rateHeaders, rateLimit } from "./rate-limit";

type Handler<TCtx = any> = (req: NextRequest, ctx: TCtx) => Promise<Response>;

export function withRateLimit<TCtx = any>(cfg: {
  name: string;
  limit: number;
  windowMs: number;
  // build a key per request (user or ip)
  key: (req: NextRequest, ctx: TCtx) => Promise<string> | string;
}) {
  return (handler: Handler<TCtx>): Handler<TCtx> => {
    return async (req, ctx) => {
      const key = await cfg.key(req, ctx);
      const res = await rateLimit({ name: cfg.name, key, limit: cfg.limit, windowMs: cfg.windowMs });
      if (!res.ok) {
        const h = rateHeaders(res);
        return new NextResponse(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: h });
      }
      const out = await handler(req, ctx);
      // attach informational headers on success too
      res.ok = true;
      const h = rateHeaders(res);
      h.forEach((v, k) => out.headers.set(k, v));
      return out;
    };
  };
}

// Common key builders
export async function keyByUserOrIp(req: NextRequest) {
  // If you use next-auth, you can read the session in the route and pass userId in ctx
  return ipFromHeaders(req.headers); // default
}
