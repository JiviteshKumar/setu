"use client";

import { useStoredState } from "@/lib/useStoredState";
import { EMPTY_STATS, type PrepStats } from "@/lib/prep/engine";
import { conform } from "@/lib/useStoredState";

const TYPES = ["figures", "equations", "latin", "subject"];
/** Ratings must be numbers; history keeps only well-formed attempts (older or edited data never breaks the page). */
function prepStats(v: unknown): PrepStats {
  const s = conform(v, EMPTY_STATS);
  for (const t of TYPES) if (!Number.isFinite(s.ratings[t as keyof PrepStats["ratings"]])) s.ratings[t as keyof PrepStats["ratings"]] = EMPTY_STATS.ratings[t as keyof PrepStats["ratings"]];
  s.history = s.history.filter((a) => a && TYPES.includes(a.type) && Number.isFinite(a.score) && Number.isFinite(a.level) && typeof a.at === "string");
  return s;
}

/** Practice ratings and history, stored only on this device. */
export function usePrepStats() {
  return useStoredState<PrepStats>("prep-stats", EMPTY_STATS, prepStats);
}
