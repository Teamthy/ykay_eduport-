/**
 * Sentry configuration for client-side error tracking.
 *
 * Install: npm install @sentry/nextjs
 * Then run: npx @sentry/wizard@latest -i nextjs
 *
 * This file provides the base config. The wizard will create
 * the full integration files automatically.
 *
 * For now, this is a no-op config that can be activated by
 * setting NEXT_PUBLIC_SENTRY_DSN in your environment.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  // Dynamic import to avoid bundling Sentry when not configured
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        denyUrls: [/webpack/i, /chunk/i],
        ignoreErrors: [
          "ResizeObserver loop limit exceeded",
          "Non-Error promise rejection captured",
          "Loading chunk",
          "NetworkError",
          "Failed to fetch",
        ],
      });
    })
    .catch(() => {
      // Sentry not installed — silently skip
    });
}

export {};
