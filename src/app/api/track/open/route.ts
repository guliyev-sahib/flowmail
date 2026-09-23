import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1x1 transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function pixelResponse() {
  return new NextResponse(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}

/** Email open tracking. GET /api/track/open?t=<signed token>. Always returns a
 * pixel (never leaks whether the token was valid). */
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  const claims = t ? verifyToken<{ mid: string }>("track-open", t) : null;
  if (claims?.mid) {
    try {
      await prisma.message.updateMany({
        where: { id: claims.mid, openedAt: null },
        data: { openedAt: new Date(), status: "OPENED" },
      });
    } catch {
      /* tracking is best-effort */
    }
  }
  return pixelResponse();
}
