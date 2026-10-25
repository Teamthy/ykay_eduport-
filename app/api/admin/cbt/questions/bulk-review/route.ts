import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BATCH = 100;
const GENERIC_PHRASES = [
  "this sits in the nerdc scheme",
  "common distractor",
  "mixes a related but different idea",
  "not the required relationship",
  "does not satisfy the stem",
];

const schema = z.object({
  ids: z.array(z.string().trim().min(1).max(100)).min(1).max(MAX_BATCH),
  decision: z.literal("APPROVE"),
  reference: z.string().trim().min(10).max(500),
  notes: z.string().trim().min(20).max(2000),
});

type ReviewableRow = {
  id: string;
  stem: string;
  topic: string;
  explanation: string;
  options: unknown;
};

function optionsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()) : [];
}

function rejectionReason(row: ReviewableRow): string | null {
  const options = optionsOf(row.options);
  if (options.length !== 4 || options.some((option) => !option)) return "options incomplete";
  if (new Set(options.map((option) => option.toLowerCase())).size !== 4) return "duplicate options";
  if (row.topic.trim().length < 2) return "topic missing";
  if (row.stem.trim().length < 5) return "stem too short";
  if (row.explanation.trim().length < 40) return "explanation too short";
  const explanation = row.explanation.toLowerCase();
  if (GENERIC_PHRASES.some((phrase) => explanation.includes(phrase))) return "generic explanation";
  return null;
}

/**
 * Reviewer attestation for a batch of draft questions.
 *
 * Approval is still a per-item human decision: this endpoint only performs the
 * state change after the caller confirms they checked every selected item. Each
 * row receives the same citation and notes plus the reviewer identity and
 * timestamp, and a failed structural check blocks that item. It is deliberately
 * capped and draft-only so a mis-click cannot publish the whole bank.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRoleOr503([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (auth instanceof NextResponse) return auth;
  const impersonationBlock = assertNotImpersonating(auth);
  if (impersonationBlock) return impersonationBlock;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Select 1–${MAX_BATCH} draft questions, then supply a source citation and review notes.`,
      },
      { status: 400 },
    );
  }
  const ids = [...new Set(parsed.data.ids)];

  try {
    const rows = (await prisma.cbtQuestion.findMany({
      where: { id: { in: ids }, status: "draft" },
      select: { id: true, stem: true, topic: true, explanation: true, options: true },
    })) as ReviewableRow[];

    const approved: string[] = [];
    const rejected: Array<{ id: string; reason: string }> = [];
    for (const row of rows) {
      const reason = rejectionReason(row);
      if (reason) rejected.push({ id: row.id, reason });
      else approved.push(row.id);
    }
    const missing = ids.filter((id) => !rows.some((row) => row.id === id));

    if (approved.length) {
      const reviewedAt = new Date();
      const result = await prisma.cbtQuestion.updateMany({
        where: { id: { in: approved }, status: "draft" },
        data: {
          status: "reviewed",
          reviewedByUserId: auth.id,
          reviewedAt,
          reviewReference: parsed.data.reference,
          reviewNotes: parsed.data.notes,
        },
      });
      await prisma.auditLog.create({
        data: {
          schoolId: auth.schoolId,
          actorUserId: auth.id,
          action: "CBT_QUESTIONS_BULK_REVIEWED",
          entityType: "CbtQuestion",
          metadata: {
            requested: ids.length,
            approved: result.count,
            rejected: rejected.length,
            skippedNotDraft: missing.length,
            reference: parsed.data.reference,
          },
        },
      });
      return NextResponse.json({
        approved: result.count,
        rejected,
        skippedNotDraft: missing,
      });
    }

    return NextResponse.json({ approved: 0, rejected, skippedNotDraft: missing });
  } catch {
    return NextResponse.json(
      { error: "The batch review service is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}
