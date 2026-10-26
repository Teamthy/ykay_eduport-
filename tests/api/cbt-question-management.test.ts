import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { mockPrisma } from "../setup";
import { PATCH, DELETE } from "@/app/api/admin/cbt/questions/[id]/route";
import { GET, POST } from "@/app/api/admin/cbt/questions/route";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";

vi.mock("@prisma/client", () => ({
  UserRole: { ADMIN: "ADMIN", SUPER_ADMIN: "SUPER_ADMIN" },
}));

vi.mock("@/lib/session", () => ({
  assertNotImpersonating: vi.fn(),
  requireRoleOr503: vi.fn(),
}));

const validDraft = {
  subjectSlug: "mathematics-jss1",
  subjectName: "Mathematics",
  classLevel: "jss1",
  department: "general",
  topic: "Addition",
  difficulty: 2,
  stem: "What is 2 + 2?",
  options: ["3", "4", "5", "6"],
  correctIndex: 1,
  explanation: "Add two and two to obtain four; option B is the only correct answer.",
  source: "original-draft",
};

function request(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const context = { params: Promise.resolve({ id: "question_a" }) };

describe("admin CBT question management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRoleOr503).mockResolvedValue({ id: "admin_a" } as never);
    vi.mocked(assertNotImpersonating).mockReturnValue(null);
    mockPrisma.cbtSubject.upsert.mockResolvedValue({
      id: "subject_a",
      classLevel: "jss1",
    } as never);
    mockPrisma.cbtQuestion.create.mockResolvedValue({ id: "question_a", status: "draft" } as never);
    mockPrisma.cbtQuestion.findUnique.mockResolvedValue({
      id: "question_a",
      status: "draft",
    } as never);
    mockPrisma.cbtQuestion.update.mockResolvedValue({ id: "question_a", status: "draft" } as never);
    mockPrisma.cbtQuestion.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.cbtQuestion.count
      .mockResolvedValueOnce(10000)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(0);
  });

  it("creates a question as draft, never as reviewed", async () => {
    const response = await POST(
      request("http://localhost/api/admin/cbt/questions", "POST", validDraft),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.question.status).toBe("draft");
    expect(mockPrisma.cbtQuestion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "draft",
          reviewedByUserId: null,
          reviewReference: null,
        }),
      }),
    );
  });

  it("rejects an existing stem for the same subject", async () => {
    mockPrisma.cbtQuestion.findFirst.mockResolvedValue({ id: "question_existing" } as never);
    const response = await POST(
      request("http://localhost/api/admin/cbt/questions", "POST", validDraft),
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.cbtQuestion.create).not.toHaveBeenCalled();
  });

  it("requires a verified term when a manual week is supplied", async () => {
    const response = await POST(
      request("http://localhost/api/admin/cbt/questions", "POST", {
        ...validDraft,
        week: 2,
      }),
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.cbtQuestion.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate answer options on manual creation", async () => {
    const response = await POST(
      request("http://localhost/api/admin/cbt/questions", "POST", {
        ...validDraft,
        options: ["same", "same", "third", "fourth"],
      }),
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.cbtQuestion.create).not.toHaveBeenCalled();
  });

  it("saves edits only while a question is still a draft", async () => {
    const response = await PATCH(
      request("http://localhost/api/admin/cbt/questions/question_a", "PATCH", {
        topic: "Addition",
        difficulty: 1,
        stem: "What is 3 + 2?",
        options: ["4", "5", "6", "7"],
        correctIndex: 1,
        explanation: "Adding three and two gives five; option B is the correct sum.",
        source: "original-draft",
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.cbtQuestion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "question_a", status: "draft" },
        data: expect.objectContaining({ stem: "What is 3 + 2?" }),
      }),
    );
  });

  it("rejects an edit if the draft state changes before the atomic update", async () => {
    mockPrisma.cbtQuestion.updateMany.mockResolvedValue({ count: 0 } as never);
    const response = await PATCH(
      request("http://localhost/api/admin/cbt/questions/question_a", "PATCH", {
        topic: "Addition",
        difficulty: 1,
        stem: "What is 3 + 2?",
        options: ["4", "5", "6", "7"],
        correctIndex: 1,
        explanation: "Adding three and two gives five; option B is the correct sum.",
        source: "original-draft",
      }),
      context,
    );

    expect(response.status).toBe(409);
  });

  it("requires reviewed questions to be returned to draft before editing", async () => {
    mockPrisma.cbtQuestion.findUnique.mockResolvedValue({
      id: "question_a",
      status: "reviewed",
    } as never);
    const response = await PATCH(
      request("http://localhost/api/admin/cbt/questions/question_a", "PATCH", {
        topic: "Addition",
        difficulty: 1,
        stem: "What is 3 + 2?",
        options: ["4", "5", "6", "7"],
        correctIndex: 1,
        explanation: "Adding three and two gives five; option B is the correct sum.",
        source: "original-draft",
      }),
      context,
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.cbtQuestion.updateMany).not.toHaveBeenCalled();
  });

  it("archives rather than hard-deletes questions with practice history", async () => {
    const response = await DELETE(
      request("http://localhost/api/admin/cbt/questions/question_a", "DELETE"),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "question_a", status: "archived" });
    expect(mockPrisma.cbtQuestion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "archived" } }),
    );
  });

  it("restores archived questions as draft and clears old review attestation", async () => {
    const response = await PATCH(
      request("http://localhost/api/admin/cbt/questions/question_a", "PATCH", {
        action: "RESTORE",
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.cbtQuestion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "question_a", status: "archived" },
        data: expect.objectContaining({ status: "draft", reviewReference: null }),
      }),
    );
  });

  it("filters the review list by archive status, class and search text", async () => {
    mockPrisma.cbtQuestion.findMany.mockResolvedValue([] as never);
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/cbt/questions?status=archived&classLevel=ss2&q=algebra",
      ),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).totals).toEqual({ draft: 10000, reviewed: 12, archived: 0 });
    expect(mockPrisma.cbtQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "archived",
          subject: { is: { classLevel: "ss2" } },
          OR: expect.arrayContaining([{ stem: { contains: "algebra", mode: "insensitive" } }]),
        }),
      }),
    );
  });

  it("blocks list requests from unauthenticated users", async () => {
    const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    vi.mocked(requireRoleOr503).mockResolvedValue(unauthorized as never);
    const response = await GET(
      new NextRequest("http://localhost/api/admin/cbt/questions?status=archived"),
    );
    expect(response).toBe(unauthorized);
  });
});
