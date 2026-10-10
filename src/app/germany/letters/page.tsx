import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";
import { LetterExplainer } from "./LetterExplainer";

export const metadata: Metadata = { title: "German letter explainer" };

export default function LettersPage() {
  const card = (id: string) => {
    const f = FACTS.find((x) => x.id === id);
    return f ? <FactCard key={id} fact={f} /> : null;
  };
  return (
    <div>
      <Link href="/germany" className="text-sm text-muted hover:text-text">
        ← Living in Germany
      </Link>
      <PageHeader eyebrow="Post from an office?" title={<>German letter explainer</>}>
        Photograph or paste an official letter. We find the deadlines, amounts and reference numbers, explain the important words, and warn you about scam
        signs — every finding is quoted from your letter so you can check it.
      </PageHeader>
      <LetterExplainer factCards={{ "objection-deadline": card("objection-deadline"), "rundfunk-fee": card("rundfunk-fee") }} />
    </div>
  );
}
