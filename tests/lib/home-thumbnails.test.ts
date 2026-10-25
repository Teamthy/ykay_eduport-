import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The home page's IT track cards are small tiles. They once pointed at the
 * full-bleed track heroes — 2070px JPEGs of 250-577 KB each — so the landing
 * page downloaded about 2.4 MB for six thumbnails, and Lighthouse showed those
 * files as the five heaviest responses while the 23 KB LCP image waited.
 *
 * The budget here is deliberately tight: a card is ~260 CSS px wide, so a 2x
 * WebP has no business exceeding 80 KB, and pointing the card back at a hero
 * would fail immediately.
 */
const ROOT = process.cwd();
const COMPONENT = join(ROOT, "components/ITFlagshipSection.tsx");
const PUBLIC = join(ROOT, "public");
const THUMB_BUDGET_BYTES = 80 * 1024;

function trackEntries() {
  const source = readFileSync(COMPONENT, "utf8");
  return [...source.matchAll(/thumb:\s*"([^"]+)"/g)].map((match) => match[1]);
}

describe("the logo is not the heaviest response", () => {
  it("does not advertise the 104 KB master PNG as a site icon", () => {
    const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf8");
    const iconsStart = layout.indexOf("icons:");
    expect(iconsStart, "layout no longer declares `icons`").toBeGreaterThan(-1);
    const iconsBlock = layout.slice(iconsStart, iconsStart + 800);
    // `sizes: "any"` on the master made every page fetch 104 KB for a favicon.
    expect(iconsBlock).not.toMatch(/ykay-logo\.png",\s*sizes:\s*"any"/);
    expect(iconsBlock).toContain("/icons/icon-192.png");
  });

  it("uses the small webp for small raw <img> marks", () => {
    for (const file of ["components/PlatformLanding.tsx", "app/it-portal/dashboard/page.tsx"]) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source, `${file} still points a raw <img> at the master PNG`).not.toMatch(
        /<img[^>]+ykay-logo\.png/,
      );
    }
  });
});

describe("home page track cards", () => {
  it("renders the thumbnail, not the full-bleed hero", () => {
    const source = readFileSync(COMPONENT, "utf8");
    expect(source).toContain("src={track.thumb}");
    expect(source).not.toContain("src={track.image}");
  });

  it("ships a thumbnail for every card", () => {
    expect(trackEntries().length).toBeGreaterThanOrEqual(6);
  });

  it.each(trackEntries().map((path) => [path]))("%s exists and fits the card budget", (path) => {
    const file = join(PUBLIC, path.replace(/^\//, ""));
    const { size } = statSync(file);
    expect(size).toBeLessThan(THUMB_BUDGET_BYTES);
    expect(path).toMatch(/-520\.webp$/);
  });
});

describe("hero LCP candidates", () => {
  const hero = readFileSync(join(process.cwd(), "components/Hero.tsx"), "utf8");

  it("renders the decorative backdrop as a CSS background, not an <img>", () => {
    // As an <img> the full-bleed backdrop was the largest element in the first
    // viewport, so the LCP budget measured a 20%-opacity decoration behind a
    // 92%-opaque gradient. CSS backgrounds are not LCP candidates.
    expect(hero).toContain("url('/home/hero-campus-750.webp')");
    expect(hero).not.toContain('src="/home/hero-campus-750.webp"');
  });

  it("keeps the student photograph preloaded, high-priority and sized", () => {
    expect(hero).toContain('src="/home/ykay-students-750.webp"');
    expect(hero).toContain('fetchPriority="high"');
    expect(hero).toMatch(/width=\{\d+\}/);
    expect(hero).toMatch(/height=\{\d+\}/);
    expect(hero).not.toContain('loading="lazy"');
  });

  it("leaves no above-the-fold element gated on JavaScript", () => {
    // A hero that only appears after hydration turns the LCP budget into a
    // hydration benchmark: the measured paint lands seconds after the real one.
    expect(hero).not.toMatch(/\bshown\b/);
    expect(hero).not.toMatch(/useState|useEffect/);
  });
});
