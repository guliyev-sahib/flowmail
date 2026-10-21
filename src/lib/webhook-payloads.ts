import type { CartLineItem } from "@/templates/abandoned-cart";

/**
 * Pure, defensive extraction from loosely-typed Shopify webhook payloads.
 * Kept free of env/DB imports so it can be unit-tested in isolation.
 */

type Payload = Record<string, unknown>;

export interface CheckoutData {
  /** Checkout token — our key for the abandoned cart (orders carry it as `checkout_token`). */
  token: string;
  email: string;
  firstName: string | null;
  lineItems: CartLineItem[];
  totalPrice: number;
  /** Shopify's cart-restoring link, or "" if absent/unsafe. */
  checkoutUrl: string;
}

/**
 * Parse a `checkouts/create` / `checkouts/update` payload. Returns null when the
 * checkout is unusable for the abandoned-cart flow: no token, no email to reach
 * the shopper, or already completed (it became an order).
 *
 * Note: `carts/update` payloads never include the shopper's email, which is why
 * the abandoned-cart flow is driven by checkout webhooks.
 */
export function parseCheckout(p: Payload): CheckoutData | null {
  const token = typeof p.token === "string" && p.token ? p.token : null;
  const email = extractEmail(p);
  if (!token || !email) return null;
  if (p.completed_at) return null;

  const lineItems = extractLineItems(p);
  const total =
    toNumber(p.total_price) ?? lineItems.reduce((s, li) => s + li.price * li.quantity, 0);

  return {
    token,
    email,
    firstName: extractFirstName(p),
    lineItems,
    totalPrice: total,
    checkoutUrl: httpsUrl(p.abandoned_checkout_url),
  };
}

/** Tokens an order can be matched to a stored cart by (checkout first). */
export function orderCartTokens(p: Payload): string[] {
  return [p.checkout_token, p.cart_token].filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
}

export function extractEmail(p: Payload): string | null {
  if (typeof p.email === "string" && p.email.includes("@")) return p.email;
  const customer = p.customer as Payload | undefined;
  if (customer && typeof customer.email === "string" && customer.email.includes("@")) {
    return customer.email;
  }
  return null;
}

export function extractFirstName(p: Payload): string | null {
  const customer = p.customer as Payload | undefined;
  if (customer && typeof customer.first_name === "string" && customer.first_name) {
    return customer.first_name;
  }
  const billing = p.billing_address as Payload | undefined;
  if (billing && typeof billing.first_name === "string" && billing.first_name) {
    return billing.first_name;
  }
  if (typeof p.first_name === "string" && p.first_name) return p.first_name;
  return null;
}

export function extractLineItems(p: Payload): CartLineItem[] {
  const items = Array.isArray(p.line_items) ? p.line_items : [];
  return items.map((raw): CartLineItem => {
    const li = raw as Payload;
    const image = [li.image, li.image_url].find((v): v is string => typeof v === "string");
    return {
      title: typeof li.title === "string" ? li.title : "Item",
      quantity: typeof li.quantity === "number" ? li.quantity : 1,
      price: toNumber(li.price) ?? 0,
      image,
    };
  });
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Only accept absolute https URLs (Shopify's checkout links are always https). */
function httpsUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  try {
    return new URL(v).protocol === "https:" ? v : "";
  } catch {
    return "";
  }
}
