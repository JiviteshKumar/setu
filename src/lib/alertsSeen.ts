"use client";

import { useStoredState } from "./useStoredState";
import { stringList } from "./storedShapes";

/** IDs of alerts this student has already seen (stored on their device). */
export function useSeenAlerts() {
  return useStoredState<string[]>("alerts-seen", [], stringList);
}
