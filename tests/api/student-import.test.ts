import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

/**
 * Bulk student onboarding — the write side.
 *
 * A student who is created but not wired up is worse than one who was never
 * imported: they appear on the roster and then miss their class register, their
 * subjects, their exams and their parent's portal. These tests pin the wiring
 * (subjects, session enrolment, guardian link) and the two ways bulk imports
 * usually go wrong in production: creating everyone twice, and putting a child
 * in a class that does not exist.
 */

vi.mock("@/lib/session", () => ({
  requireRole: vi.fn(async () => ({ id: "admin_1", schoolId: "school_1", role: "ADMIN" })),
}));

vi.mock("@/lib/requests", () => ({ getClientIp: vi.fn(() => "127.0.0.1") }));

const CLASSES = [{ id: "cls_jss1a", displayName: "JSS 1A", level: "JSS1" }];
const SUBJECTS = [
  { id: "sub_maths", name: "Mathematics", level: "JSS1", category: "COMPULSORY" },
  { id: "sub_french", name: "French", level: "JSS1", category: "ELECTIVE" },
];

function request(body: unknown) {
  return { json: async () => body } as never;
}

const ROW = {
  line: 2,
  firstName: "Chidera",
  lastName: "Okafor",
  otherNames: "Ada",
  gender: "F",
  className: "JSS 1A",
  subjects: "French",
  studentId: "",
  guardianName: "Ngozi Okafor",
  guardianPhone: "08031234567",
  guardianEmail: "ngozi@example.com",
  studentEmail: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.schoolClass.findMany.mockResolvedValue(CLASSES);
  mockPrisma.schoolClass.findFirst.mockResolvedValue({
    id: "cls_jss1a",
    displayName: "JSS 1A",
    capacity: null,
    _count: { students: 0 },
  });
  mockPrisma.subject.findMany.mockResolvedValue(SUBJECTS);
  mockPrisma.studentProfile.findMany.mockResolvedValue([]);
  mockPrisma.academicSession.findFirst.mockResolvedValue({ id: "sess_1", label: "2026/2027" });
  mockPrisma.studentProfile.create.mockResolvedValue({ id: "stu_1" });
  mockPrisma.studentProfile.findUnique.mockResolvedValue(null);
  mockPrisma.studentSubject.createMany.mockResolvedValue({ count: 2 });
  mockPrisma.studentEnrolment.upsert.mockResolvedValue({ id: "enr_1" });
  mockPrisma.parentProfile.findFirst.mockResolvedValue(null);
  mockPrisma.user.create.mockResolvedValue({ id: "usr_parent" });
  mockPrisma.parentProfile.create.mockResolvedValue({ id: "par_1" });
  mockPrisma.parentStudentLink.findFirst.mockResolvedValue(null);
  mockPrisma.parentStudentLink.create.mockResolvedValue({ id: "link_1" });
  mockPrisma.auditLog.create.mockResolvedValue({ id: "audit_1" });
  mockPrisma.$queryRaw.mockResolvedValue([]);
});

