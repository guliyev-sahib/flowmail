import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildAuthUrl, isValidShopDomain } from "@/lib/shopify";
import { sign } from "@/lib/crypto";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * OAuth start. GET /api/auth?shop=my-store.myshopify.com
 * Sets a signed, httpOnly state cookie (CSRF protection) and redirects to
 * Shopify's consent screen.
 */
export async function GET(req: NextRequest) {
  const allowed = await rateLimit(`auth:${clientIp(req.headers)}`, 20, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const shop = req.nextUrl.searchParams.get("shop");
  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  const nonce = crypto.randomBytes(16).toString("base64url");
  // Bind the nonce to the shop so a stolen state can't be replayed for another store.
  const state = `${nonce}.${sign("oauth-state", `${nonce}:${shop}`)}`;

  const res = NextResponse.redirect(buildAuthUrl(shop, state));
  res.cookies.set("flowmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}
