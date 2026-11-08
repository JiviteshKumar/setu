"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Stamp } from "@/components/motion";
import { AFFECTED, DMAT_RULES_DATE, searchFields, type FieldGroup } from "@/content/dmat-fields";

type Answer = "yes" | "no" | null;
type Title = "btech" | "other" | "integrated" | null;

export function DmatChecker() {
  const [title, setTitle] = useState<Title>(null);
  const [degree, setDegree] = useState("");
  const [picked, setPicked] = useState<{ group: FieldGroup; item: string } | null>(null);
  const [notListed, setNotListed] = useState(false);
  const [earlyAps, setEarlyAps] = useState<Answer>(null);
  const [exchange, setExchange] = useState<Answer>(null);
  const [intake, setIntake] = useState<"ws2026" | "ss2027plus" | null>(null);

  const matches = useMemo(() => (picked ? [] : searchFields(degree)), [degree, picked]);
  const needsField = title === "other" || title === "integrated";

  const verdict = (() => {
    if (earlyAps === "yes")
      return { tone: "ok", title: "Not required for you", text: "The transition rule exempts you: you registered online with APS or shipped complete documents before 29 June 2026, or already hold an APS certificate." };
    if (exchange === "yes")
      return { tone: "ok", title: "Not required for you", text: "Officially confirmed exchange, double-degree and university-partnership programmes are exempt. You need a confirmation with the group number for APS." };
    if (intake === "ws2026") return { tone: "ok", title: "Not required for Winter 2026/27", text: "The requirement applies to intakes from the summer semester 2027 onwards." };
    if (earlyAps === null || exchange === null || intake === null || !title) return null;
    const register = "Register with g.a.s.t. early — seats are first come, first served. (Exception: bachelor's students who haven't yet completed 5 semesters of a 3-year or 7 semesters of a 4-year programme are not affected yet.)";
    if (title === "btech")
      return { tone: "danger", title: "You need the dMAT", text: `Every degree titled B.Tech or B.Eng needs it, whatever the specialisation (APS's "Degree Title Rule"). ${register}` };
    if (notListed)
      return {
        tone: "warn",
        title: "Check your major field with APS",
        text: "Your degree name isn't in our list. The dMAT is mandatory if your programme's core discipline or major field is Engineering, Commerce, Economics, Business, Management, or Tourism, Travel & Hospitality. In boundary areas APS strongly advises taking it. APS India decides from your official degree documents.",
      };
    if (!picked) return null;
    const integrated = title === "integrated" ? " For an integrated or dual degree, this applies if any component or major field is in one of these areas." : "";
    if (AFFECTED.includes(picked.group))
      return { tone: "danger", title: "You need the dMAT", text: `"${picked.item}" falls under an affected field (${groupLabel(picked.group)}).${integrated} ${register}` };
    if (picked.group === "boundary")
      return { tone: "warn", title: "Boundary area — APS strongly advises the dMAT", text: `"${picked.item}" is a boundary area. APS India strongly advises taking the dMAT so your APS application can be processed without delay.${integrated}` };
    return {
      tone: "ok",
      title: "Probably not required",
      text: `"${picked.item}" is not in the affected fields. It is covered only if your programme's core discipline or major field is Engineering, Commerce, Economics, Business, Management, or Tourism, Travel & Hospitality.${integrated}`,
    };
  })();

  const toneClass = { ok: "border-ok/30 bg-ok-soft text-ok", warn: "border-warn/30 bg-warn-soft text-warn", danger: "border-danger/30 bg-danger-soft text-danger" };

  return (
    <div className="space-y-4">
      <Step n={1} title="What is your bachelor's degree called on your degree certificate?">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["btech", "B.Tech / B.E. / B.Eng"],
              ["other", "Another bachelor's (B.Sc., B.Com, BBA, B.A., BCA, B.Voc …)"],
              ["integrated", "Integrated Bachelor–Master or dual degree"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setTitle(v)} className={title === v ? "btn-primary" : "btn-ghost"}>
              {l}
            </button>
          ))}
        </div>
      </Step>

      {needsField && (
        <Step n={2} title="What is your major field? (as written on your degree certificate)">
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
                aria-label="Your bachelor's degree field"
                placeholder="e.g. B.Com Finance, BBA, Hotel Management, BCA, Economics"
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
      )}

      <Step n={needsField ? 3 : 2} title="Did you register online with APS or ship complete APS documents before 29 June 2026, or do you already have an APS certificate?">
        <YesNo value={earlyAps} onChange={setEarlyAps} />
      </Step>

      <Step n={needsField ? 4 : 3} title="Are you in an officially confirmed exchange, double-degree or university-partnership programme?">
        <YesNo value={exchange} onChange={setExchange} />
      </Step>

      <Step n={needsField ? 5 : 4} title="Which intake are you applying for?">
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
            <p className="mt-3 text-xs text-muted">
              Based on APS India&apos;s rules of {DMAT_RULES_DATE} (aps-india.de/dmat). Degree names come from APS&apos;s first list of June 2026. APS India
              makes the final decision.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function groupLabel(g: FieldGroup) {
  return { engineering: "Engineering / Technology", commerce: "Commerce & Economics", business: "Business & Management", tourism: "Tourism, Travel & Hospitality", boundary: "boundary area", "not-included": "not affected" }[g];
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
