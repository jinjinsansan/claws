# SPEC-01: OPENCLAW Platform - データベース設計（Supabase）

> **このドキュメントの位置づけ**: OPENCLAW Platform で使用する Supabase（PostgreSQL）のテーブル定義、リレーション、Row Level Security (RLS) ポリシー、初期データ、インデックス設計を定義する。
> 
> **前提**: SPEC-00 を読んでいること。

---

## 1. データベース全体方針

### 1.1 採用技術

- **DBサービス**: Supabase Cloud（有料プラン: Pro 推奨）
- **DBエンジン**: PostgreSQL 15+
- **認証**: Supabase Auth（Email + Password、将来的に OAuth追加）
- **ストレージ**: Supabase Storage
- **リアルタイム**: Supabase Realtime（コミュニティ機能で使用、MVP2以降）

### 1.2 命名規則

- テーブル名: 複数形・スネークケース（例: `users`, `nft_purchases`, `referral_rewards`）
- カラム名: スネークケース（例: `user_id`, `created_at`）
- 主キー: `id` (UUID v4)
- 外部キー: `[テーブル名単数形]_id`（例: `user_id`, `claw_id`）
- タイムスタンプ: `created_at`, `updated_at`（全テーブル必須）
- 論理削除: `deleted_at` （NULL = 有効、TIMESTAMP = 削除済み）

### 1.3 全テーブルの共通カラム

```sql
-- 全テーブルに以下を含める
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
deleted_at  TIMESTAMPTZ                                  -- 論理削除用、NULLが有効
```

### 1.4 設計原則

1. **全テーブルでRLS（Row Level Security）を有効化**
2. **外部キー制約で整合性を担保**
3. **インデックスは検索パターンに応じて設定**
4. **マイグレーションファイルで管理**（`supabase/migrations/`）
5. **本番でDDL変更する場合は必ずマイグレーション経由**

---

## 2. テーブル一覧（全体俯瞰）

```
【コア（MVP1で必要）】
1.  users                       ユーザー本体（Supabase Auth拡張）
2.  user_wallets                ユーザーのウォレットアドレス
3.  claws                       30体のキャラマスター（変更頻度低）
4.  nft_tokens                  発行済みNFTの管理（NFT = ライセンスキー）
5.  nft_purchases               購入履歴（取引履歴）
6.  referrals                   紹介系図（誰が誰の親か）
7.  referral_rewards            紹介報酬の計算結果
8.  reward_distributions        報酬送金の実行履歴
9.  user_sites                  HP生成で作られたユーザーサイト
10. bot_sessions                Telegram Bot のセッション状態
11. bot_messages                Telegram Bot とのメッセージ履歴
12. push_notifications          運営からのプッシュ通知
13. notification_deliveries     通知の配信履歴
14. admin_users                 管理者（運営者）
15. audit_logs                  監査ログ（重要操作の記録）

【拡張（MVP2以降で必要）】
16. sns_posts                   X/note等のSNS投稿履歴
17. sns_post_schedules          投稿スケジュール
18. character_levels            ユーザー所有Clawsの成長レベル
19. character_relationships     コロニー内のキャラ関係性
20. monthly_rankings            月間紹介ランキング集計
21. dynamic_reward_rates        動的報酬%の計算結果

【Academy（MVP2以降）】
22. academy_videos              動画コンテンツマスター
23. academy_video_progress      ユーザーの視聴進捗
24. academy_materials           教材ファイル
25. academy_phrase_collection   フレーズ集（Bot教育用）
26. academy_subscriptions       Academy受講契約

【コミュニティ（MVP3以降）】
27. community_posts             掲示板投稿
28. community_replies           返信
29. community_likes             いいね
30. job_postings                受発注ボード

【武器倉庫（MVP3以降）】
31. weapons                     武器マスター
32. weapon_purchases            武器購入履歴
33. weapon_installations        武器のClawへの装備
34. weapon_developers           武器開発者（仁さん含む）
```

---

## 3. コアテーブル詳細（MVP1で必要なもの）

### 3.1 users（ユーザー本体）

