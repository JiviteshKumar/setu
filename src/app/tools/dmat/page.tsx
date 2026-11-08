import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { DmatChecker } from "./DmatChecker";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";
import { factStatus } from "@/lib/factStatus";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Do I need the dMAT?" };

export default function DmatPage() {
  // The checker's rules mirror the "dMAT: who needs it" fact. If the daily check finds that APS changed that part of
  // its page, the checker warns at once and the fact card below shows APS's new wording.
  const rules = factStatus("dmat-who");
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="dMAT checker" title={<>Do I need the dMAT?</>}>
        The Digital Master Test (dMAT) is a new requirement for some Indian Master&apos;s applicants, run by g.a.s.t. and checked by APS India. Answer a few
        questions — we apply APS India&apos;s published rules to your degree.
      </PageHeader>
      {rules.state === "changed" && (
        <p className="rounded-xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
          APS India changed its rules on who needs the dMAT on {formatDate(rules.since)}. This checker may not reflect the change yet — read APS&apos;s
          current wording under &quot;dMAT: who needs it&quot; below before relying on the result.
        </p>
      )}
      <DmatChecker />
      <Link href="/prep" className="card-link flex items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">Need the dMAT? Start practising</span>
          <span className="block text-sm text-muted">Free adaptive training and full mock exams in the official format.</span>
        </span>
        <span aria-hidden>→</span>
      </Link>
      <h2 className="h2 pt-2">What you should know</h2>
      {FACTS.filter((f) => f.topic === "dmat").map((f) => (
        <FactCard key={f.id} fact={f} />
      ))}
    </div>
  );
}
