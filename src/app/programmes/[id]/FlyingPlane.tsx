"use client";

import { motion } from "motion/react";

/** Plane gliding along the ticket's route line. */
export function FlyingPlane() {
  return (
    <motion.svg
      viewBox="-10 -10 20 20"
      className="absolute top-1/2 h-5 w-5 -translate-y-1/2 text-accent-bright"
      initial={{ left: "0%", opacity: 0 }}
      animate={{ left: "calc(100% - 20px)", opacity: 1 }}
      transition={{ duration: 1.4, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
      aria-hidden
    >
      <path
        transform="rotate(90)"
        d="M0,-9 L2,-2 L9,2 L9,4 L2,2 L1.5,7 L4,9 L4,10.5 L0,9.5 L-4,10.5 L-4,9 L-1.5,7 L-2,2 L-9,4 L-9,2 L-2,-2 Z"
        fill="currentColor"
      />
    </motion.svg>
  );
}