Supabase Auth が `auth.users` を提供するが、追加の業務情報を持つテーブルとして `public.users` を作成し、`auth.users.id` と1:1でリレーションする。

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,                          -- 表示名（任意）
  avatar_url TEXT,                            -- アバター画像URL
  
  -- Telegram連携
  telegram_user_id BIGINT UNIQUE,             -- TelegramのユーザーID（連携時に保存）
  telegram_username TEXT,                     -- Telegramのユーザー名
  telegram_linked_at TIMESTAMPTZ,             -- 連携完了日時
  
  -- 紹介者情報
  referrer_user_id UUID REFERENCES public.users(id),  -- 紹介者（NULL=直接登録）
  referral_code TEXT UNIQUE NOT NULL,         -- このユーザーの紹介コード（自動生成）
  
  -- 統計（denormalized、定期的に再計算）
  total_claws_count INTEGER NOT NULL DEFAULT 0,         -- 所持Claw総数
  direct_referrals_count INTEGER NOT NULL DEFAULT 0,    -- 直紹介者数
  total_referrals_count INTEGER NOT NULL DEFAULT 0,     -- 3世代までの紹介者総数
  total_rewards_earned NUMERIC(20,6) NOT NULL DEFAULT 0,  -- 累計報酬（USDT）
  
  -- ステータス
  is_active BOOLEAN NOT NULL DEFAULT true,    -- アカウントが有効か
  is_admin BOOLEAN NOT NULL DEFAULT false,    -- 管理者権限
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,         -- 拡張用
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX idx_users_referrer ON public.users(referrer_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_telegram ON public.users(telegram_user_id) WHERE telegram_user_id IS NOT NULL;
CREATE INDEX idx_users_referral_code ON public.users(referral_code);
CREATE UNIQUE INDEX idx_users_email_active ON public.users(email) WHERE deleted_at IS NULL;

-- 紹介コード自動生成のトリガー（後述）
```

**重要なビジネスルール（コードで担保）**:
- `referrer_user_id` が NULL の場合、トリガーで運営者ID（`ADMIN_DEFAULT_REFERRER_ID`）を自動設定
- `referral_code` は新規登録時に自動生成（例: `OPENCLAW-XXXXXX` 形式、6文字英数字）

### 3.2 user_wallets（ユーザーのウォレットアドレス）

1ユーザーが複数ウォレットを持てるようにする（将来の拡張性）。MVP1では1ユーザー1ウォレットを想定。

```sql
CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- ウォレット情報
  wallet_address TEXT NOT NULL,               -- 0xで始まる小文字統一
  chain_id INTEGER NOT NULL DEFAULT 137,      -- Polygon = 137
  
  -- 検証
  is_verified BOOLEAN NOT NULL DEFAULT false, -- 署名検証済みか
  verified_at TIMESTAMPTZ,
  verification_signature TEXT,                -- 検証時の署名
  
  -- メイン判定
  is_primary BOOLEAN NOT NULL DEFAULT true,   -- ユーザーのメインウォレット
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(wallet_address, chain_id)            -- 同じウォレットを別ユーザーが登録不可
);

