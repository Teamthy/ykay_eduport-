/**
 * Contrast guard.
 *
 *   npm run check:contrast
 *
 * Two checks, because the same bug shows up two ways:
 *
 *  1. THEME TOKENS. A table of foreground/background pairs taken from
 *     app/globals.css for BOTH themes, with their WCAG ratios. A token change
 *     that makes muted text unreadable on a card fails here, before anyone has
 *     to notice it on a page.
 *
 *  2. LITERAL PAIRS IN COMPONENTS. Tailwind lets a component say
 *     `bg-white text-white` or `bg-slate-900 text-slate-900`, and the theme
 *     tokens cannot help: the element ignores them entirely. That is exactly
 *     the "light text on light background" / "dark text on dark background"
 *     report. Every className in app/ and components/ is scanned for a
 *     background and a text colour that are both literals, and the pair is
 *     measured.
 *
 * Thresholds: 4.5:1 for body text, 3:1 for large text (>= 18.66px bold or
 * 24px) and for disabled text, which WCAG exempts.
 *
 * The script exits non-zero on a failure, so it can gate CI.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/* ── WCAG maths ─────────────────────────────────────────────────────── */

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(hexToRgb(foreground));
  const b = luminance(hexToRgb(background));
  const [high, low] = a > b ? [a, b] : [b, a];
  return (high + 0.05) / (low + 0.05);
}

/* ── 1. Theme tokens ────────────────────────────────────────────────── */

/** Tailwind's default palette for the handful of shades used as literals. */
const PALETTE: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
  "slate-950": "#020617",
  "gray-50": "#f9fafb",
  "gray-100": "#f3f4f6",
  "gray-200": "#e5e7eb",
  "gray-300": "#d1d5db",
  "gray-500": "#6b7280",
  "gray-700": "#374151",
  "gray-900": "#111827",
  "red-50": "#fef2f2",
  "red-100": "#fee2e2",
  "red-500": "#ef4444",
  "red-600": "#dc2626",
  "red-700": "#b91c1c",
  "red-800": "#991b1b",
  "green-50": "#f0fdf4",
  "green-100": "#dcfce7",
  "green-600": "#16a34a",
  "green-700": "#15803d",
  "green-800": "#166534",
  "green-900": "#14532d",
  "blue-500": "#3b82f6",
  // Project brand tokens (app/globals.css @theme). White on brand-green is the
  // classic Nigerian-school-portal design choice and it measures 2.0:1.
  "brand-green": "#4ec54d",
  "brand-green-light": "#62d35e",
  "brand-green-dark": "#3aa93a",
  "brand-orange": "#ff6e00",
  "brand-orange-light": "#ff9133",
  "brand-orange-dark": "#e65f00",
  "brand-navy": "#0c1824",
  "brand-navy-light": "#1a2e4d",
  "brand-navy-dark": "#050c14",
  "brand-white": "#ffffff",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  "ink-50": "#f8fafc",
  "ink-100": "#f1f5f9",
  "ink-200": "#e5e7eb",
  "ink-300": "#cbd5e1",
  "ink-400": "#94a3b8",
  "ink-500": "#64748b",
  "ink-600": "#475569",
  "ink-700": "#334155",
  "ink-800": "#1e293b",
  "ink-900": "#0c1824",
  "amber-500": "#f59e0b",
  "yellow-500": "#eab308",
};

function cssBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Missing ${selector} block in app/globals.css`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const block = css.slice(open + 1, close);
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

type Pair = { label: string; fg: string; bg: string; threshold: number };

function themePairs(tokens: Record<string, string>, theme: string): Pair[] {
  const pairs: Pair[] = [];
  for (const surface of ["--bg-primary", "--bg-secondary", "--bg-elevated"]) {
    for (const ink of ["--text-primary", "--text-secondary", "--text-muted"]) {
      pairs.push({
        label: `${theme}: ${ink} on ${surface}`,
        fg: tokens[ink],
        bg: tokens[surface],
        threshold: 4.5,
      });
    }
    pairs.push({
      label: `${theme}: --text-link on ${surface}`,
      fg: tokens["--text-link"],
      bg: tokens[surface],
      threshold: 4.5,
    });
  }
  pairs.push({
    label: `${theme}: primary button label`,
    fg: tokens["--btn-primary-text"],
    bg: tokens["--btn-primary-bg"],
    threshold: 4.5,
  });
  pairs.push({
    label: `${theme}: secondary button label`,
    fg: tokens["--btn-secondary-text"],
    bg: tokens["--btn-secondary-bg"],
    threshold: 4.5,
  });
  return pairs;
}

/* ── 2. Literal pairs in components ─────────────────────────────────── */

/**
 * `text-white/70` is a translucent white: it composites with whatever is
 * behind it, so its measured colour depends on the background. Same-element
 * pairs skip it (the fill is unknowable), but the nested pass knows the
 * ancestor background and can resolve the real colour.
 */
function translucentText(className: string): { base: string; alpha: number } | null {
  const match = /(?:^|\s)text-(white|black)\/(\d{1,3})(?![\w-])/.exec(className);
  if (!match) return null;
  return { base: match[1] === "white" ? "#ffffff" : "#000000", alpha: Number(match[2]) / 100 };
}

function composite(foreground: string, background: string, alpha: number): string {
  const channel = (offset: number) => {
    const front = parseInt(foreground.slice(1 + offset, 3 + offset), 16);
    const back = parseInt(background.slice(1 + offset, 3 + offset), 16);
    return Math.round(front * alpha + back * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

type Finding = { file: string; line: number; className: string; ratio: number; detail: string };

const LARGE_TEXT =
  /\btext-(?:2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b|\btext-\[[^\]]*(?:2[4-9]|[3-9]\d)px\][^"]*/;

/**
 * Colour token in a className. Multi-segment names are supported
 * (`brand-green`, `brand-navy-dark`, `slate-900`); a `/` opacity suffix
 * (`bg-white/5`) is a translucent fill that composites with the page, so the
 * pair cannot be measured and is skipped.
 */
function literalColour(
  className: string,
  prefix: "bg" | "text",
): { hex: string; token: string } | null {
  for (const match of className.matchAll(
    new RegExp(`(?:^|\\s)${prefix}-([a-z]+(?:-[a-z]+)*(?:-\\d{2,3})?)(?![\\w/-])`, "g"),
  )) {
    const hex = PALETTE[match[1]];
    if (hex) return { hex, token: match[1] };
  }
  // Arbitrary hex values (`bg-[#0ea5e9]`, Tailwind's escape hatch) are literals
  // too, and they are where the worst offenders hide.
  const arbitrary = new RegExp(`(?:^|\\s)${prefix}-\\[(#[0-9a-fA-F]{3,8})\\](?![\\w/-])`).exec(
    className,
  );
  if (arbitrary) return { hex: arbitrary[1], token: arbitrary[1] };
  return null;
}

function literalBackground(className: string) {
  return literalColour(className, "bg");
}

function literalText(className: string) {
  return literalColour(className, "text");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Rewrite arbitrary-value colour utilities to their plain token so the pair
 * scan can measure them: `bg-[var(--color-brand-green)]` behaves exactly like
 * `bg-brand-green`, and skipping it let a 2.2:1 button through.
 */
function normaliseArbitraryColours(className: string): string {
  return className.replace(
    /\b(bg|text)-\[var\(--(?:color-)?([a-z0-9-]+)\)\]/g,
    (_, prefix: string, token: string) => `${prefix}-${token}`,
  );
}

/**
 * Split one className attribute into colour "groups".
 *
 *   className={`base ${cond ? "bg-brand-green text-white" : "border"} text-xs`}
 *
 * A quoted chunk is one conditional arm, so its background and its text colour
 * belong together. Text that sits outside the quotes applies to every arm, so
 * it is paired with each arm's background. Measuring only the raw attribute
 * text missed the classic `? "bg-brand-green text-white"` ternary because the
 * two utilities are separated by a quote.
 */
function classNameGroups(
  className: string,
): { bg: { hex: string; token: string }; text: { hex: string; token: string } }[] {
  const chunks: string[] = [];
  let residual = "";
  let cursor = 0;
  for (const match of className.matchAll(/"([^"]*)"/g)) {
    residual += className.slice(cursor, match.index);
    chunks.push(match[1]);
    cursor = (match.index ?? 0) + match[0].length;
  }
  residual += className.slice(cursor);

  type Colour = { hex: string; token: string };
  const colours = (value: string): { bg: Colour | null; text: Colour | null } => ({
    bg: literalBackground(value),
    text: literalText(value),
  });
  const shared = colours(residual);
  const groups: { bg: Colour; text: Colour }[] = [];

  for (const chunk of chunks) {
    const own = colours(chunk);
    // An arm that only sets a background inherits the shared text colour, and
    // vice versa.
    const bg = own.bg ?? shared.bg;
    const text = own.text ?? shared.text;
    if (bg && text) groups.push({ bg, text });
  }
  if (shared.bg && shared.text) groups.push({ bg: shared.bg, text: shared.text });
  else if (shared.bg) {
    for (const chunk of chunks) {
      const own = colours(chunk);
      if (own.text) groups.push({ bg: shared.bg, text: own.text });
    }
  } else if (shared.text) {
    for (const chunk of chunks) {
      const own = colours(chunk);
      if (own.bg) groups.push({ bg: own.bg, text: shared.text });
    }
  }
  return groups;
}

