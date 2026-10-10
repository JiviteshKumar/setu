"use client";

import { useMemo } from "react";
import { planUpdates, type Intake, type PlanUpdate } from "./intake";
import { useSaved } from "./saved";
import { useStoredState } from "./useStoredState";
import { intakeOrNull, stringList } from "./storedShapes";
import { useToday } from "./useToday";

/** The intake this student is aiming for, e.g. { season: "winter", year: 2027 } — stored on their device only. */
export function useMyIntake() {
  return useStoredState<Intake | null>("my-intake", null, intakeOrNull);
}

/** Keys of plan updates the student has already seen (so the bell only counts new ones). */
export function useSeenPlanUpdates() {
  return useStoredState<string[]>("plan-updates-seen", [], stringList);
}

/** Updates about the saved courses for the chosen intake. null while loading or when no intake is chosen. */
export function usePlanUpdates(): { intake: Intake; updates: PlanUpdate[] } | null {
  const [saved, , savedLoaded] = useSaved();
  const [intake, , intakeLoaded] = useMyIntake();
  const today = useToday();
  return useMemo(
    () => (savedLoaded && intakeLoaded && intake && today ? { intake, updates: planUpdates(saved, intake, today) } : null),
    [saved, savedLoaded, intake, intakeLoaded, today],
  );
}

/** Updates that are news (not the static "no deadline listed" notes). */
export const isNews = (u: PlanUpdate) => u.kind !== "no-window";
