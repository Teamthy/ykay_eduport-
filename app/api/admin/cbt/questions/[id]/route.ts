import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";
import { cbtQuestionEditableSchema, haveDistinctOptions } from "@/lib/cbt-question-validation";

export const dynamic = "force-dynamic";

const questionIdParams = z.object({ id: z.string().trim().min(1).max(100) });

async function getAdmin() {
  const auth = await requireRoleOr503([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (auth instanceof NextResponse) return auth;
  const impersonationBlock = assertNotImpersonating(auth);
  if (impersonationBlock) return impersonationBlock;
  return auth;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAdmin();
  if (auth instanceof NextResponse) return auth;
  const params = questionIdParams.safeParse(await context.params);
  if (!params.success) return NextResponse.json({ error: "Invalid question id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (body && typeof body === "object" && "action" in body && body.action === "RESTORE") {
    try {
      const restored = await prisma.cbtQuestion.updateMany({
        where: { id: params.data.id, status: "archived" },
        data: {
          status: "draft",
          reviewedByUserId: null,
          reviewedAt: null,
          reviewReference: null,
          reviewNotes: null,
        },
      });
      if (!restored.count) {
        return NextResponse.json(
          { error: "Archived question not found; refresh the list and try again." },
          { status: 404 },
        );
      }
      return NextResponse.json({ id: params.data.id, status: "draft" });
    } catch {
      return NextResponse.json(
        { error: "The archived question could not be restored right now." },
        { status: 503 },
      );
    }
  }

  const parsed = cbtQuestionEditableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter valid question content before saving." },
      { status: 400 },
    );
  }
  if (!haveDistinctOptions(parsed.data.options)) {
    return NextResponse.json(
      { error: "The four answer options must be distinct." },
      { status: 400 },
    );
  }

  try {
    const question = await prisma.cbtQuestion.findUnique({
      where: { id: params.data.id },
      select: { id: true, status: true },
    });
    if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    if (question.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft questions can be edited. Return a reviewed question to draft first." },
        { status: 409 },
      );
    }

    const updated = await prisma.cbtQuestion.updateMany({
      where: { id: params.data.id, status: "draft" },
      data: parsed.data,
    });
    if (!updated.count) {
      return NextResponse.json(
        { error: "Question state changed while saving. Refresh and try again." },
        { status: 409 },
      );
    }
    return NextResponse.json({ question: { id: params.data.id, status: "draft" } });
  } catch {
    return NextResponse.json(
      { error: "The draft question could not be saved right now." },
      { status: 503 },
    );
  }
}

/** Archive instead of hard-delete so historic practice answers remain intact. */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAdmin();
  if (auth instanceof NextResponse) return auth;
  const params = questionIdParams.safeParse(await context.params);
  if (!params.success) return NextResponse.json({ error: "Invalid question id." }, { status: 400 });

  try {
    const existing = await prisma.cbtQuestion.findUnique({
      where: { id: params.data.id },
      select: { id: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    if (existing.status !== "archived") {
      await prisma.cbtQuestion.update({
        where: { id: params.data.id },
        data: { status: "archived" },
        select: { id: true },
      });
    }
    return NextResponse.json({ id: params.data.id, status: "archived" });
  } catch {
    return NextResponse.json(
      { error: "The question could not be archived right now." },
      { status: 503 },
    );
  }
}
