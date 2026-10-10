"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

// Personal data (saved courses, checklists, work days) stays in the student's own browser.
// We never send it to a server — that keeps the app simple and privacy-friendly (DPDP Act / GDPR).
const PREFIX = "setu:";
const listeners = new Map<string, Set<() => void>>();
const memoryFallback = new Map<string, string>(); // used when localStorage is blocked (private mode etc.)

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    memoryFallback.set(key, value);
  }
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, listener: () => void) {
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  const onStorage = (e: StorageEvent) => e.key === PREFIX + key && listener(); // other tabs
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Makes a stored value match the shape of the default value, so data saved by an older version of the app (or edited
 * by hand) can never crash a page: wrong types fall back to the default, objects keep only fields of the right type.
 */
export function conform<T>(value: unknown, fallback: T): T {
  if (Array.isArray(fallback)) return (Array.isArray(value) ? value : fallback) as T;
  if (isPlainObject(fallback)) {
    if (!isPlainObject(value)) return fallback;
    const out: Record<string, unknown> = { ...value };
    for (const [k, def] of Object.entries(fallback)) out[k] = k in value ? conform(value[k], def) : def;
    return out as T;
  }
  if (fallback === null) return value as T; // no shape to compare with — callers pass a sanitizer
  return (typeof value === typeof fallback ? value : fallback) as T;
}

function parse<T>(raw: string | null | undefined, fallback: T, sanitize: (v: unknown) => T): T {
  if (raw == null) return fallback;
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

/**
 * Like useState, but persisted in localStorage. `loaded` is false during server rendering and hydration.
 * `sanitize` checks what was stored (default: same shape as `initial`); it may throw to fall back to `initial`.
 */
export function useStoredState<T>(key: string, initial: T, sanitize?: (stored: unknown) => T) {
  const [initialValue] = useState(initial); // first value wins, like useState
  const [check] = useState(() => sanitize ?? ((v: unknown) => conform(v, initialValue)));
  const raw = useSyncExternalStore(
    useCallback((l: () => void) => subscribe(key, l), [key]),
    () => read(key),
    () => undefined,
  );
  const value = useMemo(() => parse(raw, initialValue, check), [raw, initialValue, check]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = parse(read(key), initialValue, check);
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      write(key, JSON.stringify(v));
    },
    [key, initialValue, check],
  );

  return [value, update, raw !== undefined] as const;
}
