import type { SupabaseClient } from "@supabase/supabase-js";
import type { Treasurer } from "./types";
import { getPaymentSettings } from "./payment-settings";

// ponytail: Fetch active treasurers with graceful fallback to payment_settings if treasurers table is not yet migrated or empty.
export async function getActiveTreasurers(
  client?: SupabaseClient | null
): Promise<Treasurer[]> {
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from("treasurers")
      .select("id, name, wa_number, qris_image_url, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Treasurer[];
    }
  } catch {
    // Table may not exist yet in unmigrated environment; fallback below
  }

  // Fallback to payment_settings if no treasurers found or table not ready
  try {
    const settings = await getPaymentSettings(client);
    if (settings.nama_bendahara || settings.no_wa_bendahara || settings.qris_image_url) {
      return [
        {
          id: "default-treasurer",
          name: settings.nama_bendahara || "Bendahara",
          wa_number: settings.no_wa_bendahara || "",
          qris_image_url: settings.qris_image_url || null,
          is_active: true,
          created_at: settings.updated_at || new Date().toISOString(),
          updated_at: settings.updated_at || new Date().toISOString(),
        },
      ];
    }
  } catch {
    // Ignore fallback error
  }

  return [];
}

// ponytail: Fetch all treasurers (active and inactive) for allowlisted pengurus management page.
export async function getAllTreasurers(
  client?: SupabaseClient | null
): Promise<Treasurer[]> {
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from("treasurers")
      .select("id, name, wa_number, qris_image_url, is_active, created_at, updated_at, created_by, updated_by")
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Treasurer[];
    }
  } catch {
    // Table may not exist yet
  }

  // Fallback to payment_settings if table empty or not yet migrated
  try {
    const settings = await getPaymentSettings(client);
    if (settings.nama_bendahara || settings.no_wa_bendahara || settings.qris_image_url) {
      return [
        {
          id: "default-treasurer",
          name: settings.nama_bendahara || "Bendahara",
          wa_number: settings.no_wa_bendahara || "",
          qris_image_url: settings.qris_image_url || null,
          is_active: true,
          created_at: settings.updated_at || new Date().toISOString(),
          updated_at: settings.updated_at || new Date().toISOString(),
        },
      ];
    }
  } catch {
    // Ignore fallback error
  }

  return [];
}

// Fetch single treasurer by ID
export async function getTreasurerById(
  id: string,
  client?: SupabaseClient | null
): Promise<Treasurer | null> {
  if (!client || !id) return null;

  try {
    const { data, error } = await client
      .from("treasurers")
      .select("id, name, wa_number, qris_image_url, is_active, created_at, updated_at, created_by, updated_by")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return data as Treasurer;
    }
  } catch {
    // Table may not exist yet
  }

  // If default-treasurer requested in unmigrated state:
  if (id === "default-treasurer") {
    const settings = await getPaymentSettings(client);
    return {
      id: "default-treasurer",
      name: settings.nama_bendahara || "Bendahara",
      wa_number: settings.no_wa_bendahara || "",
      qris_image_url: settings.qris_image_url || null,
      is_active: true,
      created_at: settings.updated_at || new Date().toISOString(),
      updated_at: settings.updated_at || new Date().toISOString(),
    };
  }

  return null;
}
