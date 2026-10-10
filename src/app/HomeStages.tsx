"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { EASE_OUT, useHydrated } from "@/components/motion";

type Item = { href: string; title: string; text: string; tag: string };

const STAGES: { id: string; label: string; sub: string; items: Item[] }[] = [
  {
    id: "india",
    label: "Planning from India",
    sub: "Shortlist → APS → apply → visa",
    items: [
      { href: "/programmes", title: "Find courses", text: "Public universities only. Filter by subject, city, language, fees and intake.", tag: "01" },
      { href: "/tools/dmat", title: "Do I need the dMAT?", text: "Check your degree against the official APS India list.", tag: "02" },
      { href: "/prep", title: "dMAT practice", text: "Free adaptive training and mock exams in the official format.", tag: "02b" },
      { href: "/tools/grade", title: "CGPA → German grade", text: "The official modified Bavarian formula.", tag: "03" },
      { href: "/tools/costs", title: "Cost planner in ₹", text: "Blocked account, fees and living costs with today's ECB rate.", tag: "04" },
      { href: "/scholarships", title: "Scholarships", text: "Deutschlandstipendium and the DAAD scholarship database.", tag: "05" },
      { href: "/german", title: "Learn German", text: "Your A1 → C1 line, free official courses and exams in India.", tag: "06" },
      { href: "/career", title: "After your Master's", text: "Blue Card, 18-month job search, live job-market check.", tag: "07" },
      { href: "/connect", title: "Connect with seniors", text: "Official buddy programmes at your university, and how to stay safe in groups.", tag: "08" },
      { href: "/tracker", title: "My intake plan", text: "Pick your intake: application dates with years, updates and calendar reminders.", tag: "08" },
    ],
  },
  {
    id: "germany",
    label: "Living in Germany",
    sub: "Arrive → register → work → thrive",
    items: [
      { href: "/germany", title: "Arrival checklist", text: "Anmeldung, bank, insurance, residence permit — in the right order.", tag: "01" },
      { href: "/germany/letters", title: "Explain a German letter", text: "Photo or paste: deadlines, amounts and official words explained.", tag: "02" },
      { href: "/cities", title: "City guides", text: "Indian groceries, temples, pharmacies and hospitals near you.", tag: "02" },
      { href: "/germany/housing", title: "Is this flat a scam?", text: "Check a listing before you send money.", tag: "02" },
      { href: "/jobs", title: "Part-time jobs", text: "Working-student jobs and minijobs from the official job board.", tag: "03" },
      { href: "/germany/work", title: "140-day work tracker", text: "Stay within the limit of your residence permit.", tag: "04" },
      { href: "/career", title: "After your Master's", text: "Blue Card thresholds and the 18-month job search.", tag: "05" },
    ],
  },
];

export function HomeStages() {
  const hydrated = useHydrated();
  const [stage, setStage] = useState(STAGES[0].id);
  const current = STAGES.find((s) => s.id === stage)!;
  return (
    <section>
      <div role="tablist" aria-label="Your stage" className="relative grid grid-cols-2 rounded-2xl border border-border bg-surface-2 p-1">
        {STAGES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={s.id === stage}
            onClick={() => setStage(s.id)}
            className={`relative rounded-xl px-3 py-2.5 text-left transition-colors ${s.id === stage ? "text-text" : "text-muted"}`}
          >
            {s.id === stage && <motion.span layoutId="stage-pill" className="absolute inset-0 rounded-xl bg-surface shadow-card" transition={{ type: "spring", stiffness: 450, damping: 36 }} />}
            <span className="relative block text-sm font-semibold">{s.label}</span>
            <span className="relative block text-[11px] text-muted">{s.sub}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.ul
          key={stage}
          className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          initial={hydrated ? "hidden" : false}
          animate="show"
          exit="exit"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } }, exit: { opacity: 0, transition: { duration: 0.12 } } }}
        >
          {current.items.map((i, n) => (
            <motion.li
              key={i.href}
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } } }}
            >
              <Link href={i.href} className="card-link group flex h-full items-start gap-3">
                <span className="font-mono text-xs text-accent-bright">{String(n + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{i.title}</span>
                  <span className="mt-1 block text-sm text-muted">{i.text}</span>
                </span>
                <span className="text-muted transition-transform group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </AnimatePresence>
    </section>
  );
}
