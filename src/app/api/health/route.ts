import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness/readiness check: verifies the app can reach Postgres and Redis. */
export async function GET() {
  const checks: Record<string, "ok" | "down"> = { db: "down", redis: "down" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    /* leave as down */
  }

  try {
    const pong = await connection.ping();
    if (pong === "PONG") checks.redis = "ok";
  } catch {
    /* leave as down */
  }

  const healthy = checks.db === "ok" && checks.redis === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
