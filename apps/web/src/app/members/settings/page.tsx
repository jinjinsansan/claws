"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "@/components/web3/ConnectWalletButton";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  telegram_user_id: number | null;
  telegram_username: string | null;
  telegram_linked_at: string | null;
  display_name: string | null;
  referral_code: string | null;
}

interface Wallet {
  id: string;
  wallet_address: string;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: string | null;
}

export default function MemberSettingsPage() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, walletsRes] = await Promise.all([
        supabase.from("users").select("telegram_user_id, telegram_username, telegram_linked_at, display_name, referral_code").eq("id", user.id).single(),
        supabase.from("user_wallets").select("id, wallet_address, is_primary, is_verified, verified_at").eq("user_id", user.id),
      ]);
      setProfile(profileRes.data ?? null);
      setDisplayName(profileRes.data?.display_name ?? "");
      setWallets(walletsRes.data ?? []);
    };
    void load();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("users").update({ display_name: displayName }).eq("id", user.id);
      if (error) throw new Error(error.message);
      setMessage({ type: "success", text: "表示名を保存しました。" });
      setProfile((p) => p ? { ...p, display_name: displayName } : p);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "保存に失敗しました。" });
    } finally {
      setSaving(false);
    }
  };

  const handleLinkWallet = async () => {
    if (!address) return;
    setLinking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wallets/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "ウォレット紐付けに失敗しました。");
      setMessage({ type: "success", text: "ウォレットを紐付けました。" });
      // Refresh wallets
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("user_wallets").select("id, wallet_address, is_primary, is_verified, verified_at").eq("user_id", user.id);
        setWallets(data ?? []);
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました。" });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div>
      <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-gold-bright mb-8">
        設定
      </h1>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded text-sm ${message.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {/* Profile */}
        <Section title="プロフィール">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-dim mb-1">表示名</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-bg-mid border border-border-faint rounded px-3 py-2 text-text-main text-sm focus:outline-none focus:border-gold/60"
                placeholder="表示名（任意）"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-2 bg-red-blood hover:bg-red-bright text-text-main text-sm font-bold rounded transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </Section>

        {/* Wallet */}
        <Section title="ウォレット連携">
          {wallets.length > 0 && (
            <div className="space-y-2 mb-4">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center gap-3 px-3 py-2 bg-bg-mid/60 rounded text-xs">
                  <code className="font-mono text-text-main flex-1 truncate">{w.wallet_address}</code>
                  {w.is_primary && <span className="shrink-0 px-2 py-0.5 rounded bg-gold/20 text-gold">プライマリ</span>}
                  <span className={`shrink-0 px-2 py-0.5 rounded ${w.is_verified ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                    {w.is_verified ? "検証済" : "未検証"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <ConnectWalletButton />
            {isConnected && address && (
              <button
                onClick={handleLinkWallet}
                disabled={linking}
                className="px-4 py-2 bg-red-blood hover:bg-red-bright text-text-main text-sm font-bold rounded transition-colors disabled:opacity-50"
              >
                {linking ? "紐付け中..." : "このウォレットを紐付け"}
              </button>
            )}
          </div>
          <p className="text-text-dim text-xs mt-3">
            ウォレットを紐付けると NFT の所有確認や購入時の照合に使われます。
          </p>
        </Section>

        {/* Telegram */}
        <Section title="Telegram 連携">
          {profile?.telegram_user_id ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">連携済</span>
                <span className="text-text-dim text-sm">@{profile.telegram_username ?? profile.telegram_user_id}</span>
              </div>
              {profile.telegram_linked_at && (
                <p className="text-text-dim text-xs">
                  連携日: {new Date(profile.telegram_linked_at).toLocaleDateString("ja-JP")}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-text-dim text-sm">Telegram Bot と連携するとクローズとの会話・HP 生成が可能になります。</p>
              <ol className="text-text-dim text-sm space-y-1 list-decimal list-inside">
                <li>NFT 購入後に発行されるリンクコードを確認</li>
                <li>Telegram で @openclaw_bot を開く</li>
                <li>/start &lt;リンクコード&gt; を送信</li>
              </ol>
            </div>
          )}
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
