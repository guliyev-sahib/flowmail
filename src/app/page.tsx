import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Minimal dashboard. For a connected shop (?shop=...), shows headline numbers:
 * carts seen, recovered, and emails sent. Real UI comes later — this proves the
 * pipeline works end-to-end.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const { shop: shopDomain } = await searchParams;

  let stats: { carts: number; recovered: number; sent: number } | null = null;
  let connectedShop: string | null = null;

  if (shopDomain) {
    const shop = await prisma.shop.findUnique({ where: { domain: shopDomain } });
    if (shop) {
      connectedShop = shop.domain;
      const [carts, recovered, sent] = await Promise.all([
        prisma.cartEvent.count({ where: { shopId: shop.id } }),
        prisma.cartEvent.count({ where: { shopId: shop.id, recovered: true } }),
        prisma.message.count({ where: { shopId: shop.id, status: "SENT" } }),
      ]);
      stats = { carts, recovered, sent };
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
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <Stat label="Carts seen" value={stats.carts} />
            <Stat label="Recovered" value={stats.recovered} />
            <Stat label="Emails sent" value={stats.sent} />
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
