import { SOURCES, type SourceKey } from "@/content/sources";
import { formatDate } from "@/lib/dates";
import { Icon } from "./Icon";
import { StaleBadge } from "./StaleBadge";

/**
 * "Source: X · checked on DATE" line. Every fact in the app should render one. `autoCheckedOn`: the last daily automatic
 * check found the fact's wording still on the official page; while that check is recent, the "may be outdated" warning
 * (based on the last check by a person) is not needed.
 */
export function SourceNote({
  sources,
  links,
  checkedOn,
  reviewDays,
  autoCheckedOn,
}: {
  sources?: SourceKey[];
  links?: { name: string; url: string }[];
  checkedOn?: string;
  reviewDays?: number;
  autoCheckedOn?: string;
}) {
  const all = [...(sources ?? []).map((k) => SOURCES[k]), ...(links ?? [])];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <Icon name="shield" className="h-3.5 w-3.5 text-ok" />
      <span>Source:</span>
      {all.map((s, i) => (
        <a key={s.url + i} href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-text">
          {s.name}
        </a>
      ))}
      {checkedOn && <span>· checked {formatDate(checkedOn)}</span>}
      {autoCheckedOn && <span>· re-checked automatically {formatDate(autoCheckedOn)}</span>}
      {checkedOn && reviewDays != null && (
        <StaleBadge verifiedOn={(autoCheckedOn && autoCheckedOn > checkedOn ? autoCheckedOn : checkedOn).slice(0, 10)} reviewDays={autoCheckedOn ? Math.min(reviewDays, 7) : reviewDays} />
      )}
    </div>
  );
}
