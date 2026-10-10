"use client";

import { useStoredState } from "./useStoredState";
import { savedProgrammes } from "./storedShapes";
import type { IntakeDeadline } from "./intake";

export type SavedProgramme = {
  id: number;
  name: string;
  university: string;
  city: string;
  intake: "winter" | "summer" | null;
  deadline: string | null; // "MM-DD" for the chosen intake, if machine-readable
  /** All listed windows (refreshed from the server whenever the tracker opens), for intake-specific updates. */
  deadlines?: IntakeDeadline[];
  status: "researching" | "preparing" | "applied" | "admitted" | "rejected";
  steps: Record<string, boolean>;
  note: string;
  savedAt: string;
};

export function useSaved() {
  return useStoredState<SavedProgramme[]>("saved-programmes", [], savedProgrammes);
}
