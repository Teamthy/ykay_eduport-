/**
 * Brand-literal audit (rebrand guard).
 *
 *   npm run audit:brand                  # inventory; fails when NEW literals appear
 *   npm run audit:brand -- --update      # re-baseline after an intentional change
 *   npm run audit:brand -- --strict      # fail unless there are ZERO findings
 *   npm run audit:brand -- --all         # include tests/scripts/prisma/docs too
 *   npm run audit:brand -- --json        # machine-readable output
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * Rebranding this platform for a second school is not a find-and-replace, it is
 * a rule that has to hold for years: the next feature someone ships will
 * hardcode the school's name, phone number, palette or cookie key again, and
 * nobody will notice until another school's parent sees it.
 *
 * So: this script takes an inventory, stores a baseline, and fails when the
 * count for a given line grows. The total can only go down. When the rebrand is
 * finished the baseline file is deleted and `--strict` takes over in CI.
 *
 * The key for a finding is `file::category::normalised line text` — deliberately
 * NOT the line number, because line numbers churn on every unrelated edit and
 * would make the ratchet useless. Counts, not presence, are compared, so a file
 * that already has one "Ykay" cannot silently gain a second one.
 *
 * Scope: by default only code that SHIPS to a school's users is audited
 * (app, components, lib, middleware, mobile, content, public). Tests, scripts,
 * prisma seeds and docs have historical references that are not shipped, and
 * counting them would drown the signal — use --all when you want them.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, "scripts", "brand-audit.baseline.json");

const SHIPPING_ROOTS = ["app", "components", "lib", "middleware.ts", "mobile", "content", "public"];
const SUPPORT_ROOTS = [
  "tests",
  "scripts",
  "prisma",
  "docs",
  ".env.example",
  "package.json",
  "README.md",
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "_backups",
  ".history",
  "dist",
  "build",
  "coverage",
  "out",
  "target",
  ".expo",
  "android",
  "ios",
]);

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".bmp",
  ".svg",
  ".pdf",
  ".zip",
  ".apk",
  ".aab",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".mp4",
  ".mp3",
  ".webm",
]);

/** Files whose contents are generated or pins, never rebranded by hand. */
const SKIP_FILES = new Set([
  "package-lock.json",
  "mobile/package-lock.json",
  "brand-audit.baseline.json",
]);

type Category =
  | "COOKIE_STORAGE"
  | "MOBILE_APP_ID"
  | "DOMAIN"
  | "ASSET"
  | "PACKAGE_SLUG"
  | "BRAND_NAME"
  | "PHONE"
  | "PALETTE";

/**
 * First match wins, so a line is counted once. Order matters: the most specific
 * signatures (cookie keys, bundle ids) are checked before the generic name.
 */
const RULES: { category: Category; pattern: RegExp; hint: string }[] = [
  {
    category: "COOKIE_STORAGE",
    pattern: /ykay_session|ykay[_-](?:token|store|session)/i,
    hint: "session/cookie key — namespace per School.slug",
  },
  {
    category: "MOBILE_APP_ID",
    pattern: /com\.ykaycollege\.app|applinks:.*ykaycollege/i,
    hint: "bundle id / universal link — per-school EAS project (D5)",
  },
  {
    category: "DOMAIN",
    pattern: /ykaycollege\.(?:com|com\.ng|ng|org|edu\.ng)|ykay\.app/i,
    hint: "domain — drive from tenant config",
  },
  {
    category: "ASSET",
    pattern: /ykay[_-]logo|logo[_-]ykay/i,
    hint: "asset filename — must come from TenantBranding.logoUrl",
  },
  {
    category: "PACKAGE_SLUG",
    pattern: /ykay-college|ykay_college/i,
    hint: "slug/package name — SCHOOL_SLUG + tenant config",
  },
  {
    category: "BRAND_NAME",
    pattern: /\bykay\b/i,
    hint: "brand name literal — read from school identity, never typed",
  },
  {
    category: "PHONE",
    pattern: /0701[\s-]?537[\s-]?4411|07015374411/,
    hint: "school phone number — tenant contact config",
  },
  {
    category: "PALETTE",
    pattern: /#(?:0c1824|4ec54d|ff6e00|1a2e4d|2f8a2f|050c14|184b18|00072d|051650|123499)\b/i,
    hint: "brand palette hex — must be a CSS variable / tenant token",
  },
];

type Finding = { file: string; line: number; category: Category; text: string; key: string };

