import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceKey } from "@/content/sources";

// Result of the daily automatic re-check of every fact (scripts/check-facts.ts, run in the cloud by pages.yml). The
// report remembers each fact's state between runs, so a day on which a source can't be reached changes nothing.
type Report = {
  checkedAt: string;
  status?: Record<string, { lastOk?: string; brokenSince?: string }>;
  live?: Record<string, { at: string; sections: { source: SourceKey; lines: string[] }[] }>;
};

export type LiveWording = { at: string; sections: { source: SourceKey; lines: string[] }[] };

export type FactStatus =
  | { state: "ok"; checkedAt: string } // every anchor phrase was on the official page at the last successful check
  | { state: "changed"; since: string; live?: LiveWording } // the official page no longer contains the fact's wording
  | { state: "unknown" }; // never checked successfully

let cache: Report | null | undefined;
function report(): Report | null {
  if (cache === undefined || process.env.NODE_ENV === "development") {
    const file = join(process.cwd(), "data", "fact-check-report.json");
    cache = existsSync(file) ? (JSON.parse(readFileSync(file, "utf-8")) as Report) : null;
  }
  return cache;
}

export function factStatus(factId: string): FactStatus {
  const s = report()?.status?.[factId];
  if (s?.brokenSince) return { state: "changed", since: s.brokenSince, live: report()?.live?.[factId] };
  if (s?.lastOk) return { state: "ok", checkedAt: s.lastOk };
  return { state: "unknown" };
}