CREATE INDEX idx_user_wallets_user ON public.user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON public.user_wallets(wallet_address);
```

**ビジネスルール**:
- ウォレットアドレスは小文字に統一（DB保存時にtoLowerCase）
- 1つのウォレットアドレスは1ユーザーにしか紐付けられない
- 署名検証なしのウォレットでは購入できない

### 3.3 claws（30体のキャラクターマスター）

30体のキャラ情報を保持するマスターテーブル。アプリ起動時にシードデータで投入。

```sql
CREATE TABLE public.claws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本情報
  claw_no INTEGER NOT NULL UNIQUE,            -- 1〜30
  name_jp TEXT NOT NULL,                      -- 紅蓮
  name_en TEXT NOT NULL UNIQUE,               -- GUREN（内部識別子）
  name_romaji TEXT NOT NULL,                  -- guren（ファイル名等で使用）
  
  -- 分類
  category TEXT NOT NULL,                     -- demon, god, wild, robot, human, goddess, temptress, fluffy, concierge, friend
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),  -- male/female
  element TEXT NOT NULL,                      -- 炎、氷、闇、雷、風 等
  origin TEXT NOT NULL,                       -- 出自（炎の谷 等）
  
  -- 性格・口調
  personality TEXT NOT NULL,
  first_person TEXT NOT NULL,                 -- 「俺」「私」等
  tone TEXT NOT NULL,
  catchphrase TEXT NOT NULL,
  
  -- ビジネス向けマッチング
  best_for TEXT NOT NULL,                     -- 「攻めの集客／競争市場」等
  industries TEXT[] NOT NULL,                 -- 配列: 業種リスト
  
  -- ビジュアル
  image_filename TEXT NOT NULL,               -- 'openclaw_demon_01.png'
  primary_color TEXT NOT NULL,                -- '#d10202'（CSS color）
  accent_color TEXT NOT NULL,
  
  -- 詳細コンテンツ（JSON形式で保持）
  origin_paragraphs JSONB NOT NULL,           -- ORIGINセクションの段落配列
  dossier JSONB NOT NULL,                     -- DOSSIERの9項目
  your_fate_paragraphs JSONB NOT NULL,        -- YOUR FATEの段落配列
  quote TEXT NOT NULL,                        -- キャラの引用台詞
  daily_routine JSONB NOT NULL,               -- A DAY WITHの5シーン配列
  oaths JSONB NOT NULL,                       -- 5つの盟約
  kinsmen JSONB NOT NULL,                     -- 関連キャラ3体
  
  -- システムプロンプト（Bot用）
  system_prompt TEXT NOT NULL,                -- LLM呼び出し時のシステムプロンプト
  
  -- メタ
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claws_no ON public.claws(claw_no);
CREATE INDEX idx_claws_category ON public.claws(category);
CREATE INDEX idx_claws_gender ON public.claws(gender);
```

**初期データ**: 30体のキャラ情報を `supabase/seed.sql` で投入。データソースは `packages/characters/data/` の各JSONファイル（既に作成済みの `data_part1.json` 〜 `data_part5.json` + 紅蓮データ）。

### 3.4 nft_tokens（発行済みNFTの管理）

オンチェーン上のNFT保有状態をDBにキャッシュする。日次でブロックチェーンと同期する。

```sql
CREATE TABLE public.nft_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- NFT情報
  token_id BIGINT NOT NULL UNIQUE,            -- スマコン上のtokenId
  contract_address TEXT NOT NULL,             -- 通常は固定値（ClawsNFTのアドレス）
  chain_id INTEGER NOT NULL DEFAULT 137,
  
  -- どのキャラか
  claw_id UUID NOT NULL REFERENCES public.claws(id),
  claw_no INTEGER NOT NULL,                   -- 重複保持（クエリ高速化）
  
  -- 所有者
  owner_wallet_address TEXT NOT NULL,         -- 現在の所有者ウォレット
  owner_user_id UUID REFERENCES public.users(id),  -- DBでマッチしたユーザー（nullable: ウォレットだけ持っててDB登録ない場合）
  
  -- 状態
  is_active BOOLEAN NOT NULL DEFAULT true,    -- ライセンスとしてアクティブか（NFT保有 = true）
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 最終のチェーン確認日時
  deactivated_at TIMESTAMPTZ,                 -- ライセンス停止日時（売却検知時）
  
  -- メタデータ
  metadata_uri TEXT,                          -- IPFS or 中央集権URLの tokenURI
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- 初回購入情報
  minted_at TIMESTAMPTZ NOT NULL,
  initial_purchase_id UUID,                   -- nft_purchases.id への参照（cyclic FKは後で追加）
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nft_tokens_owner_wallet ON public.nft_tokens(owner_wallet_address);
CREATE INDEX idx_nft_tokens_owner_user ON public.nft_tokens(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX idx_nft_tokens_claw ON public.nft_tokens(claw_id);
CREATE INDEX idx_nft_tokens_active ON public.nft_tokens(is_active) WHERE is_active = true;
```

**ビジネスルール**:
- NFT を売却された場合、`is_active = false`、`deactivated_at` を設定
- `last_verified_at` は日次バッチで更新
- ユーザーが買い直した場合、`is_active = true` に戻す（同じ token_id）

### 3.5 nft_purchases（購入履歴）

```sql
CREATE TABLE public.nft_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 購入者情報
  user_id UUID NOT NULL REFERENCES public.users(id),
  buyer_wallet_address TEXT NOT NULL,
  
  -- 購入したNFT
  claw_id UUID NOT NULL REFERENCES public.claws(id),
  claw_no INTEGER NOT NULL,
  token_id BIGINT,                            -- mint成功後に埋まる
  nft_token_record_id UUID REFERENCES public.nft_tokens(id),
  
  -- 取引情報
  amount_usdt NUMERIC(20,6) NOT NULL,         -- 300 (USDT)
  transaction_hash TEXT,                      -- Polygon上のtxハッシュ
  block_number BIGINT,
  chain_id INTEGER NOT NULL DEFAULT 137,
  
  -- 紹介者情報（購入時にスナップショット）
  referrer_user_id UUID REFERENCES public.users(id),  -- 直紹介者
  referrer_2_user_id UUID REFERENCES public.users(id), -- 2世代上
  referrer_3_user_id UUID REFERENCES public.users(id), -- 3世代上
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending'      -- pending / confirmed / failed / refunded
    CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  
  confirmed_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- メタデータ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nft_purchases_user ON public.nft_purchases(user_id);
CREATE INDEX idx_nft_purchases_status ON public.nft_purchases(status);
CREATE INDEX idx_nft_purchases_created ON public.nft_purchases(created_at DESC);
CREATE INDEX idx_nft_purchases_referrer ON public.nft_purchases(referrer_user_id) WHERE referrer_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_nft_purchases_tx ON public.nft_purchases(transaction_hash) WHERE transaction_hash IS NOT NULL;

-- 後から追加: nft_tokens.initial_purchase_id への外部キー
ALTER TABLE public.nft_tokens
  ADD CONSTRAINT fk_nft_tokens_purchase
  FOREIGN KEY (initial_purchase_id) REFERENCES public.nft_purchases(id);
```

### 3.6 referrals（紹介系図）

紹介関係を記録するテーブル。各ユーザーが直紹介・2世代上・3世代上の誰に紐付いているかを保持。

```sql
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 紹介関係
  referrer_user_id UUID NOT NULL REFERENCES public.users(id),  -- 紹介した側
  referred_user_id UUID NOT NULL REFERENCES public.users(id),  -- 紹介された側
  generation INTEGER NOT NULL CHECK (generation IN (1, 2, 3)), -- 1=直紹介、2=2世代上、3=3世代上
  
  -- 確定タイミング
  confirmed_at TIMESTAMPTZ,                                    -- 被紹介者が初回購入した日時
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(referrer_user_id, referred_user_id, generation)
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_gen ON public.referrals(generation);
```

**重要**:
- 1ユーザーが紹介された時点で、その人の上位3世代分のレコードが3行作られる
- 例: A → B → C → D の系図でDが紹介された場合、Dを起点に C(gen=1), B(gen=2), A(gen=3) の3レコード

### 3.7 referral_rewards（紹介報酬の計算結果）

各購入に対して、誰にいくら報酬が発生するかを記録する。実際の送金は `reward_distributions` で行う。

```sql
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 元になった購入
  nft_purchase_id UUID NOT NULL REFERENCES public.nft_purchases(id),
  
  -- 報酬を受け取るユーザー
  recipient_user_id UUID NOT NULL REFERENCES public.users(id),
  recipient_wallet_address TEXT NOT NULL,
  
  -- 報酬情報
  generation INTEGER NOT NULL CHECK (generation IN (1, 2, 3)),  -- どの世代の報酬か
  rate_percentage NUMERIC(5,2) NOT NULL,                         -- 30.00 / 10.00 / 5.00 等
  amount_usdt NUMERIC(20,6) NOT NULL,                            -- 計算された報酬額
  
  -- 動的%適用情報（MVP1では基本%のみ、MVP2で動的%）
  base_rate_percentage NUMERIC(5,2),                             -- 基本%
  bonus_rate_percentage NUMERIC(5,2) DEFAULT 0,                  -- ボーナス%
  bonus_reason TEXT,                                              -- 'monthly_top3' 等
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'calculated'                       -- calculated / scheduled / sent / failed
    CHECK (status IN ('calculated', 'scheduled', 'sent', 'failed')),
  
  scheduled_for TIMESTAMPTZ,                                       -- 送金予定日時
  
  -- 送金実績（reward_distributions.id への参照）
  distribution_id UUID,                                            -- 送金完了後に埋まる
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_rewards_recipient ON public.referral_rewards(recipient_user_id);
CREATE INDEX idx_referral_rewards_purchase ON public.referral_rewards(nft_purchase_id);
CREATE INDEX idx_referral_rewards_status ON public.referral_rewards(status);
CREATE INDEX idx_referral_rewards_scheduled ON public.referral_rewards(scheduled_for) WHERE status = 'scheduled';
```

### 3.8 reward_distributions（報酬送金の実行履歴）

複数の `referral_rewards` をまとめて送金した実行履歴。

```sql
CREATE TABLE public.reward_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- バッチ情報
  batch_id TEXT NOT NULL,                                          -- 例: 'batch-2026-04-29-001'
  total_recipients INTEGER NOT NULL,                               -- 受取人数
  total_amount_usdt NUMERIC(20,6) NOT NULL,                        -- 総額
  
  -- トランザクション
  transaction_hash TEXT,                                           -- マルチコール or 個別tx
  block_number BIGINT,
  chain_id INTEGER NOT NULL DEFAULT 137,
  
  -- 実行ステータス
  status TEXT NOT NULL DEFAULT 'pending'                            -- pending / sent / confirmed / failed
    CHECK (status IN ('pending', 'sent', 'confirmed', 'failed')),
  
  executed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reward_distributions_status ON public.reward_distributions(status);
CREATE INDEX idx_reward_distributions_created ON public.reward_distributions(created_at DESC);

-- 後から追加: referral_rewards.distribution_id への外部キー
ALTER TABLE public.referral_rewards
  ADD CONSTRAINT fk_referral_rewards_distribution
  FOREIGN KEY (distribution_id) REFERENCES public.reward_distributions(id);
```

### 3.9 user_sites（HP生成で作られたユーザーサイト）

```sql
CREATE TABLE public.user_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 所有者
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claw_id UUID NOT NULL REFERENCES public.claws(id),               -- どのClawが作ったか
  nft_token_id BIGINT NOT NULL,                                     -- 紐付くNFT
  
  -- サイト情報
  subdomain TEXT NOT NULL UNIQUE,                                   -- 'jin-cafe' → jin-cafe.claws.openclaw.com
  custom_domain TEXT UNIQUE,                                        -- カスタムドメイン（MVP2以降）
  
  -- ビジネス情報
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,                                      -- カフェ、コンサル等
  business_description TEXT,
  
  -- デザイン
  template_name TEXT NOT NULL DEFAULT 'default',                    -- 使用テンプレ
  theme_colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- コンテンツ（JSON）
  content JSONB NOT NULL DEFAULT '{}'::jsonb,                       -- HP内のテキスト・画像URL等
  
  -- デプロイ情報
  cloudflare_pages_project_id TEXT,                                 -- CFP上のプロジェクトID
  current_deployment_id TEXT,                                        -- 最新デプロイID
  deployed_at TIMESTAMPTZ,
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'draft'                               -- draft / published / suspended
    CHECK (status IN ('draft', 'published', 'suspended')),
  
  suspended_reason TEXT,                                              -- NFT売却で停止 等
  
  -- 統計
  view_count INTEGER NOT NULL DEFAULT 0,
  last_visited_at TIMESTAMPTZ,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_user_sites_user ON public.user_sites(user_id);
CREATE INDEX idx_user_sites_status ON public.user_sites(status);
CREATE UNIQUE INDEX idx_user_sites_subdomain ON public.user_sites(subdomain) WHERE deleted_at IS NULL;
```

### 3.10 bot_sessions（Telegram Bot のセッション状態）

ユーザーごとの会話状態・選択中のキャラ等を管理。

```sql
CREATE TABLE public.bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ユーザー情報
  user_id UUID REFERENCES public.users(id),                         -- DB上のユーザー（連携済の場合）
  telegram_user_id BIGINT NOT NULL UNIQUE,
  telegram_chat_id BIGINT NOT NULL,                                  -- 1:1チャットIDまたはグループID
  
  -- セッション状態
  active_claw_id UUID REFERENCES public.claws(id),                   -- 現在会話中のClaw
  conversation_state TEXT,                                            -- 'idle' / 'waiting_input' / 'generating_hp' 等
  state_data JSONB DEFAULT '{}'::jsonb,                              -- 状態に応じた追加データ
  
  -- 連携状態
  is_linked BOOLEAN NOT NULL DEFAULT false,                          -- ウォレット連携済みか
  linked_at TIMESTAMPTZ,
  
  -- 直近の活動
  last_message_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_sessions_user ON public.bot_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_bot_sessions_telegram ON public.bot_sessions(telegram_user_id);
```

### 3.11 bot_messages（Telegram Bot とのメッセージ履歴）

```sql
CREATE TABLE public.bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- セッション
  bot_session_id UUID NOT NULL REFERENCES public.bot_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  
  -- メッセージ情報
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),  -- inbound: ユーザー→Bot, outbound: Bot→ユーザー
  active_claw_id UUID REFERENCES public.claws(id),                        -- どのClawとの会話か
  
  -- 内容
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text'                                -- text / image / file
    CHECK (content_type IN ('text', 'image', 'file', 'system')),
  
  -- Telegram固有
  telegram_message_id BIGINT,                                              -- Telegram側のメッセージID
  
  -- LLM呼び出し情報（outboundのみ）
  llm_model TEXT,                                                          -- 例: claude-sonnet-4-6
  llm_tokens_used INTEGER,
  llm_cost_usd NUMERIC(10,6),
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_messages_session ON public.bot_messages(bot_session_id);
CREATE INDEX idx_bot_messages_created ON public.bot_messages(created_at DESC);
CREATE INDEX idx_bot_messages_user_claw ON public.bot_messages(user_id, active_claw_id);
```

### 3.12 push_notifications（運営からのプッシュ通知）

```sql
CREATE TABLE public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 送信者（運営）
  sender_admin_id UUID REFERENCES public.users(id),
  
  -- 通知内容
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL                                  -- announcement / promotion / system / personal
    CHECK (notification_type IN ('announcement', 'promotion', 'system', 'personal')),
  
  -- 配信先指定
  target_type TEXT NOT NULL                                        -- all / specific_users / by_claw / by_tier
    CHECK (target_type IN ('all', 'specific_users', 'by_claw', 'by_tier')),
  target_filter JSONB DEFAULT '{}'::jsonb,                         -- { claw_ids: [...] } 等
  target_user_ids UUID[],                                           -- specific_usersの場合
  
  -- 送信元キャラ（ユーザー側で誰からの通知か）
  from_claw_id UUID REFERENCES public.claws(id),                   -- NULL = 運営からの直接
  
  -- スケジューリング
  scheduled_for TIMESTAMPTZ,                                        -- NULL = 即時送信
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'draft'                              -- draft / scheduled / sending / sent / failed
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  
  sent_at TIMESTAMPTZ,
  
  -- 統計（denormalized）
  total_targets INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_notifications_status ON public.push_notifications(status);
