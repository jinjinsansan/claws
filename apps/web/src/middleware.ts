import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const REFERRAL_COOKIE = "oc_ref";
const REFERRAL_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // --- Referral cookie (SPEC-07 §3.3) ---
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && !request.cookies.get(REFERRAL_COOKIE)) {
    supabaseResponse.cookies.set(REFERRAL_COOKIE, ref, {
      path: "/",
      maxAge: REFERRAL_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // --- Supabase Auth ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );

          // Re-set referral cookie if it was set above
          if (ref && !request.cookies.get(REFERRAL_COOKIE)) {
            supabaseResponse.cookies.set(REFERRAL_COOKIE, ref, {
              path: "/",
              maxAge: REFERRAL_MAX_AGE,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && (request.nextUrl.pathname.startsWith("/members") || request.nextUrl.pathname.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/members/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/claws",
    "/claws/:slug*",
    "/academy",
    "/members/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
