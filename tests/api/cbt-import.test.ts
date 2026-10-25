import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/admin/cbt/import/route";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";
import { mockPrisma } from "../setup";

vi.mock("@prisma/client", () => ({
  UserRole: { ADMIN: "ADMIN", SUPER_ADMIN: "SUPER_ADMIN" },
}));

vi.mock("@/lib/session", () => ({
  assertNotImpersonating: vi.fn(),
  requireRoleOr503: vi.fn(),
}));

const validCsv = [
  "subjectSlug,subjectName,classLevel,topic,stem,optionA,optionB,optionC,optionD,correctIndex,explanation",
  "jss1-mathematics,Mathematics,jss1,Algebra,What is 2 + 2?,3,4,5,6,1,Adding two and two gives four; option B is the correct answer.",
].join("\n");

function request(csv: string) {
  return new NextRequest("http://localhost/api/admin/cbt/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csv }),
  });
}

describe("CBT import authorization and draft-only behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRoleOr503).mockResolvedValue({ id: "admin_a" } as never);
    vi.mocked(assertNotImpersonating).mockReturnValue(null);
    mockPrisma.cbtSubject.upsert.mockResolvedValue({
      id: "subject_a",
      classLevel: "jss1",
    } as never);
    mockPrisma.cbtQuestion.findMany.mockResolvedValue([] as never);
    mockPrisma.cbtQuestion.createMany.mockResolvedValue({ count: 1 } as never);
  });

  it("accepts an authenticated admin and always imports the question as draft", async () => {
    const response = await POST(request(validCsv));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ imported: 1, skipped: 0, errors: [] });
    expect(requireRoleOr503).toHaveBeenCalledWith(["ADMIN", "SUPER_ADMIN"]);
    expect(mockPrisma.cbtQuestion.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            status: "draft",
            reviewedByUserId: null,
            reviewedAt: null,
            reviewReference: null,
            reviewNotes: null,
          }),
        ],
      }),
    );
  });

  it("accepts chunked row arrays from the 10k admin import console", async () => {
    const row = {
      subjectSlug: "jss1-mathematics",
      subjectName: "Mathematics",
      classLevel: "jss1",
      topic: "Algebra",
      stem: "What is 2 + 2?",
      optionA: "3",
      optionB: "4",
      optionC: "5",
      optionD: "6",
      correctIndex: "1",
      explanation: "Adding two and two gives four; option B is the correct answer.",
    };
    const batchRequest = new NextRequest("http://localhost/api/admin/cbt/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: [row] }),
    });

    const response = await POST(batchRequest);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ imported: 1, skipped: 0 });
    expect(mockPrisma.cbtQuestion.createMany).toHaveBeenCalledTimes(1);
  });

  it("limits each import request to 250 rows", async () => {
    const oversizedRequest = new NextRequest("http://localhost/api/admin/cbt/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: Array.from({ length: 251 }, () => ({})) }),
    });

    const response = await POST(oversizedRequest);

    expect(response.status).toBe(413);
    expect(mockPrisma.cbtSubject.upsert).not.toHaveBeenCalled();
  });

  it("does not import rows with duplicate options", async () => {
    const duplicateOptionsCsv = validCsv.replace(",3,4,5,6,1,", ",4,4,5,6,1,");

    const response = await POST(request(duplicateOptionsCsv));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.imported).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(mockPrisma.cbtQuestion.createMany).not.toHaveBeenCalled();
  });

  it("returns authorization errors instead of treating a user as a response", async () => {
    const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    vi.mocked(requireRoleOr503).mockResolvedValue(unauthorized as never);

    const response = await POST(request(validCsv));

    expect(response).toBe(unauthorized);
    expect(mockPrisma.cbtSubject.upsert).not.toHaveBeenCalled();
  });

  it("blocks imports performed while impersonating", async () => {
    const blocked = NextResponse.json({ error: "Read-only impersonation." }, { status: 403 });
    vi.mocked(assertNotImpersonating).mockReturnValue(blocked as never);

    const response = await POST(request(validCsv));

    expect(response).toBe(blocked);
    expect(mockPrisma.cbtSubject.upsert).not.toHaveBeenCalled();
  });
});
