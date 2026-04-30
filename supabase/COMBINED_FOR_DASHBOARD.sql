-- ============================================================================
-- OPENCLAW Platform - Combined Migration for Supabase Dashboard SQL Editor
-- ============================================================================
-- このファイルは丸ごとコピー → SQL Editor に貼り付け → Run で 1 トランザクション適用できる形に統合した
-- supabase/migrations/ の 4 ファイルの結合版です。
--
-- 適用手順:
--   1. https://supabase.com/dashboard/project/edhygdpzdzanojdllvox/sql/new を開く
--   2. このファイル全体を選択してコピー (Ctrl+A → Ctrl+C)
--   3. SQL Editor に貼り付け (Ctrl+V)
--   4. 右下 Run ボタン または Ctrl+Enter で実行
--   5. 「Success. No rows returned」が表示されれば成功
--   6. 末尾の Verification セクションで作成数を確認
--
-- 内訳（順序は依存関係順、変更しないこと）:
--   PART 1: 拡張 + 16 テーブル + インデックス + 外部キー
--   PART 2: ヘルパー関数 (is_admin, set_updated_at, generate_*)
--   PART 3: トリガー (updated_at, referral chain, auth sync, default referrer)
--   PART 4: Row Level Security ポリシー
--   PART 5: 検証クエリ（コメントアウト、必要なら個別実行）
--
-- やり直したい場合（全部削除して再実行）:
--   末尾の "TEARDOWN (rollback)" セクションを参考にしてください。
-- ============================================================================


-- ============================================================================
-- PART 1: 初期スキーマ (initial_schema.sql)
-- ============================================================================
-- =============================================
-- OPENCLAW Platform - Initial Schema (MVP1)
-- =============================================
-- 仕様書: SPEC-01 §3 を準拠源とする。
-- 仁さん承認済みの追加変更:
--   §7-1: telegram_link_requests を §3.10b として追加
--   §7-2: referral_rewards.source_type を最初から含める（DEFAULT 'nft_purchase'）
--   §7-2追加: academy_subscription_id, weapon_purchase_id も最初から含める
--             （MVP2/3 のマイグレーション工数を削減）
--   提案C: audit_logs に紹介報酬計算ログ・HP生成/SNS投稿ログ・失敗トランザクションも記録
--
-- 命名規則（SPEC-01 §1.2）:
--   テーブル: 複数形・スネークケース
--   カラム: スネークケース
--   主キー: id (UUID v4)
--   外部キー: <表名単数形>_id
--   タイムスタンプ: created_at, updated_at（全テーブル必須）
--   論理削除: deleted_at（NULL=有効、TIMESTAMP=削除済み）
-- =============================================

-- ---------- 拡張 ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()


-- =============================================
-- §3.1 users（ユーザー本体）
-- =============================================
-- Supabase Auth の auth.users と 1:1。
-- 紹介系図のルート。referral_code は自動生成（Phase 1-8 のトリガー）。

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,

  -- Telegram 連携
  telegram_user_id BIGINT UNIQUE,
  telegram_username TEXT,
  telegram_linked_at TIMESTAMPTZ,

  -- 紹介者情報
  referrer_user_id UUID REFERENCES public.users(id),
  referral_code TEXT UNIQUE NOT NULL,

  -- 統計（denormalized、定期再計算）
  total_claws_count INTEGER NOT NULL DEFAULT 0,
  direct_referrals_count INTEGER NOT NULL DEFAULT 0,
  total_referrals_count INTEGER NOT NULL DEFAULT 0,
  total_rewards_earned NUMERIC(20, 6) NOT NULL DEFAULT 0,

  -- ステータス
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_admin BOOLEAN NOT NULL DEFAULT false,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_referrer ON public.users(referrer_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_telegram ON public.users(telegram_user_id) WHERE telegram_user_id IS NOT NULL;
CREATE INDEX idx_users_referral_code ON public.users(referral_code);
CREATE UNIQUE INDEX idx_users_email_active ON public.users(email) WHERE deleted_at IS NULL;


-- =============================================
-- §3.2 user_wallets（ユーザーのウォレットアドレス）
-- =============================================

CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  wallet_address TEXT NOT NULL,                                -- 0x... 小文字統一
  chain_id INTEGER NOT NULL DEFAULT 137,                        -- Polygon

  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_signature TEXT,

  is_primary BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (wallet_address, chain_id)
);

