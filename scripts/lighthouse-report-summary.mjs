#!/usr/bin/env node
/**
 * Emits Lighthouse CI results as GitHub annotations and enforces the public
 * page budgets against each route's median. LHCI's aggregate assertion can
 * otherwise let a strong route mask a failing route.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = ".lighthouseci";
const EXPECTED_ROUTES = ["/", "/admissions", "/virtual"];
const RUNS_REQUIRED = 3;
const MIN_PERFORMANCE = 0.7;
const MAX_LCP_MS = 4000;

if (!existsSync(DIR)) {
  console.log(
    "::error title=Lighthouse CI::.lighthouseci/ does not exist — autorun died before collecting. Check the step log for a Chrome/server crash.",
  );
  process.exit(1);
}

const files = readdirSync(DIR).filter((file) => /^lhr-.*\.json$/.test(file));
if (files.length === 0) {
  console.log("::error title=Lighthouse CI::No Lighthouse reports were collected.");
  process.exit(1);
}

const reports = [];
for (const file of files) {
  const data = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  reports.push({
    url: data.finalUrl,
    route: new URL(data.finalUrl).pathname.replace(/\/$/, "") || "/",
    perf: data.categories?.performance?.score,
    a11y: data.categories?.accessibility?.score,
    lcp: data.audits?.["largest-contentful-paint"]?.numericValue,
    fcp: data.audits?.["first-contentful-paint"]?.numericValue,
    tbt: data.audits?.["total-blocking-time"]?.numericValue,
    cls: data.audits?.["cumulative-layout-shift"]?.numericValue,
  });
}

for (const report of reports) {
  const msg = `${report.url} perf=${report.perf} a11y=${report.a11y} LCP=${Math.round(
    report.lcp ?? -1,
  )}ms FCP=${Math.round(report.fcp ?? -1)}ms TBT=${Math.round(report.tbt ?? -1)}ms CLS=${(
    report.cls ?? -1
  ).toFixed(3)}`;
  console.log(`::notice title=Lighthouse CI::${msg}`);
}

const byRoute = new Map();
for (const report of reports) {
  const routeReports = byRoute.get(report.route) ?? [];
  routeReports.push(report);
  byRoute.set(report.route, routeReports);
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

let failed = false;
for (const route of EXPECTED_ROUTES) {
  const routeReports = byRoute.get(route) ?? [];
  const performance = routeReports.map((report) => report.perf).filter(Number.isFinite);
  const lcp = routeReports.map((report) => report.lcp).filter(Number.isFinite);

  if (
    routeReports.length < RUNS_REQUIRED ||
    performance.length < RUNS_REQUIRED ||
    lcp.length < RUNS_REQUIRED
  ) {
    console.log(
      `::error title=Lighthouse route budget::${route} has ${routeReports.length} report(s); expected ${RUNS_REQUIRED} valid performance/LCP samples.`,
    );
    failed = true;
    continue;
  }

  const medianPerformance = median(performance);
  const medianLcp = median(lcp);
  console.log(
    `::notice title=Lighthouse route median::${route} median performance=${medianPerformance.toFixed(2)} LCP=${Math.round(medianLcp)}ms (${routeReports.length} runs)`,
  );

  if (medianPerformance < MIN_PERFORMANCE) {
    console.log(
      `::error title=Lighthouse route budget::${route} median performance ${medianPerformance.toFixed(2)} is below ${MIN_PERFORMANCE.toFixed(2)}.`,
    );
    failed = true;
  }
  if (medianLcp > MAX_LCP_MS) {
    console.log(
      `::error title=Lighthouse route budget::${route} median LCP ${Math.round(medianLcp)}ms exceeds ${MAX_LCP_MS}ms.`,
    );
    failed = true;
  }
}

if (existsSync(join(DIR, "assertion-results.json"))) {
  const results = JSON.parse(readFileSync(join(DIR, "assertion-results.json"), "utf8"));
  for (const result of results) {
    const msg = `${result.level} ${result.auditId} on ${result.url}: expected ${result.operator} ${result.expected}, found ${result.actual}, values=${JSON.stringify(
      result.values,
    )}`;
    console.log(
      result.level === "error"
        ? `::error title=Lighthouse CI::${msg}`
        : `::warning title=Lighthouse CI::${msg}`,
    );
    if (result.level === "error") failed = true;
  }
  if (results.length === 0)
    console.log("::notice title=Lighthouse CI::all aggregate assertions passed");
}

if (failed) process.exitCode = 1;
