import type { MiddlewareHandler } from "hono";
import { getRedis } from "../lib/redis.js";

interface RateLimitOptions {
  /** Max requests allowed in the window */
  max: number;
  /** Window size in seconds */
  windowSec: number;
  /** Key prefix for Redis */
  prefix: string;
}

/**
 * Generic sliding-window rate limiter backed by Redis.
 * Uses a simple counter with TTL — good enough for V1; upgrade to
 * a Lua sorted-set approach for sub-second precision if needed later.
 */
function createRateLimiter(
  getKey: (c: Parameters<MiddlewareHandler>[0]) => string | null,
  opts: RateLimitOptions,
): MiddlewareHandler {
  return async (c, next) => {
    const keySegment = getKey(c);
    if (!keySegment) {
      // Cannot identify the caller — skip limiting (will be caught by auth)
      return next();
    }

    try {
      const redis = getRedis();
      const redisKey = `${opts.prefix}:${keySegment}`;

      const current = await redis.incr(redisKey);
      if (current === 1) {
        // New key — set the expiry on first increment
        await redis.expire(redisKey, opts.windowSec);
      }

      const ttl = await redis.ttl(redisKey);
      c.header("X-RateLimit-Limit", String(opts.max));
      c.header("X-RateLimit-Remaining", String(Math.max(0, opts.max - current)));
      c.header("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + ttl));

      if (current > opts.max) {
        return c.json(
          {
            error: "Rate limit exceeded. Please slow down.",
            retryAfter: ttl,
          },
          429,
        );
      }
    } catch (err) {
      // Redis unavailable — fail open (don't block real traffic)
      console.warn("[rate-limit] Redis unavailable, skipping rate check:", err);
    }

    return next();
  };
}

/** 1 000 req/min per API key (authenticated traffic) */
export const apiKeyRateLimit = createRateLimiter(
  (c) => {
    const apiKey =
      c.req.header("X-API-Key") ||
      c.req.header("Authorization")?.replace("Bearer ", "");
    return apiKey ?? null;
  },
  { max: 1000, windowSec: 60, prefix: "rl:key" },
);

/** 200 req/min per IP (unauthenticated / catch-all) */
export const ipRateLimit = createRateLimiter(
  (c) => {
    return (
      c.req.header("X-Forwarded-For")?.split(",")[0].trim() ||
      c.req.header("CF-Connecting-IP") ||
      "unknown"
    );
  },
  { max: 200, windowSec: 60, prefix: "rl:ip" },
);
