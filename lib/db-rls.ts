import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

/**
 * Run database operations with Postgres Row-Level Security enforcement.
 *
 * Sets the session variable `app.current_school_id` inside a transaction so
 * that RLS policies (created in migration 20260727000000_eduos_rls) restrict
 * every query to the specified school — a DB-level guarantee that one school
 * can never see another's data, even if the application has a WHERE-clause bug.
 *
 * Usage (opt-in — routes that don't use this still work, just without the
 * DB-level isolation):
 *
 *   const students = await withSchool(user.schoolId, (tx) =>
 *     tx.studentProfile.findMany({ where: { isActive: true } })
 *   );
 *
 * Multiple queries in one call share the same transaction + RLS context:
 *
 *   const [students, invoices] = await withSchool(user.schoolId, async (tx) => {
 *     return Promise.all([
 *       tx.studentProfile.count({ where: { isActive: true } }),
 *       tx.feeInvoice.count({ where: { status: "UNPAID" } }),
 *     ]);
 *   });
 */
export async function withSchool<T>(schoolId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.current_school_id = ${schoolId}`;
    return fn(tx);
  });
}