CREATE INDEX idx_user_wallets_user ON public.user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON public.user_wallets(wallet_address);


-- =============================================
-- §3.3 claws（30体のキャラクターマスター）
-- =============================================

CREATE TABLE public.claws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  claw_no INTEGER NOT NULL UNIQUE CHECK (claw_no BETWEEN 1 AND 30),
  name_jp TEXT NOT NULL,
  name_en TEXT NOT NULL UNIQUE,
  name_romaji TEXT NOT NULL,

  -- 分類
  category TEXT NOT NULL CHECK (category IN (
    'demon', 'god', 'wild', 'robot', 'human',
    'goddess', 'temptress', 'fluffy', 'concierge', 'friend'
  )),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  element TEXT NOT NULL,
  origin TEXT NOT NULL,

  -- 性格・口調
  personality TEXT NOT NULL,
  first_person TEXT NOT NULL,
  tone TEXT NOT NULL,
  catchphrase TEXT NOT NULL,

  -- ビジネス向けマッチング
  best_for TEXT NOT NULL,
  industries TEXT[] NOT NULL,

  -- ビジュアル
  image_filename TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,

  -- 詳細コンテンツ（JSON）
  origin_paragraphs JSONB NOT NULL,
  dossier JSONB NOT NULL,
  your_fate_paragraphs JSONB NOT NULL,
  quote TEXT NOT NULL,
  daily_routine JSONB NOT NULL,
  oaths JSONB NOT NULL,
  kinsmen JSONB NOT NULL,

  -- システムプロンプト（Bot LLM 用）
  system_prompt TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claws_no ON public.claws(claw_no);
CREATE INDEX idx_claws_category ON public.claws(category);
CREATE INDEX idx_claws_gender ON public.claws(gender);


-- =============================================
-- §3.4 nft_tokens（発行済みNFTの管理）
-- =============================================
-- オンチェーンの所有状態をDBにキャッシュ。日次バッチで同期。

CREATE TABLE public.nft_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  token_id BIGINT NOT NULL UNIQUE,
  contract_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 137,

  claw_id UUID NOT NULL REFERENCES public.claws(id),
  claw_no INTEGER NOT NULL,                                    -- denormalized for query speed

  owner_wallet_address TEXT NOT NULL,
  owner_user_id UUID REFERENCES public.users(id),

  -- 状態
  is_active BOOLEAN NOT NULL DEFAULT true,                     -- ライセンスとして有効か
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,

  metadata_uri TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  minted_at TIMESTAMPTZ NOT NULL,
  initial_purchase_id UUID,                                     -- 後で nft_purchases への FK 追加

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nft_tokens_owner_wallet ON public.nft_tokens(owner_wallet_address);
CREATE INDEX idx_nft_tokens_owner_user ON public.nft_tokens(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX idx_nft_tokens_claw ON public.nft_tokens(claw_id);
CREATE INDEX idx_nft_tokens_active ON public.nft_tokens(is_active) WHERE is_active = true;


-- =============================================
-- §3.5 nft_purchases（購入履歴）
-- =============================================

CREATE TABLE public.nft_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.users(id),
  buyer_wallet_address TEXT NOT NULL,

  claw_id UUID NOT NULL REFERENCES public.claws(id),
  claw_no INTEGER NOT NULL,
  token_id BIGINT,                                             -- mint成功後に埋まる
  nft_token_record_id UUID REFERENCES public.nft_tokens(id),

  amount_usdt NUMERIC(20, 6) NOT NULL,                         -- 300 (USDT固定 in MVP1)
  transaction_hash TEXT,
  block_number BIGINT,
  chain_id INTEGER NOT NULL DEFAULT 137,

  -- 紹介者情報（購入時のスナップショット）
  referrer_user_id UUID REFERENCES public.users(id),
  referrer_2_user_id UUID REFERENCES public.users(id),
  referrer_3_user_id UUID REFERENCES public.users(id),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'failed', 'refunded'
  )),
  confirmed_at TIMESTAMPTZ,
  failed_reason TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nft_purchases_user ON public.nft_purchases(user_id);
