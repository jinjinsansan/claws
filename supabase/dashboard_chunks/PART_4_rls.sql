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

CREATE POLICY "claws_select_all"
  ON public.claws FOR SELECT
  USING (true);

CREATE POLICY "claws_modify_super_admin"
  ON public.claws FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "nft_tokens_select_own"
  ON public.nft_tokens FOR SELECT
  USING (auth.uid() = owner_user_id OR public.is_admin());

CREATE POLICY "nft_purchases_select_own"
  ON public.nft_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "referrals_select_related"
  ON public.referrals FOR SELECT
  USING (
    auth.uid() IN (referrer_user_id, referred_user_id)
    OR public.is_admin()
  );

CREATE POLICY "referral_rewards_select_recipient"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = recipient_user_id OR public.is_admin());

CREATE POLICY "reward_distributions_select_admin"
  ON public.reward_distributions FOR SELECT
  USING (public.is_admin());

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

CREATE POLICY "bot_sessions_select_own"
  ON public.bot_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "bot_messages_select_own"
  ON public.bot_messages FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "push_notifications_select_admin"
  ON public.push_notifications FOR SELECT
  USING (public.is_admin());

CREATE POLICY "push_notifications_modify_admin"
  ON public.push_notifications FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "notification_deliveries_select_own"
  ON public.notification_deliveries FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "admin_users_select_admin"
  ON public.admin_users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admin_users_modify_super_admin"
  ON public.admin_users FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "telegram_link_select_own"
  ON public.telegram_link_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
