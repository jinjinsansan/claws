import Link from "next/link";

export default function PrivacyPage() {
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
          プライバシーポリシー
        </h1>
        <div className="space-y-8 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="font-bold text-text-main text-base mb-3">1. 個人情報の収集</h2>
            <p>
              当サービスでは、サービス提供のために以下の個人情報を収集することがあります。
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>メールアドレス</li>
              <li>氏名（ニックネーム）</li>
              <li>決済情報（Stripeを通じて処理、当社では保持しません）</li>
              <li>SNSアカウント情報（任意入力）</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-text-main text-base mb-3">2. 個人情報の利用目的</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>サービスの提供・運営</li>
              <li>お問い合わせへの対応</li>
              <li>利用規約に違反する行為への対応</li>
              <li>サービスの改善・新サービスの開発</li>
              <li>重要なお知らせの通知</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-text-main text-base mb-3">3. 第三者提供</h2>
            <p>
              法令に基づく場合を除き、ご本人の同意なく個人情報を第三者に提供することはありません。
              ただし、以下のサービスを利用しており、各サービスのプライバシーポリシーに従い情報が取り扱われます。
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Supabase（認証・データベース）</li>
              <li>Stripe（決済処理）</li>
              <li>Cloudflare（動画配信）</li>
              <li>Vercel（ホスティング）</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-text-main text-base mb-3">4. 個人情報の管理</h2>
            <p>
              個人情報の漏洩、滅失、毀損の防止のため、適切なセキュリティ対策を講じます。
              パスワードはハッシュ化して保存し、決済情報はStripeが管理します。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-text-main text-base mb-3">5. Cookieの使用</h2>
            <p>
              当サービスでは、認証状態の管理およびサービス改善のためにCookieを使用します。
              ブラウザの設定でCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-text-main text-base mb-3">6. 個人情報の開示・訂正・削除</h2>
            <p>
              ご本人からの個人情報の開示・訂正・削除のご依頼があった場合、本人確認の上、
              合理的な期間内に対応いたします。マイページから自身のプロフィール情報の変更・退会が可能です。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-text-main text-base mb-3">7. ポリシーの変更</h2>
            <p>
              本ポリシーの内容は、法令等の変更やサービスの変更に伴い、予告なく変更されることがあります。
              変更後のプライバシーポリシーは、当ページに掲載した時点で効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-text-main text-base mb-3">8. お問い合わせ</h2>
            <p>
              個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。
            </p>
            <p className="mt-2">
              AI Builders Lab 運営事務局<br />
              メール: info@ai-builders-lab.com（仮）
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
