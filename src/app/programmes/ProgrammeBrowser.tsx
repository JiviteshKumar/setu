"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ProgrammeSummary } from "@/lib/programmes";
import type { GermanyMapData } from "@/lib/mapdata";
import { formatMonthDay, nextOccurrence, daysUntil } from "@/lib/dates";
import { SaveButton } from "@/components/SaveButton";
import { GermanyMap } from "@/components/GermanyMap";
import { conform, useStoredState } from "@/lib/useStoredState";
import { oneOf } from "@/lib/storedShapes";
import { matcher } from "@/lib/search";
import { useToday } from "@/lib/useToday";
import { EASE_OUT } from "@/components/motion";
import { currentWindow, intakeLabel, stateOf, type Intake } from "@/lib/intake";
import { useMyIntake } from "@/lib/myIntake";

type Filters = {
  q: string;
  city: string;
  subject: string;
  state: string;
  language: "any" | "english-only" | "has-english";
  noTuition: boolean;
  intake: "any" | "winter" | "summer";
  /** Application status for the student's chosen intake (My plan). */
  forIntake: "any" | "not-closed" | "open-now";
  applyVia: "any" | "uni-assist" | "university";
  uniType: string;
  sort: "name" | "deadline";
};

const DEFAULT: Filters = {
  q: "",
  city: "",
  subject: "",
  state: "",
  language: "has-english",
  noTuition: false,
  intake: "any",
  forIntake: "any",
  applyVia: "any",
  uniType: "",
  sort: "name",
};

const PAGE = 30;

/** Stored filters from an older version (or edited by hand) must not hide every course: unknown options reset. */
function storedFilters(v: unknown): Filters {
  const f = conform(v, DEFAULT);
  return {
    ...f,
    language: oneOf(["any", "english-only", "has-english"] as const, DEFAULT.language)(f.language),
    intake: oneOf(["any", "winter", "summer"] as const, "any")(f.intake),
    forIntake: oneOf(["any", "not-closed", "open-now"] as const, "any")(f.forIntake),
    applyVia: oneOf(["any", "uni-assist", "university"] as const, "any")(f.applyVia),
    sort: oneOf(["name", "deadline"] as const, "name")(f.sort),
  };
}

const UNI_TYPE_LABEL: Record<string, string> = {
  Universitäten: "University",
  "Fachhochschulen / HAW": "University of Applied Sciences",
  "Kunst- und Musikhochschulen": "Art / Music school",
};

