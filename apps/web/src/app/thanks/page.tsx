"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ThanksContent() {
  const searchParams = useSearchParams();
  const txHash = searchParams.get("tx");

  const explorerUrl = process.env.NEXT_PUBLIC_CHAIN_ID === "137"
    ? `https://polygonscan.com/tx/${txHash}`
    : `https://amoy.polygonscan.com/tx/${txHash}`;

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "OpenClawBot";

  return (
    <main className="min-h-screen bg-bg-deep text-text-main flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="text-6xl mb-6">🦞</div>

        <div className="text-red-bright font-cinzel text-xs tracking-[0.6em] mb-4">
          ◆ SUMMONING COMPLETE ◆
        </div>

        <h1 className="font-cinzel text-3xl md:text-5xl font-black text-gold-bright mb-6">
          召喚成功
        </h1>

        <p className="text-text-dim text-base mb-8 leading-relaxed">
          あなたの Claw が召喚されました。
          <br />
          Telegram Bot を通じて、Claw との対話を始めましょう。
        </p>

        {/* Telegram Link */}
        <div className="bg-bg-card border border-border-faint rounded-lg p-6 mb-6">
          <h2 className="font-cinzel text-gold text-lg mb-3">TELEGRAM BOT</h2>
          <p className="text-text-dim text-sm mb-4">
            以下のリンクから Bot に接続し、ウォレットを紐付けてください。
          </p>
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold rounded transition-colors"
          >
            Telegram Bot を開く
          </a>
          <p className="text-text-mute text-xs mt-3">
            ※ リンクコードの有効期限は 24 時間です
          </p>
        </div>

        {/* Transaction */}
        {txHash && (
          <div className="mb-8">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold-bright text-sm underline transition-colors"
            >
              トランザクションを確認 →
            </a>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/members/dashboard"
            className="px-6 py-3 bg-red-blood hover:bg-red-bright text-text-main font-bold rounded transition-colors border border-gold/40"
          >
            会員ダッシュボード
          </Link>
          <Link
            href="/claws"
            className="px-6 py-3 bg-bg-card hover:bg-bg-mid text-text-dim hover:text-text-main rounded transition-colors border border-border-faint"
          >
            Claws カタログ
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ThanksPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-bg-deep flex items-center justify-center">
        <p className="text-text-dim">読み込み中...</p>
      </main>
    }>
      <ThanksContent />
    </Suspense>
  );
}
