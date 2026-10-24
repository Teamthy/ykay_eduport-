import { expect, test } from "@playwright/test";
import { apiLogin } from "./helpers";

function assertDisposableTarget() {
  const normalizeHost = (host: string) => host.toLowerCase().replace(/^\[|\]$/g, "");
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const baseUrl = process.env.E2E_BASE_URL || `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;
  const appUrl = new URL(baseUrl);
  const database = process.env.DATABASE_URL;
  if (!database) throw new Error("Mutating promotion E2E requires a disposable DATABASE_URL.");

  const databaseUrl = new URL(database);
  const databaseName = databaseUrl.pathname.replace(/^\//, "").toLowerCase();
  const safeCiTarget =
    process.env.CI === "true" &&
    appUrl.protocol === "http:" &&
    appUrl.port === "3100" &&
    localHosts.has(normalizeHost(appUrl.hostname)) &&
    databaseUrl.protocol === "postgresql:" &&
    databaseUrl.port === "5432" &&
    databaseUrl.username === "ci" &&
    databaseName === "ci" &&
    localHosts.has(normalizeHost(databaseUrl.hostname));

  if (!safeCiTarget) {
    throw new Error(
      "This mutating promotion journey is restricted to CI's loopback app and throwaway ci@localhost:5432/ci database.",
    );
  }
}

/** A full disposable-DB cycle: author -> sit -> release -> notify -> promote -> history. */
test.describe("released assessment lifecycle", () => {
  test.describe.configure({ retries: 0 });

  test("a server-graded CA result survives release, gradebook sync, parent notification, and promotion", async ({
    request,
  }) => {
    test.setTimeout(90_000);
    assertDisposableTarget();
    const teacherCookie = await apiLogin(request, "teacher");
    const studentCookie = await apiLogin(request, "student");
    const parentCookie = await apiLogin(request, "parent");

    const [teacherOverviewResponse, studentOverviewResponse] = await Promise.all([
      request.get("/api/teacher/exams", { headers: { cookie: teacherCookie } }),
      request.get("/api/student/exams?section=ca", { headers: { cookie: studentCookie } }),
    ]);
    expect(teacherOverviewResponse.status()).toBe(200);
    expect(studentOverviewResponse.status()).toBe(200);

    const teacherOverview = await teacherOverviewResponse.json();
    const studentOverview = await studentOverviewResponse.json();
    const rosterResponse = await request.get("/api/teacher/students", {
      headers: { cookie: teacherCookie },
    });
    expect(rosterResponse.status()).toBe(200);
    const roster = await rosterResponse.json();
    const studentRow = roster.students.find(
      (student: { studentId: string }) => student.studentId === studentOverview.student.studentId,
    );
    expect(studentRow, "seeded student must belong to a teacher-assigned class").toBeTruthy();
    const assignment = teacherOverview.assignments.find(
      (item: { classId: string }) => item.classId === studentRow.classId,
    );
    expect(
      assignment,
      "teacher must have a subject assignment for the student's class",
    ).toBeTruthy();

    const title = `CI Results Flow ${Date.now()}`;
    const createResponse = await request.post("/api/teacher/exams", {
      headers: { cookie: teacherCookie },
      data: {
        assignmentId: assignment.id,
        title,
        examType: "CA",
        gradebookComponent: "CA1",
        durationMinutes: 10,
        passMark: 40,
        shuffleQuestions: false,
        bulkQuestions: `Q: Which letter comes first?\nA: A\nB: B\nCorrect: A\nMarks: 5`,
      },
    });
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();

    const publishResponse = await request.patch("/api/teacher/exams", {
      headers: { cookie: teacherCookie },
      data: { examId: created.examId, action: "PUBLISH" },
    });
    expect(publishResponse.status()).toBe(200);

    const studentCatalogueResponse = await request.get("/api/student/exams?section=ca", {
      headers: { cookie: studentCookie },
    });
    expect(studentCatalogueResponse.status()).toBe(200);
    const studentCatalogue = await studentCatalogueResponse.json();
    expect(studentCatalogue.exams.some((exam: { id: string }) => exam.id === created.examId)).toBe(
      true,
    );

    const startResponse = await request.post(`/api/student/exams/${created.examId}/attempt`, {
      headers: { cookie: studentCookie },
      data: {},
    });
    expect(startResponse.status()).toBe(200);
    const sitting = await startResponse.json();
    expect(sitting.questions).toHaveLength(1);

    const submitResponse = await request.patch(`/api/student/exams/${created.examId}/attempt`, {
      headers: { cookie: studentCookie },
      data: {
        attemptId: sitting.attempt.id,
        action: "SUBMIT",
        answers: [{ questionId: sitting.questions[0].id, response: "A" }],
      },
    });
    expect(submitResponse.status()).toBe(200);

    const closeResponse = await request.patch("/api/teacher/exams", {
      headers: { cookie: teacherCookie },
      data: { examId: created.examId, action: "CLOSE" },
    });
    expect(closeResponse.status()).toBe(200);

    const releaseResponse = await request.patch("/api/teacher/exams", {
      headers: { cookie: teacherCookie },
      data: { examId: created.examId, action: "RELEASE_RESULTS" },
    });
    expect(releaseResponse.status()).toBe(200);
    expect((await releaseResponse.json()).message).toContain("synced to CA1");

    const parentResultsResponse = await request.get(
      `/api/parent/exam-results?studentId=${encodeURIComponent(studentRow.id)}`,
      { headers: { cookie: parentCookie } },
    );
    expect(parentResultsResponse.status()).toBe(200);
    const parentResults = await parentResultsResponse.json();
    expect(parentResults.results).toContainEqual(
      expect.objectContaining({
        examId: created.examId,
        title,
        teacherName: expect.any(String),
        score: 5,
        total: 5,
        percent: 100,
      }),
    );

    const sendableResponse = await request.get("/api/teacher/send-results", {
      headers: { cookie: teacherCookie },
    });
    expect(sendableResponse.status()).toBe(200);
    const sendable = await sendableResponse.json();
    const released = sendable.exams.find((exam: { id: string }) => exam.id === created.examId);
    expect(released?.students).toContainEqual(
      expect.objectContaining({ profileId: studentRow.id, score: 5, total: 5, percent: 100 }),
    );

    const sendBody = { examId: created.examId, studentProfileIds: [studentRow.id] };
    const sendResponse = await request.post("/api/teacher/send-results", {
      headers: { cookie: teacherCookie },
      data: sendBody,
    });
    expect(sendResponse.status()).toBe(200);
    expect((await sendResponse.json()).notifications).toBeGreaterThan(0);

    // Retrying a result announcement does not duplicate durable portal notices.
    const retryResponse = await request.post("/api/teacher/send-results", {
      headers: { cookie: teacherCookie },
      data: sendBody,
    });
    expect(retryResponse.status()).toBe(200);
    expect((await retryResponse.json()).notifications).toBe(0);

    // Exercise the real promotion endpoint in the disposable CI database. The
    // assessment and its release were recorded against the student's old class;
    // promotion must move their current class without erasing that history.
    const adminCookie = await apiLogin(request, "admin");
    const sessionsResponse = await request.get("/api/admin/sessions", {
      headers: { cookie: adminCookie },
    });
    expect(sessionsResponse.status()).toBe(200);
    const sessions = await sessionsResponse.json();
    const currentSession = sessions.sessions.find(
      (session: { isCurrent: boolean }) => session.isCurrent,
    );
    expect(currentSession, "seed must have a current academic session").toBeTruthy();

    const targetSessionResponse = await request.post("/api/admin/sessions", {
      headers: { cookie: adminCookie },
      data: {
        label: "2027/2028",
        startsOn: "2027-09-01T00:00:00.000Z",
        endsOn: "2028-07-31T00:00:00.000Z",
        makeCurrent: false,
        enrolStudents: false,
      },
    });
    expect(targetSessionResponse.status()).toBe(201);
    const targetSession = (await targetSessionResponse.json()).session;

    const promotionPlanResponse = await request.get(
      `/api/admin/promotion?fromSessionId=${encodeURIComponent(currentSession.id)}`,
      { headers: { cookie: adminCookie } },
    );
    expect(promotionPlanResponse.status()).toBe(200);
    const plan = await promotionPlanResponse.json();
    expect(plan.targets.some((session: { id: string }) => session.id === targetSession.id)).toBe(
      true,
    );
    const studentDecision = plan.rows.find(
      (row: { studentProfileId: string }) => row.studentProfileId === studentRow.id,
    );
    expect(studentDecision?.proposedOutcome).toBe("PROMOTED");
    expect(studentDecision?.blocker).toBeNull();

    const promotionResponse = await request.post("/api/admin/promotion", {
      headers: { cookie: adminCookie },
      data: {
        fromSessionId: currentSession.id,
        toSessionId: targetSession.id,
        decisions: plan.rows.map(
          (row: {
            studentProfileId: string;
            proposedOutcome: string;
            targetClassId: string | null;
          }) => ({
            studentProfileId: row.studentProfileId,
            outcome: row.proposedOutcome,
            targetClassId: row.targetClassId,
          }),
        ),
      },
    });
    expect(promotionResponse.status()).toBe(200);

    const promotedStudentResultsResponse = await request.get("/api/student/exams?section=ca", {
      headers: { cookie: studentCookie },
    });
    expect(promotedStudentResultsResponse.status()).toBe(200);
    const promotedStudentResults = await promotedStudentResultsResponse.json();
    expect(promotedStudentResults.exams).toContainEqual(
      expect.objectContaining({
        id: created.examId,
        isHistoricalClass: true,
        attempt: expect.objectContaining({ totalScore: 5, scoreVisible: true }),
      }),
    );

    const promotedParentResultsResponse = await request.get(
      `/api/parent/exam-results?studentId=${encodeURIComponent(studentRow.id)}`,
      { headers: { cookie: parentCookie } },
    );
    expect(promotedParentResultsResponse.status()).toBe(200);
    const promotedParentResults = await promotedParentResultsResponse.json();
    expect(promotedParentResults.results).toContainEqual(
      expect.objectContaining({ examId: created.examId, isHistoricalClass: true }),
    );
  });
});
