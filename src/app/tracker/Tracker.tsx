"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useSaved, type SavedProgramme } from "@/lib/saved";
import { useStoredState } from "@/lib/useStoredState";
import { useToday } from "@/lib/useToday";
import { formatMonthDay } from "@/lib/dates";
import { MetroLine, type Station } from "@/components/MetroLine";
import { nextWindow, type Window } from "@/lib/windows";
import { currentWindow, daysBetween, fmtDate, intakeLabel, stateOf, windowsFor, yearMismatch, type Intake, type IntakeDeadline } from "@/lib/intake";
import { useMyIntake } from "@/lib/myIntake";
import { withBase } from "@/lib/deploy";
import { IntakePicker } from "@/components/IntakePicker";
import { PlanUpdates } from "@/components/PlanUpdates";
import { ApplicationTimeline } from "./ApplicationTimeline";
import { UniPageCheck } from "./UniPageCheck";
import { useEffect, useState, type ReactNode } from "react";
import { EASE_OUT } from "@/components/motion";

const JOURNEY: Station[] = [
  { id: "shortlist", zone: "Zone A · Prepare", title: "Shortlist courses", detail: "Save 5–10 courses that match your degree and grade.", href: "/programmes" },
  { id: "grade", zone: "Zone A · Prepare", title: "Convert your grade", detail: "Check whether you meet minimum grade requirements.", href: "/tools/grade" },
  { id: "dmat-check", zone: "Zone A · Prepare", title: "Check if you need the dMAT", detail: "Depends on your bachelor's field and APS dates.", href: "/tools/dmat" },
  { id: "english", zone: "Zone A · Prepare", title: "English test", detail: "IELTS / TOEFL as required by your courses. Book early — results take time." },
  { id: "german", zone: "Zone A · Prepare", title: "Start learning German", detail: "Reach A1–A2 before you fly; it makes flat-hunting and jobs much easier.", href: "/german" },
  { id: "aps", zone: "Zone B · Certify & apply", title: "APS certificate", detail: "Register and send documents to APS India. Almost all Indian applicants need it.", href: "https://aps-india.de/", external: true },
  { id: "dmat", zone: "Zone B · Certify & apply", title: "dMAT test (if needed)", detail: "Register with g.a.s.t.; seats are first come, first served. Practise free in Setu's dMAT trainer.", href: "/prep" },
  { id: "scholarship", zone: "Zone B · Certify & apply", title: "Apply for scholarships", detail: "Deutschlandstipendium and the DAAD database — rounds close early.", href: "/scholarships" },
  { id: "docs", zone: "Zone B · Certify & apply", title: "Motivation letter, CV, recommendation letters", detail: "Write them yourself and tailor each one to the course." },
  { id: "apply", zone: "Zone B · Certify & apply", title: "Submit applications", detail: "Via uni-assist or the university portal — check each course page." },
  { id: "admission", zone: "Zone C · Visa", title: "Receive admission letter", detail: "Accept your offer by the university's deadline." },
  { id: "blocked", zone: "Zone C · Visa", title: "Open blocked account", detail: "Deposit the required amount before applying for the visa.", href: "/tools/costs" },
  { id: "insurance", zone: "Zone C · Visa", title: "Health insurance", detail: "Arrange insurance cover for your visa and enrolment." },
  { id: "visa", zone: "Zone C · Visa", title: "Apply for the visa", detail: "Through the Consular Services Portal of the German Missions in India.", href: "https://india.diplo.de/in-en/service/2756350-2756350", external: true },
  { id: "housing", zone: "Zone D · Arrive", title: "Find accommodation", detail: "Ask “Ist Anmeldung möglich?” before paying anything.", href: "/germany/housing" },
  { id: "arrive", zone: "Zone D · Arrive", title: "Arrival checklist", detail: "Anmeldung within 2 weeks, bank, residence permit…", href: "/germany" },
];

const APP_STEPS = [
  { id: "req", label: "Read all requirements on the official page" },
  { id: "docs", label: "Documents ready (certified copies, translations)" },
  { id: "sop", label: "Motivation letter written for this course" },
  { id: "sent", label: "Application submitted" },
  { id: "fee", label: "Application fee paid (if any)" },
  { id: "confirm", label: "Confirmation received" },
];

