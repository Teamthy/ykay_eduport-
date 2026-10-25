import { jsonNoStore } from "@/lib/requests";

/** @deprecated Use the persisted /api/cbt/sessions flow. */
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonNoStore(
    {
      error:
        "This CBT endpoint is retired. Start a resumable personal-practice set in the student portal.",
      next: "/student/personal-practice",
    },
    { status: 410 },
  );
}
