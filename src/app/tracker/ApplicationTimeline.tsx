"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { Window } from "@/lib/windows";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;

/** A month strip per saved course (12–24 months from now): the bar is the application window, the line is today. */
export function ApplicationTimeline({ rows, today, months: count = 12 }: { rows: { id: number; name: string; window: Window }[]; today: Date; months?: number }) {
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(start.getFullYear(), start.getMonth() + count, 1);
  const span = end.getTime() - start.getTime();
  const pos = (d: Date) => Math.max(0, Math.min(1, (d.getTime() - start.getTime()) / span)) * 100;
  const todayPos = pos(today);
  const months = Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1));
  const last = months[months.length - 1];

  return (
    <div className="card overflow-hidden">
      <p className="mb-1 ml-28 font-mono text-[10px] text-muted sm:ml-40">
        {MONTH_NAMES[start.getMonth()]} {start.getFullYear()} → {MONTH_NAMES[last.getMonth()]} {last.getFullYear()}
      </p>
      <div className="relative ml-28 grid border-b border-border pb-1 font-mono text-[10px] text-muted sm:ml-40" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {months.map((m) => (
          <span key={m.toISOString()} className={`text-center ${m.getMonth() === 0 ? "font-bold text-text" : ""}`} title={`${MONTH_NAMES[m.getMonth()]} ${m.getFullYear()}`}>
            {MONTHS[m.getMonth()]}
          </span>
        ))}
      </div>
      <ul className="mt-2 space-y-2">
        {rows.map((r, i) => {
          const opens = r.window.opens ?? new Date(r.window.closes.getTime() - 60 * DAY); // unknown opening: show the last two months faded
          const left = pos(opens);
          const width = Math.max(1.5, pos(r.window.closes) - left);
          const color =
            r.window.status === "closing-soon" ? "var(--danger)" : r.window.status === "upcoming" ? "var(--gold)" : r.window.status === "open" ? "var(--ok)" : "var(--accent-bright)";
          return (
            <li key={r.id} className="flex items-center gap-2">
              <Link href={`/programmes/${r.id}`} className="w-26 shrink-0 truncate text-xs hover:text-accent sm:w-38" title={r.name}>
                {r.name}
              </Link>
              <div className="relative h-5 flex-1 rounded-full bg-surface-2">
                <motion.div
                  className="absolute top-0 h-full rounded-full"
                  style={{ left: `${left}%`, background: color, opacity: r.window.opens ? 0.9 : 0.45, transformOrigin: "left" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 90, damping: 18 }}
                />
                <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-text/70" style={{ left: `${todayPos}%` }} aria-hidden />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-3 w-0.5 rounded-full bg-text/70" />
          Today
        </span>
        <Legend color="var(--ok)" label="Open" />
        <Legend color="var(--gold)" label="Opens later" />
        <Legend color="var(--danger)" label="Closes within 30 days" />
        <Legend color="var(--accent-bright)" label="Only the deadline is listed (faded: last 2 months before it)" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-4 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
