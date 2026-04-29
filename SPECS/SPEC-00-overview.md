# SPEC-00: OPENCLAW Platform - プロジェクト全体概要・アーキテクチャ

> **このドキュメントの位置づけ**: OPENCLAW Platform 開発仕様書シリーズの最初の文書。プロジェクト全体の俯瞰、技術選定、開発フェーズ、Claude Code（および Factory Droid）への指示前提を明示する。各 SPEC-01 以降を読む前に、必ず本文書を読むこと。

---

## 0. このプロジェクトを Claude Code で開発する前提

### 0.1 開発スタイル

このプロジェクトは、**コードを Claude Code（または Factory Droid）に委任して開発する**ことを前提としている。プロジェクトオーナー（仁さん、以下「運営者」）は仕様書を渡し、Claude Code が実装し、運営者が動作確認・ローンチを行う。

- 運営者は基本的にコードを書かない
- Claude Code は本仕様書群を最優先の真実として扱う
- 仕様書同士で矛盾がある場合、Claude Code は実装に進む前に運営者に確認を求める
- 仕様書に書かれていない判断が必要になった場合、Claude Code は実装を中断し、運営者に確認する

### 0.2 開発時の注意事項

- **既存コード資産**: 既存リポジトリ `https://github.com/jinjinsansan/dlc` を `openclaw-platform` という名前でコピーし、それをベースに開発する。Academy 関連のコードはそのまま流用する。
- **重要な原則**: 仕様変更が発生した場合、Claude Code は影響範囲を必ず提示してから変更する。後から書き直しになる作業を避けること。
- **テスト**: 各機能は最低限のテスト（ユニットテスト・E2Eテスト）を実装する。テスト無しでマージしない。
- **環境分離**: 開発（development）、ステージング（staging）、本番（production）の3環境を維持する。

---

## 1. プロジェクト概要

### 1.1 サービス名

**OPENCLAW Platform**（オープンクロー プラットフォーム）

略称: **OPENCLAW** または **OpenClaw**

### 1.2 サービスの一行説明

世界初、ザリガニ型 AI エージェント NFT「Claws」を中心とした、日本人個人事業主・副業希望者向けの集客支援＆学習エコシステム。

### 1.3 プロダクト構造（階層）

```
OPENCLAW Platform（メインブランド・上位概念）
├─ Claws NFT（30体のキャラクター）= ライセンスキー
├─ Claw Bot（Telegram上のAIエージェント）
│   ├─ HP生成機能
│   ├─ X/note自動投稿機能
│   ├─ コミュニティマッチング機能
│   └─ Academy教材を無料で教える機能
├─ 紹介報酬システム（3ティア + 動的%）
├─ プッシュ通知システム（運営→ユーザー）
├─ Academy（補足コンテンツ・準備中表示）
│   ├─ 動画コンテンツ（仁さんが録画）
│   ├─ Zoomウェビナー（有料・100人達成後リリース）
│   └─ 既存資産: dlc-sigma.vercel.app の8週間カリキュラム
└─ 武器倉庫（MVP3で実装、初期は実装しない）
    ├─ オープンソース武器（無料）
    └─ 仁さん製武器（有料・紹介報酬対象）
```

### 1.4 ターゲットユーザー

#### ペルソナA（初動100人）
- 30〜50代、男女
- ネットワークビジネス経験者
- 暗号資産・NFTへの抵抗が少ない
- 紹介報酬の仕組みに慣れている
- 自分のビジネスを既に持っている

#### ペルソナB（拡散層）
- 30〜50代、主婦・OL
- 副業を始めたい
- ハンドメイド・ブログ・SNSなどで何か売っている
- 集客で苦しんでいる
- AI・暗号資産は初心者

### 1.5 価格

- **Claws NFT**: 300 USDT（約30,000〜45,000円・為替に依存）
- **Academy 動画コンテンツ**: 無料（Bot経由、自動的に提供）
- **Academy Zoomウェビナー**: ¥150,000（一括）/ 8週間 ※準備中、100人達成後リリース
- **コミュニティ月額**: ¥2,980〜¥4,980/月 ※将来実装

---

## 2. 技術スタック（最終確定）

