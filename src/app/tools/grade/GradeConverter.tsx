"use client";

import { motion } from "motion/react";
import { useStoredState } from "@/lib/useStoredState";

type State = { max: string; min: string; grade: string };

/** Modified Bavarian formula (KMK): x = 1 + 3 × (Nmax − Nd) / (Nmax − Nmin), cut (not rounded) to one decimal. */
export function bavarian(max: number, min: number, grade: number): number | null {
  if (![max, min, grade].every(Number.isFinite) || max <= min || grade < min || grade > max) return null;
  const x = 1 + (3 * (max - grade)) / (max - min);
  return Math.floor(x * 10 + 1e-9) / 10;
}

const PRESETS = [
  { label: "10-point CGPA", max: "10", min: "" },
  { label: "Percentage", max: "100", min: "" },
  { label: "4-point GPA", max: "4", min: "" },
];

export function GradeConverter() {
  const [s, set] = useStoredState<State>("grade-converter", { max: "10", min: "", grade: "" });
  // An empty field must not count as 0 (that would silently assume a minimum pass of 0); "8,5" is accepted too.
  const num = (v: string) => Number(v.trim().replace(",", "."));
  const ready = s.max.trim() !== "" && s.min.trim() !== "" && s.grade.trim() !== "";
  const result = ready ? bavarian(num(s.max), num(s.min), num(s.grade)) : null;

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip hover:text-text" onClick={() => set({ ...s, max: p.max, min: p.min })}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Best possible grade (Nmax)" hint="e.g. 10 for CGPA, 100 for %" value={s.max} onChange={(v) => set({ ...s, max: v })} />
        <Field
          label="Minimum passing grade (Nmin)"
          hint="Find it on your transcript or university rules"
          value={s.min}
          onChange={(v) => set({ ...s, min: v })}
        />
        <Field label="Your overall grade (Nd)" hint="Your final CGPA or %" value={s.grade} onChange={(v) => set({ ...s, grade: v })} />
      </div>

      <div className="mt-5 rounded-xl bg-surface-2 p-4 text-center" aria-live="polite">
        {result != null ? (
          <>
            <p className="text-sm text-muted">Approximate German grade</p>
            <motion.p
              key={result}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="font-display text-6xl tracking-tight"
            >
              {result.toFixed(1)}
            </motion.p>
            <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-surface" aria-hidden>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, var(--danger), var(--gold), var(--ok))", backgroundSize: "300px 100%" }}
                initial={false}
                animate={{ width: `${((4 - Math.min(4, result)) / 3) * 100}%` }}
                transition={{ type: "spring", stiffness: 140, damping: 20 }}
              />
            </div>
            <p className="mt-1 text-sm text-muted">1.0 is the best grade in Germany, 4.0 is the minimum pass.</p>
          </>
        ) : (
          <p className="text-sm text-muted">
            {ready ? "Check the numbers: Nmax must be greater than Nmin, and your grade must lie between them." : "Enter all three values."}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(",", "."))} />
      <span className="mt-1 block text-xs text-muted">{hint}</span>
    </label>
  );
}