export function inlineFindings(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const classNames = [...source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)];
  for (const match of classNames) {
    const className = normaliseArbitraryColours(match[1] ?? match[2] ?? match[3] ?? "");
    const line = source.slice(0, match.index ?? 0).split("\n").length;
    const seen = new Set<string>();
    for (const group of classNameGroups(className)) {
      const ratio = contrastRatio(group.text.hex, group.bg.hex);
      const threshold = LARGE_TEXT.test(className) ? 3 : 4.5;
      if (ratio >= threshold) continue;
      const detail = `bg-${group.bg.token} with text-${group.text.token}`;
      if (seen.has(detail)) continue;
      seen.add(detail);
      findings.push({
        file,
        line,
        className: className.trim().replace(/\s+/g, " ").slice(0, 120),
        ratio,
        detail,
      });
    }
  }
  return findings;
}

function scanComponentPairs(): Finding[] {
  const findings: Finding[] = [];
  for (const file of [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))]) {
    findings.push(...inlineFindings(readFileSync(file, "utf8"), file.slice(ROOT.length + 1)));
  }
  return findings;
}

/**
 * 3. NESTED PAIRS.
 *
 * The same bug also appears one level down: a light-blue checkout header with
 * `text-white/70` children, or a blue wordmark on a near-black hero. The
 * element itself never names both colours, so the same-element scan above
 * cannot see it. This pass walks the JSX tree, tracks the nearest opaque
 * literal background, and measures any literal text colour underneath it.
 *
 * Overlays are skipped: an element (or any ancestor between the text and the
 * measured background) that is absolutely/fixed positioned, gradient-filled or
 * image-backed sits on something the source cannot know.
 */
type Node = {
  name: string;
  line: number;
  className: string;
  parent: Node | null;
  ownBg: { hex: string; token: string } | null;
  tokenSurface: boolean;
  overlay: boolean;
  hasMedia: boolean;
  text: { hex: string; token: string } | null;
  selfClosing: boolean;
  children?: Node[];
};

