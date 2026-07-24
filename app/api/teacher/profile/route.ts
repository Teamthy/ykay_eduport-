import { NextResponse } from "next/server";
import { getTeacherContext } from "@/lib/teacher-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getTeacherContext();
  if (!ctx)
    return NextResponse.json({ error: "Unauthorized or no teacher profile." }, { status: 401 });

  return NextResponse.json({
    teacher: {
      id: ctx.profile.id,
      displayName: ctx.profile.displayName,
      roleLabel: ctx.profile.roleLabel,
      photoUrl: ctx.profile.photoUrl,
      email: ctx.user.email,
      isFormTeacher: ctx.isFormTeacher,
      formClassName: ctx.formClassName,
      formClassId: ctx.formClassId,
      subjects: [...new Set(ctx.subjectAssignments.map((a) => a.subjectName).filter(Boolean))],
      classes: ctx.profile.classAssignments.map((a) => ({
        id: a.classroom.id,
        name: a.classroom.displayName,
        role: a.role,
        subject: a.subjectName,
      })),
    },
  });
}
