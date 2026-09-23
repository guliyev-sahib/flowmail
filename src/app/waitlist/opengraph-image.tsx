import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Flowmail — open-source Shopify email automation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Dynamically generated social-share card (Reddit, Telegram, Slack, etc). */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 700 }}>
          ✉️&nbsp; Flowmail
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1,
              maxWidth: 1000,
            }}
          >
            Shopify email flows without the Klaviyo bill.
          </div>
          <div style={{ fontSize: 30, marginTop: 28, color: "#e0e7ff", maxWidth: 940 }}>
            Open-source, self-hostable abandoned-cart, welcome & win-back
            automations. Flat cost. Own your data.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 22 }}>
          <span
            style={{
              background: "rgba(255,255,255,0.15)",
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            OPEN SOURCE
          </span>
          <span
            style={{
              background: "rgba(255,255,255,0.15)",
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            SELF-HOSTED
          </span>
          <span
            style={{
              background: "rgba(255,255,255,0.15)",
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            SHOPIFY-NATIVE
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
