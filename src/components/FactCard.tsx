import type { Fact } from "@/content/facts";
import { SourceNote } from "./SourceNote";
import { Reveal } from "./motion";
import { ReportButton } from "./ReportButton";

export function FactCard({ fact, compact = false }: { fact: Fact; compact?: boolean }) {
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
        <SourceNote sources={fact.sources} checkedOn={fact.verifiedOn} reviewDays={fact.reviewDays} />
        {!compact && <ReportButton context={`fact:${fact.id}`} />}
      </article>
    </Reveal>
  );
}
