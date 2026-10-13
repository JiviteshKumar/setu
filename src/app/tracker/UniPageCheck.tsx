"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { SavedProgramme } from "@/lib/saved";
import type { IntakeDeadline } from "@/lib/intake";
import { compareDeadlines, type UniPage, type Verdict } from "@/lib/uniDeadlines";
import { formatDate, formatMonthDay } from "@/lib/dates";
import { withBase } from "@/lib/deploy";
import { Icon } from "@/components/Icon";
import { EASE_OUT } from "@/components/motion";

// "Check university pages": compares the deadlines DAAD lists for the saved courses with what each university's own
// course page says. The pages are read once a week in the cloud for every course (a browser isn't allowed to read
// other websites itself); this button runs the comparison for the student's own courses only.

type Result = { s: SavedProgramme; page?: UniPage; verdict: Verdict; daad: string[] };
const RECENT_CHANGE_DAYS = 60;

const md = (list: string[]) => list.map(formatMonthDay).join(", ");

export function UniPageCheck({ saved, deadlinesOf }: { saved: SavedProgramme[]; deadlinesOf: (s: SavedProgramme) => IntakeDeadline[] }) {
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [results, setResults] = useState<Result[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const run = async () => {
    setState("loading");
    try {
      const res = await fetch(withBase("/uni-pages.json"), { cache: "no-cache" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { checkedAt: string | null; pages: Record<string, UniPage> };
      setCheckedAt(data.checkedAt);
      setResults(
        saved.map((s) => {
          const daad = [...new Set(deadlinesOf(s).map((d) => d.until).filter((u): u is string => !!u))].sort();
          const page = data.pages[s.id];
          return { s, page, daad, verdict: compareDeadlines(daad, page) };
        }),
      );
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (!saved.length) return null;
  const attention = results.filter((r) => r.verdict.kind === "differs" || recentlyChanged(r.page)).length;

  return (
    <div className="card mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h3 className="font-semibold">Check the universities&apos; own pages</h3>
          <p className="mt-1 text-sm text-muted">
            Universities sometimes change a deadline on their website before DAAD does. This compares DAAD&apos;s dates for your {saved.length} saved course
            {saved.length === 1 ? "" : "s"} with each university&apos;s course page.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={run} disabled={state === "loading"}>
          <Icon name="search" className="h-4 w-4" />
          {state === "loading" ? "Checking…" : state === "done" ? "Check again" : "Check university pages"}
        </button>
      </div>

      {state === "error" && <p className="mt-3 text-sm text-danger">Couldn&apos;t load the university page check. Try again when you&apos;re online.</p>}

      <AnimatePresence>
        {state === "done" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { ease: EASE_OUT } }} className="mt-4">
            <p className="text-sm font-medium">
              {attention ? `${attention} course${attention === 1 ? " needs" : "s need"} a look` : "Nothing that contradicts DAAD was found."}
            </p>
            <ul className="mt-3 space-y-3">
              {results.map((r) => (
                <ResultRow key={r.s.id} r={r} />
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              {checkedAt ? `University pages were last read on ${formatDate(checkedAt)} (they are re-read every week). ` : ""}
              Sentences are copied word for word from the university&apos;s page; Setu only compares the dates in them. Sentences that apply only to German or EU
              applicants are left out. The university&apos;s own page always decides — open it before you apply.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function recentlyChanged(page?: UniPage) {
  return !!page?.changedAt && Date.now() - Date.parse(page.changedAt) < RECENT_CHANGE_DAYS * 86_400_000;
}

function ResultRow({ r }: { r: Result }) {
  const { verdict: v, page } = r;
  const tone =
    v.kind === "match" ? { icon: "check" as const, cls: "text-ok", title: `Same deadline on the university page (${md(v.dates)})` }
    : v.kind === "differs"
      ? {
          icon: "alert" as const,
          cls: "text-warn",
          title: `The university page doesn't show DAAD's date${v.daadOnly.length === 1 ? "" : "s"} (${md(v.daadOnly)})${v.uniOnly.length ? ` — it mentions ${md(v.uniOnly)}` : ""}`,
        }
      : v.kind === "extra"
        ? { icon: "calendar" as const, cls: "text-accent", title: `DAAD gives no fixed date; the university page mentions ${md(v.uniOnly)}` }
        : v.kind === "none"
          ? { icon: "search" as const, cls: "text-muted", title: "The course page doesn't state a deadline in its text — it may be on a separate application page" }
          : { icon: "alert" as const, cls: "text-muted", title: v.reason };
  return (
    <li className="rounded-xl border border-border p-3">
      <p className="text-sm font-medium">{r.s.name}</p>
      <p className="text-xs text-muted">{r.s.university}</p>
      <p className={`mt-2 flex items-start gap-2 text-sm ${tone.cls}`}>
        <Icon name={tone.icon} className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{tone.title}</span>
      </p>
      {(v.kind === "differs" || v.kind === "extra") && (
        <p className="mt-1 text-xs text-muted">
          A different date can be for another intake, an early round or a different group of applicants. Read the sentence below and confirm on the page.
        </p>
      )}
      {page && page.snippets.length > 0 && v.kind !== "match" && (
        <ul className="mt-2 space-y-1 text-sm">
          {page.snippets.map((q) => (
            <li key={q}>
              <blockquote className="border-l-2 border-border pl-3 leading-relaxed">“{q}”</blockquote>
            </li>
          ))}
        </ul>
      )}
      {recentlyChanged(page) && page!.before && (
        <div className="mt-2 rounded-lg bg-warn-soft p-2 text-sm text-warn">
          The deadline wording on this page changed on {formatDate(page!.changedAt!)}. Before, it said:
          {page!.before.length ? (
            page!.before.map((q) => (
              <blockquote key={q} className="mt-1 border-l-2 border-warn/40 pl-3 text-text/80 line-through decoration-warn/50">
                “{q}”
              </blockquote>
            ))
          ) : (
            <span> nothing about a deadline.</span>
          )}
        </div>
      )}
      {page && (
        <a href={page.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-accent underline">
          Open the university&apos;s course page <Icon name="external" className="h-3 w-3" />
        </a>
      )}
    </li>
  );
}
