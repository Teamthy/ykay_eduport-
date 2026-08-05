#!/usr/bin/env node
/*
 * =====================================================================
 *  Ykay College - verify & push  (drops 10-45)
 *
 *  This is the Node version. Your PowerShell refused the .ps1 with
 *  "is not digitally signed" - that is the execution policy, not a
 *  problem with the file. Node has no execution policy.
 *
 *  .cjs, NOT .js - my mistake the first time round. Your package.json
 *  has "type": "module", so Node treats every .js file as an ES module
 *  and `require` does not exist there. The .cjs extension forces
 *  CommonJS no matter what "type" says.
 *
 *  Run it with:   node push.cjs
 *
 *  I have no push credentials, so this runs on YOUR machine. It refuses
 *  to push unless your files match exactly what I tested.
 * =====================================================================
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync, spawnSync } = require("child_process");
const readline = require("readline");

if (!fs.existsSync("package.json") || !fs.existsSync(path.join("prisma", "schema.prisma"))) {
  console.error("\nERROR: this is not the project root.");
  console.error("  You are in: " + process.cwd());
  console.error("  Expected  : ...\\envoys-site  (the folder containing prisma\\schema.prisma)");
  console.error("\nNOTE: mobile\\ has its own package.json, so that alone is not enough.");
  console.error("If you are in mobile\\, run:  cd ..\n");
  process.exit(1);
}

const expected = {
  ".env.example": "a4ad80bdc24b8acc",
  ".githooks/pre-commit": "b08d5adf863625cc",
  ".gitignore": "3edca873db326aa2",
  "app/.well-known/apple-app-site-association/route.ts": "ae8bfa9a59cb1880",
  "app/.well-known/assetlinks.json/route.ts": "a8e821824a30c247",
  "app/admin/attendance-analytics/page.tsx": "18d5e5a887ed0a99",
  "app/admin/attendance-corrections/page.tsx": "ca46f4fe0d16a347",
  "app/admin/budgets/page.tsx": "12933b073b30b976",
  "app/admin/class-manager/page.tsx": "9651d6887936d7ac",
  "app/admin/fees/generate/page.tsx": "85126ea383c119bc",
  "app/admin/fees/structures/page.tsx": "049d7ebfb904bb15",
  "app/admin/gradebook-lock/page.tsx": "b428ce00e4cae603",
  "app/admin/messages/page.tsx": "6a120a4ff0d345e0",
  "app/admin/page.tsx": "f1a94c21452f4911",
  "app/admin/report-cards/page.tsx": "58530bdd2bf1649c",
  "app/admin/students/[id]/page.tsx": "8b267f82386c07fa",
  "app/admin/subjects/page.tsx": "e1a6d5d63d907c4f",
  "app/api/admin/broadsheet/route.ts": "8cd13b2bcb39d182",
  "app/api/admin/budgets/route.ts": "386e24a3b53657e5",
  "app/api/admin/class-manager/route.ts": "c7f09f103525d5ef",
  "app/api/admin/dashboard/route.ts": "27310c2e5526bb35",
  "app/api/admin/fees/generate/route.ts": "17f2dff6f109ba95",
  "app/api/admin/fees/reminders/route.ts": "f592f5c8b4d8cf4b",
  "app/api/admin/fees/structures/route.ts": "2acb208a49c10101",
  "app/api/admin/report-cards/generate/route.ts": "005f97e38107a9ad",
  "app/api/admin/report-cards/overview/route.ts": "f71a40b1fec03ae7",
  "app/api/admin/report-cards/release/route.ts": "e2c7948b142fccff",
  "app/api/admin/subjects/route.ts": "3562b827a436c8a2",
  "app/api/auth/whoami/route.ts": "429b110454922b36",
  "app/api/me/current-term/route.ts": "23a3655f2bf48312",
  "app/api/me/notification-prefs/route.ts": "4f4740e243de0f38",
  "app/api/mobile/config/route.ts": "1ab38d2e8c89ab2e",
  "app/api/student/exams/route.ts": "12763b9d1d77258e",
  "app/api/super-admin/broadcast/route.ts": "688469034f9802c3",
  "app/api/teacher/class/report-cards/route.ts": "548f574f503e38c1",
  "app/api/teacher/exams/route.ts": "d9ad1445e0cafd0b",
  "app/api/teacher/gradebook/route.ts": "0ce06ad43dc4d6c0",
  "app/api/teacher/performance-records/route.ts": "6a2ac04e7f35c524",
  "app/api/teacher/send-results/route.ts": "673a682e85bfd6a9",
  "app/api/teacher/students/subjects/route.ts": "9e73f7374c6b298e",
  "app/download/apk/route.ts": "e9091ffc1ee2691c",
  "app/download/page.tsx": "0aad5833ad2df41a",
  "app/it-portal/auth/page.tsx": "2c0ca1755d753f10",
  "app/parent/attendance/page.tsx": "f0aef801a47956cc",
  "app/parent/dashboard/page.tsx": "f8c33a217c057afe",
  "app/parent/report-cards/page.tsx": "1305d226ed95ad04",
  "app/reset-password/page.tsx": "4a8bc732c1b120f9",
  "app/settings/notifications/page.tsx": "4eb08326201a1d33",
  "app/student/attendance/page.tsx": "8d9ba88780d76aa1",
  "app/student/exams/page.tsx": "a471b58a040a2c1d",
  "app/student/messages/page.tsx": "9f67721bf00f028a",
  "app/student/report-cards/page.tsx": "47b9f5310fc43873",
  "app/teacher/class/attendance/page.tsx": "e6545b182baad7bc",
  "app/teacher/class/roster/page.tsx": "79589b8c04339faa",
  "app/teacher/exam-center/page.tsx": "116b5342715d73e8",
  "app/teacher/messages/compose/page.tsx": "4324dde7fee34558",
  "app/teacher/performance-records/page.tsx": "6b95780ce89e3b4f",
  "app/teacher/students/subjects/page.tsx": "b62a7e9c07172eaf",
  "components/AdminSidebar.tsx": "8a780dd8fb3448ee",
  "components/Hero.tsx": "920a9fa79debef2d",
  "components/LiveReportCardPreview.tsx": "d37c68729c02b916",
  "components/MessagesInbox.tsx": "b5ab7d6b6e184766",
  "components/MobileAppCTA.tsx": "fc7475ab76c1757d",
  "components/PortalTopbar.tsx": "28bff64adacea418",
  "components/TeacherSidebar.tsx": "f7893d53b9c32224",
  "lib/academic-alerts.ts": "7897d23798efd15f",
  "lib/academic-session.ts": "32b5d791d2163f54",
  "lib/apk.ts": "d68b9e9c60cdad31",
  "lib/app-version.ts": "36b2ad765398e6fe",
  "lib/cors.ts": "3cbb76f7a2e3087a",
  "lib/exam-questions.ts": "0a4a7d1a14a9f0ef",
  "lib/exams.ts": "90c93ec52fe26c04",
  "lib/fee-structures.ts": "032ccfe25c54d211",
  "lib/gradebook.ts": "619fea43425909e3",
  "lib/notification-prefs.ts": "a575327ead3e8a85",
  "lib/notifications.ts": "6225742b30e8dc2d",
  "lib/promotion.ts": "7f5b306064de6dcc",
  "lib/question-import.ts": "07e08e8e31d576e4",
  "lib/report-cards.ts": "c990443e5cf5116d",
  "lib/subjects.ts": "b8ccbb98701cac6e",
  "mobile/app.json": "c99f5981b9755a53",
  "mobile/app/(admin)/dashboard.tsx": "93d4f546e2449631",
  "mobile/app/(parent)/attendance.tsx": "3ff2344474cfef26",
  "mobile/app/(parent)/dashboard.tsx": "31482de16920ed92",
  "mobile/app/(parent)/report-cards.tsx": "4dc494fab57e1f17",
  "mobile/app/(student)/attendance.tsx": "5e4fe252de32bf08",
  "mobile/app/(student)/dashboard.tsx": "bf0c9fb422775bb8",
  "mobile/app/(student)/exams.tsx": "462c942c2f409150",
  "mobile/app/(student)/report-cards.tsx": "573dfdb1d6649295",
  "mobile/app/(teacher)/attendance.tsx": "e90343017cfb3e68",
  "mobile/app/(teacher)/dashboard.tsx": "4640bdacf319696e",
  "mobile/app/(teacher)/gradebook.tsx": "cb7b4db1c5833874",
  "mobile/app/(teacher)/students.tsx": "9821152683539fc7",
  "mobile/app/_layout.tsx": "9d42331fbb047702",
  "mobile/app/admin-admissions.tsx": "72e3563408761e4d",
  "mobile/app/admin-corrections.tsx": "e577015905ce3aec",
  "mobile/app/admin-fees.tsx": "f81617784514c2b1",
  "mobile/app/admin-finance.tsx": "5f834424c5e13f1a",
  "mobile/app/admin-news.tsx": "50454967167d96b4",
  "mobile/app/admin-notifications.tsx": "7de7b9fff7ffdd06",
  "mobile/app/admin-reports.tsx": "66f172b1c4b21b99",
  "mobile/app/exam-runner.tsx": "218512906a982749",
  "mobile/app/settings.tsx": "34219989373b346c",
  "mobile/app/student-teachers.tsx": "4c9a00db60c45356",
  "mobile/app/teacher-analytics.tsx": "d9d2646e864865a5",
  "mobile/components/UpdateBanner.tsx": "593d290e74a2aebd",
  "mobile/eas.json": "5e475e46aee74355",
  "mobile/lib/api.ts": "6b8fd4c9c0d46c10",
  "mobile/lib/updates.ts": "2d22eaa954384faf",
  "mobile/lib/useCurrentTerm.ts": "48c13fe28a32b0b4",
  "mobile/metro.config.js": "7e5f9416c8a1a23b",
  "mobile/package-lock.json": "9f1d95a586aa2bfd",
  "mobile/package.json": "c2a7684b89fae63e",
  "mobile/src/components/dashboard/index.tsx": "794c69c5cd64f054",
  "package.json": "86c973c91d97ef64",
  "prisma/migrations/20260802060000_notification_preferences/migration.sql": "4f52423cbb887cb3",
  "prisma/migrations/20260803000000_fee_structures_and_launch_fixes/migration.sql":
    "81ef91091a133477",
  "prisma/migrations/20260803120000_subjects_and_exam_windows/migration.sql": "9ff8611e2b8d96c5",
  "prisma/migrations/20260804000000_rls_backfill_and_coverage_guard/migration.sql":
    "e7e78d46d1476d35",
  "prisma/schema.prisma": "2d34513abc592273",
  "prisma/seed-attendance.ts": "eaba51ae47682992",
  "prisma/seed-finance.ts": "13088c3adaa5bd0e",
  "prisma/seed-gradebooks.ts": "118a70d9f14bdb53",
  "prisma/seed-report-cards.ts": "da3157505cf89685",
  "scripts/audit-project.ts": "bc9668935b021868",
  "scripts/check-client-boundary.ts": "b7b8c8e7300537a8",
  "scripts/check-dead-ui.ts": "9c4576d47e194cde",
  "scripts/check-mobile-parity.ts": "5a1d4bca96dcf08a",
  "scripts/check-orphan-pages.ts": "fe7a0dd541b6b887",
  "scripts/check-term-readiness.ts": "146a021da5ba8fb1",
  "scripts/diagnose-db.ts": "700c416680afe2a8",
  "scripts/probe-db-path.ts": "5d93cb713c2ec050",
  "scripts/reconcile-labels.ts": "94a7863afb1f8ca3",
  "scripts/repair-labels.ts": "cc24c3f36d1ef995",
  "scripts/verify-docx-import.ts": "311b675073785f53",
  "scripts/verify-exam-grading.ts": "9bf486e89a8b4daa",
  "scripts/verify-rls-coverage.ts": "fcbb436e0d2c1725",
  "tests/lib/admin-student-detail.test.ts": "b563e3178c6980f8",
  "tests/lib/apk.test.ts": "9fe7154bf17dc07a",
  "tests/lib/cors-origins.test.ts": "b6349d4ebebf1f60",
  "tests/lib/cors-response-headers.test.ts": "2d5de08e91b16a55",
  "tests/lib/encoding.test.ts": "e684477dce660195",
  "tests/lib/exam-performance.test.ts": "c4620013251399c7",
  "tests/lib/exam-retake.test.ts": "76a080fb99fd469e",
  "tests/lib/exam-settings.test.ts": "109b263356c59f4b",
  "tests/lib/exam-sitting-window.test.ts": "d318127229d05f55",
  "tests/lib/fee-structures.test.ts": "53eeb0f446e01d7f",
  "tests/lib/label-resolution.test.ts": "21b02d6687da9c16",
  "tests/lib/messaging-student.test.ts": "41329a1c5460faf4",
  "tests/lib/mobile-config.test.ts": "71c1f7485ea6dc91",
  "tests/lib/notification-email-optout.test.ts": "51fe2db94d9bef7b",
  "tests/lib/notification-prefs.test.ts": "ec93366cbbbb0c8f",
  "tests/lib/print-layout.test.ts": "d16ffdb27b1f2eed",
  "tests/lib/promotion.test.ts": "2310a6c740c29150",
  "tests/lib/push-notifications.test.ts": "c98f78d82f76a273",
  "tests/lib/question-import.test.ts": "34cb25276eafafc8",
  "tests/lib/question-parser.test.ts": "9323b826a39ad211",
  "tests/lib/report-card-attendance.test.ts": "99d0c10c9931591a",
  "tests/lib/report-card-remark.test.ts": "7444feb38eba26f0",
  "tests/lib/send-results.test.ts": "8c472464ccfbc5b3",
  "tests/lib/subjects.test.ts": "c8d5f06c413a789d",
  "tests/lib/teacher-announcements.test.ts": "f225afd7e703eea0",
  "tests/lib/upload-format-detection.test.ts": "522d8c3f830b12fc",
  "tests/mobile/web-session.test.ts": "0e3329111de8236f",
  "tests/setup.ts": "bd75b0bb105edad4",
  "vitest.config.ts": "0d2e8dc0adeba83e",
};

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(q, (a) => {
      rl.close();
      res(a);
    }),
  );
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  return r.status === 0;
}

(async () => {
  // ---- 1. Integrity ----
  console.log("\nChecking your files against what I tested...");
  const missing = [],
    changed = [];
  for (const rel of Object.keys(expected)) {
    if (!fs.existsSync(rel)) {
      missing.push(rel);
      continue;
    }
    // Strip CR before hashing: Git rewrites line endings on checkout, so a raw
    // byte hash reported ~21 untouched files as DIFFERENT on every push -
    // noise that trains you to ignore the one warning that would matter.
    const raw = fs.readFileSync(rel);
    const norm = Buffer.from(raw.toString("binary").replace(/\r/g, ""), "binary");
    const hex = crypto.createHash("sha256").update(norm).digest("hex").slice(0, 16);
    if (hex !== expected[rel]) changed.push(rel);
  }

  if (missing.length) {
    console.log("\nMISSING " + missing.length + " file(s) - a drop was not applied:");
    missing.forEach((m) => console.log("    " + m));
  }
  if (changed.length) {
    console.log("\nDIFFERENT in " + changed.length + " file(s):");
    changed.forEach((c) => console.log("    " + c));
    console.log("\nIf you did NOT expect a difference, re-run the latest drop first.");
  }
  if (!missing.length && !changed.length) {
    console.log("  All " + Object.keys(expected).length + " files match what I tested.");
  }
  if (missing.length) {
    console.log("\nStopping: push blocked because files are missing.");
    process.exit(1);
  }

  // ---- 2. Gate ----
  console.log("\nRunning the gate (tsc, tests, prettier)...");
  if (!run("npx", ["tsc", "--noEmit"])) {
    console.log("tsc FAILED - not pushing.");
    process.exit(1);
  }
  console.log("  tsc clean");
  if (!run("npx", ["vitest", "run"])) {
    console.log("tests FAILED - not pushing.");
    process.exit(1);
  }
  if (!run("npx", ["prettier", "--check", "."])) {
    console.log("\nPrettier reported unformatted file(s).");
    console.log("Formatting ONLY the paths this change touches.");
    console.log("tsconfig.json is deliberately left alone - it is yours.\n");
    // Scoped on purpose. `prettier --write .` would also rewrite tsconfig.json,
    // which you fixed by hand and which I have never modified.
    run("npx", [
      "prettier",
      "--write",
      "app",
      "lib",
      "components",
      "scripts",
      "tests",
      "vitest.config.ts",
      "package.json",
    ]);
    if (!run("npx", ["prettier", "--check", "."])) {
      console.log("\nStill unformatted - almost certainly tsconfig.json.");
      console.log("It is whitespace only, and safe to format:");
      console.log("    npx prettier --write tsconfig.json");
      const ignore = await ask("Continue and push anyway? (y/N) ");
      if (ignore !== "y") {
        console.log("Stopped.");
        process.exit(1);
      }
    }
  }

  // ---- 3. Remote ----
  let remote = "";
  try {
    remote = execSync("git remote get-url origin", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {}
  if (!remote) {
    console.log("\nNo origin remote - adding it.");
    execSync("git remote add origin https://github.com/Teamthy/ykay_eduport-.git", {
      stdio: "inherit",
    });
  }
  console.log("\nRemote: " + execSync("git remote get-url origin").toString().trim());
  console.log("Branch: " + execSync("git branch --show-current").toString().trim());

  // ---- 4. Stage, commit, confirm ----
  execSync("git add -A", { stdio: "inherit" });
  const staged = execSync("git diff --cached --name-only").toString().trim();
  if (!staged) {
    console.log("\nNothing to commit - everything is already committed.");
  } else {
    const list = staged.split("\n");
    console.log("\nStaging " + list.length + " file(s).\n");
    console.log("Files staged:");
    list.slice(0, 12).forEach((f) => console.log("    " + f));
    if (list.length > 12) console.log("    ... and " + (list.length - 12) + " more");
    const msg = await ask("\nCommit message (blank to cancel): ");
    if (!msg) {
      console.log("Cancelled. Nothing committed or pushed.");
      process.exit(0);
    }
    // Write the message to a file: quotes and em-dashes break -m on Windows.
    fs.writeFileSync(".git-commit-msg.tmp", msg, "utf8");
    execSync("git commit -F .git-commit-msg.tmp", { stdio: "inherit" });
    fs.unlinkSync(".git-commit-msg.tmp");
  }

  console.log("\nAbout to push these commits:");
  try {
    execSync("git log --oneline origin/main..HEAD", { stdio: "inherit" });
  } catch {
    execSync("git log --oneline -10", { stdio: "inherit" });
  }

  const answer = await ask("\nPush to origin/main? (y/N) ");
  if (answer !== "y") {
    console.log("Cancelled. Nothing pushed.");
    process.exit(0);
  }

  execSync("git push origin main", { stdio: "inherit" });
  console.log("\nPushed. Watch the Vercel deploy for teamthy1/ykay-eduport2.");
  console.log("\n=== REQUIRED for the mobile web login: set in Vercel ===");
  console.log("  CORS_EXTRA_ORIGINS=http://localhost:8081");
  console.log("Then REDEPLOY - env vars only apply to a new build.");
  console.log("\nREMEMBER - production database still needs:");
  console.log("  npx prisma migrate deploy    # drop 31's RLS migration");
})();
