import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac, isValidShopDomain } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";
import { onCartUpdate, onOrderCreate, onCustomerCreate } from "@/lib/flows";
import {
  extractEmail,
  extractFirstName,
  orderCartTokens,
  parseCheckout,
} from "@/lib/webhook-payloads";

export const runtime = "nodejs";

/**
 * Single webhook endpoint for all topics: /api/webhooks/checkouts-update etc.
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
      case "checkouts-create":
      case "checkouts-update":
        await handleCheckout(shop.id, payload);
        break;
      case "orders-create":
        await handleOrderCreate(shop.id, payload);
        break;
      case "customers-create":
        await handleCustomerCreate(shop.id, payload);
        break;
      case "customers-redact":
        await handleCustomerRedact(shop.id, payload);
        break;
      case "shop-redact":
        // Sent 48h after uninstall: delete everything we hold for the shop.
        await prisma.shop.delete({ where: { id: shop.id } });
        break;
      case "customers-data_request":
        // We store only email, name and cart/message history. Log so the
        // operator can export it for the merchant (no automated export yet).
        console.warn(`GDPR data request for ${shop.domain}:`, JSON.stringify(payload.customer ?? {}));
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

async function handleCheckout(shopId: string, p: Record<string, unknown>) {
  const checkout = parseCheckout(p);
  if (!checkout) return; // no email yet, or already completed

  await onCartUpdate({
    shopId,
    cartToken: checkout.token,
    email: checkout.email,
    firstName: checkout.firstName,
    lineItems: checkout.lineItems,
    totalPrice: checkout.totalPrice,
    checkoutUrl: checkout.checkoutUrl,
  });
}

async function handleOrderCreate(shopId: string, p: Record<string, unknown>) {
  await onOrderCreate(shopId, orderCartTokens(p), extractEmail(p));
}

async function handleCustomerCreate(shopId: string, p: Record<string, unknown>) {
  const email = extractEmail(p);
  if (!email) return;
  await onCustomerCreate(shopId, email, extractFirstName(p));
}

async function handleCustomerRedact(shopId: string, p: Record<string, unknown>) {
  const email = extractEmail(p);
  if (!email) return;
  // Cascades to the contact's messages; cart events keep no contact link.
  await prisma.contact.deleteMany({ where: { shopId, email } });
}
