import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "管理者ダッシュボード" };

async function getStats(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const [users, purchases, rewards, notifications] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("nft_purchases").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("referral_rewards").select("amount_usdt").eq("status", "sent"),
    supabase.from("push_notifications").select("*", { count: "exact", head: true }),
  ]);

  const totalRewardsDistributed = (rewards.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount_usdt),
    0,
  );
  const totalSales = (purchases.count ?? 0) * 300;
  const operatorShare = totalSales - totalRewardsDistributed;

  return {
    totalUsers: users.count ?? 0,
    totalPurchases: purchases.count ?? 0,
    totalSales,
    totalRewardsDistributed,
    operatorShare,
    totalNotifications: notifications.count ?? 0,
  };
}

async function getRecentPurchases(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data } = await supabase
    .from("nft_purchases")
    .select("id, claw_no, buyer_wallet_address, amount_usdt, created_at, status")
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

export default async function AdminDashboardPage() {
  const supabase = createServerSupabaseClient();
  const [stats, recentPurchases] = await Promise.all([
    getStats(supabase),
    getRecentPurchases(supabase),
  ]);

  return (
    <div>
      <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-gold-bright mb-8">
        管理者ダッシュボード
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard label="総ユーザー数" value={stats.totalUsers} />
        <StatCard label="NFT 販売数" value={stats.totalPurchases} />
        <StatCard label="総売上" value={`${stats.totalSales.toLocaleString()} USDT`} />
        <StatCard label="報酬分配済み" value={`${stats.totalRewardsDistributed.toLocaleString()} USDT`} />
        <StatCard label="運営取り分" value={`${stats.operatorShare.toLocaleString()} USDT`} />
        <StatCard label="通知配信数" value={stats.totalNotifications} />
      </div>

      <div className="bg-bg-card border border-border-faint rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cinzel text-lg text-gold">最近の購入</h2>
          <Link href="/admin/users" className="text-text-dim text-sm hover:text-gold transition-colors">
            すべて見る →
          </Link>
        </div>

        {recentPurchases.length === 0 ? (
          <p className="text-text-dim text-sm">まだ購入がありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-faint text-text-dim text-left">
                  <th className="pb-2 pr-4">Claw No.</th>
                  <th className="pb-2 pr-4">ウォレット</th>
                  <th className="pb-2 pr-4">金額</th>
                  <th className="pb-2 pr-4">ステータス</th>
                  <th className="pb-2">日時</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map((p) => (
                  <tr key={p.id} className="border-b border-border-faint/50">
                    <td className="py-3 pr-4 text-gold-bright">#{p.claw_no}</td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {p.buyer_wallet_address?.slice(0, 6)}...{p.buyer_wallet_address?.slice(-4)}
                    </td>
                    <td className="py-3 pr-4">{p.amount_usdt} USDT</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${p.status === "confirmed" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-text-dim">{new Date(p.created_at).toLocaleDateString("ja-JP")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