### 2.1 フロントエンド

| 役割 | 技術 | バージョン | 備考 |
|------|------|----------|------|
| Webフレームワーク | Next.js | 14.x（App Router） | LP、カタログ、各キャラ詳細ページ、会員エリア |
| UIライブラリ | React | 18.x | Next.js付属 |
| スタイリング | Tailwind CSS | 3.x | 既存LPもTailwind想定 |
| アニメーション | Framer Motion | 11.x | 必要に応じて |
| ウォレット接続 | wagmi + viem | wagmi v2 / viem 2.x | MetaMask等のウォレット接続 |
| 言語 | TypeScript | 5.x | 全コードTypeScript |

### 2.2 バックエンド

| 役割 | 技術 | 備考 |
|------|------|------|
| APIフレームワーク | Next.js Route Handlers | Next.js のApp Router内のAPI Routes |
| 重い処理 | Cloudflare Workers + Hono | バッチ処理、Bot処理 |
| データベース | Supabase (PostgreSQL) | 認証もSupabase Auth |
| ストレージ | Supabase Storage | NFTメタデータ画像、ユーザーアップロード |
| メール送信 | Resend | トランザクションメール |
| 動画配信 | Cloudflare Stream | Academy動画 |

### 2.3 ブロックチェーン

| 役割 | 技術 | 備考 |
|------|------|------|
| ブロックチェーン | Polygon (PoS Mainnet) | 本番。テストはMumbai → Amoy |
| NFT規格 | ERC-721 | 標準NFT |
| 通貨 | USDT (Polygon版) | 0xc2132D05D31c914a87C6611C10748AEb04B58e8F |
| スマコン開発 | Foundry | Solidityフレームワーク |
| デプロイ | Foundry + Etherscan API | 自動Verify |

### 2.4 Bot・自動化

| 役割 | 技術 | 備考 |
|------|------|------|
| Telegram Bot | grammY (TypeScript) | 1Bot+DBマルチキャラ管理 |
| LLM API | Anthropic Claude API | Claudeモデル使用（モデル名は環境変数で管理）|
| X (Twitter) 投稿 | X API v2 | OAuth 2.0 |
| note 投稿 | Puppeteer / Playwright（自動化） | note公式APIなし |

### 2.5 ホスティング・インフラ

| 役割 | サービス | 備考 |
|------|---------|------|
| Webアプリ | Cloudflare Pages | Next.js デプロイ |
| Bot/API | Cloudflare Workers | Hono採用、エッジで動かす |
| ユーザー個別HP | Cloudflare Pages（動的サブドメイン） | `[username].claws.openclaw.com` |
| データベース | Supabase Cloud | 有料プラン使用 |
| Cron/バッチ | Cloudflare Workers Cron | 紹介報酬集計、自動投稿 |

### 2.6 スマートコントラクト用ライブラリ

| ライブラリ | 用途 |
|----------|------|
| OpenZeppelin Contracts | ERC-721, AccessControl, Pausable |
| Foundry | テスト・デプロイ |
| Solady | ガス最適化 |

---

## 3. システム全体アーキテクチャ図

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ユーザー（ブラウザ・スマホ）                       │
└────────────────────────────────────────────────────────────────────────┘
        │                    │                  │
        │ Web Access          │ Telegram         │ Wallet Connect
        ▼                    ▼                  ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  Cloudflare      │  │ Telegram        │  │  MetaMask        │
│  Pages           │  │ Bot             │  │  (wagmi)         │
│  (Next.js)       │  │ (grammY)        │  │                  │
│                  │  │                 │  │                  │
│ - LP             │  │ - 30キャラ       │  │ - 接続           │
│ - 30体カタログ    │  │ - 自然言語       │  │ - 署名           │
│ - 各キャラ詳細    │  │ - HP生成指示     │  │ - 購入トランザクション│
│ - 会員エリア      │  │ - SNS投稿指示    │  │                  │
│ - Academy        │  │ - 通知受信       │  │                  │
└──────────────────┘  └─────────────────┘  └──────────────────┘
        │                    │                  │
        ▼                    ▼                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Cloudflare Workers (Hono)                         │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Bot      │  │ HP       │  │ SNS      │  │ Reward   │  │ Push   │  │