CREATE INDEX idx_push_notifications_scheduled ON public.push_notifications(scheduled_for) WHERE status = 'scheduled';
```

### 3.13 notification_deliveries（通知の配信履歴）

各通知が誰に届いたかの個別記録。

```sql
CREATE TABLE public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- どの通知か
  push_notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  
  -- 配信先
  user_id UUID NOT NULL REFERENCES public.users(id),
  telegram_user_id BIGINT NOT NULL,
  
  -- 配信ステータス
  status TEXT NOT NULL DEFAULT 'pending'                            -- pending / delivered / failed / read
    CHECK (status IN ('pending', 'delivered', 'failed', 'read')),
  
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,                                               -- 既読確認（できれば）
  failed_reason TEXT,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_deliveries_notification ON public.notification_deliveries(push_notification_id);
CREATE INDEX idx_notification_deliveries_user ON public.notification_deliveries(user_id);
CREATE INDEX idx_notification_deliveries_status ON public.notification_deliveries(status);
```

### 3.14 admin_users（管理者・運営者）

```sql
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- 権限レベル
  role TEXT NOT NULL DEFAULT 'admin'                                 -- super_admin / admin / moderator / viewer
    CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer')),
  
  -- 権限詳細（JSON）
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- 監査
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_user ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
```

### 3.15 audit_logs（監査ログ）

重要な操作（管理者操作、報酬送金等）を記録。

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 誰が
  actor_user_id UUID REFERENCES public.users(id),
  actor_type TEXT NOT NULL,                                          -- user / admin / system / cron
  
  -- 何を
  action TEXT NOT NULL,                                              -- 'reward.distribute' / 'user.suspend' 等
  entity_type TEXT,                                                  -- 'user' / 'nft_purchase' 等
  entity_id UUID,                                                    -- 対象のID
  
  -- 詳細
  description TEXT,
  before_data JSONB,                                                 -- 変更前
  after_data JSONB,                                                  -- 変更後
  
  -- 実行コンテキスト
  ip_address INET,
  user_agent TEXT,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
```

