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
    create: vi.fn(),
    createMany: vi.fn(),
  },
  deviceToken: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  behaviorRecord: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  messageThread: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  messageParticipant: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  feePayment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  feeInvoice: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
  },
  reportCard: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  feePaymentAttempt: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  gradebookEntry: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  examAttempt: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  examAnswer: {
    findMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  schoolClass: {
    findFirst: vi.fn(),
  },
  admissionApplication: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  paymentTransaction: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  parentStudentLink: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  staffInvite: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  idempotencyRecord: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  attendanceSession: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  subjectGradebook: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  exam: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  examRetake: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  teacherClassAssignment: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => {
    if (typeof fn === "function") return fn(mockPrisma);
    return Promise.resolve(fn);
  }),
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock next/headers
//
// `getSession()` reads BOTH transports: the `ykay_session` cookie (web) and the
// `Authorization: Bearer` header (mobile / API clients). Both must be mocked or
// the header path throws "No 'headers' export is defined on the next/headers mock".
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => undefined),
    }),
  ),
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => null),
    }),
  ),
}));

// Export for use in tests
export { mockPrisma };
