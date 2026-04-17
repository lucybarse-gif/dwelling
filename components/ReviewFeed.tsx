"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import StarRating from "@/components/StarRating";

export interface FeedReview {
  id: string;
  building_id: string;
  address: string;
  neighborhood: string | null;
  borough: string;
  overall_rating: number;
  content: string;
  display_name: string | null;
  is_anonymous: boolean;
  created_at: string;
}

interface ReviewFeedProps {
  initial: FeedReview[];
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ReviewFeed({ initial }: ReviewFeedProps) {
  const [reviews, setReviews] = useState<(FeedReview & { isNew?: boolean })[]>(initial);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("reviews-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        async (payload) => {
          const r = payload.new as any;

          const [buildingRes, profileRes] = await Promise.all([
            (supabase as any)
              .from("buildings")
              .select("id, address, neighborhood, borough")
              .eq("id", r.building_id)
              .single() as Promise<{ data: { id: string; address: string; neighborhood: string | null; borough: string } | null }>,
            r.is_anonymous
              ? Promise.resolve({ data: null })
              : (supabase as any)
                  .from("profiles")
                  .select("display_name")
                  .eq("id", r.user_id)
                  .single() as Promise<{ data: { display_name: string | null } | null }>,
          ]);

          if (!buildingRes.data) return;
          const b = buildingRes.data as any;
          const p = profileRes.data as any;

          const incoming: FeedReview & { isNew: boolean } = {
            id: r.id,
            building_id: r.building_id,
            address: b.address,
            neighborhood: b.neighborhood,
            borough: b.borough,
            overall_rating: r.overall_rating,
            content: r.content,
            display_name: r.is_anonymous ? null : p?.display_name ?? null,
            is_anonymous: r.is_anonymous,
            created_at: r.created_at,
            isNew: true,
          };

          setReviews((prev) => [incoming, ...prev.slice(0, 9)]);

          // Fade out the "new" highlight after 3s
          setTimeout(() => {
            setReviews((prev) =>
              prev.map((rev) => (rev.id === incoming.id ? { ...rev, isNew: false } : rev))
            );
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className={`border rounded-xl p-5 bg-white transition-all duration-700 ${
            review.isNew
              ? "border-brand-300 shadow-md shadow-brand-100 bg-brand-50/30"
              : "border-stone-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <Link
              href={`/buildings/${review.building_id}`}
              className="group min-w-0"
            >
              <p className="font-medium text-stone-900 text-sm truncate group-hover:text-brand-600 transition-colors">
                {review.address}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {review.neighborhood ?? review.borough}
              </p>
            </Link>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StarRating value={review.overall_rating} readonly size="sm" />
              <span className="text-xs text-stone-400">{timeAgo(review.created_at)}</span>
            </div>
          </div>

          <p className="text-sm text-stone-600 leading-relaxed line-clamp-3">
            {review.content}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-stone-400">
              — {review.is_anonymous ? "Anonymous" : review.display_name ?? "Resident"}
            </span>
            {review.isNew && (
              <span className="text-xs font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                New
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
