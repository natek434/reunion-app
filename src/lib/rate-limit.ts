// lib/rate-limit.ts
// Minimal fixed-window rate limiter with Redis (works on Vercel/Node).
// Uses Upstash REST, @upstash/redis, or any compatible `redis` client.

type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
};

let client: RedisLike | null = null;

// OPTION A: Upstash REST (no extra deps)
async function upstashFetch(path: string, body?: any) {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);
  return res.json();
}
const upstash: RedisLike = {
  async incr(key) { const r = await upstashFetch("/incr/{key}", { key }); return r.result as number; },
  async expire(key, seconds) { await upstashFetch("/expire/{key}/{seconds}", { key, seconds }); },
};

// OPTION B: bring your own client — uncomment and wire it up
// import { Redis } from "@upstash/redis";
// const redisClient = Redis.fromEnv();
// const redis: RedisLike = {
//   incr: (k) => redisClient.incr(k),
//   expire: (k, s) => redisClient.expire(k, s),
// };

function getRedis(): RedisLike {
  if (client) return client;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    client = upstash;
    return client;
  }
  // DEV fallback: in-memory (NOT for prod)
  const mem = new Map<string, { n: number; resetAt: number }>();
  client = {
    async incr(key) {
      const now = Date.now();
      const cur = mem.get(key);
      if (!cur || cur.resetAt <= now) {
        mem.set(key, { n: 1, resetAt: now + 10_000 }); // default 10s TTL; caller will set real TTL via expire()
        return 1;
      }
      cur.n++;
      return cur.n;
    },
    async expire(key, seconds) {
      const cur = mem.get(key);
      if (cur) cur.resetAt = Date.now() + seconds * 1000;
    },
  };
  return client;
}

export type LimitResult = { ok: boolean; remaining: number; reset: number; limit: number };

export async function rateLimit(opts: {
  name: string;         // e.g. "login"
  key: string;          // per-user or per-ip
  limit: number;        // requests per window
  windowMs: number;     // window size
}): Promise<LimitResult> {
  const { name, key, limit, windowMs } = opts;
  const windowId = Math.floor(Date.now() / windowMs);
  const redis = getRedis();
  const redisKey = `rl:${name}:${key}:${windowId}`;

  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, Math.ceil(windowMs / 1000));

  const remaining = Math.max(0, limit - count);
  const reset = (windowId + 1) * windowMs;
  return { ok: count <= limit, remaining, reset, limit };
}

export function rateHeaders(r: LimitResult) {
  return new Headers({
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.floor(r.reset / 1000)),
    ...(r.ok ? {} : { "Retry-After": String(Math.ceil((r.reset - Date.now()) / 1000)) }),
  });
}

// Helpers to derive keys
export function ipFromHeaders(h: Headers) {
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || "0.0.0.0";
}