CREATE INDEX idx_nft_purchases_status ON public.nft_purchases(status);
CREATE INDEX idx_nft_purchases_created ON public.nft_purchases(created_at DESC);
CREATE INDEX idx_nft_purchases_referrer ON public.nft_purchases(referrer_user_id) WHERE referrer_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_nft_purchases_tx ON public.nft_purchases(transaction_hash) WHERE transaction_hash IS NOT NULL;
-- §6.1 月間ランキング集計用（MVP2 で利用）
CREATE INDEX idx_nft_purchases_monthly ON public.nft_purchases(created_at DESC, status) WHERE status = 'confirmed';

-- 後付け FK: nft_tokens.initial_purchase_id
ALTER TABLE public.nft_tokens
  ADD CONSTRAINT fk_nft_tokens_purchase
  FOREIGN KEY (initial_purchase_id) REFERENCES public.nft_purchases(id);


-- =============================================
-- §3.6 referrals（紹介系図）
-- =============================================
-- 各ユーザーごとに、上位3世代分のレコードが作られる。
-- 例: A→B→C→D の系図で D が登録時、 D を起点に C(gen=1), B(gen=2), A(gen=3) の3行。

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  referrer_user_id UUID NOT NULL REFERENCES public.users(id),
  referred_user_id UUID NOT NULL REFERENCES public.users(id),
  generation INTEGER NOT NULL CHECK (generation IN (1, 2, 3)),

  confirmed_at TIMESTAMPTZ,                                    -- 被紹介者の初回購入日時

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (referrer_user_id, referred_user_id, generation)
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_gen ON public.referrals(generation);


-- =============================================
-- §3.7 referral_rewards（紹介報酬の計算結果）
-- =============================================
-- §7-2: source_type を最初から含める（DEFAULT 'nft_purchase'）。
-- MVP2/3 で academy_subscription / weapon_purchase の報酬源を識別する用。
-- academy_subscription_id / weapon_purchase_id は対応テーブル作成後に外部キー追加。

CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 報酬源（仁さん承認: §7-2 で MVP1 から含める）
  source_type TEXT NOT NULL DEFAULT 'nft_purchase' CHECK (source_type IN (
    'nft_purchase', 'academy_subscription', 'weapon_purchase'
  )),

  -- 各報酬源への参照（NULL 許容、source_type に応じて1つだけ埋まる）
  nft_purchase_id UUID REFERENCES public.nft_purchases(id),
  academy_subscription_id UUID,                                -- MVP2 で academy_subscriptions テーブル作成時に FK 追加
  weapon_purchase_id UUID,                                     -- MVP3 で weapon_purchases テーブル作成時に FK 追加

  -- 整合性: source_type に応じて適切な ID が埋まっているか
  CONSTRAINT chk_referral_rewards_source_id CHECK (
    (source_type = 'nft_purchase'         AND nft_purchase_id IS NOT NULL) OR
    (source_type = 'academy_subscription' AND academy_subscription_id IS NOT NULL) OR
    (source_type = 'weapon_purchase'      AND weapon_purchase_id IS NOT NULL)
  ),

  -- 報酬を受け取るユーザー
  recipient_user_id UUID NOT NULL REFERENCES public.users(id),
  recipient_wallet_address TEXT NOT NULL,

  -- 報酬情報
  generation INTEGER NOT NULL CHECK (generation IN (1, 2, 3)),
  rate_percentage NUMERIC(5, 2) NOT NULL,
  amount_usdt NUMERIC(20, 6) NOT NULL,

  -- 動的%適用情報（MVP1 では基本%のみ、bonus は 0 / NULL）
  base_rate_percentage NUMERIC(5, 2),
  bonus_rate_percentage NUMERIC(5, 2) DEFAULT 0,
  bonus_reason TEXT,

  status TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN (
    'calculated', 'scheduled', 'sent', 'failed'
  )),

  scheduled_for TIMESTAMPTZ,
  distribution_id UUID,                                        -- 後付け FK

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_rewards_recipient ON public.referral_rewards(recipient_user_id);
CREATE INDEX idx_referral_rewards_purchase ON public.referral_rewards(nft_purchase_id) WHERE nft_purchase_id IS NOT NULL;
CREATE INDEX idx_referral_rewards_status ON public.referral_rewards(status);
CREATE INDEX idx_referral_rewards_scheduled ON public.referral_rewards(scheduled_for) WHERE status = 'scheduled';
-- §6.1 未送金一覧用
CREATE INDEX idx_rewards_pending ON public.referral_rewards(status, scheduled_for) WHERE status IN ('calculated', 'scheduled');
-- 報酬源別検索
CREATE INDEX idx_referral_rewards_source ON public.referral_rewards(source_type, status);


