"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { generateItem, pickLevel, TASKS, type Item, type Level, type PrepStats, type TaskType } from "@/lib/prep/engine";
import { newSeed } from "@/lib/prep/random";
import { PASSAGES, type SubjectItem } from "@/lib/prep/subject";
import { EASE_OUT } from "@/components/motion";
import { Countdown } from "./Countdown";
import { EquationTask, FigureTask, LatinTask, PassageText, SubjectQuestionView } from "./Tasks";

export type SectionSpec = { type: TaskType; count: number; minutes: number };
export type SectionResult = { spec: SectionSpec; entries: { item: Item; level: Level; score: number; response: unknown }[]; seconds: number };

/** Build the items for a section. Core: `count` tasks. Subject: `count` different passages. */
export function buildSection(spec: SectionSpec, ratings: PrepStats["ratings"]) {
  if (spec.type === "subject") {
    const ids = [...PASSAGES].sort(() => Math.random() - 0.5).slice(0, spec.count).map((p) => p.id);
    return ids.map((id) => ({ item: generateItem("subject", 2, newSeed(), id), level: 2 as Level }));
  }
  return Array.from({ length: spec.count }, () => {
    const level = pickLevel(ratings[spec.type]);
    return { item: generateItem(spec.type, level, newSeed()), level };
  });
}

