import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { WorkTracker } from "./WorkTracker";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";

export const metadata: Metadata = { title: "Work-days tracker (140-day rule)" };

export default function WorkPage() {
  return (
    <div className="space-y-4">
      <Link href="/germany" className="text-sm text-muted hover:text-text">
        ← Living in Germany
      </Link>
      <PageHeader eyebrow="140-day rule" title={<>Work-days tracker</>}>
        Log the days you work. We count them exactly as § 16b of the Residence Act describes and always pick the method that is better for you. Your entries
        stay on this device.
      </PageHeader>
      <WorkTracker />
      <FactCard fact={FACTS.find((f) => f.id === "work-limit")!} />
      <p className="text-xs text-muted">
        The law says &quot;140 working days per year&quot; but does not define which 12 months are meant. Ask your foreigners&apos; office (Ausländerbehörde)
        how they count, and keep your payslips. This tool helps you keep track; it is not legal advice.
      </p>
    </div>
  );
}
