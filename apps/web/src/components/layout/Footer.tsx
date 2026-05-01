import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-bg-mid border-t border-border-faint py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div>
            <h3 className="font-cinzel text-lg font-bold text-gold mb-4">
              OPENCLAW
            </h3>
            <p className="text-text-dim text-sm leading-relaxed">
              世界初、ザリガニ型 AI エージェント NFT。
              三十体のクローズが、あなたの商いを支える。
            </p>
          </div>
          <div>
            <h4 className="font-bold text-text-main mb-4 text-sm">リンク</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/claws" className="text-text-dim hover:text-gold transition-colors">
                  Claws カタログ
                </Link>
              </li>
              <li>
                <Link href="/academy" className="text-text-dim hover:text-gold transition-colors">
                  Academy
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-text-dim hover:text-gold transition-colors">
                  ログイン
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-text-main mb-4 text-sm">法的情報</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/legal/tokushoho" className="text-text-dim hover:text-gold transition-colors">
                  特定商取引法に基づく表記
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-text-dim hover:text-gold transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border-faint pt-6 sm:pt-8 text-center text-text-dim text-xs sm:text-sm">
          &copy; {new Date().getFullYear()} OPENCLAW Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
