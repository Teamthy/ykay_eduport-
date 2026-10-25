import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/requests";
import { loadAdminLeaderboardView } from "@/lib/leaderboards-server";
import type { LeaderboardCategory, LeaderboardScope } from "@/lib/leaderboards";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole([
      UserRole.ADMIN,
      UserRole.DIRECTOR,
      UserRole.COORDINATOR,
      UserRole.SUPER_ADMIN,
    ]);
    if (!user) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });

    const categoryValue = (request.nextUrl.searchParams.get("category") ?? "OVERALL").toUpperCase();
    const scopeValue = (request.nextUrl.searchParams.get("scope") ?? "CLASS").toUpperCase();
    if (!["CA", "EXAM", "OVERALL"].includes(categoryValue)) {
      return jsonNoStore({ error: "Choose CA, Exams or Overall." }, { status: 400 });
    }
    if (!["CLASS", "SUBJECT"].includes(scopeValue)) {
      return jsonNoStore({ error: "Choose a class or subject cohort." }, { status: 400 });
    }

    const result = await loadAdminLeaderboardView({
      schoolId: user.schoolId,
      classId: request.nextUrl.searchParams.get("classId")?.trim() || null,
      category: categoryValue as LeaderboardCategory,
      scope: scopeValue as LeaderboardScope,
      subjectId: request.nextUrl.searchParams.get("subjectId")?.trim() || null,
    });
    if (!result.ok) return jsonNoStore({ error: result.error }, { status: result.status });

    return jsonNoStore({ category: categoryValue, scope: scopeValue, ...result.data });
  } catch {
    return jsonNoStore(
      { error: "The admin leaderboard is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}
