import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { approveAlert, dismiss } from "./actions";
import { getAlerts } from "@/lib/alerts";

export const metadata: Metadata = { title: "Review queue", robots: { index: false } };

type Candidate = {
  id: string;
  sourceName: string;
  url: string;
  detectedAt: string;
  added: string[];
  removed: string[];
  relevance: number;
  keywords: string[];
  affectedFacts: { id: string; title: string; brokenAnchors: string[] }[];
  ai: { model: string; draft: { relevant: boolean; title: string; summary: string; severity: string; audience: string[] }; guard: { ok: boolean; unsupported: string[] } } | { error: string } | null;
};

type Report = { id: string; createdAt: string; page: string; context?: string; message: string; correction?: string; sourceUrl?: string };

function readDir<T>(dir: string): T[] {
  const p = join(process.cwd(), "data", "watch", dir);
  if (!existsSync(p)) return [];
  return readdirSync(p)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(p, f), "utf-8")) as T);
}

export default function AdminPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={<p className="text-muted">Loading review queue…</p>}>
      <Queue />
    </Suspense>
  );
}

async function Queue() {
  await connection(); // always read the queue fresh from disk
  const candidates = readDir<Candidate>("pending").sort((a, b) => b.relevance - a.relevance);
  const reports = readDir<Report>("reports").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const published = getAlerts();

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Local only · never deployed</p>
        <h1 className="h1">Review queue</h1>
        <p className="mt-2 text-muted">
          Nothing reaches students until you approve it. Read the official text, not just the AI draft. Run <code>npm run alerts:watch</code> to check sources
          again; after approving, rebuild and deploy to publish.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="h2">Changes on official pages ({candidates.length})</h2>
        {candidates.length === 0 && <p className="card text-muted">No changes waiting.</p>}
        {candidates.map((c) => {
          const ai = c.ai && "draft" in c.ai ? c.ai : null;
          const broken = c.affectedFacts.filter((f) => f.brokenAnchors.length);
          return (
            <article key={c.id} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                  {c.sourceName}
                </a>
                <span className="chip">
                  relevance {c.relevance} · {new Date(c.detectedAt).toLocaleString("en-IN")}
                </span>
              </div>
              {broken.length > 0 && (
                <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
                  Fact check broken: {broken.map((f) => `${f.title} (missing “${f.brokenAnchors.join("”, “")}”)`).join("; ")}. Update src/content/facts.ts after you
                  verify the new wording.
                </p>
              )}
              {c.affectedFacts.length > 0 && !broken.length && <p className="text-xs text-muted">Facts citing this page: {c.affectedFacts.map((f) => f.title).join(", ")}</p>}
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className="rounded-xl bg-danger-soft p-3">
                  <p className="mb-1 font-mono text-[10px] tracking-widest text-danger uppercase">Removed</p>
                  {c.removed.length ? c.removed.map((l, i) => <p key={i}>− {l}</p>) : <p className="text-muted">—</p>}
                </div>
                <div className="rounded-xl bg-ok-soft p-3">
                  <p className="mb-1 font-mono text-[10px] tracking-widest text-ok uppercase">Added</p>
                  {c.added.length ? c.added.map((l, i) => <p key={i}>+ {l}</p>) : <p className="text-muted">—</p>}
                </div>
              </div>
              {c.ai && "error" in c.ai && <p className="text-sm text-warn">AI draft failed: {c.ai.error}</p>}
              {ai && (
                <p className={`rounded-xl p-3 text-sm ${ai.guard.ok ? "bg-surface-2" : "bg-danger-soft text-danger"}`}>
                  {ai.guard.ok
                    ? `AI draft by ${ai.model}: every number and date in it appears in the official text.${ai.draft.relevant ? "" : " The model thinks this change is NOT relevant."}`
                    : `AI draft REJECTED — it mentions ${ai.guard.unsupported.join(", ")}, which the official text does not contain. Write the alert yourself.`}
                </p>
              )}
              <ReviewForm
                dir="pending"
                id={c.id}
                sourceName={c.sourceName}
                sourceUrl={c.url}
                title={ai?.guard.ok ? ai.draft.title : ""}
                summary={ai?.guard.ok ? ai.draft.summary : ""}
                severity={ai?.draft.severity ?? "info"}
                audience={ai?.draft.audience ?? ["planning"]}
              />
            </article>
          );
        })}
      </section>

      <section className="space-y-4">
        <h2 className="h2">Mistake reports from students ({reports.length})</h2>
        {reports.length === 0 && <p className="card text-muted">No reports.</p>}
        {reports.map((r) => (
          <article key={r.id} className="card space-y-2 text-sm">
            <p className="text-muted">
              {new Date(r.createdAt).toLocaleString("en-IN")} · <a className="underline" href={r.page}>{r.page}</a>
              {r.context ? ` · ${r.context}` : ""}
            </p>
            <p>
              <strong>What&apos;s wrong:</strong> {r.message}
            </p>
            {r.correction && (
              <p>
                <strong>Suggested correction:</strong> {r.correction}
              </p>
            )}
            {r.sourceUrl && (
              <p>
                <strong>Their source:</strong>{" "}
                <a className="underline" href={r.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                  {r.sourceUrl}
                </a>{" "}
                <span className="text-muted">(verify it is official before using it)</span>
              </p>
            )}
            <p className="text-xs text-muted">Fix the data or fact first. Publish a correction notice only if students may have acted on the wrong information.</p>
            <ReviewForm dir="reports" id={r.id} sourceName="" sourceUrl="" title="" summary="" severity="info" audience={["planning", "in-germany"]} />
          </article>
        ))}
      </section>

      <section>
        <h2 className="h2">Published alerts ({published.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {published.map((a) => (
            <li key={a.id}>
              {a.publishedAt.slice(0, 10)} · {a.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ReviewForm(p: { dir: string; id: string; sourceName: string; sourceUrl: string; title: string; summary: string; severity: string; audience: string[] }) {
  return (
    <details className="rounded-xl border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">Write / approve alert</summary>
      <form action={approveAlert} className="mt-3 grid gap-2 text-sm">
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="dir" value={p.dir} />
        <label>
          <span className="label">Title</span>
          <input className="input" name="title" defaultValue={p.title} required maxLength={120} />
        </label>
        <label>
          <span className="label">Summary (plain English, only what the official text says)</span>
          <textarea className="input min-h-24" name="summary" defaultValue={p.summary} required maxLength={600} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label>
            <span className="label">Official source name</span>
            <input className="input" name="sourceName" defaultValue={p.sourceName} required />
          </label>
          <label>
            <span className="label">Official source URL (https)</span>
            <input className="input" name="sourceUrl" defaultValue={p.sourceUrl} required pattern="https://.*" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select name="severity" defaultValue={p.severity} className="rounded-lg border border-border bg-surface px-2 py-1">
            <option value="info">Info</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
          {(["planning", "in-germany"] as const).map((a) => (
            <label key={a} className="flex items-center gap-1.5">
              <input type="checkbox" name="audience" value={a} defaultChecked={p.audience.includes(a)} />
              {a === "planning" ? "Planning from India" : "In Germany"}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-primary">Approve &amp; publish</button>
          <button className="btn-ghost" formAction={dismiss} formNoValidate>
            Dismiss
          </button>
        </div>
      </form>
    </details>
  );
}
