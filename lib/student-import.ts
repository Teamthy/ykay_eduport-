import Papa from "papaparse";

/**
 * Student bulk onboarding — parsing and planning, with no database in sight.
 *
 * Admins get a roster from the bursar as a spreadsheet: a name, a class, the
 * subjects each child takes, and a guardian's phone number. Typing that in one
 * modal at a time is how a 400-student intake becomes a three-day job, and each
 * hand-typed row is a chance for the class, the subjects and the guardian link
 * to disagree with each other.
 *
 * This module turns a sheet into a plan. It is deliberately pure so that:
 *   • the browser can show the exact rows the server will accept, before
 *     anything is written;
 *   • the server can re-run the same rules on the payload it receives (a
 *     preview is not a promise — the request is what counts);
 *   • the rules are testable without a database.
 *
 * The failure modes it exists to catch, all of which happened in the manual
 * flow: a class name that matches nothing; a subject that exists at another
 * level (SS2 Physics handed to a JSS1 child); a guardian email shared by
 * siblings producing a second, duplicate parent account; and a re-import of the
 * same sheet creating every student twice.
 */

/** One column of the spreadsheet contract. `aliases` are matched after normalisation. */
export type ColumnSpec = {
  key:
    | "firstName"
    | "lastName"
    | "otherNames"
    | "gender"
    | "className"
    | "subjects"
    | "studentId"
    | "guardianName"
    | "guardianPhone"
    | "guardianEmail"
    | "studentEmail";
  label: string;
  required: boolean;
  aliases: string[];
  example: string;
};

export const STUDENT_IMPORT_COLUMNS: ColumnSpec[] = [
  {
    key: "firstName",
    label: "First name",
    required: true,
    aliases: ["first name", "firstname", "given name", "given names", "forename"],
    example: "Chidera",
  },
  {
    key: "lastName",
    label: "Surname",
    required: true,
    aliases: ["surname", "last name", "lastname", "family name"],
    example: "Okafor",
  },
  {
    key: "otherNames",
    label: "Other names",
    required: false,
    aliases: ["other names", "middlename", "middle name", "middle names"],
    example: "Ada",
  },
  {
    key: "gender",
    label: "Gender",
    required: false,
    aliases: ["sex", "gender"],
    example: "F",
  },
  {
    key: "className",
    label: "Class",
    required: true,
    aliases: [
      "class",
      "class name",
      "classname",
      "form",
      "grade",
      "year group",
      "class form",
      "form class",
      "class arm",
      "grade level",
    ],
    example: "JSS 1A",
  },
  {
    key: "subjects",
    label: "Subjects",
    required: false,
    aliases: ["subjects", "subject", "electives", "subject combination"],
    example: "Further Mathematics; Literature in English",
  },
  {
    key: "studentId",
    label: "Admission no.",
    required: false,
    aliases: ["admission no", "admission number", "student id", "reg no", "registration number"],
    example: "YKC/2026/0142",
  },
  {
    key: "guardianName",
    label: "Guardian name",
    required: false,
    aliases: ["guardian name", "parent name", "guardian", "parent"],
    example: "Ngozi Okafor",
  },
  {
    key: "guardianPhone",
    label: "Guardian phone",
    required: false,
    aliases: ["guardian phone", "parent phone", "phone", "phone number", "mobile"],
    example: "08031234567",
  },
  {
    key: "guardianEmail",
    label: "Guardian email",
    required: false,
    aliases: ["guardian email", "parent email", "email", "email address"],
    example: "ngozi.okafor@example.com",
  },
  {
    key: "studentEmail",
    label: "Student email",
    required: false,
    aliases: ["student email", "student e-mail", "learner email"],
    example: "chidera.okafor@ykaycollege.com",
  },
];

/** Normalise a header cell for alias matching: case, punctuation and spacing. */
export function normaliseHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_.\-/]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map the sheet's own header row onto our columns.
 *
 * Real sheets say "SURNAME", "Parent Phone No." and "Class/Form". Exact-match
 * only would reject all three, and the admin would be told their file is wrong
 * when the file is fine.
 */