---

## 4. RLS（Row Level Security）ポリシー

全テーブルでRLSを有効化する。基本方針：

1. **users自身のデータは本人のみアクセス可**
2. **claws マスターは全員読み取り可**
3. **管理者は全テーブルアクセス可**
4. **RLSは Supabase Auth の `auth.uid()` を基準に判定**

### 4.1 RLS有効化（全テーブル共通）

```sql
-- 全テーブルでRLSを有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
```

### 4.2 共通の管理者チェック関数

```sql
-- 管理者かチェックする関数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- super_adminかチェックする関数
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### 4.3 各テーブルのRLSポリシー（主要なもの）

**users**:
```sql
-- 自分自身は読み取り可
CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- 管理者は全件読み取り可
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

-- 自分自身は更新可（特定カラムのみ。WITH CHECK句で制限）
CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 管理者は更新可
CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- INSERT は Supabase Auth のトリガー経由のみ（後述）
```

**claws** (マスターテーブル、全員読み取り可):
```sql
CREATE POLICY "Anyone can read claws"
  ON public.claws FOR SELECT
  USING (true);

CREATE POLICY "Only super admins can modify claws"
  ON public.claws FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
```

**nft_tokens** (自分の所有NFTのみ読み取り可):
```sql
CREATE POLICY "Users can read own NFTs"
  ON public.nft_tokens FOR SELECT
  USING (
    auth.uid() = owner_user_id
    OR public.is_admin()
  );

