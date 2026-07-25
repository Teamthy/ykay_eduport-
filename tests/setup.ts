/**
 * Vitest global setup.
 *
 * Mocks Prisma and other external dependencies so tests run
 * without a real database connection.
 */
import { vi } from "vitest";

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  securityEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  teacherProfile: {
    findFirst: vi.fn(),
  },
  studentProfile: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  parentProfile: {
    findFirst: vi.fn(),
  },
  userNotification: {
    findMany: vi.fn(),
  },
  feePayment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  feeInvoice: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  schoolClass: {
    findFirst: vi.fn(),
  },
  admissionApplication: {
    findFirst: vi.fn(),
  },
  idempotencyRecord: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  parentStudentLink: {
    findMany: vi.fn(),
  },
  attendanceSession: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  subjectGradebook: {
    findMany: vi.fn(),
  },
  exam: {
    findMany: vi.fn(),
  },
  teacherClassAssignment: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => {
    if (typeof fn === "function") return fn(mockPrisma);
    return Promise.resolve(fn);
  }),
  $queryRaw: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => undefined),
    })
  ),
}));

// Export for use in tests
export { mockPrisma };
