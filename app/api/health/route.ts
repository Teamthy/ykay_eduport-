import { NextResponse } from "next/server";
import { getAppReadinessMode, isPaystackReady } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  readinessMode: "final" | "temporary";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: "up" | "down"; latencyMs: number };
    redis: { status: "configured" | "not_configured" | "down" };
    admissionStorage: { configured: boolean };
    malwareScanner: { configured: boolean };
    paystack: { configured: boolean };
  };
}

export async function GET() {
  const readinessMode = getAppReadinessMode();
  const storageConfigured = Boolean(
    process.env.S3_BUCKET?.trim() &&
    process.env.S3_ACCESS_KEY_ID?.trim() &&
    process.env.S3_SECRET_ACCESS_KEY?.trim(),
  );
  const scannerConfigured = Boolean(process.env.MALWARE_SCANNER_URL?.trim());
  const paystackConfigured = isPaystackReady();
  const checks: HealthStatus["checks"] = {
    database: { status: "down", latencyMs: 0 },
    redis: { status: "not_configured" },
    admissionStorage: { configured: storageConfigured },
    malwareScanner: { configured: scannerConfigured },
    paystack: { configured: paystackConfigured },
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
  // Only the DATABASE decides the HTTP status, so a Redis or deferred
  // dependency issue does not cause the platform to remove a serving instance.
  // The JSON body still reports degraded readiness, including temporary mode.
  const databaseUp = checks.database.status === "up";
  const dependenciesReady =
    checks.redis.status === "configured" &&
    storageConfigured &&
    scannerConfigured &&
    paystackConfigured;
  const fullyReady = databaseUp && readinessMode === "final" && dependenciesReady;

  const status: HealthStatus["status"] = fullyReady
    ? "healthy"
    : databaseUp
      ? "degraded"
      : "unhealthy";

  const body: HealthStatus = {
    status,
    readinessMode,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks,
  };

  return NextResponse.json(body, { status: databaseUp ? 200 : 503 });
}
