import { env } from "@/lib/env";

export interface CartLineItem {
  title: string;
  quantity: number;
  price: number;
  image?: string;
  url?: string;
}

export interface AbandonedCartTemplateArgs {
  firstName?: string | null;
  lineItems: CartLineItem[];
  checkoutUrl: string;
  unsubscribeUrl: string;
  storeName: string;
  pixelUrl?: string;
}

/** Escape user/store-controlled strings before embedding them in MJML/HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * Only allow http(s) URLs in href/src. Blocks javascript:, data:, etc.
 * Returns "#" for anything unsafe so nothing dangerous is ever embedded.
 */
function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return esc(url);
  } catch {
    /* fall through */
  }
  return "#";
}

export function abandonedCartMjml(args: AbandonedCartTemplateArgs): string {
  const greeting = args.firstName ? `Hi ${esc(args.firstName)},` : "Hi there,";

  // Each line item is its own top-level mj-section (mj-section must NOT be
  // nested inside an mj-column).
  const items = args.lineItems
    .map(
      (li) => `
      <mj-section background-color="#ffffff" padding="8px 24px">
        <mj-column width="30%">
          ${
            li.image
              ? `<mj-image src="${safeUrl(li.image)}" alt="${esc(li.title)}" />`
              : ""
          }
        </mj-column>
        <mj-column width="70%">
          <mj-text font-size="15px"><strong>${esc(li.title)}</strong></mj-text>
          <mj-text font-size="13px" color="#666">Qty: ${li.quantity} · ${money(
            li.price,
          )}</mj-text>
        </mj-column>
      </mj-section>`,
    )
    .join("");

  return `
  <mjml>
    <mj-body background-color="#f4f4f5">
      <mj-section padding="24px">
        <mj-column>
          <mj-text font-size="22px" font-weight="bold">${esc(
            args.storeName,
          )}</mj-text>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="24px">
        <mj-column>
          <mj-text font-size="18px" font-weight="bold">You left something behind</mj-text>
          <mj-text>${greeting}</mj-text>
          <mj-text>Your cart is still waiting. Complete your order before it's gone:</mj-text>
        </mj-column>
      </mj-section>
      ${items}
      <mj-section background-color="#ffffff" padding="24px">
        <mj-column>
          <mj-button href="${safeUrl(args.checkoutUrl)}" background-color="#111827">
            Complete your order
          </mj-button>
        </mj-column>
      </mj-section>
      <mj-section padding="16px">
        <mj-column>
          <mj-text font-size="11px" color="#999" align="center">
            You received this because you started a checkout at ${esc(
              args.storeName,
            )}.
            <a href="${safeUrl(args.unsubscribeUrl)}">Unsubscribe</a>.
          </mj-text>
        </mj-column>
      </mj-section>
      ${
        args.pixelUrl
          ? `<mj-raw><img src="${safeUrl(args.pixelUrl)}" width="1" height="1" alt="" style="display:none" /></mj-raw>`
          : ""
      }
    </mj-body>
  </mjml>`;
}

export function unsubscribeUrl(token: string): string {
  return `${env.SHOPIFY_APP_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}
