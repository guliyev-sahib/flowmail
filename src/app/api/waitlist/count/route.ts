import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public waitlist size, for the social-proof counter on the landing page. */
export async function GET() {
  try {
    const count = await prisma.waitlist.count();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: null });
  }
}
