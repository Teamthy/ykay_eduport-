import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFinanceContext } from "@/lib/finance";
import { assertNotImpersonating } from "@/lib/session";
import {
  NoCurrentTermError,
  requireCurrentLabels,
  resolveCurrentLabels,
} from "@/lib/academic-session";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  category: z.string().trim().min(2).max(80),
  amountLimit: z.number().int().positive().max(2_000_000_000),
  termLabel: z.string().trim().min(2).max(40).optional(),
  sessionLabel: z.string().trim().min(4).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function GET() {
  const context = await getAdminFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionLabel, termLabel, source } = await resolveCurrentLabels(context.user.schoolId);

  const [budgets, expenses] = await Promise.all([
    prisma.budget.findMany({
      take: 500,
      where: { schoolId: context.user.schoolId, sessionLabel },
      orderBy: [{ termLabel: "asc" }, { category: "asc" }],
    }),
    prisma.expense.findMany({
      take: 500,
      where: { schoolId: context.user.schoolId },
      select: { category: true, amount: true, spentAt: true },
    }),
  ]);

  // Approximate term spend: current calendar window is enough for ops MVP
  const spentByCategory = new Map<string, number>();
  for (const e of expenses) {
    spentByCategory.set(
      e.category.toLowerCase(),
      (spentByCategory.get(e.category.toLowerCase()) || 0) + e.amount,
    );
  }

  return NextResponse.json({
    sessionLabel,
    termLabel,
    labelSource: source,
    budgets: budgets.map((b) => {
      const spent = spentByCategory.get(b.category.toLowerCase()) || 0;
      const remaining = b.amountLimit - spent;
      return {
        id: b.id,
        category: b.category,
        termLabel: b.termLabel,
        sessionLabel: b.sessionLabel,
        amountLimit: b.amountLimit,
        spent,
        remaining,
        utilizationPct: b.amountLimit
          ? Math.min(999, Math.round((spent / b.amountLimit) * 100))
          : 0,
        notes: b.notes,
        overBudget: spent > b.amountLimit,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const impersonating = assertNotImpersonating(context.user);
  if (impersonating) return impersonating;

  let input: z.infer<typeof upsertSchema>;
  try {
    input = upsertSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid budget details." }, { status: 400 });
  }

  // A budget keys on (category, term, session) — a guessed term silently
  // creates a second budget for the same real-world period.
  let sessionLabel: string;
  let termLabel: string;
  try {
    const current = await requireCurrentLabels(context.user.schoolId);
    sessionLabel = input.sessionLabel || current.sessionLabel;
    termLabel = input.termLabel || current.termLabel;
  } catch (labelError) {
    if (labelError instanceof NoCurrentTermError && !(input.sessionLabel && input.termLabel)) {
      return NextResponse.json({ error: labelError.message }, { status: 409 });
    }
    if (!(labelError instanceof NoCurrentTermError)) throw labelError;
    // Both labels supplied explicitly — the caller is not relying on a guess.
    sessionLabel = input.sessionLabel as string;
    termLabel = input.termLabel as string;
  }

  const budget = await prisma.budget.upsert({
    where: {
      schoolId_category_termLabel_sessionLabel: {
        schoolId: context.user.schoolId,
        category: input.category,
        termLabel,
        sessionLabel,
      },
    },
    create: {
      schoolId: context.user.schoolId,
      category: input.category,
      termLabel,
      sessionLabel,
      amountLimit: input.amountLimit,
      notes: input.notes || null,
      createdByUserId: context.user.id,
    },
    update: {
      amountLimit: input.amountLimit,
      notes: input.notes || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId: context.user.schoolId,
      actorUserId: context.user.id,
      action: "BUDGET_UPSERTED",
      entityType: "Budget",
      entityId: budget.id,
      ipAddress: getClientIp(request),
      metadata: {
        category: budget.category,
        amountLimit: budget.amountLimit,
        termLabel,
        sessionLabel,
      },
    },
  });

  return NextResponse.json({ budget }, { status: 201 });
}
