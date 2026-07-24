import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: "up" | "down"; latencyMs: number };
    redis: { status: "configured" | "not_configured" | "down" };
  };
}

export async function GET() {
  const checks: HealthStatus["checks"] = {
    database: { status: "down", latencyMs: 0 },
    redis: { status: "not_configured" },
  };

  // ── Database check ─────────────────────────────────────────
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "up", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "down", latencyMs: Date.now() - dbStart };
  }

  // ── Redis check ────────────────────────────────────────────
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({ url: redisUrl, token: redisToken });
      await redis.ping();
      checks.redis = { status: "configured" };
    } catch {
      checks.redis = { status: "down" };
    }
  }

  // ── Overall status ─────────────────────────────────────────
  const allUp = checks.database.status === "up" && checks.redis.status !== "down";

  const status: HealthStatus["status"] = allUp
    ? "healthy"
    : checks.database.status === "up"
      ? "degraded"
      : "unhealthy";

  const body: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks,
  };

  return NextResponse.json(body, { status: allUp ? 200 : 503 });
}
