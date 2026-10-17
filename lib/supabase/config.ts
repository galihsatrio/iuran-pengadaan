export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  if (!url.startsWith("https://") && !url.startsWith("http://localhost")) return false;
  if (url.includes("your-project")) return false;
  if (anonKey.length < 20 || anonKey.includes("...")) return false;

  return true;
}
