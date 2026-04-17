import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await (supabase as any).rpc("search_buildings", {
    query_text: "Mott Street",
    p_borough: null,
    p_neighborhood: null,
    p_limit: 5,
    p_offset: 0,
  });

  return NextResponse.json({ data, error });
}
