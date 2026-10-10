import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";
import { SourceNote } from "@/components/SourceNote";
import { Reveal } from "@/components/motion";
import { RoleMarket } from "./RoleMarket";

export const metadata: Metadata = { title: "After your Master's" };

export default function CareerPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Honest career check" title={<>After your Master&apos;s</>}>
        A German degree opens doors, but nobody can promise you a job. Here are the legal facts and a live look at the job market for your target role — so you
        can decide with open eyes before you spend lakhs.
      </PageHeader>

      <section className="space-y-3">
        <h2 className="h2">How many jobs are advertised for your role?</h2>
        <RoleMarket />
        <SourceNote sources={["baJobs"]} />
      </section>

      <section className="space-y-3">
        <h2 className="h2">The rules</h2>
        {FACTS.filter((f) => f.topic === "after-studies").map((f) => (
          <FactCard key={f.id} fact={f} />
        ))}
      </section>

      <Reveal>
        <div className="card text-[15px] leading-relaxed">
          <h2 className="h2">What you can do now</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Learn German while you study —{" "}
              <Link className="text-accent underline" href="/german">
                start your language line
              </Link>
              .
            </li>
            <li>
              Get German work experience during your Master&apos;s with a working-student job or internship —{" "}
              <Link className="text-accent underline" href="/jobs">
                search the official job board
              </Link>
              .
            </li>
            <li>Check job ads for your target role before choosing a course, not after.</li>
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
