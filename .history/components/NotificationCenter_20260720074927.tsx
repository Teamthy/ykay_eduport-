import { BellRing, CheckCircle2, AlertTriangle, FileText, CreditCard, Send, UserPlus } from "lucide-react";

export interface NotificationItem {
  id: string;
  type: "welcome" | "absence" | "fee_receipt" | "fee_reminder" | "report_card" | "broadcast";
  title: string;
  message: string;
  time: string;
  read: boolean;
  action?: string;
}

interface NotificationCenterProps {
  notifications: NotificationItem[];
  title?: string;
}

export default function NotificationCenter({ notifications, title = "Notifications" }: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeConfig: Record<string, { icon: typeof BellRing; color: string; bg: string }> = {
    welcome: { icon: UserPlus, color: "text-ykay-green", bg: "bg-ykay-green/10" },
    absence: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
    fee_receipt: { icon: CheckCircle2, color: "text-ykay-green", bg: "bg-ykay-green/10" },
    fee_reminder: { icon: CreditCard, color: "text-ykay-orange", bg: "bg-ykay-orange/10" },
    report_card: { icon: FileText, color: "text-ykay-green-dark", bg: "bg-ykay-green-dark/10" },
    broadcast: { icon: Send, color: "text-ykay-orange", bg: "bg-ykay-orange/10" },
  };

  return (
    <div className="rounded-[2rem] bg-white border border-ykay-navy-05 p-6 md:p-8 shadow-sm shadow-ykay-green/5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg tracking-[2px] text-ykay-navy">{title}</h3>
        {unreadCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-ykay-green/10 text-ykay-green text-[10px] font-bold">{unreadCount} unread</span>
        )}
      </div>
      <div className="space-y-2">
        {notifications.map((n) => {
          const config = typeConfig[n.type] || typeConfig.broadcast;
          const Icon = config.icon;
          return (
            <div key={n.id} className={`rounded-xl px-5 py-4 border transition-colors ${n.read ? "bg-[#F5F7FA] border-ykay-navy-05" : "bg-ykay-green/5 border-ykay-green/10 shadow-[0_0_10px_rgba(82,184,72,0.05)]"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className={`font-body text-sm font-bold ${n.read ? "text-ykay-navy/60" : "text-ykay-navy"}`}>{n.title}</h4>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-ykay-green" />}
                  </div>
                  <p className="font-body text-xs text-ykay-navy/40 leading-relaxed">{n.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-body text-[10px] text-ykay-navy/15">{n.time}</span>
                    {n.action && (
                      <a href="#" className="font-body text-[10px] font-bold text-ykay-green hover:text-ykay-green-dark uppercase tracking-wide">{n.action}</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="text-center py-8">
            <BellRing size={32} className="mx-auto text-ykay-navy/10 mb-3" strokeWidth={1.5} />
            <p className="font-body text-sm text-ykay-navy/20">No notifications at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
