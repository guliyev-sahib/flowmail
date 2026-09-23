import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  isValidShopDomain,
  registerWebhooks,
  verifyOAuthHmac,
} from "@/lib/shopify";
import { sign, safeEqual, encrypt, createToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export const runtime = "nodejs";

/**
 * OAuth callback. Verifies: HMAC (request authenticity), state cookie (CSRF),
 * and shop domain, before exchanging the code and storing an ENCRYPTED token.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const shop = params.get("shop");
  const code = params.get("code");
  const state = params.get("state");

  if (!isValidShopDomain(shop) || !code || !state) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 1. HMAC — proves the callback really came from Shopify.
  if (!verifyOAuthHmac(params)) {
    return NextResponse.json({ error: "HMAC validation failed" }, { status: 401 });
  }

  // 2. State — CSRF protection. Must match the cookie AND be bound to this shop.
  const cookieState = req.cookies.get("flowmail_oauth_state")?.value;
  if (!cookieState || !safeEqual(cookieState, state)) {
    return NextResponse.json({ error: "State mismatch" }, { status: 401 });
  }
  const [nonce, nonceSig] = state.split(".");
  if (
    !nonce ||
    !nonceSig ||
    !safeEqual(sign("oauth-state", `${nonce}:${shop}`), nonceSig)
  ) {
    return NextResponse.json({ error: "Invalid state" }, { status: 401 });
  }

  // 3. Exchange code for a token and persist (encrypted at rest).
  const accessToken = await exchangeCodeForToken(shop, code);

  await prisma.shop.upsert({
    where: { domain: shop },
    update: { accessToken: encrypt(accessToken), uninstalledAt: null },
    create: { domain: shop, accessToken: encrypt(accessToken) },
  });

  // Register the webhooks we need (best-effort; failures are logged, not fatal).
  try {
    await registerWebhooks(shop, accessToken);
  } catch (err) {
    console.error("Webhook registration failed:", err);
  }

  // Issue an authenticated session bound to this shop. The dashboard trusts
  // THIS cookie, not the ?shop= query param, so stats aren't world-readable.
  const session = createToken("session", { shop }, SESSION_TTL);

  const res = NextResponse.redirect(`${env.SHOPIFY_APP_URL}/dashboard`);
  res.cookies.delete("flowmail_oauth_state");
  res.cookies.set("flowmail_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
  return res;
}
