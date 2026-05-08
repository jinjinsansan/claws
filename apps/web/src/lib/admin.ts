export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@openclaw.com";

/**
 * Quick email-based admin check (used as fallback / SSR fast-path).
 * DB-backed check via checkAdminFromDb() should be preferred.
 */
export function isAdmin(email: string | undefined | null): boolean {
  return email === ADMIN_EMAIL;
}

/**
 * DB-backed admin check using admin_users table.
 * Returns the admin role or null if not an admin.
 */
export async function checkAdminFromDb(
  supabase: { from: (t: string) => unknown },
  userId: string,
): Promise<string | null> {
  const { data } = await (supabase as ReturnType<typeof Object>)
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .single() as { data: { role: string } | null };
  return data?.role ?? null;
}

export const adminNavItems = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/users", label: "会員管理" },
  { href: "/admin/announcements", label: "通知管理" },
  { href: "/admin/videos", label: "動画管理" },
  { href: "/admin/materials", label: "資料管理" },
  { href: "/admin/community", label: "コミュニティ" },
  { href: "/admin/tickets", label: "サポート" },
  { href: "/admin/jobs", label: "受発注" },
] as const;

export const memberNavItems = [
  { href: "/members/dashboard", label: "ダッシュボード" },
  { href: "/members/mypage", label: "マイページ" },
  { href: "/members/referrals", label: "紹介・報酬" },
  { href: "/members/sites", label: "HP 管理" },
  { href: "/members/settings", label: "設定" },
  { href: "/members/materials", label: "教材" },
  { href: "/members/videos", label: "動画" },
  { href: "/members/community", label: "コミュニティ" },
  { href: "/members/support", label: "サポート" },
] as const;
