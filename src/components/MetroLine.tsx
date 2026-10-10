"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Stamp } from "./motion";

export type Station = { id: string; title: string; detail: ReactNode; href?: string; external?: boolean; zone?: string };

/**
 * A U-Bahn style line diagram: each step is a station. Completed stations are filled and stamped,
 * the line fills up to your progress, and a "you are here" marker glides to the next open station.
 */
export function MetroLine({
  stations,
  done,
  onToggle,
  lineName = "U1",
}: {
  stations: Station[];
  done: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
  lineName?: string;
}) {
  const completed = stations.filter((s) => done[s.id]).length;
  const nextIndex = stations.findIndex((s) => !done[s.id]);
  const pct = completed / stations.length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-rail px-2 font-mono text-sm font-bold text-white">{lineName}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {nextIndex === -1 ? "Final stop reached — Willkommen in Deutschland!" : `Next stop: ${stations[nextIndex].title}`}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <motion.div className="h-full rounded-full bg-rail" initial={false} animate={{ width: `${pct * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
          </div>
        </div>
        <span className="font-mono text-xs text-muted tabular-nums">
          {completed}/{stations.length}
        </span>
      </div>

      <ol className="relative">
        {stations.map((s, i) => {
          const isDone = !!done[s.id];
          const isNext = i === nextIndex;
          const prevDone = i > 0 && !!done[stations[i - 1].id];
          const showZone = s.zone && s.zone !== stations[i - 1]?.zone;
          return (
            <li key={s.id}>
              {showZone && <p className="mt-4 mb-2 ml-12 font-mono text-[10px] tracking-[0.2em] text-muted uppercase first:mt-0">{s.zone}</p>}
              <div className="relative flex gap-4 pb-5">
                {/* track segment from this station to the next */}
                {i < stations.length - 1 && (
                  <div className="absolute top-6 bottom-0 left-[15px] w-1.5 rounded-full bg-surface-2">
                    <motion.div
                      className="w-full rounded-full bg-rail"
                      initial={false}
                      animate={{ height: isDone && done[stations[i + 1].id] ? "100%" : isDone ? "45%" : "0%" }}
                      transition={{ type: "spring", stiffness: 140, damping: 22 }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onToggle(s.id, !isDone)}
                  aria-pressed={isDone}
                  aria-label={`${isDone ? "Mark as not done" : "Mark as done"}: ${s.title}`}
                  className="relative z-10 mt-0.5 grid h-9 w-9 shrink-0 place-items-center"
                >
                  {isNext && (
                    <motion.span layoutId={`${lineName}-here`} className="absolute inset-0 rounded-full bg-accent-soft ring-2 ring-rail" transition={{ type: "spring", stiffness: 300, damping: 28 }} />
                  )}
                  <motion.span
                    className="relative grid h-5 w-5 place-items-center rounded-full border-[3px]"
                    initial={false}
                    animate={{
                      backgroundColor: isDone ? "var(--rail)" : "var(--surface)",
                      borderColor: isDone || prevDone || isNext ? "var(--rail)" : "var(--border)",
                      scale: isDone ? [1, 1.35, 1] : 1,
                    }}
                    transition={{ duration: 0.35 }}
                  >
                    <AnimatePresence>
                      {isDone && (
                        <motion.svg viewBox="0 0 24 24" className="h-3 w-3 text-white" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor" />
                        </motion.svg>
                      )}
                    </AnimatePresence>
                  </motion.span>
                </button>

                <div className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 transition-colors ${isNext ? "border-rail/50 bg-surface shadow-card" : "border-transparent"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-medium transition-colors ${isDone ? "text-muted" : ""}`}>{s.title}</p>
                    <AnimatePresence>
                      {isDone && (
                        <motion.span exit={{ opacity: 0, scale: 0.8 }}>
                          <Stamp tone="ok" rotate={-6} className="text-[9px]">
                            Done
                          </Stamp>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {s.detail}{" "}
                    {s.href &&
                      (s.external ? (
                        <a className="whitespace-nowrap text-accent underline" href={s.href} target="_blank" rel="noopener noreferrer">
                          Official site ↗
                        </a>
                      ) : (
                        <Link className="whitespace-nowrap text-accent underline" href={s.href}>
                          Open →
                        </Link>
                      ))}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
