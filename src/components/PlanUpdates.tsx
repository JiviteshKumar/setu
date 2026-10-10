"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { intakeLabel } from "@/lib/intake";
import { isNews, usePlanUpdates, useSeenPlanUpdates } from "@/lib/myIntake";
import { useSaved } from "@/lib/saved";
import { EASE_OUT } from "./motion";

const TONE = {
  good: "bg-ok",
  warn: "bg-gold",
  danger: "bg-danger",
  info: "bg-accent-bright",
} as const;

/** Updates about the student's saved courses for their chosen intake. Opening this marks them as seen. */
export function PlanUpdates({ showHeading = true }: { showHeading?: boolean }) {
  const plan = usePlanUpdates();
  const [saved, , savedLoaded] = useSaved();
  const [seen, setSeen, seenLoaded] = useSeenPlanUpdates();
  const [newKeys] = useState(() => new Set<string>());

  useEffect(() => {
    if (!plan || !seenLoaded) return;
    const unseen = plan.updates.filter((u) => isNews(u) && !seen.includes(u.key)).map((u) => u.key);
    if (unseen.length) {
      unseen.forEach((k) => newKeys.add(k));
      // Keep the list short: only keys that still exist plus the new ones.
      const current = new Set(plan.updates.map((u) => u.key));
      setSeen((prev) => [...new Set([...prev.filter((k) => current.has(k)), ...unseen])]);
    }
  }, [plan, seen, seenLoaded, setSeen, newKeys]);

  if (!plan) return null;
  const news = plan.updates.filter(isNews);
  const notes = plan.updates.filter((u) => !isNews(u));

  return (
    <section>
      {showHeading && (
        <>
          <p className="eyebrow">For your {intakeLabel(plan.intake)} plan</p>
          <h2 className="mt-1 mb-3 font-display text-3xl">Updates</h2>
        </>
      )}
      {savedLoaded && saved.length === 0 ? (
        <p className="card text-sm text-muted">
          Save courses in the{" "}
          <Link href="/programmes" className="text-accent underline">
            course finder
          </Link>{" "}
          (☆) and Setu tells you here when their applications for {intakeLabel(plan.intake)} open, when they close and when DAAD changes something.
        </p>
      ) : news.length === 0 ? (
        <p className="card text-sm text-muted">Nothing new for {intakeLabel(plan.intake)} right now: none of your saved courses opens or closes in the next 30 days.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {news.map((u, i) => (
              <motion.li key={u.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04, ease: EASE_OUT } }}>
                <Link href={`/programmes/${u.courseId}`} className="card-link flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE[u.tone]}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{u.title}</span>
                      {newKeys.has(u.key) && (
                        <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="chip border-accent-bright/40 bg-accent-soft text-[10px] text-accent">
                          New
                        </motion.span>
                      )}
                    </span>
                    <span className="block truncate text-sm">{u.course}</span>
                    <span className="block text-xs text-muted">
                      {u.university} · {u.detail}
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {notes.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          {notes.length} saved course{notes.length === 1 ? " has" : "s have"} no machine-readable {plan.intake.season} deadline — check {notes.length === 1 ? "its" : "their"} course page.
        </p>
      )}
    </section>
  );
}
