"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { GermanyMapData } from "@/lib/mapdata";
import { GermanyMap } from "@/components/GermanyMap";
import { matcher } from "@/lib/search";

type C = { slug: string; city: string; courses: number; groceries: number; restaurants: number; worship: number };

export function CityIndex({ cities, map }: { cities: C[]; map: GermanyMapData | null }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const list = useMemo(() => {
    const matches = matcher(q); // "Munich", "munchen" and "München" all work
    return cities.filter((c) => matches(c.city));
  }, [cities, q]);
  const mapData = map ? { ...map, cities: map.cities.filter((c) => cities.some((x) => x.city === c.city)) } : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      {mapData && (
        <div className="lg:sticky lg:top-20 lg:self-start">
          <GermanyMap
            map={mapData}
            className="mx-auto max-w-sm"
            onSelect={(city) => {
              const c = city && cities.find((x) => x.city === city);
              if (c) router.push(`/cities/${c.slug}`);
            }}
          />
        </div>
      )}
      <div>
        <input className="input" type="search" placeholder="Search a city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cities" />
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.slug}>
              <Link href={`/cities/${c.slug}`} className="card-link block p-3">
                <p className="font-semibold">{c.city}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {c.courses} course{c.courses === 1 ? "" : "s"} · {c.groceries} Indian/Asian groceries · {c.restaurants} Indian restaurants
                  {c.worship ? ` · ${c.worship} temple/gurdwara` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="mt-3 text-sm text-muted">No city found. City guides are available for cities with public-university Master&apos;s programmes.</p>}
      </div>
    </div>
  );
}
