import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddBuildingConfirm from "./AddBuildingConfirm";
import AddBuildingForm from "./AddBuildingForm";
import type { GeoBuilding } from "./actions";

const BOROUGH_CODE_MAP: Record<string, string> = {
  "1": "Manhattan",
  "2": "Bronx",
  "3": "Brooklyn",
  "4": "Queens",
  "5": "Staten Island",
};

function parseAddress(raw: string): { houseNumber: string; street: string } | null {
  const cleaned = raw
    .replace(/,?\s*(new york city|new york|nyc|ny)\s*$/gi, "")
    .replace(/[,#]/g, "")
    .trim();
  const match = cleaned.match(/^(\d+[-\d]*[a-zA-Z]?)\s+(.+)$/);
  if (!match) return null;
  return { houseNumber: match[1], street: match[2] };
}

async function geocodeAddress(
  address: string,
  borough?: string
): Promise<GeoBuilding | null> {
  const key = process.env.NYC_GEOCLIENT_KEY;
  if (!key) return null;

  const parsed = parseAddress(address);
  if (!parsed) return null;

  const params = new URLSearchParams({
    houseNumber: parsed.houseNumber,
    street: parsed.street,
    ...(borough ? { borough } : {}),
    subscriptionKey: key,
  });

  try {
    const res = await fetch(
      `https://api.nyc.gov/geoclient/v2/address.json?${params}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const a = data?.address;
    if (!a || a.geosupportReturnCode !== "00") return null;

    return {
      bbl: a.bbl,
      address: `${a.houseNumberIn} ${a.firstStreetNameNormalized}`,
      borough: BOROUGH_CODE_MAP[a.bblBoroughCode] ?? borough ?? "Manhattan",
      zip_code: a.zipCode ?? "",
      neighborhood: a.ntaName ?? null,
      latitude: a.latitude != null ? parseFloat(a.latitude) : null,
      longitude: a.longitude != null ? parseFloat(a.longitude) : null,
    };
  } catch {
    return null;
  }
}

export default async function AddBuildingPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string; borough?: string }>;
}) {
  const { address, borough } = await searchParams;

  // Require auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/buildings/add${address ? `?address=${encodeURIComponent(address)}` : ""}`;
    redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  }

  // Try GeoClient if we have an address
  const geocoded = address ? await geocodeAddress(address, borough) : null;

  // If BBL matched something already in our DB, redirect straight there
  if (geocoded) {
    const { data: existing } = await (supabase as any)
      .from("buildings")
      .select("id")
      .eq("bbl", geocoded.bbl)
      .maybeSingle() as { data: { id: string } | null };

    if (existing) {
      redirect(`/buildings/${existing.id}`);
    }
  }

  const geoclientConfigured = !!process.env.NYC_GEOCLIENT_KEY;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href={address ? `/buildings?q=${encodeURIComponent(address)}` : "/buildings"}
        className="text-sm text-stone-500 hover:text-stone-700 mb-6 inline-block"
      >
        ← Back to search
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-2">Add your building</h1>
      <p className="text-stone-500 text-sm mb-8">
        Can&rsquo;t find your building? Add it to Dwelling so you and others can leave reviews.
      </p>

      {geocoded ? (
        /* GeoClient found the address — show verified confirm UI */
        <AddBuildingConfirm geocoded={geocoded} originalQuery={address ?? ""} />
      ) : geoclientConfigured && address ? (
        /* GeoClient configured but couldn't verify — offer manual fallback */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm">
            <p className="font-medium text-amber-800 mb-1">
              Couldn&rsquo;t auto-verify &ldquo;{address}&rdquo;
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              NYC&rsquo;s GeoClient database didn&rsquo;t recognise this address. You can still
              add the building manually below — make sure the address matches exactly
              (e.g. abbreviate &ldquo;Street&rdquo; as &ldquo;ST&rdquo;).
            </p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <AddBuildingForm defaultAddress={address} />
          </div>
        </div>
      ) : (
        /* No GeoClient or no address — show manual form */
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <AddBuildingForm defaultAddress={address ?? ""} />
        </div>
      )}
    </div>
  );
}
