import crypto from "node:crypto";
import { env } from "./env";

/**
 * Cryptographic helpers.
 *
 * - Access tokens are encrypted at rest with AES-256-GCM.
 * - Signing keys (webhook state, unsubscribe tokens) are HMAC-SHA256.
 *
 * All keys are DERIVED from APP_SECRET with a per-purpose label, so a single
 * secret leak requires the label too, and different purposes never share a key.
 */

function deriveKey(purpose: string): Buffer {
  // scrypt is deliberately slow but this runs once per process per purpose;
  // cache the result.
  const cacheKey = `__flowmail_key_${purpose}`;
  const g = globalThis as unknown as Record<string, Buffer>;
  if (!g[cacheKey]) {
    g[cacheKey] = crypto.scryptSync(env.APP_SECRET, `flowmail:${purpose}`, 32);
  }
  return g[cacheKey];
}

// --- Symmetric encryption (AES-256-GCM) for secrets at rest ---

export function encrypt(plaintext: string): string {
  const key = deriveKey("aes");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv.tag.ciphertext, base64url
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString(
    "base64url",
  )}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed ciphertext");
  }
  const key = deriveKey("aes");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

// --- HMAC signing (for stateless tokens: OAuth state, unsubscribe links) ---

export function sign(purpose: string, value: string): string {
  const key = deriveKey(`hmac:${purpose}`);
  return crypto.createHmac("sha256", key).update(value).digest("base64url");
}

/** Timing-safe comparison of two strings. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Verify an HMAC signature in constant time. */
export function verifySignature(
  purpose: string,
  value: string,
  signature: string,
): boolean {
  return safeEqual(sign(purpose, value), signature);
}

/**
 * A signed token that embeds a value + expiry, e.g. unsubscribe links.
 * Format: base64url(json).signature
 */
export function createToken(
  purpose: string,
  data: Record<string, unknown>,
  ttlSeconds: number,
): string {
  const body = Buffer.from(
    JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64url");
  return `${body}.${sign(purpose, body)}`;
}

export function verifyToken<T = Record<string, unknown>>(
  purpose: string,
  token: string,
): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!verifySignature(purpose, body, sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data.exp === "number" && data.exp < Math.floor(Date.now() / 1000)) {
      return null; // expired
    }
    return data as T;
  } catch {
    return null;
  }
}
