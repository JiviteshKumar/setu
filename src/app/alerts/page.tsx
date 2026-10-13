import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getAlerts } from "@/lib/alerts";
import { AlertsFeed } from "./AlertsFeed";
import { PlanUpdates } from "@/components/PlanUpdates";
import { IntakePrompt } from "./IntakePrompt";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return (
    <div>
      <PageHeader eyebrow="What changed" title={<>Alerts</>}>
        Changes to rules, deadlines and procedures that affect Indian students. Every morning Setu checks the official sources by itself. A change
        appears here once it is still there on the next day&apos;s check, quoted word for word from the official page, never reworded. For the current rules, see{" "}
        <Link href="/updates" className="text-accent underline">
          verified facts
        </Link>
        .
      </PageHeader>
      <div className="mb-8 space-y-3">
        <IntakePrompt />
        <PlanUpdates />
      </div>
      <h2 className="h2 mb-3">Official changes</h2>
      <AlertsFeed alerts={getAlerts()} />
    </div>
  );
}
