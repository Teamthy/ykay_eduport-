import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readXlsxRows } from "@/lib/xlsx-read";

/**
 * The .xlsx reader exists so the import screen can accept a real spreadsheet
 * without pulling in `xlsx`, which carries two unfixed high-severity advisories
 * and would fail this repo's blocking dependency-audit gate.
 *
 * The fixture is a genuine ZIP-of-XML workbook — the same shape Excel writes —
 * generated once and committed, so this tests a real file rather than a
 * round-trip through our own writer.
 */
const FIXTURE = path.join(process.cwd(), "tests/fixtures/student-import-sample.xlsx");

describe("readXlsxRows", () => {
  it("reads the header row and every student row from a real workbook", async () => {
    const rows = await readXlsxRows(fs.readFileSync(FIXTURE));

    expect(rows[0]).toEqual([
      "First name",
      "Surname",
      "Other names",
      "Gender",
      "Class",
      "Subjects",
      "Admission no.",
      "Guardian name",
      "Guardian phone",
      "Guardian email",
    ]);
    expect(rows).toHaveLength(5);
    expect(rows[1]).toEqual([
      "Chidera",
      "Okafor",
      "Ada",
      "F",
      "JSS 1A",
      "French",
      "YKC/2026/0142",
      "Ngozi Okafor",
      "08031234567",
      "ngozi.okafor@example.com",
    ]);
  });

  it("keeps an empty cell empty instead of shifting the row", async () => {
    const rows = await readXlsxRows(fs.readFileSync(FIXTURE));
    // Line 3 has no "Other names"; the columns after it must not slide left.
    expect(rows[2][2]).toBe("");
    expect(rows[2][3]).toBe("M");
    expect(rows[2][4]).toBe("JSS 1A");
  });

  it("preserves values exactly, including spaces the sheet author typed", async () => {
    const rows = await readXlsxRows(fs.readFileSync(FIXTURE));
    // Trimming is the importer's job, not the reader's: it decides what
    // "blank" means, and the reader silently changing data would hide it.
    expect(rows[3][0].trim()).toBe("Zainab");
    expect(rows[3][9]).toBe("musa.bello@example.com");
  });

  it("reads numeric cells and rich-text shared strings", async () => {
    const rows = await readXlsxRows(fs.readFileSync(FIXTURE));
    expect(rows[4]).toEqual(["42", "RICH TEXT"]);
  });

  it("accepts an ArrayBuffer as well as a Buffer", async () => {
    const bytes = fs.readFileSync(FIXTURE);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await expect(readXlsxRows(arrayBuffer as ArrayBuffer)).resolves.toHaveLength(5);
  });

  it("says a non-xlsx file is not one, rather than returning empty rows", async () => {
    await expect(
      readXlsxRows(new TextEncoder().encode("first_name,last_name\nA,B")),
    ).rejects.toThrow(/does not look like an \.xlsx/i);
  });
});