const TAG = /<(\/?)([A-Za-z][\w.]*)((?:[^>"']|"[^"]*"|'[^']*'|`[^`]*`)*?)(\/?)>/g;
const OVERLAY = /(?:^|\s)(?:absolute|fixed|sticky|inset-|bg-gradient-to-|bg-\[url\()/;
/**
 * A `var(--bg-elevated)` fill resolves per theme. It is opaque, but it is not a
 * literal, so it stops the ancestor search instead of being skipped — skipping
 * used to climb straight out to the page shell and invent a failure.
 */
const TOKEN_BACKGROUND = /(?:^|\s)bg-\[var\(--/;
const VOID_ELEMENTS = /^(?:img|br|hr|input|meta|link|path|circle|rect|line|polyline)$/i;

export function nestedFindings(source: string, file: string): Finding[] {
  const roots: Node[] = [];
  const stack: Node[] = [];

  // Pass 1 — build the tree and flag every element that has a <img>/<video>
  // somewhere inside it. Text over a photo is measured against the photo, not
  // against whatever class the container happens to carry.
  for (const tag of source.matchAll(TAG)) {
    const [, closing, name, attrs, selfClosing] = tag;
    if (closing) {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].name === name) {
          stack.length = index;
          break;
        }
      }
      continue;
    }
    if (/^(?:img|video)$/i.test(name)) {
      for (const element of stack) element.hasMedia = true;
      continue;
    }
    const classMatch = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/.exec(attrs);
    const rawClassName = classMatch?.[1] ?? classMatch?.[2] ?? classMatch?.[3] ?? "";
    const className = normaliseArbitraryColours(rawClassName);
    const node: Node = {
      name,
      line: source.slice(0, tag.index ?? 0).split("\n").length,
      className,
      parent: stack[stack.length - 1] ?? null,
      ownBg: literalBackground(className),
      // Read from the raw class: normalisation rewrites `bg-[var(--x)]` to
      // `bg-x`, which would hide the token surface.
      tokenSurface: TOKEN_BACKGROUND.test(rawClassName),
      overlay: OVERLAY.test(className),
      hasMedia: false,
      text: literalText(className),
      selfClosing: Boolean(selfClosing),
    };
    if (node.parent) {
      (node.parent.children ??= []).push(node);
    } else {
      roots.push(node);
    }
    stack.push(node);
    if (selfClosing) stack.pop();
  }

  // Pass 2 — measure. The walk stops at the first ancestor that is opaque:
  // a literal background, a token background, an overlay, or media.
  const findings: Finding[] = [];
  const visit = (node: Node) => {
    const alpha = node.text ? null : translucentText(node.className);
    if (!node.ownBg && (node.text || alpha)) {
      let cursor = node.parent;
      let background: { hex: string; token: string; name: string; line: number } | null = null;
      let blocked = node.overlay;
      while (cursor) {
        if (cursor.overlay || cursor.hasMedia || cursor.tokenSurface) {
          blocked = true;
          break;
        }
        if (cursor.ownBg) {
          background = { ...cursor.ownBg, name: cursor.name, line: cursor.line };
          break;
        }
        cursor = cursor.parent;
      }
      if (background && !blocked) {
        const foreground = node.text?.hex ?? composite(alpha!.base, background.hex, alpha!.alpha);
        const token =
          node.text?.token ??
          `${alpha!.base === "#ffffff" ? "white" : "black"}/${Math.round(alpha!.alpha * 100)}`;
        const ratio = contrastRatio(foreground, background.hex);
        // WCAG 1.4.11: a glyph is a non-text UI component and needs 3:1, not
        // 4.5:1. `<ArrowRight />`-style self-closing React components are the
        // icon set.
        const isIcon = node.selfClosing && /^[A-Z]/.test(node.name);
        const threshold = isIcon || LARGE_TEXT.test(node.className) ? 3 : 4.5;
        if (ratio < threshold) {
          findings.push({
            file,
            line: node.line,
            className: node.className.trim().replace(/\s+/g, " ").slice(0, 120),
            ratio,
            detail: `<${node.name}> text-${token} inside bg-${background.token} (<${background.name}>, line ${background.line})`,
          });
        }
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const root of roots) visit(root);
  return findings;
}

function scanNestedPairs(): Finding[] {
  const findings: Finding[] = [];
  for (const file of [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))]) {
    findings.push(...nestedFindings(readFileSync(file, "utf8"), file.slice(ROOT.length + 1)));
  }
  return findings;
}

/* ── main ───────────────────────────────────────────────────────────── */

function main() {
  const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
  const dark = cssBlock(css, ":root {");
  const light = cssBlock(css, '[data-theme="light"] {');

  const failures: string[] = [];
  console.log("Theme tokens\n");
  for (const pair of [...themePairs(dark, "dark"), ...themePairs(light, "light")]) {
    const ratio = contrastRatio(pair.fg, pair.bg);
    const ok = ratio >= pair.threshold;
    if (!ok) failures.push(`${pair.label}: ${ratio.toFixed(2)}:1 (need ${pair.threshold}:1)`);
    console.log(`  ${ok ? "✓" : "✗"} ${pair.label.padEnd(44)} ${ratio.toFixed(2).padStart(6)}:1`);
  }

  const findings = scanComponentPairs();
  console.log(`\nLiteral colour pairs in ${"app/"} and components/\n`);
  if (!findings.length) {
    console.log("  ✓ every explicit background/text pair is readable");
  } else {
    for (const finding of findings) {
      console.log(
        `  ✗ ${finding.file}:${finding.line}  ${finding.ratio.toFixed(2)}:1  ${finding.detail}`,
      );
      console.log(`     ${finding.className}`);
    }
    failures.push(`${findings.length} unreadable literal pair(s)`);
  }

  const nested = scanNestedPairs();
  console.log("\nNested literal pairs (text inside a literal background)\n");
  if (!nested.length) {
    console.log("  ✓ no unreadable text nested in a literal background");
  } else {
    for (const finding of nested) {
      console.log(
        `  ✗ ${finding.file}:${finding.line}  ${finding.ratio.toFixed(2)}:1  ${finding.detail}`,
      );
      console.log(`     ${finding.className}`);
    }
    failures.push(`${nested.length} unreadable nested pair(s)`);
  }

  if (failures.length) {
    console.error(`\n${failures.length} contrast problem(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error("\nContrast below 4.5:1 is unreadable for most people in daylight.");
    process.exit(1);
  }
  console.log("\nContrast OK.");
}

// Only run when invoked as a script, so the guards below can be unit-tested.
if (process.argv[1]?.includes("check-contrast")) main();
