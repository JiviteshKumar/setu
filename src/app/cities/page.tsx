import type { Metadata } from "next";
import { getCityGuides, cityGuidesBuiltAt } from "@/lib/cityguides";
import { getGermanyMap } from "@/lib/mapdata";
import { getProgrammes } from "@/lib/programmes";
import { PageHeader } from "@/components/PageHeader";
import { SourceNote } from "@/components/SourceNote";
import { CityIndex } from "./CityIndex";

export const metadata: Metadata = { title: "City guides" };

export default function CitiesPage() {
  const counts = new Map<string, number>();
  const totalCities = new Set(getProgrammes().filter((p) => !p.checks.some((c) => c.includes("not in Germany"))).map((p) => p.city)).size;
  for (const p of getProgrammes()) counts.set(p.city, (counts.get(p.city) ?? 0) + 1);
  const cities = getCityGuides()
    .map((c) => ({ slug: c.slug, city: c.city, courses: counts.get(c.city) ?? 0, groceries: c.groceries.length, restaurants: c.restaurants.length, worship: c.worship.length }))
    .sort((a, b) => b.courses - a.courses);
  return (
    <div>
      <PageHeader eyebrow="Before you choose" title={<>City guides</>}>
        Where to buy Indian groceries, eat, pray, and find a pharmacy or hospital — around the centre of every city with a public-university Master&apos;s
        programme. Tap a city on the map or search.
      </PageHeader>
      {cities.length < totalCities && (
        <p className="mb-4 rounded-xl bg-gold-soft p-3 text-sm text-warn">
          Guides are ready for {cities.length} of {totalCities} cities. The free OpenStreetMap servers are busy, so we add the rest gradually — more cities
          appear every week.
        </p>
      )}
      <CityIndex cities={cities} map={getGermanyMap()} />
      <SourceNote links={[{ name: "© OpenStreetMap contributors (ODbL)", url: "https://www.openstreetmap.org/copyright" }]} sources={["daad"]} checkedOn={cityGuidesBuiltAt()} reviewDays={90} />
    </div>
  );
}