-- =============================================
-- §3.8 reward_distributions（報酬送金の実行履歴）
-- =============================================

CREATE TABLE public.reward_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  batch_id TEXT NOT NULL,
  total_recipients INTEGER NOT NULL,
  total_amount_usdt NUMERIC(20, 6) NOT NULL,

  transaction_hash TEXT,
  block_number BIGINT,
  chain_id INTEGER NOT NULL DEFAULT 137,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'confirmed', 'failed'
  )),

  executed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  failed_reason TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reward_distributions_status ON public.reward_distributions(status);
CREATE INDEX idx_reward_distributions_created ON public.reward_distributions(created_at DESC);

-- 後付け FK: referral_rewards.distribution_id
ALTER TABLE public.referral_rewards
  ADD CONSTRAINT fk_referral_rewards_distribution
  FOREIGN KEY (distribution_id) REFERENCES public.reward_distributions(id);


-- =============================================
-- §3.9 user_sites（HP生成で作られたユーザーサイト）
-- =============================================

CREATE TABLE public.user_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claw_id UUID NOT NULL REFERENCES public.claws(id),
  nft_token_id BIGINT NOT NULL,

  subdomain TEXT NOT NULL,                                     -- jin-cafe → jin-cafe.claws.openclaw.com
  custom_domain TEXT UNIQUE,                                    -- MVP2

  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  business_description TEXT,

  template_name TEXT NOT NULL DEFAULT 'default',
  theme_colors JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- §7-7 採用方針: /api/content から JSON 動的取得 → 毎回ビルド回避
  content JSONB NOT NULL DEFAULT '{}'::jsonb,

  cloudflare_pages_project_id TEXT,
  current_deployment_id TEXT,
  deployed_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'suspended'
  )),
  suspended_reason TEXT,                                        -- §7-6: NFT売却時は Routing Worker で stop ページ表示

  view_count INTEGER NOT NULL DEFAULT 0,
  last_visited_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_user_sites_user ON public.user_sites(user_id);
CREATE INDEX idx_user_sites_status ON public.user_sites(status);
CREATE UNIQUE INDEX idx_user_sites_subdomain ON public.user_sites(subdomain) WHERE deleted_at IS NULL;


-- =============================================
-- §3.10 bot_sessions（Telegram Bot のセッション状態）
-- =============================================
-- §7-8 採用方針: /start 時に既存セッションを upsert する運用、
-- ブロック→再開時は既存レコードを再利用してリセット。

CREATE TABLE public.bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES public.users(id),
  telegram_user_id BIGINT NOT NULL UNIQUE,                     -- §7-8: UNIQUE で upsert
  telegram_chat_id BIGINT NOT NULL,

  active_claw_id UUID REFERENCES public.claws(id),
  conversation_state TEXT,                                     -- 'idle' / 'waiting_input' / 'collecting_hp_info' 等
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_linked BOOLEAN NOT NULL DEFAULT false,
  linked_at TIMESTAMPTZ,

  last_message_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_sessions_user ON public.bot_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_bot_sessions_telegram ON public.bot_sessions(telegram_user_id);


-- =============================================
-- §3.10b telegram_link_requests（Telegram 連携リンク要求）
-- =============================================
-- 仁さん承認 §7-1: 購入後発行される Telegram 連携リンク（24時間有効）。
-- code は自動生成（Phase 1-8 のトリガーで tg-link-XXXXXX 形式）。

CREATE TABLE public.telegram_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  code TEXT NOT NULL UNIQUE,                                   -- tg-link-XXXXXX 形式
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_link_user ON public.telegram_link_requests(user_id);
CREATE INDEX idx_telegram_link_active ON public.telegram_link_requests(code) WHERE used = false;


-- =============================================
-- §3.11 bot_messages（Telegram Bot メッセージ履歴）
-- =============================================

CREATE TABLE public.bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bot_session_id UUID NOT NULL REFERENCES public.bot_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),

  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  active_claw_id UUID REFERENCES public.claws(id),

  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN (
    'text', 'image', 'file', 'system'
  )),

  telegram_message_id BIGINT,

  -- LLM 呼び出し情報（outbound のみ）
  llm_model TEXT,
  llm_tokens_used INTEGER,
  llm_cost_usd NUMERIC(10, 6),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_messages_session ON public.bot_messages(bot_session_id);
