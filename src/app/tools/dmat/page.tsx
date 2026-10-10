import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { DmatChecker } from "./DmatChecker";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";

export const metadata: Metadata = { title: "Do I need the dMAT?" };

export default function DmatPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="dMAT checker" title={<>Do I need the dMAT?</>}>
        The Digital Master Test (dMAT) is a new requirement for some Indian Master&apos;s applicants, run by g.a.s.t. and checked by APS India. Answer four
        questions — we compare your degree against the official APS India field list word for word.
      </PageHeader>
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
