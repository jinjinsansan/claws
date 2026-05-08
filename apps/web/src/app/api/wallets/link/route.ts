import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const POLYGON_CHAIN_ID = 137;

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const walletAddressRaw = String(body.walletAddress ?? "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddressRaw)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const walletAddress = walletAddressRaw.toLowerCase();
  const now = new Date().toISOString();

  await supabase
    .from("user_wallets")
    .update({ is_primary: false })
    .eq("user_id", user.id)
    .eq("chain_id", POLYGON_CHAIN_ID);

  const { error } = await supabase
    .from("user_wallets")
    .upsert(
      {
        user_id: user.id,
        wallet_address: walletAddress,
        chain_id: POLYGON_CHAIN_ID,
        is_primary: true,
        is_verified: true,
        verified_at: now,
      },
      { onConflict: "wallet_address,chain_id" },
    );

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("violates row-level security")) {
      return NextResponse.json({ error: "Wallet already linked to another user" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    walletAddress,
    userId: user.id,
  });
}
