// Tests for the intake date rules in src/lib/intake.ts, using deadline patterns that really occur in the DAAD data.
//   npm run test:intake
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { currentWindow, deadlineTextInfo, fmtDate, planUpdates, stateOf, upcomingIntakes, windowFor, yearMismatch, type IntakeDeadline } from "../src/lib/intake.ts";

let failures = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures++;
    console.error(`✗ ${label}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`);
  }
};
const w = (from: string | null, until: string, season: "winter" | "summer", year: number) => {
  const r = windowFor({ intake: season, from, until }, { season, year });
  return r ? [r.opens ? fmtDate(r.opens) : null, fmtDate(r.closes)] : null;
};

// Winter 2027 (starts autumn 2027)
eq("winter: 1 Dec – 15 Jul spans the year change", w("12-01", "07-15", "winter", 2027), ["1 Dec 2026", "15 Jul 2027"]);
eq("winter: deadline only", w(null, "05-31", "winter", 2027), [null, "31 May 2027"]);
eq("winter: early round 1 Nov – 15 Dec is in the year before", w("11-01", "12-15", "winter", 2027), ["1 Nov 2026", "15 Dec 2026"]);
eq("winter: 1 Oct – 15 Nov early round", w("10-01", "11-15", "winter", 2027), ["1 Oct 2026", "15 Nov 2026"]);
eq("winter: late window 15 Aug – 15 Oct is the same autumn", w("08-15", "10-15", "winter", 2027), ["15 Aug 2027", "15 Oct 2027"]);
eq("winter: 15 Jan deadline", w("11-15", "01-15", "winter", 2027), ["15 Nov 2026", "15 Jan 2027"]);
// Summer 2027 (starts spring 2027)
eq("summer: 1 Jun – 15 Jan", w("06-01", "01-15", "summer", 2027), ["1 Jun 2026", "15 Jan 2027"]);
eq("summer: 15 May – 15 Jul is the year before", w("05-15", "07-15", "summer", 2027), ["15 May 2026", "15 Jul 2026"]);
eq("summer: 1 Dec – 30 Apr", w("12-01", "04-30", "summer", 2027), ["1 Dec 2026", "30 Apr 2027"]);
eq("summer: until 31 October", w(null, "10-31", "summer", 2027), [null, "31 Oct 2026"]);
eq("wrong season gives no window", windowFor({ intake: "summer", from: null, until: "01-15" }, { season: "winter", year: 2027 }), null);

// Upcoming intakes
eq("intakes offered on 9 Oct 2026", upcomingIntakes(new Date(2026, 9, 9)).map((i) => `${i.season} ${i.year}`), ["summer 2027", "winter 2027", "summer 2028", "winter 2028"]);
eq("intakes offered on 15 Feb 2027", upcomingIntakes(new Date(2027, 1, 15), 2).map((i) => `${i.season} ${i.year}`), ["summer 2027", "winter 2027"]);

// States
const today = new Date(2026, 9, 9);
const st = (from: string | null, until: string) => stateOf(windowFor({ intake: "winter", from, until }, { season: "winter", year: 2027 })!, today);
eq("not open yet", st("12-01", "07-15").state, "upcoming");
eq("days until opening", st("12-01", "07-15").daysToOpen, 53);
eq("open now", st("10-01", "11-15").state, "open");
eq("deadline only", st(null, "05-31").state, "deadline-only");
eq("closed", stateOf(windowFor({ intake: "summer", from: "05-15", until: "07-15" }, { season: "summer", year: 2027 })!, today).state, "closed");

// Several rounds: the earliest window that has not closed is the one that matters.
const rounds: IntakeDeadline[] = [
  { intake: "winter", from: "10-01", until: "11-15" },
  { intake: "winter", from: "12-01", until: "05-15" },
];
eq("current window = early round while open", fmtDate(currentWindow(rounds, { season: "winter", year: 2027 }, today)!.closes), "15 Nov 2026");
eq("current window = regular round after the early one", fmtDate(currentWindow(rounds, { season: "winter", year: 2027 }, new Date(2026, 11, 1))!.closes), "15 May 2027");

// Years written in DAAD text
eq("years in text", deadlineTextInfo("31 July 2026 - 31 October 2026"), { years: [2026], multi: false });
eq("several windows in one text", deadlineTextInfo("• 5 November – 15 January • 5 May – 31 August").multi, true);
const listed = windowFor({ intake: "winter", from: null, until: "10-09", years: [2026] }, { season: "winter", year: 2027 })!;
eq("a date listed for 2026 is flagged for Winter 2027", yearMismatch(listed), true);
const listedOk = windowFor({ intake: "summer", from: null, until: "04-02", years: [2027] }, { season: "summer", year: 2027 })!;
eq("a date listed for 2027 is fine for Summer 2027", yearMismatch(listedOk), false);

// Plan updates
const ups = planUpdates(
  [
    { id: 1, name: "A", university: "U", deadlines: [{ intake: "winter", from: "10-01", until: "11-01" }] },
    { id: 2, name: "B", university: "U", deadlines: [{ intake: "winter", from: "11-01", until: "07-15" }] },
    { id: 3, name: "C", university: "U", deadlines: [{ intake: "summer", from: null, until: "01-15" }] },
    { id: 4, name: "D", university: "U", deadlines: [{ intake: "winter", from: "08-01", until: "09-30" }] },
  ],
  { season: "winter", year: 2027 },
  today,
);
eq(
  "plan updates",
  ups.map((u) => [u.courseId, u.kind, u.title]),
  [
    [1, "closing-soon", "Deadline in 23 days"],
    [2, "opens-soon", "Applications open in 23 days"],
    [3, "no-window", "No winter deadline listed"],
  ],
);

// Every real DAAD deadline gets a window in the 12 months before its semester (no off-by-a-year dates).
const data = JSON.parse(readFileSync(join(import.meta.dirname, "..", "data", "programmes.json"), "utf-8")) as { programmes: { id: number; deadlines: IntakeDeadline[] }[] };
let checked = 0;
for (const p of data.programmes) {
  for (const d of p.deadlines) {
    if (!d.until) continue;
    const intake = { season: d.intake, year: 2027 };
    const win = windowFor(d, intake)!;
    const start = new Date(2027, d.intake === "winter" ? 9 : 3, 1);
    const monthsBefore = (start.getTime() - win.closes.getTime()) / (30.44 * 86_400_000);
    if (monthsBefore > 12 || monthsBefore < -2) eq(`programme ${p.id}: closing date ${fmtDate(win.closes)} far from the ${d.intake} 2027 start`, false, true);
    if (win.opens && win.opens > win.closes) eq(`programme ${p.id}: opens after it closes`, false, true);
    checked++;
  }
}
console.log(`checked ${checked} real deadlines`);

if (failures) {
  console.error(`✗ ${failures} intake test(s) failed`);
  process.exit(1);
}
console.log("✓ intake date rules passed");
