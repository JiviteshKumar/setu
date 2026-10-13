import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SOURCES, type SourceKey } from "@/content/sources";

// Result of the daily automatic re-check of every fact (scripts/check-facts.ts, run in the cloud by pages.yml).
type Report = { checkedAt: string; problems: { fact?: string; source: string; problem: string }[] };

export type FactStatus =
  | { state: "ok"; checkedAt: string } // every anchor phrase was still on the official page
  | { state: "changed"; checkedAt: string } // the official page no longer contains the fact's wording
  | { state: "unknown" }; // no report, or a source couldn't be reached on the last check

let cache: Report | null | undefined;
function report(): Report | null {
  if (cache === undefined || process.env.NODE_ENV === "development") {
    const file = join(process.cwd(), "data", "fact-check-report.json");
    cache = existsSync(file) ? (JSON.parse(readFileSync(file, "utf-8")) as Report) : null;
  }
  return cache;
}

export function factStatus(factId: string, sources: SourceKey[]): FactStatus {
  const r = report();
  if (!r) return { state: "unknown" };
  if (r.problems.some((p) => p.fact === factId)) return { state: "changed", checkedAt: r.checkedAt };
  // An unreachable source means this fact wasn't re-checked last time.
  if (r.problems.some((p) => !p.fact && sources.some((s) => p.source === SOURCES[s].url))) return { state: "unknown" };
  return { state: "ok", checkedAt: r.checkedAt };
}
