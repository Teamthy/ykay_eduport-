import { describe, expect, it } from "vitest";
import {
  findClass,
  mapHeaders,
  parseStudentSheet,
  planStudentImport,
  splitSubjects,
  studentTemplateCsv,
  type ImportContext,
} from "@/lib/student-import";

/**
 * Bulk onboarding turns one spreadsheet into a whole class. The rules that
 * matter are the ones that would put a child in the wrong place: the class they
 * are filed under, the subjects they are enrolled in, and whether a second
 * import of the same sheet creates them twice.
 *
 * All of this is pure — no database — so the browser can show the same plan the
 * server will act on.
 */

const CONTEXT: ImportContext = {
  classes: [
    { id: "cls_jss1a", displayName: "JSS 1A", level: "JSS1" },
    { id: "cls_jss1b", displayName: "JSS 1B", level: "JSS1" },
    { id: "cls_ss1", displayName: "SS 1 Science", level: "SS1" },
  ],
  subjects: [
    { id: "sub_maths", name: "Mathematics", level: "JSS1", isCompulsory: true },
    { id: "sub_english", name: "English Language", level: "JSS1", isCompulsory: true },
    { id: "sub_french", name: "French", level: "JSS1", isCompulsory: false },
    { id: "sub_physics", name: "Physics", level: "SS1", isCompulsory: false },
  ],
  existing: [],
};

const HEADER =
  "First name,Surname,Other names,Gender,Class,Subjects,Admission no.,Guardian name,Guardian phone,Guardian email";

function sheet(...rows: string[]) {
  return parseStudentSheet([HEADER, ...rows].join("\n"));
}

describe("student import — reading the sheet", () => {
  it("maps the headers a real school actually writes", () => {
    const { mapping, missing } = mapHeaders([
      "SURNAME",
      "First Name",
      "Class/Form",
      "Parent Phone No.",
      "Parent Email",
    ]);

    expect(missing.map((column) => column.label)).toEqual([]);
    expect(mapping.lastName).toBe(0);
    expect(mapping.firstName).toBe(1);
    expect(mapping.className).toBe(2);
    expect(mapping.guardianPhone).toBe(3);
    expect(mapping.guardianEmail).toBe(4);
  });

  it("reports a missing required column instead of importing nameless rows", () => {
    const result = parseStudentSheet("Surname,Class\nOkafor,JSS 1A");
    expect(result.fileErrors.join(" ")).toMatch(/First name/);
  });

  it("reads tab-separated text, which is what Excel puts on the clipboard", () => {
    const pasted = ["First name\tSurname\tClass", "Chidera\tOkafor\tJSS 1A"].join("\n");
    const result = parseStudentSheet(pasted);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      firstName: "Chidera",
      lastName: "Okafor",
      className: "JSS 1A",
    });
  });

  it("handles quoted commas inside a name", () => {
    const result = sheet('"Okafor, Jr",Chidera,F,JSS 1A');
    // First name is first in our contract, so this row is "last name missing" —
    // the point is that the quoted field stayed one field.
    expect(result.rows[0].firstName).toBe("Okafor, Jr");
    expect(result.rows[0].lastName).toBe("Chidera");
  });

  it("keeps line numbers so an error points at the row in the sheet", () => {
    const result = sheet("Chidera,Okafor,F,JSS 1A", "Ifeanyi,Okafor,M,JSS 1A");
    expect(result.rows.map((row) => row.line)).toEqual([2, 3]);
  });

  it("splits a subjects cell written with commas, semicolons or pipes", () => {
    expect(splitSubjects("French; Fine Art")).toEqual(["French", "Fine Art"]);
    expect(splitSubjects("French|Arabic")).toEqual(["French", "Arabic"]);
    expect(splitSubjects("")).toEqual([]);
  });

  it("ships a template whose header the importer accepts", () => {
    const template = studentTemplateCsv();
    const parsed = parseStudentSheet(template);
    expect(parsed.missing).toEqual([]);
    expect(parsed.rows.length).toBeGreaterThan(0);
  });
});

describe("student import — resolving the class", () => {
  it("matches a class name ignoring case and spacing", () => {
    expect(findClass(CONTEXT.classes, "jss 1a").class?.id).toBe("cls_jss1a");
    expect(findClass(CONTEXT.classes, "JSS1A").class?.id).toBe("cls_jss1a");
  });

  it("accepts a level when exactly one class has it", () => {
    expect(findClass(CONTEXT.classes, "SS1").class?.id).toBe("cls_ss1");
  });

  it("refuses a level with several arms instead of guessing one", () => {
    const { error } = findClass(CONTEXT.classes, "JSS1");
    expect(error).toMatch(/2 arms/);
    expect(error).toMatch(/JSS 1A, JSS 1B/);
  });

  it("lists the known classes when nothing matches", () => {
    const { error } = findClass(CONTEXT.classes, "Year 9");
    expect(error).toMatch(/No class called "Year 9"/);
    expect(error).toMatch(/SS 1 Science/);
  });
});

