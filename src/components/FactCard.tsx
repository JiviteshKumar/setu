import type { Fact } from "@/content/facts";
import { SOURCES } from "@/content/sources";
import { SourceNote } from "./SourceNote";
import { Reveal } from "./motion";
import { ReportButton } from "./ReportButton";
import { factStatus, type LiveWording } from "@/lib/factStatus";
import { formatDate } from "@/lib/dates";

export function FactCard({ fact, compact = false }: { fact: Fact; compact?: boolean }) {
  const status = factStatus(fact.id);
  // When the official page no longer says what this fact says, the outdated summary is not shown as a fact any more:
  // the page's current wording (quoted) takes its place, and the old text is kept only behind "What Setu said before".
  if (status.state === "changed") {
    return (
      <Reveal>
        <article className="card h-full">
          <h3 className="font-semibold">{fact.title}</h3>
          <p className="mt-2 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
            The official page changed on {formatDate(status.since)} and no longer says what Setu&apos;s summary said, so the summary is hidden.
            {status.live ? " Here is what the official page says now, word for word:" : " Read the official page below."}
          </p>
          {status.live && <OfficialWording live={status.live} compact={compact} />}
          {!compact && (
            <details className="mt-3 text-sm text-muted">
              <summary className="cursor-pointer">What Setu said before (outdated)</summary>
              <p className="mt-1 line-through decoration-muted/40">{fact.summary}</p>
            </details>
          )}
          <SourceNote sources={fact.sources} />
          {!compact && <ReportButton context={`fact:${fact.id}`} />}
        </article>
      </Reveal>
    );
  }
  return (
    <Reveal>
      <article className="card h-full">
        <h3 className="font-semibold">{fact.title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed">{fact.summary}</p>
        {!compact && fact.details && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {fact.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        <SourceNote sources={fact.sources} checkedOn={fact.verifiedOn} reviewDays={fact.reviewDays} autoCheckedOn={status.state === "ok" ? status.checkedAt : undefined} />
        {!compact && <ReportButton context={`fact:${fact.id}`} />}
      </article>
    </Reveal>
  );
}

function OfficialWording({ live, compact }: { live: LiveWording; compact: boolean }) {
  return (
    <div className="mt-3 space-y-3">
      {live.sections.map((s) => (
        <figure key={s.source}>
          <blockquote className="space-y-1 border-l-2 border-ok/50 pl-3 text-[15px] leading-relaxed">
            {(compact ? s.lines.slice(0, 4) : s.lines).map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </blockquote>
          <figcaption className="mt-1 text-xs text-muted">
            — {SOURCES[s.source].name}, as of {formatDate(live.at)}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