│  │ Handler  │  │ Generator│  │ Poster   │  │ Calculator│ │ Notify │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │             Cron Workers (定期実行)                          │     │
│  │  - 紹介報酬日次バッチ                                          │     │
│  │  - SNS自動投稿                                                │     │
│  │  - 動的%再計算                                                │     │
│  │  - レポート生成                                               │     │
│  └──────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────────────────┐
│   Supabase       │              │  Polygon Blockchain          │
│   (PostgreSQL +  │              │                              │
│    Storage +     │              │  - Claws NFT Contract        │
│    Auth)         │              │  - USDT Transfer             │
│                  │              │  - Reward Distribution       │
│  全ユーザーデータ  │              │                              │
│  紹介系図       │              │                              │
│  Bot状態        │              │                              │
│  Academy進捗    │              │                              │
└──────────────────┘              └──────────────────────────────┘
        │
        ▼
┌──────────────────┐
│  Cloudflare      │
│  Stream          │
│  (Academy動画)   │
└──────────────────┘
```

---

## 4. データの流れ（主要シナリオ）

### シナリオ1: ユーザーが Claws を購入する

```
1. ユーザーが紹介者リンクからLPに来る
   URL例: https://openclaw.com/?ref=USER_ID_xxx
   
2. 30体カタログから1体を選ぶ（例: 紅蓮）

3. 「召喚する」ボタンを押す → MetaMask接続

4. ウォレット接続後、購入フロー開始
   a. USDT 300 の支払いを実行
   b. スマコンが NFT を ミント
   c. スマコンが紹介者ティアにオフチェーン記録（バックエンドに通知）

5. バックエンド処理
   a. Supabase に nft_purchases レコード作成
   b. Supabase に referrals レコード作成（3世代まで）
   c. ユーザーに Telegram Bot との連携 URL を発行
   d. メール送信（購入完了 + Bot連携手順）

6. ユーザーがBot連携
   a. Telegramで /start コマンド
   b. ウォレットアドレスで紐付け確認
   c. キャラ（紅蓮）が「主、お会いできて嬉しい」と挨拶

7. 紅蓮との対話開始
```

### シナリオ2: ユーザーが Bot で HP 生成を依頼

```
1. ユーザーが Telegram で：「紅蓮、私のラーメン店のHPを作って」

2. Bot が自然言語を解釈
   a. 意図: HP生成
   b. 業種: ラーメン店
   c. 必要情報: 店名・場所・営業時間・写真

3. Bot が必要情報を質問（紅蓮のキャラトーンで）
   「主、まず店名を教えてくれ」
   「次は場所だ」
   ...

4. ユーザーが情報を返答（複数ターン）

5. 情報が揃ったら、Bot が HP Generator Worker を呼び出す
   POST /api/hp/generate
   {
     userId, characterNo, businessInfo, design
   }

6. HP Generator Worker
   a. Cloudflare Pages にプロジェクトをデプロイ
   b. サブドメイン割当: [username].claws.openclaw.com
   c. Supabase に user_sites レコード作成

7. Bot がユーザーに完成 URL を返す
   「主、お主の店、ここに在り。https://yourname.claws.openclaw.com」
```

### シナリオ3: 紹介報酬の自動分配（日次バッチ）

```
1. Cloudflare Workers Cron が毎日0時（JST）に起動

2. Reward Calculator Worker
   a. 過去24時間の nft_purchases を取得
   b. 各購入について、紹介系図を辿る（最大3世代）
   c. 動的%を計算（紹介人数達成、月間ランキング等）
   d. 各ウォレットへの送金額を確定

3. Distribution Worker
   a. スマコンに送金実行を依頼（バッチ処理）
   b. トランザクション完了を待つ
   c. Supabase に reward_distributions レコード作成

4. Push Notification Worker
   a. 報酬を受け取ったユーザーに通知
   b. Telegram で「主、紹介報酬 30 USDT が振り込まれた」
