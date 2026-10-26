import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";

export const dynamic = "force-dynamic";

const reviewContentSchema = z
  .object({
    topic: z.string().trim().min(2).max(120),
    term: z.enum(["first", "second", "third"]).nullable().optional(),
    week: z.number().int().min(1).max(52).nullable().optional(),
    difficulty: z.number().int().min(1).max(3),
    stem: z.string().trim().min(5).max(4000),
    options: z.array(z.string().trim().min(1).max(1000)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(40).max(4000),
    source: z.string().trim().min(1).max(120),
  })
  .refine((question) => question.week == null || question.term != null, {
    path: ["week"],
    message: "A week assignment requires a verified term assignment.",
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
      select: { id: true, status: true },
    });
    if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    if (parsed.data.decision === "APPROVE" && question.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft questions can be approved. Restore archived items to draft first." },
        { status: 409 },
      );
    }
    if (parsed.data.decision === "RETURN" && question.status !== "reviewed") {
      return NextResponse.json(
        { error: "Only reviewed questions can be returned to draft." },
        { status: 409 },
      );
    }

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
      const updated = await prisma.cbtQuestion.updateMany({
        where: { id, status: "draft" },
        data: {
          topic: content.topic,
          term: content.term ?? null,
          week: content.week ?? null,
          difficulty: content.difficulty,
          stem: content.stem,
          options: content.options,
          correctIndex: content.correctIndex,
          explanation: content.explanation,
          source: content.source,
          status: "reviewed",
          reviewedByUserId: auth.id,
          reviewedByExternalActor: null,
          reviewedAt: new Date(),
          reviewReference: parsed.data.reference,
          reviewNotes: parsed.data.notes,
        },
      });
      if (!updated.count) {
        return NextResponse.json(
          { error: "Question state changed during review. Refresh and try again." },
          { status: 409 },
        );
      }
      return NextResponse.json({ question: { id, status: "reviewed" } });
    }

    const returned = await prisma.cbtQuestion.updateMany({
      where: { id, status: "reviewed" },
      data: {
        status: "draft",
        reviewedByUserId: null,
        reviewedByExternalActor: null,
        reviewedAt: null,
        reviewReference: null,
        reviewNotes: parsed.data.notes,
      },
    });
    if (!returned.count) {
      return NextResponse.json(
        { error: "Question state changed during review. Refresh and try again." },
        { status: 409 },
      );
    }
    return NextResponse.json({ question: { id, status: "draft", reviewNotes: parsed.data.notes } });
  } catch {
    return NextResponse.json(
      { error: "The CBT review service is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}
