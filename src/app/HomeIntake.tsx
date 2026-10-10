"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { IntakePicker } from "@/components/IntakePicker";
import { currentWindow, fmtDate, intakeHasStarted, intakeLabel, semesterName, stateOf } from "@/lib/intake";
import { isNews, useMyIntake, usePlanUpdates, useSeenPlanUpdates } from "@/lib/myIntake";
import { useSaved } from "@/lib/saved";
import { useToday } from "@/lib/useToday";

/** Home: ask for the target intake once; afterwards show a short status of the student's plan. */
export function HomeIntake() {
  const [intake, , loaded] = useMyIntake();
  const [saved] = useSaved();
  const plan = usePlanUpdates();
  const [seen] = useSeenPlanUpdates();
  const today = useToday();
  const [changing, setChanging] = useState(false);

  if (!loaded || !today) return <div className="h-28" aria-hidden />;
  if (!intake || changing || intakeHasStarted(intake, today)) {
    return (
      <div onClick={(e) => (e.target as HTMLElement).closest("[role=radio]") && setChanging(false)}>
        <IntakePicker title="When do you want to start your Master's?" />
      </div>
    );
  }

  const fresh = plan?.updates.filter((u) => isNews(u) && !seen.includes(u.key)).length ?? 0;
  const next = saved
    .map((s) => ({ s, w: currentWindow(s.deadlines ?? [], intake, today) }))
    .filter((x) => x.w && stateOf(x.w, today).state !== "closed")
    .sort((a, b) => a.w!.closes.getTime() - b.w!.closes.getTime())[0];

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">Your target</p>
        <p className="mt-1 font-display text-2xl">{intakeLabel(intake)}</p>
        <p className="text-sm text-muted">
          {saved.length === 0
            ? `Save courses and Setu tracks their ${semesterName(intake)} application dates for you.`
            : next
              ? `Next deadline: ${fmtDate(next.w!.closes)} — ${next.s.name}`
              : `None of your ${saved.length} saved course${saved.length === 1 ? "" : "s"} has an open ${intake.season} deadline left.`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="text-sm text-muted underline" onClick={() => setChanging(true)}>
          Change
        </button>
        <Link href={saved.length ? "/tracker" : "/programmes"} className="btn-primary relative">
          {saved.length ? "Open my plan" : "Find courses"}
          {fresh > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-accent">
              {fresh}
            </motion.span>
          )}
        </Link>
      </div>
    </motion.section>
  );
}
