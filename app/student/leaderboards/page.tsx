"use client";

import PortalSidebar from "@/components/PortalSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import LeaderboardPanel from "@/components/leaderboards/LeaderboardPanel";
import StudentCbtNav from "@/components/student/StudentCbtNav";
import { STUDENT_SIDEBAR_ITEMS } from "@/components/student/sidebarItems";

export default function StudentLeaderboardsPage() {
  return (
    <>
      <PortalTopbar title="Leaderboards" />
      <section className="px-6 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
          <PortalSidebar portalName="Student" portalType="student" items={STUDENT_SIDEBAR_ITEMS} />
          <main className="min-w-0 flex-1 space-y-6">
            <div className="space-y-4">
              <StudentCbtNav active="leaderboards" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
                  Released results only
                </p>
                <h1 className="mt-2 font-display text-4xl text-[var(--text-primary)]">
                  Your learning standings
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                  Compare your star standing within your current class or an enrolled subject
                  cohort. Other learners&apos; names and marks stay private.
                </p>
              </div>
            </div>
            <LeaderboardPanel audience="student" />
          </main>
        </div>
      </section>
    </>
  );
}
