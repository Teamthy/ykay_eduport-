import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/requests";
import { getStudentExamContext } from "@/lib/exams";
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
    const context = await getStudentExamContext();
    if (!context) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });

    const filters = parseFilters(request);
    if (!filters) {
      return jsonNoStore(
        { error: "Choose CA, Exams or Overall and a Class or Subject cohort." },
        { status: 400 },
      );
    }

    const result = await loadLeaderboardView({
      schoolId: context.user.schoolId,
      classId: context.studentProfile.currentClassId,
      viewerStudentId: context.studentProfile.id,
      ...filters,
    });
    if (!result.ok) return jsonNoStore({ error: result.error }, { status: result.status });

    return jsonNoStore({
      student: { displayName: context.studentProfile.displayName },
      ...result.data,
    });
  } catch {
    return jsonNoStore(
      { error: "The student leaderboard is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}
