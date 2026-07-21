import { Check, X, Clock, AlertCircle } from "lucide-react";

export interface AttendanceDay {
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent" | "Late";
  note?: string;
  subject?: string;
}

interface AttendanceCalendarProps {
  days: AttendanceDay[];
  month: string;
  year: number;
  title: string;
  subtitle?: string;
  viewType: "parent" | "student" | "teacher";
}

export default function AttendanceCalendar({ days, month, year, title, subtitle, viewType }: AttendanceCalendarProps) {
  const today = new Date();
  const daysInMonth = new Date(year, new Date(month + " 1, 2025").getMonth() + 1, 0).getDate();

  const statusColor = (status: string) => {
    switch (status) {
      case "Present": return "bg-ykay-green text-white";
      case "Absent": return "bg-red-500 text-white";
      case "Late": return "bg-ykay-orange text-white";
      default: return "bg-ykay-navy-05 text-ykay-navy/30";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "Present": return <Check size={10} strokeWidth={3} />;
      case "Absent": return <X size={10} strokeWidth={3} />;
      case "Late": return <Clock size={10} strokeWidth={3} />;
      default: return <AlertCircle size={10} strokeWidth={2} />;
    }
  };

  const presentCount = days.filter((d) => d.status === "Present").length;
  const absentCount = days.filter((d) => d.status === "Absent").length;
  const lateCount = days.filter((d) => d.status === "Late").length;
  const total = days.length || 1;
  const percentage = Math.round((presentCount / total) * 100);

  return (
    <div className="rounded-[2rem] bg-white border border-ykay-navy-05 p-8 shadow-sm shadow-ykay-green/5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-xl tracking-[2px] text-ykay-navy">{title}</h2>
          {subtitle && <p className="font-body text-xs text-ykay-navy/30 mt-1">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ykay-green/10 text-ykay-green text-[10px] font-bold">
            <Check size={8} strokeWidth={3} /> Present: {presentCount}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold">
            <X size={8} strokeWidth={3} /> Absent: {absentCount}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ykay-orange/10 text-ykay-orange text-[10px] font-bold">
            <Clock size={8} strokeWidth={3} /> Late: {lateCount}
          </span>
        </div>
      </div>

      {/* Percentage bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-body text-[10px] font-bold tracking-[0.15em] uppercase text-ykay-navy/20">Attendance Rate</span>
          <span className="font-display text-xl tracking-[2px] text-ykay-green">{percentage}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-ykay-navy-03 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-ykay-green to-ykay-green-light transition-all duration-500" style={{ width: `${percentage}%` }} />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center font-display text-[9px] tracking-[0.15em] uppercase text-ykay-navy/15 py-1">{d}</div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayData = days.find((d) => {
            const dDay = new Date(d.date).getDate();
            return dDay === day;
          });
          const isToday = today.getDate() === day && today.getMonth() === new Date(month + " 1, 2025").getMonth() && today.getFullYear() === year;
          return (
            <div
              key={day}
              className={`relative rounded-xl px-2 py-3 text-center transition-all duration-200 hover:scale-[1.08] ${
                isToday ? "ring-2 ring-ykay-green/30 bg-ykay-green/5" : "bg-[#F5F7FA] hover:bg-ykay-green/5"
              }`}
            >
              <div className={`font-display text-xs tracking-[1px] mb-1 ${isToday ? "text-ykay-green font-bold" : "text-ykay-navy/40"}`}>{day}</div>
              {dayData ? (
                <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm ${statusColor(dayData.status)}`} title={`${dayData.status}${dayData.note ? ` — ${dayData.note}` : ""}`}>
                  {statusIcon(dayData.status)}
                </div>
              ) : (
                <div className="w-6 h-6 mx-auto rounded-full bg-ykay-navy-03 flex items-center justify-center text-[8px] text-ykay-navy/10">—</div>
              )}
              {dayData?.note && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-ykay-orange" title={dayData.note} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-5 border-t border-ykay-navy-05">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ykay-green" />
          <span className="font-body text-[10px] text-ykay-navy/30">Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="font-body text-[10px] text-ykay-navy/30">Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ykay-orange" />
          <span className="font-body text-[10px] text-ykay-navy/30">Late</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ykay-navy-03 border border-ykay-navy-05" />
          <span className="font-body text-[10px] text-ykay-navy/30">No Record</span>
        </div>
      </div>
    </div>
  );
}
