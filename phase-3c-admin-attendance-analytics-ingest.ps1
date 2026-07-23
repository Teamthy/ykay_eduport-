$ProjectRoot = "C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site"

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-ProjectFile {
    param(
        [string]$RelativePath,
        [string]$Content
    )

    $FullPath = Join-Path $ProjectRoot $RelativePath
    $Dir = Split-Path $FullPath -Parent
    if ($Dir -and -not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($FullPath, $Content, $Utf8NoBom)
    Write-Host "Updated $RelativePath" -ForegroundColor Green
}

Write-Host "Applying Phase 3C Admin Attendance Analytics files..." -ForegroundColor Cyan

# --- app/api/admin/attendance/analytics/route.ts ---
$content = @'
import {
  AlertChannel,
  AlertDeliveryStatus,
  AttendanceCorrectionStatus,
  AttendanceStatus,
  UserRole,
} from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";
import { parseMonth } from "@/lib/attendance-portal";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";

const allowedRoles = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINATOR];

export async function GET(request: NextRequest) {
  const user = await requireRole(allowedRoles);
  if (!user) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const classId = request.nextUrl.searchParams.get("classId")?.trim() || null;
  const month = parseMonth(request.nextUrl.searchParams.get("month"));

  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolId: user.schoolId,
      isActive: true,
    },
    orderBy: [{ level: "asc" }, { arm: "asc" }],
    select: {
      id: true,
      displayName: true,
      level: true,
      arm: true,
      students: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  const validClassId = classId && classes.some((item) => item.id === classId) ? classId : null;

  const [sessions, correctionRequests] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: {
        schoolId: user.schoolId,
        ...(validClassId ? { classId: validClassId } : {}),
        sessionDate: {
          gte: month.from,
          lt: month.to,
        },
      },
      orderBy: [{ sessionDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        sessionDate: true,
        periodKey: true,
        isLocked: true,
        submittedAt: true,
        classroom: {
          select: {
            id: true,
            displayName: true,
          },
        },
        teacherProfile: {
          select: {
            displayName: true,
          },
        },
        entries: {
          select: {
            status: true,
            studentProfile: {
              select: {
                id: true,
                studentId: true,
                displayName: true,
              },
            },
          },
        },
        alertJobs: {
          select: {
            channel: true,
            status: true,
          },
        },
      },
    }),
    prisma.attendanceCorrectionRequest.findMany({
      where: {
        schoolId: user.schoolId,
        ...(validClassId ? { attendanceSession: { classId: validClassId } } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        reviewedAt: true,
        resolutionNote: true,
        attendanceSession: {
          select: {
            sessionDate: true,
            classroom: {
              select: {
                displayName: true,
              },
            },
          },
        },
        teacherProfile: {
          select: {
            displayName: true,
          },
        },
      },
    }),
  ]);

  const allEntries = sessions.flatMap((session) => session.entries);
  const presentCount = allEntries.filter((entry) => entry.status === AttendanceStatus.PRESENT).length;
  const absentCount = allEntries.filter((entry) => entry.status === AttendanceStatus.ABSENT).length;
  const lateCount = allEntries.filter((entry) => entry.status === AttendanceStatus.LATE).length;
  const totalEntryCount = allEntries.length;
  const lockedSessions = sessions.filter((session) => session.isLocked).length;
  const queuedAlerts = sessions.flatMap((session) => session.alertJobs).filter((job) => job.status === AlertDeliveryStatus.PENDING).length;
  const sentAlerts = sessions.flatMap((session) => session.alertJobs).filter((job) => job.status === AlertDeliveryStatus.SENT).length;
  const failedAlerts = sessions.flatMap((session) => session.alertJobs).filter((job) => job.status === AlertDeliveryStatus.FAILED).length;
  const skippedAlerts = sessions.flatMap((session) => session.alertJobs).filter((job) => job.status === AlertDeliveryStatus.SKIPPED).length;
  const activeStudentCount = validClassId
    ? classes.find((item) => item.id === validClassId)?.students.length || 0
    : classes.reduce((sum, item) => sum + item.students.length, 0);

  const classStats = classes
    .filter((item) => !validClassId || item.id === validClassId)
    .map((item) => {
      const classSessions = sessions.filter((session) => session.classroom.id === item.id);
      const classEntries = classSessions.flatMap((session) => session.entries);
      const classPresent = classEntries.filter((entry) => entry.status === AttendanceStatus.PRESENT).length;
      const classAbsent = classEntries.filter((entry) => entry.status === AttendanceStatus.ABSENT).length;
      const classLate = classEntries.filter((entry) => entry.status === AttendanceStatus.LATE).length;
      const classTotal = classEntries.length;
      const lastSession = classSessions[classSessions.length - 1];

      return {
        id: item.id,
        displayName: item.displayName,
        activeStudents: item.students.length,
        sessions: classSessions.length,
        present: classPresent,
        absent: classAbsent,
        late: classLate,
        attendanceRate: classTotal ? Math.round((classPresent / classTotal) * 100) : 0,
        lockedSessions: classSessions.filter((session) => session.isLocked).length,
        lastSessionDate: lastSession ? lastSession.sessionDate.toISOString() : null,
      };
    })
    .sort((left, right) => right.attendanceRate - left.attendanceRate || left.displayName.localeCompare(right.displayName));

  const dailyTrendMap = new Map<
    string,
    { date: string; present: number; absent: number; late: number; total: number; sessions: number }
  >();

  for (const session of sessions) {
    const key = session.sessionDate.toISOString().slice(0, 10);
    const current = dailyTrendMap.get(key) || {
      date: key,
      present: 0,
      absent: 0,
      late: 0,
      total: 0,
      sessions: 0,
    };

    current.sessions += 1;
    for (const entry of session.entries) {
      if (entry.status === AttendanceStatus.PRESENT) current.present += 1;
      if (entry.status === AttendanceStatus.ABSENT) current.absent += 1;
      if (entry.status === AttendanceStatus.LATE) current.late += 1;
      current.total += 1;
    }
    dailyTrendMap.set(key, current);
  }

  const dailyTrend = [...dailyTrendMap.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((item) => ({
      ...item,
      attendanceRate: item.total ? Math.round((item.present / item.total) * 100) : 0,
    }));

  const studentConcernMap = new Map<
    string,
    { studentId: string; displayName: string; absent: number; late: number; total: number }
  >();

  for (const entry of allEntries) {
    const key = entry.studentProfile.id;
    const current = studentConcernMap.get(key) || {
      studentId: entry.studentProfile.studentId,
      displayName: entry.studentProfile.displayName,
      absent: 0,
      late: 0,
      total: 0,
    };

    current.total += 1;
    if (entry.status === AttendanceStatus.ABSENT) current.absent += 1;
    if (entry.status === AttendanceStatus.LATE) current.late += 1;
    studentConcernMap.set(key, current);
  }

  const studentsOfConcern = [...studentConcernMap.values()]
    .map((item) => ({
      ...item,
      concernScore: item.absent * 2 + item.late,
      attendanceRate: item.total ? Math.round(((item.total - item.absent - item.late) / item.total) * 100) : 0,
    }))
    .filter((item) => item.concernScore > 0)
    .sort((left, right) => right.concernScore - left.concernScore || left.displayName.localeCompare(right.displayName))
    .slice(0, 8);

  const alertBreakdownByChannel = [AlertChannel.SMS, AlertChannel.WHATSAPP, AlertChannel.EMAIL].map((channel) => ({
    channel,
    total: sessions.flatMap((session) => session.alertJobs).filter((job) => job.channel === channel).length,
    pending: sessions.flatMap((session) => session.alertJobs).filter((job) => job.channel === channel && job.status === AlertDeliveryStatus.PENDING).length,
  }));

  const alertBreakdownByStatus = [
    AlertDeliveryStatus.PENDING,
    AlertDeliveryStatus.SENT,
    AlertDeliveryStatus.FAILED,
    AlertDeliveryStatus.SKIPPED,
  ].map((status) => ({
    status,
    total: sessions.flatMap((session) => session.alertJobs).filter((job) => job.status === status).length,
  }));

  const recentSessions = [...sessions]
    .sort((left, right) => right.sessionDate.getTime() - left.sessionDate.getTime())
    .slice(0, 6)
    .map((session) => {
      const present = session.entries.filter((entry) => entry.status === AttendanceStatus.PRESENT).length;
      const absent = session.entries.filter((entry) => entry.status === AttendanceStatus.ABSENT).length;
      const late = session.entries.filter((entry) => entry.status === AttendanceStatus.LATE).length;
      const total = session.entries.length;
      return {
        id: session.id,
        date: session.sessionDate.toISOString(),
        className: session.classroom.displayName,
        teacherName: session.teacherProfile.displayName,
        periodKey: session.periodKey,
        isLocked: session.isLocked,
        submittedAt: session.submittedAt?.toISOString() || null,
        present,
        absent,
        late,
        total,
        attendanceRate: total ? Math.round((present / total) * 100) : 0,
      };
    });

  const pendingCorrections = correctionRequests.filter((request) => request.status === AttendanceCorrectionStatus.PENDING).length;

  return jsonNoStore({
    filters: {
      month: month.key,
      monthLabel: month.monthLabel,
      year: month.year,
      selectedClassId: validClassId,
    },
    availableClasses: classes.map((item) => ({
      id: item.id,
      displayName: item.displayName,
      level: item.level,
      arm: item.arm,
      activeStudents: item.students.length,
    })),
    summary: {
      sessionsTracked: sessions.length,
      classesCovered: new Set(sessions.map((session) => session.classroom.id)).size,
      activeStudents: activeStudentCount,
      presentCount,
      absentCount,
      lateCount,
      totalEntryCount,
      attendanceRate: totalEntryCount ? Math.round((presentCount / totalEntryCount) * 100) : 0,
      lockedSessions,
      queuedAlerts,
      sentAlerts,
      failedAlerts,
      skippedAlerts,
      pendingCorrections,
    },
    classStats,
    dailyTrend,
    studentsOfConcern,
    alertBreakdown: {
      byChannel: alertBreakdownByChannel,
      byStatus: alertBreakdownByStatus,
    },
    recentCorrections: correctionRequests.map((request) => ({
      id: request.id,
      status: request.status,
      reason: request.reason,
      resolutionNote: request.resolutionNote,
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() || null,
      className: request.attendanceSession.classroom.displayName,
      sessionDate: request.attendanceSession.sessionDate.toISOString(),
      teacherName: request.teacherProfile.displayName,
    })),
    recentSessions,
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\admin\attendance\analytics\route.ts' -Content $content

# --- app/admin/attendance-analytics/page.tsx ---
$content = @'
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  Calendar,
  CheckCircle2,
  Clock3,
  FileWarning,
  GraduationCap,
  LoaderCircle,
  School,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";

type AnalyticsResponse = {
  filters: {
    month: string;
    monthLabel: string;
    year: number;
    selectedClassId: string | null;
  };
  availableClasses: Array<{
    id: string;
    displayName: string;
    level: string;
    arm: string;
    activeStudents: number;
  }>;
  summary: {
    sessionsTracked: number;
    classesCovered: number;
    activeStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    totalEntryCount: number;
    attendanceRate: number;
    lockedSessions: number;
    queuedAlerts: number;
    sentAlerts: number;
    failedAlerts: number;
    skippedAlerts: number;
    pendingCorrections: number;
  };
  classStats: Array<{
    id: string;
    displayName: string;
    activeStudents: number;
    sessions: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
    lockedSessions: number;
    lastSessionDate: string | null;
  }>;
  dailyTrend: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    sessions: number;
    attendanceRate: number;
  }>;
  studentsOfConcern: Array<{
    studentId: string;
    displayName: string;
    absent: number;
    late: number;
    total: number;
    concernScore: number;
    attendanceRate: number;
  }>;
  alertBreakdown: {
    byChannel: Array<{ channel: string; total: number; pending: number }>;
    byStatus: Array<{ status: string; total: number }>;
  };
  recentCorrections: Array<{
    id: string;
    status: string;
    reason: string;
    resolutionNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
    className: string;
    sessionDate: string;
    teacherName: string;
  }>;
  recentSessions: Array<{
    id: string;
    date: string;
    className: string;
    teacherName: string;
    periodKey: string;
    isLocked: boolean;
    submittedAt: string | null;
    present: number;
    absent: number;
    late: number;
    total: number;
    attendanceRate: number;
  }>;
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminAttendanceAnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedClassId, setSelectedClassId] = useState("");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ month: selectedMonth });
        if (selectedClassId) params.set("classId", selectedClassId);
        const response = await fetch(`/api/admin/attendance/analytics?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as AnalyticsResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load attendance analytics.");
        if (!active) return;
        setData(body);
      } catch (analyticsError) {
        if (!active) return;
        setData(null);
        setError(analyticsError instanceof Error ? analyticsError.message : "Unable to load attendance analytics.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedClassId]);

  const filteredClassLabel = useMemo(() => {
    if (!data?.filters.selectedClassId) return "All active classes";
    return data.availableClasses.find((item) => item.id === data.filters.selectedClassId)?.displayName || "Selected class";
  }, [data]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <BarChart3 size={12} /> Phase 3C · Attendance Analytics
            </div>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
              ATTENDANCE <span className="text-brand-green">ANALYTICS</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/65">
              School-wide attendance intelligence for leadership: live session coverage, class performance, alert queue pressure, and correction oversight.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <AdminSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              <div className="grid gap-4 md:grid-cols-[1fr_220px] xl:grid-cols-[1fr_220px_220px]">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Class scope</label>
                  <select
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                    disabled={loading}
                  >
                    <option value="">All active classes</option>
                    {data?.availableClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.displayName} · {item.activeStudents} student{item.activeStudents === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Month</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                    disabled={loading}
                  />
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)] xl:block hidden">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Current scope</div>
                  <div className="mt-3 font-display text-2xl text-[var(--text-primary)]">{filteredClassLabel}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{data ? `${data.filters.monthLabel} ${data.filters.year}` : "Loading…"}</div>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading attendance analytics...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-6 shadow-[var(--card-shadow)]">
                  <div className="flex items-start gap-3">
                    <FileWarning className="mt-0.5 text-brand-orange" size={20} />
                    <div>
                      <h2 className="font-display text-2xl text-[var(--text-primary)]">Analytics unavailable</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{error}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                    {[
                      {
                        label: "Sessions tracked",
                        value: data.summary.sessionsTracked,
                        icon: Calendar,
                        color: "text-brand-green",
                        bg: "bg-brand-green/10",
                      },
                      {
                        label: "Attendance rate",
                        value: `${data.summary.attendanceRate}%`,
                        icon: CheckCircle2,
                        color: "text-brand-green",
                        bg: "bg-brand-green/10",
                      },
                      {
                        label: "Absent marks",
                        value: data.summary.absentCount,
                        icon: XCircle,
                        color: "text-red-500",
                        bg: "bg-red-500/10",
                      },
                      {
                        label: "Late marks",
                        value: data.summary.lateCount,
                        icon: Clock3,
                        color: "text-brand-orange",
                        bg: "bg-brand-orange/10",
                      },
                      {
                        label: "Queued alerts",
                        value: data.summary.queuedAlerts,
                        icon: BellRing,
                        color: "text-blue-500",
                        bg: "bg-blue-500/10",
                      },
                      {
                        label: "Pending corrections",
                        value: data.summary.pendingCorrections,
                        icon: ShieldAlert,
                        color: "text-brand-orange",
                        bg: "bg-brand-orange/10",
                      },
                    ].map((card) => (
                      <div key={card.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                        <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
                          <card.icon size={18} />
                        </div>
                        <div className={`font-display text-3xl ${card.color}`}>{card.value}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{card.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-display text-2xl text-[var(--text-primary)]">Class performance</h2>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">Attendance rate by class for the selected month.</p>
                        </div>
                        <div className="text-right text-xs text-[var(--text-muted)]">
                          <div>{data.summary.classesCovered} class{data.summary.classesCovered === 1 ? "" : "es"} covered</div>
                          <div>{data.summary.activeStudents} active student{data.summary.activeStudents === 1 ? "" : "s"}</div>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        {data.classStats.length ? (
                          data.classStats.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <div className="font-display text-xl text-[var(--text-primary)]">{item.displayName}</div>
                                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                                    {item.activeStudents} student{item.activeStudents === 1 ? "" : "s"} · {item.sessions} session{item.sessions === 1 ? "" : "s"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-2xl text-brand-green">{item.attendanceRate}%</div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">attendance rate</div>
                                </div>
                              </div>
                              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-green-light" style={{ width: `${item.attendanceRate}%` }} />
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
                                <div>
                                  <div className="text-[var(--text-muted)]">Present</div>
                                  <div className="font-semibold text-brand-green">{item.present}</div>
                                </div>
                                <div>
                                  <div className="text-[var(--text-muted)]">Absent</div>
                                  <div className="font-semibold text-red-500">{item.absent}</div>
                                </div>
                                <div>
                                  <div className="text-[var(--text-muted)]">Late</div>
                                  <div className="font-semibold text-brand-orange">{item.late}</div>
                                </div>
                                <div>
                                  <div className="text-[var(--text-muted)]">Locked</div>
                                  <div className="font-semibold text-[var(--text-primary)]">{item.lockedSessions}</div>
                                </div>
                                <div>
                                  <div className="text-[var(--text-muted)]">Last session</div>
                                  <div className="font-semibold text-[var(--text-primary)]">
                                    {item.lastSessionDate ? new Date(item.lastSessionDate).toLocaleDateString() : "—"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No attendance sessions found for the selected scope.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                        <h2 className="font-display text-2xl text-[var(--text-primary)]">Alert pipeline</h2>
                        <div className="mt-5 grid gap-3">
                          {data.alertBreakdown.byChannel.map((item) => (
                            <div key={item.channel} className="rounded-xl bg-[var(--surface-disabled)] px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">{item.channel}</span>
                                <span className="font-display text-xl text-[var(--text-primary)]">{item.total}</span>
                              </div>
                              <div className="mt-1 text-xs text-[var(--text-muted)]">Pending: {item.pending}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                          {data.alertBreakdown.byStatus.map((item) => (
                            <div key={item.status} className="rounded-xl border border-[var(--border-subtle)] px-4 py-3">
                              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{item.status}</div>
                              <div className="mt-1 font-display text-2xl text-[var(--text-primary)]">{item.total}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="font-display text-2xl text-[var(--text-primary)]">Correction queue</h2>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">Most recent correction requests.</p>
                          </div>
                          <Link href="/admin/attendance-corrections" className="text-sm font-bold text-brand-green hover:underline">
                            Open queue
                          </Link>
                        </div>
                        <div className="mt-5 space-y-3">
                          {data.recentCorrections.length ? (
                            data.recentCorrections.map((item) => (
                              <div key={item.id} className="rounded-xl bg-[var(--surface-disabled)] px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${item.status === "PENDING" ? "bg-brand-orange/15 text-brand-orange" : item.status === "APPROVED" ? "bg-brand-green/15 text-brand-green" : "bg-red-500/15 text-red-500"}`}>
                                    {item.status}
                                  </span>
                                  <span className="text-[10px] text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{item.className} · {item.teacherName}</div>
                                <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{item.reason}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[var(--text-muted)]">No correction requests recorded yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-brand-orange" size={18} />
                        <h2 className="font-display text-2xl text-[var(--text-primary)]">Students needing attention</h2>
                      </div>
                      <div className="mt-5 space-y-3">
                        {data.studentsOfConcern.length ? (
                          data.studentsOfConcern.map((item) => (
                            <div key={item.studentId} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{item.displayName}</div>
                                  <div className="text-[10px] text-[var(--text-muted)]">{item.studentId}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-xl text-brand-orange">{item.concernScore}</div>
                                  <div className="text-[10px] text-[var(--text-muted)]">concern score</div>
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <div className="text-[var(--text-muted)]">Absent</div>
                                  <div className="font-semibold text-red-500">{item.absent}</div>
                                </div>
                                <div>
                                  <div className="text-[var(--text-muted)]">Late</div>
                                  <div className="font-semibold text-brand-orange">{item.late}</div>
                                </div>
                                <div>
                                  <div className="text-[var(--text-muted)]">Attendance</div>
                                  <div className="font-semibold text-brand-green">{item.attendanceRate}%</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No absence/late concentration detected for the selected scope.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <div className="flex items-center gap-3">
                        <Activity className="text-brand-green" size={18} />
                        <h2 className="font-display text-2xl text-[var(--text-primary)]">Daily trend</h2>
                      </div>
                      <div className="mt-5 space-y-3">
                        {data.dailyTrend.length ? (
                          data.dailyTrend.map((item) => (
                            <div key={item.date} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] px-4 py-3">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{new Date(`${item.date}T12:00:00.000Z`).toLocaleDateString()}</div>
                                  <div className="text-[10px] text-[var(--text-muted)]">{item.sessions} session{item.sessions === 1 ? "" : "s"} · {item.total} marks</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-2xl text-brand-green">{item.attendanceRate}%</div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">attendance</div>
                                </div>
                              </div>
                              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-green-light" style={{ width: `${item.attendanceRate}%` }} />
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <div className="text-[var(--text-muted)]">Present</div>
                                  <div className="font-semibold text-brand-green">{item.present}</div>
                                </div>
                                <div>
                                  <div className="text-[var(--text-muted)]">Absent</div>
                                  <div className="font-semibold text-red-500">{item.absent}</div>
                                </div>
                                <div>
                                  <div className="text-[var(--text-muted)]">Late</div>
                                  <div className="font-semibold text-brand-orange">{item.late}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No daily trend data for the selected month.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl text-[var(--text-primary)]">Recent submitted sessions</h2>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">Latest registers across the current scope.</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {data.recentSessions.length ? (
                        data.recentSessions.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${item.isLocked ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/15 text-brand-orange"}`}>
                                {item.isLocked ? "Locked" : "Draft"}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">{new Date(item.date).toLocaleDateString()}</span>
                            </div>
                            <div className="mt-3 font-display text-xl text-[var(--text-primary)]">{item.className}</div>
                            <div className="mt-1 text-xs text-[var(--text-muted)]">{item.teacherName} · {item.periodKey}</div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <div className="text-[var(--text-muted)]">Attendance rate</div>
                                <div className="font-semibold text-brand-green">{item.attendanceRate}%</div>
                              </div>
                              <div>
                                <div className="text-[var(--text-muted)]">Submitted</div>
                                <div className="font-semibold text-[var(--text-primary)]">{item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString() : "—"}</div>
                              </div>
                              <div>
                                <div className="text-[var(--text-muted)]">Absent</div>
                                <div className="font-semibold text-red-500">{item.absent}</div>
                              </div>
                              <div>
                                <div className="text-[var(--text-muted)]">Late</div>
                                <div className="font-semibold text-brand-orange">{item.late}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">No recent sessions found for the selected scope.</p>
                      )}
                    </div>
                  </div>
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
'@
Write-ProjectFile -RelativePath 'app\admin\attendance-analytics\page.tsx' -Content $content

# --- components/AdminSidebar.tsx ---
$content = @'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Eye, ChevronDown, ShieldCheck, GraduationCap, User, Users,
  LayoutGrid, LogOut, LayoutDashboard, CreditCard, FileText, ClipboardCheck,
  UserCheck, IdCard, BarChart3, Settings, BookOpen, Trash2,
  School, Shield, Lock, Send, UserPlus, HelpCircle
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import Image from "next/image";

const PORTAL_SWITCHER = [
  { label: "Admin Portal", href: "/admin", icon: ShieldCheck, type: "admin" },
  { label: "Teacher Portal", href: "/teacher/dashboard", icon: GraduationCap, type: "teacher" },
  { label: "Student Portal", href: "/student/dashboard", icon: User, type: "student" },
  { label: "Parent Portal", href: "/parent/dashboard", icon: Users, type: "parent" },
];

const ADMIN_NAV = [
  { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Finances", href: "/admin/finances", icon: CreditCard, badge: "New" },
  { label: "View Questions", href: "/admin/questions", icon: HelpCircle },
  { label: "Mark Presence", href: "/admin/mark-presence", icon: UserCheck },
  { label: "Generate ID Cards", href: "/admin/id-cards", icon: IdCard },
  { label: "Attendance Analytics", href: "/admin/attendance-analytics", icon: BarChart3, badge: "Live" },
  { label: "Attendance Corrections", href: "/admin/attendance-corrections", icon: ClipboardCheck, badge: "Live" },
  { label: "Academic Overview", href: "/admin/academic-overview", icon: BarChart3 },
  { label: "View Student Attendance", href: "/admin/student-attendance", icon: Users },
  { label: "View Student Information", href: "/admin/students", icon: BookOpen },
  { label: "Fee Management", href: "/admin/fees", icon: CreditCard },
  { label: "Report Cards", href: "/admin/report-cards", icon: FileText },
  { label: "Gradebook Lock", href: "/admin/gradebook-lock", icon: Lock },
  { label: "Staff Assignments", href: "/admin/staff-assignments", icon: UserPlus },
  { label: "Broadcasts", href: "/admin/broadcasts", icon: Send },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
    };
    if (switcherOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switcherOpen]);

  return (
    <aside className="lg:w-[280px] shrink-0">
      <div className="sticky top-24 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
        {/* Portal Switcher */}
        <div ref={switcherRef} className="relative">
          <button onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full p-4 rounded-2xl bg-brand-navy border border-white/10 hover:border-brand-green/50 transition-all flex items-center justify-between">
            <div className="text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-green block">Active Portal</span>
              <span className="font-display text-sm text-white tracking-[1px]">Administration</span>
            </div>
            <ChevronDown size={16} className={`text-white/60 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
          </button>
          {switcherOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ zIndex: 100, backgroundColor: "#0C1824" }}>
              <div className="p-3 border-b border-white/10 flex items-center gap-2"><LayoutGrid size={12} className="text-white/60" /><span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Switch Portal</span></div>
              {PORTAL_SWITCHER.map(p => (
                <Link key={p.type} href={p.href} onClick={() => setSwitcherOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${p.type === "admin" ? "bg-brand-green/20 text-brand-green" : "text-white/80 hover:bg-white/5 hover:text-brand-green"}`}>
                  <p.icon size={16} /><span className="font-medium">{p.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Admin Profile */}
        <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-2">
            <Image src="/ykay-logo.png" alt="Ykay" width={40} height={40} className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{user?.name || "Administrator"}</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-green" /><span className="text-[10px] text-brand-green font-bold">ADMIN</span></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/30">
          <Eye size={14} className="text-brand-orange" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">Demo Mode</span>
        </div>

        {/* Admin Tools Label */}
        <div className="flex items-center gap-2 px-4">
          <Settings size={14} className="text-brand-green" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">Admin Tools</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {ADMIN_NAV.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive ? "bg-brand-green/10 text-brand-green border border-brand-green/20"
                           : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-disabled)] border border-transparent"
                }`}>
                <item.icon size={16} />
                <span className="tracking-wide flex-1">{item.label}</span>
                {item.badge && <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-green text-white font-bold">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1">
          <Link href="/portal" className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-brand-green transition-colors rounded-lg">
            <ArrowLeft size={14} /><span>Portal Hub</span>
          </Link>
          <button onClick={() => { toast("Logged out", "info"); logout(); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg">
            <LogOut size={14} /><span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
'@
Write-ProjectFile -RelativePath 'components\AdminSidebar.tsx' -Content $content

# --- PHASE3C_ADMIN_ATTENDANCE_ANALYTICS_NOTES.md ---
$content = @'
# Phase 3C — Admin Attendance Analytics

## What was added
Phase 3C introduces a live admin analytics surface for attendance operations.

### New API route
- `GET /api/admin/attendance/analytics`

### New page
- `app/admin/attendance-analytics/page.tsx`

### Updated navigation
- `components/AdminSidebar.tsx`
  - adds a live link to Attendance Analytics

## What the analytics page shows
- attendance sessions tracked for the selected month
- overall attendance rate
- absent and late counts
- queued alert pressure
- pending correction request count
- class-level attendance performance
- daily attendance trend
- students needing attention
- recent submitted sessions
- recent correction requests
- alert breakdown by channel and status

## Filters
- month filter
- optional class scope filter

## Data sources used
- `AttendanceSession`
- `AttendanceEntry`
- `AttendanceAlertJob`
- `AttendanceCorrectionRequest`
- `SchoolClass`
- `StudentProfile`
- `TeacherProfile`

## Files changed
- `app/api/admin/attendance/analytics/route.ts`
- `app/admin/attendance-analytics/page.tsx`
- `components/AdminSidebar.tsx`

## Migration status
No schema change was required for Phase 3C.
So after ingestion, you only need:

```powershell
npx prisma generate
npm run build
```

## Recommended Git branch name
```powershell
git checkout -b phase/3c-admin-attendance-analytics
```
'@
Write-ProjectFile -RelativePath 'PHASE3C_ADMIN_ATTENDANCE_ANALYTICS_NOTES.md' -Content $content

Write-Host "Phase 3C Admin Attendance Analytics files applied successfully." -ForegroundColor Cyan