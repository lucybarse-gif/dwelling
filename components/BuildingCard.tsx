import Link from "next/link";
import StarRating from "./StarRating";
import type { BuildingWithStats } from "@/types/database";

interface BuildingCardProps {
  building: BuildingWithStats;
}

export default function BuildingCard({ building }: BuildingCardProps) {
  const rating = building.avg_overall_rating ?? 0;
  const reviewCount = building.review_count ?? 0;

  return (
    <Link
      href={`/buildings/${building.id}`}
      className="block bg-white border border-stone-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-md transition-all"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-stone-900 truncate">{building.address}</p>
          <p className="text-sm text-stone-500 mt-0.5">
            {building.neighborhood ? `${building.neighborhood}, ` : ""}
            {building.borough}
            {building.zip_code ? ` ${building.zip_code}` : ""}
          </p>
        </div>
        {reviewCount > 0 && (
          <div className="flex flex-col items-end shrink-0">
            <StarRating value={Math.round(rating)} readonly size="sm" />
            <p className="text-xs text-stone-400 mt-0.5">
              {reviewCount} review{reviewCount !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {building.units_total && (
          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-md">
            {building.units_total} units
          </span>
        )}
        {building.year_built && (
          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-md">
            Built {building.year_built}
          </span>
        )}
        {building.building_class && (
          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-md">
            Class {building.building_class}
          </span>
        )}
        {reviewCount === 0 && (
          <span className="text-xs text-stone-400 italic">No reviews yet</span>
        )}
      </div>
    </Link>
  );
}
