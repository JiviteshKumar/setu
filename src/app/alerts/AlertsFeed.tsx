"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Alert } from "@/lib/alerts";
import { useSeenAlerts } from "@/lib/alertsSeen";
import { formatDate } from "@/lib/dates";
import { EASE_OUT } from "@/components/motion";
import { Icon } from "@/components/Icon";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "planning", label: "Planning from India" },
  { id: "in-germany", label: "In Germany" },
] as const;

const SEVERITY = {
  urgent: { label: "Urgent", cls: "bg-danger-soft text-danger border-danger/30" },
  important: { label: "Important", cls: "bg-gold-soft text-warn border-warn/30" },
  info: { label: "Update", cls: "bg-surface-2 text-muted border-border" },
};

export function AlertsFeed({ alerts }: { alerts: Alert[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [seen, setSeen, loaded] = useSeenAlerts();
  // Remember which alerts were new when the page opened, then mark everything as seen.
  const [newIds] = useState(() => new Set<string>());
  useEffect(() => {
    if (!loaded) return;
    const unseen = alerts.filter((a) => !seen.includes(a.id)).map((a) => a.id);
    if (unseen.length) {
      unseen.forEach((id) => newIds.add(id));
      setSeen((prev) => [...new Set([...prev, ...unseen])]);
    }
  }, [loaded, alerts, seen, setSeen, newIds]);

  const shown = alerts.filter((a) => filter === "all" || a.audience.includes(filter));

  return (
    <div>
      <div role="tablist" className="relative inline-flex rounded-xl border border-border bg-surface-2 p-1 text-sm">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`relative rounded-lg px-3 py-1.5 ${filter === f.id ? "text-text" : "text-muted"}`}>
            {filter === f.id && <motion.span layoutId="alert-filter" className="absolute inset-0 rounded-lg bg-surface shadow-card" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative">{f.label}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="card mt-4 text-center text-muted">
          <p className="font-medium text-text">No alerts right now.</p>
          <p className="mt-1 text-sm">The official sources are checked every morning. When something changes that affects you, it appears here.</p>
        </div>
      )}

      <ol className="relative mt-5 space-y-4 border-l-2 border-border pl-5">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((a, i) => (
            <motion.li
              layout
              key={a.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="relative"
            >
              <span className={`absolute top-5 -left-[29px] h-3.5 w-3.5 rounded-full border-[3px] border-bg ${a.severity === "urgent" ? "bg-danger" : a.severity === "important" ? "bg-gold" : "bg-accent-bright"}`} />
              <article className="card">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`chip ${SEVERITY[a.severity].cls}`}>{SEVERITY[a.severity].label}</span>
                  {a.kind === "correction" && <span className="chip">Correction</span>}
                  {a.kind === "detected" && <span className="chip">Found automatically</span>}
                  <span className="text-muted">{formatDate(a.publishedAt)}</span>
                  {newIds.has(a.id) && (
                    <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="chip border-accent-bright/40 bg-accent-soft text-accent">
                      New
                    </motion.span>
                  )}
                </div>
                <h2 className="mt-2 text-lg font-semibold">{a.title}</h2>
                <p className="mt-1 text-[15px] leading-relaxed">{a.summary}</p>
                {a.quotes && (a.quotes.added.length > 0 || a.quotes.removed.length > 0) && (
                  <div className="mt-3 space-y-2 text-sm">
                    {a.quotes.added.length > 0 && <Quotes label="Now on the page" lines={a.quotes.added} />}
                    {a.quotes.removed.length > 0 && <Quotes label="No longer on the page" lines={a.quotes.removed} removed />}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <Icon name="shield" className="h-3.5 w-3.5 text-ok" />
                  {a.kind === "detected" ? "Quoted word for word from the official page (not checked by a person):" : "Verified by a person against:"}
                  {a.sources.map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">
                      {s.name}
                    </a>
                  ))}
                </div>
              </article>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}

function Quotes({ label, lines, removed = false }: { label: string; lines: string[]; removed?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <ul className="mt-1 space-y-1">
        {lines.map((l) => (
          <li key={l}>
            <blockquote className={`border-l-2 pl-3 leading-relaxed ${removed ? "border-danger/40 text-muted line-through decoration-danger/40" : "border-ok/50"}`}>“{l}”</blockquote>
          </li>
        ))}
      </ul>
    </div>
  );
}