```

---

## 5. 開発フェーズ（MVP1 / MVP2 / MVP3）

### 5.1 MVP1: 最初の100人を捕まえる（目標期間: 2-3ヶ月）

**目的**: 仁さんの友人ネットワーク経験者層に対して、Clawsを購入してもらえる最小機能セットを揃える。

| 機能 | 実装範囲 |
|------|---------|
| LP・30体カタログ・各キャラ詳細ページ | 既存HTMLをNext.js化 |
| ウォレット接続・USDT決済 | wagmi + Polygon |
| NFTスマコン（ERC-721） | Foundry実装 |
| 紹介者リンク経由の購入導線 | `?ref=USER_ID` |
| 紹介報酬の基本3ティア（30%/10%/5% 固定） | 動的%は MVP2 |
| 紹介者なしの場合は運営にデフォルト紐付け | |
| Telegram Bot 基本機能 | 1キャラとの会話、自然言語応答 |
| 複数Claws所持対応（コロニー画面） | Bot内でキャラ切り替え |
| HP生成（基本機能） | テンプレート3種、Cloudflare Pagesデプロイ |
| プッシュ通知システム（運営→ユーザー） | Telegram経由で配信 |
| Academy「準備中」表示 | LP内にバナー、統合は MVP2 |
| 会員エリア基本（マイページ・購入履歴） | |
| 管理者ダッシュボード（運営者用） | 売上、紹介系図、ユーザー管理 |

**この段階で完成しないもの**:
- 動的%紹介報酬
- X/note自動投稿
- Academy本格統合
- 武器倉庫
- 進化システム
- 受発注ボード

### 5.2 MVP2: 拡散層を取り込む（MVP1から3-6ヶ月後）

**目的**: 100人達成後、拡散層（ペルソナB）を呼び込むための機能拡張。

| 機能 | 実装範囲 |
|------|---------|
| 動的%紹介報酬 | 紹介人数達成、月間ランキング、ティア合計 |
| X自動投稿エンジン | キャラ別トーン30種、スケジュール管理 |
| note自動投稿エンジン | Puppeteer経由 |
| HPカスタマイズ強化 | テンプレート増加、独自ドメイン対応 |
| Academy本格統合（教材コンテンツ） | Bot がフレーズ集を教える |
| Academy 動画コンテンツ（無料部分） | Cloudflare Stream |
| Academy Zoomウェビナー予約システム | Calendly連携 |
| コロニー画面の強化 | キャラ間チャット、関係性可視化 |
| 月間ランキングダッシュボード | 上位紹介者表彰 |

### 5.3 MVP3: エコシステム化（MVP2から6-12ヶ月後）

**目的**: ユーザー間取引・カスタマイズで自走するプラットフォームへ。

| 機能 | 実装範囲 |
|------|---------|
| 武器倉庫（GitHub連携） | プラグインシステム実装 |
| オープンソース武器（無料） | コミュニティ提供 |
| 有料武器（仁さん製・他開発者製） | 売上の一部を仁さん・紹介者に配分 |
| 武器の紹介報酬システム | 既存3ティアに連動 |
| コミュニティ受発注ボード | 既存Academy仕様を流用 |
| 進化システム（ベビー〜レジェンド5段階） | 30体×5 = 150ビジュアル統合 |
| キャラ間コラボ機能 | 複数Clawsで協業 |
| API公開（外部開発者向け） | プラットフォーム化 |

---

## 6. リポジトリ構造

### 6.1 リポジトリ戦略

選択肢C採用：既存 `dlc` リポジトリをコピーして `openclaw-platform` に改名。Academy機能のコードは流用、新機能を追加していく。

```bash
# 推奨手順（運営者がCloudFlare上で実施）
1. https://github.com/jinjinsansan/dlc を fork または clone
2. https://github.com/jinjinsansan/openclaw-platform として新規リポジトリ作成
3. ファイルを openclaw-platform にコミット
4. 既存の dlc リポジトリは Academy 専用として残す（参照用）
```

### 6.2 ディレクトリ構造（最終形）

```
openclaw-platform/
├── README.md
├── SPECS/                          # 仕様書集約
│   ├── SPEC-00-overview.md         # 本ドキュメント
│   ├── SPEC-01-database.md
│   ├── SPEC-02-nft-contract.md
│   ├── SPEC-03-referral-rewards.md
│   ├── SPEC-04-telegram-bot.md
│   ├── SPEC-05-hp-generator.md
│   ├── SPEC-06-sns-poster.md
│   ├── SPEC-07-lp-purchase.md
│   ├── SPEC-08-push-notification.md
│   ├── SPEC-09-academy.md
│   ├── SPEC-10-weapon-vault.md
│   └── SPEC-11-deploy-ops.md
│
├── apps/
│   ├── web/                        # Next.js Webアプリ
│   │   ├── src/
│   │   │   ├── app/                # App Router
│   │   │   │   ├── (marketing)/   # LP、30体カタログ、各キャラ詳細
│   │   │   │   ├── (members)/     # 会員エリア
│   │   │   │   ├── (admin)/       # 管理者エリア
│   │   │   │   ├── (academy)/     # Academy統合（MVP2以降）
│   │   │   │   └── api/           # Route Handlers
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   ├── public/
│   │   │   ├── claws/              # 30体PNG画像
│   │   │   └── ...
│   │   ├── package.json
│   │   └── next.config.mjs
│   │
│   ├── bot/                        # Telegram Bot (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── handlers/           # コマンド・メッセージハンドラ
│   │   │   ├── characters/         # 30体のキャラ別ロジック
│   │   │   ├── lib/
│   │   │   └── index.ts
│   │   ├── wrangler.toml
│   │   └── package.json
│   │
│   ├── workers/                    # その他のCloudflare Workers
│   │   ├── hp-generator/
│   │   ├── sns-poster/
│   │   ├── reward-calculator/
│   │   ├── push-notification/
│   │   └── crons/
│   │
│   └── contracts/                  # Foundryプロジェクト
│       ├── src/
│       │   ├── ClawsNFT.sol
│       │   ├── RewardDistributor.sol
│       │   └── interfaces/
│       ├── test/
│       ├── script/
│       └── foundry.toml
│
├── packages/                       # 共通ライブラリ
│   ├── shared/                     # 型定義、定数
│   ├── db/                         # Supabase クライアント、型
│   └── characters/                 # 30体のキャラ定義（共通）
│
├── docs/                           # ドキュメント
│   ├── architecture/
│   ├── operations/
│   └── design/
│
├── .github/
│   └── workflows/                  # CI/CD
│
├── package.json                    # ルートpackage.json (workspaces)
├── turbo.json                      # Turborepo設定
└── pnpm-workspace.yaml             # pnpm workspaces
```

### 6.3 モノレポ構成

`pnpm + Turborepo` でモノレポ管理。理由：
- フロント、Bot、Workersで共通の型を共有
- 30体キャラ定義を一箇所で管理
- ビルド最適化

---

## 7. 環境変数（全体）

実装時に必要な環境変数の総覧。詳細は SPEC-11 で定義する。

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Polygon / NFT
NEXT_PUBLIC_POLYGON_RPC_URL=
PRIVATE_KEY_DEPLOYER=                      # スマコンデプロイ用（HOTウォレット）
PRIVATE_KEY_REWARD_DISTRIBUTOR=            # 報酬分配用（権限分離）
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS=
NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=

# Anthropic Claude
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=                            # 例: claude-sonnet-4-6 (実装時の最新を使用)

# X (Twitter)
X_API_KEY=
X_API_SECRET=

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_PAGES_PROJECT_NAME=
CLOUDFLARE_STREAM_API_TOKEN=

# Resend (Email)
RESEND_API_KEY=

# Stripe (Academy用、MVP2以降)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Admin
ADMIN_DEFAULT_REFERRER_ID=                 # 紹介者なしの場合のデフォルト紐付け先
ADMIN_TELEGRAM_USER_ID=                    # 仁さんのTelegram ID
ADMIN_EMAIL=

# その他
NEXT_PUBLIC_APP_URL=                       # https://openclaw.com
NEXT_PUBLIC_APP_DOMAIN=                    # openclaw.com
NODE_ENV=                                   # development / staging / production
```

