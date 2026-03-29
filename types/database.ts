export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string;
          bbl: string;
          address: string;
          borough: string;
          zip_code: string;
          units_total: number | null;
          year_built: number | null;
          building_class: string | null;
          land_use: string | null;
          latitude: number | null;
          longitude: number | null;
          neighborhood: string | null;
          owner_name: string | null;
          lot_area: number | null;
          building_area: number | null;
          num_floors: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["buildings"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["buildings"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          building_id: string;
          user_id: string;
          overall_rating: number;
          noise_rating: number | null;
          management_rating: number | null;
          safety_rating: number | null;
          value_rating: number | null;
          content: string;
          unit_number: string | null;
          tenancy_start: string | null;
          tenancy_end: string | null;
          is_current_tenant: boolean;
          is_anonymous: boolean;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["reviews"]["Row"],
          "id" | "helpful_count" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
    };
    Views: {
      buildings_with_stats: {
        Row: {
          id: string;
          bbl: string;
          address: string;
          borough: string;
          zip_code: string;
          units_total: number | null;
          year_built: number | null;
          building_class: string | null;
          land_use: string | null;
          neighborhood: string | null;
          owner_name: string | null;
          lot_area: number | null;
          building_area: number | null;
          num_floors: number | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
          avg_overall_rating: number | null;
          review_count: number;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Building = Database["public"]["Tables"]["buildings"]["Row"];
export type BuildingInsert = Database["public"]["Tables"]["buildings"]["Insert"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type BuildingWithStats =
  Database["public"]["Views"]["buildings_with_stats"]["Row"];
