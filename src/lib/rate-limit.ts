import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Upstash Redis-backed rate limiter.
 * 20 requests per 10 seconds per key (IP or session).
 * Falls back to a no-op if env vars are missing.
 */

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "10 s"),
    analytics: true,
    prefix: "keesdeen:rl",
  });
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // ms until reset
}

/**
 * Check rate limit for a given key.
 * Returns { success: true } if Upstash is not configured (dev mode).
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  if (!ratelimit) {
    return { success: true, limit: 20, remaining: 20, reset: 0 };
  }

  const result = await ratelimit.limit(key);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
