"use client";

// Renderers for each task type. They report an answer score (0–1) through onAnswer and show feedback when `reveal` is set.
import { motion } from "motion/react";
import { useState } from "react";
import type { FigureItem } from "@/lib/prep/figures";
import type { EquationItem } from "@/lib/prep/equations";
import type { LatinItem } from "@/lib/prep/latin";
import { SYMBOLS } from "@/lib/prep/latin";
import type { SubjectItem } from "@/lib/prep/subject";
import { FigureMatrix } from "./FigureMatrix";

type Common<T> = { item: T; reveal: boolean; onAnswer: (score: number, response: unknown) => void; response?: unknown };

const optionCls = (state: "idle" | "chosen" | "right" | "wrong") =>
  ({
    idle: "border-border bg-surface hover:border-accent-bright/60",
    chosen: "border-accent-bright bg-accent-soft",
    right: "border-ok bg-ok-soft",
    wrong: "border-danger bg-danger-soft",
  })[state];

// ─── Figure Sequences ────────────────────────────────────────────────────────────────
export function FigureTask({ item, reveal, onAnswer, response }: Common<FigureItem>) {
  const [picked, setPicked] = useState<(number | null)[]>((response as number[]) ?? [null, null]);
  const choose = (qi: number, oi: number) => {
    if (reveal) return;
    const next = [...picked];
    next[qi] = oi;
    setPicked(next);
    if (next.every((x) => x !== null)) {
      const score = item.questions.reduce((s, q, i) => s + (next[i] === q.answer ? 0.5 : 0), 0);
      onAnswer(score, next);
    }
  };
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Find the rule and choose matrix 5 and matrix 6.</p>
      <div className="grid grid-cols-6 gap-1.5 pb-2 sm:max-w-xl sm:gap-2">
        {[...item.frames, null, null].map((f, i) => (
          <div key={i} className="text-center">
            <FigureMatrix frame={f} label={`matrix ${i + 1}`} highlight={i >= 4} className="w-full" />
            <span className="font-mono text-[10px] text-muted">{i + 1}</span>
          </div>
        ))}
      </div>
      {item.questions.map((q, qi) => (
        <div key={qi} className="mt-3">
          <p className="mb-1.5 text-sm font-medium">Matrix {qi + 5}</p>
          <div className="grid grid-cols-4 gap-2">
            {q.options.map((o, oi) => {
              const state = reveal ? (oi === q.answer ? "right" : picked[qi] === oi ? "wrong" : "idle") : picked[qi] === oi ? "chosen" : "idle";
              return (
                <motion.button
                  key={oi}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => choose(qi, oi)}
                  aria-label={`Matrix ${qi + 5}, option ${String.fromCharCode(65 + oi)}`}
                  aria-pressed={picked[qi] === oi}
                  className={`rounded-xl border-2 p-1 transition-colors ${optionCls(state)}`}
                >
                  <FigureMatrix frame={o} className="w-full" />
                  <span className="font-mono text-[10px] text-muted">{String.fromCharCode(65 + oi)}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Mathematical Equations ──────────────────────────────────────────────────────────
export function EquationTask({ item, reveal, onAnswer, response }: Common<EquationItem>) {
  const [vals, setVals] = useState<Record<string, string>>((response as Record<string, string>) ?? {});
  const [active, setActive] = useState(item.letters[0]);
  const complete = item.letters.every((l) => vals[l]);
  const submit = () => {
    if (!complete || reveal) return;
    const correct = item.letters.every((l) => Number(vals[l]) === item.solution[l]);
    onAnswer(correct ? 1 : 0, vals);
  };
  const press = (k: string) => {
    if (reveal) return;
    const cur = vals[active] ?? "";
    const next = k === "⌫" ? cur.slice(0, -1) : (cur + k).slice(0, 2);
    if (k !== "⌫" && Number(next) > 20) return; // values are 1–20
    setVals({ ...vals, [active]: next });
  };
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Each letter is a whole number from 1 to 20. Solve in your head — no notes.</p>
      <div className="card space-y-1.5 bg-surface-2 font-mono text-lg">
        {item.equations.map((e) => (
          <p key={e}>{e}</p>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.letters.map((l) => {
          const right = reveal && Number(vals[l]) === item.solution[l];
          return (
            <button
              key={l}
              type="button"
              onClick={() => setActive(l)}
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 font-mono text-lg ${
                reveal ? (right ? "border-ok bg-ok-soft" : "border-danger bg-danger-soft") : active === l ? "border-accent-bright bg-accent-soft" : "border-border bg-surface"
              }`}
            >
              {l} = <span className="min-w-6 text-left">{vals[l] ?? "_"}</span>
              {reveal && !right && <span className="text-sm text-ok">({item.solution[l]})</span>}
            </button>
          );
        })}
      </div>
      {!reveal && (
        <div className="mt-3 grid max-w-xs grid-cols-4 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"].map((k) => (
            <motion.button key={k} type="button" whileTap={{ scale: 0.92 }} onClick={() => press(k)} className="rounded-xl border border-border bg-surface py-2.5 font-mono text-lg hover:bg-surface-2">
              {k}
            </motion.button>
          ))}
          <button type="button" onClick={submit} disabled={!complete} className="btn-primary disabled:opacity-40">
            OK
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Latin Squares ───────────────────────────────────────────────────────────────────
export function LatinTask({ item, reveal, onAnswer, response }: Common<LatinItem>) {
  const [picked, setPicked] = useState<string | null>((response as string) ?? null);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Each letter appears once in every row and column. Which letter replaces the ?</p>
      <div className="mx-auto grid w-full max-w-xs grid-cols-5 gap-1 rounded-xl bg-border p-1">
        {item.grid.flatMap((row, r) =>
          row.map((cell, c) => {
            const isTarget = r === item.target[0] && c === item.target[1];
            return (
              <div
                key={`${r}-${c}`}
                className={`grid aspect-square place-items-center rounded-md font-mono text-xl font-semibold ${isTarget ? "bg-accent-soft text-accent" : "bg-surface"}`}
              >
                {isTarget ? (reveal ? item.answer : "?") : cell ?? ""}
              </div>
            );
          }),
        )}
      </div>
      <div className="mx-auto mt-4 grid max-w-xs grid-cols-5 gap-2">
        {SYMBOLS.map((s) => {
          const state = reveal ? (s === item.answer ? "right" : picked === s ? "wrong" : "idle") : picked === s ? "chosen" : "idle";
          return (
            <motion.button
              key={s}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (reveal) return;
                setPicked(s);
                onAnswer(s === item.answer ? 1 : 0, s);
              }}
              className={`rounded-xl border-2 py-3 font-mono text-xl font-semibold ${optionCls(state)}`}
            >
              {s}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Subject Module ──────────────────────────────────────────────────────────────────
/** One question of a subject passage (the passage text is rendered separately so it stays visible). */
export function SubjectQuestionView({
  question,
  index,
  reveal,
  picked,
  onPick,
}: {
  question: SubjectItem["questions"][number];
  index: number;
  reveal: boolean;
  picked: number | null;
  onPick: (i: number) => void;
}) {
  return (
    <div>
      <p className="font-medium">
        <span className="mr-2 font-mono text-xs text-muted">Q{index + 1}</span>
        {question.prompt}
      </p>
      <div className="mt-2 grid gap-2">
        {question.options.map((o, oi) => {
          const state = reveal ? (oi === question.answer ? "right" : picked === oi ? "wrong" : "idle") : picked === oi ? "chosen" : "idle";
          return (
            <motion.button
              key={oi}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => !reveal && onPick(oi)}
              className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-[15px] ${optionCls(state)}`}
            >
              <span className="font-mono text-xs text-muted">{String.fromCharCode(65 + oi)}</span>
              {o}
            </motion.button>
          );
        })}
      </div>
      {reveal && <p className="mt-2 rounded-lg bg-surface-2 p-2 text-sm text-muted">{question.explanation}</p>}
    </div>
  );
}

export function PassageText({ item }: { item: SubjectItem }) {
  return (
    <article className="card space-y-3 text-[15px] leading-relaxed">
      <div>
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{item.field}</p>
        <h3 className="font-display text-2xl">{item.title}</h3>
      </div>
      {item.text.map((b, i) =>
        b.type === "p" ? (
          <p key={i}>{b.text}</p>
        ) : b.type === "formula" ? (
          <p key={i} className="overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 text-center font-mono">
            {b.text}
          </p>
        ) : (
          <div key={i} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {b.head.map((h) => (
                    <th key={h} className="border-b border-border px-2 py-1 text-left font-medium text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, ci) => (
                      <td key={ci} className="border-b border-border/60 px-2 py-1 font-mono">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </article>
  );
}