CREATE INDEX idx_bot_messages_created ON public.bot_messages(created_at DESC);
CREATE INDEX idx_bot_messages_user_claw ON public.bot_messages(user_id, active_claw_id);


-- =============================================
-- §3.12 push_notifications（運営からのプッシュ通知）
-- =============================================

CREATE TABLE public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sender_admin_id UUID REFERENCES public.users(id),

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'announcement', 'promotion', 'system', 'personal'
  )),

  -- 配信先指定
  target_type TEXT NOT NULL CHECK (target_type IN (
    'all', 'specific_users', 'by_claw', 'by_tier'
  )),
  target_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_user_ids UUID[],

  -- 送信元キャラ（NULL = 運営からの直接、設定時はその口調で配信）
  from_claw_id UUID REFERENCES public.claws(id),

  scheduled_for TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'sending', 'sent', 'failed'
  )),
  sent_at TIMESTAMPTZ,

  -- 統計（denormalized、配信完了時に更新）
  total_targets INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_notifications_status ON public.push_notifications(status);
CREATE INDEX idx_push_notifications_scheduled ON public.push_notifications(scheduled_for) WHERE status = 'scheduled';


-- =============================================
-- §3.13 notification_deliveries（通知配信履歴）
-- =============================================

CREATE TABLE public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  push_notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES public.users(id),
  telegram_user_id BIGINT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'delivered', 'failed', 'read'
  )),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_deliveries_notification ON public.notification_deliveries(push_notification_id);
CREATE INDEX idx_notification_deliveries_user ON public.notification_deliveries(user_id);
CREATE INDEX idx_notification_deliveries_status ON public.notification_deliveries(status);


-- =============================================
-- §3.14 admin_users（管理者・運営者）
-- =============================================

CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN (
    'super_admin', 'admin', 'moderator', 'viewer'
  )),

  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,

  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_user ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);


-- =============================================
-- §3.15 audit_logs（監査ログ）
-- =============================================
-- 仁さん承認 提案C 拡張: 以下を最初から記録対象とする。
--   1. 管理者アクション全般
--   2. スマコン操作（pause, setTreasury, distributeBatch 等）
--   3. NFT 同期での is_active 変更
--   4. 紹介報酬の計算ログ
--   5. HP 生成・SNS 投稿のログ
--   6. 失敗したトランザクションの全記録

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 誰が
  actor_user_id UUID REFERENCES public.users(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN (
    'user', 'admin', 'system', 'cron', 'contract'
  )),

  -- 何を
  action TEXT NOT NULL,                                        -- 'reward.distribute' / 'user.suspend' / 'contract.pause' 等
  entity_type TEXT,                                            -- 'user' / 'nft_purchase' / 'reward' 等
  entity_id UUID,

  description TEXT,
  before_data JSONB,
  after_data JSONB,

  -- 実行コンテキスト
  ip_address INET,
  user_agent TEXT,

  -- 結果（成功/失敗の判別、提案C-6 失敗トランザクション記録）
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_failures ON public.audit_logs(created_at DESC) WHERE success = false;


-- =============================================
-- 完了
-- =============================================
-- 全 16 テーブル（MVP1 コア15 + telegram_link_requests）を作成。
-- 次マイグレーション (20260429000001_rls_policies.sql) で RLS を適用する。


-- ============================================================================
-- PART 2: ヘルパー関数 (functions.sql)
-- ============================================================================
-- =============================================
-- OPENCLAW Platform - Helper Functions
-- =============================================
-- SPEC-01 §4.2 / §5 を準拠源とする。
-- 用途別:
--   - is_admin() / is_super_admin(): RLS ポリシーで使用
--   - set_updated_at(): 全テーブルの updated_at 自動更新
--   - generate_referral_code(): users.referral_code 自動生成
--   - generate_telegram_link_code(): telegram_link_requests.code 自動生成（§7-1）
--   - set_default_referrer(): 紹介者なし → 運営にデフォルト紐付け
-- =============================================


-- ---------- 管理者チェック関数 ----------
-- SECURITY DEFINER で、RLS を回避して admin_users を読む。

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$;


-- ---------- updated_at 自動更新 ----------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ---------- referral_code 生成（OPENCLAW-XXXXXX 6文字英数字） ----------
-- 衝突が起きたらリトライ。

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
  max_attempts INTEGER := 100;
  attempt INTEGER := 0;
