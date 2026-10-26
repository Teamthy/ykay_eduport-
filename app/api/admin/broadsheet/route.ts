import { NextRequest, NextResponse } from "next/server";
import {
  buildBroadsheet,
  listPeriods,
  pickPeriod,
  reportsForPeriod,
  type BroadsheetReport,
} from "@/lib/broadsheet";
import { GRADEBOOK_ADMIN_ROLES } from "@/lib/gradebook";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // One role list for the whole results surface. This route used to declare its
  // own trio without SUPER_ADMIN while the sidebar offered the page to super
  // admins (and the middleware let them onto /admin), so the page loaded and
  // then failed with "Unauthorized".
  const user = await requireRole(GRADEBOOK_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classId = request.nextUrl.searchParams.get("classId");
  const session = request.nextUrl.searchParams.get("session");
  const term = request.nextUrl.searchParams.get("term");

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: user.schoolId, isActive: true },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  if (!classId) {
    return NextResponse.json({ classes, periods: [], selected: null, broadsheet: null });
  }

  const schoolClass = classes.find((entry) => entry.id === classId);
  if (!schoolClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  // Match on the class the report was ISSUED for, not the student's class
  // today. Keying on currentClassId meant that the moment a cohort was
  // promoted, last year's JSS1A broadsheet silently became "whoever is in
  // JSS1A now" — a different set of children, with the previous year's marks
  // filtered out. classNameSnapshot is written at generation precisely so the
  // record survives promotion.
  const reports = await prisma.reportCard.findMany({
    where: {
      schoolId: user.schoolId,
      classNameSnapshot: schoolClass.displayName,
    },
    // Every term the class has been graded in, so the picker can offer them:
    // 30 students × 6 terms is 180 cards for a single class.
    take: 2000,
    orderBy: [{ generatedAt: "desc" }],
    select: {
      reportNumber: true,
      sessionLabel: true,
      termLabel: true,
      status: true,
      overallAverage: true,
      overallGrade: true,
      classPosition: true,
      generatedAt: true,
      studentProfile: { select: { id: true, studentId: true, displayName: true } },
      subjects: {
        orderBy: { sortOrder: "asc" },
        select: { subject: true, total: true },
      },
    },
  });

  const cards: BroadsheetReport[] = reports.map((report) => ({
    reportNumber: report.reportNumber,
    sessionLabel: report.sessionLabel,
    termLabel: report.termLabel,
    status: report.status,
    overallAverage: report.overallAverage,
    overallGrade: report.overallGrade,
    classPosition: report.classPosition,
    generatedAt: report.generatedAt,
    student: {
      id: report.studentProfile.id,
      studentId: report.studentProfile.studentId,
      displayName: report.studentProfile.displayName,
    },
    subjects: report.subjects.map((subject) => ({
      subject: subject.subject,
      total: subject.total,
    })),
  }));

  const periods = listPeriods(cards);
  const selected = pickPeriod(periods, { session, term });
  const broadsheet = buildBroadsheet(schoolClass.displayName, reportsForPeriod(cards, selected));

  return NextResponse.json({ classes, periods, selected, broadsheet });
}
