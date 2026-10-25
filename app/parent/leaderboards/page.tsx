"use client";

import PortalSidebar from "@/components/PortalSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import LeaderboardPanel from "@/components/leaderboards/LeaderboardPanel";
import { PARENT_SIDEBAR_ITEMS } from "@/components/parent/sidebarItems";

export default function ParentLeaderboardsPage() {
  return (
    <>
      <PortalTopbar title="Ward rankings" />
      <section className="px-6 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
          <PortalSidebar portalName="Parent" portalType="parent" items={PARENT_SIDEBAR_ITEMS} />
          <main className="min-w-0 flex-1 space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
                Private ward view
              </p>
              <h1 className="mt-2 font-display text-4xl text-[var(--text-primary)]">
                Class and subject rankings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                View your linked child&apos;s anonymous star standing among classmates or learners
                enrolled in the same subject. The portal never shares another learner&apos;s name or
                raw marks.
              </p>
            </div>
            <LeaderboardPanel audience="parent" />
          </main>
        </div>
      </section>
    </>
  );
}
