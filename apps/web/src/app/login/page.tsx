"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/client";
import { ConnectWalletButton } from "@/components/web3/ConnectWalletButton";
import { useAccount, useSignMessage } from "wagmi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
      return;
    }

    router.push("/members/dashboard");
    router.refresh();
  };

  const handleWalletLogin = async () => {
    if (!isConnected || !address) {
      setError("先にウォレットを接続してください");
      return;
    }

    setWalletLoading(true);
    setError(null);

    try {
      const nonceRes = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const nonceData = (await nonceRes.json().catch(() => ({}))) as { message?: string; nonce?: string; error?: string };
      if (!nonceRes.ok || !nonceData.message || !nonceData.nonce) {
        throw new Error(nonceData.error ?? "署名ログインの初期化に失敗しました");
      }

      const signature = await signMessageAsync({ message: nonceData.message });

      const verifyRes = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          nonce: nonceData.nonce,
          signature,
        }),
      });
      const verifyData = (await verifyRes.json().catch(() => ({}))) as { actionLink?: string; error?: string };
      if (!verifyRes.ok || !verifyData.actionLink) {
        throw new Error(verifyData.error ?? "署名ログインの検証に失敗しました");
      }

      window.location.href = verifyData.actionLink;
    } catch (err) {
      const message = err instanceof Error ? err.message : "ウォレットログインに失敗しました";
      setError(message);
      setWalletLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-center mb-2">
            ログイン
          </h1>
          <p className="text-text-muted text-center text-sm mb-6 sm:mb-8">
            会員エリアにアクセス
          </p>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-light text-bg font-bold py-3 rounded-lg text-lg transition-colors disabled:opacity-50"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <div className="my-6 border-t border-border pt-6">
            <p className="text-text-muted text-sm text-center mb-4">
              またはウォレット署名でログイン
            </p>
            <div className="flex justify-center mb-4">
              <ConnectWalletButton />
            </div>
            <button
              type="button"
              onClick={handleWalletLogin}
              disabled={walletLoading || !isConnected}
              className="w-full bg-red-blood hover:bg-red-bright text-text-main font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {walletLoading ? "署名ログイン中..." : "ウォレット署名ログイン"}
            </button>
          </div>

          <p className="text-text-muted text-sm text-center mt-6">
            アカウントをお持ちでない方は{" "}
            <Link href="/register" className="text-primary hover:underline">
              会員登録
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
