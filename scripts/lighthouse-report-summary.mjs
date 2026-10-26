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

/**
 * Find the LCP element inside `largest-contentful-paint-element`.
 *
 * The audit's `details` nesting has changed across Lighthouse majors (a table
 * straight inside `items`, or a table of tables), so walk the structure for the
 * first object carrying a `node` instead of hard-coding a depth. `phase` is the
 * other half of the answer: "LOADING" means a network resource held the paint
 * back, "RENDERING" means it was waiting on the main thread.
 */
function lcpElement(data) {
  const items = data.audits?.["largest-contentful-paint-element"]?.details?.items ?? [];
  const stack = [...items];
  while (stack.length) {
    const current = stack.shift();
    if (!current || typeof current !== "object") continue;
    if (current.node && typeof current.node === "object") {
      return {
        lcpElement: current.node.snippet,
        lcpElementLabel: current.node.nodeLabel,
        lcpPhase: current.phase,
      };
    }
    for (const value of Object.values(current)) {
      if (value && typeof value === "object") stack.push(value);
    }
  }
  return {};
}

/**
 * Break the LCP down into its four phases.
 *
 * A bare "LCP=4200ms" cannot be acted on: `loadDelay` means the browser did not
 * discover the resource until late (a rendering/JS problem), `loadTime` means it
 * was slow on the wire, `renderDelay` means it arrived but the main thread took
 * its time painting it. The shape of this debug blob differs between Lighthouse
 * majors, so search it for the phase keys rather than indexing into it.
 */
function lcpSubparts(data) {
  const stack = [...(data.audits?.["largest-contentful-paint"]?.details?.items ?? [])];
  while (stack.length) {
    const current = stack.shift();
    if (!current || typeof current !== "object") continue;
    if ("loadDelay" in current || "loadTime" in current || "renderDelay" in current) {
      const ms = (value) => (Number.isFinite(value) ? Math.round(value) : undefined);
      return {
        fcp: ms(current.fcp),
        loadDelay: ms(current.loadDelay),
        loadTime: ms(current.loadTime),
        renderDelay: ms(current.renderDelay),
      };
    }
    for (const value of Object.values(current)) {
      if (value && typeof value === "object") stack.push(value);
    }
  }
  return null;
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
    // Which element is the LCP, and what arrived late. Without these two the
    // annotation says "8s" and nobody can tell whether that is an image, a
    // webfont or a JS chunk — which is how this gate stayed red for several
    // runs without anyone being able to act on it.
    ...lcpElement(data),
    subparts: lcpSubparts(data),
    // Raw fallbacks. Every "which element / which phase" question here has been
    // answered by guessing twice already; when the structured extraction finds
    // nothing, print the blob and let the numbers speak.
    metrics: data.audits?.metrics?.details?.items?.[0] ?? null,
    lcpElementRaw: JSON.stringify(
      data.audits?.["largest-contentful-paint-element"]?.details ?? null,
    ).slice(0, 700),
    lcpAuditIds: Object.keys(data.audits ?? {})
      .filter((id) => /lcp|largest|font|render-blocking|server-response/.test(id))
      .sort(),
    slowRequests: (data.audits?.["network-requests"]?.details?.items ?? [])
      .filter((item) => typeof item.transferSize === "number")
      .sort((a, b) => (b.transferSize ?? 0) - (a.transferSize ?? 0))
      .slice(0, 5)
      .map(
        (item) =>
          `${item.resourceType ?? "other"} ${Math.round((item.transferSize ?? 0) / 1024)}KB ${item.url}`,
      ),
    // Ordered by when the resource *finished*, not by size: a small file that
    // lands at 4.1s can still be what held the paint back.
    lateRequests: (data.audits?.["network-requests"]?.details?.items ?? [])
      .filter((item) => Number.isFinite(item.networkEndTime))
      .sort((a, b) => b.networkEndTime - a.networkEndTime)
      .slice(0, 5)
      .map(
        (item) =>
          `${item.resourceType ?? "other"} ${Math.round((item.transferSize ?? 0) / 1024)}KB ${Math.round(item.networkRequestTime ?? -1)}-${Math.round(item.networkEndTime)}ms ${item.url.replace(/^https?:\/\/[^/]+/, "")}`,
      ),
  });
}

for (const report of reports) {
  const msg = `${report.url} perf=${report.perf} a11y=${report.a11y} LCP=${Math.round(
    report.lcp ?? -1,
  )}ms FCP=${Math.round(report.fcp ?? -1)}ms TBT=${Math.round(report.tbt ?? -1)}ms CLS=${(
    report.cls ?? -1
  ).toFixed(3)}`;
  // Phases go on the same line as the metrics: together they say whether to
  // chase the network, the discovery path or the main thread.
  const phases = report.subparts
    ? ` | lcp fcp=${report.subparts.fcp} loadDelay=${report.subparts.loadDelay} load=${report.subparts.loadTime} renderDelay=${report.subparts.renderDelay}`
    : "";
  console.log(`::notice title=Lighthouse CI::${msg}${phases}`);
  if (report.lcpElement) {
    // Collapse whitespace/newlines: GitHub workflow commands are line-based, so
    // a multi-line node snippet truncated the annotation to its first line.
    const snippet = String(report.lcpElement).replace(/\s+/g, " ").slice(0, 300);
    const label = String(report.lcpElementLabel ?? "").replace(/\s+/g, " ");
    console.log(
      `::notice title=Lighthouse LCP element::${report.route} phase=${report.lcpPhase ?? "?"} ${label} ${snippet}`,
    );
  } else {
    // The LCP-element audit is missing from this report, so name the LCP-related
    // audits that ARE present. That is enough to tell whether the paint waited
    // on a font, a render-blocking resource or the image itself, without
    // downloading the artefact.
    console.log(
      `::notice title=Lighthouse LCP element::${report.route} unparsed; raw details: ${report.lcpElementRaw}; present: ${report.lcpAuditIds?.join(", ") || "none"}`,
    );
  }
  if (report.metrics) {
    const observed = report.metrics.observedLargestContentfulPaint;
    const simulated = report.metrics.largestContentfulPaint;
    // Lighthouse simulates throttling on the recorded trace, so `observedLCP` is
    // what happened on the runner and `largestContentfulPaint` is the modelled
    // number the budget uses. If observed is fast but simulated is not, the fix
    // is fewer bytes on the critical path, not a faster server.
    console.log(
      `::notice title=Lighthouse observed vs simulated::${report.route} observedLCP=${Math.round(
        observed ?? -1,
      )}ms simulatedLCP=${Math.round(simulated ?? -1)}ms bytes=${report.metrics.totalByteWeight ?? "?"} observedFCP=${Math.round(
        report.metrics.observedFirstContentfulPaint ?? -1,
      )}ms`,
    );
  }
  if (report.lateRequests?.length) {
    console.log(
      `::notice title=Lighthouse last responses::${report.route} ${report.lateRequests.join(" | ")}`,
    );
  }
  if (report.slowRequests?.length) {
    console.log(
      `::notice title=Lighthouse heaviest responses::${report.route} ${report.slowRequests.join(" | ")}`,
    );
  }
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
