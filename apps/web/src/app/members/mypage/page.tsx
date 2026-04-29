"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { getPlanLabel } from "@/lib/plans";

interface Profile {
  name: string;
  bio: string;
  sns_twitter: string;
  sns_github: string;
  plan: string | null;
  email: string;
}

export default function MyPagePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [snsTwitter, setSnsTwitter] = useState("");
  const [snsGithub, setSnsGithub] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("name, bio, sns_twitter, sns_github, plan")
        .eq("email", user.email)
        .single();

      const p: Profile = {
        name: data?.name ?? user.user_metadata?.name ?? "",
        bio: data?.bio ?? "",
        sns_twitter: data?.sns_twitter ?? "",
        sns_github: data?.sns_github ?? "",
        plan: data?.plan ?? null,
        email: user.email ?? "",
      };
      setProfile(p);
      setName(p.name);
      setBio(p.bio);
      setSnsTwitter(p.sns_twitter);
      setSnsGithub(p.sns_github);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ name, bio, sns_twitter: snsTwitter, sns_github: snsGithub })
      .eq("email", profile.email);

    setMessage(error ? "保存に失敗しました" : "保存しました");
    setSaving(false);
  };

  const handleWithdraw = async () => {
    if (!confirm("本当に退会しますか？この操作は取り消せません。")) return;

    const supabase = createClient();
    await supabase.from("users").update({ plan: null }).eq("email", profile?.email);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!profile) {
    return (
      <div className="text-text-muted text-center py-16">読み込み中...</div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-8">マイページ</h1>

      {/* Profile Edit */}
      <Card className="mb-6">
        <h2 className="font-bold mb-4">プロフィール編集</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">お名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">自己紹介</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="自己紹介を入力してください"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">
              メールアドレス
            </label>
            <p className="text-text-muted text-sm px-4 py-3 bg-bg border border-border rounded-lg">
              {profile.email}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">X (Twitter)</label>
              <input
                type="text"
                value={snsTwitter}
                onChange={(e) => setSnsTwitter(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">GitHub</label>
              <input
                type="text"
                value={snsGithub}
                onChange={(e) => setSnsGithub(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                placeholder="username"
              />
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message === "保存しました" ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-light text-bg font-bold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </Card>

      {/* Current Plan */}
      <Card className="mb-6">
        <h2 className="font-bold mb-4">現在のプラン</h2>
        <p className="text-primary font-bold text-lg mb-4">
          {getPlanLabel(profile.plan)}
        </p>
        {profile.plan && profile.plan !== "zoom" && (
          <Button href="/apply" variant="outline" className="text-sm py-2 px-6">
            プランをアップグレード
          </Button>
        )}
      </Card>

      {/* Billing History */}
      <Card className="mb-6">
        <h2 className="font-bold mb-4">請求履歴</h2>
        <p className="text-text-muted text-sm mb-4">
          Stripeの決済履歴・請求書の確認はこちらから行えます。
        </p>
        <BillingPortalButton />
      </Card>

      {/* Withdraw */}
      <Card className="border-red-900/30">
        <h2 className="font-bold mb-4 text-red-400">退会</h2>
        {!showWithdraw ? (
          <button
            onClick={() => setShowWithdraw(true)}
            className="text-red-400 hover:text-red-300 text-sm border border-red-900/50 hover:border-red-400 rounded-lg px-4 py-2 transition-colors"
          >
            退会を検討する
          </button>
        ) : (
          <div>
            <p className="text-text-muted text-sm mb-4">
              退会するとアカウントデータが無効になり、会員エリアにアクセスできなくなります。
              購入済みの動画へのアクセスも失われます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleWithdraw}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                退会する
              </button>
              <button
                onClick={() => setShowWithdraw(false)}
                className="text-text-muted hover:text-text-main text-sm border border-border px-4 py-2 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function BillingPortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");

    const res = await fetch("/api/billing-portal", { method: "POST" });
    const data = await res.json();

    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error === "No billing history found"
        ? "決済履歴が見つかりません。購入後にご利用いただけます。"
        : "現在利用できません。Stripe設定完了後にご利用いただけます。");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-primary/20 hover:bg-primary/30 text-primary font-bold text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "読み込み中..." : "請求履歴・請求書を確認"}
      </button>
      {error && <p className="text-text-muted text-sm mt-2">{error}</p>}
    </div>
  );
}
