"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StarRating from "@/components/StarRating";
import { createClient } from "@/lib/supabase/client";
import type { ReviewInsert } from "@/types/database";

interface ReviewFormProps {
  buildingId: string;
  userId: string;
}

interface FormState {
  overall_rating: number;
  noise_rating: number;
  management_rating: number;
  safety_rating: number;
  value_rating: number;
  content: string;
  unit_number: string;
  tenancy_start: string;
  tenancy_end: string;
  is_current_tenant: boolean;
  is_anonymous: boolean;
}

const INITIAL_STATE: FormState = {
  overall_rating: 0,
  noise_rating: 0,
  management_rating: 0,
  safety_rating: 0,
  value_rating: 0,
  content: "",
  unit_number: "",
  tenancy_start: "",
  tenancy_end: "",
  is_current_tenant: false,
  is_anonymous: false,
};

const SUB_RATINGS: { key: keyof FormState; label: string; description: string }[] = [
  { key: "noise_rating", label: "Noise", description: "Street noise, neighbors, construction" },
  { key: "management_rating", label: "Management", description: "Responsiveness, maintenance, professionalism" },
  { key: "safety_rating", label: "Safety", description: "Locks, lighting, neighborhood security" },
  { key: "value_rating", label: "Value", description: "Rent vs. quality and amenities" },
];

export default function ReviewForm({ buildingId, userId }: ReviewFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_CONTENT_LENGTH = 50;
  const remaining = MIN_CONTENT_LENGTH - form.content.length;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.overall_rating === 0) {
      setError("Please select an overall rating.");
      return;
    }
    if (form.content.length < MIN_CONTENT_LENGTH) {
      setError(`Your review must be at least ${MIN_CONTENT_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const payload: ReviewInsert = {
      building_id: buildingId,
      user_id: userId,
      overall_rating: form.overall_rating,
      noise_rating: form.noise_rating || null,
      management_rating: form.management_rating || null,
      safety_rating: form.safety_rating || null,
      value_rating: form.value_rating || null,
      content: form.content,
      unit_number: form.unit_number || null,
      tenancy_start: form.tenancy_start ? `${form.tenancy_start}-01` : null,
      tenancy_end: form.is_current_tenant ? null : form.tenancy_end ? `${form.tenancy_end}-01` : null,
      is_current_tenant: form.is_current_tenant,
      is_anonymous: form.is_anonymous,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from("reviews") as any).insert(payload);

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      router.push(`/buildings/${buildingId}?review_submitted=1`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Overall rating */}
      <section>
        <label className="block font-semibold text-stone-900 mb-2">
          Overall rating <span className="text-red-500">*</span>
        </label>
        <StarRating
          value={form.overall_rating}
          onChange={(v) => setField("overall_rating", v)}
          size="lg"
        />
      </section>

      {/* Sub-ratings */}
      <section>
        <p className="font-semibold text-stone-900 mb-4">Category ratings (optional)</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {SUB_RATINGS.map(({ key, label, description }) => (
            <div key={key} className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <p className="font-medium text-stone-800 text-sm">{label}</p>
              <p className="text-xs text-stone-400 mb-2">{description}</p>
              <StarRating
                value={form[key] as number}
                onChange={(v) => setField(key, v)}
                size="md"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Written review */}
      <section>
        <label htmlFor="content" className="block font-semibold text-stone-900 mb-2">
          Your review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          value={form.content}
          onChange={(e) => setField("content", e.target.value)}
          rows={6}
          placeholder="Describe your experience living here. What was the building like? How was management? Any issues with neighbors, maintenance, or safety?"
          className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y"
        />
        <p className={`text-xs mt-1.5 ${remaining > 0 ? "text-stone-400" : "text-green-600"}`}>
          {remaining > 0
            ? `${remaining} more character${remaining !== 1 ? "s" : ""} required`
            : "Minimum length met"}
        </p>
      </section>

      {/* Tenancy details */}
      <section>
        <p className="font-semibold text-stone-900 mb-4">Tenancy details (optional)</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="unit" className="block text-sm text-stone-600 mb-1">
              Unit number
            </label>
            <input
              id="unit"
              type="text"
              value={form.unit_number}
              onChange={(e) => setField("unit_number", e.target.value)}
              placeholder="e.g. 4B"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="start" className="block text-sm text-stone-600 mb-1">
              Move-in date
            </label>
            <input
              id="start"
              type="month"
              value={form.tenancy_start}
              onChange={(e) => setField("tenancy_start", e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {!form.is_current_tenant && (
            <div>
              <label htmlFor="end" className="block text-sm text-stone-600 mb-1">
                Move-out date
              </label>
              <input
                id="end"
                type="month"
                value={form.tenancy_end}
                onChange={(e) => setField("tenancy_end", e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_current_tenant}
              onChange={(e) => setField("is_current_tenant", e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-stone-700">I currently live here</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_anonymous}
              onChange={(e) => setField("is_anonymous", e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-stone-700">Post anonymously</span>
          </label>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>

      <p className="text-xs text-stone-400 text-center">
        By submitting you agree to our community guidelines. Reviews are public.
      </p>
    </form>
  );
}
