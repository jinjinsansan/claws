"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "@/components/web3/ConnectWalletButton";
import { PurchaseFlow } from "@/components/web3/PurchaseFlow";
import charactersIndex from "@openclaw/characters/data/index.json";

const CATEGORY_JP: Record<string, string> = {
  demon: "悪魔", god: "神", wild: "野獣", robot: "機械",
  human: "人間", goddess: "女神", temptress: "妖魔",
  fluffy: "癒し", concierge: "賢者", friend: "友",
};

export default function ApplyPage() {
  const { isConnected } = useAccount();
  const [selectedClaw, setSelectedClaw] = useState<number | null>(null);

  const selected = selectedClaw
    ? charactersIndex.find((c) => c.claw_no === selectedClaw)
    : null;

  return (
    <main className="min-h-screen bg-bg-deep text-text-main">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
        <Link href="/claws" className="text-text-dim hover:text-gold text-sm mb-8 inline-block">
          ← Claws カタログへ
        </Link>

        <h1 className="font-cinzel text-3xl md:text-5xl font-black text-gold-bright mb-4 tracking-wide">
          THE SUMMONING
        </h1>
        <p className="text-text-dim text-base mb-12">召喚の儀 — Claw を選び、300 USDT で召喚せよ。</p>

        {/* Step 1: Connect Wallet */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isConnected ? "bg-gold text-bg-deep" : "bg-bg-card text-text-dim border border-border-faint"}`}>
              1
            </span>
            <h2 className="font-cinzel text-lg text-gold">CONNECT WALLET</h2>
          </div>
          <div className="pl-11">
            <ConnectWalletButton />
          </div>
        </section>

        {/* Step 2: Select Character */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedClaw ? "bg-gold text-bg-deep" : "bg-bg-card text-text-dim border border-border-faint"}`}>
              2
            </span>
            <h2 className="font-cinzel text-lg text-gold">SELECT YOUR CLAW</h2>
          </div>
          <div className="pl-11">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
              {charactersIndex.map((c) => (
                <button
                  key={c.claw_no}
                  onClick={() => setSelectedClaw(c.claw_no)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedClaw === c.claw_no
                      ? "border-gold ring-2 ring-gold/50 scale-105"
                      : "border-border-faint hover:border-gold/40"
                  }`}
                  title={`No.${String(c.claw_no).padStart(2, "0")} ${c.name_jp} (${CATEGORY_JP[c.category] ?? c.category})`}
                >
                  <Image
                    src={`/claws/${c.image_filename}`}
                    alt={c.name_jp}
                    fill
                    sizes="60px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center text-text-dim py-0.5">
                    {String(c.claw_no).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
            {selected && (
              <div className="mt-4 p-4 bg-bg-card border border-border-faint rounded-lg flex items-center gap-4">
                <Image
                  src={`/claws/${selected.image_filename}`}
                  alt={selected.name_jp}
                  width={80}
                  height={80}
                  className="rounded-lg"
                />
                <div>
                  <p className="font-cinzel text-gold text-lg">
                    No.{String(selected.claw_no).padStart(2, "0")} {selected.name_jp}
                  </p>
                  <p className="text-text-dim text-sm">
                    {selected.name_en} — {CATEGORY_JP[selected.category] ?? selected.category}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Purchase */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isConnected && selectedClaw ? "bg-gold text-bg-deep" : "bg-bg-card text-text-dim border border-border-faint"}`}>
              3
            </span>
            <h2 className="font-cinzel text-lg text-gold">SUMMON — 300 USDT</h2>
          </div>
          <div className="pl-11">
            {isConnected && selectedClaw ? (
              <PurchaseFlow characterNo={selectedClaw} />
            ) : (
              <p className="text-text-dim text-sm">
                {!isConnected ? "ウォレットを接続してください。" : "Claw を選択してください。"}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
