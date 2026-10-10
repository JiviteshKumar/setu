import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { FACTS, type Fact } from "@/content/facts";
import { FactCard } from "@/components/FactCard";

export const metadata: Metadata = { title: "Verified updates" };

const TOPICS: { id: Fact["topic"]; label: string }[] = [
  { id: "dmat", label: "dMAT" },
  { id: "aps", label: "APS" },
  { id: "visa", label: "Visa" },
  { id: "money", label: "Money" },
  { id: "scholarships", label: "Scholarships" },
  { id: "fees", label: "Tuition fees" },
  { id: "insurance", label: "Health insurance" },
  { id: "arrival", label: "After arrival" },
  { id: "studies", label: "Exams & studies" },
  { id: "work", label: "Working" },
  { id: "german", label: "German language" },
  { id: "after-studies", label: "After your studies" },
];

export default function UpdatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Official sources only" title={<>Verified updates</>}>
          Rules that affect Indian students, each checked against an official source. When a fact is past its review date, it is marked so you know to
          double-check.
      </PageHeader>
      {TOPICS.map((t) => {
        const facts = FACTS.filter((f) => f.topic === t.id);
        if (!facts.length) return null;
        return (
          <section key={t.id} className="space-y-3">
            <h2 className="h2">{t.label}</h2>
            {facts.map((f) => (
              <FactCard key={f.id} fact={f} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
