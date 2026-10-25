import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";

export const dynamic = "force-dynamic";

const reviewContentSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  stem: z.string().trim().min(5).max(4000),
  options: z.array(z.string().trim().min(1).max(1000)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(40).max(4000),
});

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVE"),
    reference: z.string().trim().min(10).max(500),
    notes: z.string().trim().min(20).max(2000),
    question: reviewContentSchema,
  }),
  z.object({
    decision: z.literal("RETURN"),
    notes: z.string().trim().min(10).max(2000),
  }),
]);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoleOr503([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (auth instanceof NextResponse) return auth;
  const impersonationBlock = assertNotImpersonating(auth);
  if (impersonationBlock) return impersonationBlock;

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Approval requires a curriculum citation and review notes; returns require notes." },
      { status: 400 },
    );
  }
  const { id } = await context.params;
  try {
    const question = await prisma.cbtQuestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

    if (parsed.data.decision === "APPROVE") {
      const content = parsed.data.question;
      const normalizedOptions = content.options.map((option) => option.toLowerCase());
      const genericPhrases = [
        "this sits in the nerdc scheme",
        "common distractor",
        "mixes a related but different idea",
        "not the required relationship",
        "does not satisfy the stem",
      ];
      const explanation = content.explanation.toLowerCase();
      if (
        new Set(normalizedOptions).size !== 4 ||
        genericPhrases.some((phrase) => explanation.includes(phrase))
      ) {
        return NextResponse.json(
          {
            error:
              "The four options must be distinct and the explanation must be rewritten with question-specific reasoning before approval.",
          },
          { status: 409 },
        );
      }
      const updated = await prisma.cbtQuestion.update({
        where: { id },
        data: {
          topic: content.topic,
          stem: content.stem,
          options: content.options,
          correctIndex: content.correctIndex,
          explanation: content.explanation,
          status: "reviewed",
          reviewedByUserId: auth.id,
          reviewedAt: new Date(),
          reviewReference: parsed.data.reference,
          reviewNotes: parsed.data.notes,
        },
        select: { id: true, status: true, reviewedAt: true, reviewReference: true },
      });
      return NextResponse.json({ question: updated });
    }

    const updated = await prisma.cbtQuestion.update({
      where: { id },
      data: {
        status: "draft",
        reviewedByUserId: null,
        reviewedAt: null,
        reviewReference: null,
        reviewNotes: parsed.data.notes,
      },
      select: { id: true, status: true, reviewNotes: true },
    });
    return NextResponse.json({ question: updated });
  } catch {
    return NextResponse.json(
      { error: "The CBT review service is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}
