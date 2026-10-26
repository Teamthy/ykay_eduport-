import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import CbtSubjectPage from "@/app/cbt/[slug]/page";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("question-practice route map", () => {
  it("keeps legacy /cbt/:slug links routed to personal practice, not teacher-authored exams", () => {
    CbtSubjectPage();
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/student/personal-practice");
  });

  it("exposes the CBT review console and student practice separately in the Super Admin portal hub", () => {
    const source = read("app/super-admin/portals/page.tsx");
    expect(source).toContain('href: "/admin/cbt-bank", label: "CBT question bank review"');
    expect(source).toContain(
      'href: "/student/personal-practice", label: "Personal question practice"',
    );
    expect(source).toContain('href: "/admin/questions", label: "Exam question records"');
  });

  it("provides dedicated question-bank and system-operations routes from the Super Admin sidebar", () => {
    const source = read("components/SuperAdminSidebar.tsx");
    expect(source).toContain('href: "/super-admin/question-bank"');
    expect(source).toContain('href: "/super-admin/operations"');
    expect(read("app/api/super-admin/question-bank/route.ts")).toContain(
      "REVIEWED_QUESTION_FILTER",
    );
  });
});
