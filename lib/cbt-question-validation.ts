import { z } from "zod";
import { CBT_CLASS_LEVELS } from "@/lib/cbt-question-levels";

const optionSchema = z.string().trim().min(1).max(1000);
const termSchema = z.enum(["first", "second", "third"]).nullable().optional();

export const cbtQuestionDraftSchema = z
  .object({
    subjectSlug: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
    subjectName: z.string().trim().min(2).max(120),
    classLevel: z.enum(CBT_CLASS_LEVELS),
    department: z.string().trim().min(1).max(60).optional(),
    topic: z.string().trim().min(2).max(120),
    term: termSchema,
    week: z.coerce.number().int().min(1).max(52).nullable().optional(),
    difficulty: z.coerce.number().int().min(1).max(3).default(2),
    stem: z.string().trim().min(5).max(4000),
    options: z.array(optionSchema).length(4),
    correctIndex: z.coerce.number().int().min(0).max(3),
    explanation: z.string().trim().min(40).max(4000),
    source: z.string().trim().min(1).max(120).default("original-draft"),
  })
  .refine((question) => question.week == null || question.term != null, {
    path: ["week"],
    message: "A week assignment requires a verified term assignment.",
  });

export const cbtQuestionEditableSchema = z
  .object({
    topic: z.string().trim().min(2).max(120),
    term: termSchema,
    week: z.coerce.number().int().min(1).max(52).nullable().optional(),
    difficulty: z.coerce.number().int().min(1).max(3),
    stem: z.string().trim().min(5).max(4000),
    options: z.array(optionSchema).length(4),
    correctIndex: z.coerce.number().int().min(0).max(3),
    explanation: z.string().trim().min(40).max(4000),
    source: z.string().trim().min(1).max(120),
  })
  .refine((question) => question.week == null || question.term != null, {
    path: ["week"],
    message: "A week assignment requires a verified term assignment.",
  });

export function haveDistinctOptions(options: string[]) {
  return new Set(options.map((option) => option.trim().toLocaleLowerCase())).size === 4;
}
