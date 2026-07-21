"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Bell, CheckCircle2, CreditCard, FileText, Clock,
  MessageSquare, Megaphone, X
} from "lucide-react";

const PORTAL_PREFIXES = ["/admin", "/teacher", "/student", "/parent", "/portal", "/login"];

interface Notification {
  id: string;
  type: "attendance" | "grade" | "fee" | "report" | "message" | "broadcast";
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
}

const NOTIFICATIONS: Notification[] = [
  { id: "1", type: "attendance", title: "Attendance Marked", body: "You were marked present today at 8:05 AM.", time: "2 min ago", read: false },
  { id: "2", type: "grade", title: "New Grade Released", body: "Mathematics CA1 score: 87%.", time: "1 hour ago", read: false, link: "/student/report-cards" },
  { id: "3", type: "fee", title: "Fee Payment Confirmed", body: "₦80,000 received. Receipt sent.", time: "3 hours ago", read: false, link: "/parent/fees" },
  { id: "4", type: "report", title: "Report Card Available", body: "First Term report card is ready.", time: "Yesterday", read: true },
  { id: "5", type: "broadcast", title: "Mid-Term Schedule", body: "Mid-term exams begin August 4th.", time: "2 days ago", read: true },
  { id: "6", type: "message", title: "New Message", body: "Mrs. Ogunlade sent you a message.", time: "3 days ago", read: true },
];

const TYPE_CONFIG = {
  attendance: { icon: CheckCircle2, color: "text-brand-green", bg: "bg-brand-green/10" },
  grade: { icon: FileText, color: "text-brand-orange", bg: "bg-brand-orange/10" },
  fee: { icon: CreditCard, color: "text-brand-green", bg: "bg-brand-green/10" },
  report: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
  message: { icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-500/10" },
  broadcast: { icon: Megaphone, color: "text-brand-orange", bg: "bg-brand-orange/10" },
};

export default function NotificationBell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const isPortal = PORTAL_PREFIXES.some(p => pathname.startsWith(p));
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Don't render on public pages
  if (!mounted || !isPortal) return null;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full text-[var(--nav-text)] hover:bg-[var(--surface-card-hover)] hover:text-brand-green transition-all"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-3 w-96 max-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{ zIndex: 200, backgroundColor: "#0C1824" }}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-brand-green" />
              <span className="font-display text-sm text-white tracking-widest">NOTIFICATIONS</span>
              {unreadCount > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-brand-green font-bold uppercase tracking-widest hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {notifications.map(n => {
              const config = TYPE_CONFIG[n.type];
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                    if (n.link) { setOpen(false); window.location.href = n.link; }
                  }}
                  className={`flex items-start gap-3 p-4 border-b border-white/5 transition-colors cursor-pointer ${
                    n.read ? "opacity-60 hover:opacity-80" : "hover:bg-white/5"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl ${config.bg} ${config.color} flex items-center justify-center shrink-0`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`text-sm ${n.read ? "text-white/70" : "text-white font-bold"}`}>{n.title}</div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-brand-green shrink-0 mt-1.5" />}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.body}</div>
                    <div className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
                      <Clock size={9} /> {n.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-white/10 text-center">
            <button onClick={() => setOpen(false)} className="text-xs text-brand-green font-bold uppercase tracking-widest hover:underline">
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