const LABELS: Partial<Record<keyof Filters, (v: string) => string>> = {
  city: (v) => v,
  subject: (v) => v,
  state: (v) => v,
  uniType: (v) => UNI_TYPE_LABEL[v] ?? v,
  language: (v) => ({ "english-only": "English only", any: "Any language", "has-english": "English" })[v] ?? v,
  noTuition: () => "No tuition fee",
  intake: (v) => (v === "winter" ? "Winter intake" : "Summer intake"),
  forIntake: (v) => (v === "open-now" ? "Open now for my intake" : "Deadline not passed for my intake"),
  applyVia: (v) => (v === "uni-assist" ? "uni-assist" : "Direct application"),
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The deadline shown on a course card: for the student's intake (with year) when chosen, otherwise the next one. */
function nextDeadline(p: ProgrammeSummary, intake: Filters["intake"], today: Date | null, mine: Intake | null) {
  if (!today) return null;
  if (mine && (intake === "any" || intake === mine.season)) {
    const w = currentWindow(p.deadlines, mine, today);
    if (w) {
      const closed = stateOf(w, today).state === "closed";
      return { date: w.closes, label: `${w.closes.getDate()} ${MONTHS[w.closes.getMonth()]} ’${String(w.closes.getFullYear()).slice(2)}`, intake: mine.season, tag: intakeLabel(mine), closed, mine: true };
    }
  }
  let best: { date: Date; md: string; intake: string } | null = null;
  for (const d of p.deadlines) {
    if (!d.until || (intake !== "any" && d.intake !== intake)) continue;
    const date = nextOccurrence(d.until, today);
    if (!best || date < best.date) best = { date, md: d.until, intake: d.intake };
  }
  return best && { date: best.date, label: formatMonthDay(best.md), intake: best.intake, tag: best.intake === "winter" ? "WiSe" : "SoSe", closed: false, mine: false };
}

export function ProgrammeBrowser({ programmes, map }: { programmes: ProgrammeSummary[]; map: GermanyMapData | null }) {
  const [filters, setFilters] = useStoredState<Filters>("programme-filters", DEFAULT, storedFilters);
  const [view, setView] = useState<"list" | "map">("list");
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const today = useToday();
  const [myIntake] = useMyIntake();
  const params = useSearchParams();
  const f = useDeferredValue({ ...DEFAULT, ...filters });
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setFilters((prev) => ({ ...DEFAULT, ...prev, [k]: v }));
    setShown(PAGE);
  };

  // Deep link from the home page map: /programmes?city=Aachen
  const cityParam = params.get("city");
  useEffect(() => {
    if (cityParam) setFilters((prev) => ({ ...DEFAULT, ...prev, city: cityParam }));
  }, [cityParam, setFilters]);

  const options = useMemo(() => {
    const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return {
      subjects: uniq(programmes.map((p) => p.subject)),
      states: uniq(programmes.map((p) => p.state)),
      uniTypes: uniq(programmes.map((p) => p.uniType)),
      cities: uniq(programmes.map((p) => p.city)),
    };
  }, [programmes]);

  const results = useMemo(() => {
    const matches = matcher(f.q); // umlaut- and English/German-name tolerant ("Munich" finds München)
    const list = programmes.filter((p) => {
      if (f.q && !matches(`${p.name} ${p.university} ${p.city} ${p.subject} ${p.state}`)) return false;
      if (f.city && p.city !== f.city) return false;
      if (f.subject && p.subject !== f.subject) return false;
      if (f.state && p.state !== f.state) return false;
      if (f.uniType && p.uniType !== f.uniType) return false;
      if (f.language === "english-only" && !(p.languages.length === 1 && p.languages[0] === "English")) return false;
      if (f.language === "has-english" && !p.languages.includes("English")) return false;
      if (f.noTuition && p.tuition !== "none") return false;
      if (f.intake !== "any" && !p.intakes.includes(f.intake)) return false;
      if (f.applyVia !== "any" && p.applyVia !== f.applyVia) return false;
      if (f.forIntake !== "any" && myIntake && today) {
        const w = currentWindow(p.deadlines, myIntake, today);
        const st = w && stateOf(w, today).state;
        if (!st || st === "closed" || (f.forIntake === "open-now" && st !== "open")) return false;
      }
      return true;
    });
    if (f.sort === "deadline") {
      list.sort((a, b) => {
        const na = nextDeadline(a, f.intake, today, myIntake);
        const nb = nextDeadline(b, f.intake, today, myIntake);
        // Courses with an open deadline for the student's own intake first, then other intakes, then closed / unknown.
        const rank = (n: typeof na) => (!n || n.closed ? 2 : myIntake && !n.mine ? 1 : 0);
        const da = na && !na.closed ? na.date.getTime() : Infinity;
        const db = nb && !nb.closed ? nb.date.getTime() : Infinity;
        return rank(na) - rank(nb) || da - db || a.name.localeCompare(b.name);
      });
    }
    return list;
  }, [programmes, f, today, myIntake]);

  // Map shows only cities that match the other filters, so it updates as you filter.
  const mapData = useMemo(() => {
    if (!map) return null;
    const counts = new Map<string, number>();
    for (const p of results) counts.set(p.city, (counts.get(p.city) ?? 0) + 1);
    if (f.city) for (const p of programmes) if (p.city === f.city && !counts.has(p.city)) counts.set(p.city, 0);
    return { ...map, cities: map.cities.filter((c) => counts.get(c.city)).map((c) => ({ ...c, programmes: counts.get(c.city)! })) };
  }, [map, results, programmes, f.city]);

  const active = (Object.keys(LABELS) as (keyof Filters)[]).filter((k) => f[k] !== DEFAULT[k]);

  return (
    <div>
      <div className="sticky top-[calc(57px+env(safe-area-inset-top))] z-20 -mx-4 bg-bg/85 px-4 pt-1 pb-3 backdrop-blur-xl">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" fill="currentColor" aria-hidden>
              <path d="M11 4a7 7 0 1 0 4.4 12.4l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
            </svg>
            <input
              className="input pl-9"
              type="search"
              placeholder="Course, university, city…"
              value={filters.q ?? ""}
              onChange={(e) => set("q", e.target.value)}
              aria-label="Search courses"
            />
          </div>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`btn-ghost relative ${open ? "border-accent-bright" : ""}`}>
            Filters
            {active.length > 0 && (
              <motion.span
                key={active.length}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                className="grid h-5 min-w-5 place-items-center rounded-full bg-accent-bright px-1 text-[11px] font-bold text-white"
              >
                {active.length}
              </motion.span>
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3">
                <Select label="City" value={f.city} onChange={(v) => set("city", v)} options={options.cities} all="All cities" />
                <Select label="Subject" value={f.subject} onChange={(v) => set("subject", v)} options={options.subjects} all="All subjects" />
                <Select label="State" value={f.state} onChange={(v) => set("state", v)} options={options.states} all="All of Germany" />
                <Select label="Type of university" value={f.uniType} onChange={(v) => set("uniType", v)} options={options.uniTypes} all="Any type" format={(v) => UNI_TYPE_LABEL[v] ?? v} />
                <Select
                  label="Teaching language"
                  value={f.language}
                  onChange={(v) => set("language", v as Filters["language"])}
                  options={["has-english", "english-only", "any"]}
                  format={(v) => ({ "has-english": "Taught (partly) in English", "english-only": "English only", any: "Any language" })[v] ?? v}
                />
                <Select
                  label="Intake"
                  value={f.intake}
                  onChange={(v) => set("intake", v as Filters["intake"])}
                  options={["any", "winter", "summer"]}
                  format={(v) => ({ any: "Winter or summer", winter: "Winter (Oct)", summer: "Summer (Apr)" })[v] ?? v}
                />
                {myIntake ? (
                  <Select
                    label={`For ${intakeLabel(myIntake)}`}
                    value={f.forIntake}
                    onChange={(v) => set("forIntake", v as Filters["forIntake"])}
                    options={["any", "not-closed", "open-now"]}
                    format={(v) => ({ any: "Any status", "not-closed": "Deadline not passed yet", "open-now": "Open now (opening date listed)" })[v] ?? v}
                  />
                ) : (
                  <p className="text-sm text-muted">
                    <span className="label">For my intake</span>
                    <Link href="/tracker" className="text-accent underline">
                      Choose your intake
                    </Link>{" "}
                    to filter by application status with real dates.
                  </p>
                )}
                <Select
                  label="How to apply"
                  value={f.applyVia}
                  onChange={(v) => set("applyVia", v as Filters["applyVia"])}
                  options={["any", "uni-assist", "university"]}
                  format={(v) => ({ any: "Any", "uni-assist": "Via uni-assist", university: "Directly / university portal" })[v] ?? v}
                />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={f.noTuition} onChange={(e) => set("noTuition", e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                  Only courses listed with no tuition fee
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div layout className="mt-3 flex flex-wrap items-center gap-1.5">
          <AnimatePresence initial={false}>
            {active.map((k) => (
              <motion.button
                layout
                key={k}
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => set(k, DEFAULT[k] as never)}
                className="chip border-accent-bright/40 bg-accent-soft text-accent"
              >
                {LABELS[k]!(String(f[k]))} <span aria-hidden>×</span>
                <span className="sr-only">remove filter</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-sm">
        <p className="text-muted" aria-live="polite">
          <motion.span key={results.length} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="inline-block font-semibold text-text tabular-nums">
            {results.length.toLocaleString("en-IN")}
          </motion.span>{" "}
          courses
        </p>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="View" className="relative flex rounded-lg border border-border bg-surface-2 p-0.5">
            {(["list", "map"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`relative rounded-md px-3 py-1 capitalize ${view === v ? "text-text" : "text-muted"}`}>
                {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-md bg-surface shadow-card" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span className="relative">{v}</span>
              </button>
            ))}
          </div>
          {view === "list" && (
            <select className="rounded-lg border border-border bg-surface px-2 py-1" value={f.sort} onChange={(e) => set("sort", e.target.value as Filters["sort"])} aria-label="Sort">
              <option value="name">A–Z</option>
              <option value="deadline">Next deadline</option>
            </select>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "map" && mapData ? (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
            <GermanyMap map={mapData} selected={f.city || undefined} onSelect={(c) => set("city", c ?? "")} className="mx-auto max-w-md" />
            <p className="mt-2 text-center text-xs text-muted">Tap a city to filter. Map data © OpenStreetMap contributors, Natural Earth.</p>
            {f.city && (
              <button type="button" className="btn-primary mx-auto mt-3 flex" onClick={() => setView("list")}>
                Show {results.length} courses in {f.city}
              </button>
            )}
          </motion.div>
        ) : (
          <motion.ul key="list" className="mt-3 space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnimatePresence initial={false} mode="popLayout">
              {results.slice(0, shown).map((p, i) => {
                const next = nextDeadline(p, f.intake, today, myIntake);
                const days = next && today && !next.closed ? daysUntil(next.date, today) : null;
                const urgent = days != null && days <= 30;
                return (
                  <motion.li
                    layout
                    key={p.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT, delay: Math.min(i, 8) * 0.03 } }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                    className="card group flex gap-3 transition-colors hover:border-accent-bright/50"
                  >
                    <div className="min-w-0 flex-1">
                      <Link href={`/programmes/${p.id}`} className="font-semibold group-hover:text-accent">
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted">
                        {p.university} · {p.city}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="chip">{p.languages.join(" + ")}</span>
                        {p.tuition === "none" && <span className="chip border-ok/30 bg-ok-soft text-ok">No tuition fee listed</span>}
                        {p.tuition === "charged" && <span className="chip border-warn/30 bg-warn-soft text-warn">Tuition fee</span>}
                        {p.applyVia === "uni-assist" && <span className="chip">uni-assist</span>}
                        {p.hasChecks && <span className="chip border-warn/30 bg-warn-soft text-warn">Double-check</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      <SaveButton programme={p} compact />
                      {next ? (
                        <div className={`rounded-lg px-2 py-1 text-right font-mono leading-tight ${urgent ? "bg-danger-soft text-danger" : "bg-surface-2"}`}>
                          <span className="block text-[9px] tracking-[0.14em] text-muted uppercase">
                            {next.tag} {next.closed ? "closed" : "closes"}
                          </span>
                          <span className={`block text-xs font-semibold ${next.closed ? "text-muted line-through" : ""}`}>{next.label}</span>
                          {days != null && days <= 60 && <span className="block text-[10px]">T−{days}d</span>}
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] text-muted">see details</span>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {shown < results.length && (
              <li>
                <button type="button" className="btn-ghost w-full" onClick={() => setShown((s) => s + PAGE)}>
                  Show more ({results.length - shown} left)
                </button>
              </li>
            )}
            {results.length === 0 && (
              <li className="card text-center text-muted">
                No courses match.{" "}
                <button type="button" className="underline" onClick={() => setFilters(DEFAULT)}>
                  Reset filters
                </button>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  all,
  format = (v) => v,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  all?: string;
  format?: (v: string) => string;
}) {
  return (
    <label className="block text-sm">
      <span className="label">{label}</span>
      <select className="input py-2" value={value} onChange={(e) => onChange(e.target.value)}>
        {all && <option value="">{all}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {format(o)}
          </option>
        ))}
      </select>
    </label>
  );
}
