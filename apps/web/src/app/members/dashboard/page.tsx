import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "会員ダッシュボード" };

export default async function MemberDashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [userProfile, nftTokens, rewards, notifications] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("nft_tokens").select("id, claw_no, claw_id, is_active").eq("owner_user_id", user.id).eq("is_active", true),
    supabase.from("referral_rewards").select("amount_usdt, generation, status, created_at").eq("recipient_user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("push_notifications").select("id, title, message, created_at, target_type, target_user_ids").eq("status", "sent").order("created_at", { ascending: false }).limit(20),
  ]);

  const profile = userProfile.data;
  const claws = nftTokens.data ?? [];
  const rewardHistory = rewards.data ?? [];

  // Filter notifications: show only those targeted to 'all' or explicitly to this user
  const recentNotifications = (notifications.data ?? [])
    .filter((n: { target_type: string; target_user_ids: string[] | null }) =>
      n.target_type === "all" ||
      (n.target_user_ids && n.target_user_ids.includes(user.id))
    )
    .slice(0, 5);

  const totalRewards = rewardHistory
    .filter((r) => r.status === "sent")
    .reduce((sum, r) => sum + Number(r.amount_usdt), 0);

  return (
    <div>
      <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-gold-bright mb-8">
        ダッシュボード
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="所持 Claws" value={claws.length} />
        <StatCard label="直紹介数" value={profile?.direct_referrals_count ?? 0} />
        <StatCard label="累計報酬" value={`${totalRewards.toLocaleString()} USDT`} />
        <StatCard
          label="Telegram"
          value={profile?.telegram_user_id ? "連携済" : "未連携"}
        />
      </div>

      {profile?.referral_code && (
        <div className="bg-bg-card border border-border-faint rounded-lg p-6 mb-8">
          <h2 className="font-cinzel text-lg text-gold mb-3">紹介コード</h2>
          <div className="flex items-center gap-3">
            <code className="bg-bg-mid px-4 py-2 rounded text-gold-bright font-mono text-sm flex-1">
              {profile.referral_code}
            </code>
            <span className="text-text-dim text-xs">
              リンク: openclaw.com?ref={profile.referral_code}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-border-faint rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-cinzel text-lg text-gold">所持 Claws</h2>
            <Link href="/claws" className="text-text-dim text-sm hover:text-gold transition-colors">
              カタログ →
            </Link>
          </div>
          {claws.length === 0 ? (
            <p className="text-text-dim text-sm">
              まだ Claw を所持していません。
              <Link href="/apply" className="text-gold hover:underline ml-1">召喚する</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {claws.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2 bg-bg-mid/50 rounded">
                  <span className="text-gold-bright font-bold">#{c.claw_no}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${c.is_active ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                    {c.is_active ? "アクティブ" : "非アクティブ"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-border-faint rounded-lg p-6">
          <h2 className="font-cinzel text-lg text-gold mb-4">報酬履歴</h2>
          {rewardHistory.length === 0 ? (
            <p className="text-text-dim text-sm">報酬履歴がありません。</p>
          ) : (
            <div className="space-y-2">
              {rewardHistory.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-bg-mid/50 rounded text-sm">
                  <div>
                    <span className="text-text-dim">{r.generation}世代</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${r.status === "sent" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                      {r.status === "sent" ? "送金済" : r.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gold-bright font-bold">{Number(r.amount_usdt)} USDT</span>
                    <span className="text-text-dim text-xs ml-2">
                      {new Date(r.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {recentNotifications.length > 0 && (
        <div className="bg-bg-card border border-border-faint rounded-lg p-6 mt-6">
          <h2 className="font-cinzel text-lg text-gold mb-4">お知らせ</h2>
          <div className="space-y-3">
            {recentNotifications.map((n) => (
              <div key={n.id} className="px-4 py-3 bg-bg-mid/50 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{n.title}</span>
                  <span className="text-text-dim text-xs">
                    {new Date(n.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="text-text-dim text-sm line-clamp-2">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bg-card border border-border-faint rounded-lg p-5">
      <p className="text-text-dim text-xs mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-main">{value}</p>
    </div>
  );
}
