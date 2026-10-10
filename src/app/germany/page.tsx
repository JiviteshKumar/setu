import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { ArrivalChecklist } from "./ArrivalChecklist";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";
import { SourceNote } from "@/components/SourceNote";
import { Stagger, StaggerItem } from "@/components/motion";

export const metadata: Metadata = { title: "Living in Germany" };

const TOOLS = [
  { href: "/germany/letters", title: "Explain a German letter", text: "Photo or paste — deadlines, amounts and words explained, privately." },
  { href: "/cities", title: "City guides", text: "Indian groceries, temples, pharmacies and more around your city." },
  { href: "/connect", title: "Connect with seniors", text: "Official buddy programmes and safe ways to meet students." },
  { href: "/germany/housing", title: "Is this flat a scam?", text: "Check a listing against the most common red flags before you pay." },
  { href: "/germany/work", title: "Work-days tracker", text: "Count your days against the 140-day limit of your permit." },
  { href: "/jobs", title: "Find a part-time job", text: "Working-student jobs and minijobs from the official job board." },
];

export default function GermanyPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="After you land" title={<>Living in Germany</>}>
        The first weeks decide a lot. Do things in this order and keep every letter you receive.
      </PageHeader>

      <Stagger className="grid gap-3 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <StaggerItem key={t.href}>
            <Link href={t.href} className="card-link block h-full">
              <p className="font-semibold">{t.title}</p>
              <p className="mt-1 text-sm text-muted">{t.text}</p>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      <section>
        <p className="eyebrow">Your first weeks</p>
        <h2 className="mt-1 mb-4 font-display text-3xl">Arrival line</h2>
        <ArrivalChecklist />
      </section>

      <section className="space-y-3">
        <h2 className="h2">Rules you must know</h2>
        {FACTS.filter((f) => ["arrival", "work", "insurance", "studies"].includes(f.topic)).map((f) => (
          <FactCard key={f.id} fact={f} />
        ))}
      </section>

      <section className="card">
        <h2 className="h2">Emergency and help</h2>
        <ul className="mt-3 space-y-2 text-[15px]">
          <li>
            <a href="tel:112" className="font-semibold text-danger">
              112
            </a>{" "}
            — fire brigade and ambulance (free, 24/7)
          </li>
          <li>
            <a href="tel:110" className="font-semibold text-danger">
              110
            </a>{" "}
            — police
          </li>
          <li>
            <a href="tel:08001110111" className="font-semibold">
              0800 111 0 111
            </a>{" "}
            or{" "}
            <a href="tel:08001110222" className="font-semibold">
              0800 111 0 222
            </a>{" "}
            — TelefonSeelsorge: free, anonymous support when you feel low or lonely, day and night
          </li>
          <li>
            Indian missions (lost passport, emergency certificate, consular help):{" "}
            <a className="underline" href="https://indianembassyberlin.gov.in/" target="_blank" rel="noopener noreferrer">
              Embassy Berlin
            </a>
            ,{" "}
            <a className="underline" href="https://www.cgimunich.gov.in/" target="_blank" rel="noopener noreferrer">
              Consulate Munich
            </a>
            ,{" "}
            <a className="underline" href="https://cgifrankfurt.gov.in/" target="_blank" rel="noopener noreferrer">
              Consulate Frankfurt
            </a>
            ,{" "}
            <a className="underline" href="https://www.cgihamburg.gov.in/" target="_blank" rel="noopener noreferrer">
              Consulate Hamburg
            </a>
          </li>
        </ul>
        <SourceNote links={[{ name: "TelefonSeelsorge", url: "https://www.telefonseelsorge.de/" }]} checkedOn="2026-10-09" reviewDays={365} />
      </section>
    </div>
  );
}
