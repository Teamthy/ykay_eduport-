/**
 * Read the first sheet of an .xlsx file into rows of strings.
 *
 * Why not a library: the only widely-used npm parser (`xlsx`) carries two
 * unfixed high-severity advisories (GHSA-4r6h-8v6p-xvw6 prototype pollution,
 * GHSA-5pgg-2g8v-p4x9 ReDoS) and this repository's dependency-audit gate is
 * blocking. An import screen is exactly the surface where a malicious file is
 * plausible, so "no fix available" was not something to wave through.
 *
 * An .xlsx is a ZIP of XML. Browsers (and Node 18+) ship
 * `DecompressionStream("deflate-raw")`, which is all the inflate part needs, so
 * the file can be decoded in the browser with no dependency at all. The sheet
 * never leaves the tab: the bytes are turned into rows here and only the rows
 * are posted to the server.
 *
 * Scope is deliberate — first worksheet, cell values, no formulas, styles,
 * dates-as-serials or merged cells. If the browser lacks DecompressionStream,
 * the caller is told to export CSV instead of silently importing a blank sheet.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

type ZipEntry = { name: string; method: number; compressedSize: number; localHeaderOffset: number };

function findEndOfCentralDirectory(view: DataView): number {
  // The EOCD record is at the end, followed by a comment of up to 64 KiB.
  const maxComment = 0xffff;
  const start = Math.max(0, view.byteLength - maxComment - 22);
  for (let offset = view.byteLength - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  throw new Error("This does not look like an .xlsx file (no ZIP directory found).");
}

function readCentralDirectory(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocd + 10, true);
  const directoryOffset = view.getUint32(eocd + 16, true);

  const entries = new Map<string, ZipEntry>();
  let offset = directoryOffset;
  const decoder = new TextDecoder();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name, { name, method, compressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const Decompression = (globalThis as { DecompressionStream?: typeof DecompressionStream })
    .DecompressionStream;
  if (!Decompression) {
    throw new Error(
      "This browser cannot open .xlsx files. Save the sheet as CSV (File → Save As → CSV UTF-8) and upload that instead.",
    );
  }
  const stream = new Blob([new Uint8Array(data)])
    .stream()
    .pipeThrough(new Decompression("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function readEntry(bytes: Uint8Array, entry: ZipEntry | undefined): Promise<string | null> {
  if (!entry) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const localNameLength = view.getUint16(entry.localHeaderOffset + 26, true);
  const localExtraLength = view.getUint16(entry.localHeaderOffset + 28, true);
  const dataStart = entry.localHeaderOffset + 30 + localNameLength + localExtraLength;
  const data = bytes.subarray(dataStart, dataStart + entry.compressedSize);
  const raw = entry.method === 0 ? data : await inflateRaw(data);
  return new TextDecoder().decode(raw);
}

/** `ABC12` → 2 (0-based column index). */
function columnIndex(reference: string): number {
  const letters = reference.replace(/[^A-Z]/gi, "").toUpperCase();
  let value = 0;
  for (const letter of letters) value = value * 26 + (letter.charCodeAt(0) - 64);
  return Math.max(0, value - 1);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

/** Every `<t>` inside a `<si>`/`<is>` element, concatenated (rich text runs). */
function textOf(xml: string): string {
  const parts = [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => match[1]);
  return decodeXmlEntities(parts.join(""));
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => textOf(match[1]));
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attributes = cellMatch[1];
      const inner = cellMatch[2] ?? "";
      const reference = /r="([A-Z]+\d+)"/.exec(attributes)?.[1] ?? "";
      const type = /t="([^"]+)"/.exec(attributes)?.[1] ?? "n";
      const index = reference ? columnIndex(reference) : cells.length;

      let value = "";
      if (type === "s") {
        const sharedIndex = Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? -1);
        value = shared[sharedIndex] ?? "";
      } else if (type === "inlineStr") {
        value = textOf(inner);
      } else {
        value = decodeXmlEntities(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "");
      }

      while (cells.length < index) cells.push("");
      cells[index] = value.trim();
    }
    rows.push(cells);
  }
  return rows;
}

/** The first worksheet's path, resolved through the workbook relationships. */
async function firstSheetPath(bytes: Uint8Array, entries: Map<string, ZipEntry>): Promise<string> {
  const workbook = await readEntry(bytes, entries.get("xl/workbook.xml"));
  const rels = await readEntry(bytes, entries.get("xl/_rels/workbook.xml.rels"));

  const firstSheet = workbook ? /<sheet\b[^>]*r:id="([^"]+)"/.exec(workbook)?.[1] : undefined;
  if (firstSheet && rels) {
    const relMatch = new RegExp(`<Relationship[^>]*Id="${firstSheet}"[^>]*>`).exec(rels)?.[0];
    const target = relMatch ? /Target="([^"]+)"/.exec(relMatch)?.[1] : undefined;
    if (target) {
      const normalised = target.startsWith("/")
        ? target.slice(1)
        : `xl/${target.replace(/^\.\//, "")}`;
      if (entries.has(normalised)) return normalised;
    }
  }

  // Fall back to the conventional name rather than failing: some exporters omit
  // the relationship part entirely.
  const fallback = "xl/worksheets/sheet1.xml";
  if (entries.has(fallback)) return fallback;
  throw new Error("The workbook has no readable worksheet.");
}

/**
 * Read the first sheet of an .xlsx into rows of trimmed strings.
 *
 * Blank rows are dropped; trailing empty cells in a row are dropped. Row order
 * is preserved, so line numbers in an error message still mean something.
 */
export async function readXlsxRows(input: ArrayBuffer | Uint8Array): Promise<string[][]> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const entries = readCentralDirectory(bytes);

  const sharedXml = await readEntry(bytes, entries.get("xl/sharedStrings.xml"));
  const shared = sharedXml ? parseSharedStrings(sharedXml) : [];

  const sheetXml = await readEntry(bytes, entries.get(await firstSheetPath(bytes, entries)));
  if (!sheetXml) throw new Error("The workbook's first sheet is empty.");

  return parseSheet(sheetXml, shared)
    .map((row) => {
      const cells = [...row];
      while (cells.length && !cells[cells.length - 1]) cells.pop();
      return cells;
    })
    .filter((row) => row.some((cell) => cell.trim()));
}
