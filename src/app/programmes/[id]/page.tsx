import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChanges, getProgramme, getProgrammes, intakeDeadlines } from "@/lib/programmes";
import { formatMonthDay } from "@/lib/dates";
import { SaveButton } from "@/components/SaveButton";
import { SourceNote } from "@/components/SourceNote";
import { Icon } from "@/components/Icon";
import { Ticket, TicketField } from "@/components/Ticket";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { FlyingPlane } from "./FlyingPlane";
import { ReportButton } from "@/components/ReportButton";
import { slugForCity } from "@/lib/cityguides";

export function generateStaticParams() {
  return getProgrammes().map((p) => ({ id: String(p.id) }));
}

export async function generateMetadata({ params }: PageProps<"/programmes/[id]">): Promise<Metadata> {
  const p = getProgramme((await params).id);
  return p ? { title: `${p.name} – ${p.university}` } : {};
}

export default function ProgrammePage({ params }: PageProps<"/programmes/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProgrammeDetail params={params} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
      <div className="h-72 animate-pulse rounded-3xl bg-surface-2" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}

async function ProgrammeDetail({ params }: { params: PageProps<"/programmes/[id]">["params"] }) {
  const p = getProgramme((await params).id);
  if (!p) notFound();

  return (
    <article>
      <Link href="/programmes" className="text-sm text-muted hover:text-text">
        ← All courses
      </Link>
      <Reveal className="mt-3">
        <Ticket
          stub={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <SaveButton programme={{ ...p, deadlines: intakeDeadlines(p) }} />
                {p.courseWebsite && (
                  <a href={p.courseWebsite} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    Official course website <Icon name="external" className="h-4 w-4" />
                  </a>
                )}
                {slugForCity(p.city) && (
                  <Link href={`/cities/${slugForCity(p.city)}`} className="btn-ghost">
                    Living in {p.city}
                  </Link>
                )}
              </div>
              <span className="hidden font-mono text-[10px] tracking-[0.2em] text-muted sm:block">DAAD #{p.id}</span>
            </div>
          }
        >
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-muted uppercase">
            <span>Master&apos;s pass</span>
            <span>{p.universityType === "Universitäten" ? "University" : p.universityType === "Fachhochschulen / HAW" ? "Univ. of Applied Sciences" : p.universityType}</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div>
              <p className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">IND</p>
              <p className="text-xs text-muted">India</p>
            </div>
            <div className="relative h-6 flex-1">
              <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-border" />
              <FlyingPlane />
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{p.city.slice(0, 3).toUpperCase()}</p>
              <p className="max-w-32 truncate text-xs text-muted">{p.city}</p>
            </div>
          </div>
          <h1 className="mt-5 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{p.name}</h1>
          <p className="mt-1 text-muted">
            {p.university} · {p.state}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <TicketField label="Degree" value={p.degree.replace("Master of ", "M. ")} />
            <TicketField label="Intake" value={p.intakes.map((i) => (i === "winter" ? "Winter" : "Summer")).join(" + ") || "—"} />
            <TicketField label="Duration" value={p.duration ?? "—"} />
            <TicketField
              label="Tuition"
              value={p.tuition.category === "none" ? "None listed" : p.tuition.category === "charged" ? "Charged" : "See below"}
              accent={p.tuition.category !== "none"}
            />
          </div>
        </Ticket>
      </Reveal>

      {p.checks.length > 0 && (
        <div className="mt-5 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="alert" className="h-4 w-4" /> Please double-check
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {p.checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {getChanges(p.id).length > 0 && (
        <div className="mt-5 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm">
          <p className="font-semibold text-warn">Recently changed on DAAD</p>
          <ul className="mt-2 space-y-2">
            {getChanges(p.id).map((c, i) => (
              <li key={i}>
                <span className="font-medium">{c.field}</span> <span className="text-muted">· detected {c.detectedAt.slice(0, 10)}</span>
                <span className="block text-muted line-through">{(c.before ?? "—").slice(0, 200)}</span>
                <span className="block">{(c.after ?? "—").slice(0, 200)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Stagger className="mt-5 grid gap-4 md:grid-cols-2">
        <Section title="Deadlines for Indian (non-EU) applicants">
          {p.deadlines.length > 0 ? (
            <ul className="space-y-1.5">
              {p.deadlines.map((d, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Icon name="calendar" className="h-4 w-4 text-accent" />
                  <span>
                    <strong>{d.intake === "winter" ? "Winter semester" : "Summer semester"}:</strong>{" "}
                    {d.from ? `${formatMonthDay(d.from)} – ` : "until "}
                    {d.until ? formatMonthDay(d.until) : d.text}
                    {d.applicants !== "all countries" && <span className="text-muted"> ({d.applicants})</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {p.deadlinesText && (
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-text">Original wording: </span>
              {p.deadlinesText}
            </p>
          )}
          {!p.deadlinesText && <p className="text-muted">Not listed — check the course website.</p>}
        </Section>

        <Section title="Costs">
          <Row label="Tuition per semester" value={p.tuition.text ?? "Not listed"} />
          <Row label="Semester contribution" value={p.semesterContribution ?? "Not listed"} />
          <Row label="Living costs (university's estimate)" value={p.costOfLiving ?? "Not listed"} />
        </Section>

        <Section title="Admission requirements">
          <p className="prose-text">{p.admissionRequirements ?? "Not listed — check the course website."}</p>
          {(p.mentionsGre || p.mentionsVpd) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.mentionsGre && <span className="chip">Mentions GRE</span>}
              {p.mentionsVpd && <span className="chip">Mentions VPD</span>}
            </div>
          )}
        </Section>

        <Section title="Language requirements">
          <Row label="Teaching language" value={p.languages.join(" + ")} />
          {p.languageNote && <p className="mb-2 text-sm text-muted">{p.languageNote}</p>}
          <Row label="English" value={p.englishRequirement ?? "Not listed"} />
          <Row label="German" value={p.germanRequirement ?? "Not listed"} />
        </Section>

        <Section title="How to apply">
          <Row
            label="Apply via"
            value={p.applyVia === "uni-assist" ? "uni-assist (central service for international applications)" : (p.applyViaText ?? "See course website")}
          />
          <Row label="Intakes" value={p.intakes.map((i) => (i === "winter" ? "Winter (October)" : "Summer (April)")).join(", ") || "Not listed"} />
          <Row label="Duration" value={p.duration ?? "Not listed"} />
          <Row label="Study mode" value={p.mode ?? "Not listed"} />
        </Section>

        {p.partTimeWork && (
          <Section title="Part-time jobs (university's description)">
            <p className="prose-text">{p.partTimeWork}</p>
          </Section>
        )}

        {p.accommodation && (
          <Section title="Accommodation (university's description)">
            <p className="prose-text">{p.accommodation}</p>
          </Section>
        )}

        {p.description && (
          <Section title="About the course" wide>
            <p className="prose-text">{p.description}</p>
          </Section>
        )}
      </Stagger>

      <div className="card mt-5 text-sm">
        <p>
          <strong>Public university:</strong> {p.universityOfficialName} is a public (öffentlich-rechtlich) institution
          {p.universityId.startsWith("x-") ? ", verified manually from an official source." : ", as listed in the official Hochschulkompass register."}
        </p>
        <SourceNote
          links={[
            { name: "DAAD course entry", url: p.source.url },
            p.publicStatusSource,
          ]}
          checkedOn={p.source.fetchedAt}
          reviewDays={30}
        />
        <p className="mt-2 text-xs text-muted">
          Universities can change deadlines and requirements. Always confirm on the official course website before you apply.
        </p>
        <ReportButton context={`programme:${p.id}`} />
      </div>
    </article>
  );
}

function Section({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <StaggerItem className={wide ? "md:col-span-2" : ""}>
      <section className="card h-full">
        <h2 className="h2 mb-2">{title}</h2>
        {children}
      </section>
    </StaggerItem>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="text-[15px] leading-relaxed">{value}</p>
    </div>
  );
}
