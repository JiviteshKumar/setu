"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { useHydrated } from "@/components/motion";

export type MapPoint = { name: string; lat: number; lon: number; km: number; kind: "grocery" | "restaurant" | "worship" | "supermarket" | "hospital" | "station" };

const KIND: Record<MapPoint["kind"], { color: string; label: string }> = {
  grocery: { color: "var(--accent-bright)", label: "Indian / Asian grocery" },
  restaurant: { color: "var(--gold)", label: "Indian restaurant" },
  worship: { color: "#9333ea", label: "Temple / gurdwara" },
  supermarket: { color: "var(--ok)", label: "Supermarket" },
  hospital: { color: "var(--danger)", label: "Hospital" },
  station: { color: "var(--text)", label: "Main station" },
};

/** A schematic map around the city centre: pins drop in, rings mark 1, 3 and 5 km. */
export function CityMap({ center, points }: { center: { lat: number; lon: number }; points: MapPoint[] }) {
  const hydrated = useHydrated();
  const [active, setActive] = useState<MapPoint | null>(null);
  const R = 7; // km shown from the centre
  const kmPerLon = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  const toXY = (p: { lat: number; lon: number }) => ({ x: 150 + (((p.lon - center.lon) * kmPerLon) / R) * 140, y: 150 - (((p.lat - center.lat) * 110.57) / R) * 140 });
  const shown = points.filter((p) => p.km <= R);

  return (
    <div className="card p-3">
      <div className="relative">
        <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-sm" role="img" aria-label="Map of places around the city centre">
          <defs>
            <radialGradient id="city-bg">
              <stop offset="0" stopColor="var(--accent-soft)" />
              <stop offset="1" stopColor="var(--surface)" />
            </radialGradient>
          </defs>
          <circle cx="150" cy="150" r="145" fill="url(#city-bg)" />
          {[1, 3, 5].map((k) => (
            <g key={k}>
              <circle cx="150" cy="150" r={(k / R) * 140} fill="none" stroke="var(--border)" strokeDasharray="3 4" />
              <text x={150 + (k / R) * 140 + 2} y="146" className="fill-muted font-mono text-[8px]">
                {k} km
              </text>
            </g>
          ))}
          <circle cx="150" cy="150" r="3" fill="var(--text)" />
          {shown.map((p, i) => {
            const { x, y } = toXY(p);
            const big = p.kind === "station" || p.kind === "grocery" || p.kind === "worship";
            return (
              <motion.g
                key={`${p.kind}-${p.name}-${i}`}
                initial={hydrated ? { opacity: 0, y: -14 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + Math.min(i, 40) * 0.025, type: "spring", stiffness: 400, damping: 18 }}
                onMouseEnter={() => setActive(p)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(p)}
                className="cursor-pointer"
              >
                <circle cx={x} cy={y} r={big ? 5.5 : 3.5} fill={KIND[p.kind].color} stroke="var(--surface)" strokeWidth="1.5" />
              </motion.g>
            );
          })}
        </svg>
        {active && (
          <div className="pointer-events-none absolute top-1 left-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-card">
            <p className="font-semibold">{active.name}</p>
            <p className="text-muted">
              {KIND[active.kind].label} · {active.km} km from the centre
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted">
        {Object.entries(KIND).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.color }} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  );
}
