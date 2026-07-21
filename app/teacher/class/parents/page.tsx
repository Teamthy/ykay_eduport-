"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER, FORM_CLASS_STUDENTS } from "@/lib/teacherData";
import { useToast } from "@/components/Toast";
import { Search, Phone, MessageSquare, School, User, Send, X } from "lucide-react";

export default function ParentCommunicationsPage() {
  const { toast } = useToast();
  const teacher = CURRENT_TEACHER;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof FORM_CLASS_STUDENTS[0] | null>(null);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = FORM_CLASS_STUDENTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = () => {
    if (!message.trim()) {
      toast("Type a message", "warning");
      return;
    }
    toast(`Message sent to ${selected?.name}'s parent`, "success");
    setMessage("");
    setShowModal(false);
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest mb-3">
              <School size={11} /> Form Teacher · {teacher.formClass}
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              PARENT <span className="text-brand-orange">COMMUNICATIONS</span>
            </h1>
            <p className="text-white/60 text-sm">Direct communication channels with parents in your form class.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search parent by student name..."
                  className="w-full pl-11 pr-5 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {filtered.map(s => (
                  <div key={s.id} className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
                    <div className="flex items-center gap-4 mb-4">
                      <img src={s.photoUrl} alt={s.name} className="w-14 h-14 rounded-full object-cover border-2 border-[var(--border-subtle)]" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--text-primary)] truncate">{s.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{s.studentId}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--surface-disabled)] mb-3">
                      <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Parent Contact</div>
                      <div className="font-mono text-sm text-[var(--text-primary)]">{s.parentContact}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <a href={`tel:${s.parentContact}`} className="p-2.5 rounded-xl bg-brand-green/10 text-brand-green flex flex-col items-center gap-1 hover:bg-brand-green hover:text-white transition-all">
                        <Phone size={14} />
                        <span className="text-[9px] font-bold uppercase">Call</span>
                      </a>
                      <a href={`https://wa.me/234${s.parentContact.replace(/\D/g, "").slice(1)}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] flex flex-col items-center gap-1 hover:bg-[#25D366] hover:text-white transition-all">
                        <MessageSquare size={14} />
                        <span className="text-[9px] font-bold uppercase">WhatsApp</span>
                      </a>
                      <button onClick={() => { setSelected(s); setShowModal(true); }} className="p-2.5 rounded-xl bg-brand-orange/10 text-brand-orange flex flex-col items-center gap-1 hover:bg-brand-orange hover:text-white transition-all">
                        <Send size={14} />
                        <span className="text-[9px] font-bold uppercase">Portal</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {showModal && selected && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowModal(false)}>
          <div className="rounded-3xl max-w-lg w-full p-8" style={{ backgroundColor: "#0C1824" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-xl text-white">Message Parent</h3>
                <p className="text-xs text-white/60">Re: {selected.name}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="Type your message..."
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange resize-none mb-4"
            />

            <button
              onClick={handleSend}
              className="w-full py-3 rounded-full bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-all flex items-center justify-center gap-2"
            >
              <Send size={14} /> Send Message
            </button>
          </div>
        </div>
      )}
    </>
  );
}
