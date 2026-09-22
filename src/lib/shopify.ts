import crypto from "node:crypto";
import { env } from "./env";
import { safeEqual } from "./crypto";

/**
 * Shopify integration primitives, written without the heavy SDK so the security
 * surface (HMAC verification, domain validation) is explicit and reviewable.
 */

// Only real Shopify store domains. Prevents SSRF / open-redirect via the `shop`
// param — we never build a request or redirect to an attacker-chosen host.
const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

export function isValidShopDomain(shop: string | null | undefined): shop is string {
  return typeof shop === "string" && SHOP_DOMAIN_RE.test(shop);
}

/** Build the OAuth consent URL. `state` is a CSRF nonce we verify on callback. */
export function buildAuthUrl(shop: string, state: string): string {
  if (!isValidShopDomain(shop)) throw new Error("Invalid shop domain");
  const params = new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: `${env.SHOPIFY_APP_URL}/api/auth/callback`,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verify the HMAC on an OAuth callback query. Shopify signs the querystring
 * (all params except `hmac`/`signature`) with the app secret.
 */
export function verifyOAuthHmac(searchParams: URLSearchParams): boolean {
  const provided = searchParams.get("hmac");
  if (!provided) return false;

  const pairs: string[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");
  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  return safeEqual(digest, provided);
}

/**
 * Verify a webhook request. Shopify sends `X-Shopify-Hmac-Sha256` as base64 of
 * HMAC-SHA256(rawBody, secret). Must use the RAW body, not parsed JSON.
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  return safeEqual(digest, hmacHeader);
}

/** Exchange an OAuth authorization code for a permanent access token. */
export async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<string> {
  if (!isValidShopDomain(shop)) throw new Error("Invalid shop domain");
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access_token in response");
  return data.access_token;
}

/** Register the webhook topics we rely on for the abandoned-cart flow. */
export async function registerWebhooks(shop: string, accessToken: string): Promise<void> {
  if (!isValidShopDomain(shop)) throw new Error("Invalid shop domain");
  const topics = ["carts/update", "orders/create", "app/uninstalled"];
  await Promise.all(
    topics.map((topic) =>
      fetch(`https://${shop}/admin/api/2024-10/webhooks.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${env.SHOPIFY_APP_URL}/api/webhooks/${topic.replace("/", "-")}`,
            format: "json",
          },
        }),
      }),
    ),
  );
}
