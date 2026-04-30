/**
 * OPENCLAW Platform - Landing Page (Placeholder)
 *
 * Phase 2-3 でこのファイルを openclaw_lp.html ベースの本番 LP に置き換える予定。
 * 現状は dlc Academy LP との切り替え時の中継プレースホルダー。
 */
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="container mx-auto text-center max-w-3xl relative z-10">
        <div className="text-red-bright font-cinzel text-xs tracking-[0.6em] mb-8">
          ◆ COMING SOON ◆
        </div>

        <h1 className="font-cinzel text-7xl md:text-9xl font-black mb-8 tracking-wide bg-gradient-to-b from-text-main via-red-flame to-red-blood bg-clip-text text-transparent">
          CLAWS
        </h1>

        <p className="text-gold font-cinzel text-sm tracking-[0.4em] mb-12">
          THE THIRTY WARRIORS
        </p>

        <p className="text-text-dim text-base md:text-lg mb-16 leading-loose">
          世界初、ザリガニ型 AI エージェント NFT。
          <br />
          三十体のクローズ、それぞれが異なる世界線から集結した戦士たち。
          <br />
          あなたの商いを、共に灯せ。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/claws"
            className="inline-block px-8 py-4 bg-red-blood hover:bg-red-bright text-text-main font-bold rounded transition-all duration-300 hover:-translate-y-0.5 border border-gold/40 font-cinzel tracking-[0.2em]"
          >
            VIEW THE THIRTY
          </Link>
          <Link
            href="/academy"
            className="inline-block px-8 py-4 border border-border-faint hover:border-gold text-text-main rounded transition-all duration-300 hover:-translate-y-0.5 font-cinzel tracking-[0.2em]"
          >
            ACADEMY
          </Link>
        </div>

        <div className="mt-20 text-text-mute text-xs tracking-[0.3em]">
          Phase 2-3 で本番 LP に置き換え予定
        </div>
      </div>
    </main>
  );
}
