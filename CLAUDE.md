# OPENCLAW Platform - Project Guard

> **このファイルは Claude Code が次回以降のセッションで自動的に読むガード文書。**
> このリポジトリで作業する AI / 開発者は、以下の不変制約を絶対に守ること。
> 仕様書 (SPECS/) を最優先の真実として扱い、矛盾を見つけたら必ず確認を求めること。
>
> 最終更新: 2026-04-29（Phase 1 セットアップ）

---

## 🚫 絶対変更禁止（Immutable Constraints）

### A. プロダクト基本仕様
- **サービス名**: OPENCLAW Platform（略称: OPENCLAW / OpenClaw）
- **NFT 価格**: **300 USDT**（変更禁止、Polygon 版 USDT `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`）
- **NFT 規格**: ERC-721 on Polygon Mainnet (Chain ID 137)
- **NFT = ライセンスキー** の原則: 保有時のみ Bot/HP/SNS/Academy が使える、売却で 24 時間以内に停止
- **30 体の Claws**: 名前・番号・カテゴリは確定済み（後述「30 体一覧」参照）

### B. 紹介報酬構造（MVP1 固定、変更禁止）
| 報酬源 (`source_type`) | 直紹介 (gen=1) | 2世代上 (gen=2) | 3世代上 (gen=3) | 運営取り分 |
|---|---|---|---|---|
| **NFT 購入** (`nft_purchase`) | **30%** | **10%** | **5%** | 55% |
| Academy 受講 (`academy_subscription`) [MVP2] | 15% | 5% | 2% | 78% |
| 武器購入 (`weapon_purchase`) [MVP3] | 20% | 7% | 3% | 開発者+運営で残り70% |

- MVP1 では **動的%は絶対に実装しない**（動的%は MVP2 以降）
- 紹介者なし購入時は運営者にデフォルト紐付け（cookie 30日保持）
- 4世代以上は報酬対象外（仁さん承認済み、運営取り分が増える）
- 動的%上限（MVP2 以降）: gen1+gen2+gen3 合計 80% を超えないよう比例縮小

### C. Academy 段階リリース
- **MVP1**: `/academy` ページは「**準備中**」表示のみ。Bot は MVP1 から教材（フレーズ集 Vol.1〜8 約150件）を**無料**でユーザーに提供。
- **MVP2 (100人達成後)**: Zoom ウェビナー（¥150,000）有料リリース、動画・教材・予約システム稼働。
- **MVP3**: コミュニティ・受発注ボード。
- 価格: 動画のみ ¥49,800 / 動画+メール ¥98,000 / Zoom型 ¥150,000 / コミュ月額 ¥2,980〜4,980

### D. ブランド階層
```
OPENCLAW Platform（メインブランド）
  └─ OPENCLAW Academy（補足コンテンツ）
```
- Academy は独立サービスではなく Platform の一部
- 全ての訴求は OPENCLAW Platform を主軸とする

### E. データベース・API 上の不変ルール
- 全テーブルで **RLS（Row Level Security）必須**
- ウォレットアドレスは **小文字統一**（DB 保存時に `toLowerCase()`）
- 紹介系図は **3世代まで**（`referrals.generation IN (1,2,3)`）
- `referral_rewards.source_type` は **MVP1 から固定**（`nft_purchase` / `academy_subscription` / `weapon_purchase`）
- `gender` は MVP1 では `'male' | 'female'` 二択、`'neutral'` 追加は将来検討

### F. 開発フェーズ・スコープ厳守

**MVP1 で実装**:
- LP・30体カタログ・各キャラ詳細30ページ
- ウォレット接続・USDT決済・mintClaw
- ClawsNFT + RewardDistributor (Foundry, OpenZeppelin v5)
- 3ティア固定%紹介報酬（リアルタイム計算 + 0時JST 日次送金バッチ）
- Telegram Bot（30キャラ会話、コロニー、ウォレット紐付け、HP生成マルチターン）
- HP生成（6テンプレート、Cloudflare Pages 動的デプロイ、サブドメイン）
- プッシュ通知（Telegram + メール、ターゲット4種）
- 会員エリア + 管理者ダッシュボード
- NFT 同期 Cron、バックアップ Cron
- Academy「準備中」表示 + Bot 教材無料提供