function walk(target: string, files: string[] = []): string[] {
  const absolute = join(ROOT, target);
  if (!existsSync(absolute)) return files;

  const stats = statSync(absolute);
  if (stats.isFile()) {
    files.push(target);
    return files;
  }
  if (!stats.isDirectory()) return files;

  for (const entry of readdirSync(absolute)) {
    const child = join(target, entry);
    if (SKIP_DIRS.has(entry) || SKIP_FILES.has(child.split(sep).join("/"))) continue;
    const childStats = statSync(join(ROOT, child));
    if (childStats.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(child, files);
    } else {
      const ext = entry.slice(entry.lastIndexOf(".")).toLowerCase();
      if (BINARY_EXT.has(ext)) continue;
      files.push(child);
    }
  }
  return files;
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

function scanFile(file: string): Finding[] {
  let content: string;
  try {
    content = readFileSync(join(ROOT, file), "utf8");
  } catch {
    return [];
  }
  if (content.length > 4_000_000) return [];

  const findings: Finding[] = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.includes("ykay") && !raw.includes("Ykay") && !/#[0-9a-fA-F]{6}/.test(raw)) continue;
    for (const rule of RULES) {
      if (!rule.pattern.test(raw)) continue;
      const text = normalise(raw);
      findings.push({
        file: file.split(sep).join("/"),
        line: index + 1,
        category: rule.category,
        text,
        key: `${file.split(sep).join("/")}::${rule.category}::${text}`,
      });
      break; // first matching rule wins — one finding per line
    }
  }
  return findings;
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

type Baseline = { generatedAt: string; counts: Record<string, number> };

function loadBaseline(): Baseline | null {
  if (!existsSync(BASELINE_PATH)) return null;
  try {
    const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline;
    if (!parsed || typeof parsed.counts !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function main() {
  const args = process.argv.slice(2);
  const wantAll = args.includes("--all");
  const update = args.includes("--update");
  const strict = args.includes("--strict");
  const asJson = args.includes("--json");

  const roots = wantAll ? [...SHIPPING_ROOTS, ...SUPPORT_ROOTS] : SHIPPING_ROOTS;
  const files = roots.flatMap((root) => walk(root));
  const findings = files.flatMap(scanFile);

  const baseline = loadBaseline();
  const currentCounts = countBy(findings.map((f) => f.key));
  const baselineCounts = baseline?.counts ?? {};

  const newFindings = findings.filter(
    (f) => (baselineCounts[f.key] ?? 0) < (currentCounts[f.key] ?? 0),
  );
  const staleKeys = Object.keys(baselineCounts).filter((key) => !(key in currentCounts));
  const baselineTotal = Object.values(baselineCounts).reduce((a, b) => a + b, 0);

  const byCategory = countBy(findings.map((f) => f.category));
  const byFile = countBy(findings.map((f) => f.file));
  const worstFiles = Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  if (update) {
    const nextBaseline: Baseline = {
      generatedAt: new Date().toISOString(),
      counts: Object.fromEntries(
        Object.entries(currentCounts).sort(([a], [b]) => a.localeCompare(b)),
      ),
    };
    writeFileSync(BASELINE_PATH, `${JSON.stringify(nextBaseline, null, 2)}\n`, "utf8");
    console.log(
      `brand-audit: baseline written → ${relative(ROOT, BASELINE_PATH)} (${findings.length} findings across ${Object.keys(byFile).length} files)`,
    );
    return;
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          scope: wantAll ? "all" : "shipping",
          total: findings.length,
          files: Object.keys(byFile).length,
          byCategory,
          worstFiles,
          newFindings: newFindings.map((f) => ({
            file: f.file,
            line: f.line,
            category: f.category,
            text: f.text,
          })),
          staleBaselineEntries: staleKeys.length,
          baselineTotal,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `brand-audit: scope=${wantAll ? "all" : "shipping"} · ${findings.length} findings in ${Object.keys(byFile).length} files`,
    );
    console.log("");
    console.log("By category:");
    for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
      const hint = RULES.find((r) => r.category === category)?.hint ?? "";
      console.log(`  ${String(count).padStart(5)}  ${category.padEnd(15)} ${hint}`);
    }
    console.log("");
    console.log("Worst files (burn-down order):");
    for (const [file, count] of worstFiles) console.log(`  ${String(count).padStart(5)}  ${file}`);

    if (baseline) {
      console.log("");
      console.log(`Baseline: ${baselineTotal} findings (${baseline.generatedAt})`);
      if (staleKeys.length > 0) {
        console.log(
          `  ${staleKeys.length} baseline entries no longer exist — nice, that is burn-down. Run --update to shrink the baseline.`,
        );
      }
    }
  }

  if (strict) {
    if (findings.length > 0) {
      console.error(
        `\nbrand-audit --strict: ${findings.length} brand literals remain. Rebrand is not finished.`,
      );
      process.exit(1);
    }
    console.log("\nbrand-audit --strict: clean. No brand literals in shipping code.");
    return;
  }

  if (!baseline) {
    console.log(
      "\nbrand-audit: no baseline found. Run `npm run audit:brand -- --update` to start the ratchet.",
    );
    return;
  }

  if (newFindings.length > 0) {
    console.error(
      `\nbrand-audit: ${newFindings.length} NEW brand literal(s) — these must not ship:`,
    );
    for (const finding of newFindings.slice(0, 40)) {
      console.error(`  ${finding.file}:${finding.line}  [${finding.category}]  ${finding.text}`);
    }
    if (newFindings.length > 40) console.error(`  …and ${newFindings.length - 40} more.`);
    console.error(
      "\nFix the code to read brand values from the school identity, or re-baseline deliberately with --update.",
    );
    process.exit(1);
  }

  console.log(
    `\nbrand-audit: no new literals. ${findings.length} findings remain against a baseline of ${baselineTotal}.`,
  );
}

main();
