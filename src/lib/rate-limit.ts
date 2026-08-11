import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/config/env";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export interface RateLimiter {
  limit(key: string): Promise<RateLimitResult>;
}

/**
 * Sliding-window limiter backed by an in-process Map. Local/dev only — state is not
 * shared across server instances or process restarts. Swap to `UpstashRateLimiter` in
 * production via RATE_LIMIT_PROVIDER=upstash.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  async limit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.max) {
      return { success: false, remaining: 0, reset: timestamps[0] + this.windowMs };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    return {
      success: true,
      remaining: this.max - timestamps.length,
      reset: now + this.windowMs,
    };
  }
}

export class UpstashRateLimiter implements RateLimiter {
  private readonly limiter: Ratelimit;

  constructor(max: number, windowSeconds: number) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL ?? "",
      token: env.UPSTASH_REDIS_REST_TOKEN ?? "",
    });
    this.limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
    });
  }

  async limit(key: string): Promise<RateLimitResult> {
    const { success, remaining, reset } = await this.limiter.limit(key);
    return { success, remaining, reset };
  }
}

function createRateLimiter(max: number, windowMs: number): RateLimiter {
  if (env.RATE_LIMIT_PROVIDER === "upstash") {
    return new UpstashRateLimiter(max, Math.round(windowMs / 1000));
  }
  return new InMemoryRateLimiter(max, windowMs);
}

// Per-route limiters used across the auth API. Keyed by caller (IP+email) at the call
// site, not here.
export const signupRateLimiter = createRateLimiter(5, 15 * 60 * 1000);
export const forgotPasswordRateLimiter = createRateLimiter(5, 15 * 60 * 1000);
export const resendVerificationRateLimiter = createRateLimiter(3, 10 * 60 * 1000);
