"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface GeoBuilding {
  bbl: string;
  address: string;
  borough: string;
  zip_code: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
}

export async function addBuilding(
  payload: GeoBuilding
): Promise<{ error?: string; id?: string }> {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to add a building." };

  const admin = createAdminClient();

  // Return existing building if BBL already in DB
  const { data: existing } = await admin
    .from("buildings")
    .select("id")
    .eq("bbl", payload.bbl)
    .maybeSingle();

  if (existing) return { id: (existing as { id: string }).id };

  // Insert new building
  const { data, error } = await admin
    .from("buildings")
    .insert({
      bbl: payload.bbl,
      address: payload.address,
      borough: payload.borough,
      zip_code: payload.zip_code,
      neighborhood: payload.neighborhood,
      latitude: payload.latitude,
      longitude: payload.longitude,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}