---

## 8. ブランド規約・命名規則

### 8.1 ブランド表記

- 正式名称: **OPENCLAW Platform**
- 短縮: **OPENCLAW** または **OpenClaw**
- ロゴ表記: 全角全大文字「OPENCLAW」
- カラー（CSS変数）:
  ```css
  --bg-deep: #080202;
  --bg-mid: #1a0808;
  --red-blood: #8b0000;
  --red-bright: #d10202;
  --red-flame: #ff1f1f;
  --gold: #c9a961;
  --gold-bright: #e8c878;
  --text-main: #f0e6d6;
  --text-dim: #a89c8b;
  --text-mute: #6b5d50;
  --border-faint: rgba(201, 169, 97, 0.2);
  ```

### 8.2 30体のキャラクター（Claws）

各キャラの正式名称と内部識別子は以下の通り。**変更してはならない**。

| No. | 漢字名 | 英字名（内部ID） | タイプ |
|-----|--------|-----------------|--------|
| 01 | 紅蓮 | GUREN | 悪魔・炎 |
| 02 | 氷晶 | HYOSHO | 悪魔・氷 |
| 03 | 闇影 | YAMIKAGE | 悪魔・闇 |
| 04 | 雷神 | RAIJIN | 神様・雷 |
| 05 | 風神 | FUJIN | 神様・風 |
| 06 | 大黒天 | DAIKOKU | 神様・富 |
| 07 | 狼牙 | ROGA | 野生・月光 |
| 08 | 熊嵐 | KUMAARASHI | 野生・大地 |
| 09 | 鷹眼 | TAKAME | 野生・天空 |
| 10 | 鋼鉄 | KOTETSU | ロボット・鋼 |
| 11 | 電光 | DENKO | ロボット・電光 |
| 12 | 量子 | QUANTUM | ロボット・量子 |
| 13 | 武一 | TAKEICHI | 人間・義 |
| 14 | 商太 | SHOTA | 人間・商 |
| 15 | 学 | MANABU | 人間・知 |
| 16 | 月読 | TSUKUYOMI | 女神・月光 |
| 17 | 弁天 | BENTEN | 女神・芸術 |
| 18 | 観音 | KANNON | 女神・慈悲 |
| 19 | 紅唇 | KOSHIN | 小悪魔・誘惑 |
| 20 | 黒猫 | KURONEKO | 小悪魔・気まぐれ |
| 21 | 妖精 | YOSEI | 小悪魔・神秘 |
| 22 | 桃兎 | MOMOUSA | ふわふわ・癒し |
| 23 | 雪羊 | YUKIHITSUJI | ふわふわ・雪 |
| 24 | 花栗鼠 | HANARISU | ふわふわ・春 |
| 25 | 真珠 | SHINJU | コンシェルジュ・真珠 |
| 26 | 翡翠 | HISUI | コンシェルジュ・翡翠 |
| 27 | 紫水晶 | SHISUI | コンシェルジュ・紫水晶 |
| 28 | 葵 | AOI | 友人・青空 |
| 29 | 茜 | AKANE | 友人・夕焼け |
| 30 | 菫 | SUMIRE | 友人・紫陽花 |