type LiveInfo = {
  deadlines: IntakeDeadline[];
  changes: { field: string; before: string | null; after: string | null; detectedAt: string }[];
  listed: boolean;
};

const STATUS: Record<SavedProgramme["status"], { label: string; cls: string }> = {
  researching: { label: "Researching", cls: "bg-surface-2 text-muted" },
  preparing: { label: "Preparing", cls: "bg-gold-soft text-warn" },
  applied: { label: "Applied", cls: "bg-accent-soft text-accent" },
  admitted: { label: "Admitted", cls: "bg-ok-soft text-ok" },
  rejected: { label: "Rejected", cls: "bg-danger-soft text-danger" },
};

type RowState = Window["status"] | "closed";
/** One saved course with the application window that matters for the student's intake (or the next one, without an intake). */
type Row = {
  s: SavedProgramme;
  opens: Date | null;
  closes: Date | null;
  state: RowState | null;
  daysToOpen: number | null;
  daysToClose: number | null;
  label: string; // "Winter 2027" or "Winter intake"
  dates: string | null;
  notes: string[];
  missing: string | null;
};

/** Verified-fact cards for each phase of the plan, rendered on the server and slotted in here. */
export type PlanPhases = { before: ReactNode; admitted: ReactNode; arrival: ReactNode };

