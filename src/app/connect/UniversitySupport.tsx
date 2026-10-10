"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { matcher } from "@/lib/search";

export type UniSupport = { id: string; name: string; city: string; state: string; website: string | null; services: string[]; programmes: number };

// DAAD's fixed vocabulary, with what each means for a newcomer.
export const SERVICES: { id: string; label: string; hint: string }[] = [
  { id: "Buddy programme", label: "Buddy programme", hint: "A current student is matched with you to help you settle in." },
  { id: "Welcome event", label: "Welcome event", hint: "Orientation days to meet other new students." },
  { id: "Pick-up service", label: "Pick-up service", hint: "Someone meets you when you arrive." },
  { id: "Help with finding accommodation", label: "Accommodation help", hint: "Support with finding a room." },
  { id: "Visa matters", label: "Visa help", hint: "Advice on visa and residence permit questions." },
  { id: "Support with registration procedures", label: "Registration help", hint: "Help with Anmeldung, bank, insurance." },
  { id: "Tutors", label: "Tutors", hint: "Student tutors for your subject." },
  { id: "Accompanying programme", label: "Accompanying programme", hint: "Events and trips during the semester." },
  { id: "Cultural and linguistic preparation", label: "Language & culture", hint: "Preparation courses." },
  { id: "Specialist counselling", label: "Counselling", hint: "Advisers for study or personal questions." },
];

export function UniversitySupport({ unis }: { unis: UniSupport[] }) {
  const [q, setQ] = useState("");
  const [need, setNeed] = useState<string[]>(["Buddy programme"]);
  const list = useMemo(() => {
    const matches = matcher(q);
    return unis
      .filter((u) => need.every((n) => u.services.includes(n)))
      .filter((u) => matches(`${u.name} ${u.city} ${u.state}`))
      .sort((a, b) => b.services.length - a.services.length || a.name.localeCompare(b.name));
  }, [unis, q, need]);

  return (
    <div className="space-y-3">
      <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="University or city, e.g. Aachen" aria-label="Search universities" />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Services you want">
        {SERVICES.slice(0, 6).map((s) => {
          const on = need.includes(s.id);
          return (
            <motion.button
              key={s.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              aria-pressed={on}
              title={s.hint}
              onClick={() => setNeed((prev) => (on ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
              className={`chip ${on ? "border-accent-bright bg-accent-soft text-accent" : "hover:text-text"}`}
            >
              {on ? "✓ " : ""}
              {s.label}
            </motion.button>
          );
        })}
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {list.length} public universities offer {need.length ? need.map((n) => SERVICES.find((s) => s.id === n)?.label.toLowerCase()).join(" + ") : "support"}
      </p>
      <ul className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {list.slice(0, 40).map((u) => (
            <motion.li layout key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-muted">
                    {u.city} · {u.programmes} international Master&apos;s programme{u.programmes === 1 ? "" : "s"}
                  </p>
                </div>
                {u.website && (
                  <a href={u.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-accent underline">
                    University website <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SERVICES.filter((s) => u.services.includes(s.id)).map((s) => (
                  <span key={s.id} title={s.hint} className={`chip ${need.includes(s.id) ? "border-ok/40 bg-ok-soft text-ok" : ""}`}>
                    {s.label}
                  </span>
                ))}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {list.length > 40 && <p className="text-center text-sm text-muted">Showing 40 of {list.length}. Search for a city to narrow it down.</p>}
    </div>
  );
}
