import Link from "next/link";
import { STATIC_SITE } from "@/lib/deploy";
import { getProgrammes, dataBuiltAt } from "@/lib/programmes";
import { getGermanyMap, getWorldMap } from "@/lib/mapdata";
import { FACTS } from "@/content/facts";
import { FactCard } from "@/components/FactCard";
import { formatDate } from "@/lib/dates";
import { JourneyMap } from "@/components/JourneyMap";
import { GermanyMap } from "@/components/GermanyMap";
import { AnimatedNumber, Reveal, Stagger, StaggerItem, Stamp } from "@/components/motion";
import { HomeStages } from "./HomeStages";
import { HomeIntake } from "./HomeIntake";
import { InstallApp } from "@/components/AppShell";
import { getAlerts } from "@/lib/alerts";

export default function Home() {
  const programmes = getProgrammes();
  const alerts = getAlerts();
  const universities = new Set(programmes.map((p) => p.universityId)).size;
  const world = getWorldMap();
  const germany = getGermanyMap();
  const latest = [...FACTS].sort((a, b) => b.verifiedOn.localeCompare(a.verifiedOn)).slice(0, 3);
  const topCities = germany ? [...germany.cities].sort((a, b) => b.programmes - a.programmes).slice(0, 6) : [];

  return (
    <div className="space-y-10">
      {/* Hero: the night flight */}
      <section className="grain relative -mx-4 overflow-hidden bg-ink px-5 pt-7 pb-6 text-on-ink sm:mx-0 sm:rounded-[2rem] sm:px-8 sm:pt-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent-bright/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.22em] text-gold uppercase">India → Deutschland · Master&apos;s</p>
          <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] tracking-tight sm:text-6xl">
            Your Master&apos;s in Germany,
            <br />
            <em className="text-accent-bright">every fact checked.</em>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-on-ink/75">
            Courses at public universities, deadlines, APS, dMAT, visa, money and life in Germany — each with its official source and the date we last
            checked it.
          </p>
        </Reveal>

        {world && (
          <div className="-mx-3 mt-2 sm:mx-0">
            <JourneyMap map={world} />
          </div>
        )}

        <dl className="grid grid-cols-3 gap-2 border-t border-on-ink/10 pt-4">
          <HeroStat label="Master's courses">
            <AnimatedNumber value={programmes.length} />
          </HeroStat>
          <HeroStat label="public universities">
            <AnimatedNumber value={universities} />
          </HeroStat>
          <HeroStat label="data refreshed" small>
            {formatDate(dataBuiltAt())}
          </HeroStat>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/programmes" className="btn bg-accent-bright text-white hover:opacity-90">
            Find your course →
          </Link>
          <Link href="/tools/dmat" className="btn border border-on-ink/20 text-on-ink hover:bg-on-ink/10">
            Do I need the dMAT?
          </Link>
        </div>
      </section>

      <HomeIntake />

      <InstallApp />

      <HomeStages />

      {germany && germany.cities.length > 0 && (
        <section className="grid items-center gap-6 md:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <p className="eyebrow">Where you could study</p>
            <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
              {germany.cities.length} cities. All public universities.
            </h2>
            <p className="mt-3 text-[15px] text-muted">Bigger circles mean more international Master&apos;s courses. Tap a city on the map.</p>
            <Stagger as="ul" className="mt-5 space-y-2">
              {topCities.map((c) => (
                <StaggerItem as="li" key={c.city}>
                  <Link href={`/programmes?city=${encodeURIComponent(c.city)}`} className="group flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 hover:border-accent-bright/60">
                    <span className="font-medium">{c.city}</span>
                    <span className="text-sm text-muted">
                      {c.programmes} courses <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
          <GermanyMap map={germany} className="mx-auto w-full max-w-sm" />
        </section>
      )}

      {alerts.length > 0 && (
        <section>
          <Reveal className="flex items-baseline justify-between">
            <h2 className="h2">Latest alerts</h2>
            <Link href="/alerts" className="text-sm underline">
              All alerts
            </Link>
          </Reveal>
          <Stagger as="ul" className="mt-3 space-y-2">
            {alerts.slice(0, 3).map((a) => (
              <StaggerItem as="li" key={a.id}>
                <Link href="/alerts" className="card-link flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${a.severity === "urgent" ? "bg-danger" : a.severity === "important" ? "bg-gold" : "bg-accent-bright"}`} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{a.title}</span>
                    <span className="block text-xs text-muted">{formatDate(a.publishedAt)}</span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <section>
        <Reveal className="flex items-baseline justify-between">
          <h2 className="h2">Latest verified updates</h2>
          <Link href="/updates" className="text-sm underline">
            All updates
          </Link>
        </Reveal>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {latest.map((f) => (
            <FactCard key={f.id} fact={f} compact />
          ))}
        </div>
      </section>

      <Reveal>
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/prep" className="card-link relative block h-full overflow-hidden">
            <div className="absolute top-4 right-4">
              <Stamp tone="ok" rotate={8}>
                Live
              </Stamp>
            </div>
            <p className="eyebrow">dMAT practice</p>
            <h2 className="mt-1 h2 pr-24">Free, adaptive, in the official format</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              Figure Sequences, Mathematical Equations, Latin Squares and the General Academic Module — original questions, explanations for every answer, timed
              sets and full mock exams. Never leaked or &quot;remembered&quot; exam questions.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-accent">Start practising →</span>
          </Link>
          {!STATIC_SITE && (
          <Link href="/connect/ask" className="card-link block h-full">
            <p className="eyebrow">Senior connect</p>
            <h2 className="mt-1 h2">Ask students who are already there</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              Answers come only from students signed in with a German public-university email, shown with a verified badge. Posts with phone numbers, payment
              requests or private-chat links wait for a moderator.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-accent">Ask a question →</span>
          </Link>
          )}
        </div>
      </Reveal>
    </div>
  );
}

function HeroStat({ children, label, small }: { children: React.ReactNode; label: string; small?: boolean }) {
  return (
    <div>
      <dd className={`${small ? "pt-1.5 text-sm" : "text-2xl sm:text-3xl"} font-semibold tabular-nums`}>{children}</dd>
      <dt className="text-[11px] text-on-ink/60">{label}</dt>
    </div>
  );
}