export function Tracker({ phases }: { phases: PlanPhases }) {
  const [saved, setSaved, loaded] = useSaved();
  const [journey, setJourney] = useStoredState<Record<string, boolean>>("journey", {});
  const [intake] = useMyIntake();
  const today = useToday();

  const update = (id: number, patch: Partial<SavedProgramme>) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const [info, setInfo] = useState<Record<string, LiveInfo>>({});
  const idsKey = saved.map((s) => s.id).join(",");

  // Latest deadlines and recorded DAAD changes for the saved courses.
  useEffect(() => {
    if (!idsKey) return;
    let alive = true;
    // One static file with every course (src/app/programme-status.json) — works on a server and on GitHub Pages.
    fetch(withBase("/programme-status.json"))
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { courses: Record<string, { d: IntakeDeadline[]; c?: LiveInfo["changes"] }> } | null) => {
        if (!alive || !data?.courses) return;
        const out: Record<string, LiveInfo> = {};
        for (const id of idsKey.split(",")) {
          const c = data.courses[id];
          out[id] = c ? { deadlines: c.d, changes: c.c ?? [], listed: true } : { deadlines: [], changes: [], listed: false };
        }
        setInfo(out);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [idsKey]);

  // Keep the deadlines stored with each saved course fresh, so the bell can announce openings and deadlines on any page.
  useEffect(() => {
    const stale = saved.some((s) => info[s.id]?.listed && JSON.stringify(info[s.id].deadlines) !== JSON.stringify(s.deadlines ?? null));
    if (stale) setSaved((prev) => prev.map((s) => (info[s.id]?.listed ? { ...s, deadlines: info[s.id].deadlines } : s)));
  }, [info, saved, setSaved]);

  const deadlinesOf = (s: SavedProgramme): IntakeDeadline[] =>
    info[s.id]?.deadlines ?? s.deadlines ?? (s.deadline ? [{ intake: s.intake ?? "winter", from: null, until: s.deadline }] : []);

  const rows: Row[] = today ? saved.map((s) => (intake ? intakeRow(s, deadlinesOf(s), intake, today) : nextRow(s, deadlinesOf(s), today))) : [];
  rows.sort((a, b) => Number(a.state === "closed") - Number(b.state === "closed") || (a.closes?.getTime() ?? Infinity) - (b.closes?.getTime() ?? Infinity));

  const timelineRows = rows.filter((r) => r.closes && r.state && r.state !== "closed");
  const lastClose = Math.max(...timelineRows.map((r) => r.closes!.getTime()));
  const months = today && timelineRows.length ? Math.min(24, Math.max(12, Math.ceil(daysBetween(today, new Date(lastClose)) / 30.4) + 1)) : 12;
  const first = timelineRows[0]; // rows are sorted by closing date

  return (
    <div className="space-y-10">
      <IntakePicker />

      {intake && <PlanUpdates />}

      {today && timelineRows.length > 0 && (
        <section>
          <p className="eyebrow">{intake ? `${intakeLabel(intake)} · application windows` : "Next 12 months"}</p>
          <h2 className="mt-1 mb-3 font-display text-3xl">Application windows</h2>
          <ApplicationTimeline
            today={today}
            months={months}
            rows={timelineRows.map((r) => ({ id: r.s.id, name: r.s.name, window: { opens: r.opens, closes: r.closes!, status: r.state as Window["status"] } }))}
          />
          {intake && (
            <p className="mt-2 text-xs text-muted">
              DAAD lists deadlines without a year. Setu places each date in the twelve months before the {intake.season} semester starts — always confirm the exact
              date on the course page.
            </p>
          )}
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="h2">My courses ({saved.length})</h2>
          {rows.some((r) => r.closes && r.state !== "closed") && (
            <button type="button" className="btn-ghost" onClick={() => downloadIcs(rows, intake, today!)}>
              Add {intake ? `${intakeLabel(intake)} dates` : "deadlines"} to my calendar
            </button>
          )}
        </div>
        {loaded && saved.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card mt-3 flex items-center gap-4">
            <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0 text-accent-bright" aria-hidden>
              <rect x="6" y="10" width="36" height="28" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M6 20h36" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3" />
              <circle cx="24" cy="29" r="4" fill="var(--gold)" />
            </svg>
            <p className="text-muted">
              Nothing saved yet. Tap the ☆ on any course in{" "}
              <Link className="text-accent underline" href="/programmes">
                Courses
              </Link>{" "}
              to track its application window and your progress here.
            </p>
          </motion.div>
        )}
        <motion.ul layout className="mt-3 space-y-3">
          <AnimatePresence initial={false}>
            {rows.map((r, i) => (
              <CourseCard key={r.s.id} row={r} index={i} live={info[r.s.id]} update={update} remove={() => setSaved((prev) => prev.filter((x) => x.id !== r.s.id))} />
            ))}
          </AnimatePresence>
        </motion.ul>
        {loaded && <UniPageCheck saved={saved} deadlinesOf={deadlinesOf} />}
      </section>

      <section>
        <p className="eyebrow">{intake ? `Your ${intakeLabel(intake)} plan` : "Your plan"}</p>
        <h2 className="mt-1 mb-1 font-display text-3xl">What to do, and when</h2>
        <p className="mb-4 text-sm text-muted">
          Only verified official information — each card shows its source. Dates for your courses come from DAAD; check each course page for the documents it
          asks for (language test, APS certificate, uni-assist or direct application).
        </p>
        <ol className="space-y-6">
          <Phase n={1} title="Before you apply" when={first?.closes ? `Your earliest ${intake ? intakeLabel(intake) + " " : ""}deadline: ${fmtDate(first.closes)} — ${first.s.name}` : "Save courses to see your earliest deadline here."}>
            {phases.before}
          </Phase>
          <Phase n={2} title="After you are admitted" when="Blocked account and visa">
            {phases.admitted}
          </Phase>
          <Phase n={3} title="When you arrive" when="The first two weeks">
            {phases.arrival}
          </Phase>
        </ol>
      </section>

      <section>
        <p className="eyebrow">Your route</p>
        <h2 className="mt-1 mb-4 font-display text-3xl">India → Germany line</h2>
        <MetroLine stations={JOURNEY} done={journey} onToggle={(id, v) => setJourney((p) => ({ ...p, [id]: v }))} lineName="U1" />
      </section>
    </div>
  );
}

function Phase({ n, title, when, children }: { n: number; title: string; when: string; children: ReactNode }) {
  return (
    <li className="relative pl-10">
      <span className="absolute top-0 left-0 grid h-7 w-7 place-items-center rounded-full bg-accent-soft font-mono text-sm font-bold text-accent">{n}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mb-3 text-sm text-muted">{when}</p>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </li>
  );
}

/** The window for the chosen intake, with real years. */
function intakeRow(s: SavedProgramme, deadlines: IntakeDeadline[], intake: Intake, today: Date): Row {
  const label = intakeLabel(intake);
  const w = currentWindow(deadlines, intake, today);
  if (!w) {
    const any = deadlines.some((d) => d.until);
    return { s, opens: null, closes: null, state: null, daysToOpen: null, daysToClose: null, label, dates: null, notes: [], missing: any ? `No ${intake.season}-semester deadline is listed for this course.` : null };
  }
  const st = stateOf(w, today);
  const state: RowState = st.state === "closed" ? "closed" : st.state !== "upcoming" && st.daysToClose <= 30 ? "closing-soon" : st.state;
  const notes: string[] = [];
  if (yearMismatch(w)) notes.push(`DAAD lists this date for ${w.years.join(", ")} — the date for ${label} may differ.`);
  if (w.multi) notes.push("DAAD lists several dates for this course — read them on the course page.");
  const later = windowsFor(deadlines, intake).filter((x) => x.closes > w.closes);
  if (later.length) notes.push(`Another round closes ${fmtDate(later[0].closes)}.`);
  return {
    s,
    opens: w.opens,
    closes: w.closes,
    state,
    daysToOpen: st.daysToOpen,
    daysToClose: st.daysToClose,
    label,
    dates: w.opens ? `${fmtDate(w.opens)} – ${fmtDate(w.closes)}` : `closes ${fmtDate(w.closes)}`,
    notes,
    missing: null,
  };
}

/** Without a chosen intake: the next window of the season the course was saved with. */
function nextRow(s: SavedProgramme, deadlines: IntakeDeadline[], today: Date): Row {
  const live = deadlines.filter((d) => d.until);
  const d = live.find((x) => x.intake === s.intake) || live[0];
  const label = d ? `${d.intake === "summer" ? "Summer" : "Winter"} intake` : "";
  if (!d?.until) return { s, opens: null, closes: null, state: null, daysToOpen: null, daysToClose: null, label, dates: null, notes: [], missing: null };
  const w = nextWindow(d.from, d.until, today);
  return {
    s,
    opens: w.opens,
    closes: w.closes,
    state: w.status,
    daysToOpen: w.opens ? daysBetween(today, w.opens) : null,
    daysToClose: daysBetween(today, w.closes),
    label,
    dates: `${d.from ? `${formatMonthDay(d.from)} – ` : "closes "}${formatMonthDay(d.until)}`,
    notes: [],
    missing: null,
  };
}

const CHIP: Record<RowState, string> = {
  upcoming: "border-warn/30 bg-gold-soft text-warn",
  "closing-soon": "border-danger/30 bg-danger-soft text-danger",
  open: "border-ok/30 bg-ok-soft text-ok",
  "deadline-only": "",
  closed: "border-border bg-surface-2 text-muted",
};

function chipText(r: Row) {
  switch (r.state) {
    case "upcoming":
      return r.daysToOpen === 0 ? "Opens today" : `Opens in ${r.daysToOpen} days`;
    case "open":
      return "Open now";
    case "closed":
      return `Closed for ${r.label}`;
    default:
      return r.daysToClose === 0 ? "Closes today" : `Closes in ${r.daysToClose} days`;
  }
}

function CourseCard({
  row: r,
  index: i,
  live,
  update,
  remove,
}: {
  row: Row;
  index: number;
  live: LiveInfo | undefined;
  update: (id: number, patch: Partial<SavedProgramme>) => void;
  remove: () => void;
}) {
  const s = r.s;
  const stepsDone = APP_STEPS.filter((st) => s.steps[st.id]).length;
  const newChanges = live?.changes.filter((c) => c.detectedAt > s.savedAt) ?? [];
  const days = r.state && r.state !== "closed" ? r.daysToClose : null;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: r.state === "closed" ? 0.75 : 1, y: 0, transition: { delay: i * 0.04, ease: EASE_OUT } }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      className="card overflow-hidden p-0"
    >
      <div className="flex items-stretch">
        <div
          className={`flex w-20 shrink-0 flex-col items-center justify-center border-r border-dashed border-border px-2 py-3 text-center font-mono ${
            days != null && days <= 30 ? "bg-danger-soft text-danger" : "bg-surface-2"
          }`}
        >
          {days != null ? (
            <>
              <span className="text-2xl leading-none font-bold tabular-nums">{days}</span>
              <span className="mt-1 text-[9px] tracking-[0.14em] uppercase">days left</span>
            </>
          ) : (
            <span className="text-[10px] text-muted">{r.state === "closed" ? "closed" : "see course page"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/programmes/${s.id}`} className="font-semibold hover:text-accent">
                {s.name}
              </Link>
              <p className="text-sm text-muted">
                {s.university} · {s.city}
              </p>
            </div>
            <select
              className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${STATUS[s.status].cls}`}
              value={s.status}
              onChange={(e) => update(s.id, { status: e.target.value as SavedProgramme["status"] })}
              aria-label="Application status"
            >
              {Object.entries(STATUS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {r.state && r.dates ? (
              <>
                <span className={`chip ${CHIP[r.state]}`}>{chipText(r)}</span>
                <span className="text-muted">
                  {r.label} · {r.dates}
                </span>
              </>
            ) : (
              <span className="text-muted">{r.missing ?? "Deadline is free text on the course page — check it there."}</span>
            )}
          </div>
          {r.notes.map((n) => (
            <p key={n} className="mt-1 text-xs text-warn">
              {n}
            </p>
          ))}
          {live && !live.listed && <p className="mt-2 rounded-lg bg-danger-soft p-2 text-xs text-danger">This course is no longer in the DAAD database. Check the university website.</p>}
          {newChanges.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-xs">
              <p className="font-semibold text-warn">Changed on DAAD since you saved it</p>
              <ul className="mt-1 space-y-1.5">
                {newChanges.map((c, k) => (
                  <li key={k}>
                    <span className="font-medium">{c.field}</span> · {c.detectedAt.slice(0, 10)}
                    <span className="block text-muted line-through">{(c.before ?? "—").slice(0, 160)}</span>
                    <span className="block">{(c.after ?? "—").slice(0, 160)}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-2 underline" onClick={() => update(s.id, { savedAt: new Date().toISOString() })}>
                Got it
              </button>
            </motion.div>
          )}
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full bg-ok"
              initial={false}
              animate={{ width: `${(stepsDone / APP_STEPS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            />
          </div>
          <details className="group mt-2">
            <summary className="cursor-pointer list-none text-sm text-muted">
              <span className="inline-block transition-transform group-open:rotate-90">›</span> Application checklist ({stepsDone}/{APP_STEPS.length})
            </summary>
            <ul className="mt-2 space-y-1.5">
              {APP_STEPS.map((st) => (
                <li key={st.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--accent)]"
                      checked={!!s.steps[st.id]}
                      onChange={(e) => update(s.id, { steps: { ...s.steps, [st.id]: e.target.checked } })}
                    />
                    <span className={s.steps[st.id] ? "text-muted line-through" : ""}>{st.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            <textarea
              className="input mt-2 min-h-16 text-sm"
              placeholder="Notes (portal login hint, contact person…) — don't store passwords here"
              value={s.note}
              onChange={(e) => update(s.id, { note: e.target.value })}
            />
            <button type="button" className="mt-2 text-sm text-danger underline" onClick={remove}>
              Remove from my plan
            </button>
          </details>
        </div>
      </div>
    </motion.li>
  );
}

/**
 * Builds an .ics calendar file: each deadline (reminders 30 and 7 days before) and, when it is still ahead, the day
 * applications open (reminder 3 days before). Works with Google, Apple and Outlook calendars.
 */
function downloadIcs(rows: Row[], intake: Intake | null, today: Date) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const event = (uid: string, date: Date, summary: string, description: string, alarms: number[]) =>
    [
      "BEGIN:VEVENT",
      `UID:${uid}@setu`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(date)}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(description)}`,
      ...alarms.flatMap((days) => ["BEGIN:VALARM", `TRIGGER:-P${days}D`, "ACTION:DISPLAY", `DESCRIPTION:${esc(`${summary} in ${days} days`)}`, "END:VALARM"]),
      "END:VEVENT",
    ].join("\r\n");
  const tag = intake ? ` (${intakeLabel(intake)})` : "";
  const confirm = "Confirm the exact date and time zone on the official course website.";
  const events = rows
    .filter((r) => r.closes && r.state !== "closed")
    .flatMap((r) => [
      ...(r.opens && r.opens > today ? [event(`setu-open-${r.s.id}-${ymd(r.opens)}`, r.opens, `Applications open: ${r.s.name}${tag}`, `${r.s.university}. ${confirm}`, [3])] : []),
      event(`setu-${r.s.id}-${ymd(r.closes!)}`, r.closes!, `Deadline: ${r.s.name}${tag}`, `${r.s.university}. Application deadline. ${confirm}`, [30, 7]),
    ]);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Setu//Deadlines//EN", ...events, "END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = intake ? `setu-${intake.season}-${intake.year}.ics` : "germany-deadlines.ics";
  a.click();
  URL.revokeObjectURL(url);
}
