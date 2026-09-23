import { prisma } from "./prisma";
import { scheduleFlowStep } from "./queue";
import { sendEmail } from "./email";
import { createToken, verifyToken } from "./crypto";
import { env } from "./env";
import {
  abandonedCartMjml,
  unsubscribeUrl,
  type CartLineItem,
} from "@/templates/abandoned-cart";
import { welcomeMjml } from "@/templates/welcome";

/**
 * Flow engine. Supports two triggers today (abandoned cart, welcome) on the
 * generic Flow/FlowStep model, plus open/click tracking on every send.
 */

const ABANDONED_CART_STEPS = [
  { delayMinutes: 60, subject: "You left something in your cart" },
  { delayMinutes: 60 * 24, subject: "Still thinking it over?" },
];

const WELCOME_STEPS = [
  { delayMinutes: 5, subject: "Welcome — glad you're here 👋" },
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
const TRACK_TTL = 60 * 60 * 24 * 90; // 90 days

// --- Tracking URL builders (signed; verified in /api/track/*) ---

function openPixelUrl(messageId: string): string {
  const t = createToken("track-open", { mid: messageId }, TRACK_TTL);
  return `${env.SHOPIFY_APP_URL}/api/track/open?t=${encodeURIComponent(t)}`;
}

function trackedClickUrl(messageId: string, dest: string): string {
  const t = createToken("track-click", { mid: messageId, url: dest }, TRACK_TTL);
  return `${env.SHOPIFY_APP_URL}/api/track/click?t=${encodeURIComponent(t)}`;
}

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

  if (!contact.subscribed) return;

  const existing = await prisma.cartEvent.findFirst({
    where: { shopId: input.shopId, cartToken: input.cartToken },
  });

  if (existing) {
    await prisma.cartEvent.update({
      where: { id: existing.id },
      data: {
        lineItems: input.lineItems as object,
        totalPrice: input.totalPrice,
        contactId: contact.id,
      },
    });
    return; // already scheduled on first sight; avoid duplicates
  }

  await prisma.cartEvent.create({
    data: {
      shopId: input.shopId,
      cartToken: input.cartToken,
      contactId: contact.id,
      lineItems: input.lineItems as object,
      totalPrice: input.totalPrice,
    },
  });

  const flow = await ensureFlow(input.shopId, "ABANDONED_CART");
  await scheduleSteps(input.shopId, contact.id, flow.steps);
}

/**
 * Called when a customer is created. Schedules the welcome flow once per contact.
 */
export async function onCustomerCreate(
  shopId: string,
  email: string,
  firstName?: string | null,
): Promise<void> {
  const contact = await prisma.contact.upsert({
    where: { shopId_email: { shopId, email } },
    update: { firstName: firstName ?? undefined },
    create: { shopId, email, firstName: firstName ?? undefined },
  });
  if (!contact.subscribed) return;

  const flow = await ensureFlow(shopId, "WELCOME");

  // Only send the welcome once per contact.
  const already = await prisma.message.count({
    where: { contactId: contact.id, flowStep: { flowId: flow.id } },
  });
  if (already > 0) return;

  await scheduleSteps(shopId, contact.id, flow.steps);
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
      // Only suppress abandoned-cart messages on purchase (welcome still sends).
      await prisma.message.updateMany({
        where: {
          shopId,
          contactId: contact.id,
          status: "SCHEDULED",
          flowStep: { flow: { trigger: "ABANDONED_CART" } },
        },
        data: { status: "SUPPRESSED" },
      });
    }
  }
}

/**
 * Worker entrypoint: send one scheduled message, branching by flow trigger,
 * unless it should be suppressed (unsubscribed, or cart recovered for AC).
 */
export async function processScheduledMessage(messageId: string): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      contact: true,
      flowStep: { include: { flow: true } },
      shop: true,
    },
  });

  if (!message || message.status !== "SCHEDULED") return;
  if (!message.contact.subscribed) return markSuppressed(messageId);

  const trigger = message.flowStep?.flow?.trigger ?? "ABANDONED_CART";
  const storeName = message.shop.name ?? message.shop.domain;
  const unsubUrl = unsubscribeUrl(
    createToken("unsubscribe", { contactId: message.contactId }, UNSUB_TTL),
  );
  const pixelUrl = openPixelUrl(messageId);

  let mjml: string;
  let subject: string;

  if (trigger === "WELCOME") {
    subject = message.flowStep?.subject ?? "Welcome 👋";
    mjml = welcomeMjml({
      firstName: message.contact.firstName,
      storeName,
      shopUrl: trackedClickUrl(messageId, `https://${message.shop.domain}`),
      unsubscribeUrl: unsubUrl,
      pixelUrl,
    });
  } else {
    // Abandoned cart: suppress if recovered, need a cart to render.
    const recovered = await prisma.cartEvent.findFirst({
      where: {
        shopId: message.shopId,
        contactId: message.contactId,
        recovered: true,
      },
    });
    if (recovered) return markSuppressed(messageId);

    const cart = await prisma.cartEvent.findFirst({
      where: { shopId: message.shopId, contactId: message.contactId },
      orderBy: { updatedAt: "desc" },
    });
    if (!cart) return markSuppressed(messageId);

    subject = message.flowStep?.subject ?? "You left something in your cart";
    mjml = abandonedCartMjml({
      firstName: message.contact.firstName,
      lineItems: (cart.lineItems as unknown as CartLineItem[]) ?? [],
      checkoutUrl: trackedClickUrl(messageId, `https://${message.shop.domain}/cart`),
      unsubscribeUrl: unsubUrl,
      storeName,
      pixelUrl,
    });
  }

  await sendEmail({ to: message.contact.email, subject, mjml, unsubscribeUrl: unsubUrl });

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

interface StepLike {
  id: string;
  delayMinutes: number;
}

/** Create scheduled Message rows + enqueue delayed jobs for each step. */
async function scheduleSteps(
  shopId: string,
  contactId: string,
  steps: StepLike[],
): Promise<void> {
  for (const step of steps) {
    const message = await prisma.message.create({
      data: {
        shopId,
        contactId,
        flowStepId: step.id,
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() + step.delayMinutes * 60_000),
      },
    });
    await scheduleFlowStep({ messageId: message.id }, step.delayMinutes * 60_000);
  }
}

type Trigger = "ABANDONED_CART" | "WELCOME";

const FLOW_DEFAULTS: Record<Trigger, { name: string; steps: typeof ABANDONED_CART_STEPS }> = {
  ABANDONED_CART: { name: "Abandoned cart", steps: ABANDONED_CART_STEPS },
  WELCOME: { name: "Welcome", steps: WELCOME_STEPS },
};

/** Lazily create a shop's flow of the given trigger with default steps. */
async function ensureFlow(shopId: string, trigger: Trigger) {
  const existing = await prisma.flow.findFirst({
    where: { shopId, trigger },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (existing && existing.steps.length > 0) return existing;

  const def = FLOW_DEFAULTS[trigger];
  return prisma.flow.create({
    data: {
      shopId,
      name: def.name,
      trigger,
      active: true,
      steps: {
        create: def.steps.map((s, i) => ({
          order: i,
          delayMinutes: s.delayMinutes,
          subject: s.subject,
          mjml: "",
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
}