BEGIN
  LOOP
    attempt := attempt + 1;
    -- MD5 から 6 文字を取って大文字化
    code := 'OPENCLAW-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));

    SELECT COUNT(*) INTO exists_count
    FROM public.users WHERE referral_code = code;

    IF exists_count = 0 THEN
      RETURN code;
    END IF;

    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral_code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;


-- ---------- telegram_link_requests.code 生成（tg-link-XXXXXX 8文字） ----------
-- §7-1 仁さん指定の形式。

CREATE OR REPLACE FUNCTION public.generate_telegram_link_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
  max_attempts INTEGER := 100;
  attempt INTEGER := 0;
BEGIN
  LOOP
    attempt := attempt + 1;
    code := 'tg-link-' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));

    SELECT COUNT(*) INTO exists_count
    FROM public.telegram_link_requests WHERE telegram_link_requests.code = code;

    IF exists_count = 0 THEN
      RETURN code;
    END IF;

    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique telegram link code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;


-- ============================================================================
-- PART 3: トリガー (triggers.sql)
-- ============================================================================
-- =============================================
-- OPENCLAW Platform - Triggers
-- =============================================
-- SPEC-01 §5 を準拠源とする。
-- 適用するトリガー:
--   1. updated_at の自動更新（全 updatable テーブル）
--   2. referral_code の自動生成（users INSERT 時）
--   3. 紹介者なし → 運営にデフォルト紐付け（users INSERT 時）
--   4. Supabase Auth → public.users の自動同期（auth.users INSERT 時）
--   5. 紹介系図3世代の自動生成（users INSERT 時）
--   6. telegram_link_requests.code の自動生成（INSERT 時）
-- =============================================


-- =============================================
-- 1. updated_at 自動更新
-- =============================================
-- updated_at カラムを持つ全テーブルに適用。

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_claws_updated_at
  BEFORE UPDATE ON public.claws
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_nft_tokens_updated_at
  BEFORE UPDATE ON public.nft_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_nft_purchases_updated_at
  BEFORE UPDATE ON public.nft_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_referral_rewards_updated_at
  BEFORE UPDATE ON public.referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_reward_distributions_updated_at
  BEFORE UPDATE ON public.reward_distributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_sites_updated_at
  BEFORE UPDATE ON public.user_sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_bot_sessions_updated_at
  BEFORE UPDATE ON public.bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_push_notifications_updated_at
  BEFORE UPDATE ON public.push_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_notification_deliveries_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bot_messages, audit_logs, telegram_link_requests は append-only なので updated_at なし


-- =============================================
-- 2. users.referral_code 自動生成
-- =============================================

CREATE OR REPLACE FUNCTION public.set_users_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_users_referral_code_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_users_referral_code();


-- =============================================
-- 3. 紹介者なし → 運営にデフォルト紐付け
-- =============================================
-- 環境変数 ADMIN_DEFAULT_REFERRER_USER_ID と直接結びつけるのではなく、
-- DB 内の admin_users で role='super_admin' のレコードを検索する。
-- ブートストラップ問題: 最初の super_admin 自身は紐付けない（自己参照防止）。

CREATE OR REPLACE FUNCTION public.set_default_referrer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  default_referrer_id UUID;
BEGIN
  -- 紹介者なしの場合のみ
  IF NEW.referrer_user_id IS NULL THEN
    -- super_admin の最古ユーザーをデフォルト紹介者とする（運営=仁さん）
    SELECT au.user_id INTO default_referrer_id
    FROM public.admin_users au
    WHERE au.role = 'super_admin'
    ORDER BY au.granted_at ASC
    LIMIT 1;

    -- ブートストラップ: 自分自身が default_referrer の場合は NULL のまま
    -- （= ルートユーザー、運営者そのもの）
    IF default_referrer_id IS NOT NULL AND default_referrer_id != NEW.id THEN
      NEW.referrer_user_id := default_referrer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_users_default_referrer_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_default_referrer();


-- =============================================
-- 4. Supabase Auth → public.users の自動同期
-- =============================================
-- auth.users への INSERT を public.users へ自動反映。
-- Supabase Auth のサインアップ直後に public.users レコードが必ず存在する状態にする。

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- 5. 紹介系図3世代の自動生成
-- =============================================
-- users.INSERT 後、上位3世代分を referrals テーブルに記録。

CREATE OR REPLACE FUNCTION public.create_referral_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

