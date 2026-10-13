import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compare, countFeatures, parseSummaryTable } from "../../scripts/check-feature-catalogue";

const DOC = join(process.cwd(), "docs", "famex", "08-feature-catalogue.md");

describe("feature catalogue", () => {
  const markdown = readFileSync(DOC, "utf8");
  const actual = countFeatures(markdown);
  const summary = parseSummaryTable(markdown);

  it("lists every module as a numbered section", () => {
    expect(actual.length).toBeGreaterThanOrEqual(20);
    expect(actual.map((m) => m.label)).toContain(
      "Foundations — the platform underneath everything",
    );
  });

  it("gives every feature a unique, well-formed ID", () => {
    const ids = [...markdown.matchAll(/^\| (F\d+-\d+) \|/gm)].map((m) => m[1]);
    expect(ids.length).toBe(actual.reduce((sum, m) => sum + m.total, 0));
    expect(new Set(ids).size).toBe(ids.length);

    // Module numbers are contiguous, and each module's feature numbers start at 01.
    const modules = [...new Set(ids.map((id) => Number(id.split("-")[0].slice(1))))].sort(
      (a, b) => a - b,
    );
    expect(modules).toEqual(modules.map((_, index) => index));
    for (const module of modules) {
      const features = ids
        .filter((id) => Number(id.split("-")[0].slice(1)) === module)
        .map((id) => Number(id.split("-")[1]));
      expect(features[0]).toBe(1);
    }
  });

  it("gets the tag mix right for the headline groups", () => {
    const byLabel = Object.fromEntries(actual.map((m) => [m.label, m]));
    // The AI layer is the new-build centrepiece: no reuse in F2/F3.
    expect(byLabel["AI Learning Hub"].byTag["🆕"]).toBe(byLabel["AI Learning Hub"].total);
    expect(byLabel["AI Studio"].byTag["🆕"]).toBe(byLabel["AI Studio"].total);
    // EDUos strip items live in the foundations and the licence page.
    expect(byLabel["Licence & Usage"].byTag["✂️"]).toBe(2);
    // v2 deferrals are concentrated in cross-cutting work.
    expect(byLabel["Cross-cutting technical capabilities"].byTag["⏸"]).toBeGreaterThanOrEqual(10);
    // Money, results, attendance and users are the extension-heavy modules.
    for (const label of ["Fees & Billing", "Result Generation", "Attendance", "Users"]) {
      expect(byLabel[label].byTag["🔧"]).toBeGreaterThan(0);
    }
  });

  it("has a summary table that matches the rows", () => {
    expect(compare(actual, summary)).toEqual([]);
  });

  it("reports drift instead of hiding it", () => {
    const broken = markdown.replace("| **TOTAL** | **331** |", "| **TOTAL** | **330** |");
    expect(compare(countFeatures(broken), parseSummaryTable(broken)).length).toBeGreaterThan(0);

    const missingRow = markdown.replace(/^\| F5-01 \|.*$/m, "");
    expect(
      compare(countFeatures(missingRow), parseSummaryTable(missingRow)).length,
    ).toBeGreaterThan(0);
  });

  it("keeps the totals in the range the plan assumes", () => {
    const totals = actual.reduce(
      (acc, m) => ({
        total: acc.total + m.total,
        ok: acc.ok + m.byTag["✅"],
        ext: acc.ext + m.byTag["🔧"],
        next: acc.next + m.byTag["🆕"],
        strip: acc.strip + m.byTag["✂️"],
        defer: acc.defer + m.byTag["⏸"],
      }),
      { total: 0, ok: 0, ext: 0, next: 0, strip: 0, defer: 0 },
    );
    expect(totals.total).toBe(totals.ok + totals.ext + totals.next + totals.strip + totals.defer);
    // The catalogue promised in the design pack was ~330 features across 25 sections.
    expect(totals.total).toBeGreaterThan(300);
    expect(totals.next).toBeGreaterThan(totals.ok);
  });
});
