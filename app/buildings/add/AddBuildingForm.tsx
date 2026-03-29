"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

interface Props {
  defaultAddress?: string;
}

export default function AddBuildingForm({ defaultAddress = "" }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    address: defaultAddress.replace(/,?\s*(new york|ny|nyc).*/gi, "").trim(),
    borough: "",
    zip_code: "",
    neighborhood: "",
    units_total: "",
    year_built: "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.address.trim()) return setError("Address is required.");
    if (!form.borough) return setError("Borough is required.");
    if (!form.zip_code.trim()) return setError("ZIP code is required.");

    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      address: form.address.trim().toUpperCase(),
      borough: form.borough,
      zip_code: form.zip_code.trim(),
      neighborhood: form.neighborhood.trim() || null,
      units_total: form.units_total ? parseInt(form.units_total) : null,
      year_built: form.year_built ? parseInt(form.year_built) : null,
    };

    const { data, error: insertError } = await (supabase.from("buildings") as any)
      .insert(payload)
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      router.push(`/buildings/${data.id}?building_added=1`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Street address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setField("address", e.target.value)}
          placeholder="e.g. 285 MOTT STREET"
          className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Borough + ZIP */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Borough <span className="text-red-500">*</span>
          </label>
          <select
            value={form.borough}
            onChange={(e) => setField("borough", e.target.value)}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
          >
            <option value="">Select borough…</option>
            {BOROUGHS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            ZIP code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.zip_code}
            onChange={(e) => setField("zip_code", e.target.value)}
            placeholder="e.g. 10012"
            maxLength={5}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Neighborhood */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Neighborhood <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.neighborhood}
          onChange={(e) => setField("neighborhood", e.target.value)}
          placeholder="e.g. NoLita"
          className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Units + Year built */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Number of units <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            value={form.units_total}
            onChange={(e) => setField("units_total", e.target.value)}
            placeholder="e.g. 24"
            min={1}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Year built <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            value={form.year_built}
            onChange={(e) => setField("year_built", e.target.value)}
            placeholder="e.g. 1920"
            min={1800}
            max={new Date().getFullYear()}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Adding building…" : "Add building"}
      </button>

      <p className="text-xs text-stone-400 text-center">
        Once added, you'll be taken directly to the building page to write a review.
      </p>
    </form>
  );
}
