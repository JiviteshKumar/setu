"use client";

// Shared motion primitives. Everything here respects the user's "reduce motion" setting via MotionConfig.
import { animate, MotionConfig, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from "motion/react";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useMotionPref } from "@/lib/motionPref";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: "spring", stiffness: 420, damping: 30 } as const;

/** Applies the in-app animation preference: "auto" follows the device, "on"/"off" override it. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [pref] = useMotionPref();
  useEffect(() => {
    document.documentElement.dataset.motion = pref; // lets CSS animations follow the same choice
  }, [pref]);
  // "off" skips animations entirely (final state immediately); "auto" lets Motion tone down movement when the device asks.
  return (
    <MotionConfig reducedMotion={pref === "on" ? "never" : "user"} skipAnimations={pref === "off"}>
      {children}
    </MotionConfig>
  );
}

export function MotionToggle({ className = "" }: { className?: string }) {
  const [pref, setPref, loaded] = useMotionPref();
  if (!loaded) return null;
  return (
    <div role="radiogroup" aria-label="Animations" className={`inline-flex items-center gap-1 rounded-full border border-border bg-surface p-0.5 text-xs ${className}`}>
      <span className="px-2 text-muted">Animations</span>
      {(["auto", "on", "off"] as const).map((v) => (
        <button
          key={v}
          role="radio"
          aria-checked={pref === v}
          onClick={() => setPref(v)}
          className={`relative rounded-full px-2.5 py-1 capitalize ${pref === v ? "text-on-accent" : "text-muted hover:text-text"}`}
        >
          {pref === v && <motion.span layoutId="motion-pref" className="absolute inset-0 rounded-full bg-accent" transition={SPRING} />}
          <span className="relative">{v}</span>
        </button>
      ))}
    </div>
  );
}

const noopSubscribe = () => () => {};
/**
 * False while the server-rendered page is hydrating, true afterwards. Content that arrives with the first page load
 * must be visible without JavaScript (slow phones, weak networks), so it is never hidden for an entrance animation;
 * only content mounted later (client navigation) animates in.
 */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Fades + lifts content in when it scrolls into view. */
export function Reveal({ children, delay = 0, className, y = 14 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const hydrated = useHydrated();
  return (
    <motion.div
      className={className}
      initial={hydrated ? { opacity: 0, y } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};

export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" }) {
  const Comp = as === "ul" ? motion.ul : as === "ol" ? motion.ol : motion.div;
  const hydrated = useHydrated();
  return (
    <Comp className={className} variants={staggerParent} initial={hydrated ? "hidden" : false} whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp className={className} variants={staggerChild}>
      {children}
    </Comp>
  );
}

/** Counts up to a number when it first becomes visible, then tweens on change. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  // Start at the real value so the server HTML (and slow phones before JavaScript runs) show the correct number.
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  const plan = useRef<"count-up" | "static" | null>(null);

  useEffect(() => {
    // Decide once, on mount: count up only if the number is still below the fold (it will scroll into view later).
    if (plan.current === null && ref.current) {
      const off = document.documentElement.dataset.motion === "off";
      plan.current = !off && !reduce && ref.current.getBoundingClientRect().top > window.innerHeight ? "count-up" : "static";
      if (plan.current === "count-up") mv.set(0);
    }
  }, [mv, reduce]);

  useEffect(() => {
    if (!inView || plan.current === null) return;
    if (reduce || document.documentElement.dataset.motion === "off") {
      mv.set(value);
      return;
    }
    // Later changes (e.g. a new total in the cost planner) tween from the old value to the new one.
    const controls = animate(mv, value, { duration: plan.current === "count-up" ? 1.1 : 0.5, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, value, reduce, mv]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

/** A rubber-stamp impression — the "official" moment for verdicts and completed steps. */
export function Stamp({
  children,
  tone = "accent",
  className = "",
  rotate = -8,
}: {
  children: ReactNode;
  tone?: "accent" | "ok" | "warn" | "danger";
  className?: string;
  rotate?: number;
}) {
  const color = { accent: "text-accent border-accent", ok: "text-ok border-ok", warn: "text-warn border-warn", danger: "text-danger border-danger" }[tone];
  return (
    <motion.span
      className={`inline-flex items-center justify-center rounded-md border-[2.5px] px-2.5 py-1 font-mono text-xs font-bold tracking-[0.18em] uppercase ${color} ${className}`}
      style={{ maskImage: "radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,.75) 100%)" }}
      initial={{ opacity: 0, scale: 2.2, rotate: rotate - 14 }}
      animate={{ opacity: 0.92, scale: 1, rotate }}
      transition={{ type: "spring", stiffness: 520, damping: 22, mass: 0.8 }}
    >
      {children}
    </motion.span>
  );
}

/** Page-level enter animation used by app/template.tsx. */
export function PageEnter({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  return (
    <motion.div initial={hydrated ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}
