import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";
import { SourceNote } from "@/components/SourceNote";
import { Reveal } from "@/components/motion";
import { GermanTrack } from "./GermanTrack";
import { getProgrammes, dataBuiltAt } from "@/lib/programmes";

export const metadata: Metadata = { title: "Learn German" };

export default function GermanPage() {
  const taughtInGerman = getProgrammes().filter((p) => p.languages.includes("German"));
  const b2plus = taughtInGerman.filter((p) => /\b(B2|C1|C2|DSH|TestDaF)\b/i.test(p.germanRequirement ?? "")).length;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Language" title={<>Learn German</>}>
        Even if your Master&apos;s is in English, German decides how easily you find a flat, a part-time job and later a full-time job. Start in India — every
        level you finish before you fly saves you stress later.
      </PageHeader>

      <section>
        <p className="eyebrow">Your language line</p>
        <h2 className="mt-1 mb-4 font-display text-3xl">A1 → C1</h2>
        <GermanTrack />
        <Reveal className="card mt-2 text-[15px]">
          <p>
            <strong>
              {b2plus} of {taughtInGerman.length}
            </strong>{" "}
            Master&apos;s programmes in our database that are taught fully or partly in German ask for B2 or higher (B2, C1, C2, DSH or TestDaF).
          </p>
          <SourceNote sources={["daad"]} checkedOn={dataBuiltAt()} reviewDays={30} />
        </Reveal>
      </section>

      {FACTS.filter((f) => f.topic === "german").map((f) => (
        <FactCard key={f.id} fact={f} />
      ))}

      <Reveal>
        <div className="card text-[15px]">
          <h2 className="h2">Certificates in India</h2>
          <p className="mt-1.5">
            The Goethe-Institut (Max Mueller Bhavan) runs German courses and the official Goethe-Zertifikat exams in India. Check its website for current
            centres, dates and fees — exam seats fill up.
          </p>
          <SourceNote sources={["goetheIndia"]} />
        </div>
      </Reveal>
    </div>
  );
}
