"use client";

import PortalSidebar from "@/components/PortalSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import PersonalPracticeFlow from "@/components/cbt/PersonalPracticeFlow";
import StudentCbtNav from "@/components/student/StudentCbtNav";
import { STUDENT_SIDEBAR_ITEMS } from "@/components/student/sidebarItems";

export default function StudentPersonalPracticePage() {
  return (
    <>
      <PortalTopbar title="Personal CBT practice" />
      <section className="px-6 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
          <PortalSidebar portalName="Student" portalType="student" items={STUDENT_SIDEBAR_ITEMS} />
          <main className="min-w-0 flex-1 space-y-6">
            <div className="space-y-4">
              <StudentCbtNav active="practice" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
                  Reviewed curriculum bank
                </p>
                <h1 className="mt-2 font-display text-4xl text-[var(--text-primary)]">
                  Personal practice
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                  Build a focused or mixed-topic CBT set for JSS 1–3 or SS 1–3. Your answers are
                  saved as you go, and each checked answer includes an explanation.
                </p>
              </div>
            </div>
            <PersonalPracticeFlow />
          </main>
        </div>
      </section>
    </>
  );
}
