"use client";

import { useStoredState } from "@/lib/useStoredState";
import { MetroLine, type Station } from "@/components/MetroLine";

// Order matters: each step usually needs the one before it.
const STEPS: Station[] = [
  { id: "sim", zone: "Week 1", title: "Get a SIM card", detail: "You need a German number for appointments and banking." },
  {
    id: "anmeldung",
    zone: "Week 1",
    title: "Anmeldung (address registration)",
    detail: "Within 2 weeks of moving in, at the Bürgeramt. Bring passport + landlord confirmation (Wohnungsgeberbestätigung).",
  },
  { id: "enrol", zone: "Weeks 1–2", title: "Complete enrolment at your university", detail: "Pay the semester contribution; you get your student ID and semester ticket." },
  { id: "insurance", zone: "Weeks 1–2", title: "Activate health insurance", detail: "Your university needs proof of insurance for enrolment." },
  { id: "bank", zone: "Weeks 1–2", title: "Open a German bank account", detail: "Needed for rent, salary and blocked-account payouts." },
  { id: "blocked", zone: "Weeks 2–4", title: "Activate blocked-account payouts", detail: "Send your provider the documents they ask for (often address registration)." },
  { id: "taxid", zone: "Weeks 2–4", title: "Receive your tax ID (Steuer-ID)", detail: "Arrives by post a few weeks after Anmeldung. Employers need it." },
  { id: "permit", zone: "Before your visa ends", title: "Residence permit appointment", detail: "Book with your local foreigners' office (Ausländerbehörde) well before your visa expires." },
  {
    id: "rundfunk",
    zone: "Before your visa ends",
    title: "Broadcasting fee letter (Rundfunkbeitrag)",
    detail: "Every flat pays it once — if you share a flat, agree who pays. Don't ignore these letters.",
  },
];

export function ArrivalChecklist() {
  const [done, setDone] = useStoredState<Record<string, boolean>>("arrival", {});
  return <MetroLine stations={STEPS} done={done} onToggle={(id, v) => setDone((p) => ({ ...p, [id]: v }))} lineName="S2" />;
}