export function TimedSection({ spec, items, onDone }: { spec: SectionSpec; items: { item: Item; level: Level }[]; onDone: (r: SectionResult) => void }) {
  const total = spec.minutes * 60;
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ score: number; response: unknown }[]>(() => items.map(() => ({ score: 0, response: undefined })));
  const doneRef = useRef(false);
  const left = Math.round(total - (now - startedAt) / 1000);

  const finish = (final = answers) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone({ spec, entries: items.map((it, i) => ({ ...it, ...final[i] })), seconds: Math.round((Date.now() - startedAt) / 1000) });
  };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left <= 0) finish();
  });

  const setAnswer = (i: number, score: number, response: unknown) => {
    const next = answers.map((a, j) => (j === i ? { score, response } : a));
    setAnswers(next);
    // Core tasks move on automatically, like the real exam flow.
    if (spec.type !== "subject" && i === index && index < items.length - 1) setTimeout(() => setIndex((x) => Math.max(x, i + 1)), 250);
  };

  const current = items[index];
  const answeredCount = answers.filter((a) => a.response !== undefined).length;

  return (
    <div className="space-y-4">
      <div className="sticky top-[calc(57px+env(safe-area-inset-top))] z-20 -mx-4 flex items-center justify-between gap-3 bg-bg/85 px-4 py-2 backdrop-blur-xl">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{TASKS[spec.type].module}</p>
          <p className="truncate font-semibold">{TASKS[spec.type].name}</p>
          <p className="text-xs text-muted">
            {answeredCount}/{spec.type === "subject" ? items.reduce((s, it) => s + (it.item as SubjectItem).questions.length, 0) : items.length} answered
          </p>
        </div>
        <Countdown left={left} total={total} />
      </div>

      {/* Task navigator */}
      <div className="flex flex-wrap gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to ${spec.type === "subject" ? "text" : "task"} ${i + 1}`}
            className={`h-7 min-w-7 rounded-md px-1 font-mono text-xs ${i === index ? "bg-accent text-on-accent" : answers[i].response !== undefined ? "bg-ok-soft text-ok" : "bg-surface-2 text-muted"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* New task appears immediately and only animates in — never wait for an exit animation in a timed exam. */}
      <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, ease: EASE_OUT }}>
          {current.item.kind === "figures" && <FigureTask key={index} item={current.item} reveal={false} response={answers[index].response} onAnswer={(s, r) => setAnswer(index, s, r)} />}
          {current.item.kind === "equations" && <EquationTask key={index} item={current.item} reveal={false} response={answers[index].response} onAnswer={(s, r) => setAnswer(index, s, r)} />}
          {current.item.kind === "latin" && <LatinTask key={index} item={current.item} reveal={false} response={answers[index].response} onAnswer={(s, r) => setAnswer(index, s, r)} />}
          {current.item.kind === "subject" && (
            <SubjectBlock
              item={current.item}
              picks={(answers[index].response as (number | null)[]) ?? current.item.questions.map(() => null)}
              onPicks={(picks) => {
                const s = current.item as SubjectItem;
                const score = picks.filter((p, qi) => p === s.questions[qi].answer).length / s.questions.length;
                const next = answers.map((a, j) => (j === index ? { score, response: picks } : a));
                setAnswers(next);
              }}
            />
          )}
      </motion.div>

      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className="btn-ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          ← Previous
        </button>
        {index < items.length - 1 ? (
          <button type="button" className="btn-ghost" onClick={() => setIndex((i) => i + 1)}>
            Next →
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => finish()}>
            Finish section
          </button>
        )}
      </div>
    </div>
  );
}

function SubjectBlock({ item, picks, onPicks }: { item: SubjectItem; picks: (number | null)[]; onPicks: (p: (number | null)[]) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:sticky lg:top-36 lg:self-start">
        <PassageText item={item} />
      </div>
      <div className="space-y-5">
        {item.questions.map((q, qi) => (
          <SubjectQuestionView key={qi} question={q} index={qi} reveal={false} picked={picks[qi]} onPick={(oi) => onPicks(picks.map((p, i) => (i === qi ? oi : p)))} />
        ))}
      </div>
    </div>
  );
}

/** Score summary + review of every task with the correct answer and explanation. */
export function SectionReview({ result }: { result: SectionResult }) {
  const isSubject = result.spec.type === "subject";
  const totalQ = isSubject ? result.entries.reduce((s, e) => s + (e.item as SubjectItem).questions.length, 0) : result.entries.length;
  const correct = isSubject
    ? result.entries.reduce((s, e) => s + Math.round(e.score * (e.item as SubjectItem).questions.length), 0)
    : result.entries.reduce((s, e) => s + e.score, 0);
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="h2">{TASKS[result.spec.type].name}</h3>
        <p className="font-mono text-sm">
          <strong className="text-lg">{correct % 1 ? correct.toFixed(1) : correct}</strong> / {totalQ} · {Math.floor(result.seconds / 60)}:{String(result.seconds % 60).padStart(2, "0")} min
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full rounded-full bg-ok" initial={{ width: 0 }} animate={{ width: `${(correct / totalQ) * 100}%` }} transition={{ duration: 0.8, ease: EASE_OUT }} />
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-accent">Review answers and explanations</summary>
        <div className="mt-3 space-y-6">
          {result.entries.map((e, i) => (
            <div key={i} className="border-t border-border pt-4">
              <p className="mb-2 font-mono text-xs text-muted">
                {isSubject ? "Text" : "Task"} {i + 1} · level {e.level} · {e.response === undefined ? "not answered" : isSubject ? `${Math.round(e.score * 100)}% correct` : e.score === 1 ? "correct" : e.score > 0 ? "half correct" : "wrong"}
              </p>
              {e.item.kind === "figures" && <FigureTask item={e.item} reveal response={e.response ?? [null, null]} onAnswer={() => {}} />}
              {e.item.kind === "equations" && <EquationTask item={e.item} reveal response={e.response ?? {}} onAnswer={() => {}} />}
              {e.item.kind === "latin" && <LatinTask item={e.item} reveal response={e.response ?? null} onAnswer={() => {}} />}
              {e.item.kind !== "subject" && (
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {e.item.explanation.map((x, k) => (
                    <li key={k}>{x}</li>
                  ))}
                </ul>
              )}
              {e.item.kind === "subject" && (
                <div className="space-y-4">
                  <PassageText item={e.item} />
                  {e.item.questions.map((q, qi) => (
                    <SubjectQuestionView key={qi} question={q} index={qi} reveal picked={((e.response as (number | null)[]) ?? [])[qi] ?? null} onPick={() => {}} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
