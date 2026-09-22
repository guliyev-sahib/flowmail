"use client";

import { useState } from "react";

/**
 * Phase-0 marketing landing page. Its only job: explain the value and capture
 * emails to validate demand before heavy building.
 */
export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "72px 20px",
        color: "#111827",
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.4,
          color: "#4f46e5",
          background: "#eef2ff",
          padding: "4px 10px",
          borderRadius: 999,
        }}
      >
        OPEN SOURCE · SELF-HOSTED
      </span>

      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "20px 0 12px" }}>
        Shopify email flows without the Klaviyo bill.
      </h1>

      <p style={{ fontSize: 18, color: "#4b5563", lineHeight: 1.5 }}>
        Abandoned cart, welcome, and win-back automations — built Shopify-first,
        open source, and self-hostable for the cost of an SMTP provider. Own your
        data. Stop paying more as your list grows.
      </p>

      <ul style={{ color: "#4b5563", fontSize: 16, lineHeight: 1.9, marginTop: 20 }}>
        <li>✅ Abandoned-cart recovery that actually converts</li>
        <li>✅ Flat cost — no per-contact pricing</li>
        <li>✅ Your customer data stays on your servers</li>
      </ul>

      {state === "done" ? (
        <div
          style={{
            marginTop: 28,
            padding: 20,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 12,
            color: "#065f46",
          }}
        >
          🎉 You're on the list. We'll email you when the beta opens.
        </div>
      ) : (
        <form
          onSubmit={submit}
          style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@store.com"
            style={{
              flex: "1 1 240px",
              padding: "14px 16px",
              fontSize: 16,
              border: "1px solid #d1d5db",
              borderRadius: 10,
            }}
          />
          <button
            type="submit"
            disabled={state === "loading"}
            style={{
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 600,
              background: "#111827",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              opacity: state === "loading" ? 0.6 : 1,
            }}
          >
            {state === "loading" ? "…" : "Join the waitlist"}
          </button>
          {state === "error" && (
            <p style={{ color: "#b91c1c", width: "100%", margin: 0 }}>
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      )}

      <p style={{ marginTop: 40, fontSize: 13, color: "#9ca3af" }}>
        Flowmail is open source (AGPL-3.0). Self-host it free, or join the waitlist
        for managed Flowmail Cloud.
      </p>
    </main>
  );
}
