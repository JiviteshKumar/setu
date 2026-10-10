import type { Metadata } from "next";
import { Suspense } from "react";
import { getSummaries, dataBuiltAt } from "@/lib/programmes";
import { getGermanyMap } from "@/lib/mapdata";
import { ProgrammeBrowser } from "./ProgrammeBrowser";
import { SourceNote } from "@/components/SourceNote";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Master's courses at public universities" };

export default function ProgrammesPage() {
  const summaries = getSummaries();
  return (
    <div>
      <PageHeader eyebrow="Course finder" title="Master's at public universities">
        {summaries.length.toLocaleString("en-IN")} international Master&apos;s programmes at state-run universities. Private universities are excluded using the
        official HRK register.
        <SourceNote sources={["daad", "hrk"]} checkedOn={dataBuiltAt()} reviewDays={14} />
      </PageHeader>
      <Suspense fallback={<div className="card h-24 animate-pulse" />}>
        <ProgrammeBrowser programmes={summaries} map={getGermanyMap()} />
      </Suspense>
    </div>
  );
}
