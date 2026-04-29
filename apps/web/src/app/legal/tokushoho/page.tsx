import Link from "next/link";

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-bg text-text-main">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <Link
          href="/"
          className="text-text-muted hover:text-primary text-sm mb-8 inline-block transition-colors"
        >
          ← TOPへ戻る
        </Link>
        <h1 className="font-serif text-3xl font-bold mb-8">
          特定商取引法に基づく表記
        </h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <dl className="space-y-4">
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">販売事業者名</dt>
              <dd className="text-text-muted">AI Builders Lab 運営事務局</dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">代表者</dt>
              <dd className="text-text-muted">請求があった場合に遅滞なく開示いたします</dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">所在地</dt>
              <dd className="text-text-muted">請求があった場合に遅滞なく開示いたします</dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">電話番号</dt>
              <dd className="text-text-muted">請求があった場合に遅滞なく開示いたします</dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">メールアドレス</dt>
              <dd className="text-text-muted">info@ai-builders-lab.com（仮）</dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">販売価格</dt>
              <dd className="text-text-muted">
                動画のみプラン: ¥49,800（税込）<br />
                動画＋メールサポートプラン: ¥98,000（税込）<br />
                Zoom型プラン: ¥150,000（税込）<br />
                コミュニティ月額: ¥2,980〜¥4,980/月（税込）
              </dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">支払方法</dt>
              <dd className="text-text-muted">クレジットカード（Stripe決済）</dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">支払時期</dt>
              <dd className="text-text-muted">購入時に即時決済</dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">商品の引渡時期</dt>
              <dd className="text-text-muted">決済完了後、即時にサービスをご利用いただけます</dd>
            </div>
            <div className="border-b border-border pb-4">
              <dt className="font-bold mb-1">返品・キャンセルについて</dt>
              <dd className="text-text-muted">
                デジタルコンテンツの性質上、購入後の返品・返金はお受けしておりません。
                ただし、サービスに重大な瑕疵があった場合は個別にご相談ください。
              </dd>
            </div>
            <div>
              <dt className="font-bold mb-1">動作環境</dt>
              <dd className="text-text-muted">
                インターネット接続環境、最新のWebブラウザ（Chrome、Safari、Edge等）
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