-- INSERT/UPDATE は service_role 経由のみ（バックエンドから）
```

**nft_purchases** (自分の購入履歴):
```sql
CREATE POLICY "Users can read own purchases"
  ON public.nft_purchases FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );
```

**referrals** (自分が紹介した・された関係):
```sql
CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT
  USING (
    auth.uid() IN (referrer_user_id, referred_user_id)
    OR public.is_admin()
  );
```

**referral_rewards** (自分の報酬):
```sql
CREATE POLICY "Users can read own rewards"
  ON public.referral_rewards FOR SELECT
  USING (
    auth.uid() = recipient_user_id
    OR public.is_admin()
  );
```

**bot_messages** (自分の会話履歴):
```sql
CREATE POLICY "Users can read own bot messages"
  ON public.bot_messages FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );
```

**audit_logs** (管理者のみ):
```sql
CREATE POLICY "Only admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);  -- service_role経由のみ実質的に挿入される
```

---

## 5. トリガーと関数

### 5.1 updated_at の自動更新

全テーブルに適用する共通トリガー。

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに適用
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 同様に他のテーブルにも...
```

### 5.2 referral_code の自動生成

```sql
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- OPENCLAW-XXXXXX 形式（6文字英数字）
    code := 'OPENCLAW-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    SELECT COUNT(*) INTO exists_count
    FROM public.users WHERE referral_code = code;
    
    IF exists_count = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ユーザー作成時に紹介コードを自動生成
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();
```

### 5.3 紹介者がない場合の運営デフォルト紐付け