**MVP1 で実装しない**:
- 動的% / X 自動投稿 / note 自動投稿 / Academy 動画/Zoom 統合 / 武器倉庫
- 進化システム / コミュニティ / 受発注ボード / 月間ランキング
- API 公開 / コロニー強化（キャラ間チャット）/ 独自ドメイン / ステーキング

---

## 📚 仕様書（SPECS/）の役割

すべての SPEC は最優先の真実。各 Phase 着手前に該当 SPEC を**必ず再読**すること。

| SPEC | 内容 | 該当 Phase |
|---|---|---|
| `SPEC-00-overview.md` | プロジェクト全体・技術スタック・MVP定義 | 全 Phase 共通 |
| `SPEC-01-database.md` | Supabase スキーマ・RLS・トリガー | Phase 1-7, 1-8 |
| `SPEC-02-nft-contract.md` | ClawsNFT / RewardDistributor (Foundry) | Phase 3 |
| `SPEC-03-referral-rewards.md` | 報酬計算・日次送金バッチ | Phase 6 |
| `SPEC-04-telegram-bot.md` | 30キャラ Bot・コロニー・トーンガード | Phase 4 |
| `SPEC-05-hp-generator.md` | HP生成・Cloudflare Pages・サブドメイン | Phase 5 |
| `SPEC-06-sns-poster.md` | X/note 自動投稿（MVP2） | MVP2 |
| `SPEC-07-lp-purchase.md` | Web UI・購入フロー・会員エリア | Phase 2, 7 |
| `SPEC-08-push-notification.md` | プッシュ通知・配信キュー | Phase 7 |
| `SPEC-09-academy.md` | Academy 統合（MVP1=準備中、MVP2 で本格） | Phase 1〜MVP2 |
| `SPEC-10-weapon-vault.md` | 武器倉庫（MVP3） | MVP3 |
| `SPEC-11-deploy-ops.md` | 環境変数・デプロイ・運用 | 全 Phase 共通 |

矛盾があれば実装に入らず仁さんに確認。仕様書を勝手に上書きしない。

---

## 🐉 30 体の Claws（変更禁止）

| No | 漢字名 | 英字ID | カテゴリ | 主な業種マッチング |
|----|--------|---------|----------|------------------|
| 01 | 紅蓮 | GUREN | demon | 攻めの集客・ナイト系・ジム・激戦区飲食 |
| 02 | 氷晶 | HYOSHO | demon | 戦況分析・コンサル |
| 03 | 闇影 | YAMIKAGE | demon | 影の差別化・サロン |
| 04 | 雷神 | RAIJIN | god | 神社系・伝統 |
| 05 | 風神 | FUJIN | god | クリエイター・自由業 |
| 06 | 大黒天 | DAIKOKU | god | 飲食・福を呼ぶ商売 |
| 07 | 狼牙 | ROGA | wild | クリエイター・コンサル |
| 08 | 熊嵐 | KUMAARASHI | wild | 飲食・地域コミュニティ |
| 09 | 鷹眼 | TAKAME | wild | 戦略コンサル |
| 10 | 鋼鉄 | KOTETSU | robot | デフォルト・コンサル |
| 11 | 電光 | DENKO | robot | スピード重視 |
| 12 | 量子 | QUANTUM | robot | テック・コンサル |
| 13 | 武一 | TAKEICHI | human | 士業・コンサル |
| 14 | 商太 | SHOTA | human | 飲食・小売 |
| 15 | 学 | MANABU | human | コンサル・クリエイター |
| 16 | 月読 | TSUKUYOMI | goddess | サロン・スピリチュアル・深夜帯 |
| 17 | 弁天 | BENTEN | goddess | サロン・芸術・ハンドメイド |
| 18 | 観音 | KANNON | goddess | サロン・コミュニティ・癒し |
| 19 | 紅唇 | KOSHIN | temptress | サロン・誘惑系 |
| 20 | 黒猫 | KURONEKO | temptress | 飲食・クリエイター |
| 21 | 妖精 | YOSEI | temptress | サロン・神秘 |
| 22 | 桃兎 | MOMOUSA | fluffy | 飲食・サロン・コミュニティ |
| 23 | 雪羊 | YUKIHITSUJI | fluffy | コミュニティ |
| 24 | 花栗鼠 | HANARISU | fluffy | デフォルト・コミュニティ |
| 25 | 真珠 | SHINJU | concierge | サロン・コンサル |
| 26 | 翡翠 | HISUI | concierge | コンサル |
| 27 | 紫水晶 | SHISUI | concierge | サロン・コンサル |
| 28 | 葵 | AOI | friend | 飲食・コミュニティ |
| 29 | 茜 | AKANE | friend | 飲食・コミュニティ |
| 30 | 菫 | SUMIRE | friend | コミュニティ・サロン |

