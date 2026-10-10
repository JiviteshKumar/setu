// Checks for data stored on the student's device. Anything that doesn't match is dropped or reset, so an old app
// version, a browser extension or a hand-edited value can never break a page.
import type { Intake, IntakeDeadline } from "./intake";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const MD = /^\d{2}-\d{2}$/;

export const stringList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function oneOf<T extends string>(allowed: readonly T[], fallback: T) {
  return (v: unknown): T => (allowed.includes(v as T) ? (v as T) : fallback);
}

export function intakeOrNull(v: unknown): Intake | null {
  if (!isObj(v)) return null;
  const season = v.season === "winter" || v.season === "summer" ? v.season : null;
  const year = Number.isInteger(v.year) && (v.year as number) >= 2020 && (v.year as number) <= 2100 ? (v.year as number) : null;
  return season && year ? { season, year } : null;
}

function deadlineList(v: unknown): IntakeDeadline[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter(
    (d): d is IntakeDeadline =>
      isObj(d) && (d.intake === "winter" || d.intake === "summer") && (d.until === null || (typeof d.until === "string" && MD.test(d.until))) && (d.from === null || (typeof d.from === "string" && MD.test(d.from))),
  );
}

const STATUSES = ["researching", "preparing", "applied", "admitted", "rejected"] as const;

export type SavedProgrammeShape = {
  id: number;
  name: string;
  university: string;
  city: string;
  intake: "winter" | "summer" | null;
  deadline: string | null;
  deadlines?: IntakeDeadline[];
  status: (typeof STATUSES)[number];
  steps: Record<string, boolean>;
  note: string;
  savedAt: string;
};

/** Saved courses: keeps every entry that has an id and a name, repairs the rest of each entry. */
export function savedProgrammes(v: unknown): SavedProgrammeShape[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<number>();
  const out: SavedProgrammeShape[] = [];
  for (const p of v) {
    if (!isObj(p) || !Number.isInteger(p.id) || typeof p.name !== "string" || seen.has(p.id as number)) continue;
    seen.add(p.id as number);
    const steps: Record<string, boolean> = {};
    if (isObj(p.steps)) for (const [k, b] of Object.entries(p.steps)) if (typeof b === "boolean") steps[k] = b;
    out.push({
      id: p.id as number,
      name: p.name,
      university: str(p.university),
      city: str(p.city),
      intake: p.intake === "winter" || p.intake === "summer" ? p.intake : null,
      deadline: typeof p.deadline === "string" && MD.test(p.deadline) ? p.deadline : null,
      deadlines: deadlineList(p.deadlines),
      status: STATUSES.includes(p.status as (typeof STATUSES)[number]) ? (p.status as (typeof STATUSES)[number]) : "researching",
      steps,
      note: str(p.note),
      savedAt: typeof p.savedAt === "string" && !Number.isNaN(Date.parse(p.savedAt)) ? p.savedAt : new Date(0).toISOString(),
    });
  }
  return out;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Work-days tracker entries: a real date and a sensible number of hours. */
export function workEntries(v: unknown) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e): e is Record<string, unknown> => isObj(e) && typeof e.date === "string" && ISO_DAY.test(e.date) && !Number.isNaN(Date.parse(e.date)) && typeof e.hours === "number" && e.hours > 0 && e.hours <= 24)
    .map((e) => ({ date: e.date as string, hours: e.hours as number, studentAssistant: e.studentAssistant === true, ...(e.fullTime === true ? { fullTime: true } : {}) }));
}

/** Lecture periods: two real dates, start not after end. */
export function periods(v: unknown) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((p): p is { from: string; to: string } => isObj(p) && typeof p.from === "string" && typeof p.to === "string" && ISO_DAY.test(p.from) && ISO_DAY.test(p.to) && p.from <= p.to)
    .map((p) => ({ from: p.from, to: p.to }));
}