```sql
CREATE OR REPLACE FUNCTION public.set_default_referrer()
RETURNS TRIGGER AS $$
DECLARE
  default_referrer_id UUID;
BEGIN
  IF NEW.referrer_user_id IS NULL THEN
    -- 環境変数で指定された運営者IDを取得
    -- 実装では Supabase Edge Function or サーバー側で処理
    -- ここではvault.secretsから取得する想定
    SELECT id INTO default_referrer_id
    FROM public.users
    WHERE email = current_setting('app.admin_default_email', true)
    LIMIT 1;
    
    IF default_referrer_id IS NOT NULL AND NEW.id != default_referrer_id THEN
      NEW.referrer_user_id := default_referrer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_default_referrer
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_default_referrer();
```

**注意**: 上記は概念設計。実際は Edge Function またはアプリケーション層で制御する方が安全。

### 5.4 Supabase Auth のシグナル連動

`auth.users` に新規ユーザーが登録されたら、`public.users` にも自動でレコードを作る。

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 5.5 紹介系図の自動生成

新規ユーザーが登録された時、上位3世代の `referrals` レコードを自動生成。

```sql
CREATE OR REPLACE FUNCTION public.create_referral_chain()
RETURNS TRIGGER AS $$
DECLARE
  current_referrer_id UUID;
  generation_count INTEGER := 1;
BEGIN
  current_referrer_id := NEW.referrer_user_id;
  
  WHILE current_referrer_id IS NOT NULL AND generation_count <= 3 LOOP
    INSERT INTO public.referrals (referrer_user_id, referred_user_id, generation)
    VALUES (current_referrer_id, NEW.id, generation_count)
    ON CONFLICT (referrer_user_id, referred_user_id, generation) DO NOTHING;
    
    -- 上位の紹介者を取得
    SELECT referrer_user_id INTO current_referrer_id
    FROM public.users
    WHERE id = current_referrer_id;
    
    generation_count := generation_count + 1;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_referral_chain
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_chain();
```

---

## 6. インデックス戦略

### 6.1 重要なクエリパターン

```
1. ユーザーの所有Claw一覧取得
   → nft_tokens.owner_user_id にインデックス（既に作成済み）

2. ある購入の紹介者を3世代まで遡る
   → users.referrer_user_id にインデックス（既に作成済み）

3. 月間ランキング集計
   → nft_purchases.created_at + status='confirmed' に複合インデックス
   → CREATE INDEX idx_nft_purchases_monthly ON public.nft_purchases(created_at DESC, status) WHERE status = 'confirmed';

4. 未送金の報酬一覧
   → referral_rewards.status, scheduled_for に複合インデックス
   → CREATE INDEX idx_rewards_pending ON public.referral_rewards(status, scheduled_for) WHERE status IN ('calculated', 'scheduled');

5. 通知の未配信一覧
   → notification_deliveries.status='pending'

6. ユーザーの最新Bot会話
   → bot_messages(bot_session_id, created_at DESC) - すでに created_at インデックスあり
```

---

## 7. 初期データ（seed.sql）

### 7.1 30体のキャラクターデータ投入

`packages/characters/data/` の各JSONファイル（既に `data_part1.json` 〜 `data_part5.json` + 紅蓮データ）を読み込んで `claws` テーブルに投入する。

実装の流れ（マイグレーション or スクリプト）:

```typescript
// scripts/seed-claws.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CHARACTER_FILES = [
  './packages/characters/data/guren.json',
  './packages/characters/data/data_part1.json',
  './packages/characters/data/data_part2.json',
  './packages/characters/data/data_part3.json',
  './packages/characters/data/data_part4.json',
  './packages/characters/data/data_part5.json',
];

async function seedClaws() {
  for (const file of CHARACTER_FILES) {
    const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const characters = Array.isArray(content) ? content : [content];
    
    for (const char of characters) {
      const { data, error } = await supabase
        .from('claws')
        .upsert({
          claw_no: parseInt(char.no),
          name_jp: char.jp,
          name_en: char.en,
          name_romaji: char.image.replace(/\.png$/, '').replace(/^\d+_/, ''),
          // ... 他のフィールド
        }, { onConflict: 'claw_no' });
      
      if (error) console.error(`Error seeding ${char.jp}:`, error);
      else console.log(`Seeded: ${char.jp}`);
    }
  }
}

seedClaws();
```

### 7.2 運営者（仁さん）の管理者登録

```sql
-- 運営者のユーザーレコードが既に存在する前提
-- 紹介者なしで登録 → 自分自身が運営者なので referrer_user_id は自分のIDか NULL

-- 管理者として登録
INSERT INTO public.admin_users (user_id, role, granted_at)
SELECT id, 'super_admin', NOW()
FROM public.users
WHERE email = (SELECT current_setting('app.admin_default_email'))
ON CONFLICT DO NOTHING;
```

---

## 8. バックアップ・リカバリ

### 8.1 自動バックアップ

- Supabase Pro プランの自動バックアップ機能を有効化（毎日）
- 30日間のポイントインタイムリカバリ（PITR）保持

### 8.2 重要データの追加バックアップ

