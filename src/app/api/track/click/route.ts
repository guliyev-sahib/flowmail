import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email click tracking. GET /api/track/click?t=<signed token>.
 * The destination URL is embedded in the SIGNED token — never taken from a raw
 * query param — so this can't be abused as an open redirect.
 */
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  const claims = t
    ? verifyToken<{ mid: string; url: string }>("track-click", t)
    : null;

  if (!claims?.url) {
    return NextResponse.redirect(env.SHOPIFY_APP_URL);
  }

  // Defense-in-depth: only ever redirect to http(s).
  let dest = env.SHOPIFY_APP_URL;
  try {
    const u = new URL(claims.url);
    if (u.protocol === "http:" || u.protocol === "https:") dest = claims.url;
  } catch {
    /* keep default */
  }

  if (claims.mid) {
    try {
      await prisma.message.updateMany({
        where: { id: claims.mid, clickedAt: null },
        data: { clickedAt: new Date(), status: "CLICKED" },
      });
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.redirect(dest);
}
