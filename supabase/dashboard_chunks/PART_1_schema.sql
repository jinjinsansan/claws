CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,

  telegram_user_id BIGINT UNIQUE,
  telegram_username TEXT,
  telegram_linked_at TIMESTAMPTZ,

  referrer_user_id UUID REFERENCES public.users(id),
  referral_code TEXT UNIQUE NOT NULL,

  total_claws_count INTEGER NOT NULL DEFAULT 0,
  direct_referrals_count INTEGER NOT NULL DEFAULT 0,
  total_referrals_count INTEGER NOT NULL DEFAULT 0,
  total_rewards_earned NUMERIC(20, 6) NOT NULL DEFAULT 0,

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

CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  wallet_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 137,

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

CREATE TABLE public.claws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  claw_no INTEGER NOT NULL UNIQUE CHECK (claw_no BETWEEN 1 AND 30),
  name_jp TEXT NOT NULL,
  name_en TEXT NOT NULL UNIQUE,
  name_romaji TEXT NOT NULL,

  category TEXT NOT NULL CHECK (category IN (
    'demon', 'god', 'wild', 'robot', 'human',
    'goddess', 'temptress', 'fluffy', 'concierge', 'friend'
  )),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  element TEXT NOT NULL,
  origin TEXT NOT NULL,

  personality TEXT NOT NULL,
  first_person TEXT NOT NULL,
  tone TEXT NOT NULL,
  catchphrase TEXT NOT NULL,

  best_for TEXT NOT NULL,
  industries TEXT[] NOT NULL,

  image_filename TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,

  origin_paragraphs JSONB NOT NULL,
  dossier JSONB NOT NULL,
  your_fate_paragraphs JSONB NOT NULL,
  quote TEXT NOT NULL,
  daily_routine JSONB NOT NULL,
  oaths JSONB NOT NULL,
  kinsmen JSONB NOT NULL,

  system_prompt TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claws_no ON public.claws(claw_no);
CREATE INDEX idx_claws_category ON public.claws(category);
CREATE INDEX idx_claws_gender ON public.claws(gender);

CREATE TABLE public.nft_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  token_id BIGINT NOT NULL UNIQUE,
  contract_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 137,

  claw_id UUID NOT NULL REFERENCES public.claws(id),
  claw_no INTEGER NOT NULL,

  owner_wallet_address TEXT NOT NULL,
  owner_user_id UUID REFERENCES public.users(id),

  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,

  metadata_uri TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  minted_at TIMESTAMPTZ NOT NULL,
  initial_purchase_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nft_tokens_owner_wallet ON public.nft_tokens(owner_wallet_address);
CREATE INDEX idx_nft_tokens_owner_user ON public.nft_tokens(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX idx_nft_tokens_claw ON public.nft_tokens(claw_id);
CREATE INDEX idx_nft_tokens_active ON public.nft_tokens(is_active) WHERE is_active = true;

CREATE TABLE public.nft_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.users(id),
  buyer_wallet_address TEXT NOT NULL,

  claw_id UUID NOT NULL REFERENCES public.claws(id),
  claw_no INTEGER NOT NULL,
  token_id BIGINT,
  nft_token_record_id UUID REFERENCES public.nft_tokens(id),

  amount_usdt NUMERIC(20, 6) NOT NULL,
  transaction_hash TEXT,
  block_number BIGINT,
  chain_id INTEGER NOT NULL DEFAULT 137,

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
CREATE INDEX idx_nft_purchases_monthly ON public.nft_purchases(created_at DESC, status) WHERE status = 'confirmed';

ALTER TABLE public.nft_tokens
  ADD CONSTRAINT fk_nft_tokens_purchase
  FOREIGN KEY (initial_purchase_id) REFERENCES public.nft_purchases(id);

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  referrer_user_id UUID NOT NULL REFERENCES public.users(id),
  referred_user_id UUID NOT NULL REFERENCES public.users(id),
  generation INTEGER NOT NULL CHECK (generation IN (1, 2, 3)),

  confirmed_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (referrer_user_id, referred_user_id, generation)
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_gen ON public.referrals(generation);

CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_type TEXT NOT NULL DEFAULT 'nft_purchase' CHECK (source_type IN (
    'nft_purchase', 'academy_subscription', 'weapon_purchase'
  )),

  nft_purchase_id UUID REFERENCES public.nft_purchases(id),
  academy_subscription_id UUID,
  weapon_purchase_id UUID,

  CONSTRAINT chk_referral_rewards_source_id CHECK (
    (source_type = 'nft_purchase'         AND nft_purchase_id IS NOT NULL) OR
    (source_type = 'academy_subscription' AND academy_subscription_id IS NOT NULL) OR
    (source_type = 'weapon_purchase'      AND weapon_purchase_id IS NOT NULL)
  ),

  recipient_user_id UUID NOT NULL REFERENCES public.users(id),
  recipient_wallet_address TEXT NOT NULL,

  generation INTEGER NOT NULL CHECK (generation IN (1, 2, 3)),
  rate_percentage NUMERIC(5, 2) NOT NULL,
  amount_usdt NUMERIC(20, 6) NOT NULL,

  base_rate_percentage NUMERIC(5, 2),
  bonus_rate_percentage NUMERIC(5, 2) DEFAULT 0,
  bonus_reason TEXT,

  status TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN (
    'calculated', 'scheduled', 'sent', 'failed'
  )),

  scheduled_for TIMESTAMPTZ,
  distribution_id UUID,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_rewards_recipient ON public.referral_rewards(recipient_user_id);
