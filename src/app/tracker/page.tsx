import type { Metadata } from "next";
import { Tracker } from "./Tracker";
import { PageHeader } from "@/components/PageHeader";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";

export const metadata: Metadata = { title: "My plan" };

const fact = (id: string) => {
  const f = FACTS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown fact ${id}`); // fails the build instead of silently dropping a step
  return <FactCard key={id} fact={f} compact />;
};

export default function TrackerPage() {
  return (
    <div>
      <PageHeader eyebrow="My journey" title="My plan">
        Choose your intake, save courses, and see their application dates and what to do next. Saved only on this device — no account needed.
      </PageHeader>
      <Tracker
        phases={{
          before: [fact("dmat-who"), fact("dmat-fee-dates"), fact("aps-process")],
          admitted: [fact("blocked-account"), fact("visa-portal-aps"), fact("student-insurance-30")],
          arrival: [fact("anmeldung")],
        }}
      />
    </div>
  );
}