CREATE TRIGGER create_user_referral_chain_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_chain();


-- =============================================
-- 6. telegram_link_requests.code の自動生成
-- =============================================
-- §7-1 仁さん指定: tg-link-XXXXXX 8文字形式。

CREATE OR REPLACE FUNCTION public.set_telegram_link_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_telegram_link_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_telegram_link_code_trigger
  BEFORE INSERT ON public.telegram_link_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_telegram_link_code();


-- ============================================================================
-- PART 4: Row Level Security (rls_policies.sql)
-- ============================================================================
-- =============================================
-- OPENCLAW Platform - Row Level Security Policies
-- =============================================
-- SPEC-01 §4 を準拠源とする。
-- 設計原則:
--   1. users 自身のデータは本人のみアクセス可
--   2. claws マスターは全員読み取り可
--   3. 管理者は全テーブルアクセス可（is_admin() / is_super_admin()）
--   4. 全テーブルで RLS を有効化
--   5. INSERT/UPDATE/DELETE は基本 service_role 経由のみ（バックエンド/Worker から）
-- =============================================


-- ---------- 全テーブルで RLS を有効化 ----------

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
ALTER TABLE public.telegram_link_requests ENABLE ROW LEVEL SECURITY;


-- =============================================
-- users
-- =============================================

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- INSERT は auth.users トリガー経由のみ（service_role）
-- DELETE は禁止（is_active = false で論理削除を使用）


-- =============================================
-- user_wallets
-- =============================================

CREATE POLICY "user_wallets_select_own"
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_wallets_insert_own"
  ON public.user_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_wallets_update_own"
  ON public.user_wallets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- claws (マスターテーブル: 全員読み取り可)
-- =============================================

CREATE POLICY "claws_select_all"
  ON public.claws FOR SELECT
  USING (true);

CREATE POLICY "claws_modify_super_admin"
  ON public.claws FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- =============================================
-- nft_tokens
-- =============================================

CREATE POLICY "nft_tokens_select_own"
  ON public.nft_tokens FOR SELECT
  USING (auth.uid() = owner_user_id OR public.is_admin());

-- INSERT/UPDATE は service_role 経由のみ（NFT Sync Worker、購入 Webhook）


-- =============================================
-- nft_purchases
-- =============================================

CREATE POLICY "nft_purchases_select_own"
  ON public.nft_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- INSERT/UPDATE は service_role 経由のみ（購入 Webhook）


-- =============================================
-- referrals
-- =============================================

CREATE POLICY "referrals_select_related"
  ON public.referrals FOR SELECT
  USING (
    auth.uid() IN (referrer_user_id, referred_user_id)
    OR public.is_admin()
  );

-- INSERT は users トリガー経由のみ（create_referral_chain）


-- =============================================
-- referral_rewards
-- =============================================

CREATE POLICY "referral_rewards_select_recipient"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = recipient_user_id OR public.is_admin());

-- INSERT/UPDATE は service_role 経由のみ（Reward Calculator Worker）


-- =============================================
-- reward_distributions (管理者のみ閲覧可)
-- =============================================

CREATE POLICY "reward_distributions_select_admin"
  ON public.reward_distributions FOR SELECT
  USING (public.is_admin());


-- =============================================
-- user_sites
-- =============================================

CREATE POLICY "user_sites_select_own"
  ON public.user_sites FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_sites_select_published"
  ON public.user_sites FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "user_sites_update_own"
  ON public.user_sites FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- bot_sessions
-- =============================================

CREATE POLICY "bot_sessions_select_own"
  ON public.bot_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- INSERT/UPDATE は Bot Worker (service_role) 経由のみ


-- =============================================
-- bot_messages (会話履歴: 自分のみ閲覧可)
-- =============================================

CREATE POLICY "bot_messages_select_own"
  ON public.bot_messages FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());


-- =============================================
-- push_notifications (管理者のみ閲覧可)
-- =============================================

CREATE POLICY "push_notifications_select_admin"
  ON public.push_notifications FOR SELECT
  USING (public.is_admin());

CREATE POLICY "push_notifications_modify_admin"
  ON public.push_notifications FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================
-- notification_deliveries
-- =============================================

CREATE POLICY "notification_deliveries_select_own"
  ON public.notification_deliveries FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());


-- =============================================
-- admin_users
-- =============================================

