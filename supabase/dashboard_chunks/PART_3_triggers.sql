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

CREATE OR REPLACE FUNCTION public.set_default_referrer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  default_referrer_id UUID;
BEGIN
  IF NEW.referrer_user_id IS NULL THEN
    SELECT au.user_id INTO default_referrer_id
    FROM public.admin_users au
    WHERE au.role = 'super_admin'
    ORDER BY au.granted_at ASC
    LIMIT 1;

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
