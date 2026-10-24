import { computeEntryTotals, SCORE_LIMITS, type ScoreField } from "@/lib/gradebook";

export const GRADEBOOK_COMPONENTS = ["CA1", "CA2", "MIDTERM", "ASSIGNMENT", "EXAM"] as const;
export type GradebookComponent = (typeof GRADEBOOK_COMPONENTS)[number];

type ComponentTarget = { field: ScoreField; maximum: number };

const COMPONENT_TARGETS: Record<GradebookComponent, ComponentTarget> = {
  CA1: { field: "ca1", maximum: SCORE_LIMITS.ca1 },
  CA2: { field: "ca2", maximum: SCORE_LIMITS.ca2 },
  MIDTERM: { field: "midterm", maximum: SCORE_LIMITS.midterm },
  ASSIGNMENT: { field: "assignment", maximum: SCORE_LIMITS.assignment },
  EXAM: { field: "exam", maximum: SCORE_LIMITS.exam },
};

export function gradebookFieldForComponent(component: GradebookComponent): ScoreField {
  return COMPONENT_TARGETS[component].field;
}

export function isGradebookComponent(value: string | null): value is GradebookComponent {
  return Boolean(value && GRADEBOOK_COMPONENTS.includes(value as GradebookComponent));
}

/** Scale server-graded exam marks to the configured cumulative gradebook slot. */
export function scaleExamScoreToComponent(
  score: number,
  totalMarks: number,
  component: GradebookComponent,
) {
  if (!Number.isFinite(score) || !Number.isFinite(totalMarks) || totalMarks <= 0) {
    throw new RangeError("An exam score must have a finite, positive total mark.");
  }
  if (score < 0 || score > totalMarks) {
    throw new RangeError("The exam score is outside the assessment's marks.");
  }
  return Math.round((score / totalMarks) * COMPONENT_TARGETS[component].maximum);
}

/** Preserve the other cumulative components while recomputing total and grade. */
export function mergeExamScoreIntoGradebook(
  existing: Record<ScoreField, number>,
  score: number,
  totalMarks: number,
  component: GradebookComponent,
) {
  const target = COMPONENT_TARGETS[component];
  const componentScore = scaleExamScoreToComponent(score, totalMarks, component);
  return computeEntryTotals({ ...existing, [target.field]: componentScore });
}

/** Restore a saved pre-sync component value during a guarded unrelease. */
export function restoreGradebookComponent(
  existing: Record<ScoreField, number>,
  previousValue: number,
  component: GradebookComponent,
) {
  const target = COMPONENT_TARGETS[component];
  if (!Number.isInteger(previousValue) || previousValue < 0 || previousValue > target.maximum) {
    throw new RangeError("The saved gradebook component value is invalid.");
  }
  return computeEntryTotals({ ...existing, [target.field]: previousValue });
}
