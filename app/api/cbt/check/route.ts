import { jsonNoStore } from "@/lib/requests";

/** @deprecated Answer checks are bound to a saved session at /api/cbt/sessions/[id]. */
export const dynamic = "force-dynamic";

export async function POST() {
  return jsonNoStore(
    {
      error:
        "Answer checks require a saved practice session. Use the student personal-practice flow.",
    },
    { status: 410 },
  );
}
