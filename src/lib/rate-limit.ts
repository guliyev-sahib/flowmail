import { connection } from "./queue";

/**
 * Simple fixed-window rate limiter backed by Redis.
 * Returns true if the request is ALLOWED, false if the limit is exceeded.
 *
 * Keyed by an arbitrary identifier (usually client IP + route). Fails OPEN on
 * Redis errors so a Redis outage never locks legitimate users out — the
 * tradeoff is acceptable for these low-risk public endpoints.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redisKey = `ratelimit:${key}`;
  try {
    const count = await connection.incr(redisKey);
    if (count === 1) {
      await connection.expire(redisKey, windowSeconds);
    }
    return count <= limit;
  } catch (err) {
    console.error("Rate limiter error (failing open):", err);
    return true;
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
