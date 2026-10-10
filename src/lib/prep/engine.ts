// Adaptive practice engine. Each task type has a rating (like a chess rating) that rises with correct answers
// and falls with wrong ones; the next item's difficulty is chosen so the student succeeds about 70% of the time.
// Everything is computed on the student's device; nothing is sent anywhere.
import { generateEquations, type EquationItem } from "./equations.ts";
import { generateLatin, type LatinItem } from "./latin.ts";
import { generateFigures, type FigureItem } from "./figures.ts";
import { generateSubject, type SubjectItem } from "./subject.ts";

export type TaskType = "figures" | "equations" | "latin" | "subject";
export type Level = 1 | 2 | 3;
export type Item = FigureItem | EquationItem | LatinItem | SubjectItem;

// Official format (g.a.s.t. preparation materials, 02.09.2026).
export const TASKS: Record<TaskType, { name: string; module: string; short: string; examCount: number | null; examMinutes: number; how: string }> = {
  figures: {
    name: "Figure Sequences",
    module: "Core Module",
    short: "Find the next two matrices",
    examCount: 20,
    examMinutes: 25,
    how: "Figures change position, colour and/or orientation by fixed rules. Moves can be horizontal, vertical or diagonal; at the edge figures bounce off or move along the boundary; changes can grow by one each time (1, 2, 3 …). Figures never disappear or overlap.",
  },
  equations: {
    name: "Mathematical Equations",
    module: "Core Module",
    short: "Solve the system in your head",
    examCount: 20,
    examMinutes: 25,
    how: "Each letter stands for a whole number from 1 to 20, and there is exactly one solution. No notes, no calculator.",
  },
  latin: {
    name: "Latin Squares",
    module: "Core Module",
    short: "Which letter replaces the ?",
    examCount: 20,
    examMinutes: 25,
    how: "A 5×5 grid: each letter appears exactly once in every row and every column. Sometimes you must fill other fields in your head first.",
  },
  subject: {
    name: "General Academic Module",
    module: "Subject Module",
    short: "Read a text, answer single-choice questions",
    examCount: null,
    examMinutes: 90,
    how: "A text that explains a concept (with formulas or tables), followed by questions with 4 options and one correct answer. Topics range from mathematics and computing to economics, social sciences and humanities.",
  },
};

export const LEVEL_RATING: Record<Level, number> = { 1: 850, 2: 1000, 3: 1150 };
export const START_RATING = 950;
const K = 24;

export function expected(rating: number, level: Level) {
  return 1 / (1 + 10 ** ((LEVEL_RATING[level] - rating) / 400));
}

/** Pick the level whose expected success rate is closest to 70%, with a little variety. */
export function pickLevel(rating: number, random = Math.random()): Level {
  const levels: Level[] = [1, 2, 3];
  const best = levels.reduce((a, b) => (Math.abs(expected(rating, a) - 0.7) <= Math.abs(expected(rating, b) - 0.7) ? a : b));
  if (random < 0.15 && best > 1) return (best - 1) as Level;
  if (random > 0.9 && best < 3) return (best + 1) as Level;
  return best;
}

/** score: 1 = fully correct, 0 = wrong (figure sequences can score 0.5 for one of two matrices). */
export function updateRating(rating: number, level: Level, score: number) {
  return Math.round(rating + K * (score - expected(rating, level)));
}

export function generateItem(type: TaskType, level: Level, seed: number, passageId?: string): Item {
  if (type === "figures") return generateFigures(seed, level);
  if (type === "equations") return generateEquations(seed, level);
  if (type === "latin") return generateLatin(seed, level);
  return generateSubject(seed, passageId);
}

export function ratingLabel(rating: number) {
  if (rating < 900) return { label: "Getting started", tone: "warn" as const };
  if (rating < 1050) return { label: "Building up", tone: "accent" as const };
  if (rating < 1150) return { label: "Solid", tone: "ok" as const };
  return { label: "Exam-ready", tone: "ok" as const };
}

export type Attempt = { type: TaskType; level: Level; score: number; ms: number; at: string; mode: "train" | "timed" | "mock" };
export type PrepStats = { ratings: Record<TaskType, number>; history: Attempt[] };
export const EMPTY_STATS: PrepStats = {
  ratings: { figures: START_RATING, equations: START_RATING, latin: START_RATING, subject: START_RATING },
  history: [],
};

export function record(stats: PrepStats, a: Attempt): PrepStats {
  return {
    ratings: { ...stats.ratings, [a.type]: updateRating(stats.ratings[a.type] ?? START_RATING, a.level, a.score) },
    history: [...stats.history, a].slice(-500),
  };
}

/** Seconds per item at official exam pace (core: 25 min for 20 items). */
export function examPace(type: TaskType) {
  const t = TASKS[type];
  return t.examCount ? (t.examMinutes * 60) / t.examCount : null;
}
