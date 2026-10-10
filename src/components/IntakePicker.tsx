"use client";

import { motion } from "motion/react";
import { intakeHasStarted, intakeLabel, sameIntake, semesterName, upcomingIntakes, type Intake } from "@/lib/intake";
import { useMyIntake } from "@/lib/myIntake";
import { useToday } from "@/lib/useToday";

/** "Which intake are you aiming for?" — the next four semesters, stored on this device. */
export function IntakePicker({ title = "Which intake are you aiming for?", hint }: { title?: string; hint?: React.ReactNode }) {
  const [intake, setIntake, loaded] = useMyIntake();
  const today = useToday();
  const options = today ? upcomingIntakes(today) : [];
  const passed = intake && today && intakeHasStarted(intake, today);

  return (
    <section className="card space-y-3">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted">
          {hint ??
            (intake && !passed ? (
              <>
                Showing dates and updates for the <strong className="text-text">{semesterName(intake)}</strong>.
              </>
            ) : (
              "Pick one and Setu shows the application dates and updates for that semester."
            ))}
        </p>
        {passed && (
          <p className="mt-2 rounded-lg bg-warn-soft p-2 text-xs text-warn">{intakeLabel(intake)} has already started. Choose the intake you are aiming for now.</p>
        )}
      </div>
      <div role="radiogroup" aria-label="Target intake" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {(loaded ? options : []).map((o) => (
          <IntakeOption key={`${o.season}${o.year}`} option={o} active={sameIntake(intake, o)} onPick={() => setIntake(o)} />
        ))}
        {loaded && (
          <button
            type="button"
            role="radio"
            aria-checked={!intake}
            onClick={() => setIntake(null)}
            className={`col-span-2 rounded-xl border px-3 py-2 text-sm sm:col-auto ${!intake ? "border-accent-bright/50 bg-accent-soft text-accent" : "border-border text-muted hover:text-text"}`}
          >
            Not sure yet
          </button>
        )}
        {!loaded && <span className="col-span-2 h-14 w-full animate-pulse rounded-xl bg-surface-2" />}
      </div>
    </section>
  );
}

function IntakeOption({ option, active, onPick }: { option: Intake; active: boolean; onPick: () => void }) {
  const winter = option.season === "winter";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onPick}
      className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${active ? "border-accent-bright/60 text-text" : "border-border text-muted hover:text-text"}`}
    >
      {active && <motion.span layoutId="intake-choice" className="absolute inset-0 rounded-xl bg-accent-soft" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
      <motion.span className="relative" animate={active ? { rotate: winter ? [0, 60, 0] : [0, 45, 0], scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.6 }} aria-hidden>
        {winter ? <Snowflake /> : <Sun />}
      </motion.span>
      <span className="relative leading-tight">
        <span className="block font-semibold">{intakeLabel(option)}</span>
        <span className="block text-[11px] text-muted">{winter ? `starts autumn ${option.year}` : `starts spring ${option.year}`}</span>
      </span>
    </button>
  );
}

function Snowflake() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent-bright" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" />
    </svg>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.25" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  );
}