export function mapHeaders(headers: string[]): {
  mapping: Partial<Record<ColumnSpec["key"], number>>;
  missing: ColumnSpec[];
  extra: string[];
} {
  const normalised = headers.map(normaliseHeader);
  const mapping: Partial<Record<ColumnSpec["key"], number>> = {};
  const used = new Set<number>();

  for (const column of STUDENT_IMPORT_COLUMNS) {
    const candidates = [column.label, ...column.aliases].map(normaliseHeader);
    const index = normalised.findIndex(
      (header, position) => !used.has(position) && candidates.includes(header),
    );
    if (index >= 0) {
      mapping[column.key] = index;
      used.add(index);
    }
  }

  // Second pass: prefixes, resolved longest-match-first.
  //
  // "Parent Phone No." and "Class/Form" are what people type; exact-match-only
  // would call a perfectly good sheet invalid. Longest-first matters: the
  // guardian-name alias "parent" would otherwise swallow "parent phone".
  const candidates: Array<{ key: ColumnSpec["key"]; index: number; score: number }> = [];
  for (const column of STUDENT_IMPORT_COLUMNS) {
    if (mapping[column.key] !== undefined) continue;
    const prefixes = [column.label, ...column.aliases]
      .map(normaliseHeader)
      .filter((candidate) => candidate.length >= 4);
    normalised.forEach((header, index) => {
      if (used.has(index) || !header) return;
      for (const prefix of prefixes) {
        if (header.startsWith(prefix)) {
          candidates.push({ key: column.key, index, score: prefix.length });
          break;
        }
      }
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    if (mapping[candidate.key] !== undefined || used.has(candidate.index)) continue;
    mapping[candidate.key] = candidate.index;
    used.add(candidate.index);
  }

  const extra = headers.filter((_, position) => !used.has(position));
  const missing = STUDENT_IMPORT_COLUMNS.filter(
    (column) => column.required && mapping[column.key] === undefined,
  );
  return { mapping, missing, extra };
}

export type RawStudentRow = Partial<Record<ColumnSpec["key"], string>> & {
  /** 1-based line number in the source sheet, so an error points at the row. */
  line: number;
};

export type ParseResult = {
  rows: RawStudentRow[];
  missing: ColumnSpec[];
  extraHeaders: string[];
  /** Problems with the file as a whole, e.g. no header row. */
  fileErrors: string[];
};

const MAX_ROWS = 5000;

/**
 * Parse CSV or TSV text.
 *
 * TSV matters more than it sounds: "copy the cells from Excel and paste them
 * here" is how this actually gets used, and Excel puts tab-separated text on the
 * clipboard. Papa Parse handles quoted fields, embedded newlines and a BOM.
 */
export function parseStudentSheet(text: string, delimiter?: string): ParseResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { rows: [], missing: [], extraHeaders: [], fileErrors: ["The sheet is empty."] };
  }

  const parsed = Papa.parse<string[]>(trimmed, {
    delimiter: delimiter ?? guessDelimiter(trimmed),
    skipEmptyLines: "greedy",
  });

  const table = (parsed.data ?? []).filter((row) => row.some((cell) => String(cell ?? "").trim()));
  if (!table.length) {
    return { rows: [], missing: [], extraHeaders: [], fileErrors: ["The sheet is empty."] };
  }

  const [headerRow, ...dataRows] = table;
  const headers = headerRow.map((cell) => String(cell ?? "").trim());
  const { mapping, missing, extra } = mapHeaders(headers);
  const fileErrors: string[] = [];
  if (missing.length) {
    fileErrors.push(
      `Missing required column(s): ${missing.map((column) => column.label).join(", ")}.`,
    );
  }
  if (dataRows.length > MAX_ROWS) {
    fileErrors.push(
      `That sheet has ${dataRows.length.toLocaleString()} rows; the limit is ${MAX_ROWS.toLocaleString()}. Split it into batches.`,
    );
  }

  const rows: RawStudentRow[] = dataRows.slice(0, MAX_ROWS).map((cells, index) => {
    const row: RawStudentRow = { line: index + 2 };
    for (const column of STUDENT_IMPORT_COLUMNS) {
      const columnIndex = mapping[column.key];
      if (columnIndex === undefined) continue;
      row[column.key] = String(cells[columnIndex] ?? "").trim();
    }
    return row;
  });

  return { rows, missing, extraHeaders: extra, fileErrors };
}

