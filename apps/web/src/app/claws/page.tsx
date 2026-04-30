/**
 * /claws — 30 体カタログページ (Phase 2-4)
 *
 * SPEC-07 §4.1 準拠。ユーザーが 30 体を一覧して、気になるキャラを選ぶための
 * 検索/閲覧ページ。各カードクリックで /claws/[slug] へ遷移。
 *
 * MVP1 段階: @openclaw/characters/data/index.json から静的読込。
 * Phase 1-9 でシード投入後は Supabase claws テーブル経由に切替予定。
 */
import Link from "next/link";
import Image from "next/image";
import charactersIndex from "@openclaw/characters/data/index.json";
import { ConnectWalletButton } from "@/components/web3/ConnectWalletButton";
import "../openclaw-lp.css";

export const metadata = {
  title: "三十戦士 | THE THIRTY",
  description:
    "OPENCLAW Platform の三十体のクローズ。悪魔・神・獣・鋼・人・女神・妖精・癒し・賢者・友——あなたの戦士は、誰か。",
};

const CATEGORY_JP: Record<string, string> = {
  demon: "悪魔",
  god: "神様",
  wild: "野生",
  robot: "ロボット",
  human: "人間",
  goddess: "女神",
  temptress: "小悪魔",
  fluffy: "ふわふわ",
  concierge: "コンシェルジュ",
  friend: "友人",
};

export default function ClawsCatalogPage() {
  return (
    <main className="min-h-screen bg-bg-deep relative">
      {/* ============ TOP BAR (wallet) ============ */}
      <div className="absolute top-0 right-0 p-4 md:p-6 z-20">
        <ConnectWalletButton />
      </div>

      {/* ============ HEADER ============ */}
      <section className="border-b border-border-faint">
        <div className="lp-section-wrap !pt-32 !pb-20">
          <div className="lp-section-mark">CATALOG</div>
          <h1 className="lp-section-title">THE THIRTY</h1>
          <div className="lp-section-title-jp">三十戦士、ここに集う</div>

          <p className="text-center max-w-2xl mx-auto text-text-dim text-base md:text-lg leading-loose tracking-wider">
            悪魔。神。獣。鋼。人。
            <br />
            女神。妖精。癒し。賢者。友。
            <br />
            <span className="text-gold-bright font-bold">
              汝の戦士を、見つけよ。
            </span>
          </p>
        </div>
      </section>

      {/* ============ GRID ============ */}
      <section>
        <div className="max-w-[1400px] mx-auto px-5 py-20 md:py-32">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            {charactersIndex.map((c) => {
              const slug = `${String(c.claw_no).padStart(2, "0")}-${c.name_romaji}`;
              const tagline =
                Array.isArray(c.tagline) && c.tagline.length > 0
                  ? c.tagline[0]
                  : "";
              return (
                <Link
                  key={c.claw_no}
                  href={`/claws/${slug}`}
                  className="group relative bg-gradient-to-br from-red-blood/[0.15] to-black/50 border border-border-faint overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:border-gold hover:shadow-[0_25px_50px_rgba(0,0,0,0.7),0_0_40px_rgba(209,2,2,0.3)] block"
                  style={{
                    transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                  }}
                >
                  {/* Image area */}
                  <div className="relative aspect-square bg-gradient-to-br from-red-blood/[0.1] to-black/40 overflow-hidden">
                    <span className="absolute top-2 left-2 bg-black/85 border border-red-bright px-2 py-0.5 text-[11px] text-gold tracking-[0.15em] font-bebas z-10">
                      No. {String(c.claw_no).padStart(2, "0")}
                    </span>
                    <Image
                      src={`/claws/${c.image_filename}`}
                      alt={c.name_jp}
                      width={400}
                      height={400}
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 480px) 50vw, (max-width: 700px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    />
                    {/* Glow overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
                  </div>

                  {/* Info area */}
                  <div className="px-3 py-3 md:px-4 md:py-4 border-t border-border-faint/50 bg-bg-mid/40">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="font-serif font-black text-base md:text-lg text-text-main tracking-wide truncate">
                        {c.name_jp}
                      </div>
                      <div className="text-text-mute text-[10px] tracking-wider whitespace-nowrap">
                        {CATEGORY_JP[c.category] ?? c.category}
                      </div>
                    </div>
                    <div className="font-cinzel text-[11px] md:text-xs text-gold-bright tracking-[0.2em] mb-2">
                      {c.name_en}
                    </div>
                    {tagline ? (
                      <div className="text-text-dim text-[11px] leading-relaxed line-clamp-2 min-h-[2.5em]">
                        {tagline}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="lp-cta">
        <div className="lp-cta-mark">CHOOSE YOUR PATH</div>
        <h2 className="lp-cta-title">SUMMON</h2>
        <div className="lp-cta-jp">汝の戦士を、召喚せよ</div>

        <p className="text-text-dim text-sm md:text-base max-w-xl mx-auto mb-12 leading-loose">
          気になる戦士の名前をクリックすると、
          <br />
          そのクローズの物語と詳細が開かれる。
        </p>

        <div className="lp-cta-note">
          ※ 三十体すべて 300 USDT。お申し込みは紹介者を通じてのみ。
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">OPENCLAW</div>
        <div className="lp-footer-tagline">CLAWS — THE THIRTY WARRIORS</div>
        <div className="lp-footer-copyright">
          © OPENCLAW. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </main>
  );
}
