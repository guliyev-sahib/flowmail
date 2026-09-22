import { prisma } from "./prisma";
import { scheduleFlowStep } from "./queue";
import { sendEmail } from "./email";
import { createToken, verifyToken } from "./crypto";
import {
  abandonedCartMjml,
  unsubscribeUrl,
  type CartLineItem,
} from "@/templates/abandoned-cart";

/**
 * Flow engine. For the MVP this hard-codes the abandoned-cart flow; the data
 * model (Flow/FlowStep) is general enough to make this config-driven later.
 */

const ABANDONED_CART_STEPS = [
  { delayMinutes: 60, subject: "You left something in your cart" },
  { delayMinutes: 60 * 24, subject: "Still thinking it over?" },
];

export interface AbandonedCartInput {
  shopId: string;
  cartToken: string;
  email: string;
  firstName?: string | null;
  lineItems: CartLineItem[];
  totalPrice: number;
  checkoutUrl: string;
}

const UNSUB_TTL = 60 * 60 * 24 * 90; // 90 days

/**
 * Called when a cart is (re)seen. Upserts the cart event and, on first sight of
 * an identified email, schedules the abandoned-cart emails. Idempotent per cart.
 */
export async function onCartUpdate(input: AbandonedCartInput): Promise<void> {
  const contact = await prisma.contact.upsert({
    where: { shopId_email: { shopId: input.shopId, email: input.email } },
    update: { firstName: input.firstName ?? undefined },
    create: {
      shopId: input.shopId,
      email: input.email,
      firstName: input.firstName ?? undefined,
    },
  });

  // Don't (re)schedule for unsubscribed contacts.
  if (!contact.subscribed) return;

  const existing = await prisma.cartEvent.findFirst({
    where: { shopId: input.shopId, cartToken: input.cartToken },
  });

  const cartEvent = existing
    ? await prisma.cartEvent.update({
        where: { id: existing.id },
        data: {
          lineItems: input.lineItems as object,
          totalPrice: input.totalPrice,
          contactId: contact.id,
        },
      })
    : await prisma.cartEvent.create({
        data: {
          shopId: input.shopId,
          cartToken: input.cartToken,
          contactId: contact.id,
          lineItems: input.lineItems as object,
          totalPrice: input.totalPrice,
        },
      });

  // Only schedule the flow the first time we see this cart, to avoid duplicates.
  if (existing) return;

  const flow = await ensureAbandonedCartFlow(input.shopId);

  for (const step of flow.steps) {
    const message = await prisma.message.create({
      data: {
        shopId: input.shopId,
        contactId: contact.id,
        flowStepId: step.id,
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() + step.delayMinutes * 60_000),
      },
    });
    // The worker reloads the latest cart context at send time.
    await scheduleFlowStep({ messageId: message.id }, step.delayMinutes * 60_000);
    void cartEvent;
  }
}

/** Mark a cart recovered + suppress any pending messages when an order lands. */
export async function onOrderCreate(
  shopId: string,
  cartToken: string | null,
  email: string | null,
): Promise<void> {
  if (cartToken) {
    await prisma.cartEvent.updateMany({
      where: { shopId, cartToken },
      data: { recovered: true },
    });
  }
  if (email) {
    const contact = await prisma.contact.findUnique({
      where: { shopId_email: { shopId, email } },
    });
    if (contact) {
      await prisma.message.updateMany({
        where: { shopId, contactId: contact.id, status: "SCHEDULED" },
        data: { status: "SUPPRESSED" },
      });
    }
  }
}

/**
 * Worker entrypoint: send one scheduled message, unless it should be suppressed
 * (order completed, unsubscribed, cart recovered).
 */
export async function processScheduledMessage(messageId: string): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      contact: true,
      flowStep: true,
      shop: true,
    },
  });

  if (!message || message.status !== "SCHEDULED") return; // already sent/suppressed
  if (!message.contact.subscribed) {
    await markSuppressed(messageId);
    return;
  }

  // Re-check recovery: has this contact ordered since scheduling?
  const recovered = await prisma.cartEvent.findFirst({
    where: {
      shopId: message.shopId,
      contactId: message.contactId,
      recovered: true,
    },
  });
  if (recovered) {
    await markSuppressed(messageId);
    return;
  }

  const cart = await prisma.cartEvent.findFirst({
    where: { shopId: message.shopId, contactId: message.contactId },
    orderBy: { updatedAt: "desc" },
  });
  if (!cart) {
    await markSuppressed(messageId);
    return;
  }

  const token = createToken(
    "unsubscribe",
    { contactId: message.contactId },
    UNSUB_TTL,
  );
  const unsubUrl = unsubscribeUrl(token);

  const mjml = abandonedCartMjml({
    firstName: message.contact.firstName,
    lineItems: (cart.lineItems as unknown as CartLineItem[]) ?? [],
    checkoutUrl: `https://${message.shop.domain}/cart`,
    unsubscribeUrl: unsubUrl,
    storeName: message.shop.name ?? message.shop.domain,
  });

  await sendEmail({
    to: message.contact.email,
    subject: message.flowStep?.subject ?? "You left something in your cart",
    mjml,
    unsubscribeUrl: unsubUrl,
  });

  await prisma.message.update({
    where: { id: messageId },
    data: { status: "SENT", sentAt: new Date() },
  });
}

export function resolveUnsubscribe(token: string): { contactId: string } | null {
  return verifyToken<{ contactId: string }>("unsubscribe", token);
}

async function markSuppressed(messageId: string): Promise<void> {
  await prisma.message.update({
    where: { id: messageId },
    data: { status: "SUPPRESSED" },
  });
}

/** Lazily create the default abandoned-cart flow + steps for a shop. */
async function ensureAbandonedCartFlow(shopId: string) {
  const existing = await prisma.flow.findFirst({
    where: { shopId, trigger: "ABANDONED_CART" },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (existing && existing.steps.length > 0) return existing;

  return prisma.flow.create({
    data: {
      shopId,
      name: "Abandoned cart",
      trigger: "ABANDONED_CART",
      active: true,
      steps: {
        create: ABANDONED_CART_STEPS.map((s, i) => ({
          order: i,
          delayMinutes: s.delayMinutes,
          subject: s.subject,
          mjml: "", // rendered dynamically per-cart at send time
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
}
