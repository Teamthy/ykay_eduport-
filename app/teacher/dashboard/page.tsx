"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER, FORM_CLASS_STUDENTS } from "@/lib/teacherData";
import {
  BookOpen, Users, Clock, TrendingUp, Calendar, ClipboardCheck,
  Award, MessageSquare, School, Heart, ArrowRight, Bell,
  UserCheck, AlertCircle, CheckCircle2, Sparkles
} from "lucide-react";

export default function TeacherDashboard() {
  const teacher = CURRENT_TEACHER;
  const isSubjectTeacher = teacher.role === "subject_teacher" || teacher.role === "both";
  const isClassTeacher = teacher.role === "class_teacher" || teacher.role === "both";

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const todaysClasses = [
    { time: "08:00 - 09:00", subject: "Mathematics", class: "JSS1A", room: "Room 12", students: 28, status: "completed" },
    { time: "09:10 - 10:10", subject: "Physics", class: "SS2A", room: "Lab 1", students: 24, status: "in-progress" },
    { time: "11:30 - 12:30", subject: "Mathematics", class: "SS1A", room: "Room 12", students: 30, status: "upcoming" },
    { time: "13:30 - 14:30", subject: "Physics", class: "SS3A", room: "Lab 1", students: 18, status: "upcoming" },
  ];

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero Welcome */}
        <section className="pt-24 pb-12 bg-brand-navy px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-gradient-to-l from-brand-green to-transparent" />
          <div className="mx-auto max-w-7xl relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <img
              src={teacher.photoUrl}
              alt={teacher.fullName}
              className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover border-4 border-brand-green shadow-2xl"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 text-brand-green">
                <Sparkles size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">{greeting}</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl text-white mb-2 tracking-widest">
                {teacher.fullName.toUpperCase()}
              </h1>
              <div className="flex flex-wrap gap-2 mb-3">
                {isSubjectTeacher && (
                  <span className="px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest">
                    Subject Teacher · {teacher.totalSubjects} subjects
                  </span>
                )}
                {isClassTeacher && (
                  <span className="px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest">
                    Form Teacher · {teacher.formClass}
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm">
                {isSubjectTeacher && isClassTeacher && `You have ${todaysClasses.length} classes today and ${teacher.formClassStudentCount} students to look after.`}
                {isSubjectTeacher && !isClassTeacher && `You have ${todaysClasses.length} classes to teach today across ${teacher.totalClasses} class arms.`}
                {isClassTeacher && !isSubjectTeacher && `You have ${teacher.formClassStudentCount} students in your care today.`}
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Classes Today", value: todaysClasses.length, icon: Calendar, color: "text-brand-green" },
                  { label: isClassTeacher ? "My Class Size" : "Total Students", value: isClassTeacher ? teacher.formClassStudentCount : teacher.totalStudentsTaught, icon: Users, color: "text-brand-orange" },
                  { label: "Subjects Taught", value: teacher.totalSubjects, icon: BookOpen, color: "text-brand-green" },
                  { label: "Pending Tasks", value: 5, icon: ClipboardCheck, color: "text-red-500" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-5 shadow-[var(--card-shadow)]">
                    <div className={`w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center mb-3 ${stat.color}`}>
                      <stat.icon size={18} />
                    </div>
                    <div className="font-display text-3xl text-[var(--text-primary)] mb-1">{stat.value}</div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Two-column: Today's Classes + Quick Actions */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Today's Schedule (2/3) */}
                {isSubjectTeacher && (
                  <div className="lg:col-span-2 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-display text-lg text-[var(--text-primary)]">Today&apos;s Schedule</h3>
                        <p className="text-xs text-[var(--text-muted)]">Monday, 21 July 2025</p>
                      </div>
                      <Calendar size={18} className="text-brand-green" />
                    </div>
                    <div className="space-y-3">
                      {todaysClasses.map((cls, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface-disabled)] hover:bg-[var(--surface-card-hover)] transition-colors">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            cls.status === "completed" ? "bg-brand-green/10 text-brand-green" :
                            cls.status === "in-progress" ? "bg-brand-orange/10 text-brand-orange" :
                            "bg-[var(--border-subtle)] text-[var(--text-muted)]"
                          }`}>
                            {cls.status === "completed" ? <CheckCircle2 size={20} /> :
                             cls.status === "in-progress" ? <Clock size={20} /> :
                             <Clock size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-display text-xs tracking-widest text-brand-green">{cls.time}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                cls.status === "completed" ? "bg-brand-green/20 text-brand-green" :
                                cls.status === "in-progress" ? "bg-brand-orange/20 text-brand-orange animate-pulse" :
                                "bg-[var(--border-subtle)] text-[var(--text-muted)]"
                              }`}>
                                {cls.status}
                              </span>
                            </div>
                            <div className="font-bold text-[var(--text-primary)] mt-1">{cls.subject} · {cls.class}</div>
                            <div className="text-xs text-[var(--text-muted)]">{cls.room} · {cls.students} students</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Class Teacher Panel (if applicable) */}
                {isClassTeacher && (
                  <div className={isSubjectTeacher ? "" : "lg:col-span-3"}>
                    <div className="rounded-2xl bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 border border-brand-orange/30 p-6 h-full">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-orange/20 text-brand-orange flex items-center justify-center">
                          <School size={18} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">Form Teacher</div>
                          <div className="font-display text-lg text-[var(--text-primary)]">Class {teacher.formClass}</div>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mb-4">
                        You&apos;re responsible for {teacher.formClassStudentCount} students in {teacher.formClass}.
                      </p>
                      <div className="space-y-2">
                        <Link href="/teacher/class/attendance" className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-card)] hover:bg-brand-orange/10 transition-colors group">
                          <div className="flex items-center gap-2">
                            <UserCheck size={14} className="text-brand-orange" />
                            <span className="text-sm text-[var(--text-primary)]">Mark Attendance</span>
                          </div>
                          <ArrowRight size={14} className="text-brand-orange group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/teacher/class/roster" className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-card)] hover:bg-brand-orange/10 transition-colors group">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-brand-orange" />
                            <span className="text-sm text-[var(--text-primary)]">View Roster</span>
                          </div>
                          <ArrowRight size={14} className="text-brand-orange group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/teacher/class/behavior" className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-card)] hover:bg-brand-orange/10 transition-colors group">
                          <div className="flex items-center gap-2">
                            <Heart size={14} className="text-brand-orange" />
                            <span className="text-sm text-[var(--text-primary)]">Behavior Records</span>
                          </div>
                          <ArrowRight size={14} className="text-brand-orange group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/teacher/class/announcements" className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-card)] hover:bg-brand-orange/10 transition-colors group">
                          <div className="flex items-center gap-2">
                            <Bell size={14} className="text-brand-orange" />
                            <span className="text-sm text-[var(--text-primary)]">Announcements</span>
                          </div>
                          <ArrowRight size={14} className="text-brand-orange group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* My Subjects (Subject Teacher) */}
              {isSubjectTeacher && (
                <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-lg text-[var(--text-primary)]">My Subject Assignments</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green font-bold uppercase tracking-widest">
                      Assigned by Admin
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {teacher.subjectAssignments.map(sa => (
                      <div key={sa.subject} className="p-5 rounded-xl bg-[var(--surface-disabled)]">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green text-white flex items-center justify-center">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-[var(--text-primary)]">{sa.subject}</div>
                            <div className="text-xs text-[var(--text-muted)]">{sa.classes.length} classes</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sa.classes.map(cls => (
                            <span key={cls} className="text-[10px] px-2 py-0.5 rounded bg-brand-green/10 text-brand-green font-bold">
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
