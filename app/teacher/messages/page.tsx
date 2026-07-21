"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { TEACHER_MESSAGES, Message, MessageCategory } from "@/lib/messagesData";
import { useToast } from "@/components/Toast";
import {
  MessageSquare, Search, Star, Send, Paperclip, Reply, Trash2,
  Users, User, ShieldCheck, GraduationCap, Inbox, AlertCircle,
  Filter, X, Plus, ChevronLeft, Mail, MailOpen
} from "lucide-react";

const CATEGORY_CONFIG = {
  parent: { icon: Users, label: "Parents", color: "text-brand-orange", bg: "bg-brand-orange/10" },
  student: { icon: GraduationCap, label: "Students", color: "text-brand-green", bg: "bg-brand-green/10" },
  admin: { icon: ShieldCheck, label: "Admin", color: "text-red-500", bg: "bg-red-500/10" },
  colleague: { icon: User, label: "Colleagues", color: "text-blue-500", bg: "bg-blue-500/10" },
};

export default function TeacherMessagesPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState(TEACHER_MESSAGES);
  const [selected, setSelected] = useState<Message | null>(TEACHER_MESSAGES[0]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | MessageCategory | "unread" | "starred">("all");
  const [showCompose, setShowCompose] = useState(false);
  const [reply, setReply] = useState("");
  const [showMobileList, setShowMobileList] = useState(true);

  const filtered = messages.filter(m => {
    const matchSearch = m.subject.toLowerCase().includes(search.toLowerCase()) ||
                        m.from.name.toLowerCase().includes(search.toLowerCase()) ||
                        m.preview.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      filter === "unread" ? m.unread :
      filter === "starred" ? m.starred :
      m.category === filter;
    return matchSearch && (filter === "all" || (filter === "unread" ? m.unread : filter === "starred" ? m.starred : m.category === filter));
  });

  const stats = {
    total: messages.length,
    unread: messages.filter(m => m.unread).length,
    starred: messages.filter(m => m.starred).length,
    parent: messages.filter(m => m.category === "parent").length,
    student: messages.filter(m => m.category === "student").length,
    admin: messages.filter(m => m.category === "admin").length,
    colleague: messages.filter(m => m.category === "colleague").length,
  };

  const handleSelect = (msg: Message) => {
    setSelected(msg);
    setShowMobileList(false);
    if (msg.unread) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, unread: false } : m));
    }
  };

  const toggleStar = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  };

  const handleReply = () => {
    if (!reply.trim() || !selected) return;
    toast(`Reply sent to ${selected.from.name}`, "success");
    setReply("");
  };

  const handleDelete = () => {
    if (!selected) return;
    setMessages(prev => prev.filter(m => m.id !== selected.id));
    setSelected(messages.find(m => m.id !== selected.id) || null);
    toast("Message deleted", "info");
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
                  <MessageSquare size={11} /> Unified Inbox
                </span>
                <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
                  MY <span className="text-brand-green">MESSAGES</span>
                </h1>
                <p className="text-white/60 text-sm">
                  {stats.unread} unread · {stats.total} total messages
                </p>
              </div>
              <button
                onClick={() => setShowCompose(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-green text-white font-bold text-sm hover:bg-brand-green-dark transition-all shadow-lg"
              >
                <Plus size={16} /> Compose
              </button>
            </div>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <button onClick={() => setFilter("unread")} className={`p-4 rounded-2xl border transition-all ${filter === "unread" ? "bg-brand-green/10 border-brand-green" : "bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-brand-green/30"}`}>
                  <Mail className="text-brand-green mb-2" size={16} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{stats.unread}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Unread</div>
                </button>
                <button onClick={() => setFilter("starred")} className={`p-4 rounded-2xl border transition-all ${filter === "starred" ? "bg-brand-orange/10 border-brand-orange" : "bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-brand-orange/30"}`}>
                  <Star className="text-brand-orange mb-2" size={16} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{stats.starred}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Starred</div>
                </button>
                <button onClick={() => setFilter("parent")} className={`p-4 rounded-2xl border transition-all ${filter === "parent" ? "bg-brand-orange/10 border-brand-orange" : "bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-brand-orange/30"}`}>
                  <Users className="text-brand-orange mb-2" size={16} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{stats.parent}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Parents</div>
                </button>
                <button onClick={() => setFilter("student")} className={`p-4 rounded-2xl border transition-all ${filter === "student" ? "bg-brand-green/10 border-brand-green" : "bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-brand-green/30"}`}>
                  <GraduationCap className="text-brand-green mb-2" size={16} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{stats.student}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Students</div>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { key: "all", label: "All", icon: Inbox },
                  { key: "admin", label: "Admin", icon: ShieldCheck },
                  { key: "colleague", label: "Colleagues", icon: User },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key as any)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                      filter === f.key
                        ? "bg-brand-green text-white"
                        : "bg-[var(--surface-disabled)] text-[var(--text-muted)] hover:bg-brand-green/10"
                    }`}
                  >
                    <f.icon size={12} /> {f.label}
                  </button>
                ))}
              </div>

              {/* Main Inbox Layout */}
              <div className="grid lg:grid-cols-[380px_1fr] gap-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--card-shadow)]" style={{ minHeight: "600px" }}>
                {/* Message List */}
                <div className={`${showMobileList ? "block" : "hidden"} lg:block border-r border-[var(--border-subtle)] flex flex-col`} style={{ maxHeight: "700px" }}>
                  <div className="p-4 border-b border-[var(--border-subtle)]">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search messages..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] text-sm focus:outline-none focus:border-brand-green"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="p-8 text-center text-[var(--text-muted)]">
                        <Inbox size={40} className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No messages found</p>
                      </div>
                    ) : filtered.map(m => {
                      const config = CATEGORY_CONFIG[m.category];
                      const isActive = selected?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelect(m)}
                          className={`w-full text-left p-4 border-b border-[var(--border-subtle)] transition-colors relative ${
                            isActive ? "bg-brand-green/10" : m.unread ? "bg-[var(--surface-disabled)] hover:bg-brand-green/5" : "hover:bg-[var(--surface-disabled)]"
                          }`}
                        >
                          {m.unread && (
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-green" />
                          )}
                          <div className="flex items-start gap-3 pl-3">
                            <div className={`w-10 h-10 rounded-full ${config.bg} ${config.color} flex items-center justify-center font-bold text-xs shrink-0`}>
                              {m.from.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className={`text-sm truncate ${m.unread ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                                  {m.from.name}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {m.starred && <Star size={12} className="text-brand-orange fill-brand-orange" />}
                                  {m.priority === "urgent" && <AlertCircle size={12} className="text-red-500" />}
                                </div>
                              </div>
                              <div className={`text-xs truncate mb-1 ${m.unread ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                                {m.subject}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] truncate">{m.preview}</div>
                              <div className="flex items-center justify-between mt-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest ${config.bg} ${config.color}`}>
                                  {config.label}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)]">{m.time}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message Detail */}
                <div className={`${!showMobileList ? "block" : "hidden"} lg:block flex flex-col`} style={{ maxHeight: "700px" }}>
                  {selected ? (
                    <>
                      {/* Mobile back */}
                      <button onClick={() => setShowMobileList(true)} className="lg:hidden p-4 flex items-center gap-2 text-brand-green text-sm font-bold border-b border-[var(--border-subtle)]">
                        <ChevronLeft size={16} /> Back to Inbox
                      </button>

                      {/* Message Header */}
                      <div className="p-6 border-b border-[var(--border-subtle)]">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full ${CATEGORY_CONFIG[selected.category].bg} ${CATEGORY_CONFIG[selected.category].color} flex items-center justify-center font-bold`}>
                              {selected.from.avatar}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--text-primary)]">{selected.from.name}</div>
                              <div className="text-xs text-[var(--text-muted)]">{selected.from.role} · {selected.time}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => toggleStar(selected.id)} className="p-2 rounded-lg hover:bg-[var(--surface-disabled)] transition-colors">
                              <Star size={16} className={selected.starred ? "text-brand-orange fill-brand-orange" : "text-[var(--text-muted)]"} />
                            </button>
                            <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <h2 className="font-display text-xl text-[var(--text-primary)]">{selected.subject}</h2>
                        {selected.priority === "urgent" && (
                          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest">
                            <AlertCircle size={10} /> Urgent
                          </span>
                        )}
                      </div>

                      {/* Message Body */}
                      <div className="flex-1 overflow-y-auto p-6">
                        <div className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                          {selected.body}
                        </div>

                        {/* Thread Replies */}
                        {selected.thread && selected.thread.length > 0 && (
                          <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] space-y-4">
                            <div className="text-xs font-bold uppercase tracking-widest text-brand-green mb-3">Thread</div>
                            {selected.thread.map(r => (
                              <div key={r.id} className={`p-4 rounded-xl ${r.from === "Dr. Grace Okonkwo" ? "bg-brand-green/10 ml-8" : "bg-[var(--surface-disabled)] mr-8"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-full bg-[var(--surface-card)] flex items-center justify-center text-xs font-bold text-brand-green">
                                    {r.avatar}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-[var(--text-primary)]">{r.from}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">{r.fromRole} · {r.time}</div>
                                  </div>
                                </div>
                                <div className="text-sm text-[var(--text-secondary)]">{r.body}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reply Bar */}
                      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-disabled)]">
                        <div className="flex items-start gap-2">
                          <textarea
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                            rows={2}
                            placeholder={`Reply to ${selected.from.name}...`}
                            className="flex-1 p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] text-sm focus:outline-none focus:border-brand-green resize-none"
                          />
                          <div className="flex flex-col gap-2">
                            <button className="p-2.5 rounded-xl bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-brand-green transition-colors" title="Attach">
                              <Paperclip size={16} />
                            </button>
                            <button
                              onClick={handleReply}
                              disabled={!reply.trim()}
                              className="p-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Send"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
                      <div className="text-center">
                        <MailOpen size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-sm">Select a message to view</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowCompose(false)}>
          <div className="rounded-3xl max-w-2xl w-full p-8" style={{ backgroundColor: "#0C1824" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-2xl text-white">New Message</h3>
                <p className="text-xs text-white/60">Compose and send to any recipient</p>
              </div>
              <button onClick={() => setShowCompose(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-2">Recipient Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <button key={key} className={`p-3 rounded-xl bg-white/5 border border-white/10 hover:${config.bg} hover:border-brand-green/40 transition-all flex items-center justify-center gap-1 text-xs font-bold text-white`}>
                      <config.icon size={12} /> {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-2">To</label>
                <input placeholder="Recipient name or email" className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-green" />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-2">Subject</label>
                <input placeholder="Message subject" className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-green" />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-2">Message</label>
                <textarea rows={6} placeholder="Write your message..." className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-green resize-none" />
              </div>

              <button onClick={() => { toast("Message sent successfully", "success"); setShowCompose(false); }} className="w-full py-3 rounded-full bg-brand-green text-white font-bold text-sm hover:bg-brand-green-dark transition-all flex items-center justify-center gap-2">
                <Send size={14} /> Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
