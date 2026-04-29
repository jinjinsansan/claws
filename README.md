# OPENCLAW Platform

世界初、ザリガニ型 AI エージェント NFT「Claws」を中心とした、日本人個人事業主・副業希望者向けの集客支援＆学習エコシステム。

## ⚠️ Important: Read First

このリポジトリで作業する前に、以下を必ず確認してください：

1. **[`CLAUDE.md`](./CLAUDE.md)** — 不変制約のガード文書（30体キャラ、報酬率、価格、Academy方針）
2. **[`SPECS/SPEC-00-overview.md`](./SPECS/SPEC-00-overview.md)** — プロジェクト全体像
3. **`.env.example`** をコピーして `.env.local` を作成（機密値は実値、git には絶対 commit しない）

## プロジェクト構造

```
openclaw-platform/
├── SPECS/                          # 11本の技術仕様書（最優先の真実）
├── apps/
│   ├── web/                        # Next.js 14 - LP・カタログ・会員・管理
│   ├── bot/                        # Telegram Bot (grammY + Cloudflare Workers) [Phase 4]
│   ├── contracts/                  # Foundry スマコン (ClawsNFT, RewardDistributor) [Phase 3]
│   └── workers/                    # Cloudflare Workers
│       ├── hp-generator/           # [Phase 5]
│       ├── reward-calculator/      # [Phase 6]
│       ├── push-notification/      # [Phase 7]
│       ├── nft-sync/               # [Phase 3-6]
│       ├── sns-poster/             # [MVP2]
│       │   └── legacy/python-scripts/  # dlc 由来の参考実装
│       └── backup/                 # [運用フェーズ]
├── packages/
│   ├── characters/                 # 30体 Claws の構造化データ
│   ├── shared/                     # 横断的型・定数 [必要時]
│   └── db/                         # Supabase クライアント・型 [必要時]
├── supabase/                       # マイグレーション・seed [Phase 1-7]
├── scripts/
│   └── extract-characters.py       # 30HTML → 30JSON 機械抽出
├── docs/
│   ├── academy/                    # SPEC-09 で参照する Academy 仕様
│   ├── operations/                 # デプロイ・運用ドキュメント
│   ├── architecture/               # アーキテクチャ図
│   └── internal/                   # 内部レビュー用（gender 表など）
└── claw元画像＆HTML/                # 既存資産（30 PNG + 30 HTML + LP HTML）
```

## 開発フェーズ

| Phase | 内容 | 期間目安 |
|---|---|---|
| **MVP1**（現在） | LP、決済、NFT、Bot基本、HP生成、紹介報酬3ティア固定 | 2-3ヶ月 |
| MVP2 | 動的%、X/note自動投稿、Academy本格、ランキング | 3-6ヶ月後 |
| MVP3 | 武器倉庫、進化システム、コミュニティ、API公開 | 6-12ヶ月後 |

## セットアップ

### 必要要件

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Python >= 3.10（30体抽出スクリプト用）

### 初期セットアップ

```bash
# 1. 依存関係インストール
pnpm install

# 2. 環境変数
cp .env.example .env.local
# .env.local を編集（実値を入れる）

# 3. 30体キャラクターデータ抽出（既に整備済みなら不要）
pnpm extract:characters

# 4. Supabase ローカル起動（オプション）
# pnpm supabase start  # Phase 1-7 後に有効化

# 5. Web アプリ起動
pnpm --filter @openclaw/web dev
```

## モノレポ操作

```bash
# 全 workspace で実行
pnpm build      # 全パッケージビルド
pnpm typecheck  # 全パッケージ型チェック
pnpm lint
pnpm test

# 特定 workspace で実行
pnpm --filter @openclaw/web dev
pnpm --filter @openclaw/web build
```

## ライセンス

Private. © 2026 OPENCLAW Platform
