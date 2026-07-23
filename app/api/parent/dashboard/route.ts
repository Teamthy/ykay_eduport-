import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";
import { getParentPortalProfile, getStudentAttendanceMonth } from "@/lib/attendance-portal";

export const runtime = "nodejs";

export async function GET() {
  const context = await getParentPortalProfile();
  if (!context) {
    return jsonNoStore({ error: "No live parent profile is linked to this account yet." }, { status: 404 });
  }

  const children = context.profile.studentLinks.map((link) => ({
    id: link.studentProfile.id,
    studentId: link.studentProfile.studentId,
    displayName: link.studentProfile.displayName,
    className: link.studentProfile.currentClass.displayName,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
  }));

  if (!children.length) {
    return jsonNoStore({
      parent: { displayName: context.profile.displayName },
      children: [],
      selectedChild: null,
      attendance: { present: 0, absent: 0, late: 0, total: 0, attendanceRate: 0 },
      finance: { totalBilled: 0, totalPaid: 0, totalOutstanding: 0, latestInvoice: null },
      recentAlerts: [],
    });
  }

  const selectedChild = children[0];
  const attendance = await getStudentAttendanceMonth(selectedChild.id, null);

  const [recentAlerts, childInvoices] = await Promise.all([
    prisma.attendanceAlertJob.findMany({
      where: {
        schoolId: context.user.schoolId,
        studentProfileId: selectedChild.id,
        OR: [{ parentProfileId: context.profile.id }, { parentProfileId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        channel: true,
        status: true,
        messagePreview: true,
        createdAt: true,
      },
    }),
    prisma.feeInvoice.findMany({
      where: {
        schoolId: context.user.schoolId,
        studentProfileId: selectedChild.id,
      },
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        invoiceNumber: true,
        termLabel: true,
        title: true,
        status: true,
        totalAmount: true,
        amountPaid: true,
        balanceDue: true,
        dueDate: true,
        issuedAt: true,
      },
    }),
  ]);

  const latestInvoice = childInvoices[0] || null;

  return jsonNoStore({
    parent: { displayName: context.profile.displayName },
    children,
    selectedChild,
    attendance: attendance.summary,
    finance: {
      totalBilled: childInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
      totalPaid: childInvoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
      totalOutstanding: childInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0),
      latestInvoice: latestInvoice
        ? {
            id: latestInvoice.id,
            invoiceNumber: latestInvoice.invoiceNumber,
            termLabel: latestInvoice.termLabel,
            title: latestInvoice.title,
            status: latestInvoice.status,
            totalAmount: latestInvoice.totalAmount,
            amountPaid: latestInvoice.amountPaid,
            balanceDue: latestInvoice.balanceDue,
            dueDate: latestInvoice.dueDate?.toISOString() || null,
            issuedAt: latestInvoice.issuedAt.toISOString(),
          }
        : null,
    },
    recentAlerts: recentAlerts.map((alert) => ({
      id: alert.id,
      channel: alert.channel,
      status: alert.status,
      messagePreview: alert.messagePreview,
      createdAt: alert.createdAt.toISOString(),
    })),
  });
}