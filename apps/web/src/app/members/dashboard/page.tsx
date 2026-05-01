import Link from "next/link";

export const metadata = { title: "会員ダッシュボード" };

/**
 * /members/dashboard - Phase 7 で本格実装予定
 *
 * Phase 7 で NFT 保有状況・紹介報酬・HP 管理等を表示するダッシュボードを構築。
 */
export default function MemberDashboardPage() {
  return (
    <div className="text-center py-20">
      <div className="text-red-bright font-cinzel text-xs tracking-[0.6em] mb-6">
        ◆ COMING SOON ◆
      </div>
      <h1 className="font-cinzel text-3xl md:text-5xl font-black text-gold-bright mb-6">
        会員ダッシュボード
      </h1>
      <p className="text-text-dim text-base mb-8 leading-relaxed max-w-lg mx-auto">
        NFT 保有状況、紹介報酬、HP 管理などの会員機能は
        <br />
        Phase 7 で実装予定です。
      </p>
      <Link
        href="/claws"
        className="inline-block px-8 py-4 bg-red-blood hover:bg-red-bright text-text-main font-bold rounded transition-all duration-300 border border-gold/40"
      >
        Claws カタログを見る
      </Link>
    </div>
  );
}
