import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "パスが指定されていません" }, { status: 400 });
  }

  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.startsWith("/")) {
    return NextResponse.json({ error: "不正なパスです" }, { status: 400 });
  }

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

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { data, error } = await supabase.storage
    .from("materials")
    .createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
