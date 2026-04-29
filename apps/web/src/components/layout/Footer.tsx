import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div>
            <h3 className="font-serif text-lg font-bold text-primary mb-4">
              AI Builders Lab
            </h3>
            <p className="text-text-muted text-sm leading-relaxed">
              AIで複数のプロダクトを生み出した実績者が教える、
              AI個人開発者養成コミュニティ
            </p>
          </div>
          <div>
            <h4 className="font-bold text-text-main mb-4 text-sm">リンク</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/launch/episode/1" className="text-text-muted hover:text-primary transition-colors">
                  無料ローンチ動画
                </Link>
              </li>
              <li>
                <Link href="/apply" className="text-text-muted hover:text-primary transition-colors">
                  お申し込み
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-text-muted hover:text-primary transition-colors">
                  ログイン
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-text-main mb-4 text-sm">法的情報</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/legal/tokushoho" className="text-text-muted hover:text-primary transition-colors">
                  特定商取引法に基づく表記
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-text-muted hover:text-primary transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-6 sm:pt-8 text-center text-text-muted text-xs sm:text-sm">
          &copy; {new Date().getFullYear()} AI Builders Lab. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
