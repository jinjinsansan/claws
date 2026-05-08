import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { createServiceRoleClient } from "@/lib/supabase/server";

const POLYGON_CHAIN_ID = 137;

function walletEmail(walletAddress: string): string {
  return `wallet-${walletAddress.slice(2)}@wallet.openclaw.local`;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawAddress = String(body.walletAddress ?? "").trim();
  const nonce = String(body.nonce ?? "").trim();
  const signature = String(body.signature ?? "").trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(rawAddress) || !nonce || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const walletAddress = rawAddress.toLowerCase();
  const supabase = createServiceRoleClient();

  const { data: nonceRow, error: nonceError } = await supabase
    .from("wallet_login_nonces")
    .select("id, message, expires_at, used")
    .eq("wallet_address", walletAddress)
    .eq("nonce", nonce)
    .single();

  if (nonceError || !nonceRow) {
    return NextResponse.json({ error: "Nonce not found" }, { status: 400 });
  }
  if (nonceRow.used) {
    return NextResponse.json({ error: "Nonce already used" }, { status: 400 });
  }
  if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Nonce expired" }, { status: 400 });
  }

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({
      message: nonceRow.message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (recovered.toLowerCase() !== walletAddress) {
    return NextResponse.json({ error: "Signature does not match wallet" }, { status: 401 });
  }

  await supabase
    .from("wallet_login_nonces")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("id", nonceRow.id);

  let userId: string | null = null;
  let email: string | null = null;

  const { data: linkedWallet } = await supabase
    .from("user_wallets")
    .select("user_id")
    .eq("wallet_address", walletAddress)
    .eq("chain_id", POLYGON_CHAIN_ID)
    .single();

  if (linkedWallet?.user_id) {
    userId = linkedWallet.user_id;
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();
    email = existingUser?.email ?? null;
  }

  if (!userId || !email) {
    email = walletEmail(walletAddress);

    const { data: byEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (byEmail?.id) {
      userId = byEmail.id;
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: `${randomUUID()}Aa1!`,
        user_metadata: { wallet_address: walletAddress },
      });
      if (createError || !created.user) {
        return NextResponse.json({ error: createError?.message ?? "Failed to create wallet user" }, { status: 500 });
      }
      userId = created.user.id;
    }
  }

  const { error: clearPrimaryError } = await supabase
    .from("user_wallets")
    .update({ is_primary: false })
    .eq("user_id", userId)
    .eq("chain_id", POLYGON_CHAIN_ID);
  if (clearPrimaryError) {
    return NextResponse.json({ error: clearPrimaryError.message }, { status: 500 });
  }

  const { error: walletUpsertError } = await supabase
    .from("user_wallets")
    .upsert(
      {
        user_id: userId,
        wallet_address: walletAddress,
        chain_id: POLYGON_CHAIN_ID,
        is_primary: true,
        is_verified: true,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address,chain_id" },
    );
  if (walletUpsertError) {
    return NextResponse.json({ error: walletUpsertError.message }, { status: 500 });
  }

  const redirectTo = `${request.nextUrl.origin}/auth/callback?next=/members/dashboard`;
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  const actionLink = linkData?.properties?.action_link;
  if (linkError || !actionLink) {
    return NextResponse.json({ error: linkError?.message ?? "Failed to create login link" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    actionLink,
  });
}
