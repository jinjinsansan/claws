-- =============================================
-- OPENCLAW Platform - Wallet signature login nonces
-- =============================================
-- SPEC-07 §6.2

CREATE TABLE IF NOT EXISTS public.wallet_login_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_login_nonces_wallet
  ON public.wallet_login_nonces(wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_login_nonces_exp
  ON public.wallet_login_nonces(expires_at)
  WHERE used = false;

ALTER TABLE public.wallet_login_nonces ENABLE ROW LEVEL SECURITY;
