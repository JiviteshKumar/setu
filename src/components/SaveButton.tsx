"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useSaved, type SavedProgramme } from "@/lib/saved";
import { Icon } from "./Icon";
import type { IntakeDeadline } from "@/lib/intake";

type Props = {
  programme: { id: number; name: string; university: string; city: string; deadlines: IntakeDeadline[] };
  compact?: boolean;
};

const BURST = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

export function SaveButton({ programme, compact }: Props) {
  const [saved, setSaved, loaded] = useSaved();
  const [burstKey, setBurstKey] = useState(0);
  const isSaved = saved.some((s) => s.id === programme.id);

  function toggle() {
    if (isSaved) {
      setSaved((prev) => prev.filter((s) => s.id !== programme.id));
      return;
    }
    const first = programme.deadlines.find((d) => d.until) ?? null;
    const entry: SavedProgramme = {
      id: programme.id,
      name: programme.name,
      university: programme.university,
      city: programme.city,
      intake: first?.intake ?? null,
      deadline: first?.until ?? null,
      deadlines: programme.deadlines,
      status: "researching",
      steps: {},
      note: "",
      savedAt: new Date().toISOString(),
    };
    setSaved((prev) => [...prev, entry]);
    setBurstKey((k) => k + 1);
  }

  if (!loaded) return <span className={compact ? "h-9 w-9" : "h-10 w-36"} />;

  const star = (
    <span className="relative inline-grid place-items-center">
      <motion.span key={String(isSaved)} initial={{ scale: isSaved ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 14 }}>
        <Icon name={isSaved ? "star" : "starOutline"} />
      </motion.span>
      <AnimatePresence>
        {burstKey > 0 && isSaved && (
          <motion.span key={burstKey} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            {BURST.map((a, i) => (
              <motion.span
                key={i}
                className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full"
                style={{ background: i % 2 ? "var(--gold)" : "var(--accent-bright)" }}
                initial={{ x: "-50%", y: "-50%", scale: 1 }}
                animate={{ x: `calc(-50% + ${Math.cos(a) * 16}px)`, y: `calc(-50% + ${Math.sin(a) * 16}px)`, scale: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from my plan" : "Save to my plan"}
      className={
        compact
          ? `rounded-full p-2 transition-colors ${isSaved ? "text-accent-bright" : "text-muted hover:bg-surface-2 hover:text-text"}`
          : isSaved
            ? "btn-ghost text-accent"
            : "btn-primary"
      }
    >
      {star}
      {!compact && (isSaved ? "Saved to my plan" : "Save to my plan")}
    </button>
  );
}
