"use client";

import { motion } from "motion/react";
import { useMotionAllowed } from "@/lib/motionPref";
import type { WorldMap } from "@/lib/mapdata";

/** Night-flight map: arcs from Indian cities converge on Germany, a plane travels the Delhi route. */
export function JourneyMap({ map }: { map: WorldMap }) {
  const animated = useMotionAllowed();
  const [dx, dy] = map.destination.xy;
  const arc = ([x, y]: [number, number]) => {
    const cx = (x + dx) / 2 - 40;
    const cy = Math.min(y, dy) - 140;
    return `M${x},${y} Q${cx},${cy} ${dx},${dy}`;
  };
  const main = arc(map.origins[0].xy);

  return (
    <svg viewBox="40 10 960 490" className="h-auto w-full" role="img" aria-label="Flight routes from Indian cities to Germany">
      <defs>
        <linearGradient id="arc" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--accent-bright)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.1" fill="currentColor" />
        </pattern>
        <clipPath id="land-clip">
          <path d={map.land} />
        </clipPath>
      </defs>

      {/* Dotted continents */}
      <rect x="0" y="0" width="1000" height="500" fill="url(#dots)" clipPath="url(#land-clip)" className="text-on-ink/20" />
      <motion.path
        d={map.india}
        fill="var(--accent-bright)"
        fillOpacity={0.22}
        stroke="var(--accent-bright)"
        strokeWidth="1.2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={map.germany}
        fill="var(--gold)"
        fillOpacity={0.35}
        stroke="var(--gold)"
        strokeWidth="1.2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Routes */}
      {map.origins.map((o, i) => (
        <motion.path
          key={o.name}
          d={arc(o.xy)}
          fill="none"
          stroke="url(#arc)"
          strokeWidth={i === 0 ? 2.2 : 1.2}
          strokeLinecap="round"
          strokeDasharray={i === 0 ? undefined : "1 5"}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: i === 0 ? 1 : 0.7 }}
          transition={{ duration: 1.6, delay: 0.5 + i * 0.12, ease: [0.65, 0, 0.35, 1] }}
        />
      ))}

      {/* Departure cities */}
      {map.origins.map((o, i) => (
        <motion.circle
          key={o.name}
          cx={o.xy[0]}
          cy={o.xy[1]}
          r="3.2"
          fill="var(--accent-bright)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 500, damping: 20 }}
        />
      ))}

      {/* Arrival pulse */}
      <g transform={`translate(${dx} ${dy})`}>
        {animated &&
          [0, 1].map((k) => (
            <circle
              key={k}
              r="10"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="1.5"
              style={{ animation: `pulse-ring 2.4s ${k * 1.2}s ease-out infinite`, transformOrigin: "center", transformBox: "fill-box" }}
            />
          ))}
        <circle r="4.5" fill="var(--gold)" />
      </g>

      {/* Plane on the main route */}
      {animated && (
        <motion.g
          style={{ offsetPath: `path('${main}')`, offsetRotate: "auto 90deg" }}
          initial={{ offsetDistance: "0%", opacity: 0 }}
          animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 5, delay: 2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut", times: [0, 0.08, 0.9, 1] }}
        >
          <path d="M0,-9 L2,-2 L9,2 L9,4 L2,2 L1.5,7 L4,9 L4,10.5 L0,9.5 L-4,10.5 L-4,9 L-1.5,7 L-2,2 L-9,4 L-9,2 L-2,-2 Z" fill="var(--on-ink)" />
        </motion.g>
      )}

      <text x={dx + 12} y={dy - 10} className="fill-on-ink font-mono text-[13px] tracking-widest">
        DEUTSCHLAND
      </text>
      <text x={map.origins[0].xy[0] + 8} y={map.origins[0].xy[1] - 8} className="fill-on-ink/80 font-mono text-[13px] tracking-widest">
        BHARAT
      </text>
    </svg>
  );
}