describe("student import — planning a class", () => {
  it("routes a student to the class, the level's compulsory subjects and the named elective", () => {
    const plan = planStudentImport(sheet("Chidera,Okafor,Ada,F,JSS 1A,French").rows, CONTEXT);
    const row = plan.rows[0];

    expect(row.errors).toEqual([]);
    expect(row.classId).toBe("cls_jss1a");
    expect(row.subjectNames).toEqual(["Mathematics", "English Language", "French"]);
    expect(plan.totals.create).toBe(1);
  });

  it("never attaches a subject from another level", () => {
    const plan = planStudentImport(sheet("Chidera,Okafor,Ada,F,JSS 1A,Physics").rows, CONTEXT);
    const row = plan.rows[0];

    expect(row.subjectNames).not.toContain("Physics");
    expect(row.subjectNames).toContain("Mathematics");
    expect(row.warnings.join(" ")).toMatch(/Not a JSS1-level subject.*Physics/);
    expect(plan.totals.newSubjectsNeeded).toContain("JSS1: Physics");
  });

  it("marks a row with an unknown class invalid rather than enrolling it somewhere", () => {
    const plan = planStudentImport(sheet("Chidera,Okafor,Ada,F,Year 9").rows, CONTEXT);
    expect(plan.rows[0].errors.join(" ")).toMatch(/No class called/);
    expect(plan.rows[0].classId).toBeNull();
    expect(plan.totals.invalid).toBe(1);
    expect(plan.totals.create).toBe(0);
  });

  it("rejects a guardian email that could never receive a login", () => {
    const plan = planStudentImport(
      sheet("Chidera,Okafor,Ada,F,JSS 1A,,,Ngozi Okafor,08031234567,not-an-email").rows,
      CONTEXT,
    );
    expect(plan.rows[0].errors.join(" ")).toMatch(/not a valid guardian email/);
  });

  it("skips a student already on the roster with the same guardian phone", () => {
    const plan = planStudentImport(sheet("Chidera,Okafor,Ada,F,JSS 1A,,,Ngozi,08031234567").rows, {
      ...CONTEXT,
      existing: [
        {
          firstName: "Chidera",
          lastName: "Okafor",
          guardianPhone: "0803 123 4567",
          studentId: "YKC/1",
        },
      ],
    });
    expect(plan.rows[0].action).toBe("skip");
    expect(plan.rows[0].reason).toMatch(/already on the roster/i);
    expect(plan.totals.skip).toBe(1);
  });

  it("skips a student whose admission number is already taken", () => {
    const plan = planStudentImport(sheet("Someone,Else,,F,JSS 1A,,YKC/2026/0142").rows, {
      ...CONTEXT,
      existing: [
        { firstName: "Other", lastName: "Person", guardianPhone: null, studentId: "YKC/2026/0142" },
      ],
    });
    expect(plan.rows[0].action).toBe("skip");
    expect(plan.rows[0].reason).toMatch(/Admission number/);
  });

  it("catches the same student pasted twice in one sheet", () => {
    const plan = planStudentImport(
      sheet(
        "Chidera,Okafor,Ada,F,JSS 1A,,,Ngozi,08031234567",
        "Chidera,Okafor,Ada,F,JSS 1A,,,Ngozi,08031234567",
      ).rows,
      CONTEXT,
    );
    expect(plan.rows[0].action).toBe("create");
    expect(plan.rows[1].action).toBe("skip");
    expect(plan.rows[1].reason).toMatch(/line 2/);
  });

  it("counts distinct guardian emails, because siblings share one parent account", () => {
    const plan = planStudentImport(
      sheet(
        "Chidera,Okafor,Ada,F,JSS 1A,,,Ngozi,08031234567,ngozi@example.com",
        "Ifeanyi,Okafor,,M,JSS 1A,,,Ngozi,08031234567,ngozi@example.com",
        "Zainab,Bello,,F,JSS 1B,,,Musa,08039876543,musa@example.com",
      ).rows,
      CONTEXT,
    );
    expect(plan.totals.create).toBe(3);
    expect(plan.totals.parentsToCreate).toBe(2);
  });

  it("warns, but does not fail, when there is no guardian phone", () => {
    const plan = planStudentImport(sheet("Chidera,Okafor,Ada,F,JSS 1A").rows, CONTEXT);
    expect(plan.rows[0].errors).toEqual([]);
    expect(plan.rows[0].warnings.join(" ")).toMatch(/No guardian phone/);
  });
});
