import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCheckout, orderCartTokens } from "../src/lib/webhook-payloads";

const checkout = {
  token: "chk_123",
  cart_token: "cart_abc",
  email: "shopper@example.com",
  customer: { first_name: "Alex" },
  total_price: "54.00",
  abandoned_checkout_url: "https://shop.example.com/123/checkouts/chk_123/recover?key=k",
  completed_at: null,
  line_items: [{ title: "Soy candle", quantity: 2, price: "27.00" }],
};

test("parseCheckout extracts what the abandoned-cart flow needs", () => {
  assert.deepEqual(parseCheckout(checkout), {
    token: "chk_123",
    email: "shopper@example.com",
    firstName: "Alex",
    totalPrice: 54,
    checkoutUrl: checkout.abandoned_checkout_url,
    lineItems: [{ title: "Soy candle", quantity: 2, price: 27, image: undefined }],
  });
});

test("parseCheckout skips checkouts without an email or already completed", () => {
  assert.equal(parseCheckout({ ...checkout, email: null, customer: {} }), null);
  assert.equal(parseCheckout({ ...checkout, completed_at: "2026-10-01T10:00:00Z" }), null);
  assert.equal(parseCheckout({ ...checkout, token: "" }), null);
});

test("parseCheckout drops non-https checkout links", () => {
  assert.equal(parseCheckout({ ...checkout, abandoned_checkout_url: "javascript:alert(1)" })?.checkoutUrl, "");
});

test("orderCartTokens matches orders by checkout and cart token", () => {
  assert.deepEqual(orderCartTokens({ checkout_token: "chk_123", cart_token: "cart_abc" }), ["chk_123", "cart_abc"]);
  assert.deepEqual(orderCartTokens({ cart_token: null }), []);
});
