"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { generateItem, pickLevel, record, ratingLabel, TASKS, examPace, type Item, type Level, type TaskType } from "@/lib/prep/engine";
import { newSeed } from "@/lib/prep/random";
import type { SubjectItem } from "@/lib/prep/subject";
import { Stamp, EASE_OUT, useHydrated } from "@/components/motion";
import { EquationTask, FigureTask, LatinTask, PassageText, SubjectQuestionView } from "./Tasks";
import { usePrepStats } from "./usePrep";

/** Untimed, adaptive practice with an explanation after every answer. */
export function TrainRunner({ type }: { type: TaskType }) {
  const hydrated = useHydrated();
  const [stats, setStats, loaded] = usePrepStats();
  const [item, setItem] = useState<{ item: Item; level: Level } | null>(null);
  const [answered, setAnswered] = useState<{ score: number; response: unknown; delta: number } | null>(null);
  const [subjectPicks, setSubjectPicks] = useState<(number | null)[]>([]);
  const [count, setCount] = useState(0);
  const started = useRef(0);
  const rating = stats.ratings[type];
  const pace = examPace(type);

  function next() {
    const level = pickLevel(rating);
    const it = generateItem(type, level, newSeed());
    setItem({ item: it, level });
    setAnswered(null);
    setSubjectPicks(it.kind === "subject" ? it.questions.map(() => null) : []);
    started.current = clock();
    setCount((c) => c + 1);
  }

  function answer(score: number, response: unknown) {
    if (!item || answered) return;
    const ms = elapsedSince(started.current);
    const before = stats.ratings[type];
    const updated = record(stats, { type, level: item.level, score, ms, at: new Date().toISOString(), mode: "train" });
    setStats(updated);
    setAnswered({ score, response, delta: updated.ratings[type] - before });
  }

  // Subject passages: each question is recorded separately; the passage counts as answered when all are done.
  function pickSubject(qi: number, oi: number) {
    if (!item || item.item.kind !== "subject" || subjectPicks[qi] !== null) return;
    const s = item.item as SubjectItem;
    const picks = subjectPicks.map((p, i) => (i === qi ? oi : p));
    setSubjectPicks(picks);
    const ms = elapsedSince(started.current);
    setStats((prev) => record(prev, { type, level: item.level, score: oi === s.questions[qi].answer ? 1 : 0, ms, at: new Date().toISOString(), mode: "train" }));
    if (picks.every((p) => p !== null)) {
      const correct = picks.filter((p, i) => p === s.questions[i].answer).length;
      setAnswered({ score: correct / s.questions.length, response: picks, delta: 0 });
    }
  }

  const label = ratingLabel(rating);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/prep" className="text-sm text-muted hover:text-text">
          ← dMAT practice
        </Link>
        {loaded && (
          <span className="chip">
            Rating <strong className="mx-1 text-text tabular-nums">{rating}</strong> · {label.label}
          </span>
        )}
      </div>

      {!item && (
        <motion.div initial={hydrated ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} className="card space-y-3">
          <p className="eyebrow">
            {TASKS[type].module} · Training
          </p>
          <h1 className="h1">{TASKS[type].name}</h1>
          <p className="text-[15px] leading-relaxed text-muted">{TASKS[type].how}</p>
          <p className="text-sm text-muted">
            The difficulty adapts to you after every answer. {pace ? `Exam pace: about ${pace} seconds per task.` : ""} No notes or calculator in the exam — practise
            the same way.
          </p>
          <button type="button" className="btn-primary" onClick={next} disabled={!loaded}>
            Start training
          </button>
        </motion.div>
      )}

      {item && (
          <motion.div
            key={count}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-mono">#{count}</span>
              <span className="chip">Level {item.level}</span>
              <span>{TASKS[type].name}</span>
            </div>

            {item.item.kind === "figures" && <FigureTask item={item.item} reveal={!!answered} onAnswer={answer} />}
            {item.item.kind === "equations" && <EquationTask item={item.item} reveal={!!answered} onAnswer={answer} />}
            {item.item.kind === "latin" && <LatinTask item={item.item} reveal={!!answered} onAnswer={answer} />}
            {item.item.kind === "subject" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="lg:sticky lg:top-20 lg:self-start">
                  <PassageText item={item.item} />
                </div>
                <div className="space-y-5">
                  {item.item.questions.map((qq, qi) => (
                    <SubjectQuestionView key={qi} question={qq} index={qi} reveal={subjectPicks[qi] !== null} picked={subjectPicks[qi]} onPick={(oi) => pickSubject(qi, oi)} />
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {answered && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`card relative overflow-hidden ${answered.score === 1 ? "border-ok/40" : answered.score > 0 ? "border-warn/40" : "border-danger/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">
                        {answered.score === 1 ? "Correct" : answered.score > 0 ? `Partly correct (${Math.round(answered.score * 100)}%)` : "Not quite"}
                      </p>
                      {answered.delta !== 0 && (
                        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`text-sm font-medium ${answered.delta > 0 ? "text-ok" : "text-danger"}`}>
                          Rating {answered.delta > 0 ? "+" : ""}
                          {answered.delta}
                        </motion.p>
                      )}
                    </div>
                    <Stamp tone={answered.score === 1 ? "ok" : answered.score > 0 ? "warn" : "danger"} rotate={-9}>
                      {answered.score === 1 ? "Correct" : answered.score > 0 ? "Half" : "Retry"}
                    </Stamp>
                  </div>
                  {item.item.kind !== "subject" && (
                    <ul className="mt-3 space-y-1 text-sm text-muted">
                      {item.item.explanation.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="btn-primary mt-4" onClick={next}>
                    Next task →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
    </div>
  );
}

// Clock reads live outside the component: they only run in event handlers (answer taps), never during render.
function clock() {
  return Date.now();
}
function elapsedSince(start: number) {
  return Date.now() - start;
}
