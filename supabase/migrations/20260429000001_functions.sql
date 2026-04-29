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
