"use client";

import { useMemo, useState } from "react";
import { useStoredState } from "@/lib/useStoredState";
import { periods as periodList, workEntries } from "@/lib/storedShapes";
import { ANNUAL_LIMIT, computeAccount, isoWeek, type WorkEntry } from "@/lib/workdays";
import { Gauge } from "@/components/Gauge";

type Period = { from: string; to: string };

function weeksInPeriods(periods: Period[]): Set<string> {
  const set = new Set<string>();
  for (const p of periods) {
    if (!p.from || !p.to || p.to < p.from) continue;
    for (let d = new Date(`${p.from}T00:00:00Z`); d <= new Date(`${p.to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      set.add(isoWeek(d.toISOString().slice(0, 10)));
    }
  }
  return set;
}

export function WorkTracker() {
  const [entries, setEntries] = useStoredState<WorkEntry[]>("work-entries", [], workEntries);
  const [periods, setPeriods] = useStoredState<Period[]>("lecture-periods", [], periodList);
  const [draft, setDraft] = useState({ date: "", hours: "", studentAssistant: false, fullTime: false });
  const [error, setError] = useState("");
  const [year, setYear] = useState<string>("all");

  const years = useMemo(() => [...new Set(entries.map((e) => e.date.slice(0, 4)))].sort(), [entries]);
  const visible = year === "all" ? entries : entries.filter((e) => e.date.startsWith(year));
  const account = useMemo(() => computeAccount(visible, weeksInPeriods(periods)), [visible, periods]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const hours = Number(draft.hours.replace(",", "."));
    if (!draft.date) return setError("Choose the date you worked.");
    if (!(hours > 0) || hours > 24) return setError("Enter the hours worked that day — a number between 0.5 and 24.");
    setError("");
    setEntries((prev) => [...prev, { date: draft.date, hours, studentAssistant: draft.studentAssistant, fullTime: draft.fullTime }].sort((a, b) => a.date.localeCompare(b.date)));
    setDraft({ ...draft, hours: "" });
  }

  return (
    <div className="space-y-4">
      <div className="card">
        {years.length > 1 && (
          <div className="flex justify-end">
            <select className="rounded-lg border border-border bg-surface px-2 py-1 text-sm" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">All entries</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
        <Gauge value={account.used} max={ANNUAL_LIMIT} label="working days used" />
        <p className={`mt-2 text-center text-sm ${account.remaining < 0 ? "font-medium text-danger" : "text-muted"}`}>
          {account.remaining >= 0 ? `${account.remaining} days left` : `Over the limit by ${-account.remaining} days — talk to your foreigners' office before working more.`}
        </p>
      </div>

      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Date worked</span>
          <input type="date" className="input" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required />
        </label>
        <label className="block">
          <span className="label">Hours that day</span>
          <input className="input" inputMode="decimal" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} required />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={draft.studentAssistant} onChange={(e) => setDraft({ ...draft, studentAssistant: e.target.checked })} />
          Student assistant job at my university (not counted)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={draft.fullTime} onChange={(e) => setDraft({ ...draft, fullTime: e.target.checked })} />
          Full-time job (e.g. during semester break)
        </label>
        {error && (
          <p className="text-sm text-danger sm:col-span-2" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary sm:col-span-2">Add working day</button>
      </form>

      <details className="card">
        <summary className="cursor-pointer font-medium">Lecture periods (Vorlesungszeit) {periods.length > 0 && `· ${periods.length} saved`}</summary>
        <p className="mt-2 text-sm text-muted">
          Enter your university&apos;s lecture periods. Weeks inside them can use the 2.5-day rule only if you work up to 20 hours; outside them the 2.5-day rule
          always applies to part-time work.
        </p>
        {periods.map((p, i) => (
          <div key={i} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <input type="date" className="input w-auto py-1" value={p.from} onChange={(e) => setPeriods(periods.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
            to
            <input type="date" className="input w-auto py-1" value={p.to} onChange={(e) => setPeriods(periods.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
            <button type="button" className="text-danger underline" onClick={() => setPeriods(periods.filter((_, j) => j !== i))}>
              remove
            </button>
          </div>
        ))}
        <button type="button" className="btn-ghost mt-3" onClick={() => setPeriods([...periods, { from: "", to: "" }])}>
          Add lecture period
        </button>
      </details>

      {account.weeks.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="h2 mb-2">By week</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Week</th>
                <th className="py-1 pr-3 font-medium">Hours</th>
                <th className="py-1 pr-3 font-medium">Counted</th>
                <th className="py-1 font-medium">Rule used</th>
              </tr>
            </thead>
            <tbody>
              {account.weeks.map((w) => (
                <tr key={w.week} className="border-t border-border">
                  <td className="py-1.5 pr-3">{w.week}</td>
                  <td className="py-1.5 pr-3">{w.hours}</td>
                  <td className="py-1.5 pr-3 font-medium">{w.counted}</td>
                  <td className="py-1.5 text-muted">{w.method === "week" ? "2.5 per week" : "by day (½ or 1)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-medium">All entries ({entries.length})</summary>
          <ul className="mt-2 divide-y divide-border text-sm">
            {entries.map((e, i) => (
              <li key={i} className="flex items-center justify-between py-1.5">
                <span>
                  {e.date} · {e.hours} h{e.studentAssistant ? " · student assistant" : ""}
                  {e.fullTime ? " · full-time" : ""}
                </span>
                <button type="button" className="text-danger underline" onClick={() => setEntries(entries.filter((_, j) => j !== i))}>
                  delete
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
