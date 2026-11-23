import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getShoppingNoteSignedUrl } from "@/lib/shopping-notes";

// ponytail: Generates signed URL on demand with 1 hour TTL, cached client-side for 55m. Upgrade to CDN presigned cache if scale demands.
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signedUrl = await getShoppingNoteSignedUrl(supabase, path);
  if (!signedUrl) {
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }

  return NextResponse.json(
    { url: signedUrl },
    {
      headers: { "Cache-Control": "private, max-age=3300" },
    }
  );
}
