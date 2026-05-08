import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "紹介系図・報酬" };

export default async function MemberReferralsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, referralsRes, rewardsRes] = await Promise.all([
    supabase
      .from("users")
      .select("referral_code, direct_referrals_count, total_referrals_count, total_rewards_earned")
      .eq("id", user.id)
      .single(),
    supabase
      .from("referrals")
      .select("referred_user_id, generation, confirmed_at, referred:users!referred_user_id(email, display_name, created_at)")
      .eq("referrer_user_id", user.id)
      .order("generation", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("referral_rewards")
      .select("amount_usdt, generation, status, created_at, nft_purchase_id")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const profile = profileRes.data;
  const referrals = referralsRes.data ?? [];
  const rewards = rewardsRes.data ?? [];

  const totalSent = rewards
    .filter((r) => r.status === "sent")
    .reduce((s, r) => s + Number(r.amount_usdt), 0);
  const totalCalculated = rewards
    .filter((r) => r.status === "calculated" || r.status === "scheduled")
    .reduce((s, r) => s + Number(r.amount_usdt), 0);

  const referralUrl = `https://openclaw.com?ref=${profile?.referral_code ?? ""}`;

  const gen1 = referrals.filter((r) => r.generation === 1);
  const gen2 = referrals.filter((r) => r.generation === 2);
  const gen3 = referrals.filter((r) => r.generation === 3);

  return (
    <div>
      <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-gold-bright mb-8">
        紹介系図・報酬
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="直紹介" value={`${profile?.direct_referrals_count ?? 0}人`} />
        <StatCard label="3世代合計" value={`${profile?.total_referrals_count ?? 0}人`} />
        <StatCard label="累計報酬" value={`${Number(profile?.total_rewards_earned ?? 0).toLocaleString()} USDT`} />
        <StatCard label="未送金" value={`${totalCalculated.toLocaleString()} USDT`} color="text-yellow-400" />
      </div>

      {/* Referral link */}
      <div className="bg-bg-card border border-border-faint rounded-lg p-6 mb-8">
        <h2 className="font-cinzel text-lg text-gold mb-3">あなたの紹介リンク</h2>
        <p className="text-text-dim text-sm mb-3">
          このリンク経由で購入されると、3世代にわたり報酬（30% / 10% / 5%）が発生します。
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <code className="bg-bg-mid px-4 py-2 rounded text-gold-bright font-mono text-xs flex-1 break-all">
            {referralUrl}
          </code>
          <code className="bg-bg-mid/60 px-3 py-1.5 rounded text-text-dim font-mono text-xs shrink-0">
            コード: {profile?.referral_code}
          </code>
        </div>
      </div>

      {/* Referral tree */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <ReferralGenCard gen={1} rate="30%" referrals={gen1} />
        <ReferralGenCard gen={2} rate="10%" referrals={gen2} />
        <ReferralGenCard gen={3} rate="5%" referrals={gen3} />
      </div>

      {/* Reward history */}
      <div className="bg-bg-card border border-border-faint rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cinzel text-lg text-gold">報酬履歴</h2>
          <span className="text-text-dim text-xs">送金済: {totalSent.toLocaleString()} USDT</span>
        </div>
        {rewards.length === 0 ? (
          <p className="text-text-dim text-sm">まだ報酬がありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-faint text-text-dim text-left">
                  <th className="pb-2 pr-4">世代</th>
                  <th className="pb-2 pr-4">金額</th>
                  <th className="pb-2 pr-4">ステータス</th>
                  <th className="pb-2">日時</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((r, i) => (
                  <tr key={i} className="border-b border-border-faint/40">
                    <td className="py-2 pr-4 text-text-dim">Gen {r.generation}</td>
                    <td className="py-2 pr-4 text-gold-bright font-bold">{Number(r.amount_usdt)} USDT</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          r.status === "sent"
                            ? "bg-green-900/30 text-green-400"
                            : "bg-yellow-900/30 text-yellow-400"
                        }`}
                      >
                        {r.status === "sent" ? "送金済" : r.status === "calculated" ? "計算済" : r.status}
                      </span>
                    </td>
                    <td className="py-2 text-text-dim text-xs">
                      {new Date(r.created_at).toLocaleDateString("ja-JP")}
                    </td>
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

function StatCard({
  label,
  value,
  color = "text-text-main",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-bg-card border border-border-faint rounded-lg p-4">
      <p className="text-text-dim text-xs mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ReferralGenCard({
  gen,
  rate,
  referrals,
}: {
  gen: number;
  rate: string;
  referrals: Array<{ referred_user_id: string; confirmed_at: string | null; referred?: unknown }>;
}) {
  return (
    <div className="bg-bg-card border border-border-faint rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cinzel text-sm text-gold">
          {gen === 1 ? "直紹介" : `${gen}世代上`}
        </h3>
        <span className="text-gold-bright font-bold text-sm">{rate}</span>
      </div>
      <p className="text-2xl font-bold text-text-main mb-2">{referrals.length}人</p>
      {referrals.slice(0, 3).map((r) => {
        const ref = r.referred as { email?: string; display_name?: string } | null;
        return (
          <div key={r.referred_user_id} className="flex items-center gap-2 py-1 text-xs text-text-dim">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/40 shrink-0" />
            <span className="truncate">{ref?.display_name ?? ref?.email ?? "会員"}</span>
          </div>
        );
      })}
      {referrals.length > 3 && (
        <p className="text-text-dim text-xs mt-1">他 {referrals.length - 3} 人...</p>
      )}
    </div>
  );
}
