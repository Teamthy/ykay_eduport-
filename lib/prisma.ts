/**
 * Prisma client singleton with connection pooling for production.
 *
 * In development, hot-reload would create a new client on every save,
 * exhausting the connection pool. This singleton prevents that.
 *
 * For 1K DAU readiness:
 * - Connection pooling via ?connection_limit=20 on DATABASE_URL
 * - Prisma Accelerate (optional) for edge caching
 * - Prepared statements for frequently executed queries
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Log slow queries in development
  const logLevel =
    process.env.NODE_ENV === "development"
      ? (["query", "error", "warn"] as const)
      : (["error"] as const);

  return new PrismaClient({
    log: logLevel.map((level) =>
      level === "query" ? { emit: "event", level: "query" } : { emit: "stdout", level },
    ),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV === "development") {
  globalForPrisma.prisma = prisma;

  // Log slow queries (>500ms) in development
  prisma.$on(
    "query" as never,
    ((e: { query: string; duration: number }) => {
      if (e.duration > 500) {
        console.warn(`[prisma] Slow query (${e.duration}ms): ${e.query.slice(0, 200)}`);
      }
    }) as never,
  );
}
