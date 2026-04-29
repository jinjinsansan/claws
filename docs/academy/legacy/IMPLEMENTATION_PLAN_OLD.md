# Dlogic Academy - ステップバイステップ実装計画書

## 全体構成

```
dlogic-academy/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← ルートレイアウト（Google Fonts読込）
│   │   ├── page.tsx                ← TOPページ（LP）
│   │   ├── globals.css             ← グローバルCSS + カラーパレット
│   │   ├── launch/
│   │   │   ├── page.tsx            ← ローンチ一覧
│   │   │   └── episode/
│   │   │       └── [n]/
│   │   │           └── page.tsx    ← 各話ページ（動画埋込）
│   │   ├── apply/
│   │   │   └── page.tsx            ← 申し込み（Stripe決済）
│   │   ├── login/
│   │   │   └── page.tsx            ← ログイン
│   │   ├── register/
│   │   │   └── page.tsx            ← 会員登録
│   │   └── members/
│   │       ├── layout.tsx          ← 会員エリアレイアウト（認証チェック）
│   │       ├── dashboard/
│   │       │   └── page.tsx        ← ダッシュボード
│   │       ├── videos/
│   │       │   └── page.tsx        ← 動画ライブラリ
│   │       ├── materials/
│   │       │   └── page.tsx        ← 資料ダウンロード
│   │       ├── community/
│   │       │   └── page.tsx        ← コミュニティ掲示板
│   │       ├── support/
│   │       │   └── page.tsx        ← 質問・サポート
│   │       ├── jobs/
│   │       │   └── page.tsx        ← 受発注ボード
│   │       └── mypage/
│   │           └── page.tsx        ← マイページ
│   ├── components/
│   │   ├── ui/                     ← 共通UIコンポーネント
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Accordion.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MemberSidebar.tsx
│   │   └── sections/               ← TOPページセクション
│   │       ├── HeroSection.tsx
│   │       ├── EraChangeSection.tsx
│   │       ├── AchievementSection.tsx
│   │       ├── AboutSection.tsx
│   │       ├── CurriculumSection.tsx
│   │       ├── PricingSection.tsx
│   │       ├── FAQSection.tsx
│   │       └── CTASection.tsx
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts           ← ブラウザ用Supabaseクライアント
│       │   └── server.ts           ← サーバー用Supabaseクライアント
│       └── stripe.ts               ← Stripe設定
├── .env.local                      ← 環境変数（gitignore対象）
├── tailwind.config.ts              ← Tailwind + カラーパレット
├── package.json
└── tsconfig.json
```

---

## Phase 1: LP + ローンチ + 決済（MVP）

### Step 1.1: プロジェクト基盤 ✅
- [x] Next.js 14 (App Router) + TypeScript + Tailwind CSS初期化
- [x] GitHub リポジトリ連携
- [x] カラーパレット・フォント設定（Tailwind config）
- [x] グローバルCSS（カスタムプロパティ）
- [x] 環境変数ファイル（.env.local）

### Step 1.2: 共通コンポーネント
- [ ] Button コンポーネント（primary/secondary/outline）
- [ ] Card コンポーネント（surface背景・border）
- [ ] Header（ロゴ・ナビゲーション・CTAボタン）
- [ ] Footer（運営者情報・特商法・プライバシーポリシー）

### Step 1.3: TOPページ（LP）8セクション
- [ ] Section 1: ヒーロー（キャッチ + CTA + 背景エフェクト）
- [ ] Section 2: 時代の変化（タイムライン/対比ビジュアル）
- [ ] Section 3: 実績・証拠（サービス画面カード）
- [ ] Section 4: Dlogic Academyとは（3カラムアイコン）
- [ ] Section 5: カリキュラム概要（8週間タイムライン）
- [ ] Section 6: 料金プラン（3プランカード）
- [ ] Section 7: FAQ（アコーディオン）
- [ ] Section 8: 申し込みCTA

### Step 1.4: ローンチページ
- [ ] /launch トップ（4話サムネイル一覧）
- [ ] /launch/episode/[n] 動的ルート
- [ ] Cloudflare Stream動画プレイヤー埋め込み
- [ ] 前話/次話ナビゲーション
- [ ] 第4話に申し込みボタン設置
- [ ] 視聴済みバッジ（localStorage管理）

### Step 1.5: 申し込みページ + Stripe決済
- [ ] Supabaseクライアント設定（@supabase/ssr）
- [ ] /apply プラン選択UI
- [ ] Stripe Checkout Session作成（API Route）
- [ ] 決済完了後のWebhook処理
- [ ] ユーザー作成 + プラン登録

---

## Phase 2: 会員認証 + コンテンツ

### Step 2.1: 認証システム
- [ ] /login ログインページ
- [ ] /register 会員登録ページ
- [ ] Supabase Auth（メール+パスワード）
- [ ] 会員エリアlayout.tsx（認証ガード）
- [ ] プラン別アクセス制御ミドルウェア

### Step 2.2: ダッシュボード
- [ ] ウェルカムメッセージ
- [ ] 受講進捗バー
- [ ] お知らせ一覧
- [ ] Zoomセミナー日程（Zoom型のみ）

### Step 2.3: 動画ライブラリ
- [ ] 週ごとグループ表示
- [ ] アンロック制御
- [ ] Cloudflare Stream埋め込み
- [ ] 視聴済みチェックマーク

### Step 2.4: 資料ダウンロード
- [ ] カテゴリ別表示
- [ ] Supabase Storageダウンロード
- [ ] プラン別アクセス制御

---

## Phase 3: コミュニティ機能

### Step 3.1: 掲示板
- [ ] スレッド投稿・返信
- [ ] カテゴリ分類
- [ ] いいね機能
- [ ] ピン留め・削除（管理者）

### Step 3.2: サポート
- [ ] メール相談フォーム
- [ ] チケット管理
- [ ] 過去の相談履歴

### Step 3.3: 受発注ボード
- [ ] 依頼/受注投稿
- [ ] 検索・フィルター
- [ ] 応募・通知

---

## Phase 4: 管理者機能

### Step 4.1: 管理画面
- [ ] お知らせ管理（CRUD）
- [ ] 動画アンロック管理
- [ ] 資料アップロード
- [ ] 会員一覧・プラン管理
- [ ] コミュニティモデレーション
- [ ] サポートチケット管理

---

## Supabaseテーブル設計

### 作成順序
1. `users` - ユーザー基本情報 + プラン
2. `announcements` - お知らせ
3. `videos` - 動画情報
4. `materials` - 資料情報
5. `posts` - コミュニティ投稿
6. `replies` - 返信
7. `tickets` - サポートチケット
8. `jobs` - 受発注

---

## デプロイ

### Vercel設定
1. GitHubリポジトリ連携
2. 環境変数設定（全キー）
3. ドメイン設定（dlogic-academy.com等）

### Stripe設定
1. 商品・価格作成（4プラン）
2. Webhook設定（checkout.session.completed）
3. 本番キーの環境変数設定
