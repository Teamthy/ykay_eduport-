#!/usr/bin/env node
/**
 * Home-page track-card thumbnails.
 *
 *   node scripts/build-home-thumbnails.mjs
 *
 * The six IT track cards in components/ITFlagshipSection.tsx are small tiles
 * (about 200-260 CSS px wide). They used to point at the full-bleed page
 * heroes — 2070px JPEGs of 250-577 KB each — so the home page pulled roughly
 * 2.4 MB of photography for six thumbnails. Lighthouse measured that directly:
 * the five heaviest responses on "/" were these files, while the 23 KB LCP
 * image waited behind them.
 *
 * This writes a 2x thumbnail (520px wide) as WebP for each card. The original
 * JPEGs stay untouched because the track pages use them as full-width heroes.
 *
 * Re-run after replacing any source JPEG. `sharp` ships with Next's image
 * pipeline, so there is nothing extra to install.
 */
import { statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC = join(process.cwd(), "public");
const WIDTH = 520;
const QUALITY = 72;

/** Kept in sync with the `thumb` fields in components/ITFlagshipSection.tsx. */
const SOURCES = [
  "python-hero",
  "ai-hero",
  "cybersecurity-hero",
  "microsoft-excel-hero",
  "digital-literacy-hero",
  "excel-expert-hero",
];

let total = 0;
for (const name of SOURCES) {
  const input = join(PUBLIC, `${name}.jpg`);
  const output = join(PUBLIC, `${name}-${WIDTH}.webp`);
  await sharp(input)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(output);
  const before = statSync(input).size;
  const after = statSync(output).size;
  total += after;
  console.log(
    `${name.padEnd(24)} ${String(Math.round(before / 1024)).padStart(4)} KB -> ` +
      `${String(Math.round(after / 1024)).padStart(3)} KB  ${output.slice(PUBLIC.length + 1)}`,
  );
}
console.log(`\n${SOURCES.length} thumbnails, ${Math.round(total / 1024)} KB total`);
