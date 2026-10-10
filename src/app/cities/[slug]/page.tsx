import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cityGuidesBuiltAt, cityStudy, getCityGuide, getCityGuides, type Poi } from "@/lib/cityguides";
import { dataBuiltAt } from "@/lib/programmes";
import { SourceNote } from "@/components/SourceNote";
import { AnimatedNumber, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Icon } from "@/components/Icon";
import { CityMap, type MapPoint } from "../CityMap";

export function generateStaticParams() {
  return getCityGuides().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cities/[slug]">): Promise<Metadata> {
  const g = getCityGuide((await params).slug);
  return g ? { title: `Living in ${g.city}` } : {};
}

export default function CityPage({ params }: PageProps<"/cities/[slug]">) {
  return (
    <Suspense fallback={<div className="card h-64 animate-pulse" />}>
      <City params={params} />
    </Suspense>
  );
}

const OSM_SOURCE = { name: "© OpenStreetMap contributors (ODbL)", url: "https://www.openstreetmap.org/copyright" };

async function City({ params }: { params: PageProps<"/cities/[slug]">["params"] }) {
  const g = getCityGuide((await params).slug);
  if (!g) notFound();
  const study = cityStudy(g.city);
  const points: MapPoint[] = [
    ...g.groceries.map((p) => ({ ...p, kind: "grocery" as const })),
    ...g.restaurants.map((p) => ({ ...p, kind: "restaurant" as const })),
    ...g.worship.map((p) => ({ ...p, kind: "worship" as const })),
    ...g.supermarkets.nearest.map((p) => ({ ...p, kind: "supermarket" as const })),
    ...g.hospitals.map((p) => ({ ...p, kind: "hospital" as const })),
    ...(g.station ? [{ ...g.station, kind: "station" as const }] : []),
  ];
  const tiles = [
    { label: "Master's courses", value: study.programmes, href: `/programmes?city=${encodeURIComponent(g.city)}` },
    { label: "Supermarkets within 4 km", value: g.supermarkets.total },
    { label: "Indian / Asian groceries", value: g.groceries.length },
    { label: "Indian restaurants", value: g.restaurants.length },
    { label: "Pharmacies within 3 km", value: g.pharmacies },
    { label: "Temples & gurdwaras", value: g.worship.length },
  ];

  return (
    <article className="space-y-6">
      <Link href="/cities" className="text-sm text-muted hover:text-text">
        ← All cities
      </Link>
      <Reveal>
        <p className="eyebrow">City guide</p>
        <h1 className="h1">{g.city}</h1>
        <p className="mt-2 text-muted">
          Everyday places around the city centre for a student arriving from India — from OpenStreetMap, plus what the universities themselves say about
          living here.
        </p>
      </Reveal>

      <Stagger className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <StaggerItem key={t.label}>
            {t.href ? (
              <Link href={t.href} className="card-link block p-3">
                <p className="text-2xl font-semibold tabular-nums">
                  <AnimatedNumber value={t.value} />
                </p>
                <p className="text-xs text-muted">{t.label} →</p>
              </Link>
            ) : (
              <div className="card p-3">
                <p className="text-2xl font-semibold tabular-nums">
                  <AnimatedNumber value={t.value} />
                </p>
                <p className="text-xs text-muted">{t.label}</p>
              </div>
            )}
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <CityMap center={{ lat: g.lat, lon: g.lon }} points={points} />
          {g.station && (
            <p className="mt-2 text-center text-sm text-muted">
              Main station: <strong className="text-text">{g.station.name}</strong> ({g.station.km} km from the centre)
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <PoiSection
            title="Indian & Asian groceries"
            note="Found by their names in OpenStreetMap (e.g. 'India', 'Asia', 'Spice', 'Bazaar'). Check opening hours and what they stock before you go."
            items={g.groceries}
            empty="None found by name near the centre — look for Asian supermarkets in the next bigger city, or online shops."
          />
          <Reveal>
            <section>
              <h2 className="h2">Supermarkets</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(g.supermarkets.brands)
                  .sort((a, b) => b[1] - a[1])
                  .map(([b, n]) => (
                    <span key={b} className="chip">
                      {b} × {n}
                    </span>
                  ))}
              </div>
              <p className="mt-2 text-sm text-muted">
                {g.supermarkets.total} supermarkets within 4 km of the centre, by chain.
              </p>
            </section>
          </Reveal>
          <PoiSection title="Indian restaurants" items={g.restaurants} empty="None tagged as Indian near the centre." />
          <PoiSection title="Hindu temples & gurdwaras" items={g.worship} empty="None found within 15 km." showDetail />
          <PoiSection title="Hospitals" note="In an emergency call 112 (ambulance, fire) — free, 24/7." items={g.hospitals} empty="None found within 6 km." />
          <SourceNote links={[OSM_SOURCE]} checkedOn={cityGuidesBuiltAt()} reviewDays={90} />
        </div>
      </div>

      {study.universities.length > 0 && (
        <section className="space-y-3">
          <h2 className="h2">Public universities in {g.city}</h2>
          {study.universities.map((u) => (
            <Reveal key={u.name}>
              <div className="card space-y-2 text-[15px]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{u.name}</p>
                  <span className="text-sm text-muted">
                    {u.count} course{u.count === 1 ? "" : "s"}
                    {u.buddy ? " · buddy programme" : ""}
                  </span>
                </div>
                {u.living && (
                  <p>
                    <span className="text-xs font-medium tracking-wide text-muted uppercase">Living costs (university&apos;s estimate) </span>
                    <span className="block">{u.living}</span>
                  </p>
                )}
                {u.accommodation && (
                  <details>
                    <summary className="cursor-pointer text-sm text-accent">Accommodation (university&apos;s description)</summary>
                    <p className="prose-text mt-1 text-sm">{u.accommodation}</p>
                  </details>
                )}
              </div>
            </Reveal>
          ))}
          <SourceNote sources={["daad"]} checkedOn={dataBuiltAt()} reviewDays={30} />
          <div className="flex flex-wrap gap-2">
            <Link href={`/programmes?city=${encodeURIComponent(g.city)}`} className="btn-primary">
              Courses in {g.city} →
            </Link>
            <Link href="/germany/housing" className="btn-ghost">
              Check a flat listing for scams
            </Link>
          </div>
        </section>
      )}
    </article>
  );
}

function PoiSection({ title, note, items, empty, showDetail }: { title: string; note?: string; items: Poi[]; empty: string; showDetail?: boolean }) {
  return (
    <Reveal>
      <section>
        <h2 className="h2">{title}</h2>
        {note && <p className="mt-1 text-xs text-muted">{note}</p>}
        {items.length ? (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface">
            {items.map((p) => (
              <li key={p.osm} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  {showDetail && p.detail && <span className="block text-xs text-muted">{p.detail}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  {p.km} km
                  <a href={p.osm} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} on OpenStreetMap`} className="text-accent">
                    <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{empty}</p>
        )}
      </section>
    </Reveal>
  );
}