CREATE INDEX idx_referral_rewards_purchase ON public.referral_rewards(nft_purchase_id) WHERE nft_purchase_id IS NOT NULL;
CREATE INDEX idx_referral_rewards_status ON public.referral_rewards(status);
CREATE INDEX idx_referral_rewards_scheduled ON public.referral_rewards(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_rewards_pending ON public.referral_rewards(status, scheduled_for) WHERE status IN ('calculated', 'scheduled');
CREATE INDEX idx_referral_rewards_source ON public.referral_rewards(source_type, status);

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

ALTER TABLE public.referral_rewards
  ADD CONSTRAINT fk_referral_rewards_distribution
  FOREIGN KEY (distribution_id) REFERENCES public.reward_distributions(id);

CREATE TABLE public.user_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claw_id UUID NOT NULL REFERENCES public.claws(id),
  nft_token_id BIGINT NOT NULL,

  subdomain TEXT NOT NULL,
  custom_domain TEXT UNIQUE,

  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  business_description TEXT,

  template_name TEXT NOT NULL DEFAULT 'default',
  theme_colors JSONB NOT NULL DEFAULT '{}'::jsonb,

  content JSONB NOT NULL DEFAULT '{}'::jsonb,

  cloudflare_pages_project_id TEXT,
  current_deployment_id TEXT,
  deployed_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'suspended'
  )),
  suspended_reason TEXT,

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

CREATE TABLE public.bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES public.users(id),
  telegram_user_id BIGINT NOT NULL UNIQUE,
  telegram_chat_id BIGINT NOT NULL,

  active_claw_id UUID REFERENCES public.claws(id),
  conversation_state TEXT,
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

CREATE TABLE public.telegram_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_link_user ON public.telegram_link_requests(user_id);
CREATE INDEX idx_telegram_link_active ON public.telegram_link_requests(code) WHERE used = false;

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

  llm_model TEXT,
  llm_tokens_used INTEGER,
  llm_cost_usd NUMERIC(10, 6),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_messages_session ON public.bot_messages(bot_session_id);
CREATE INDEX idx_bot_messages_created ON public.bot_messages(created_at DESC);
CREATE INDEX idx_bot_messages_user_claw ON public.bot_messages(user_id, active_claw_id);

CREATE TABLE public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sender_admin_id UUID REFERENCES public.users(id),

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'announcement', 'promotion', 'system', 'personal'
  )),

  target_type TEXT NOT NULL CHECK (target_type IN (
    'all', 'specific_users', 'by_claw', 'by_tier'
  )),
  target_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_user_ids UUID[],

  from_claw_id UUID REFERENCES public.claws(id),

  scheduled_for TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'sending', 'sent', 'failed'
  )),
  sent_at TIMESTAMPTZ,

  total_targets INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_notifications_status ON public.push_notifications(status);
CREATE INDEX idx_push_notifications_scheduled ON public.push_notifications(scheduled_for) WHERE status = 'scheduled';

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

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id UUID REFERENCES public.users(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN (
    'user', 'admin', 'system', 'cron', 'contract'
  )),

  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,

  description TEXT,
  before_data JSONB,
  after_data JSONB,

  ip_address INET,
  user_agent TEXT,

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
