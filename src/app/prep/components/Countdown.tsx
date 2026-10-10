"use client";

import { motion } from "motion/react";

/** Ring countdown like an exam clock. `left` and `total` in seconds. */
export function Countdown({ left, total }: { left: number; total: number }) {
  const pct = Math.max(0, left / total);
  const mm = Math.floor(Math.max(0, left) / 60);
  const ss = Math.max(0, left) % 60;
  const color = pct < 0.1 ? "var(--danger)" : pct < 0.25 ? "var(--warn)" : "var(--accent-bright)";
  return (
    <div className="relative grid h-16 w-16 place-items-center" role="timer" aria-label={`${mm} minutes ${ss} seconds left`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        <motion.circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" animate={{ strokeDashoffset: 1 - pct }} transition={{ duration: 0.4 }} />
      </svg>
      <span className="font-mono text-sm font-semibold tabular-nums">
        {mm}:{String(ss).padStart(2, "0")}
      </span>
    </div>
  );
}
