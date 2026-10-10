"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useStoredState } from "@/lib/useStoredState";
import { STATIC_SITE, withBase } from "@/lib/deploy";
import { AnimatedNumber } from "@/components/motion";

type Costs = {
  blocked: string;
  blockedFee: string;
  tuitionPerSem: string;
  semesterFee: string;
  rent: string;
  living: string;
  insurance: string;
  flight: string;
  oneTime: string;
};

// Only the blocked-account amount is pre-filled, because it's the one figure fixed by an official source.
// Everything else depends on the student's city and choices, so they enter it themselves.
const INITIAL: Costs = { blocked: "11904", blockedFee: "", tuitionPerSem: "0", semesterFee: "", rent: "", living: "", insurance: "", flight: "", oneTime: "" };

/** Amounts are never negative: a typo like "-500" must not lower the total. */
const n = (s: string) => {
  const v = Number(s);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

export function CostPlanner() {
  const [c, set] = useStoredState<Costs>("cost-planner", INITIAL);
  const [fx, setFx] = useState<{ rate: number; date: string } | null>(null);
  const [fxError, setFxError] = useState(false);
  const [manualRate, setManualRate] = useState("");

  useEffect(() => {
    // Server: today's ECB rate. Static site: the ECB rate saved by the last daily rebuild (its date is shown).
    fetch(STATIC_SITE ? withBase("/fx.json") : "/api/fx")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => (d?.rate ? setFx(d) : Promise.reject()))
      .catch(() => setFxError(true));
  }, []);

  const rate = manualRate ? n(manualRate) : (fx?.rate ?? 0);
  const firstYear = n(c.tuitionPerSem) * 2 + n(c.semesterFee) * 2 + (n(c.rent) + n(c.living) + n(c.insurance)) * 12 + n(c.flight) + n(c.oneTime) + n(c.blockedFee);
  const monthly = n(c.rent) + n(c.living) + n(c.insurance);
  const blockedMonthly = n(c.blocked) / 12;
  const eur = (v: number) => `€${Math.round(v).toLocaleString("en-IN")}`;

  const field = (key: keyof Costs, label: string, hint?: string) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" inputMode="decimal" value={c[key]} placeholder="€" onChange={(e) => set({ ...INITIAL, ...c, [key]: e.target.value.replace(",", ".") })} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-2">
        {field("blocked", "Blocked account deposit (€ per year)", "Required by the German Missions in India")}
        {field("blockedFee", "Blocked account provider fees (€)", "Compare providers — fees differ")}
        {field("tuitionPerSem", "Tuition per semester (€)", "0 for most public universities; see course page")}
        {field("semesterFee", "Semester contribution (€)", "Shown on each course page")}
        {field("rent", "Rent per month (€)", "Course pages show the university's estimate")}
        {field("living", "Food, phone, other per month (€)")}
        {field("insurance", "Health insurance per month (€)", "Ask a public insurer for the current student rate")}
        {field("flight", "Flight to Germany (€)")}
        {field("oneTime", "One-time costs: visa, APS, dMAT, deposits (€)")}
      </div>

      <div className="card">
        <h2 className="h2">Your first year</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Total spending, year 1" eur={firstYear} rate={rate} />
          <Stat label="Monthly living costs" eur={monthly} rate={rate} />
          <Stat label="Blocked account pays out / month" eur={blockedMonthly} rate={rate} />
        </dl>
        {monthly > 0 && (
          <div className="mt-4" aria-hidden>
            <p className="mb-1.5 text-xs text-muted">Monthly costs vs. blocked-account payout</p>
            <Bar label="Costs" value={monthly} max={Math.max(monthly, blockedMonthly)} color="var(--accent-bright)" />
            <Bar label="Payout" value={blockedMonthly} max={Math.max(monthly, blockedMonthly)} color="var(--ok)" />
          </div>
        )}
        {monthly > blockedMonthly && (
          <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">
            Your monthly costs are higher than the blocked-account payout by {eur(monthly - blockedMonthly)}. Plan how you will cover the gap.
          </p>
        )}
        {n(c.tuitionPerSem) > 0 && (
          <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">
            Tuition can&apos;t be paid from the blocked account. For the visa you must also prove the first year&apos;s fees.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm text-muted">
          <span>
            {fx && !manualRate && `1 EUR = ₹${fx.rate.toFixed(2)} (European Central Bank reference rate, ${fx.date}). Your bank's rate will be a bit worse.`}
            {fxError && !manualRate && "Couldn't load today's rate — enter one manually."}
          </span>
          <label className="flex items-center gap-2">
            Own rate ₹
            <input className="input w-24 py-1" inputMode="decimal" value={manualRate} onChange={(e) => setManualRate(e.target.value)} />
          </label>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, eur, rate }: { label: string; eur: number; rate: number }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">
        €<AnimatedNumber value={eur} />
      </dd>
      <dd className="text-sm text-muted tabular-nums">{rate ? <>₹<AnimatedNumber value={eur * rate} /></> : "—"}</dd>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 text-xs">
      <span className="w-14 text-muted">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={false} animate={{ width: `${max ? (value / max) * 100 : 0}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      <span className="w-16 text-right tabular-nums">€{Math.round(value).toLocaleString("en-IN")}</span>
    </div>
  );
}
