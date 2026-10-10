"use client";

import { useState } from "react";
import { officialSearchUrl, type Job } from "@/lib/jobs";
import { STATIC_SITE } from "@/lib/deploy";
import { useStoredState } from "@/lib/useStoredState";
import { Icon } from "@/components/Icon";

const TYPES = [
  { v: "werkstudent", l: "Working student (Werkstudent)", hint: "Part-time job in your field, alongside your studies" },
  { v: "minijob", l: "Minijob", hint: "Small job with low monthly earnings — cafés, shops, delivery" },
  { v: "internship", l: "Internship", hint: "Praktikum — check if it is mandatory for your course (affects the 140-day rule)" },
] as const;

// Search words in German work better on the German job board. Shown as quick picks.
const FIELDS = [
  { l: "Computer science / IT", v: "Informatik" },
  { l: "Software development", v: "Softwareentwicklung" },
  { l: "Data / analytics", v: "Data" },
  { l: "Mechanical engineering", v: "Maschinenbau" },
  { l: "Electrical engineering", v: "Elektrotechnik" },
  { l: "Business / economics", v: "Wirtschaft" },
  { l: "Marketing", v: "Marketing" },
  { l: "Finance / accounting", v: "Finanzen" },
];

export function JobSearch() {
  const [form, setForm] = useStoredState("job-search", { type: "werkstudent", field: "Informatik", city: "" });
  const [state, setState] = useState<{ loading: boolean; error?: string; total?: number; page: number; jobs: Job[] }>({ loading: false, page: 1, jobs: [] });

  async function search(page = 1) {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const params = new URLSearchParams({ ...form, page: String(page) });
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setState((s) => ({ loading: false, total: data.total, page, jobs: page === 1 ? data.jobs : [...s.jobs, ...data.jobs] }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }

  return (
    <div>
      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          // Static site: the job board allows no requests from other websites, so open the same search there.
          if (STATIC_SITE) window.open(officialSearchUrl(form), "_blank", "noopener,noreferrer");
          else search(1);
        }}
      >
        <fieldset>
          <legend className="label">Type of job</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <label key={t.v} className={`cursor-pointer rounded-xl border p-3 text-sm ${form.type === t.v ? "border-accent bg-accent-soft" : "border-border"}`}>
                <input type="radio" name="type" value={t.v} checked={form.type === t.v} onChange={() => setForm({ ...form, type: t.v })} className="sr-only" />
                <span className="font-medium">{t.l}</span>
                <span className="mt-0.5 block text-xs text-muted">{t.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Your field (search words)</span>
            <input className="input" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="e.g. Informatik, Python, Maschinenbau" />
          </label>
          <label className="block">
            <span className="label">City</span>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Berlin, München, Aachen" />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FIELDS.map((f) => (
            <button key={f.v} type="button" className={`chip ${form.field === f.v ? "border-accent text-accent" : ""}`} onClick={() => setForm({ ...form, field: f.v })}>
              {f.l}
            </button>
          ))}
        </div>
        <button className="btn-primary w-full sm:w-auto" disabled={state.loading}>
          {state.loading ? "Searching…" : STATIC_SITE ? "Search on the official job board" : "Search jobs"}
        </button>
        {STATIC_SITE && <p className="text-xs text-muted">Opens the Federal Employment Agency&apos;s job search (arbeitsagentur.de) with your words filled in.</p>}
      </form>

      {state.error && <p className="card mt-3 text-danger">Couldn&apos;t reach the job board right now ({state.error}). Please try again in a minute.</p>}
      {state.total != null && (
        <p className="mt-4 text-sm text-muted" aria-live="polite">
          {state.total.toLocaleString("en-IN")} jobs posted in the last 30 days · live from the Federal Employment Agency
        </p>
      )}
      <ul className="mt-3 space-y-3">
        {state.jobs.map((j) => (
          <li key={j.id} className="card">
            <a href={j.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-accent">
              {j.title} <Icon name="external" className="inline h-3.5 w-3.5" />
            </a>
            <p className="text-sm text-muted">
              {j.company}
              {j.city ? ` · ${j.city}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="chip">{j.kind}</span>
              {j.pay && <span className="chip">{j.pay}</span>}
              {j.published && <span className="chip">Posted {j.published}</span>}
            </div>
          </li>
        ))}
      </ul>
      {state.total != null && state.jobs.length < state.total && state.jobs.length > 0 && (
        <button type="button" className="btn-ghost mt-4 w-full" disabled={state.loading} onClick={() => search(state.page + 1)}>
          Load more
        </button>
      )}
    </div>
  );
}
