import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * The Lighthouse summary is the only part of that CI job that explains a failed
 * budget. It is plain Node with no imports of its own, so it is exercised here
 * by running it in a temporary directory laid out like the job's workspace —
 * which is how a scoping bug in it (reading a report through an out-of-scope
 * variable) was caught only after burning a full CI cycle.
 */
const SCRIPT = join(process.cwd(), "scripts/lighthouse-report-summary.mjs");
const ROUTES = ["/", "/admissions", "/virtual"];

let workspace: string | null = null;

afterEach(() => {
  if (workspace) rmSync(workspace, { recursive: true, force: true });
  workspace = null;
});

type Audit = Record<string, unknown>;

function lhr(route: string, audits: Audit, performance = 0.86) {
  return {
    finalUrl: `http://localhost:3000${route}`,
    categories: { performance: { score: performance }, accessibility: { score: 0.96 } },
    audits,
  };
}

function baseAudits(lcp: number): Audit {
  return {
    "largest-contentful-paint": { numericValue: lcp },
    "first-contentful-paint": { numericValue: 1215 },
    "total-blocking-time": { numericValue: 52 },
    "cumulative-layout-shift": { numericValue: 0.001 },
    "network-requests": {
      details: { items: [{ url: "http://x/a.js", resourceType: "Script", transferSize: 73728 }] },
    },
  };
}

function run(reports: unknown[]): { status: number; output: string } {
  workspace = mkdtempSync(join(tmpdir(), "lh-summary-"));
  mkdirSync(join(workspace, ".lighthouseci"));
  reports.forEach((report, index) =>
    writeFileSync(
      join(workspace as string, ".lighthouseci", `lhr-${index}.json`),
      JSON.stringify(report),
    ),
  );
  try {
    const output = execFileSync(process.execPath, [SCRIPT], {
      cwd: workspace,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? 1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

function runWithAssertions(reports: unknown[], assertions: unknown[]) {
  workspace = mkdtempSync(join(tmpdir(), "lh-summary-"));
  mkdirSync(join(workspace, ".lighthouseci"));
  reports.forEach((report, index) =>
    writeFileSync(
      join(workspace as string, ".lighthouseci", `lhr-${index}.json`),
      JSON.stringify(report),
    ),
  );
  writeFileSync(
    join(workspace, ".lighthouseci", "assertion-results.json"),
    JSON.stringify(assertions),
  );
  try {
    return {
      status: 0,
      output: execFileSync(process.execPath, [SCRIPT], {
        cwd: workspace,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? 1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

describe("lighthouse-report-summary", () => {
  it("fails a route whose median LCP is over budget, and passes one under it", () => {
    const reports = [
      ...ROUTES.flatMap((route) =>
        [0, 1, 2].map(() => lhr(route, baseAudits(route === "/" ? 4500 : 2000))),
      ),
    ];
    const { status, output } = run(reports);

    expect(status).toBe(1);
    expect(output).toContain("/ median LCP 4500ms exceeds 4000ms");
    expect(output).toContain("/admissions median performance=0.86 LCP=2000ms (3 runs)");
    expect(output).not.toContain("/admissions median LCP 2000ms exceeds");
  });

  it("names the LCP element when the report carries it", () => {
    const audits = {
      ...baseAudits(2000),
      "largest-contentful-paint-element": {
        details: {
          items: [
            {
              type: "table",
              items: [
                {
                  phase: "LOADING",
                  node: { snippet: '<img src="/hero.webp">', nodeLabel: "Hero" },
                },
              ],
            },
          ],
        },
      },
    };
    const { output } = run(ROUTES.flatMap((route) => [0, 1, 2].map(() => lhr(route, audits))));
    expect(output).toContain("phase=LOADING Hero");
  });

  it("reads the element from the flatter shape too, and flattens newlines", () => {
    const audits = {
      ...baseAudits(2000),
      "largest-contentful-paint-element": {
        details: { items: [{ node: { snippet: "<h1\n  class='x'>\n Hi", nodeLabel: "Title" } }] },
      },
    };
    const { output } = run(ROUTES.flatMap((route) => [0, 1, 2].map(() => lhr(route, audits))));
    expect(output).toContain("Title <h1 class='x'> Hi");
  });

  it("still reports every route when the LCP element audit is absent", () => {
    const audits = { ...baseAudits(2000), "render-blocking-resources": { details: { items: [] } } };
    const { status, output } = run(
      ROUTES.flatMap((route) => [0, 1, 2].map(() => lhr(route, audits))),
    );

    expect(status).toBe(0);
    expect(output.match(/not reported|no LCP element block/g)).toHaveLength(9);
    expect(output).toContain(
      "LCP-related audits: largest-contentful-paint, render-blocking-resources",
    );
  });

  it("refuses to pass when a route has fewer than three runs", () => {
    const { status, output } = run([
      lhr("/", baseAudits(2000)),
      lhr("/admissions", baseAudits(2000)),
    ]);
    expect(status).toBe(1);
    expect(output).toContain("expected 3 valid performance/LCP samples");
  });

  it("surfaces aggregate assertion failures as error annotations", () => {
    const reports = ROUTES.flatMap((route) => [0, 1, 2].map(() => lhr(route, baseAudits(2000))));
    const { status, output } = runWithAssertions(reports, [
      {
        level: "error",
        auditId: "largest-contentful-paint",
        url: "http://localhost:3000/",
        operator: "<=",
        expected: 4000,
        actual: 4210.85,
        values: [4210.85],
      },
    ]);
    expect(status).toBe(1);
    expect(output).toContain(
      "::error title=Lighthouse CI::error largest-contentful-paint on http://localhost:3000/",
    );
  });

  it("prints the LCP phase breakdown and the last-finishing responses", () => {
    const audits = {
      ...baseAudits(4200),
      "largest-contentful-paint": {
        numericValue: 4200,
        details: {
          type: "debugdata",
          items: [{ subparts: { fcp: 1200, loadDelay: 2100, loadTime: 300, renderDelay: 600 } }],
        },
      },
      "network-requests": {
        details: {
          items: [
            {
              url: "http://localhost:3000/_next/static/chunks/first.js",
              resourceType: "Script",
              transferSize: 100000,
              networkRequestTime: 100,
              networkEndTime: 400,
            },
            {
              url: "http://localhost:3000/home/hero-campus-750.webp",
              resourceType: "Image",
              transferSize: 49152,
              networkRequestTime: 3200,
              networkEndTime: 3990,
            },
          ],
        },
      },
    };
    const { output } = run(ROUTES.flatMap((route) => [0, 1, 2].map(() => lhr(route, audits))));

    expect(output).toContain("lcp fcp=1200 loadDelay=2100 load=300 renderDelay=600");
    // Ordered by end time, not size: the 48KB image landed last and is the
    // answer, even though the 100KB chunk is the heavier response.
    expect(output).toContain("last responses::/ Image 48KB 3200-3990ms /home/hero-campus-750.webp");
    expect(output.indexOf("last responses")).toBeLessThan(output.indexOf("heaviest responses"));
  });

  it("omits the phase breakdown when the audit has no subparts", () => {
    const { output } = run(
      ROUTES.flatMap((route) => [0, 1, 2].map(() => lhr(route, baseAudits(2000)))),
    );
    expect(output).not.toContain("lcp fcp=");
  });
});
