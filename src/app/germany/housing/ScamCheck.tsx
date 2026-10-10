"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Stamp } from "@/components/motion";

// Red flags from German police crime prevention (ProPK) and the consumer advice centres (Verbraucherzentrale).
const FLAGS = [
  { id: "cheap", text: "Rent is clearly below other listings in the same area", weight: 2 },
  { id: "abroad", text: "Landlord says they are abroad and you can't view the flat", weight: 3 },
  { id: "prepay", text: "You are asked to pay deposit or rent before signing a contract / before the tenancy starts", weight: 3 },
  { id: "keys", text: "They offer to send the keys after you pay", weight: 3 },
  { id: "platform", text: "Payment or key handover is supposed to go through Airbnb, eBay, Booking.com or similar", weight: 3 },
  { id: "viewing-fee", text: "You must pay a fee just for a viewing", weight: 3 },
  { id: "transfer", text: "They want payment by Western Union, crypto, gift cards or to a foreign account", weight: 3 },
  { id: "pressure", text: "They push you to pay quickly because 'many others are interested'", weight: 1 },
  { id: "no-anmeldung", text: "They won't confirm you can register your address there (\"Ist Anmeldung möglich?\")", weight: 2 },
  { id: "id-copy", text: "They ask for your passport copy before you have even seen the flat", weight: 1 },
];

export function ScamCheck() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const score = FLAGS.reduce((s, f) => s + (checked[f.id] ? f.weight : 0), 0);
  const severe = FLAGS.some((f) => checked[f.id] && f.weight >= 3);
  const level = severe || score >= 4 ? "high" : score > 0 ? "medium" : "none";
  const meter = level === "high" ? Math.min(1, 0.7 + score / 40) : level === "medium" ? 0.25 + score * 0.1 : 0.04;

  return (
    <div className="space-y-3">
      <ul className="card space-y-2.5">
        {FLAGS.map((f) => (
          <li key={f.id}>
            <label className="flex items-start gap-3 text-[15px]">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                checked={!!checked[f.id]}
                onChange={(e) => setChecked((p) => ({ ...p, [f.id]: e.target.checked }))}
              />
              {f.text}
            </label>
          </li>
        ))}
      </ul>
      <div className="card">
        <div className="flex items-center justify-between text-[10px] font-mono tracking-[0.18em] text-muted uppercase">
          <span>Looks OK</span>
          <span>Be careful</span>
          <span>Scam</span>
        </div>
        <div className="relative mt-2 h-3 rounded-full" style={{ background: "linear-gradient(90deg, var(--ok), var(--gold) 50%, var(--danger))" }}>
          <motion.div
            className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-surface bg-text shadow-card"
            initial={false}
            animate={{ left: `${meter * 100}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
          />
        </div>
      </div>
      <div
        aria-live="polite"
        className={`rounded-2xl border p-4 ${
          level === "high" ? "border-danger/30 bg-danger-soft" : level === "medium" ? "border-warn/30 bg-warn-soft" : "border-border bg-surface"
        }`}
      >
        {level === "high" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-semibold text-danger">Very likely a scam — do not pay.</p>
              <Stamp tone="danger" rotate={-8} className="shrink-0">
                Do not pay
              </Stamp>
            </div>
            <p className="mt-1 text-[15px]">These are the exact patterns German police warn about. Stop contact and report the listing to the portal.</p>
          </>
        )}
        {level === "medium" && (
          <>
            <p className="text-lg font-semibold text-warn">Be careful.</p>
            <p className="mt-1 text-[15px]">Insist on a viewing (in person or a live video call where they show the street and door), a written contract, and payment only by bank transfer to a German account after signing.</p>
          </>
        )}
        {level === "none" && <p className="text-[15px] text-muted">Tick everything that applies to the listing you are looking at.</p>}
      </div>
    </div>
  );
}
