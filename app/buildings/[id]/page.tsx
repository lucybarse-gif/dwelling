import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StarRating from "@/components/StarRating";
import type { BuildingWithStats, Review } from "@/types/database";

interface RatingRowProps {
  label: string;
  value: number | null;
}

function RatingRow({ label, value }: RatingRowProps) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-600">{label}</span>
      <div className="flex items-center gap-2">
        <StarRating value={value} readonly size="sm" />
        <span className="text-sm font-medium text-stone-700 w-4">{value}</span>
      </div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string | number | null | undefined;
}

function StatItem({ label, value }: StatItemProps) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-stone-400 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-stone-800 mt-0.5">{value}</p>
    </div>
  );
}

type ReviewWithProfile = Review & { profiles: { display_name: string | null } | null };

function ReviewCard({ review }: { review: ReviewWithProfile }) {
  const displayName = review.is_anonymous
    ? "Anonymous"
    : review.profiles?.display_name ?? "Resident";

  const tenancyLabel = review.is_current_tenant
    ? "Current tenant"
    : review.tenancy_end
    ? `Former tenant, left ${new Date(review.tenancy_end).getFullYear()}`
    : "Former tenant";

  return (
    <div className="border border-stone-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-medium text-stone-900 text-sm">{displayName}</p>
          <p className="text-xs text-stone-400 mt-0.5">{tenancyLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StarRating value={review.overall_rating} readonly size="sm" />
          <p className="text-xs text-stone-400">
            {new Date(review.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <p className="text-sm text-stone-700 leading-relaxed">{review.content}</p>

      {/* Sub-ratings */}
      {(review.noise_rating || review.management_rating || review.safety_rating || review.value_rating) && (
        <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-2">
          <RatingRow label="Noise" value={review.noise_rating} />
          <RatingRow label="Management" value={review.management_rating} />
          <RatingRow label="Safety" value={review.safety_rating} />
          <RatingRow label="Value" value={review.value_rating} />
        </div>
      )}
    </div>
  );
}

export default async function BuildingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [buildingResult, reviewsResult] = await Promise.all([
    supabase.from("buildings_with_stats").select("*").eq("id", id).single(),
    (supabase as any)
      .from("reviews")
      .select("*")
      .eq("building_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const building = buildingResult.data as BuildingWithStats | null;
  const rawReviews = (reviewsResult.data ?? []) as Review[];

  // Fetch display names for non-anonymous reviews
  const userIds = [...new Set(rawReviews.filter((r) => !r.is_anonymous).map((r) => r.user_id))];
  let profileMap: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: profileRows } = await (supabase as any)
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds) as { data: { id: string; display_name: string | null }[] | null };
    if (profileRows) {
      profileMap = Object.fromEntries(profileRows.map((p) => [p.id, p.display_name]));
    }
  }

  const reviews: ReviewWithProfile[] = rawReviews.map((r) => ({
    ...r,
    profiles: r.is_anonymous ? null : { display_name: profileMap[r.user_id] ?? null },
  }));

  if (!building) notFound();

  const avgRating = building.avg_overall_rating;
  const reviewCount = building.review_count ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Back nav */}
      <Link
        href="/buildings"
        className="text-sm text-stone-500 hover:text-stone-700 mb-6 inline-block"
      >
        ← Back to search
      </Link>

      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{building.address}</h1>
            <p className="text-stone-500 mt-1">
              {building.neighborhood ? `${building.neighborhood}, ` : ""}
              {building.borough}, NY {building.zip_code}
            </p>

            {/* Rating summary */}
            {avgRating && reviewCount > 0 ? (
              <div className="flex items-center gap-3 mt-3">
                <StarRating value={Math.round(avgRating)} readonly size="md" />
                <span className="text-2xl font-bold text-stone-800">
                  {Number(avgRating).toFixed(1)}
                </span>
                <span className="text-sm text-stone-400">
                  {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                </span>
              </div>
            ) : (
              <p className="text-sm text-stone-400 mt-3 italic">No reviews yet</p>
            )}
          </div>

          <Link
            href={`/buildings/${id}/review`}
            className="shrink-0 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors text-center"
          >
            Write a review
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Building details sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h2 className="font-semibold text-stone-900 mb-4">Building info</h2>
            <div className="space-y-4">
              <StatItem label="Borough-Block-Lot (BBL)" value={building.bbl} />
              <StatItem label="Units" value={building.units_total} />
              <StatItem label="Year built" value={building.year_built} />
              <StatItem label="Building class" value={building.building_class} />
              <StatItem label="Land use" value={building.land_use} />
              <StatItem label="Neighborhood" value={building.neighborhood} />
            </div>
          </div>

          {/* Rating breakdown */}
          {reviewCount > 0 && reviews && reviews.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <h2 className="font-semibold text-stone-900 mb-4">Avg. ratings</h2>
              <div className="space-y-3">
                {(() => {
                  const avg = (key: keyof Review) => {
                    const vals = reviews
                      .map((r) => r[key] as number | null)
                      .filter((v): v is number => v !== null);
                    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                  };
                  return (
                    <>
                      <RatingRow label="Noise" value={avg("noise_rating")} />
                      <RatingRow label="Management" value={avg("management_rating")} />
                      <RatingRow label="Safety" value={avg("safety_rating")} />
                      <RatingRow label="Value" value={avg("value_rating")} />
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-800">
            <p className="font-medium mb-1">Data source</p>
            <p className="text-xs leading-relaxed text-brand-700">
              Building info sourced from NYC PLUTO (Dept. of City Planning).
              BBL: {building.bbl}
            </p>
          </div>
        </aside>

        {/* Reviews */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900 text-lg">
              Tenant reviews {reviewCount > 0 && `(${reviewCount})`}
            </h2>
            <Link
              href={`/buildings/${id}/review`}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              + Add yours
            </Link>
          </div>

          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-stone-300 rounded-xl p-10 text-center text-stone-400">
              <p className="text-3xl mb-3">✍️</p>
              <p className="font-medium text-stone-600">No reviews yet</p>
              <p className="text-sm mt-1 mb-5">Be the first to review this building.</p>
              <Link
                href={`/buildings/${id}/review`}
                className="inline-block bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Write the first review
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
