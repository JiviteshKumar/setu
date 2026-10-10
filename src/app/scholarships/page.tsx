import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = { title: "Scholarships" };

export default function ScholarshipsPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Funding" title={<>Scholarships</>}>
        Two official places to start. Apply early — most scholarship rounds close months before your course begins.
      </PageHeader>
      <Reveal>
        <a
          href="https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/"
          target="_blank"
          rel="noopener noreferrer"
          className="card-link flex items-center justify-between gap-3 bg-ink text-on-ink"
        >
          <span>
            <span className="block font-mono text-[10px] tracking-[0.2em] text-gold uppercase">Official database</span>
            <span className="mt-1 block text-lg font-semibold">Search DAAD scholarships for India →</span>
          </span>
          <Icon name="external" className="h-5 w-5 shrink-0" />
        </a>
      </Reveal>
      {FACTS.filter((f) => f.topic === "scholarships").map((f) => (
        <FactCard key={f.id} fact={f} />
      ))}
      <Reveal>
        <div className="card border-danger/30 bg-danger-soft text-[15px]">
          <p className="font-semibold text-danger">Scholarship scams</p>
          <p className="mt-1">
            If someone asks you to pay a &quot;processing fee&quot; to receive a scholarship, or promises a scholarship in exchange for using their agency, it is not a
            real scholarship. Official scholarships are free to apply for.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
