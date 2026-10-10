"use client";

import { useMemo, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Today's date in the browser; null during server rendering (avoids prerender timestamps and hydration mismatches). */
export function useToday(): Date | null {
  const day = useSyncExternalStore(
    noopSubscribe,
    () => new Date().toDateString(),
    () => null,
  );
  return useMemo(() => (day ? new Date(day) : null), [day]);
}
