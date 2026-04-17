"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBuilding } from "./actions";
import type { GeoBuilding } from "./actions";

interface Props {
  geocoded: GeoBuilding;
  originalQuery: string;
}

export default function AddBuildingConfirm({ geocoded, originalQuery }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setLoading(true);
    setError(null);
    const result = await addBuilding(geocoded);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.id) {
      router.push(`/buildings/${result.id}`);
    }
  }

  return (
    <div>
      {/* Verified address card */}
      <div className="border border-green-200 bg-green-50/40 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            ✓
          </span>
          <p className="text-sm text-green-700 font-medium">
            Address verified by NYC GeoClient
          </p>
        </div>

        {originalQuery.toLowerCase() !== geocoded.address.toLowerCase() && (
          <p className="text-xs text-stone-400 mb-4">
            Your search &ldquo;{originalQuery}&rdquo; matched:
          </p>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">Address</p>
            <p className="font-semibold text-stone-900 mt-0.5 text-lg">{geocoded.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Borough</p>
              <p className="font-medium text-stone-800 mt-0.5">{geocoded.borough}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">ZIP Code</p>
              <p className="font-medium text-stone-800 mt-0.5">{geocoded.zip_code}</p>
            </div>
            {geocoded.neighborhood && (
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide">Neighborhood</p>
                <p className="font-medium text-stone-800 mt-0.5">{geocoded.neighborhood}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">BBL</p>
              <p className="font-medium text-stone-800 mt-0.5 font-mono text-sm">{geocoded.bbl}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      <button
        onClick={handleAdd}
        disabled={loading}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Adding building…" : "Add this building to Dwelling"}
      </button>
      <p className="text-xs text-stone-400 mt-3 text-center">
        Building data is sourced from NYC&rsquo;s official GeoClient API.
      </p>
    </div>
  );
}
