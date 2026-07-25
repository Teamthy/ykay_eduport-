"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import LiveReportCardPreview from "@/components/LiveReportCardPreview";
import {
  CalendarDays,
  Eye,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Bell,
  ClipboardCheck,
  Calendar,
  User,
  LoaderCircle,
  Award,
  Download,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/student/attendance", icon: CalendarDays },
  { label: "Timetable", href: "/student/timetable", icon: Calendar },
  { label: "CBT Tests", href: "/student/exams", icon: ClipboardCheck },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Announcements", href: "/student/announcements", icon: Bell },
  { label: "My Profile", href: "/student/profile", icon: User },
  { label: "Teachers", href: "/student/teachers", icon: GraduationCap },
];

type Report = {
  id: string;
  reportNumber: string;
  sessionLabel: string;
  termLabel: string;
  status: string;
  statusLabel: string;
  overallAverage: number;
  overallGrade: string;
  generatedAt: string;
  releasedAt: string | null;
  classNameSnapshot: string;
  overallTotal: number;
  classPosition: string | null;
  attendancePresent: number;
  attendanceTotal: number;
  classTeacherRemark: string;
  directorRemark: string;
  nextResumption: string;
  feeBalance: number;
  subjects: Array<{
    id: string;
    subject: string;
    ca1: number;
    ca2: number;
    midterm: number;
    assignment: number;
    exam: number;
    total: number;
    grade: string;
    sortOrder: number;
  }>;
};

type Response = {
  student: { id: string; displayName: string; className: string };
  reports: Report[];
};

export default function StudentReportCardsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");

  useEffect(() => {
    let active = true;
    async function loadReports() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/student/report-cards", { cache: "no-store" });
        const body = (await response.json()) as Response & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load report cards.");
        if (!active) return;
        setData(body);
        setSelectedReportId(body.reports[0]?.id || "");
      } catch (loadError) {
        if (!active) return;
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load report cards.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReports();
    return () => {
      active = false;
    };
  }, []);

  const selected =
    data?.reports.find((report) => report.id === selectedReportId) || data?.reports[0] || null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/5 bg-gradient-to-br from-brand-navy to-brand-navy-light p-8 shadow-xl md:p-12">
            <h1 className="font-display text-[42px] tracking-[3px] text-white md:text-[64px]">
              MY <span className="text-brand-green">REPORT CARD</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base text-white/60">
              View, review, and print your live term report cards.
            </p>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              {loading ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading
                    report cards...
                  </div>
                </div>
              ) : null}
              {!loading && error ? (
                <div className="rounded-[2rem] border border-brand-orange/30 bg-brand-orange/10 p-6 text-sm text-[var(--text-secondary)] shadow-[var(--card-shadow)]">
                  {error}
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-xl text-[var(--text-primary)]">
                          My Report Cards
                        </h2>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {data.student.displayName} Â· {data.student.className}
                        </p>
                      </div>
                      {selected ? (
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-brand-green-dark"
                        >
                          <Download size={14} /> Print / Save PDF
                        </button>
                      ) : null}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-[var(--border-subtle)]">
                          <tr>
                            {["Report No.", "Term", "Status", "Overall", "Actions"].map(
                              (heading) => (
                                <th
                                  key={heading}
                                  className="px-4 py-3 text-left font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
                                >
                                  {heading}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {data.reports.map((report) => (
                            <tr
                              key={report.id}
                              className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-disabled)]"
                            >
                              <td className="px-4 py-4 text-xs font-bold text-brand-green">
                                {report.reportNumber}
                              </td>
                              <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                                {report.termLabel} Â· {report.sessionLabel}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${report.status === "RELEASED" ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/10 text-brand-orange"}`}
                                >
                                  <Award size={9} /> {report.statusLabel}
                                </span>
                              </td>
                              <td className="px-4 py-4 font-display text-base font-bold text-brand-green">
                                {report.overallAverage}% Â· {report.overallGrade}
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={() => setSelectedReportId(report.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-3 py-1.5 text-[10px] font-bold text-brand-green transition-all hover:bg-brand-green hover:text-white"
                                >
                                  <Eye size={10} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selected ? (
                    <LiveReportCardPreview
                      reportNumber={selected.reportNumber}
                      studentName={data.student.displayName}
                      studentClass={selected.classNameSnapshot}
                      studentId={data.student.id}
                      sessionLabel={selected.sessionLabel}
                      termLabel={selected.termLabel}
                      overallTotal={selected.overallTotal}
                      overallAverage={selected.overallAverage}
                      overallGrade={selected.overallGrade}
                      classPosition={selected.classPosition}
                      attendancePresent={selected.attendancePresent}
                      attendanceTotal={selected.attendanceTotal}
                      classTeacherRemark={selected.classTeacherRemark}
                      directorRemark={selected.directorRemark}
                      nextResumption={selected.nextResumption}
                      feeBalance={selected.feeBalance}
                      subjects={selected.subjects}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
