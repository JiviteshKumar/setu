import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { GradeConverter } from "./GradeConverter";
import { SourceNote } from "@/components/SourceNote";

export const metadata: Metadata = { title: "Indian CGPA to German grade" };

export default function GradePage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Grade converter" title={<>Indian grade → German grade</>}>
        German universities convert foreign grades with the <strong>modified Bavarian formula</strong> agreed by the Standing Conference of Education
        Ministers (KMK). The result is cut to one decimal, not rounded.
      </PageHeader>
      <GradeConverter />
      <div className="card text-sm leading-relaxed">
        <h2 className="h2">Important</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            The <strong>minimum passing grade</strong> changes the result a lot. Use the value your university states — not a guess. Some German universities
            or uni-assist may use a different value for your university; their calculation is final.
          </li>
          <li>Many programmes ask for a minimum German grade (e.g. 2.5). Compare with the admission requirements on the course page.</li>
          <li>This is an estimate to help you shortlist — it is not an official evaluation.</li>
        </ul>
        <SourceNote sources={["kmkGrade"]} checkedOn="2026-10-09" reviewDays={365} />
      </div>
    </div>
  );
}
