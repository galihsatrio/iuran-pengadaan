import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseRecord, PublicExpense } from "./types";

// Public query fetching ONLY safe disclosure fields from secure view public_expenses.
// DB contract: base table public.expenses is protected by RLS (pengurus only), while public_expenses exposes only non-sensitive columns (no receipt_path, no user IDs).
export async function getPublicExpenses(
  client?: SupabaseClient | null
): Promise<PublicExpense[]> {
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from("public_expenses")
      .select("id, date, description, amount, procurement_group")
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (!error && data) {
      return data as PublicExpense[];
    }
  } catch {
    // Graceful fallback if view is not yet migrated
  }

  return [];
}

// Pengurus query fetching all fields including private receipt paths for administration.
export async function getAllExpenses(
  client?: SupabaseClient | null
): Promise<ExpenseRecord[]> {
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from("expenses")
      .select("id, date, description, amount, procurement_group, receipt_path, created_at, updated_at, created_by, updated_by")
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (!error && data) {
      return data as ExpenseRecord[];
    }
  } catch {
    // Graceful fallback if table is not yet migrated
  }

  return [];
}

// Fetch single expense record for pengurus edit view
export async function getExpenseById(
  id: number,
  client?: SupabaseClient | null
): Promise<ExpenseRecord | null> {
  if (!client || !id || !Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  try {
    const { data, error } = await client
      .from("expenses")
      .select("id, date, description, amount, procurement_group, receipt_path, created_at, updated_at, created_by, updated_by")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return data as ExpenseRecord;
    }
  } catch {
    // Return null if table not ready or query fails
  }

  return null;
}

// Generate short-lived signed URL (default 5 min) for authorized pengurus to view private receipt without exposing public bucket access.
export async function getExpenseReceiptSignedUrl(
  client: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  if (!client || !storagePath) return null;

  try {
    const { data, error } = await client.storage
      .from("expense-receipts")
      .createSignedUrl(storagePath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    // Return null on failure
  }

  return null;
}

export interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export function calculateCashFlow(
  incomes: { amount: number }[],
  expenses: { amount: number }[]
): CashFlowSummary {
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    netBalance,
  };
}

export const UNGROUPED_PROCUREMENT_LABEL = "Belum dikelompokkan";

export interface ProcurementExpenseGroup<T extends { amount: number; procurement_group?: string | null }> {
  groupName: string;
  isUngrouped: boolean;
  totalAmount: number;
  items: T[];
}

// Pure grouping utility for expenses by procurement project.
// Groups with explicit names preserve insertion order (earliest seen); ungrouped/null always sorted last.
export function groupExpensesByProcurement<T extends { amount: number; procurement_group?: string | null }>(
  items: T[]
): ProcurementExpenseGroup<T>[] {
  const map = new Map<string | null, T[]>();

  for (const item of items) {
    const raw = typeof item.procurement_group === "string" ? item.procurement_group.trim() : "";
    const key = raw.length > 0 ? raw : null;
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  const groups: ProcurementExpenseGroup<T>[] = [];
  let ungroupedGroup: ProcurementExpenseGroup<T> | null = null;

  for (const [key, groupItems] of map.entries()) {
    const isUngrouped = key === null;
    const groupName = key !== null ? key : UNGROUPED_PROCUREMENT_LABEL;
    const totalAmount = groupItems.reduce((sum, it) => sum + Number(it.amount || 0), 0);
    const entry: ProcurementExpenseGroup<T> = {
      groupName,
      isUngrouped,
      totalAmount,
      items: groupItems,
    };

    if (isUngrouped) {
      ungroupedGroup = entry;
    } else {
      groups.push(entry);
    }
  }

  if (ungroupedGroup) {
    groups.push(ungroupedGroup);
  }

  return groups;
}
