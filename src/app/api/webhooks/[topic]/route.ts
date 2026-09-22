import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac, isValidShopDomain } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";
import { onCartUpdate, onOrderCreate } from "@/lib/flows";
import type { CartLineItem } from "@/templates/abandoned-cart";

export const runtime = "nodejs";

/**
 * Single webhook endpoint for all topics: /api/webhooks/carts-update etc.
 * EVERY request is HMAC-verified against the RAW body before any processing.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ topic: string }> },
) {
  const { topic } = await params;

  // Read the raw body exactly as sent — required for correct HMAC verification.
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const shopDomain = req.headers.get("x-shopify-shop-domain");
  if (!isValidShopDomain(shopDomain)) {
    return NextResponse.json({ error: "Invalid shop" }, { status: 400 });
  }

  const shop = await prisma.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) {
    // Unknown shop — ack so Shopify stops retrying, but do nothing.
    return NextResponse.json({ ok: true });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  try {
    switch (topic) {
      case "carts-update":
        await handleCartUpdate(shop.id, payload);
        break;
      case "orders-create":
        await handleOrderCreate(shop.id, payload);
        break;
      case "app-uninstalled":
        await prisma.shop.update({
          where: { id: shop.id },
          data: { uninstalledAt: new Date() },
        });
        break;
      default:
        // Unhandled topic — ack anyway.
        break;
    }
  } catch (err) {
    console.error(`Webhook ${topic} handler error:`, err);
    // Return 200 so Shopify doesn't hammer retries on our transient errors;
    // we log and can reconcile. (Tune per-topic later.)
  }

  return NextResponse.json({ ok: true });
}

async function handleCartUpdate(shopId: string, p: Record<string, unknown>) {
  const email = extractEmail(p);
  const cartToken = typeof p.token === "string" ? p.token : null;
  if (!email || !cartToken) return; // no way to reach the shopper yet

  const lineItems = extractLineItems(p);
  const total = lineItems.reduce((s, li) => s + li.price * li.quantity, 0);

  await onCartUpdate({
    shopId,
    cartToken,
    email,
    firstName: extractFirstName(p),
    lineItems,
    totalPrice: total,
    checkoutUrl: "",
  });
}

async function handleOrderCreate(shopId: string, p: Record<string, unknown>) {
  const email = extractEmail(p);
  const cartToken = typeof p.cart_token === "string" ? p.cart_token : null;
  await onOrderCreate(shopId, cartToken, email);
}

// --- Defensive extraction from loosely-typed webhook payloads ---

function extractEmail(p: Record<string, unknown>): string | null {
  if (typeof p.email === "string" && p.email.includes("@")) return p.email;
  const customer = p.customer as Record<string, unknown> | undefined;
  if (customer && typeof customer.email === "string" && customer.email.includes("@")) {
    return customer.email;
  }
  return null;
}

function extractFirstName(p: Record<string, unknown>): string | null {
  const customer = p.customer as Record<string, unknown> | undefined;
  if (customer && typeof customer.first_name === "string") return customer.first_name;
  return null;
}

function extractLineItems(p: Record<string, unknown>): CartLineItem[] {
  const items = Array.isArray(p.line_items) ? p.line_items : [];
  return items.map((raw): CartLineItem => {
    const li = raw as Record<string, unknown>;
    return {
      title: typeof li.title === "string" ? li.title : "Item",
      quantity: typeof li.quantity === "number" ? li.quantity : 1,
      price: typeof li.price === "string" ? parseFloat(li.price) : Number(li.price ?? 0),
      image: typeof li.image === "string" ? li.image : undefined,
    };
  });
}
