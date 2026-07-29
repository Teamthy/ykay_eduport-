/**
 * Ykay College — self-contained practice question bank.
 * Works fully offline; no backend/teacher setup needed.
 * WAEC/SSCE-style questions across core subjects.
 */

export type Difficulty = "easy" | "medium" | "hard";

export interface PracticeQuestion {
  id: string;
  subject: string;
  difficulty: Difficulty;
  question: string;
  options: { key: string; text: string }[];
  correct: string; // option key
  explanation: string;
}

export interface PracticeSubject {
  id: string;
  name: string;
  icon: string; // emoji
  color: string;
  questions: PracticeQuestion[];
}

export const PRACTICE_SUBJECTS: PracticeSubject[] = [
  {
    id: "mathematics",
    name: "Mathematics",
    icon: "📐",
    color: "#4EC54D",
    questions: [
      { id: "m1", subject: "Mathematics", difficulty: "easy", question: "Solve for x:  2x + 5 = 15", options: [{ key: "a", text: "x = 3" }, { key: "b", text: "x = 5" }, { key: "c", text: "x = 7" }, { key: "d", text: "x = 10" }], correct: "b", explanation: "2x + 5 = 15 → 2x = 10 → x = 5." },
      { id: "m2", subject: "Mathematics", difficulty: "medium", question: "Factorise:  x² − 5x + 6", options: [{ key: "a", text: "(x−1)(x−6)" }, { key: "b", text: "(x−2)(x−3)" }, { key: "c", text: "(x+2)(x+3)" }, { key: "d", text: "(x−1)(x−5)" }], correct: "b", explanation: "x² − 5x + 6 = (x−2)(x−3)." },
      { id: "m3", subject: "Mathematics", difficulty: "easy", question: "What is the area of a circle of radius 7 cm? (π = 22/7)", options: [{ key: "a", text: "44 cm²" }, { key: "b", text: "154 cm²" }, { key: "c", text: "196 cm²" }, { key: "d", text: "308 cm²" }], correct: "b", explanation: "A = πr² = 22/7 × 49 = 154 cm²." },
      { id: "m4", subject: "Mathematics", difficulty: "medium", question: "Find the mean of 4, 7, 8, 11, 15.", options: [{ key: "a", text: "7" }, { key: "b", text: "8" }, { key: "c", text: "9" }, { key: "d", text: "11" }], correct: "c", explanation: "Mean = (4+7+8+11+15)/5 = 45/5 = 9." },
      { id: "m5", subject: "Mathematics", difficulty: "hard", question: "Evaluate log₁₀ 1000.", options: [{ key: "a", text: "2" }, { key: "b", text: "3" }, { key: "c", text: "10" }, { key: "d", text: "100" }], correct: "b", explanation: "log₁₀ 1000 = log₁₀ 10³ = 3." },
    ],
  },
  {
    id: "english",
    name: "English Language",
    icon: "📖",
    color: "#FF9133",
    questions: [
      { id: "e1", subject: "English Language", difficulty: "easy", question: "Choose the correctly spelled word.", options: [{ key: "a", text: "Accomodation" }, { key: "b", text: "Acommodation" }, { key: "c", text: "Accommodation" }, { key: "d", text: "Acomodation" }], correct: "c", explanation: "“Accommodation” has double c and double m." },
      { id: "e2", subject: "English Language", difficulty: "easy", question: "Identify the noun in: “The teacher gave a lecture.”", options: [{ key: "a", text: "gave" }, { key: "b", text: "a" }, { key: "c", text: "lecture" }, { key: "d", text: "the" }], correct: "c", explanation: "“Lecture” is a noun (a thing)." },
      { id: "e3", subject: "English Language", difficulty: "medium", question: "Choose the antonym of “benevolent”.", options: [{ key: "a", text: "Kind" }, { key: "b", text: "Generous" }, { key: "c", text: "Malevolent" }, { key: "d", text: "Gentle" }], correct: "c", explanation: "“Malevolent” means wishing harm — the opposite of benevolent." },
      { id: "e4", subject: "English Language", difficulty: "medium", question: "“She is good ___ mathematics.” Choose the correct preposition.", options: [{ key: "a", text: "in" }, { key: "b", text: "at" }, { key: "c", text: "on" }, { key: "d", text: "with" }], correct: "b", explanation: "“Good at” is the correct collocation for a skill." },
      { id: "e5", subject: "English Language", difficulty: "hard", question: "Which sentence is in the passive voice?", options: [{ key: "a", text: "He wrote the letter." }, { key: "b", text: "The letter was written by him." }, { key: "c", text: "He is writing a letter." }, { key: "d", text: "He writes letters." }], correct: "b", explanation: "“The letter was written by him” is passive (subject receives the action)." },
    ],
  },
  {
    id: "biology",
    name: "Biology",
    icon: "🧬",
    color: "#3B82F6",
    questions: [
      { id: "b1", subject: "Biology", difficulty: "easy", question: "Which organelle is the “powerhouse” of the cell?", options: [{ key: "a", text: "Nucleus" }, { key: "b", text: "Ribosome" }, { key: "c", text: "Mitochondria" }, { key: "d", text: "Vacuole" }], correct: "c", explanation: "Mitochondria generate ATP — the cell’s energy." },
      { id: "b2", subject: "Biology", difficulty: "easy", question: "Plants make food through which process?", options: [{ key: "a", text: "Respiration" }, { key: "b", text: "Photosynthesis" }, { key: "c", text: "Transpiration" }, { key: "d", text: "Digestion" }], correct: "b", explanation: "Photosynthesis converts sunlight, CO₂ and water into glucose." },
      { id: "b3", subject: "Biology", difficulty: "medium", question: "Which blood cells fight infection?", options: [{ key: "a", text: "Red blood cells" }, { key: "b", text: "Platelets" }, { key: "c", text: "White blood cells" }, { key: "d", text: "Plasma" }], correct: "c", explanation: "White blood cells (leucocytes) defend against pathogens." },
      { id: "b4", subject: "Biology", difficulty: "hard", question: "The basic unit of heredity is the…", options: [{ key: "a", text: "Chromosome" }, { key: "b", text: "Gene" }, { key: "c", text: "Allele" }, { key: "d", text: "Nucleotide" }], correct: "b", explanation: "A gene is the basic unit of heredity, made of DNA." },
    ],
  },
  {
    id: "civic",
    name: "Civic Education",
    icon: "🇳🇬",
    color: "#62D35E",
    questions: [
      { id: "c1", subject: "Civic Education", difficulty: "easy", question: "How many states are in Nigeria?", options: [{ key: "a", text: "30" }, { key: "b", text: "36" }, { key: "c", text: "37" }, { key: "d", text: "40" }], correct: "b", explanation: "Nigeria has 36 states plus the Federal Capital Territory, Abuja." },
      { id: "c2", subject: "Civic Education", difficulty: "easy", question: "The national assembly of Nigeria is…", options: [{ key: "a", text: "Unicameral" }, { key: "b", text: "Bicameral" }, { key: "c", text: "Tricameral" }, { key: "d", text: "Non-partisan" }], correct: "b", explanation: "It is bicameral — the Senate and the House of Representatives." },
      { id: "c3", subject: "Civic Education", difficulty: "medium", question: "Which of these is a fundamental human right?", options: [{ key: "a", text: "Right to drive" }, { key: "b", text: "Right to life" }, { key: "c", text: "Right to a phone" }, { key: "d", text: "Right to vote early" }], correct: "b", explanation: "Right to life is a fundamental human right." },
    ],
  },
];

export const ALL_PRACTICE_QUESTIONS = PRACTICE_SUBJECTS.flatMap((s) => s.questions);
