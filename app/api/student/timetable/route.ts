import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireRole([UserRole.STUDENT]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the student's class
  const student = await prisma.studentProfile.findFirst({
    where: { schoolId: user.schoolId, userId: user.id },
    include: { currentClass: true },
  });

  if (!student?.currentClass) {
    return NextResponse.json({ schedule: [] });
  }

  // For now, return an empty schedule.
  // The full timetable feature requires a Timetable model which can be
  // added in a future migration. This ensures the page works gracefully
  // without mock data.
  return NextResponse.json({
    schedule: [],
    class: student.currentClass.displayName,
  });
}