各キャラの口調・性格・5つの盟約・関連キャラは確定済み（`packages/characters/data/<NN>-<romaji>.json` 参照）。  
**勝手に「自然な範囲で」調整しない。** トーンガード（禁止ワード/一人称）違反の応答は再生成する（SPEC-04 §4.3）。

---

## 🎯 技術スタック（変更禁止、SPEC-00 §2 準拠）

| レイヤ | 技術 |
|---|---|
| Web | Next.js 14 App Router + TypeScript 5 + Tailwind 3 + Framer Motion 11 |
| Web3 | wagmi v2 + viem 2 |
| バック軽 | Next.js Route Handlers |
| バック重 | Cloudflare Workers + Hono |
| DB | Supabase (PostgreSQL 15+, RLS必須) |
| チェーン | Polygon Mainnet (137) / テストは Amoy (80002) |
| スマコン | Foundry + OpenZeppelin v5 + Solady |
| Bot | grammY + Anthropic Claude API（モデル: 環境変数 `ANTHROPIC_MODEL`） |
| メール | Resend |
| 動画 | Cloudflare Stream |
| 課金 (JPY) | Stripe |
| モノレポ | pnpm workspaces + Turborepo |

**OpenZeppelin は v5 系で実装する。** v4 系の API（`_exists()`, `_beforeTokenTransfer` 等）は使わず、v5 互換の `_ownerOf()`、`_update()` フック等で書く（仁さん承認 §7-3）。

---

## 🔐 セキュリティ・運用ルール（守り続ける）

### 機密情報
- **絶対に commit しない**: `.env*.local`, `private_keys/*`, `*.pem`, `*.key`, スマコン秘密鍵
- 環境変数の機密度分類は SPEC-11 §2.3 / `.env.example` を参照
- 漏洩疑いがある key は即再生成（Supabase service_role など）

### 仕様運用
- `referral_rewards.source_type` を変更する変更は **MVP2/3 設計時のみ**、SPEC-01 §3.7 を改訂してから着手
- `claws` テーブルの 30 件以外は絶対に追加しない
- 既存の HTML LP デザイン（カラー・フォント・装飾）は基本そのまま Next.js 化、大きく変えない（SPEC-07 §10）

### コーディング
- 全機能にユニットテスト（カバレッジ 70% 以上、SPEC-00 §10.2）
- E2E テストは Phase 3 以降の重要ユーザーフロー（購入・連携・HP生成）に必須
- 「後で書く」は禁句、テストなしでマージしない

---

## 📁 リポジトリ構造（最終形は SPEC-00 §6.2）

