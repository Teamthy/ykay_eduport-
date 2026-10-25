import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/requests";
import { getParentReportCardContext } from "@/lib/report-cards";
import { prisma } from "@/lib/prisma";
import { loadLeaderboardView } from "@/lib/leaderboards-server";
import type { LeaderboardCategory, LeaderboardScope } from "@/lib/leaderboards";

export const dynamic = "force-dynamic";

function parseFilters(request: NextRequest) {
  const category = (request.nextUrl.searchParams.get("category") ?? "OVERALL").toUpperCase();
  const scope = (request.nextUrl.searchParams.get("scope") ?? "CLASS").toUpperCase();
  if (!["CA", "EXAM", "OVERALL"].includes(category)) return null;
  if (!["CLASS", "SUBJECT"].includes(scope)) return null;
  return {
    category: category as LeaderboardCategory,
    scope: scope as LeaderboardScope,
    subjectId: request.nextUrl.searchParams.get("subjectId")?.trim() || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getParentReportCardContext();
    if (!context) {
      return jsonNoStore(
        { error: "No active parent profile is linked to this account." },
        { status: 404 },
      );
    }

    const filters = parseFilters(request);
    if (!filters) {
      return jsonNoStore(
        { error: "Choose CA, Exams or Overall and a Class or Subject cohort." },
        { status: 400 },
      );
    }

    const children = context.parentProfile.studentLinks.map((link) => ({
      id: link.studentProfile.id,
      studentId: link.studentProfile.studentId,
      displayName: link.studentProfile.displayName,
      className: link.studentProfile.currentClass.displayName,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
    }));
    if (!children.length) {
      return jsonNoStore({
        parent: { displayName: context.parentProfile.displayName },
        children: [],
        selectedChild: null,
        leaderboard: null,
      });
    }

    const requestedStudentId = request.nextUrl.searchParams.get("studentId")?.trim();
    const selectedChild = requestedStudentId
      ? children.find((child) => child.id === requestedStudentId)
      : children[0];
    if (!selectedChild) {
      return jsonNoStore(
        { error: "That student is not linked to your parent account." },
        { status: 404 },
      );
    }

    const student = await prisma.studentProfile.findFirst({
      where: {
        id: selectedChild.id,
        schoolId: context.user.schoolId,
        isActive: true,
      },
      select: { id: true, currentClassId: true },
    });
    if (!student) {
      return jsonNoStore({ error: "Student profile not found." }, { status: 404 });
    }

    const result = await loadLeaderboardView({
      schoolId: context.user.schoolId,
      classId: student.currentClassId,
      viewerStudentId: student.id,
      ...filters,
    });
    if (!result.ok) return jsonNoStore({ error: result.error }, { status: result.status });

    return jsonNoStore({
      parent: { displayName: context.parentProfile.displayName },
      children,
      selectedChild,
      leaderboard: result.data,
    });
  } catch {
    return jsonNoStore(
      { error: "The parent leaderboard is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}
