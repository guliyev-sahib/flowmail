/**
 * Local end-to-end smoke of the abandoned-cart pipeline.
 * Run with env loaded, e.g.:  set -a; source .env; set +a; npx tsx scripts/e2e.ts
 *
 * It seeds a shop, simulates a cart-abandonment event (the same call the webhook
 * makes), then dispatches the scheduled messages immediately (the same call the
 * worker makes) so a real email lands in mailpit.
 */
import { prisma } from "@/lib/prisma";
import { onCartUpdate, processScheduledMessage } from "@/lib/flows";
import { encrypt } from "@/lib/crypto";

async function main() {
  const domain = "test-store.myshopify.com";

  const shop = await prisma.shop.upsert({
    where: { domain },
    update: { uninstalledAt: null },
    create: { domain, accessToken: encrypt("dummy-token"), name: "Test Store" },
  });
  console.log(`✓ shop: ${shop.domain}`);

  const cartToken = `cart_${Date.now()}`;
  await onCartUpdate({
    shopId: shop.id,
    cartToken,
    email: "buyer@example.com",
    firstName: "Alex",
    lineItems: [
      {
        title: "Blue Cap",
        quantity: 1,
        price: 20,
        image: "https://picsum.photos/120",
      },
    ],
    totalPrice: 20,
    checkoutUrl: "",
  });
  console.log(`✓ cart abandonment recorded (${cartToken})`);

  const scheduled = await prisma.message.findMany({
    where: { shopId: shop.id, status: "SCHEDULED" },
  });
  console.log(`✓ scheduled messages: ${scheduled.length}`);

  for (const m of scheduled) {
    await processScheduledMessage(m.id);
  }

  const sent = await prisma.message.count({
    where: { shopId: shop.id, status: "SENT" },
  });
  console.log(`✓ sent messages: ${sent}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("E2E failed:", err);
  process.exit(1);
});
