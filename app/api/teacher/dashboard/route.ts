import { AttendanceStatus, TeacherAssignmentRole, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireRole([UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN, UserRole.DIRECTOR]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.teacherProfile.findFirst({
    where: { schoolId: user.schoolId, userId: user.id, isActive: true },
    include: {
      classAssignments: {
        where: { isActive: true },
        include: {
          classroom: {
            select: {
              id: true,
              displayName: true,
              students: { where: { isActive: true }, select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "No teacher profile is linked to this account. Contact the school administrator." },
      { status: 404 }
    );
  }

  const formAssignments = profile.classAssignments.filter((a) => a.role === TeacherAssignmentRole.FORM_TEACHER);
  const subjectAssignments = profile.classAssignments.filter(
    (a) => a.role === TeacherAssignmentRole.SUBJECT_TEACHER && a.subjectName
  );

  const classIds = [...new Set(profile.classAssignments.map((a) => a.classroom.id))];
  const totalStudents = [...new Set(profile.classAssignments.flatMap((a) => a.classroom.students.map((s) => s.id)))].length;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaySessions = await prisma.attendanceSession.findMany({
    where: {
      teacherProfileId: profile.id,
      sessionDate: { gte: startOfDay },
    },
    include: {
      classroom: { select: { displayName: true } },
      entries: { select: { status: true } },
    },
  });

  const recentSessions = await prisma.attendanceSession.findMany({
    where: { teacherProfileId: profile.id, submittedAt: { not: null } },
    orderBy: { sessionDate: "desc" },
    take: 5,
    include: {
      classroom: { select: { displayName: true } },
      entries: { select: { status: true } },
    },
  });

  const pendingCorrections = await prisma.attendanceCorrectionRequest.count({
    where: { teacherProfileId: profile.id, status: "PENDING" },
  });

  const activity = await prisma.auditLog.findMany({
    where: { schoolId: user.schoolId, actorUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { action: true, entityType: true, createdAt: true },
  });

  return NextResponse.json({
    teacher: {
      displayName: profile.displayName,
      roleLabel: profile.roleLabel,
      photoUrl: profile.photoUrl,
      isFormTeacher: formAssignments.length > 0,
      isSubjectTeacher: subjectAssignments.length > 0,
      formClassName: formAssignments[0]?.classroom.displayName || null,
    },
    stats: {
      classCount: classIds.length,
      totalStudents,
      subjectCount: [...new Set(subjectAssignments.map((a) => a.subjectName))].length,
      pendingCorrections,
      todayRegisterDone: todaySessions.some((session) => session.submittedAt),
    },
    assignments: profile.classAssignments.map((assignment) => ({
      id: assignment.id,
      role: assignment.role,
      subjectName: assignment.subjectName,
      className: assignment.classroom.displayName,
      studentCount: assignment.classroom.students.length,
    })),
    recentSessions: recentSessions.map((session) => ({
      className: session.classroom.displayName,
      date: session.sessionDate.toISOString(),
      present: session.entries.filter((entry) => entry.status === AttendanceStatus.PRESENT).length,
      total: session.entries.length,
      isLocked: session.isLocked,
    })),
    activity: activity.map((entry) => ({
      action: entry.action,
      entityType: entry.entityType,
      at: entry.createdAt.toISOString(),
    })),
  });
}
