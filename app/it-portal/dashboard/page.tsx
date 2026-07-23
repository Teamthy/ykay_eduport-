"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/components/Toast";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  LoaderCircle,
  MonitorSmartphone,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  level: string;
  certification: string;
  durationWeeks: number;
  moduleCount: number;
  enrolled: boolean;
  progressPercent: number;
  status: string | null;
  certificateNumber: string | null;
};

type DashboardResponse = {
  user: { name: string; email: string; role: string };
  summary: {
    enrolledCourses: number;
    completedCourses: number;
    certificatesEarned: number;
    averageProgress: number;
  };
  catalog: CatalogCourse[];
  certificates: Array<{
    certificateNumber: string;
    issuedAt: string;
    courseTitle: string;
    credential: string;
  }>;
};

export default function ItPortalDashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/it/dashboard", { cache: "no-store" });
      const body = (await response.json()) as DashboardResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load your IT dashboard.");
      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your IT dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function enroll(course: CatalogCourse) {
    setEnrollingId(course.id);
    try {
      const response = await fetch("/api/it/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      const body = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to enroll.");
      toast(body.message || "Enrolled!", "success");
      await load();
    } catch (enrollError) {
      toast(enrollError instanceof Error ? enrollError.message : "Unable to enroll.", "error");
    } finally {
      setEnrollingId("");
    }
  }

  const enrolledCourses = data?.catalog.filter((course) => course.enrolled) || [];
  const availableCourses = data?.catalog.filter((course) => !course.enrolled) || [];
  const firstName = data?.user.name.split(" ")[0] || "";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-navy px-6 pt-28 pb-14">
          <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-brand-green to-transparent opacity-10" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                <MonitorSmartphone size={11} /> IT Education Portal
              </span>
            </div>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-6xl">
              {firstName ? `WELCOME, ${firstName.toUpperCase()}` : "MY IT DASHBOARD"}
            </h1>
            <p className="mt-3 max-w-2xl font-body text-sm text-white/60">
              Track your digital skills journey — course progress, modules completed, and certificates earned.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto max-w-7xl space-y-10">
            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                {error}{" "}
                <Link href="/it-portal/auth" className="font-bold underline">
                  Sign in to the IT portal
                </Link>
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 shadow-[var(--card-shadow)]">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading your dashboard...
                </div>
              </div>
            ) : null}

            {!loading && data ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Enrolled Courses", value: data.summary.enrolledCourses, icon: BookOpen, tone: "text-brand-green" },
                    { label: "Average Progress", value: `${data.summary.averageProgress}%`, icon: TrendingUp, tone: "text-brand-green" },
                    { label: "Completed", value: data.summary.completedCourses, icon: CheckCircle2, tone: "text-brand-orange" },
                    { label: "Certificates", value: data.summary.certificatesEarned, icon: Award, tone: "text-brand-orange" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                      <card.icon size={18} className={`mb-3 ${card.tone}`} />
                      <div className={`font-display text-3xl ${card.tone}`}>{card.value}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* My courses */}
                {enrolledCourses.length ? (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-display text-2xl text-[var(--text-primary)]">My Courses</h2>
                      <span className="rounded-full bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                        {enrolledCourses.length} active
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {enrolledCourses.map((course) => (
                        <Link
                          key={course.id}
                          href={`/it-portal/courses/${course.slug}`}
                          className="group rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)] transition-all hover:-translate-y-1 hover:border-brand-green hover:shadow-[var(--card-shadow-hover)]"
                        >
                          <div className="mb-4 flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green transition-colors group-hover:bg-brand-green group-hover:text-white">
                              <GraduationCap size={22} />
                            </div>
                            {course.status === "COMPLETED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-brand-green">
                                <Award size={10} /> Certified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-brand-orange">
                                <PlayCircle size={10} /> In Progress
                              </span>
                            )}
                          </div>
                          <h3 className="mb-1 font-display text-xl text-[var(--text-primary)]">{course.title}</h3>
                          <p className="mb-4 text-xs text-[var(--text-muted)]">{course.certification}</p>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-[var(--text-muted)]">Progress</span>
                            <span className="font-bold text-brand-green">{course.progressPercent}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-disabled)]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-green-light transition-all"
                              style={{ width: `${course.progressPercent}%` }}
                            />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Certificates */}
                {data.certificates.length ? (
                  <div className="rounded-[2rem] border border-brand-green/25 bg-brand-green/5 p-8">
                    <h2 className="mb-5 flex items-center gap-2 font-display text-2xl text-[var(--text-primary)]">
                      <Award size={22} className="text-brand-green" /> My Certificates
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {data.certificates.map((certificate) => (
                        <div key={certificate.certificateNumber} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
                          <div className="font-display text-lg text-[var(--text-primary)]">{certificate.courseTitle}</div>
                          <div className="mt-1 text-xs text-[var(--text-secondary)]">{certificate.credential}</div>
                          <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                            <span className="font-bold text-brand-green">{certificate.certificateNumber}</span>
                            <span>{new Date(certificate.issuedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Course catalog */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-2xl text-[var(--text-primary)]">
                      {enrolledCourses.length ? "Explore More Courses" : "Start Your IT Journey"}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                      <Sparkles size={10} /> Free enrollment
                    </span>
                  </div>
                  {availableCourses.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {availableCourses.map((course) => (
                        <div key={course.id} className="flex flex-col rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                          <div className="mb-4 flex items-center justify-between">
                            <span className="rounded-full bg-[var(--surface-disabled)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                              {course.level}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                              <Clock size={11} /> {course.durationWeeks} weeks · {course.moduleCount} modules
                            </span>
                          </div>
                          <h3 className="mb-1 font-display text-xl text-[var(--text-primary)]">{course.title}</h3>
                          <p className="mb-3 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">{course.tagline}</p>
                          <p className="mb-5 text-[10px] font-bold uppercase tracking-widest text-brand-green">{course.certification}</p>
                          <button
                            onClick={() => void enroll(course)}
                            disabled={Boolean(enrollingId)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand-green-dark disabled:opacity-50"
                          >
                            {enrollingId === course.id ? <LoaderCircle size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                            Enroll Free
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 text-sm text-[var(--text-muted)]">
                      You are enrolled in every available course. New tracks — robotics, data science, and web
                      development — are coming soon.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
