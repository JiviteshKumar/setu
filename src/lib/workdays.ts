// Working-day account under § 16b (3) Residence Act (AufenthG):
// https://www.gesetze-im-internet.de/aufenthg_2004/__16b.html
//
// - Limit: 140 working days per year. Student assistant jobs (studentische Nebentätigkeit) are not counted.
// - Part-time work is counted per calendar week in whichever way is more favourable:
//   1. per day: ≤ 4 h → 0.5 day, otherwise 1 day
//   2. per week: 2.5 days — in the lecture period only if the week has ≤ 20 h; outside it regardless of distribution.
// - The law says "per year" without defining which 12 months; the UI asks students to confirm with their foreigners' office.

export const ANNUAL_LIMIT = 140;

export type WorkEntry = { date: string; hours: number; studentAssistant: boolean; fullTime?: boolean };

/** ISO week key, e.g. "2026-W41" (weeks start on Monday). */
export function isoWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export type WeekResult = { week: string; hours: number; byDay: number; byWeek: number | null; counted: number; method: "day" | "week" };

/**
 * @param lectureWeeks set of ISO week keys that fall in the lecture period (Vorlesungszeit) — the student marks these,
 *                     because lecture periods differ by university.
 */
export function computeAccount(entries: WorkEntry[], lectureWeeks: Set<string>) {
  const weeks = new Map<string, WorkEntry[]>();
  for (const e of entries) {
    if (e.studentAssistant || !(e.hours > 0)) continue;
    const k = isoWeek(e.date);
    weeks.set(k, [...(weeks.get(k) ?? []), e]);
  }
  const results: WeekResult[] = [];
  for (const [week, list] of [...weeks].sort(([a], [b]) => a.localeCompare(b))) {
    // Several jobs on one day add up to that day's working time.
    const perDay = new Map<string, number>();
    for (const e of list) perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.hours);
    const hours = [...perDay.values()].reduce((a, b) => a + b, 0);
    const byDay = [...perDay.values()].reduce((s, h) => s + (h <= 4 ? 0.5 : 1), 0);
    // The week method exists only for part-time employment (Teilzeitbeschäftigung).
    const partTimeOnly = list.every((e) => !e.fullTime);
    const byWeek = !partTimeOnly ? null : lectureWeeks.has(week) ? (hours <= 20 ? 2.5 : null) : 2.5;
    const useWeek = byWeek != null && byWeek < byDay;
    results.push({ week, hours, byDay, byWeek, counted: useWeek ? byWeek : byDay, method: useWeek ? "week" : "day" });
  }
  const used = results.reduce((s, r) => s + r.counted, 0);
  return { weeks: results, used, remaining: ANNUAL_LIMIT - used };
}
