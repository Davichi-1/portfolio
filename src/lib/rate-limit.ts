/**
 * Fixed-window rate limiter held in module memory.
 *
 * Scope caveat, stated plainly: on Vercel this is per serverless instance, so
 * a determined attacker across many cold starts gets more than `limit`
 * requests. It stops casual form-spam, which is what a portfolio contact form
 * is actually up against. If this ever needs to be airtight, swap the Map for
 * Upstash Redis (@upstash/ratelimit) — the call signature below won't change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LIMIT = 5; // submissions per window per IP

/** Drop expired buckets so the Map can't grow without bound. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  identifier: string,
  { limit = LIMIT, windowMs = WINDOW_MS } = {},
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client IP. Vercel sets x-forwarded-for; the rest are fallbacks.
 * Returns a stable string even when every header is missing, so the limiter
 * always has a key to work with.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown-client"
  );
}
