import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";
import type { Building } from "@/types/database";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check — redirect to login if not authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/buildings/${id}/review`);
  }
  const userId = user!.id;

  const buildingResult = await supabase
    .from("buildings")
    .select("id, address, borough, neighborhood, zip_code")
    .eq("id", id)
    .single();
  const building = buildingResult.data as Pick<Building, "id" | "address" | "borough" | "neighborhood" | "zip_code"> | null;

  if (!building) notFound();

  // Load existing review if the user has one (for editing)
  const { data: existing } = await (supabase as any)
    .from("reviews")
    .select("*")
    .eq("building_id", id)
    .eq("user_id", userId)
    .single() as { data: import("@/types/database").Review | null };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900 mb-1">
        {existing ? "Edit your review" : "Write a review"}
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        {building.address},{" "}
        {building.neighborhood ? `${building.neighborhood}, ` : ""}
        {building.borough}, NY {building.zip_code}
      </p>

      <ReviewForm buildingId={id} userId={userId} existingReview={existing} />
    </div>
  );
}
