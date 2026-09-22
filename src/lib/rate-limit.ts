import IORedis from "ioredis";
import { env } from "./env";

/**
 * Fixed-window rate limiter backed by a DEDICATED Redis client.
 *
 * Unlike the BullMQ connection (which must buffer commands while offline), this
 * client uses `enableOfflineQueue: false` + a command timeout so that when Redis
 * is unavailable, commands reject IMMEDIATELY. We then fail OPEN — a Redis
 * outage must never hang or lock out these low-risk public endpoints.
 */
const g = globalThis as unknown as { __flowmailRlRedis?: IORedis };

const redis =
  g.__flowmailRlRedis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // reject fast instead of buffering when down
    commandTimeout: 1000,
    lazyConnect: false,
  });

if (!g.__flowmailRlRedis) {
  // Swallow connection errors; each command surfaces its own error, which we
  // handle in rateLimit(). Without this handler ioredis would emit unhandled
  // 'error' events.
  redis.on("error", () => {});
  g.__flowmailRlRedis = redis;
}

/**
 * Returns true if the request is ALLOWED, false if the limit is exceeded.
 * Fails OPEN (returns true) on any Redis error.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redisKey = `ratelimit:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return count <= limit;
  } catch (err) {
    console.error("Rate limiter unavailable (failing open):", err);
    return true;
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
