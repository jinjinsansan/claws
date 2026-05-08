import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  context: { params: { code: string } },
) {
  const rawCode = context.params.code ?? "";
  const referralCode = decodeURIComponent(rawCode).trim().toUpperCase();

  if (!/^OPENCLAW-[A-Z0-9]{6}$/.test(referralCode)) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("referral_code", referralCode)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "Referrer not found" }, { status: 404 });
  }

  const { data: wallet, error: walletError } = await supabase
    .from("user_wallets")
    .select("wallet_address")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .eq("is_verified", true)
    .single();

  if (walletError || !wallet?.wallet_address) {
    return NextResponse.json({ error: "Referrer wallet not found" }, { status: 404 });
  }

  return NextResponse.json({
    referralCode,
    walletAddress: wallet.wallet_address.toLowerCase(),
  });
}
