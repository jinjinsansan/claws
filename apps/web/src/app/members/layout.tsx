import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Members Layout - Phase 7 で本格実装予定
 *
 * 現状は認証チェックのみ行い、シンプルなレイアウトを提供。
 * NFT ベースのアクセス制御・会員ダッシュボードは Phase 7 で構築。
 */
export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata?.name ?? "会員";

  return (
    <div className="min-h-screen bg-bg-deep text-text-main">
      <header className="fixed top-0 w-full z-50 bg-bg-deep/80 backdrop-blur-md border-b border-border-faint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="font-cinzel text-xl font-bold text-gold">
            OPENCLAW
          </Link>
          <span className="text-text-dim text-sm">{name} さん</span>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <main>{children}</main>
      </div>
    </div>
  );
}
