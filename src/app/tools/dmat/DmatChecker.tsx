"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Stamp } from "@/components/motion";
import { DMAT_LIST_VERSION, searchFields, type FieldGroup } from "@/content/dmat-fields";

type Answer = "yes" | "no" | null;

const COVERED: FieldGroup[] = ["engineering", "commerce", "business"];

export function DmatChecker() {
  const [degree, setDegree] = useState("");
  const [picked, setPicked] = useState<{ group: FieldGroup; item: string } | null>(null);
  const [notListed, setNotListed] = useState(false);
  const [earlyAps, setEarlyAps] = useState<Answer>(null);
  const [exchange, setExchange] = useState<Answer>(null);
  const [intake, setIntake] = useState<"ws2026" | "ss2027plus" | null>(null);

  const matches = useMemo(() => (picked ? [] : searchFields(degree)), [degree, picked]);

  const verdict = (() => {
    if (earlyAps === "yes")
      return { tone: "ok", title: "Not required for you", text: "The transition rule exempts you: you registered online with APS or shipped complete documents before 29 June 2026, or already hold an APS certificate." };
    if (exchange === "yes")
      return { tone: "ok", title: "Not required for you", text: "Officially confirmed exchange, double-degree and university-partnership programmes are exempt. You need a confirmation with the group number for APS." };
    if (intake === "ws2026") return { tone: "ok", title: "Not required for Winter 2026/27", text: "The requirement starts with the Summer Semester 2027 intake." };
    if (!picked && !notListed) return null;
    if (notListed)
      return {
        tone: "warn",
        title: "Your degree isn't in the official list",
        text: "We only answer from the official APS list and won't guess. APS India decides from the official title on your degree certificate. If your field is clearly equivalent to Engineering, Commerce/Finance/Economics or Business/Management, it may still be covered — ask APS India.",
      };
    if (!picked || earlyAps === null || exchange === null || intake === null) return null;
    if (COVERED.includes(picked.group))
      return {
        tone: "danger",
        title: "You need the dMAT",
        text: `"${picked.item}" is in the official list of affected fields. Register for a dMAT date with g.a.s.t. early — seats are first come, first served. (Exception: if you have not yet completed at least 5 semesters of a 3-year or 7 semesters of a 4-year bachelor's, APS lists you as exempt for now.)`,
      };
    if (picked.group === "separate")
      return { tone: "warn", title: "APS will decide separately", text: `"${picked.item}" needs a separate assessment by APS India. It may be covered if your degree is formally awarded as Business, Management, Commerce, Finance or Economics.` };
    return {
      tone: "ok",
      title: "Probably not required",
      text: `"${picked.item}" is listed as "not automatically included". It is covered only if APS India classifies your official degree title as Engineering, Commerce/Finance/Economics or Business/Management.`,
    };
  })();

  const toneClass = { ok: "border-ok/30 bg-ok-soft text-ok", warn: "border-warn/30 bg-warn-soft text-warn", danger: "border-danger/30 bg-danger-soft text-danger" };

  return (
    <div className="space-y-4">
      <Step n={1} title="What is your bachelor's degree? (as written on your degree certificate)">
        {picked ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip text-text">{picked.item}</span>
            <button type="button" className="text-sm underline" onClick={() => setPicked(null)}>
              change
            </button>
          </div>
        ) : (
          <>
            <input
              className="input"
              aria-label="Your bachelor's degree name"
              placeholder="e.g. Computer Science and Engineering, B.Com, BCA, Mechanical"
              value={degree}
              onChange={(e) => {
                setDegree(e.target.value);
                setNotListed(false);
              }}
            />
            {matches.length > 0 && (
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {matches.map((m) => (
                  <li key={m.group + m.item}>
                    <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => setPicked(m)}>
                      {m.item} <span className="text-xs text-muted">— {m.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {degree.length >= 3 && (
              <button type="button" className="mt-2 text-sm underline" onClick={() => setNotListed(true)}>
                My degree isn&apos;t in this list
              </button>
            )}
          </>
        )}
      </Step>

      <Step n={2} title="Did you register online with APS or ship complete APS documents before 29 June 2026, or do you already have an APS certificate?">
        <YesNo value={earlyAps} onChange={setEarlyAps} />
      </Step>

      <Step n={3} title="Are you in an officially confirmed exchange, double-degree or university-partnership programme?">
        <YesNo value={exchange} onChange={setExchange} />
      </Step>

      <Step n={4} title="Which intake are you applying for?">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ws2026", "Winter 2026/27"],
              ["ss2027plus", "Summer 2027 or later"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setIntake(v)} className={intake === v ? "btn-primary" : "btn-ghost"}>
              {l}
            </button>
          ))}
        </div>
      </Step>

      <AnimatePresence mode="wait">
        {verdict && (
          <motion.div
            key={verdict.title + verdict.text}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`relative overflow-hidden rounded-2xl border p-5 ${toneClass[verdict.tone as keyof typeof toneClass]}`}
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">dMAT check · result</p>
                <p className="mt-1 text-xl font-semibold">{verdict.title}</p>
              </div>
              <Stamp tone={verdict.tone as "ok" | "warn" | "danger"} rotate={-10} className="shrink-0 bg-surface/60 text-[11px]">
                {{ ok: "Not needed", warn: "Check with APS", danger: "Required" }[verdict.tone as "ok" | "warn" | "danger"]}
              </Stamp>
            </div>
            <p className="mt-2 text-[15px] text-text">{verdict.text}</p>
            <p className="mt-3 text-xs text-muted">Based on the APS India field list, {DMAT_LIST_VERSION}. APS India makes the final decision.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <p className="mb-2 font-medium">
        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-sm text-accent">{n}</span>
        {title}
      </p>
      {children}
    </section>
  );
}

function YesNo({ value, onChange }: { value: Answer; onChange: (v: Answer) => void }) {
  return (
    <div className="flex gap-2">
      {(["yes", "no"] as const).map((v) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={value === v ? "btn-primary" : "btn-ghost"}>
          {v === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}
