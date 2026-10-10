// The student's target intake ("Winter 2027") and the application windows that belong to it.
//
// DAAD lists deadlines without a year ("1 December – 15 July"). To turn them into real dates for one intake we place
// every closing date in the twelve months that lead up to the semester:
//   • winter semester Y (starts in autumn Y): a closing date from January to October falls in Y, one in November or
//     December falls in Y − 1 (e.g. "1 November – 15 December" for an early round);
//   • summer semester Y (starts in spring Y): a closing date from January to April falls in Y, May to December in Y − 1.
// The opening date is the last occurrence before the closing date. This is an assumption, so the UI says so, and a
// date that DAAD explicitly lists for a different year is flagged ("listed for 2026 — the 2027 date may differ").

export type Season = "winter" | "summer";
export type Intake = { season: Season; year: number };
export type IntakeDeadline = { intake: Season; from: string | null; until: string | null; years?: number[]; multi?: boolean };
export type IntakeWindow = { opens: Date | null; closes: Date; years: number[]; multi: boolean };
export type WindowState = "upcoming" | "open" | "deadline-only" | "closed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;

export const intakeLabel = (i: Intake) => `${i.season === "winter" ? "Winter" : "Summer"} ${i.year}`;
/** "winter semester 2027/28" / "summer semester 2027" */
export const semesterName = (i: Intake) => (i.season === "winter" ? `winter semester ${i.year}/${String(i.year + 1).slice(2)}` : `summer semester ${i.year}`);
export const sameIntake = (a: Intake | null, b: Intake | null) => !!a && !!b && a.season === b.season && a.year === b.year;

/** Roughly when the semester begins (used only to order intakes and to tell when one has passed — never shown as a date). */
const roughStart = (i: Intake) => new Date(i.year, i.season === "winter" ? 9 : 3, 1);

/** The next `n` intakes that have not started yet, e.g. in Oct 2026: Summer 2027, Winter 2027, Summer 2028, Winter 2028. */
export function upcomingIntakes(today: Date, n = 4): Intake[] {
  const out: Intake[] = [];
  for (let y = today.getFullYear(); out.length < n; y++) {
    for (const season of ["summer", "winter"] as const) {
      const i = { season, year: y };
      if (roughStart(i) > today && out.length < n) out.push(i);
    }
  }
  return out;
}

export const intakeHasStarted = (i: Intake, today: Date) => roughStart(i) <= today;

function md(s: string) {
  const [m, d] = s.split("-").map(Number);
  return { m, d };
}

/** The real dates of one listed deadline for the chosen intake (see the rule at the top of this file). */
export function windowFor(d: IntakeDeadline, intake: Intake): IntakeWindow | null {
  if (!d.until || d.intake !== intake.season) return null;
  const u = md(d.until);
  const lateMonths = intake.season === "winter" ? 10 : 4; // closing months that still belong to the same year
  const closes = new Date(u.m <= lateMonths ? intake.year : intake.year - 1, u.m - 1, u.d);
  let opens: Date | null = null;
  if (d.from) {
    const f = md(d.from);
    opens = new Date(closes.getFullYear(), f.m - 1, f.d);
    if (opens > closes) opens = new Date(closes.getFullYear() - 1, f.m - 1, f.d);
  }
  return { opens, closes, years: d.years ?? [], multi: !!d.multi };
}

/** All windows of a course for the intake, earliest closing first. */
export function windowsFor(deadlines: IntakeDeadline[], intake: Intake): IntakeWindow[] {
  return deadlines
    .map((d) => windowFor(d, intake))
    .filter((w): w is IntakeWindow => !!w)
    .sort((a, b) => a.closes.getTime() - b.closes.getTime());
}

/** The window that matters now: the earliest one that has not closed yet, otherwise the last one (closed). */
export function currentWindow(deadlines: IntakeDeadline[], intake: Intake, today: Date): IntakeWindow | null {
  const ws = windowsFor(deadlines, intake);
  return ws.find((w) => w.closes >= startOfDay(today)) ?? ws.at(-1) ?? null;
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);