- 日次で `nft_tokens`, `nft_purchases`, `referrals`, `referral_rewards` を CSV エクスポートし、別ストレージ（AWS S3 等）に保管
- Cloudflare Workers Cron で実行

### 8.3 災害復旧手順

詳細は SPEC-11 で定義。基本方針:
1. Supabase のリストアを実行
2. 環境変数を再設定
3. Vercel/Cloudflare Pages を再デプロイ
4. Cloudflare Workers Cron を再起動

---

## 9. マイグレーション管理

### 9.1 ディレクトリ構造

```
supabase/
├── config.toml
├── migrations/
│   ├── 20260429000000_initial_schema.sql      # 初期テーブル作成
│   ├── 20260429000001_rls_policies.sql        # RLSポリシー
│   ├── 20260429000002_triggers.sql            # トリガー
│   ├── 20260429000003_functions.sql           # 関数
│   └── 20260429000004_seed_admin.sql          # 管理者シード
├── seed.sql                                    # キャラクターシード（CIで実行）
└── ...
```

### 9.2 実行コマンド

```bash
# ローカルで開発
npx supabase start
npx supabase migration new <migration_name>
npx supabase db reset

# 本番にプッシュ
npx supabase db push --linked
```

---

## 10. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-01 データベース設計
- 対象: Supabase スキーマ実装

[タスク]
SPEC-01 に記載されている Supabase のスキーマを実装してください。

[具体的な要件]
- supabase/migrations/ 配下にマイグレーションファイルを作成
- 各テーブルを SPEC-01 の通りに作成
- 全テーブルで RLS を有効化
- ポリシー、トリガー、関数を全て実装
- 30体のキャラクターデータを seed.sql で投入

[出力形式]
- 各マイグレーションファイル
- 動作確認のテストSQLクエリ
- README.md（マイグレーション実行手順）

[禁止事項]
- スキーマ定義を仕様書から逸脱させない
- カラム名・テーブル名を勝手に変えない
- 30体のキャラ名・順番を絶対に変えない
```

---

## 11. テスト方針

### 11.1 ユニットテスト

各関数・トリガーに対するテストSQL：

```sql
-- 紹介系図が正しく作られるかのテスト
DO $$
DECLARE
  user_a_id UUID;
  user_b_id UUID;
  user_c_id UUID;
BEGIN
  -- A -> B -> C の系図を作る
  INSERT INTO public.users (email) VALUES ('a@test.com') RETURNING id INTO user_a_id;
  INSERT INTO public.users (email, referrer_user_id) VALUES ('b@test.com', user_a_id) RETURNING id INTO user_b_id;
  INSERT INTO public.users (email, referrer_user_id) VALUES ('c@test.com', user_b_id) RETURNING id INTO user_c_id;
  
  -- C の上位3世代に正しいreferralsが作られているか
  ASSERT (SELECT COUNT(*) FROM public.referrals WHERE referred_user_id = user_c_id) = 2,
    'Expected 2 referrals for user C';
END $$;
```

### 11.2 RLSテスト

各RLSポリシーに対して、認証済み・未認証で正しく動作するかをテスト：

```typescript
// tests/rls.test.ts
import { createClient } from '@supabase/supabase-js';

test('User can only read own data', async () => {
  // ユーザーAでログイン
  const supabaseA = createClient(url, anonKey);
  await supabaseA.auth.signInWithPassword({ email: 'a@test.com', password: '...' });
  
  // ユーザーAが自分のデータを取得できる
  const { data: ownData } = await supabaseA.from('users').select('*');
  expect(ownData).toHaveLength(1);
  
  // ユーザーAが他人のデータを取得できない
  const { data: otherData } = await supabaseA
    .from('users')
    .select('*')
    .eq('email', 'b@test.com');
  expect(otherData).toHaveLength(0);
});
```

---

## 12. パフォーマンス考慮

### 12.1 想定するスケール

```
MVP1の想定値:
  ユーザー数: 100人
  NFT発行数: 100〜500
  Bot会話数/日: 1,000メッセージ
  
MVP2/3:
  ユーザー数: 1,000〜10,000人
  NFT発行数: 数千
  Bot会話数/日: 10,000〜100,000メッセージ
```

### 12.2 想定スループット

- nft_purchases: ピーク時 10件/分
- bot_messages: ピーク時 100件/分
- referral_rewards: 日次バッチで一気に挿入

### 12.3 最適化の方向性

1. **クエリ最適化**: 全クエリに対応するインデックスを設定
2. **集計のキャッシュ**: 月間ランキング等は集計テーブル（`monthly_rankings`）に事前計算
3. **古いデータのアーカイブ**: 1年以上前の `bot_messages` は別テーブルに退避
4. **Connection Poolの設定**: Supabase の transaction modeを使用

---

## 13. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-01**

次のドキュメント: SPEC-02 NFT・スマートコントラクト
