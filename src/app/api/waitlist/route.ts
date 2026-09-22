import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(120).optional(),
});

/** Phase-0 waitlist capture. Rate-limited, validated, idempotent per email. */
export async function POST(req: NextRequest) {
  const allowed = await rateLimit(`waitlist:${clientIp(req.headers)}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  await prisma.waitlist.upsert({
    where: { email },
    update: {},
    create: { email, source: parsed.data.source ?? "landing" },
  });

  return NextResponse.json({ ok: true });
}
