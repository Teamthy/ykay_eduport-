"use client";

import { useState } from "react";
import PortalTopbar from "@/components/PortalTopbar";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  FileText,
  MessageCircle,
  Calendar,
  Send,
} from "lucide-react";
import { useApi } from "@/lib/useApi";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Report Cards", href: "/parent/report-cards", icon: FileText },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle, badge: "1" },
  { label: "Events", href: "/parent/events", icon: Calendar },
];

export default function ParentMessagesPage() {
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [reply, setReply] = useState("");
  const { data, loading } = useApi<{
    messages: { id: string; subject: string; body: string; read: boolean; at: string }[];
  }>("/api/parent/messages");
  const messages = (data?.messages ?? []).map((m) => ({
    id: m.id,
    avatar: (m.subject?.[0] ?? "?").toUpperCase(),
    from: "School",
    unread: !m.read,
    subject: m.subject,
    time: new Date(m.at).toLocaleString("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    body: m.body,
  }));

  return (
    <>
      <PortalTopbar />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] md:text-[56px] tracking-[3px] text-white mb-4">
              <span className="text-brand-green">MESSAGES</span> INBOX
            </h1>
            <p className="text-white/60">
              Direct communication with teachers and school administration.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Parent" portalType="parent" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Message List */}
              <div className="lg:col-span-1 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-4 shadow-[var(--card-shadow)] max-h-[600px] overflow-y-auto">
                <h3 className="font-display text-sm tracking-widest text-[var(--text-primary)] mb-4 px-2">
                  INBOX
                </h3>
                <div className="space-y-2">
                  {loading ? (
                    <div className="p-3 text-[var(--text-muted)] text-xs">Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className="p-3 text-[var(--text-muted)] text-xs">No messages.</div>
                  ) : (
                    messages.map((msg) => (
                      <button
                        key={msg.id}
                        onClick={() => setSelectedMsg(msg)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                          selectedMsg?.id === msg.id
                            ? "bg-brand-green/10 border border-brand-green/30"
                            : "hover:bg-[var(--surface-disabled)] border border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {msg.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                                {msg.from}
                              </div>
                              {msg.unread && (
                                <div className="w-2 h-2 rounded-full bg-brand-green shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate">
                              {msg.subject}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] mt-1">
                              {msg.time}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Message View */}
              <div className="lg:col-span-2 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold">
                      {selectedMsg?.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">
                        {selectedMsg?.from}
                      </div>
                      <div className="text-xs text-brand-green">{selectedMsg?.role}</div>
                    </div>
                  </div>
                  <h2 className="font-display text-xl text-[var(--text-primary)] mb-1">
                    {selectedMsg?.subject}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">{selectedMsg?.time}</p>
                </div>
                <div className="flex-1 p-6 text-sm text-[var(--text-secondary)] leading-relaxed">
                  <p>{selectedMsg?.preview}</p>
                  <p className="mt-4">
                    This is the full message content. In production, the entire conversation thread
                    will be displayed here with proper formatting, attachments, and reply history.
                  </p>
                  <p className="mt-4">
                    Regards,
                    <br />
                    {selectedMsg?.from}
                  </p>
                </div>
                <div className="p-6 border-t border-[var(--border-subtle)]">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] resize-none focus:outline-none focus:border-brand-green"
                  />
                  <button
                    onClick={() => {
                      alert("Reply sent (demo)");
                      setReply("");
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-green text-white font-bold text-sm hover:bg-brand-green-dark transition-all"
                  >
                    <Send size={14} /> Send Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
