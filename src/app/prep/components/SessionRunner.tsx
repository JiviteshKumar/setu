"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { record, TASKS, type Item, type Level } from "@/lib/prep/engine";
import type { SubjectItem } from "@/lib/prep/subject";
import { Stamp, useHydrated } from "@/components/motion";
import { buildSection, SectionReview, TimedSection, type SectionResult, type SectionSpec } from "./TimedSection";
import { usePrepStats } from "./usePrep";

/** Runs one or more timed sections in a row (a single timed set, or the full mock exam with a break). */
export function SessionRunner({ title, intro, sections, mode, breakMinutes = 0 }: { title: string; intro: React.ReactNode; sections: SectionSpec[]; mode: "timed" | "mock"; breakMinutes?: number }) {
  const hydrated = useHydrated();
  const [stats, setStats, loaded] = usePrepStats();
  const [phase, setPhase] = useState<{ step: "intro" } | { step: "section"; i: number; items: { item: Item; level: Level }[] } | { step: "break"; i: number } | { step: "done" }>({ step: "intro" });
  const [results, setResults] = useState<SectionResult[]>([]);

  const startSection = (i: number) => setPhase({ step: "section", i, items: buildSection(sections[i], stats.ratings) });

  const onDone = (r: SectionResult) => {
    // Record every task (each subject question separately) so ratings and history reflect exam conditions.
    setStats((prev) => {
      let s = prev;
      const per = r.seconds * 1000;
      // Only attempted questions update the rating: skipped ones say nothing about skill (the score still counts them as 0).
      for (const e of r.entries) {
        if (e.response === undefined) continue;
        if (e.item.kind === "subject") {
          const picks = (e.response as (number | null)[]) ?? [];
          (e.item as SubjectItem).questions.forEach((q, qi) => {
            if (picks[qi] === null || picks[qi] === undefined) return;
            s = record(s, { type: "subject", level: e.level, score: picks[qi] === q.answer ? 1 : 0, ms: per / (r.entries.length * 6), at: new Date().toISOString(), mode });
          });
        } else {
          s = record(s, { type: r.spec.type, level: e.level, score: e.score, ms: per / r.entries.length, at: new Date().toISOString(), mode });
        }
      }
      return s;
    });
    const all = [...results, r];
    setResults(all);
    const i = all.length;
    if (i >= sections.length) setPhase({ step: "done" });
    else if (breakMinutes && sections[i - 1].type !== "subject" && sections[i].type === "subject") setPhase({ step: "break", i });
    else startSection(i);
  };

  if (phase.step === "intro")
    return (
      <motion.div initial={hydrated ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Link href="/prep" className="text-sm text-muted hover:text-text">
          ← dMAT practice
        </Link>
        <div className="card space-y-3">
          <h1 className="h1">{title}</h1>
          <div className="text-[15px] leading-relaxed text-muted">{intro}</div>
          <ol className="space-y-1.5 text-sm">
            {sections.map((s, i) => (
              <li key={i} className="flex justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
                <span>
                  {TASKS[s.type].module}: <strong>{TASKS[s.type].name}</strong>
                </span>
                <span className="font-mono text-muted">
                  {s.count} {s.type === "subject" ? "texts" : "tasks"} · {s.minutes} min
                </span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">Put away your phone, notes and calculator — they are not allowed in the exam.</p>
          <button type="button" className="btn-primary" disabled={!loaded} onClick={() => startSection(0)}>
            Start
          </button>
        </div>
      </motion.div>
    );

  if (phase.step === "section") return <TimedSection key={phase.i} spec={sections[phase.i]} items={phase.items} onDone={onDone} />;

  if (phase.step === "break")
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card space-y-3 text-center">
        <p className="eyebrow">Core Module finished</p>
        <h2 className="font-display text-4xl">Break</h2>
        <p className="text-muted">In the real exam there is a {breakMinutes}-minute break. Drink some water, stretch, and don&apos;t leave the room — you may not leave the test centre during the break.</p>
        <button type="button" className="btn-primary mx-auto" onClick={() => startSection(phase.i)}>
          Start the Subject Module
        </button>
      </motion.div>
    );

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <Stamp tone="ok" rotate={-8}>
            Completed
          </Stamp>
        </div>
        <p className="eyebrow">Results</p>
        <h1 className="h1 pr-28">{title}</h1>
        <p className="mt-2 text-sm text-muted">These are practice results on original Setu questions, not an official dMAT score. Use them to find what to train next.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/prep" className="btn-primary">
            Back to practice
          </Link>
        </div>
      </motion.div>
      {results.map((r, i) => (
        <SectionReview key={i} result={r} />
      ))}
    </div>
  );
}
