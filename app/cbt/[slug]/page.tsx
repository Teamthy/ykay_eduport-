import { redirect } from "next/navigation";

/**
 * Legacy subject URLs are no longer served by the retired stateless CBT runner.
 * Keep old links useful by sending them to the persisted personal-practice
 * flow, which loads reviewed questions from /api/cbt/sessions. The old route
 * sent users to /student/exams — the teacher-authored exam catalogue, not the
 * 10k-question personal-practice bank.
 */
export default function CbtSubjectPage() {
  redirect("/login?next=/student/personal-practice");
}
