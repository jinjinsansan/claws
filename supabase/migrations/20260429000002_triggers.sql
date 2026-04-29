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
