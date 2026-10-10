"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "./motion";

/** Semicircular gauge — like a ticket validator's dial. `value` and `max` in the same unit. */
export function Gauge({ value, max, label, unit }: { value: number; max: number; label: string; unit?: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const color = pct > 0.85 ? "var(--danger)" : pct > 0.65 ? "var(--warn)" : "var(--ok)";
  const arc = "M20 110 A90 90 0 0 1 200 110";
  return (
    <div className="relative mx-auto w-full max-w-xs">
      <svg viewBox="0 0 220 124" className="w-full" aria-hidden="true">
        <path d={arc} fill="none" stroke="var(--surface-2)" strokeWidth="16" strokeLinecap="round" />
        {/* tick marks */}
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI - (i / 10) * Math.PI;
          const x1 = 110 + Math.cos(a) * 70;
          const y1 = 110 - Math.sin(a) * 70;
          const x2 = 110 + Math.cos(a) * (i % 5 === 0 ? 60 : 65);
          const y2 = 110 - Math.sin(a) * (i % 5 === 0 ? 60 : 65);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />;
        })}
        <motion.path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pct }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: -90 + pct * 180 }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
          style={{ transformOrigin: "110px 110px" }}
        >
          <line x1="110" y1="110" x2="110" y2="46" stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
        </motion.g>
        <circle cx="110" cy="110" r="7" fill="var(--text)" />
      </svg>
      <div className="-mt-2 text-center">
        <p className="text-3xl font-bold tabular-nums">
          <AnimatedNumber value={value} format={(n) => (Math.round(n * 2) / 2).toLocaleString("en-IN")} />
          <span className="text-base font-normal text-muted"> / {max}</span>
          {unit && <span className="text-base font-normal text-muted"> {unit}</span>}
        </p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
