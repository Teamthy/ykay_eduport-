import { jsonNoStore } from "@/lib/requests";

/** @deprecated Session results are graded and persisted by /api/cbt/sessions/[id]. */
export const dynamic = "force-dynamic";

export async function POST() {
  return jsonNoStore(
    { error: "Submit an active saved practice session from the student portal." },
    { status: 410 },
  );
}
