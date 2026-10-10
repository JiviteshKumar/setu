"use client";

import { useEffect, useSyncExternalStore } from "react";
import { playIntroSound, stopIntroSound } from "@/lib/introSound";

// The sound button on the opening animation. Browsers only allow sound after a tap, so tapping it replays the intro
// from the start with sound; the choice is remembered ("setu:sound") and later intros try to start with sound by
// themselves — where the browser refuses, the button asks for a tap instead.

const KEY = "setu:sound";
type State = "off" | "on" | "blocked";

let state: State = "off";
const listeners = new Set<() => void>();
const setState = (s: State) => {
  state = s;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function savedPref(): boolean {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}
function savePref(on: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify(on));
  } catch {}
}

const playing = () => document.documentElement.dataset.splash === "play";

/** Seconds since the intro started (its root carries one CSS animation that runs for the whole intro). */
function elapsed(root: HTMLElement): number {
  const t = root.getAnimations()[0]?.currentTime;
  return typeof t === "number" ? t / 1000 : 0;
}

/** Rewinds every CSS and SVG animation of the intro (except the buttons) and resets its end timer. */
function restart(root: HTMLElement): boolean {
  const reset = (window as { __setuSplashRestart?: () => boolean }).__setuSplashRestart;
  if (!reset?.()) return false;
  for (const a of root.getAnimations({ subtree: true })) {
    const target = (a.effect as KeyframeEffect | null)?.target;
    if (target instanceof Element && target.closest("button")) continue;
    a.currentTime = 0;
    a.play();
  }
  root.querySelectorAll("svg").forEach((svg) => svg.setCurrentTime(0));
  return true;
}

export function SplashSound() {
  const current = useSyncExternalStore(subscribe, () => state, () => "off" as State);

  useEffect(() => {
    const root = document.getElementById("splash");
    if (!root || !playing()) return;
    if (savedPref()) {
      playIntroSound(elapsed(root)).then((ok) => {
        if (playing()) setState(ok ? "on" : "blocked");
      });
    }
    // Stop the sound as soon as the intro ends or is skipped.
    const obs = new MutationObserver(() => {
      if (!playing()) {
        stopIntroSound();
        obs.disconnect();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-splash"] });
    return () => {
      obs.disconnect();
      stopIntroSound();
    };
  }, []);

  const toggle = async () => {
    const root = document.getElementById("splash");
    if (!root) return;
    if (current === "on") {
      savePref(false);
      stopIntroSound();
      setState("off");
      return;
    }
    savePref(true);
    if (!restart(root)) return;
    setState((await playIntroSound(0)) ? "on" : "blocked");
  };

  const on = current === "on";
  return (
    <button type="button" className="sp-sound" data-splash-sound tabIndex={-1} onClick={toggle} aria-pressed={on}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" />
        {on ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 5a10 10 0 0 1 0 14" />
          </>
        ) : (
          <path d="m16 9 6 6m0-6-6 6" />
        )}
      </svg>
      {current === "blocked" ? "Tap for sound" : on ? "Sound on" : "Sound"}
    </button>
  );
}
