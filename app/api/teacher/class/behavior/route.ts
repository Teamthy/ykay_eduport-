import { NextResponse } from "next/server";
import { getTeacherContext, getFormClassStudents } from "@/lib/teacher-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getTeacherContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const students = await getFormClassStudents(ctx);

  // Behavior records would come from a future BehaviorRecord model.
  // For now, return the roster so the page renders with real student names.
  return NextResponse.json({
    className: ctx.formClassName,
    students: students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      displayName: s.displayName,
      records: [], // Behavior records not yet implemented
    })),
  });
}
