import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { JobSearch } from "./JobSearch";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";
import { SourceNote } from "@/components/SourceNote";

export const metadata: Metadata = { title: "Part-time jobs for students" };

export default function JobsPage() {
  const work = FACTS.find((f) => f.id === "work-limit")!;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Part-time work" title={<>Part-time jobs in your field</>}>
        Live listings from the official job board of the German Federal Employment Agency — no paid or fake postings. Apply directly with the employer.
      </PageHeader>
      <SourceNote sources={["baJobs"]} />
      <JobSearch />
      <h2 className="h2 pt-2">Before you take a job</h2>
      <FactCard fact={work} />
      <div className="card text-sm leading-relaxed">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Track your working days so you stay within the legal limit:{" "}
            <Link href="/germany/work" className="underline">
              work-days tracker
            </Link>
            .
          </li>
          <li>Many listings on this board are written in German and ask for German skills — read each listing&apos;s requirements before applying.</li>
          <li>Never pay money to get a job. Real employers don&apos;t charge application or &quot;training&quot; fees.</li>
        </ul>
      </div>
    </div>
  );
}
