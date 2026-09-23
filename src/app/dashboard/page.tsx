import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Minimal dashboard at /dashboard. Stats are shown ONLY to an authenticated
 * session (signed cookie set after OAuth) — never based on a ?shop= query param.
 * The marketing landing lives at / (see app/page.tsx → /waitlist).
 */
export default async function Dashboard() {
  const sessionCookie = (await cookies()).get("flowmail_session")?.value;
  const claims = sessionCookie
    ? verifyToken<{ shop: string }>("session", sessionCookie)
    : null;

  let stats: {
    carts: number;
    recovered: number;
    sent: number;
    opened: number;
    clicked: number;
  } | null = null;
  let connectedShop: string | null = null;

  if (claims?.shop) {
    const shop = await prisma.shop.findUnique({ where: { domain: claims.shop } });
    if (shop && !shop.uninstalledAt) {
      connectedShop = shop.domain;
      const [carts, recovered, sent, opened, clicked] = await Promise.all([
        prisma.cartEvent.count({ where: { shopId: shop.id } }),
        prisma.cartEvent.count({ where: { shopId: shop.id, recovered: true } }),
        prisma.message.count({
          where: {
            shopId: shop.id,
            status: { in: ["SENT", "OPENED", "CLICKED"] },
          },
        }),
        prisma.message.count({
          where: { shopId: shop.id, openedAt: { not: null } },
        }),
        prisma.message.count({
          where: { shopId: shop.id, clickedAt: { not: null } },
        }),
      ]);
      stats = { carts, recovered, sent, opened, clicked };
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 16px" }}>
      <h1 style={{ fontSize: 28 }}>Flowmail</h1>
      <p style={{ color: "#666" }}>
        Open-source, Shopify-native email automation.
      </p>

      {!connectedShop && (
        <div
          style={{
            marginTop: 24,
            padding: 24,
            background: "#fff",
            borderRadius: 12,
          }}
        >
          <h2 style={{ fontSize: 18 }}>Connect your store</h2>
          <form action="/api/auth" method="get">
            <input
              name="shop"
              placeholder="your-store.myshopify.com"
              style={{
                padding: "10px 12px",
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #ddd",
                borderRadius: 8,
                marginTop: 8,
              }}
            />
            <button
              type="submit"
              style={{
                marginTop: 12,
                padding: "10px 16px",
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Install
            </button>
          </form>
        </div>
      )}

      {connectedShop && stats && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>{connectedShop}</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 16,
              marginTop: 12,
            }}
          >
            <Stat label="Carts seen" value={stats.carts} />
            <Stat label="Recovered" value={stats.recovered} />
            <Stat label="Emails sent" value={stats.sent} />
            <Stat label="Opened" value={stats.opened} />
            <Stat label="Clicked" value={stats.clicked} />
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 20,
        background: "#fff",
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#666", fontSize: 13 }}>{label}</div>
    </div>
  );
}