export function stateOf(w: IntakeWindow, today: Date): { state: WindowState; daysToOpen: number | null; daysToClose: number } {
  const daysToClose = daysBetween(today, w.closes);
  const daysToOpen = w.opens ? daysBetween(today, w.opens) : null;
  const state: WindowState = daysToClose < 0 ? "closed" : daysToOpen != null && daysToOpen > 0 ? "upcoming" : w.opens ? "open" : "deadline-only";
  return { state, daysToOpen, daysToClose };
}

/** A date DAAD explicitly gave for another year than the one we computed. */
export const yearMismatch = (w: IntakeWindow) => w.years.length > 0 && !w.years.includes(w.closes.getFullYear());

export const fmtDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** Years written in a DAAD deadline text ("until 2 April 2027"), and whether it lists more dates than one window. */
export function deadlineTextInfo(text: string): { years: number[]; multi: boolean } {
  const years = [...new Set([...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1])))];
  const dates = text.match(/\b\d{1,2}\.?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi) ?? [];
  return { years, multi: dates.length > 2 };
}

// ── Updates for the student's plan ────────────────────────────────────────────────────────────────────────────

export type PlanCourse = { id: number; name: string; university: string; deadlines?: IntakeDeadline[] };
export type PlanUpdate = {
  key: string; // stable id, so a student can mark updates as seen
  courseId: number;
  course: string;
  university: string;
  kind: "opens-soon" | "opened" | "closing-soon" | "closed" | "no-window";
  tone: "info" | "good" | "warn" | "danger";
  title: string;
  detail: string;
  date: Date | null;
};

/** What a student aiming for `intake` should know today about their saved courses. */
export function planUpdates(courses: PlanCourse[], intake: Intake, today: Date): PlanUpdate[] {
  const out: PlanUpdate[] = [];
  for (const c of courses) {
    const deadlines = c.deadlines ?? [];
    const w = currentWindow(deadlines, intake, today);
    const base = { courseId: c.id, course: c.name, university: c.university };
    if (!w) {
      out.push({
        ...base,
        key: `${c.id}:none:${intake.season}${intake.year}`,
        kind: "no-window",
        tone: "info",
        title: deadlines.some((d) => d.until) ? `No ${intake.season} deadline listed` : "Deadline only as text",
        detail: deadlines.some((d) => d.until) ? `DAAD lists no ${intake.season}-semester deadline for this course. Check the course page.` : "Read the deadline on the course page.",
        date: null,
      });
      continue;
    }
    const s = stateOf(w, today);
    const closes = fmtDate(w.closes);
    if (s.state === "closed") {
      out.push({ ...base, key: `${c.id}:closed:${w.closes.toISOString().slice(0, 10)}`, kind: "closed", tone: "danger", title: `Closed for ${intakeLabel(intake)}`, detail: `The deadline was ${closes}.`, date: w.closes });
    } else if (s.state === "upcoming" && s.daysToOpen! <= 30) {
      out.push({
        ...base,
        key: `${c.id}:opens:${w.opens!.toISOString().slice(0, 10)}`,
        kind: "opens-soon",
        tone: "info",
        title: s.daysToOpen === 0 ? "Applications open today" : `Applications open in ${s.daysToOpen} day${s.daysToOpen === 1 ? "" : "s"}`,
        detail: `${fmtDate(w.opens!)} – ${closes}.`,
        date: w.opens,
      });
    } else if (s.daysToClose <= 30) {
      out.push({
        ...base,
        key: `${c.id}:closing:${w.closes.toISOString().slice(0, 10)}`,
        kind: "closing-soon",
        tone: "warn",
        title: s.daysToClose === 0 ? "Deadline today" : `Deadline in ${s.daysToClose} day${s.daysToClose === 1 ? "" : "s"}`,
        detail: `Closes ${closes}.`,
        date: w.closes,
      });
    } else if (s.state === "open") {
      out.push({ ...base, key: `${c.id}:open:${w.opens!.toISOString().slice(0, 10)}`, kind: "opened", tone: "good", title: "Applications are open", detail: `Open until ${closes}.`, date: w.opens });
    }
  }
  const order = { "closing-soon": 0, "opens-soon": 1, opened: 2, closed: 3, "no-window": 4 } as const;
  return out.sort((a, b) => order[a.kind] - order[b.kind] || (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
}
