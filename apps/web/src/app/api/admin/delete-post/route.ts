import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const supabaseResponse = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { postId, action } = await request.json();

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  if (action === "delete") {
    await supabase.from("post_likes").delete().eq("post_id", postId);
    await supabase.from("replies").delete().eq("post_id", postId);
    await supabase.from("posts").delete().eq("id", postId);
  } else if (action === "pin") {
    await supabase.from("posts").update({ pinned: true }).eq("id", postId);
  } else if (action === "unpin") {
    await supabase.from("posts").update({ pinned: false }).eq("id", postId);
  }

  return NextResponse.json({ success: true });
}
