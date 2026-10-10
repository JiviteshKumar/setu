"use client";

import { useStoredState } from "@/lib/useStoredState";
import { MetroLine, type Station } from "@/components/MetroLine";

// CEFR level names as used by Deutsche Welle (A1–A2 basic, B1–B2 independent, C1–C2 proficient).
// The "why it matters" lines describe what each level lets you do in everyday student life, not official requirements.
const LEVELS: Station[] = [
  { id: "a1", zone: "Basic user", title: "A1 — first words", detail: "Introduce yourself, numbers, shopping, simple forms. Start this while you are still in India." },
  { id: "a2", zone: "Basic user", title: "A2 — daily life", detail: "Appointments, the doctor, the Bürgeramt, small talk with flatmates." },
  { id: "b1", zone: "Independent user", title: "B1 — getting by on your own", detail: "Phone calls, letters from offices, simple part-time jobs that need German." },
  { id: "b2", zone: "Independent user", title: "B2 — working in German", detail: "Meetings and job interviews in German. Most German-taught Master's programmes ask for at least B2 (see the figure below)." },
  { id: "c1", zone: "Proficient user", title: "C1 — professional", detail: "Study and work fully in German. The DW free courses go up to C1." },
];

export function GermanTrack() {
  const [done, setDone] = useStoredState<Record<string, boolean>>("german-levels", {});
  return <MetroLine stations={LEVELS} done={done} onToggle={(id, v) => setDone((p) => ({ ...p, [id]: v }))} lineName="U3" />;
}
