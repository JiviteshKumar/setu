import type { Fact } from "@/content/facts";
import { SourceNote } from "./SourceNote";
import { Reveal } from "./motion";
import { ReportButton } from "./ReportButton";
import { factStatus } from "@/lib/factStatus";
import { formatDate } from "@/lib/dates";

export function FactCard({ fact, compact = false }: { fact: Fact; compact?: boolean }) {
  const status = factStatus(fact.id, fact.sources);
  return (
    <Reveal>
      <article className="card h-full">
        <h3 className="font-semibold">{fact.title}</h3>
        {status.state === "changed" && (
          <p className="mt-2 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
            The official page changed (automatic check, {formatDate(status.checkedAt)}) and no longer contains the wording this fact is based on.
            It may be out of date — read the source below before you rely on it.
          </p>
        )}
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