各キャラの詳細データ（プロフィール、口調、業種、5つの盟約等）は `packages/characters/` に統一管理する。詳細は SPEC-04（Telegram Bot）で定義する。

### 8.3 ファイル名・URL命名規則

```
# 各キャラの画像ファイル名（既存資産を流用）
01: openclaw_demon_01.png
02: 02_hyosho.png
03: 03_yamikage.png
...
30: 30_sumire.png

# 各キャラ詳細ページの URL
/claws/01-guren
/claws/02-hyosho
/claws/03-yamikage
...
/claws/30-sumire

# ユーザー個別HP
https://[username].claws.openclaw.com
```

---

## 9. 重要なビジネスルール

### 9.1 NFT = ライセンスキー の原則

- ユーザーが Claws NFT を保有している間のみ、Bot機能・HP生成・SNS投稿等のサービスを利用できる
- NFTを売却した場合、関連する全機能は **24時間以内** に停止する
- 停止判定は、毎日のCronで NFT保有状態を Polygon ノードから確認する
- 停止された場合、ユーザーのHPは「サービス停止中」と表示される（削除はしない、買い直しで復活）
- ユーザーが買い直した場合、即座に機能復活する

### 9.2 複数所持時のルール

- 1ユーザー（1ウォレット）が複数の Claws を所持できる
- Bot内のコロニー画面で、所持しているキャラを切り替え可能
- HP生成は、各キャラごとに1つのHPまで（1Claw = 1HP）
- 同じキャラを複数所持した場合、HPは最初の1体に紐付く（追加分はバックアップ的扱い）

