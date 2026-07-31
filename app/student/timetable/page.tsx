"use client";

import { useCallback, useEffect, useState } from "react";
import PortalTopbar from "@/components/PortalTopbar";
import StudentSidebar from "@/components/PortalSidebar";
import { LoaderCircle, Clock, MapPin, User } from "lucide-react";

type Period = {
  time: string;
  subject: string;
  teacher: string;
  room: string;
};

type DaySchedule = {
  day: string;
  periods: Period[];
};

export default function StudentTimetablePage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/student/timetable", { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.schedule) {
        setSchedule(j.schedule);
      } else {
        // Graceful fallback: show empty state if no API yet
        setSchedule([]);
      }
    } catch {
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PortalTopbar title="My Timetable" />
      <main className="mx-auto flex max-w-[1600px] gap-8 px-4 py-6 sm:px-6">
        <StudentSidebar portalName="Student" portalType="student" items={[]} />
        <section className="min-w-0 flex-1">
          <div className="rounded-[2rem] bg-brand-navy p-7 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-green">Schedule</p>
            <h1 className="mt-2 font-display text-4xl tracking-widest">
              MY <span className="text-brand-green">TIMETABLE</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/65">
              Your weekly class schedule. Today is{" "}
              <span className="font-bold text-brand-green">{today}</span>.
            </p>
          </div>

          {loading && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10">
              <LoaderCircle className="animate-spin text-brand-green" size={20} />
              <span className="text-sm text-[var(--text-secondary)]">Loading schedule...</span>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
              {error}
            </div>
          )}

          {!loading && !schedule.length && (
            <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 text-center">
              <Clock className="mx-auto text-[var(--text-muted)]" size={40} />
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                No timetable has been published yet for your class. Check back later or contact your
                class teacher.
              </p>
            </div>
          )}

          {!loading && schedule.length > 0 && (
            <div className="mt-6 space-y-4">
              {schedule.map((day) => (
                <div
                  key={day.day}
                  className={`rounded-2xl border p-5 ${
                    day.day === today
                      ? "border-brand-green/40 bg-brand-green/5"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)]"
                  }`}
                >
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    {day.day === today && (
                      <span className="rounded-full bg-brand-green px-2 py-0.5 text-[9px] text-white">
                        TODAY
                      </span>
                    )}
                    {day.day}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {day.periods.map((period, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                          <Clock size={10} /> {period.time}
                        </div>
                        <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                          {period.subject}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                          {period.teacher && (
                            <span className="flex items-center gap-1">
                              <User size={10} /> {period.teacher}
                            </span>
                          )}
                          {period.room && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {period.room}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
