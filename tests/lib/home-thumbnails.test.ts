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
