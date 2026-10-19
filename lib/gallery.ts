import type { SupabaseClient } from "@supabase/supabase-js";
import type { GalleryCategory, GalleryItem, PublicGalleryItem } from "./types";

export const GALLERY_STORAGE_BUCKET = "gallery-photos";

// ponytail: Public query fetching ONLY safe metadata and public URL. Excludes storage_path and creator UUID to prevent privileged leakage.
export async function getPublicGalleryItems(
  client?: SupabaseClient | null,
  category?: GalleryCategory | "all",
  limit?: number
): Promise<PublicGalleryItem[]> {
  if (!client) {
    return [];
  }

  try {
    let query = client
      .from("gallery_items")
      .select("id, title, category, caption, image_url, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (!error && data) {
      return data as PublicGalleryItem[];
    }
  } catch {
    // Graceful fallback if table is not yet migrated
  }

  return [];
}

// ponytail: Pengurus query fetching all gallery records including storage paths for management and deletion.
export async function getAllGalleryItems(
  client?: SupabaseClient | null
): Promise<GalleryItem[]> {
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from("gallery_items")
      .select("id, title, category, caption, image_url, storage_path, created_at, created_by")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (!error && data) {
      return data as GalleryItem[];
    }
  } catch {
    // Graceful fallback if table is not yet migrated
  }

  return [];
}