```
openclaw-platform/
├── CLAUDE.md (このファイル) ──── 不変制約・ガード文書
├── README.md
├── SPECS/                    ──── 11本の仕様書（最優先の真実）
├── apps/
│   ├── web/                  ──── Next.js (LP/カタログ/会員/管理)
│   ├── bot/                  ──── Telegram Bot [Phase 4]
│   ├── contracts/            ──── Foundry スマコン [Phase 3]
│   └── workers/
│       ├── hp-generator/     ──── [Phase 5]
│       ├── reward-calculator/──── [Phase 6]
│       ├── push-notification/──── [Phase 7]
│       ├── nft-sync/         ──── [Phase 3-6]
│       ├── sns-poster/       ──── [MVP2]
│       └── backup/           ──── [運用フェーズ]
├── packages/
│   ├── characters/           ──── 30体構造化データ
│   ├── shared/               ──── 共通型・定数 [必要時]
│   └── db/                   ──── Supabase クライアント [必要時]
├── supabase/
│   ├── config.toml
│   └── migrations/           ──── スキーマ・RLS・トリガー・関数
├── scripts/                  ──── 抽出・seed スクリプト
├── docs/
│   ├── academy/              ──── SPEC-09 で参照
│   ├── operations/           ──── デプロイ・運用
│   ├── architecture/
│   └── internal/             ──── 内部レビュー用
└── claw元画像＆HTML/          ──── 既存資産
```

---

## ✋ 仕様変更が必要になった時

1. **絶対に独断で変更しない**
2. 影響範囲を全列挙（変更を受ける既存ファイル・既存仕様書）
3. 仁さんに「変更案 + 影響範囲 + 理由 + リスク」を提示
4. 承認後、SPEC を改訂してから実装着手

「仕様書から外れる勝手な実装」「既存のキャラ口調や性格の自然な調整」「セキュリティ省略」「テストなしマージ」「コミット前の機密チェック忘れ」— **これらは全て禁止。**

---

## 仁さんとの合意事項（2026-04-29 キックオフ時点）

- §7-1: `telegram_link_requests` テーブルを SPEC-01 §3.10b として追加
- §7-2: `referral_rewards.source_type` を MVP1 から含める
- §7-3: スマコンは OpenZeppelin v5 互換で実装
- §7-4: dlc リポジトリは A 案で取り込み（Academy専用として残す）
- §7-5: service_role key 即時保護（再生成は仁さん依頼済み）
- §7-6: NFT 売却時の HP 停止は **Routing Worker 方式**（再デプロイ不要）
- §7-7: HP のコンテンツ取得は **`/api/content` 動的取得方式**（毎回ビルド回避）
- §7-8: `bot_sessions.telegram_user_id` UNIQUE で upsert 運用、ブロック→再開時はリセット
- §7-9: 4世代以上は報酬対象外、運営取り分が増える形でOK
- §7-10: note Option B（記事生成→Bot配信→ユーザー手動投稿）、MVP1 では未実装
- §7-11: gender は MVP1 で male/female 二択、`neutral` 追加は将来
- §7-12: `openclaw_lp.html` の `--bg-deep: #08 0202;` 表記揺れは Next.js 化時に修正
- 提案A: Phase 1 最初のタスクとして 30体JSONデータ整備を実施（完了）
- 提案B: `.env.example` を Phase 1 で確定（完了）
- 提案C: `audit_logs` を最初から広めに（管理者アクション/スマコン操作/NFT同期/紹介報酬計算/HP生成・SNS/失敗トランザクション）
- 提案D: CLAUDE.md ガード文書（このファイル）
- 提案E: Polygon Amoy testnet セットアップ手順を `docs/operations/testnet-setup.md` に作成（完了）

---

**🤝 仁さんとの作業ルール（auto-memory にも保存済み）**

- 仕様書を最優先の真実として扱う、矛盾は必ず確認を求める
- 各タスク完了ごとに進捗を報告
- 不明点は途中で必ず確認、独断で進めない
- 影響範囲を必ず提示、後から書き直しを避ける
- 完璧な仕様書 → ブレない実装、早さより確実さ
