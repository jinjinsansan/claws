import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "マイページ" };

export default async function MyPagePage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, walletsRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("user_wallets").select("*").eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  const wallets = walletsRes.data ?? [];

  return (
    <div>
      <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-gold-bright mb-8">
        マイページ
      </h1>

      <div className="space-y-6 max-w-2xl">
        <Section title="基本情報">
          <InfoRow label="メールアドレス" value={profile?.email ?? "-"} />
          <InfoRow label="表示名" value={profile?.display_name ?? "未設定"} />
          <InfoRow label="紹介コード" value={profile?.referral_code ?? "-"} />
          <InfoRow
            label="登録日"
            value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ja-JP") : "-"}
          />
        </Section>

        <Section title="Telegram 連携">
          {profile?.telegram_user_id ? (
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">連携済</span>
              <span className="text-text-dim text-sm">
                @{profile.telegram_username ?? profile.telegram_user_id}
              </span>
            </div>
          ) : (
            <p className="text-text-dim text-sm">
              Telegram Bot と連携すると、Claws と会話できるようになります。
            </p>
          )}
        </Section>

        <Section title="ウォレット">
          {wallets.length === 0 ? (
            <p className="text-text-dim text-sm">ウォレットが登録されていません。</p>
          ) : (
            <div className="space-y-2">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center gap-3 px-3 py-2 bg-bg-mid/50 rounded">
                  <code className="font-mono text-xs text-text-main flex-1">
                    {w.wallet_address}
                  </code>
                  <div className="flex gap-2">
                    {w.is_primary && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gold/20 text-gold">プライマリ</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${w.is_verified ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                      {w.is_verified ? "検証済" : "未検証"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="統計">
          <InfoRow label="所持 Claws 数" value={String(profile?.total_claws_count ?? 0)} />
          <InfoRow label="直紹介者数" value={String(profile?.direct_referrals_count ?? 0)} />
          <InfoRow label="累計紹介者数" value={String(profile?.total_referrals_count ?? 0)} />
          <InfoRow label="累計報酬" value={`${Number(profile?.total_rewards_earned ?? 0).toLocaleString()} USDT`} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border-faint rounded-lg p-6">
      <h2 className="font-cinzel text-lg text-gold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-faint/30 last:border-0">
      <span className="text-text-dim text-sm">{label}</span>
      <span className="text-text-main text-sm font-mono">{value}</span>
    </div>
  );
}
