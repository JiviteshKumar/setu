// Application windows from recurring "MM-DD" dates (DAAD lists deadlines without a year).
import { nextOccurrence } from "./dates";

/** "deadline-only": DAAD lists no opening date, so we can't say whether applications are open yet. */
export type Window = { opens: Date | null; closes: Date; status: "open" | "upcoming" | "closing-soon" | "deadline-only" };

function atMonthDay(md: string, year: number) {
  const [m, d] = md.split("-").map(Number);
  return new Date(year, m - 1, d);
}

/**
 * The next application window that has not closed yet. `from` is optional; when given, the window opens on the
 * latest occurrence of `from` that is not after the closing date (so "1 Dec – 15 Jul" spans the year change).
 */
export function nextWindow(from: string | null, until: string, today: Date): Window {
  const closes = nextOccurrence(until, today);
  let opens: Date | null = null;
  if (from) {
    opens = atMonthDay(from, closes.getFullYear());
    if (opens > closes) opens = atMonthDay(from, closes.getFullYear() - 1);
  }
  const days = Math.round((closes.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
  const status = opens && opens > today ? "upcoming" : days <= 30 ? "closing-soon" : opens ? "open" : "deadline-only";
  return { opens, closes, status };
}