CREATE POLICY "admin_users_select_admin"
  ON public.admin_users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admin_users_modify_super_admin"
  ON public.admin_users FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- =============================================
-- audit_logs (管理者のみ閲覧可)
-- =============================================

CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- INSERT は service_role 経由のみ（システム/Worker）


-- =============================================
-- telegram_link_requests (§3.10b - §7-1)
-- =============================================
-- 自分のリクエストのみ閲覧可。Bot 連携時に code で照合するため、
-- 本人または service_role のみ。

CREATE POLICY "telegram_link_select_own"
  ON public.telegram_link_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- INSERT/UPDATE は service_role 経由のみ（購入 Webhook、Bot 連携処理）


-- =============================================
-- 完了
-- =============================================
-- 全 16 テーブルで RLS 有効化、ポリシー適用済み。
-- 次マイグレーション (20260429000004_seed_admin.sql) で初期管理者を準備する。


-- ============================================================================
-- PART 5: VERIFICATION (任意 - 上の実行が成功した後、別途実行して確認)
-- ============================================================================
-- 以下を SQL Editor で個別に Run することで、想定通りに作成されているか確認できる。
--
-- 期待値:
--   tables_in_public        = 16  (users, user_wallets, claws, nft_tokens, nft_purchases,
--                                  referrals, referral_rewards, reward_distributions,
--                                  user_sites, bot_sessions, bot_messages, push_notifications,
--                                  notification_deliveries, admin_users, audit_logs,
--                                  telegram_link_requests)
--   tables_with_rls_enabled = 16  (全テーブルで RLS 有効)
--   custom_functions        >= 8  (is_admin, is_super_admin, set_updated_at,
--                                  generate_referral_code, generate_telegram_link_code,
--                                  set_users_referral_code, set_default_referrer,
--                                  handle_new_user, create_referral_chain,
--                                  set_telegram_link_code)
--   custom_triggers         >= 16 (updated_at × 13 + 他)
--   rls_policies            >= 25 (各テーブルに 1〜4 ポリシー)
--
-- ----------------------------------------------------------------------------
-- 検証クエリ集（コメントを外して個別実行）:

-- SELECT COUNT(*) AS tables_in_public
-- FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- SELECT COUNT(*) AS tables_with_rls_enabled
-- FROM pg_tables t
-- JOIN pg_class c ON c.relname = t.tablename
-- WHERE t.schemaname = 'public' AND c.relrowsecurity = true;

-- SELECT COUNT(*) AS custom_functions
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public';

-- SELECT COUNT(*) AS custom_triggers
-- FROM pg_trigger
-- WHERE NOT tgisinternal AND tgrelid IN (
--   SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace
-- );

-- SELECT COUNT(*) AS rls_policies
-- FROM pg_policies WHERE schemaname = 'public';

-- 全テーブル一覧:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 全 RLS ポリシー一覧:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;


-- ============================================================================
-- TEARDOWN (rollback) - 全部削除してやり直したい時にだけ使用
-- ============================================================================
-- ⚠️  実データが入った後にこれを実行すると **全データが消えます**。
-- マイグレーション初回でエラーが出て修正後に再適用したい場合のみ使用。
-- ----------------------------------------------------------------------------
-- BEGIN;
--
-- -- auth トリガーを先に削除（依存関係上）
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--
-- -- public スキーマのテーブルを CASCADE で全削除
-- DROP TABLE IF EXISTS
--   public.audit_logs,
--   public.admin_users,
--   public.notification_deliveries,
--   public.push_notifications,
--   public.bot_messages,
--   public.bot_sessions,
--   public.telegram_link_requests,
--   public.user_sites,
--   public.referral_rewards,
--   public.reward_distributions,
--   public.referrals,
--   public.nft_purchases,
--   public.nft_tokens,
--   public.claws,
--   public.user_wallets,
--   public.users
-- CASCADE;
--
-- -- 関数も削除
-- DROP FUNCTION IF EXISTS
--   public.is_admin,
--   public.is_super_admin,
--   public.set_updated_at,
--   public.generate_referral_code,
--   public.generate_telegram_link_code,
--   public.set_users_referral_code,
--   public.set_default_referrer,
--   public.handle_new_user,
--   public.create_referral_chain,
--   public.set_telegram_link_code
-- CASCADE;
--
-- COMMIT;


-- ============================================================================
-- END OF COMBINED MIGRATION
-- ============================================================================
