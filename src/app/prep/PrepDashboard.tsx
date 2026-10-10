"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { examPace, ratingLabel, TASKS, type TaskType } from "@/lib/prep/engine";
import { AnimatedNumber, EASE_OUT, useHydrated } from "@/components/motion";
import { usePrepStats } from "./components/usePrep";

const ORDER: TaskType[] = ["figures", "equations", "latin", "subject"];

function RatingRing({ rating }: { rating: number }) {
  // 800 → empty, 1250 → full
  const pct = Math.max(0.03, Math.min(1, (rating - 800) / 450));
  const tone = ratingLabel(rating).tone;
  const color = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : "var(--accent-bright)";
  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <motion.circle cx="32" cy="32" r="27" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 1 - pct }} transition={{ duration: 1, ease: EASE_OUT }} />
      </svg>
      <span className="font-mono text-xs font-semibold tabular-nums">
        <AnimatedNumber value={rating} />
      </span>
    </div>
  );
}

export function PrepDashboard() {
  const hydrated = useHydrated();
  const [stats, , loaded] = usePrepStats();
  const weakest = ORDER.reduce((a, b) => (stats.ratings[b] < stats.ratings[a] ? b : a));
  const practised = stats.history.length;

  return (
    <div className="space-y-4">
      {loaded && practised > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-wrap items-center justify-between gap-3 border-accent-bright/40 bg-accent-soft">
          <p className="text-[15px]">
            <strong>Train next: {TASKS[weakest].name}</strong> — your lowest rating right now.
          </p>
          <Link href={`/prep/train/${weakest}`} className="btn-primary">
            Train {TASKS[weakest].name.split(" ")[0]} →
          </Link>
        </motion.div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {ORDER.map((t, i) => {
          const recent = stats.history.filter((h) => h.type === t).slice(-20);
          const acc = recent.length ? Math.round((recent.reduce((s, h) => s + h.score, 0) / recent.length) * 100) : null;
          const avg = recent.length ? Math.round(recent.reduce((s, h) => s + h.ms, 0) / recent.length / 1000) : null;
          const pace = examPace(t);
          return (
            <motion.article
              key={t}
              initial={hydrated ? { opacity: 0, y: 14 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.45, ease: EASE_OUT }}
              className="card flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <RatingRing rating={stats.ratings[t]} />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{TASKS[t].module}</p>
                  <h3 className="font-semibold">{TASKS[t].name}</h3>
                  <p className="text-sm text-muted">{TASKS[t].short}</p>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-surface-2 p-2">
                  <dt className="text-muted">Level</dt>
                  <dd className="font-medium">{ratingLabel(stats.ratings[t]).label}</dd>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <dt className="text-muted">Accuracy</dt>
                  <dd className="font-medium">{acc === null ? "—" : `${acc}%`}</dd>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <dt className="text-muted">{pace ? "Time / task" : "Answered"}</dt>
                  <dd className={`font-medium ${pace && avg && avg > pace ? "text-warn" : ""}`}>{pace ? (avg === null ? "—" : `${avg}s / ${pace}s`) : recent.length}</dd>
                </div>
              </dl>
              <div className="mt-auto flex gap-2">
                <Link href={`/prep/train/${t}`} className="btn-primary flex-1">
                  Train
                </Link>
                <Link href={`/prep/timed/${t}`} className="btn-ghost flex-1">
                  Timed set
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
