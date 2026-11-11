import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShoppingNote, ShoppingNoteItem } from "./types";

export const SHOPPING_NOTE_STORAGE_BUCKET = "shopping-note-photos";

// Fetch all shopping notes ordered by date desc, id desc
export async function getAllShoppingNotes(
  client?: SupabaseClient | null
): Promise<ShoppingNote[]> {
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from("shopping_notes")
      .select("id, title, date, photo_path, total_amount, created_at")
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (!error && data) {
      return data as ShoppingNote[];
    }
  } catch {
    // Graceful fallback if table is not yet migrated
  }

  return [];
}

// Fetch all shopping notes with their items in 2 queries (avoid N+1)
export async function getAllShoppingNotesWithItems(
  client?: SupabaseClient | null
): Promise<ShoppingNote[]> {
  if (!client) return [];

  try {
    const { data: notes, error: notesError } = await client
      .from("shopping_notes")
      .select("id, title, date, photo_path, total_amount, created_at")
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (notesError || !notes || notes.length === 0) return notes ? (notes as ShoppingNote[]) : [];

    const noteIds = notes.map((n: { id: number }) => n.id);
    const { data: items, error: itemsError } = await client
      .from("shopping_note_items")
      .select("id, note_id, item_name, item_price, sort_order")
      .in("note_id", noteIds)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    const itemsByNoteId = new Map<number, ShoppingNoteItem[]>();
    if (!itemsError && items) {
      for (const item of items as ShoppingNoteItem[]) {
        const existing = itemsByNoteId.get(item.note_id);
        if (existing) existing.push(item);
        else itemsByNoteId.set(item.note_id, [item]);
      }
    }

    return (notes as ShoppingNote[]).map((n) => ({
      ...n,
      items: itemsByNoteId.get(n.id) ?? [],
    }));
  } catch {
    return [];
  }
}

// Fetch single shopping note with its items
export async function getShoppingNoteById(
  id: number,
  client?: SupabaseClient | null
): Promise<ShoppingNote | null> {
  if (!client || !id || !Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  try {
    const { data: note, error: noteError } = await client
      .from("shopping_notes")
      .select("id, title, date, photo_path, total_amount, created_at")
      .eq("id", id)
      .maybeSingle();

    if (noteError || !note) {
      return null;
    }

    const { data: items, error: itemsError } = await client
      .from("shopping_note_items")
      .select("id, note_id, item_name, item_price, sort_order")
      .eq("note_id", id)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    return {
      ...(note as ShoppingNote),
      items: (!itemsError && items) ? (items as ShoppingNoteItem[]) : [],
    };
  } catch {
    // Return null if table not ready or query fails
  }

  return null;
}

// Generate short-lived signed URL for authorized pengurus to view private shopping note photo
export async function getShoppingNoteSignedUrl(
  client: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  if (!client || !storagePath) return null;

  try {
    const { data, error } = await client.storage
      .from(SHOPPING_NOTE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    // Return null on failure
  }

  return null;
}