### 9.3 紹介者ルール

- LP は 紹介者リンク（`?ref=USER_ID`）経由で訪問可能
- 紹介者リンクなしで来訪した場合、ブラウザクッキーに `default_referrer` を設定し、運営者（仁さん）の USER_ID を割り当てる
- 紹介者リンクは購入後30日間クッキーに保持（その間に購入すれば紹介者の報酬対象）
- 一度購入したユーザーは、自分の紹介者リンクが自動発行される（マイページで確認可能）

### 9.4 紹介報酬の構造（MVP1）

```
直紹介者（1世代上）: 30%
2世代上: 10%
3世代上: 5%
運営取り分: 55%
合計: 100%

MVP1では固定%。動的%（人数達成ボーナス、月間ランキング等）は MVP2で実装。
```

### 9.5 Academy アクセスルール

- MVP1 では Academy ページに「準備中」表示
- Bot は MVP1 から Academy 教材内容（フレーズ集等）を **無料で** ユーザーに教える
- 100人達成後、Zoomウェビナー（有料）部分のみリリース
- 動画コンテンツ（仁さんが録画したもの）は、MVP1から Bot 経由で順次提供開始
- 全動画一括アクセスは Zoomウェビナー受講者のみ

---

## 10. 開発の進め方（推奨ワークフロー）

### 10.1 開発の優先順位

Claude Code は以下の順番で実装を進める。**前のタスクが完了するまで次に進まない**こと。

```
Phase 1: 基盤整備（Week 1-2）
  1. リポジトリ準備（dlc → openclaw-platform）
  2. モノレポセットアップ（pnpm + Turborepo）
  3. Supabase プロジェクト作成・スキーマ実装（SPEC-01）
  4. 環境変数の整備
  
Phase 2: Web基盤（Week 3-4）
  5. Next.js セットアップ
  6. LP実装（既存HTMLをNext.js化）
  7. 30体カタログ実装
  8. 各キャラ詳細ページ実装（30個）
  9. ウォレット接続UI実装

Phase 3: NFT・購入フロー（Week 5-6）
  10. ClawsNFT スマコン実装（SPEC-02）
  11. RewardDistributor スマコン実装（SPEC-02）
  12. テスト用デプロイ（Amoy testnet）
  13. 購入フロー実装（SPEC-07）
  14. Webhook・購入完了処理

Phase 4: Telegram Bot（Week 7-8）
  15. Bot プロジェクトセットアップ
  16. 30キャラの基本応答実装（SPEC-04）
  17. ウォレット紐付け
  18. コロニー画面（複数Claw切替）

Phase 5: HP生成（Week 9）
  19. HP Generator Worker実装（SPEC-05）
  20. Cloudflare Pages動的デプロイ
  21. サブドメイン管理

Phase 6: 紹介報酬（Week 10）
  22. 報酬計算ロジック（SPEC-03）
  23. Cron バッチ実装
  24. 報酬送金実行

Phase 7: プッシュ通知 + 運営機能（Week 11）
  25. プッシュ通知システム（SPEC-08）
  26. 管理者ダッシュボード

Phase 8: テスト・統合（Week 12）
  27. E2Eテスト
  28. ステージング環境での総合テスト
  29. ローンチ準備
```

### 10.2 各機能ごとの「完成」の定義

ある機能が「完成」と認められるには、以下を全て満たす必要がある：

1. ユニットテストが書かれている（カバレッジ70%以上）
2. ステージング環境で動作確認済み
3. エラーハンドリングが実装されている
4. ログ出力が適切（Cloudflare Workersなら `console.log` でCloudflare Logs に流れる）
5. ドキュメントが更新されている（READMEまたは該当のSPEC文書）

### 10.3 Claude Code への指示の出し方（運営者向け参考）

仕様書を読み込んで実装させる際、**以下のテンプレート**で指示を出すと精度が高い：

