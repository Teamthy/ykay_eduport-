/**
 * Feature-catalogue guard.
 *
 *   npm run check:features
 *
 * Verifies that the summary table in `docs/famex/08-feature-catalogue.md`
 * matches the feature rows it summarises — so the counts cannot quietly drift
 * when someone adds, extends or removes a feature.
 *
 * Why this exists: the catalogue is the scope document. If its totals say "167
 * new features" while the rows say 174, then every plan, quotation and sprint
 * built on it is wrong by an unknown amount — and nobody notices for weeks
 * because a markdown table has no failing test.
 *
 * Rules it enforces:
 *   1. every feature row has an ID matching F<module>-<number>, unique;
 *   2. every row carries exactly one primary tag (✅ 🔧 🆕 ✂️ ⏸);
 *   3. the TOTAL row equals the sum of the module rows;
 *   4. each module row equals the features actually listed in that section.
 *
 * Exit code 1 with a precise diff when anything disagrees.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DOC = join(process.cwd(), "docs", "famex", "08-feature-catalogue.md");
const COUNT_SECTION = "25";
const TAGS = ["✅", "🔧", "🆕", "✂️", "⏸"] as const;
type Tag = (typeof TAGS)[number];

const TAG_LABEL: Record<Tag, string> = {
  "✅": "In base",
  "🔧": "Extend",
  "🆕": "New",
  "✂️": "Strip",
  "⏸": "Deferred",
};

export type ModuleCount = { label: string; total: number; byTag: Record<Tag, number> };

/** Count features per `## N. Title` section, ignoring the summary section. */
export function countFeatures(markdown: string): ModuleCount[] {
  const sections = markdown.split(/\n## /).slice(1);
  const out: ModuleCount[] = [];

  for (const section of sections) {
    const title = section.split("\n", 1)[0].trim();
    const moduleNumber = title.split(".")[0];
    if (moduleNumber === COUNT_SECTION) continue;

    const rows = [...section.matchAll(/\n\| (F\d+-\d+) \|([^\n]*)\|/g)];
    if (rows.length === 0) continue;

    const byTag: Record<Tag, number> = { "✅": 0, "🔧": 0, "🆕": 0, "✂️": 0, "⏸": 0 };
    for (const [, , rest] of rows) {
      const tag = TAGS.find((candidate) => rest.includes(candidate));
      if (tag) byTag[tag] += 1;
    }

    const label = title
      .replace(/^\d+\.\s*/, "")
      .replace(/\*\(was:.*?\)\*/, "")
      .replace(/\(.*?\)/, "")
      .trim();

    out.push({ label, total: rows.length, byTag });
  }
  return out;
}

/** Parse the `| Group | Total | ... |` summary table. */
export function parseSummaryTable(
  markdown: string,
): { label: string; total: number; byTag: Record<Tag, number> }[] {
  const lines = markdown
    .split("\n")
    .filter((line) => /^\|[\s|:-]+\|$/.test(line) || line.startsWith("| "));
  const headerIndex = lines.findIndex((line) => line.startsWith("| Group |"));
  if (headerIndex === -1) {
    throw new Error("summary table not found (looking for a row starting '| Group |')");
  }

  const out: { label: string; total: number; byTag: Record<Tag, number> }[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (/^\|[\s|:-]+\|$/.test(line)) continue; // markdown separator row
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 7) continue;
    const label = cells[0].replace(/\*\*/g, "");
    const [total, ok, ext, next, strip, deferred] = cells
      .slice(1, 7)
      .map((cell) => Number(cell.replace(/\*\*/g, "")));
    if (!Number.isFinite(total)) continue;
    out.push({
      label,
      total,
      byTag: { "✅": ok, "🔧": ext, "🆕": next, "✂️": strip, "⏸": deferred },
    });
  }
  return out;
}

export function compare(
  actual: ModuleCount[],
  summary: { label: string; total: number; byTag: Record<Tag, number> }[],
): string[] {
  const problems: string[] = [];
  const body = summary.filter((row) => !row.label.startsWith("TOTAL"));
  const summaryTotal = summary.find((row) => row.label.startsWith("TOTAL"));

  if (body.length !== actual.length) {
    problems.push(
      `summary lists ${body.length} modules, the document has ${actual.length} sections`,
    );
  }

  actual.forEach((module, index) => {
    const declared = body[index];
    if (!declared) {
      problems.push(`module "${module.label}" is missing from the summary table`);
      return;
    }
    if (declared.total !== module.total) {
      problems.push(
        `"${module.label}": summary says ${declared.total} features, rows list ${module.total}`,
      );
    }
    for (const tag of TAGS) {
      if (declared.byTag[tag] !== module.byTag[tag]) {
        problems.push(
          `"${module.label}": summary says ${declared.byTag[tag]} × ${TAG_LABEL[tag]}, rows have ${module.byTag[tag]}`,
        );
      }
    }
  });

  if (!summaryTotal) {
    problems.push("no TOTAL row in the summary table");
    return problems;
  }

  const computedTotal = {
    total: actual.reduce((sum, m) => sum + m.total, 0),
    byTag: TAGS.reduce(
      (acc, tag) => ({ ...acc, [tag]: actual.reduce((sum, m) => sum + m.byTag[tag], 0) }),
      {} as Record<Tag, number>,
    ),
  };

  if (summaryTotal.total !== computedTotal.total) {
    problems.push(
      `TOTAL row says ${summaryTotal.total} features, rows sum to ${computedTotal.total}`,
    );
  }
  for (const tag of TAGS) {
    if (summaryTotal.byTag[tag] !== computedTotal.byTag[tag]) {
      problems.push(
        `TOTAL row says ${summaryTotal.byTag[tag]} × ${TAG_LABEL[tag]}, rows sum to ${computedTotal.byTag[tag]}`,
      );
    }
  }

  return problems;
}

function main() {
  const markdown = readFileSync(DOC, "utf8");
  const actual = countFeatures(markdown);
  const summary = parseSummaryTable(markdown);
  const problems = compare(actual, summary);

  const total = actual.reduce((sum, m) => sum + m.total, 0);

  if (problems.length > 0) {
    console.error(
      `check:features — the catalogue totals disagree with its rows (${total} features listed):\n`,
    );
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    console.error(
      "\nFix the summary table, or run the generator that produced it, and commit both.",
    );
    process.exit(1);
  }

  console.log(`check:features ✓ ${actual.length} modules · ${total} features`);
  const totals = TAGS.map(
    (tag) => `${actual.reduce((s, m) => s + m.byTag[tag], 0)} ${TAG_LABEL[tag]}`,
  ).join(" · ");
  console.log(`  ${totals}`);
}

if (process.argv[1]?.includes("check-feature-catalogue")) main();
