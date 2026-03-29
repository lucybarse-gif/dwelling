import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { createClient } from "@/lib/supabase/server";
import type { BuildingWithStats } from "@/types/database";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Find your building",
    description:
      "Search by address, neighborhood, or ZIP code to find your NYC building in our PLUTO-sourced database.",
  },
  {
    step: "2",
    title: "Read honest reviews",
    description:
      "Browse real experiences from tenants on noise, management, safety, and overall value.",
  },
  {
    step: "3",
    title: "Share your experience",
    description:
      "Help future renters by writing a verified review for your current or past apartment.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch recently reviewed buildings for the homepage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: featuredBuildings } = (await (supabase as any)
    .from("buildings_with_stats")
    .select("*")
    .gt("review_count", 0)
    .order("review_count", { ascending: false })
    .limit(4)) as { data: BuildingWithStats[] | null };

  // Totals for social proof
  const { count: buildingCount } = await supabase
    .from("buildings")
    .select("*", { count: "exact", head: true });

  const { count: reviewCount } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-stone-900 via-stone-800 to-brand-900 text-white py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Find your next NYC home with confidence
          </h1>
          <p className="text-stone-300 text-lg mb-10 max-w-xl mx-auto">
            Real reviews from real tenants. Search{" "}
            {buildingCount?.toLocaleString() ?? "thousands of"} NYC buildings and make
            the move that&rsquo;s right for you.
          </p>
          <SearchBar className="max-w-2xl mx-auto" />

          {/* Quick borough filters */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {BOROUGHS.map((borough) => (
              <Link
                key={borough}
                href={`/buildings?borough=${encodeURIComponent(borough)}`}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors"
              >
                {borough}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-brand-600 text-white py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center">
          <div>
            <span className="text-2xl font-bold">{buildingCount?.toLocaleString() ?? "—"}</span>
            <span className="text-brand-100 text-sm ml-2">buildings indexed</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-brand-400" />
          <div>
            <span className="text-2xl font-bold">{reviewCount?.toLocaleString() ?? "0"}</span>
            <span className="text-brand-100 text-sm ml-2">tenant reviews</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-brand-400" />
          <div>
            <span className="text-2xl font-bold">5</span>
            <span className="text-brand-100 text-sm ml-2">NYC boroughs</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl font-bold text-stone-900 text-center mb-12">
          How Dwelling works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ step, title, description }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-stone-900 mb-2">{title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured buildings */}
      {featuredBuildings && featuredBuildings.length > 0 && (
        <section className="bg-white border-t border-stone-200 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Recently reviewed</h2>
              <Link
                href="/buildings"
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredBuildings.map((building) => (
                <Link
                  key={building.id}
                  href={`/buildings/${building.id}`}
                  className="block border border-stone-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <p className="font-medium text-stone-900 text-sm truncate">{building.address}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {building.neighborhood ?? building.borough}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-brand-400 text-sm">★</span>
                    <span className="text-sm font-medium text-stone-700">
                      {building.avg_overall_rating?.toFixed(1)}
                    </span>
                    <span className="text-xs text-stone-400">
                      ({building.review_count} review{building.review_count !== 1 ? "s" : ""})
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-stone-900 mb-3">
          Lived in an NYC apartment? Share your story.
        </h2>
        <p className="text-stone-500 text-sm mb-6 max-w-lg mx-auto">
          Your review helps thousands of New Yorkers find a place they&rsquo;ll love.
          Takes less than 5 minutes.
        </p>
        <Link
          href="/auth/signup"
          className="inline-block bg-brand-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors"
        >
          Write a review
        </Link>
      </section>
    </div>
  );
}
