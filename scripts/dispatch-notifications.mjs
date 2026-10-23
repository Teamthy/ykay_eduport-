#!/usr/bin/env node
/**
 * Render Cron worker for the long-running EduPortal web service.
 *
 * This deliberately calls the authenticated HTTP endpoint instead of
 * importing Prisma/notification code into a second process: the web service
 * remains the single owner of job claiming, retries and database state.
 * The endpoint is idempotent/lease-backed, so a cron retry does not duplicate
 * deliveries. Configure EDUPORTAL_BASE_URL and the same high-entropy
 * JOBS_SECRET on the web and cron services in Render.
 */

const base = process.env.EDUPORTAL_BASE_URL?.trim();
const secret = process.env.JOBS_SECRET;

if (!base) {
  console.error("EDUPORTAL_BASE_URL is required for the notification dispatcher.");
  process.exit(1);
}
if (!secret || secret.length < 16) {
  console.error("JOBS_SECRET (at least 16 characters) is required for the notification dispatcher.");
  process.exit(1);
}

let origin;
try {
  const parsed = new URL(base);
  if (parsed.protocol !== "https:") throw new Error("HTTPS is required.");
  origin = parsed.origin;
} catch (error) {
  console.error(
    `EDUPORTAL_BASE_URL must be a valid HTTPS origin: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const endpoint = new URL("/api/jobs/dispatch-notifications", origin);
try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "cache-control": "no-store" },
    signal: AbortSignal.timeout(55_000),
  });
  if (!response.ok) {
    // Do not dump the response body: a future route error may include PII or
    // provider details. Status + server-side logs are enough to alert on.
    console.error(`Notification dispatch failed with HTTP ${response.status}.`);
    process.exit(1);
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const summary = Object.fromEntries(
    ["bridgedAttendanceAlerts", "processed", "sent", "failed", "retried", "skipped"]
      .filter((key) => typeof body[key] === "number")
      .map((key) => [key, body[key]]),
  );
  console.log(`Notification dispatch succeeded: ${JSON.stringify(summary)}`);
} catch (error) {
  console.error(
    `Notification dispatch request failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
