import Link from "next/link";

export const metadata = {
  title: "Academy",
  description:
    "OPENCLAW Academy — Claws オーナーは Bot を通じて教材を無料で受けられます。Zoom ウェビナー本格リリースは 100 人達成後の予定。",
};

/**
 * /academy
 *
 * MVP1 では「準備中」表示のみ。
 * Bot 経由の教材無料提供と、本格的な動画/Zoom ウェビナーは MVP2 で正式リリース。
 * SPEC-09 §6.2 / CLAUDE.md C 条準拠。
 */
export default function AcademyComingSoonPage() {
  return (
    <main className="min-h-screen bg-bg-deep flex items-center justify-center px-4 py-20">
      <div className="container mx-auto text-center max-w-2xl">
        <div className="text-red-bright font-cinzel text-xs tracking-[0.6em] mb-8">
          ◆ COMING SOON ◆
        </div>

        <h1 className="font-cinzel text-5xl md:text-7xl font-black text-gold-bright mb-8 tracking-wide">
          OPENCLAW
          <br />
          ACADEMY
        </h1>

        <div className="text-2xl text-text-main mb-12 font-serif">
          準備中
        </div>

        <p className="text-text-dim text-base md:text-lg mb-8 leading-loose">
          Claws オーナーは、Bot を通じて Academy の教材を
          <br className="hidden md:inline" />
          <span className="text-gold-bright font-bold">無料で</span>
          受けることができます。
        </p>

        <div className="bg-bg-card border border-border-faint rounded-lg p-6 md:p-8 mb-8 text-left">
          <p className="text-text-main mb-4 text-center font-bold">
            本格リリース予定
          </p>
          <p className="text-text-dim text-sm md:text-base leading-relaxed">
            最初の 100 人が集まり次第、Zoom ウェビナーをはじめとする
            プレミアムコンテンツをリリースします。
          </p>
        </div>

        <p className="text-text-dim text-sm mb-12">
          それまでは、Bot で大黒天や学に
          <br className="md:hidden" />
          「Claude Code の使い方を教えて」と話しかけてください。
        </p>

        <Link
          href="/claws"
          className="inline-block px-8 py-4 bg-red-blood hover:bg-red-bright text-text-main font-bold rounded transition-all duration-300 hover:-translate-y-0.5 border border-gold/40"
        >
          Claws を召喚する
        </Link>
      </div>
    </main>
  );
}
