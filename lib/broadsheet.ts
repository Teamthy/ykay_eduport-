/**
 * Class broadsheet assembly.
 *
 * A broadsheet is a one-page record of ONE class in ONE term. The route used to
 * read every report card ever issued against the class's name and then keep the
 * newest per student, which quietly mixed terms: a student who had been graded
 * in Term 1 and Term 3 appeared once, with whichever card happened to be newer,
 * while their classmates appeared with the other term's marks. The averages were
 * then computed across that mixture, so the class average was an average of
 * different terms.
 *
 * Everything here is pure so the mixing rules can be tested without a database:
 * the route supplies rows, `pickPeriod` decides which term is on screen, and
 * `buildBroadsheet` only ever sees one term's cards.
 */

export type BroadsheetReport = {
  reportNumber: string;
  sessionLabel: string;
  termLabel: string;
  status: string;
  overallAverage: number;
  overallGrade: string;
  classPosition: string | null;
  generatedAt: Date | string;
  student: { id: string; studentId: string; displayName: string };
  subjects: Array<{ subject: string; total: number }>;
};

export type BroadsheetPeriod = {
  sessionLabel: string;
  termLabel: string;
  /** How many students have a card in this period. */
  studentCount: number;
  /** Newest card in the period, so the UI can say how fresh it is. */
  generatedAt: string;
};

export type BroadsheetStudent = {
  studentId: string;
  displayName: string;
  reportNumber: string;
  status: string;
  overallAverage: number;
  overallGrade: string;
  classPosition: string | null;
  subjects: Record<string, number>;
};

export type Broadsheet = {
  className: string;
  sessionLabel: string;
  termLabel: string;
  subjectNames: string[];
  students: BroadsheetStudent[];
  subjectAverages: Array<{ subject: string; average: number }>;
  classAverage: number;
};

export function periodKey(sessionLabel: string, termLabel: string): string {
  return `${sessionLabel}\u0000${termLabel}`;
}

/** Every (session, term) present in the cards, newest first. */
export function listPeriods(reports: BroadsheetReport[]): BroadsheetPeriod[] {
  const periods = new Map<string, { period: BroadsheetPeriod; students: Set<string> }>();

  for (const report of reports) {
    const key = periodKey(report.sessionLabel, report.termLabel);
    const generatedAt = new Date(report.generatedAt).toISOString();
    const entry = periods.get(key);
    if (!entry) {
      periods.set(key, {
        period: {
          sessionLabel: report.sessionLabel,
          termLabel: report.termLabel,
          studentCount: 0,
          generatedAt,
        },
        students: new Set([report.student.id]),
      });
      continue;
    }
    entry.students.add(report.student.id);
    if (generatedAt > entry.period.generatedAt) entry.period.generatedAt = generatedAt;
  }

  return [...periods.values()]
    .map((entry) => ({ ...entry.period, studentCount: entry.students.size }))
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

/**
 * The period to show: the caller's choice when it exists, otherwise the newest.
 * A stale bookmark must not render an empty page with no explanation, so an
 * unknown request falls back instead of erroring.
 */
export function pickPeriod(
  periods: BroadsheetPeriod[],
  requested?: { session?: string | null; term?: string | null },
): BroadsheetPeriod | null {
  if (!periods.length) return null;
  if (requested?.session && requested?.term) {
    const match = periods.find(
      (period) => period.sessionLabel === requested.session && period.termLabel === requested.term,
    );
    if (match) return match;
  }
  return periods[0];
}

export function reportsForPeriod(
  reports: BroadsheetReport[],
  period: BroadsheetPeriod | null,
): BroadsheetReport[] {
  if (!period) return [];
  return reports.filter(
    (report) =>
      report.sessionLabel === period.sessionLabel && report.termLabel === period.termLabel,
  );
}

/**
 * One card per student. Regenerating a class reissues cards, so duplicates are
 * normal — the newest wins, which is why the query orders by generatedAt desc.
 */
export function latestPerStudent(reports: BroadsheetReport[]): BroadsheetReport[] {
  const latest = new Map<string, BroadsheetReport>();
  for (const report of reports) {
    const existing = latest.get(report.student.id);
    if (!existing || new Date(report.generatedAt) > new Date(existing.generatedAt)) {
      latest.set(report.student.id, report);
    }
  }
  return [...latest.values()];
}

/** Rank order: highest average first, name as the tie-break so it is stable. */
function compareStudents(a: BroadsheetStudent, b: BroadsheetStudent): number {
  if (b.overallAverage !== a.overallAverage) return b.overallAverage - a.overallAverage;
  return a.displayName.localeCompare(b.displayName);
}

export function buildBroadsheet(className: string, reports: BroadsheetReport[]): Broadsheet | null {
  const cards = latestPerStudent(reports);
  if (!cards.length) return null;

  const subjectNames = [
    ...new Set(cards.flatMap((report) => report.subjects.map((subject) => subject.subject))),
  ].sort((a, b) => a.localeCompare(b));

  const students: BroadsheetStudent[] = cards
    .map((report) => ({
      studentId: report.student.studentId,
      displayName: report.student.displayName,
      reportNumber: report.reportNumber,
      status: report.status,
      overallAverage: report.overallAverage,
      overallGrade: report.overallGrade,
      classPosition: report.classPosition,
      subjects: Object.fromEntries(
        report.subjects.map((subject) => [subject.subject, subject.total]),
      ),
    }))
    .sort(compareStudents);

  // Subject averages are taken over the students who actually took the subject:
  // treating a missing score as zero dragged the average of every elective down
  // and made the column meaningless.
  const subjectAverages = subjectNames.map((subject) => {
    const scores = students
      .map((student) => student.subjects[subject])
      .filter((score): score is number => typeof score === "number");
    return {
      subject,
      average: scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0,
    };
  });

  const classAverage = Math.round(
    students.reduce((sum, student) => sum + student.overallAverage, 0) / students.length,
  );

  return {
    className,
    sessionLabel: cards[0].sessionLabel,
    termLabel: cards[0].termLabel,
    subjectNames,
    students,
    subjectAverages,
    classAverage,
  };
}