/** Tabs beat commas when a spreadsheet exported the clipboard; both are common. */
export function guessDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  if (tabs > commas && tabs >= semicolons) return "\t";
  if (semicolons > commas && semicolons > 0) return ";";
  return ",";
}

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

export type ImportClass = { id: string; displayName: string; level: string };
export type ImportSubject = { id: string; name: string; level: string; isCompulsory: boolean };
export type ExistingStudent = {
  firstName: string;
  lastName: string;
  guardianPhone: string | null;
  studentId: string;
};

export type ImportContext = {
  classes: ImportClass[];
  subjects: ImportSubject[];
  existing: ExistingStudent[];
};

export type PlannedRow = {
  line: number;
  student: {
    firstName: string;
    lastName: string;
    otherNames: string | null;
    displayName: string;
    gender: string | null;
    studentId: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
    guardianEmail: string | null;
    studentEmail: string | null;
  };
  classId: string | null;
  className: string | null;
  /** Subjects matched at the student's own level, plus the level's compulsories. */
  subjectIds: string[];
  subjectNames: string[];
  /** Names typed in the sheet that matched nothing at this level. */
  unknownSubjects: string[];
  /** `create` writes a new student; `skip` is a duplicate already on the roster. */
  action: "create" | "skip";
  reason?: string;
  errors: string[];
  warnings: string[];
};

export type ImportPlan = {
  rows: PlannedRow[];
  totals: {
    total: number;
    create: number;
    skip: number;
    invalid: number;
    warnings: number;
    parentsToCreate: number;
    newSubjectsNeeded: string[];
  };
};

const NAME_MIN = 2;

