import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { ScamCheck } from "./ScamCheck";
import { SourceNote } from "@/components/SourceNote";

export const metadata: Metadata = { title: "Is this flat a scam?" };

export default function HousingPage() {
  return (
    <div className="space-y-4">
      <Link href="/germany" className="text-sm text-muted hover:text-text">
        ← Living in Germany
      </Link>
      <PageHeader eyebrow="Housing safety" title={<>Is this flat a scam?</>}>
        Fake flat listings are common in German university cities, and students searching from India are an easy target because they can&apos;t view the
        flat. Check the listing against these red flags before you send any money.
      </PageHeader>
      <ScamCheck />
      <div className="card text-[15px] leading-relaxed">
        <h2 className="h2">If you already paid</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Contact your bank or payment provider immediately and ask whether the payment can be recalled.</li>
          <li>Keep screenshots of the listing and all messages.</li>
          <li>File a police report — in Germany this is possible online.</li>
          <li>Report the listing to the portal so others are warned.</li>
        </ol>
        <h2 className="h2 mt-4">Safer places to start</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Student halls run by your local Studierendenwerk (apply as early as possible — waiting lists are long).</li>
          <li>Your university&apos;s international office — many course pages here describe the help they offer with accommodation.</li>
        </ul>
        <SourceNote
          links={[
            { name: "Police crime prevention (ProPK) – fraud when flat-hunting", url: "https://www.polizei-beratung.de/medienangebot/detail/29874-wohnungssuche-betrug/" },
            {
              name: "Verbraucherzentrale – fake flats online",
              url: "https://www.verbraucherzentrale.de/wissen/vertraege-reklamation/abzocke/fakewohnungen-im-internet-so-erkennen-sie-falsche-immobilienanzeigen-27576",
            },
          ]}
          checkedOn="2026-10-09"
          reviewDays={365}
        />
      </div>
    </div>
  );
}