describe("POST /api/admin/students/import", () => {
  it("is a preview unless commit is true — nothing is written", async () => {
    const { POST } = await import("@/app/api/admin/students/import/route");
    const response = await POST(request({ rows: [ROW] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.plan.totals.create).toBe(1);
    expect(mockPrisma.studentProfile.create).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("wires a committed student into their class, subjects, session and guardian", async () => {
    const { POST } = await import("@/app/api/admin/students/import/route");
    const response = await POST(request({ rows: [ROW], commit: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rows[0].status).toBe("created");
    expect(body.totals).toMatchObject({ created: 1, skipped: 0, failed: 0 });

    // The roster entry, in the resolved class.
    const studentData = mockPrisma.studentProfile.create.mock.calls[0][0].data;
    expect(studentData.currentClassId).toBe("cls_jss1a");
    expect(studentData.displayName).toBe("Chidera Ada Okafor");

    // Compulsory Maths plus the named elective — and only this level's subjects.
    const subjects = mockPrisma.studentSubject.createMany.mock.calls[0][0].data;
    expect(subjects.map((row: { subjectId: string }) => row.subjectId).sort()).toEqual([
      "sub_french",
      "sub_maths",
    ]);

    // The current session, so promotion and reporting see them.
    expect(mockPrisma.studentEnrolment.upsert.mock.calls[0][0].create).toMatchObject({
      classId: "cls_jss1a",
      sessionId: "sess_1",
    });

    // The guardian account and the link that puts the child in their portal.
    expect(mockPrisma.user.create.mock.calls[0][0].data).toMatchObject({
      email: "ngozi@example.com",
      role: "PARENT",
    });
    expect(mockPrisma.parentStudentLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ parentProfileId: "par_1", studentProfileId: "stu_1" }),
    });

    // A one-time password, returned once and never stored.
    expect(body.rows[0].parentLogin.email).toBe("ngozi@example.com");
    expect(body.rows[0].parentLogin.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("skips a student already on the roster instead of duplicating them", async () => {
    mockPrisma.studentProfile.findMany.mockResolvedValue([
      {
        firstName: "Chidera",
        lastName: "Okafor",
        guardianPhone: "0803 123 4567",
        studentId: "YKC/2026/0142",
      },
    ]);

    const { POST } = await import("@/app/api/admin/students/import/route");
    const response = await POST(request({ rows: [ROW], commit: true }));
    const body = await response.json();

    expect(body.rows[0].status).toBe("skipped");
    expect(body.rows[0].detail).toMatch(/already on the roster/i);
    expect(body.totals).toMatchObject({ created: 0, skipped: 1 });
    expect(mockPrisma.studentProfile.create).not.toHaveBeenCalled();
  });

  it("reuses one parent account for siblings in the same import", async () => {
    const sibling = {
      ...ROW,
      line: 3,
      firstName: "Ifeanyi",
      otherNames: "",
      gender: "M",
      subjects: "",
    };

    // Each row commits in its own transaction, so the second row's lookup sees
    // the parent the first row wrote.
    mockPrisma.parentProfile.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "par_1" });

    const { POST } = await import("@/app/api/admin/students/import/route");
    const response = await POST(request({ rows: [ROW, sibling], commit: true }));
    const body = await response.json();

    expect(mockPrisma.parentProfile.findFirst).toHaveBeenCalledTimes(2);
    // One account for two children, and only the first row gets a password.
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    expect(body.rows[0].parentLogin?.temporaryPassword).toBeTruthy();
    expect(body.rows[1].parentLogin).toBeNull();
    expect(mockPrisma.parentStudentLink.create).toHaveBeenCalledTimes(2);
  });

  it("fails the row, not the batch, when a class no longer exists", async () => {
    mockPrisma.schoolClass.findFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/admin/students/import/route");
    const response = await POST(request({ rows: [ROW], commit: true }));
    const body = await response.json();

    expect(body.rows[0].status).toBe("failed");
    expect(body.rows[0].detail).toMatch(/no longer exists/i);
    expect(mockPrisma.studentProfile.create).not.toHaveBeenCalled();
  });

  it("refuses a full class with an instruction, not a stack trace", async () => {
    mockPrisma.schoolClass.findFirst.mockResolvedValue({
      id: "cls_jss1a",
      displayName: "JSS 1A",
      capacity: 30,
      _count: { students: 30 },
    });

    const { POST } = await import("@/app/api/admin/students/import/route");
    const response = await POST(request({ rows: [ROW], commit: true }));
    const body = await response.json();

    expect(body.rows[0].status).toBe("failed");
    expect(body.rows[0].detail).toMatch(/class is full/i);
  });

  it("protects an admission number that is already in use", async () => {
    mockPrisma.studentProfile.findUnique.mockResolvedValue({ id: "someone_else" });

    const { POST } = await import("@/app/api/admin/students/import/route");
    const response = await POST(
      request({ rows: [{ ...ROW, studentId: "YKC/2026/0001" }], commit: true }),
    );
    const body = await response.json();

    expect(body.rows[0].status).toBe("failed");
    expect(body.rows[0].detail).toMatch(/already used/i);
  });

  it("creates a student login only when the sheet gives an email", async () => {
    const withEmail = { ...ROW, studentEmail: "chidera@ykaycollege.com" };
    mockPrisma.user.create
      .mockResolvedValueOnce({ id: "usr_student" })
      .mockResolvedValueOnce({ id: "usr_parent" });

    const { POST } = await import("@/app/api/admin/students/import/route");
    await POST(request({ rows: [withEmail], commit: true }));

    expect(mockPrisma.user.create.mock.calls[0][0].data).toMatchObject({
      email: "chidera@ykaycollege.com",
      role: "STUDENT",
      mustChangePassword: true,
    });
    expect(mockPrisma.studentProfile.create.mock.calls[0][0].data.userId).toBe("usr_student");
  });

  it("never creates a student login from a name it invented", async () => {
    const { POST } = await import("@/app/api/admin/students/import/route");
    await POST(request({ rows: [ROW], commit: true }));

    // Only the parent account was created; the student has no email in the sheet.
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.create.mock.calls[0][0].data.role).toBe("PARENT");
    expect(mockPrisma.studentProfile.create.mock.calls[0][0].data.userId).toBeNull();
  });

  it("rejects an oversized batch so one request cannot stall the function", async () => {
    const { POST } = await import("@/app/api/admin/students/import/route");
    const rows = Array.from({ length: 201 }, (_, index) => ({ ...ROW, line: index + 2 }));
    const response = await POST(request({ rows, commit: true }));

    expect(response.status).toBe(413);
    expect(mockPrisma.studentProfile.create).not.toHaveBeenCalled();
  });

  it("re-plans server-side: a row with no class is refused even if the client said it was fine", async () => {
    const { POST } = await import("@/app/api/admin/students/import/route");
    const response = await POST(request({ rows: [{ ...ROW, className: "Year 9" }], commit: true }));
    const body = await response.json();

    expect(body.rows[0].status).toBe("failed");
    expect(body.rows[0].detail).toMatch(/No class called/);
  });

  it("writes one audit record per student and one for the batch", async () => {
    const { POST } = await import("@/app/api/admin/students/import/route");
    await POST(request({ rows: [ROW], commit: true }));

    const actions = (
      mockPrisma.auditLog.create.mock.calls as unknown as Array<[{ data: { action: string } }]>
    ).map((call) => call[0].data.action);
    expect(actions).toContain("STUDENT_BULK_IMPORTED");
    expect(actions).toContain("STUDENT_BULK_IMPORT_BATCH");
  });
});