function cleanName(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

/** Split the subjects cell: semicolons, commas and pipes are all used in the wild. */
export function splitSubjects(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[;,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normaliseSubjectName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function digitsOnly(value: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Class lookup: id, exact display name, or the level ("SS2") when unambiguous. */
export function findClass(
  classes: ImportClass[],
  raw: string,
): { class?: ImportClass; error?: string } {
  const wanted = raw.trim();
  if (!wanted) return { error: "Class is required." };

  const byId = classes.find((entry) => entry.id === wanted);
  if (byId) return { class: byId };

  const folded = wanted.toLowerCase().replace(/\s+/g, "");
  const exact = classes.filter(
    (entry) => entry.displayName.toLowerCase().replace(/\s+/g, "") === folded,
  );
  if (exact.length === 1) return { class: exact[0] };
  if (exact.length > 1) {
    return {
      error: `"${wanted}" matches ${exact.length} classes (${exact
        .map((entry) => entry.displayName)
        .join(", ")}). Use the exact class name.`,
    };
  }

  const byLevel = classes.filter(
    (entry) => entry.level.replace(/\s+/g, "").toLowerCase() === folded,
  );
  if (byLevel.length === 1) return { class: byLevel[0] };
  if (byLevel.length > 1) {
    return {
      error: `"${wanted}" is a level with ${byLevel.length} arms (${byLevel
        .map((entry) => entry.displayName)
        .join(", ")}). Put the arm in the Class column.`,
    };
  }

  const loose = classes.filter((entry) =>
    entry.displayName.toLowerCase().replace(/\s+/g, "").includes(folded),
  );
  if (loose.length === 1) return { class: loose[0] };

  return {
    error: `No class called "${wanted}". Known classes: ${classes
      .map((entry) => entry.displayName)
      .join(", ")}.`,
  };
}

/**
 * Turn raw rows into a per-row plan.
 *
 * Rules, in the order they matter:
 *   1. A row that cannot be resolved to a real class is an error, never a
 *      guess — a student in the wrong class gets the wrong timetable, the
 *      wrong subjects and the wrong exams.
 *   2. Subjects are matched only at the student's own class level. "Physics"
 *      typed for a JSS 1 child is reported, not silently attached.
 *   3. The level's COMPULSORY subjects are always attached. An admin's sheet
 *      that omits the column must not leave a child un-enrolled from Maths.
 *   4. A student who is already on the roster (same name + same guardian
 *      phone, or the same admission number) is skipped, so re-importing a
 *      corrected sheet does not duplicate the class.
 */
export function planStudentImport(rows: RawStudentRow[], context: ImportContext): ImportPlan {
  const planned: PlannedRow[] = [];
  const unknownSubjects = new Set<string>();
  const guardians = new Set<string>();

  const existingKeys = new Set(
    context.existing.map((student) =>
      [
        student.firstName.toLowerCase().trim(),
        student.lastName.toLowerCase().trim(),
        digitsOnly(student.guardianPhone),
      ].join("|"),
    ),
  );
  const existingIds = new Set(
    context.existing.map((student) => student.studentId.toLowerCase().trim()).filter(Boolean),
  );
  // Duplicates *within* the same sheet are just as damaging as duplicates
  // against the roster: pasting the same block twice is an easy mistake.
  const seenInFile = new Map<string, number>();

  for (const row of rows) {
    const errors: string[] = [];
    const warnings: string[] = [];

    const firstName = cleanName(row.firstName);
    const lastName = cleanName(row.lastName);
    const otherNames = cleanName(row.otherNames) || null;

    if (firstName.length < NAME_MIN) errors.push("First name is missing or too short.");
    if (lastName.length < NAME_MIN) errors.push("Surname is missing or too short.");

    const resolved = findClass(context.classes, row.className ?? "");
    if (resolved.error) errors.push(resolved.error);

    const guardianEmail = (row.guardianEmail ?? "").trim().toLowerCase();
    if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      errors.push(`"${guardianEmail}" is not a valid guardian email.`);
    }
    const studentEmail = (row.studentEmail ?? "").trim().toLowerCase();
    if (studentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      errors.push(`"${studentEmail}" is not a valid student email.`);
    }
    const guardianPhone = (row.guardianPhone ?? "").trim();
    if (!guardianPhone) {
      warnings.push("No guardian phone: duplicate detection and the parent portal will be weaker.");
    }

    const subjectIds: string[] = [];
    const subjectNames: string[] = [];
    const unknownForRow: string[] = [];
    if (resolved.class) {
      const level = resolved.class.level;
      const atLevel = context.subjects.filter(
        (subject) =>
          subject.level.replace(/\s+/g, "").toLowerCase() ===
          level.replace(/\s+/g, "").toLowerCase(),
      );
      // 3. Compulsory subjects, always.
      for (const subject of atLevel.filter((entry) => entry.isCompulsory)) {
        subjectIds.push(subject.id);
        subjectNames.push(subject.name);
      }
      // 2. Named electives, resolved at this level only.
      for (const requested of splitSubjects(row.subjects)) {
        const wanted = normaliseSubjectName(requested);
        const match = atLevel.find((subject) => normaliseSubjectName(subject.name) === wanted);
        if (!match) {
          unknownForRow.push(requested);
          unknownSubjects.add(`${resolved.class.level}: ${requested}`);
          continue;
        }
        if (!subjectIds.includes(match.id)) {
          subjectIds.push(match.id);
          subjectNames.push(match.name);
        }
      }
    }

    const displayName = [firstName, otherNames, lastName].filter(Boolean).join(" ");
    const duplicateKey = [
      firstName.toLowerCase(),
      lastName.toLowerCase(),
      digitsOnly(guardianPhone),
    ].join("|");
    const admissionNumber = (row.studentId ?? "").trim();

    let action: PlannedRow["action"] = "create";
    let reason: string | undefined;
    if (!errors.length) {
      if (admissionNumber && existingIds.has(admissionNumber.toLowerCase())) {
        action = "skip";
        reason = `Admission number ${admissionNumber} is already on the roster.`;
      } else if (existingKeys.has(duplicateKey) && firstName && lastName) {
        action = "skip";
        reason = `${displayName || "This student"} plus that guardian phone is already on the roster.`;
      } else if (seenInFile.has(duplicateKey)) {
        action = "skip";
        reason = `Also on line ${seenInFile.get(duplicateKey)} of this sheet; importing it once.`;
      } else {
        seenInFile.set(duplicateKey, row.line);
      }
      if (action === "create" && guardianEmail) guardians.add(guardianEmail);
    }

    if (unknownForRow.length) {
      warnings.push(
        `Not a ${resolved.class?.level ?? "class"}-level subject, so not attached: ${unknownForRow.join(", ")}.`,
      );
    }

    planned.push({
      line: row.line,
      student: {
        firstName,
        lastName,
        otherNames,
        displayName,
        gender: (row.gender ?? "").trim() || null,
        studentId: admissionNumber || null,
        guardianName: cleanName(row.guardianName) || null,
        guardianPhone: guardianPhone || null,
        guardianEmail: guardianEmail || null,
        studentEmail: studentEmail || null,
      },
      classId: resolved.class?.id ?? null,
      className: resolved.class?.displayName ?? null,
      subjectIds,
      subjectNames,
      unknownSubjects: unknownForRow,
      action,
      reason,
      errors,
      warnings,
    });
  }

  return {
    rows: planned,
    totals: {
      total: planned.length,
      create: planned.filter((row) => !row.errors.length && row.action === "create").length,
      skip: planned.filter((row) => !row.errors.length && row.action === "skip").length,
      invalid: planned.filter((row) => row.errors.length > 0).length,
      warnings: planned.filter((row) => row.warnings.length > 0).length,
      parentsToCreate: guardians.size,
      newSubjectsNeeded: [...unknownSubjects].sort(),
    },
  };
}

/** A ready-to-fill template, so the first import is not a guessing game. */
export function studentTemplateCsv(): string {
  const header = STUDENT_IMPORT_COLUMNS.map((column) => column.label);
  const examples = STUDENT_IMPORT_COLUMNS.map((column) => column.example);
  const second = STUDENT_IMPORT_COLUMNS.map((column) => {
    if (column.key === "firstName") return "Ifeanyi";
    if (column.key === "lastName") return "Okafor";
    if (column.key === "otherNames") return "";
    if (column.key === "gender") return "M";
    if (column.key === "className") return "JSS 1A";
    if (column.key === "subjects") return "French";
    if (column.key === "studentId") return "YKC/2026/0143";
    if (column.key === "guardianName") return "Ngozi Okafor";
    if (column.key === "guardianPhone") return "08031234567";
    if (column.key === "guardianEmail") return "ngozi.okafor@example.com";
    return "";
  });
  return Papa.unparse([header, examples, second]);
}

/** The import result as a CSV the admin can keep or email to the bursar. */
export function resultsCsv(
  rows: Array<{
    line: number;
    name: string;
    className: string;
    status: string;
    detail: string;
    studentNumber?: string;
    subjects?: string;
  }>,
): string {
  return Papa.unparse([
    ["Line", "Student", "Class", "Status", "Detail", "Admission no.", "Subjects"],
    ...rows.map((row) => [
      row.line,
      row.name,
      row.className,
      row.status,
      row.detail,
      row.studentNumber ?? "",
      row.subjects ?? "",
    ]),
  ]);
}
