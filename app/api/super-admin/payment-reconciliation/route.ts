import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Finance review queue for authenticated provider events that could not be posted. */
export async function GET() {
  const user = await requireRole(["SUPER_ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const issues = await prisma.paymentReconciliationIssue.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({ issues });
}

const resolveSchema = z.object({
  issueId: z.string().trim().min(1),
  resolutionNote: z.string().trim().min(10).max(1000),
});

/** Resolve only after reconciling the provider statement; this does not post money. */
export async function PATCH(request: NextRequest) {
  const user = await requireRole(["SUPER_ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input: z.infer<typeof resolveSchema>;
  try {
    input = resolveSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Provide an issueId and a reconciliation note." },
      { status: 400 },
    );
  }

  const resolved = await prisma.paymentReconciliationIssue.updateMany({
    where: { id: input.issueId, status: "OPEN" },
    data: {
      status: "RESOLVED",
      resolutionNote: input.resolutionNote,
      resolvedByUserId: user.id,
      resolvedAt: new Date(),
    },
  });
  if (resolved.count !== 1) {
    return NextResponse.json({ error: "Open reconciliation issue not found." }, { status: 404 });
  }

  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      actorUserId: user.id,
      action: "PAYMENT_RECONCILIATION_RESOLVED",
      entityType: "PaymentReconciliationIssue",
      entityId: input.issueId,
      metadata: { resolutionNote: input.resolutionNote },
    },
  });
  return NextResponse.json({ ok: true });
}
