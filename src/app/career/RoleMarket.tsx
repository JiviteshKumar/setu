"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/motion";
import { useStoredState } from "@/lib/useStoredState";
import { officialSearchUrl } from "@/lib/jobs";
import { STATIC_SITE } from "@/lib/deploy";

type Result = { role: string; city: string; total: number };

/** Live count of full-time job ads from the Federal Employment Agency — an honest market signal for a target role. */
export function RoleMarket() {
  const [form, setForm] = useStoredState("career-role", { role: "Data Scientist", city: "" });
  const [result, setResult] = useState<Result | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (STATIC_SITE) {
      // Static site: no live count (the job board allows no requests from other websites) — open the search there.
      window.open(officialSearchUrl({ type: "fulltime", field: form.role, city: form.city }), "_blank", "noopener,noreferrer");
      return;
    }
    setState("loading");
    try {
      const params = new URLSearchParams({ type: "fulltime", field: form.role, city: form.city });
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ role: form.role, city: form.city, total: data.total });
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="card">
      <form onSubmit={check} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="label">Target job title</span>
          <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Data Scientist, Maschinenbauingenieur" />
        </label>
        <label className="block">
          <span className="label">City (optional)</span>
          <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="All of Germany" />
        </label>
        <button className="btn-primary" disabled={state === "loading" || !form.role.trim()}>
          {state === "loading" ? "Checking…" : STATIC_SITE ? "See jobs on the official board" : "Check the market"}
        </button>
      </form>
      <AnimatePresence mode="wait">
        {result && (
          <motion.div key={`${result.role}-${result.city}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl bg-surface-2 p-4">
            <p className="font-display text-5xl tabular-nums">
              <AnimatedNumber value={result.total} />
            </p>
            <p className="text-sm text-muted">
              full-time job ads for &quot;{result.role}&quot;{result.city ? ` around ${result.city}` : " in Germany"} posted in the last 30 days on the official job board.
            </p>
            <p className="mt-2 text-xs text-muted">
              A count of ads, not of jobs you can get: many ads ask for German and work experience. Try the German job title too (e.g.
              &quot;Softwareentwickler&quot;) — German employers often use it.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {state === "error" && <p className="mt-3 text-sm text-danger">Couldn&apos;t reach the job board. Please try again in a minute.</p>}
    </div>
  );
}