```
[コンテキスト]
- プロジェクト名: OPENCLAW Platform
- 関連仕様書: SPEC-XX-xxx.md
- 既存コード: openclaw-platform リポジトリ

[タスク]
SPEC-XX の セクション Y.Y に記載されている [機能名] を実装してください。

[具体的な要件]
- 〜〜
- 〜〜
- 〜〜

[出力形式]
- 実装するファイル一覧を最初に提示してください
- 影響を受ける既存ファイルがあれば、変更内容を要約してください
- テストコードも含めてください

[禁止事項]
- 仕様書に書かれていない機能を勝手に追加しないでください
- 既存のキャラクター名・色・口調などを変更しないでください
```

---

## 11. セキュリティ・コンプライアンス

### 11.1 セキュリティ要件

- 全ての通信は HTTPS
- Supabase RLS (Row Level Security) を全テーブルで有効化
- スマコンは OpenZeppelin の AccessControl を使い、運営者権限を分離
- 報酬分配用の秘密鍵は HOT walletで管理しつつ、定期的に MultiSig 移行を検討
- 環境変数は GitHubに絶対に commitしない（`.env.example` のみ）
- Telegram Bot Tokenの漏洩監視
- Stripeのシークレットキーは Cloudflare Workers Secretsで管理
- ユーザーデータ（メール・名前等）は Supabase Auth で適切に保護

### 11.2 コンプライアンス（運営者管轄）

技術仕様書としては以下を担保する：

- 紹介報酬の分配履歴を全て Supabase に記録（監査可能）
- 全ての送金トランザクションを Polygon上に記録（公開・検証可能）
- 利用規約・プライバシーポリシーへの同意フロー実装
- 特定商取引法表示ページの実装
- 暗号資産取引に関する注意事項表示

法務面の最終判断は運営者と弁護士が行う。Claude Codeはコード実装でこれをサポートする。

---

## 12. 各SPEC文書への参照

以降の仕様書は以下の通り。各SPECは独立して読めるが、本SPEC-00を前提とする。

| SPEC | タイトル | 概要 |
|------|----------|------|
| SPEC-01 | データベース設計 | Supabase全テーブル定義、リレーション、RLS |
| SPEC-02 | NFT・スマートコントラクト | ClawsNFT, RewardDistributor仕様 |
| SPEC-03 | 紹介報酬システム | 3ティア計算ロジック、動的%、バッチ処理 |
| SPEC-04 | Telegram Bot | 30キャラ別ロジック、コロニー、ウォレット紐付け |
| SPEC-05 | HP生成エージェント | Cloudflare Pages動的デプロイ、テンプレート |
| SPEC-06 | X/note自動投稿エンジン | スケジューラ、キャラ別トーン |
| SPEC-07 | LP・購入フロー | UI/UX、ウォレット接続、購入トランザクション |
| SPEC-08 | プッシュ通知システム | 運営者→ユーザー、配信スケジューラ |
| SPEC-09 | Academy統合 | 既存仕様の参照、教材コンテンツの提供方法 |
| SPEC-10 | 武器倉庫 | プラグインシステム、課金、紹介報酬連動 |
| SPEC-11 | 環境変数・デプロイ・運用 | デプロイ手順、監視、バックアップ |

---

## 13. このプロジェクトの成功定義

### MVP1完成 = 以下の全てが達成された状態

1. ユーザーが LP からウォレット接続して Claws を購入できる
2. 購入時に紹介者の報酬が記録される（分配は日次バッチ）
3. ユーザーが Telegram Bot で自分のClawと会話できる
4. ユーザーが Bot に依頼してHPを生成できる（最低限のテンプレート）
5. NFT保有状態に応じて機能のON/OFFが効く
6. 運営者（仁さん）が管理者ダッシュボードで売上・紹介系図を確認できる
7. 紹介報酬が日次で自動送金される
8. ステージング・本番環境が稼働している
9. 必要なドキュメントが揃っている

### 次の目標

MVP1 完成後、最初の100人を捕まえる。100人達成したら MVP2 開発開始。

---

## 14. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-00**

次のドキュメント: SPEC-01 データベース設計
