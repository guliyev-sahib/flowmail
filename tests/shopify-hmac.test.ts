import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import "./test-env";
import { verifyOAuthHmac, verifyWebhookHmac, isValidShopDomain } from "../src/lib/shopify";

const hmacHex = (msg: string) => crypto.createHmac("sha256", "hush").update(msg).digest("hex");

test("OAuth HMAC: Shopify's documented example verifies", () => {
  const q = new URLSearchParams(
    "code=0907a61c0c8d55e99db179b68161bc00&hmac=700e2dadb827fcc8609e9d5ce208b2e9cdaab9df07390d2cbca10d7c328fc4bf&shop=some-shop.myshopify.com&state=0.6784241404160823&timestamp=1337178173",
  );
  assert.equal(verifyOAuthHmac(q), true);
});

test("OAuth HMAC: base64 host containing '=' is signed URL-encoded", () => {
  const host = "YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvZm9v="; // ends with "="
  const signed = `code=abc&host=${encodeURIComponent(host)}&shop=foo.myshopify.com&timestamp=1`;
  const q = new URLSearchParams(`${signed}&hmac=${hmacHex(signed)}`);
  assert.equal(verifyOAuthHmac(q), true);
});

test("OAuth HMAC: tampered or missing hmac is rejected", () => {
  const signed = "code=abc&shop=foo.myshopify.com&timestamp=1";
  assert.equal(verifyOAuthHmac(new URLSearchParams(`${signed}&hmac=${hmacHex(signed)}`.replace("abc", "abd"))), false);
  assert.equal(verifyOAuthHmac(new URLSearchParams(signed)), false);
});

test("Webhook HMAC: verifies raw body, rejects modified body", () => {
  const body = JSON.stringify({ id: 1, email: "a@b.co" });
  const sig = crypto.createHmac("sha256", "hush").update(body, "utf8").digest("base64");
  assert.equal(verifyWebhookHmac(body, sig), true);
  assert.equal(verifyWebhookHmac(body + " ", sig), false);
  assert.equal(verifyWebhookHmac(body, null), false);
});

test("Shop domain validation blocks non-myshopify hosts", () => {
  assert.equal(isValidShopDomain("cool-store.myshopify.com"), true);
  assert.equal(isValidShopDomain("evil.com"), false);
  assert.equal(isValidShopDomain("cool-store.myshopify.com.evil.com"), false);
});
