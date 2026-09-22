import { NextRequest, NextResponse } from "next/server";
import { resolveUnsubscribe } from "@/lib/flows";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Unsubscribe via a signed, expiring token.
 *
 * GET  = show a confirmation page. It does NOT mutate state, because mail
 *        scanners / link prefetchers (Outlook SafeLinks, antivirus) follow GET
 *        links and would otherwise silently unsubscribe people.
 * POST  = actually unsubscribe (also supports RFC 8058 One-Click Unsubscribe,
 *        which mail clients send as POST).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !resolveUnsubscribe(token)) {
    return htmlResponse("This unsubscribe link is invalid or has expired.", 400);
  }

  // Confirmation page with a POST form — no state change on GET.
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Unsubscribe</title></head>
     <body style="font-family:system-ui;max-width:480px;margin:80px auto;padding:0 16px;text-align:center">
       <h1 style="font-size:20px">Unsubscribe?</h1>
       <p style="color:#555">Click below to stop receiving these emails.</p>
       <form method="post">
         <input type="hidden" name="token" value="${escapeAttr(token)}">
         <button type="submit" style="padding:12px 20px;background:#111827;color:#fff;border:none;border-radius:8px;cursor:pointer">
           Confirm unsubscribe
         </button>
       </form>
     </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function POST(req: NextRequest) {
  // Throttle: a signed token is required anyway, but cap abuse.
  const allowed = await rateLimit(`unsub:${clientIp(req.headers)}`, 30, 60);
  if (!allowed) return htmlResponse("Too many requests. Try again shortly.", 429);

  // Token may arrive in the querystring (List-Unsubscribe URL) or the form body.
  const token =
    req.nextUrl.searchParams.get("token") ??
    (await req.formData().catch(() => null))?.get("token")?.toString() ??
    null;

  if (!token) return htmlResponse("Missing token.", 400);

  const claims = resolveUnsubscribe(token);
  if (!claims) return htmlResponse("This link is invalid or has expired.", 400);

  await prisma.contact.update({
    where: { id: claims.contactId },
    data: { subscribed: false },
  });
  await prisma.message.updateMany({
    where: { contactId: claims.contactId, status: "SCHEDULED" },
    data: { status: "SUPPRESSED" },
  });

  return htmlResponse("You've been unsubscribed. You won't receive further emails.", 200);
}

function htmlResponse(message: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1"></head>
     <body style="font-family:system-ui;max-width:480px;margin:80px auto;padding:0 16px;text-align:center">
       <p>${escapeAttr(message)}</p>
     </body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
