import { FeeInvoiceStatus, FeePaymentMethod, FeePaymentStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const FINANCE_ADMIN_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRECTOR,
  UserRole.BURSAR,
  UserRole.COORDINATOR,
];

export function computeInvoiceStatus(
  totalAmount: number,
  amountPaid: number,
  dueDate?: Date | null,
) {
  if (amountPaid >= totalAmount) return FeeInvoiceStatus.PAID;
  if (amountPaid > 0) return FeeInvoiceStatus.PARTIAL;
  if (dueDate && dueDate.getTime() < Date.now()) return FeeInvoiceStatus.OVERDUE;
  return FeeInvoiceStatus.UNPAID;
}

export function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `YKC-RCP-${year}-${suffix}`;
}

export function generatePaymentReference() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `YKC-PAY-${year}-${suffix}`;
}

export async function getParentFinanceContext() {
  const user = await requireRole([UserRole.PARENT]);
  if (!user) return null;

  const profile = await prisma.parentProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      userId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
      phone: true,
      user: { select: { email: true } },
      studentLinks: {
        orderBy: [{ isPrimary: "desc" }, { studentProfile: { displayName: "asc" } }],
        select: {
          isPrimary: true,
          relationship: true,
          studentProfile: {
            select: {
              id: true,
              studentId: true,
              displayName: true,
              currentClass: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!profile) return null;
  return { user, profile };
}

export async function getAdminFinanceContext() {
  const user = await requireRole(FINANCE_ADMIN_ROLES);
  if (!user) return null;
  return { user };
}

export function feeMethodLabel(method: FeePaymentMethod) {
  switch (method) {
    case FeePaymentMethod.BANK_TRANSFER:
      return "Bank Transfer";
    case FeePaymentMethod.CASH:
      return "Cash";
    case FeePaymentMethod.CARD:
      return "Card";
    case FeePaymentMethod.USSD:
      return "USSD";
    default:
      return "Paystack";
  }
}

export function feeStatusLabel(status: FeeInvoiceStatus) {
  return status.replaceAll("_", " ");
}

export function paymentStatusLabel(status: FeePaymentStatus) {
  return status.replaceAll("_", " ");
}
