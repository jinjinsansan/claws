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
