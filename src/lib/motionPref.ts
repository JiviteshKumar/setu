"use client";

import { useSyncExternalStore } from "react";
import { useStoredState } from "./useStoredState";
import { oneOf } from "./storedShapes";

export type MotionPref = "auto" | "on" | "off";

export function useMotionPref() {
  return useStoredState<MotionPref>("motion", "auto", oneOf(["auto", "on", "off"] as const, "auto"));
}

const query = "(prefers-reduced-motion: reduce)";

function subscribeOS(cb: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Whether decorative, looping animations should run. False during server rendering and hydration
 * (so markup always matches), then reflects the user's in-app choice or, on "auto", the OS setting.
 */
export function useMotionAllowed(): boolean {
  const [pref] = useMotionPref();
  const osReduce = useSyncExternalStore(subscribeOS, () => window.matchMedia(query).matches, () => null);
  if (osReduce === null) return false;
  if (pref === "on") return true;
  if (pref === "off") return false;
  return !osReduce;
}
