"use client";

import PortalSidebar from "@/components/PortalSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import PersonalPracticeFlow from "@/components/cbt/PersonalPracticeFlow";
import { STUDENT_SIDEBAR_ITEMS } from "@/components/student/sidebarItems";

export default function StudentPersonalPracticePage() {
  return (
    <>
      <PortalTopbar title="Personal CBT practice" />
      <section className="px-6 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
          <PortalSidebar portalName="Student" portalType="student" items={STUDENT_SIDEBAR_ITEMS} />
          <main className="min-w-0 flex-1">
            <PersonalPracticeFlow />
          </main>
        </div>
      </section>
    </>
  );
}
