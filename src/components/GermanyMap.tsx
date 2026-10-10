"use client";

import { useHydrated } from "@/components/motion";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { GermanyMapData } from "@/lib/mapdata";

type Props = {
  map: GermanyMapData;
  selected?: string;
  onSelect?: (city: string | null) => void;
  className?: string;
};

/** Germany with a dot per university city. Dots sweep in north → south; tap a city to select it. */
export function GermanyMap({ map, selected, onSelect, className = "" }: Props) {
  const hydrated = useHydrated();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...map.cities.map((c) => c.programmes));
  const radius = (n: number) => 4 + Math.sqrt(n / max) * 14;
  const active = map.cities.find((c) => c.city === (hover ?? selected));

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={map.viewBox} className="h-auto w-full" role="img" aria-label="Map of Germany with university cities">
        <motion.path
          d={map.path}
          fill="var(--surface-2)"
          stroke="var(--border)"
          strokeWidth="2"
          initial={hydrated ? { opacity: 0, scale: 0.97 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          style={{ transformOrigin: "center" }}
        />
        {map.cities.map((c, i) => {
          const isSel = c.city === selected;
          const r = radius(c.programmes);
          return (
            <motion.g
              key={c.city}
              initial={hydrated ? { opacity: 0, scale: 0 } : false}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + (c.y / 820) * 0.9 + (i % 3) * 0.02, type: "spring", stiffness: 380, damping: 18 }}
              style={{ transformOrigin: `${c.x}px ${c.y}px` }}
              onMouseEnter={() => setHover(c.city)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(isSel ? null : c.city)}
              className={onSelect ? "cursor-pointer" : undefined}
            >
              <circle cx={c.x} cy={c.y} r={Math.max(r, 12)} fill="transparent" />
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                fill={isSel ? "var(--accent-bright)" : "var(--accent-bright)"}
                fillOpacity={isSel ? 0.95 : 0.35}
                stroke="var(--accent-bright)"
                strokeWidth={isSel ? 3 : 1.5}
              />
              <circle cx={c.x} cy={c.y} r="2.5" fill={isSel ? "var(--surface)" : "var(--accent)"} />
            </motion.g>
          );
        })}
      </svg>
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.city}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute top-2 left-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-card"
          >
            <p className="font-semibold">{active.city}</p>
            <p className="text-xs text-muted">
              {active.programmes} course{active.programmes === 1 ? "" : "s"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
