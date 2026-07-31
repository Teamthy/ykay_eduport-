"use client";

import { useState } from "react";
import PortalTopbar from "@/components/PortalTopbar";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import {
  Megaphone,
  Plus,
  X,
  Users,
  User,
  Eye,
  Send,
  School,
  Clock,
  MessageSquare,
} from "lucide-react";

export default function ClassAnnouncementsPage() {
  const { toast } = useToast();
  const { data, loading: _apiLoading, error: _apiError } = useApi<any>("/api/teacher/profile");
  const teacher = data?.teacher || ({} as any);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    body: "",
    audience: "Both" as "Class Only" | "Parents Only" | "Both",
  });

  const handleSend = () => {
    if (!newAnnouncement.title || !newAnnouncement.body) {
      toast("Please fill all fields", "warning");
      return;
    }
    const total =
      newAnnouncement.audience === "Class Only"
        ? 32
        : newAnnouncement.audience === "Parents Only"
          ? 30
          : 62;
    const record = {
      id: String(announcements.length + 1),
      title: newAnnouncement.title,
      body: newAnnouncement.body,
      audience: newAnnouncement.audience,
      date: new Date().toISOString().split("T")[0],
      postedBy: teacher.fullName,
      read: 0,
      total,
    };
    setAnnouncements([record, ...announcements]);
    setShowModal(false);
    setNewAnnouncement({ title: "", body: "", audience: "Both" });
    toast(`Announcement sent to ${total} recipients`, "success");
  };

  return (
    <>
      <PortalTopbar />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest mb-3">
              <School size={11} /> Form Teacher · {teacher.formClass}
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              CLASS <span className="text-brand-orange">ANNOUNCEMENTS</span>
            </h1>
            <p className="text-white/60 text-sm">
              Communicate with students and parents in your form class.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-brand-orange-dark text-white font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Megaphone size={18} /> Post New Announcement
              </button>

              <div className="space-y-4">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)]"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-display text-lg text-[var(--text-primary)]">
                            {a.title}
                          </h3>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                              a.audience === "Class Only"
                                ? "bg-brand-green/10 text-brand-green"
                                : a.audience === "Parents Only"
                                  ? "bg-brand-orange/10 text-brand-orange"
                                  : "bg-blue-500/10 text-blue-500"
                            }`}
                          >
                            {a.audience}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-3">{a.body}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-subtle)]">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {a.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User size={11} /> {a.postedBy}
                      </span>
                      <span className="inline-flex items-center gap-1 ml-auto">
                        <Eye size={11} className="text-brand-green" />
                        <span className="text-brand-green font-bold">
                          {a.read}/{a.total}
                        </span>{" "}
                        read
                      </span>
                    </div>

                    {/* Read progress bar */}
                    <div className="mt-2 h-1 rounded-full bg-[var(--surface-disabled)] overflow-hidden">
                      <div
                        className="h-full bg-brand-green"
                        style={{ width: `${(a.read / a.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {showModal && (
        <div
          className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-3xl max-w-lg w-full p-8"
            style={{ backgroundColor: "#0C1824" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl text-white">New Announcement</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-2">
                  Audience
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "Class Only", icon: User },
                    { key: "Parents Only", icon: Users },
                    { key: "Both", icon: Send },
                  ].map((a) => (
                    <button
                      key={a.key}
                      onClick={() =>
                        setNewAnnouncement({ ...newAnnouncement, audience: a.key as any })
                      }
                      className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        newAnnouncement.audience === a.key
                          ? "bg-brand-orange text-white"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      <a.icon size={12} /> {a.key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-2">
                  Title
                </label>
                <input
                  value={newAnnouncement.title}
                  onChange={(e) =>
                    setNewAnnouncement({ ...newAnnouncement, title: e.target.value })
                  }
                  placeholder="e.g., Field Trip Reminder"
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-2">
                  Message
                </label>
                <textarea
                  value={newAnnouncement.body}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })}
                  rows={5}
                  placeholder="Type your announcement..."
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange resize-none"
                />
              </div>

              <button
                onClick={handleSend}
                className="w-full py-3 rounded-full bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-all flex items-center justify-center gap-2"
              >
                <Send size={14} /> Send Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
