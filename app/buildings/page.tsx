import { createClient } from "@/lib/supabase/server";
import BuildingCard from "@/components/BuildingCard";
import SearchBar from "@/components/SearchBar";
import type { BuildingWithStats } from "@/types/database";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const NEIGHBORHOOD_BOROUGHS = new Set(["Manhattan", "Brooklyn"]);

interface SearchParams {
  q?: string;
  borough?: string;
  neighborhood?: string;
  page?: string;
}

const PAGE_SIZE = 20;

function buildHref(params: {
  q?: string;
  borough?: string;
  neighborhood?: string;
  page?: number;
}) {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.borough) p.set("borough", params.borough);
  if (params.neighborhood) p.set("neighborhood", params.neighborhood);
  if (params.page && params.page > 1) p.set("page", String(params.page));
  const s = p.toString();
  return `/buildings${s ? `?${s}` : ""}`;
}

export default async function BuildingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, borough, neighborhood, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Normalize search query: strip city/state and punctuation, expand abbreviations to full words
  const normalizedQ = q
    ? q
        .replace(/,?\s*(new york city|new york|nyc|ny)\s*$/gi, "")
        .replace(/\bst\b/gi, "street")
        .replace(/\bave\b/gi, "avenue")
        .replace(/\bblvd\b/gi, "boulevard")
        .replace(/\bdr\b/gi, "drive")
        .replace(/\brd\b/gi, "road")
        .replace(/\bpl\b/gi, "place")
        .replace(/\bct\b/gi, "court")
        .replace(/\bln\b/gi, "lane")
        .replace(/\bpkwy\b/gi, "parkway")
        .replace(/[,#]/g, "")
        .trim()
    : undefined;

  // Fetch distinct neighborhoods via RPC (avoids default 1000-row limit)
  let neighborhoods: string[] = [];
  if (borough && NEIGHBORHOOD_BOROUGHS.has(borough)) {
    const { data: nRows } = await (supabase as any).rpc("get_neighborhoods", {
      p_borough: borough,
    }) as { data: { neighborhood: string }[] | null };

    if (nRows) {
      neighborhoods = nRows.map((r) => r.neighborhood);
    }
  }

  let buildings: BuildingWithStats[] | null = null;
  let count: number | null = null;

  if (normalizedQ) {
    console.log("Searching for:", normalizedQ, "borough:", borough, "neighborhood:", neighborhood);
    // Use a DB function to avoid PostgREST URL-encoding issues with % wildcards
    const { data: searchRows, error: searchError } = await (supabase as any).rpc("search_buildings", {
      query_text: normalizedQ,
      p_borough: borough ?? null,
      p_neighborhood: neighborhood ?? null,
      p_limit: PAGE_SIZE,
      p_offset: offset,
    }) as { data: BuildingWithStats[] | null; error: any };

    if (searchError) console.error("search_buildings RPC error:", JSON.stringify(searchError));
    // Temporarily expose error in UI for debugging
    if (searchError) return <pre style={{padding:20,color:'red'}}>{JSON.stringify(searchError, null, 2)}</pre>;
    buildings = searchRows ?? [];

    // Get total count separately
    const { data: countRow } = await (supabase as any).rpc("count_buildings_search", {
      query_text: normalizedQ,
      p_borough: borough ?? null,
      p_neighborhood: neighborhood ?? null,
    }) as { data: number | null };
    count = countRow ?? buildings.length;
  } else {
    // No search — query the view directly with filters (no timeout risk on small result sets)
    let query = (supabase as any)
      .from("buildings_with_stats")
      .select("*", { count: "exact" })
      .range(offset, offset + PAGE_SIZE - 1)
      .order("review_count", { ascending: false });

    if (borough) query = query.eq("borough", borough);
    if (neighborhood) query = query.eq("neighborhood", neighborhood);

    const result = await query as { data: BuildingWithStats[] | null; count: number | null };
    buildings = result.data;
    count = result.count;
  }

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  const title = neighborhood
    ? `${neighborhood}, ${borough}`
    : q
    ? `Results for "${q}"`
    : borough
    ? `${borough} buildings`
    : "Browse NYC buildings";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">{title}</h1>

      {/* Search bar */}
      <div className="mb-5">
        <SearchBar defaultValue={q ?? ""} />
      </div>

      {/* Borough filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <a
          href="/buildings"
          className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
            !borough
              ? "bg-brand-600 text-white border-brand-600"
              : "border-stone-300 text-stone-600 hover:border-stone-400"
          }`}
        >
          All boroughs
        </a>
        {BOROUGHS.map((b) => (
          <a
            key={b}
            href={buildHref({ q, borough: b })}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
              borough === b
                ? "bg-brand-600 text-white border-brand-600"
                : "border-stone-300 text-stone-600 hover:border-stone-400"
            }`}
          >
            {b}
          </a>
        ))}
      </div>

      {/* Neighborhood filters — Manhattan & Brooklyn only */}
      {borough && NEIGHBORHOOD_BOROUGHS.has(borough) && neighborhoods.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
            Neighborhood
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={buildHref({ q, borough })}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                !neighborhood
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:border-stone-400"
              }`}
            >
              All
            </a>
            {neighborhoods.map((n) => (
              <a
                key={n}
                href={buildHref({ q, borough, neighborhood: n })}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  neighborhood === n
                    ? "bg-stone-800 text-white border-stone-800"
                    : "border-stone-300 text-stone-600 hover:border-stone-400"
                }`}
              >
                {n}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Result count */}
      {count !== null && (
        <p className="text-sm text-stone-500 mb-5">
          {count.toLocaleString()} building{count !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Building grid */}
      {buildings && buildings.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            {buildings.map((building) => (
              <BuildingCard key={building.id} building={building as BuildingWithStats} />
            ))}
          </div>
          {/* Add building prompt shown after results when searching */}
          {q && (
            <div className="mt-8 border border-dashed border-stone-300 rounded-xl p-6 text-center">
              <p className="text-sm text-stone-500">Don't see your building?</p>
              <a
                href={`/buildings/add${q ? `?address=${encodeURIComponent(q)}` : ""}`}
                className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                + Add it to Dwelling
              </a>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-4">⌂</p>
          <p className="font-medium text-stone-600">No buildings found</p>
          <p className="text-sm mt-1 mb-6">Try a different search term or filter.</p>
          {q && (
            <a
              href={`/buildings/add?address=${encodeURIComponent(q)}`}
              className="inline-block bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              + Add your building
            </a>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {page > 1 && (
            <a
              href={buildHref({ q, borough, neighborhood, page: page - 1 })}
              className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:border-stone-400 transition-colors"
            >
              ← Previous
            </a>
          )}
          <span className="px-4 py-2 text-sm text-stone-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={buildHref({ q, borough, neighborhood, page: page + 1 })}
              className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:border-stone-400 transition-colors"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
