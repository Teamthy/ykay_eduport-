import { SubjectCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";
import {
  DEFAULT_CATALOGUE,
  SUBJECT_ADMIN_ROLES,
  listSubjects,
  syncCompulsorySubjects,
  upsertSubject,
} from "@/lib/subjects";

export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  level: z.string().trim().min(2).max(10),
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().max(12).nullable().optional(),
  category: z.nativeEnum(SubjectCategory),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SEED_DEFAULTS"), level: z.string().trim().min(2).max(10) }),
  z.object({
    action: z.literal("SYNC_COMPULSORY"),
    level: z.string().trim().min(2).max(10).optional(),
  }),
]);

export async function GET(request: NextRequest) {
  const user = await requireRole(SUBJECT_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const level = request.nextUrl.searchParams.get("level") || undefined;

  const [subjects, levels] = await Promise.all([
    listSubjects(user.schoolId, level),
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId, isActive: true },
      select: { level: true },
      distinct: ["level"],
      orderBy: { level: "asc" },
    }),
  ]);

  return NextResponse.json({
    selectedLevel: level ?? null,
    levels: levels.map((l) => l.level),
    hasDefaultsFor: Object.keys(DEFAULT_CATALOGUE),
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      level: s.level,
      category: s.category,
      studentCount: s._count.enrolments,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireRole(SUBJECT_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input: z.infer<typeof upsertSchema>;
  try {
    input = upsertSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Provide a level, name and category." }, { status: 400 });
  }

  const subject = await upsertSubject({
    schoolId: user.schoolId,
    level: input.level.toUpperCase(),
    name: input.name,
    code: input.code ?? null,
    category: input.category,
  });

  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      actorUserId: user.id,
      action: "SUBJECT_SAVED",
      entityType: "Subject",
      entityId: subject.id,
      ipAddress: getClientIp(request),
      metadata: { name: subject.name, level: subject.level, category: subject.category },
    },
  });

  return NextResponse.json({ ok: true, subject }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await requireRole(SUBJECT_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input: z.infer<typeof actionSchema>;
  try {
    input = actionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  if (input.action === "SEED_DEFAULTS") {
    const level = input.level.toUpperCase();
    const template = DEFAULT_CATALOGUE[level];
    if (!template) {
      return NextResponse.json(
        { error: `No default catalogue for ${level}. Add subjects manually.` },
        { status: 400 },
      );
    }
    for (const entry of template) {
      await upsertSubject({
        schoolId: user.schoolId,
        level,
        name: entry.name,
        category: entry.category,
      });
    }
    return NextResponse.json({
      ok: true,
      message: `${template.length} subject(s) added for ${level}. Edit or remove any that do not apply.`,
    });
  }

  // Auto-enrol every student at the level into its compulsory subjects.
  // Electives are never touched — nobody should be assigned a subject they
  // did not choose.
  const result = await syncCompulsorySubjects(user.schoolId, input.level?.toUpperCase());
  return NextResponse.json({
    ok: true,
    ...result,
    message: `${result.created} compulsory enrolment(s) created.`,
  });
}

export async function DELETE(request: NextRequest) {
  const user = await requireRole(SUBJECT_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing subject id." }, { status: 400 });

  const subject = await prisma.subject.findFirst({ where: { id, schoolId: user.schoolId } });
  if (!subject) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Retire rather than delete: gradebooks and exams reference it, and its
  // enrolment rows are a record of what students were taught.
  await prisma.subject.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ ok: true, message: `${subject.name} retired.` });
}
