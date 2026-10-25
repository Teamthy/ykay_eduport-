"use client";

import PortalTopbar from "@/components/PortalTopbar";
import PortalSidebar from "@/components/PortalSidebar";
import { STUDENT_SIDEBAR_ITEMS } from "@/components/student/sidebarItems";
import MessagesInbox from "@/components/MessagesInbox";
import { MessageCircle } from "lucide-react";

const SIDEBAR_ITEMS = STUDENT_SIDEBAR_ITEMS;

/**
 * Student messages.
 *
 * Students had no messaging at all: `reachableStudentIds()` returned an empty
 * array for the STUDENT role, so even if a page had existed the inbox would
 * have been blank. The library now resolves a student to their OWN profile
 * only — never their class — so they see conversations about themselves and
 * nothing about a classmate.
 *
 * `canCompose` is false. A student replying to their form teacher is the
 * intended flow; letting them open brand-new threads about themselves at will
 * is a moderation problem nobody has asked for yet, and it is far easier to
 * turn on later than to claw back.
 */
export default function StudentMessagesPage() {
  return (
    <>
      <PortalTopbar />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pt-28 pb-14">
          <div className="w-full">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <MessageCircle size={11} /> Messages
            </span>
            <h1 className="mt-3 font-display text-4xl tracking-widest text-white md:text-6xl">
              MY <span className="text-brand-green">MESSAGES</span>
            </h1>
            <p className="mt-3 max-w-2xl font-body text-sm text-white/60">
              Conversations between you, your teachers and the school office.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="w-full flex flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />
            <div className="min-w-0 flex-1">
              <MessagesInbox
                canCompose={false}
                emptyHint="No messages yet. When a teacher or the office starts a conversation about you, it will appear here and you can reply."
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
