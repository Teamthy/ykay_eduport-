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
 * - Global findMany safety cap (see below) so a missing `take` can never load a
 *   whole table. Routes that need a specific limit already pass `take`.
 */

import { PrismaClient } from "@prisma/client";

/** Hard ceiling applied to any findMany that does not specify its own `take`. */
const DEFAULT_FIND_MANY_TAKE = 1000;

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  // Log slow queries in development
  const logLevel =
    process.env.NODE_ENV === "development"
      ? (["query", "error", "warn"] as const)
      : (["error"] as const);

  const base = new PrismaClient({
    log: logLevel.map((level) =>
      level === "query" ? { emit: "event", level: "query" } : { emit: "stdout", level },
    ),
  });

  if (process.env.NODE_ENV === "development") {
    base.$on(
      "query" as never,
      ((e: { query: string; duration: number }) => {
        if (e.duration > 500) {
          console.warn(`[prisma] Slow query (${e.duration}ms): ${e.query.slice(0, 200)}`);
        }
      }) as never,
    );
  }

  // Safety net: cap any unbounded findMany. Aggregation endpoints that need the
  // full set should use SQL aggregation (groupBy/_count/etc.), not findMany.
  return base.$extends({
    query: {
      $allOperations: async ({ args, query, operation }) => {
        if (operation === "findMany" && (args as { take?: number }).take === undefined) {
          (args as { take?: number }).take = DEFAULT_FIND_MANY_TAKE;
        }
        return query(args);
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV === "development") {
  globalForPrisma.prisma = prisma;
}
