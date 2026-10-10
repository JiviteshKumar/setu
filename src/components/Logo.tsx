"use client";

import { motion } from "motion/react";
import { APP_NAME } from "@/lib/site";
import { useMotionAllowed } from "@/lib/motionPref";

/** "Setu" means bridge: an arch that draws itself, with a dot travelling across (India → Germany). */
export function Logo() {
  const animated = useMotionAllowed();
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 40 24" className="h-6 w-10" aria-hidden="true">
        <motion.path
          d="M3 20 Q20 -4 37 20"
          fill="none"
          stroke="var(--accent-bright)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <path d="M3 20 H37" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
        {animated && (
        <motion.circle
          r="2.6"
          fill="var(--gold)"
          initial={{ offsetDistance: "0%", opacity: 0 }}
          animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.4, delay: 0.6, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
          style={{ offsetPath: "path('M3 20 Q20 -4 37 20')" }}
        />
        )}
      </svg>
      <span className="font-display text-2xl leading-none tracking-tight">{APP_NAME}</span>
    </span>
  );
}
