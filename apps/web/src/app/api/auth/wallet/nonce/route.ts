import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const NONCE_TTL_MINUTES = 10;

function buildMessage(walletAddress: string, nonce: string): string {
  return [
    "OPENCLAW Wallet Login",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
    "Sign this message to authenticate with OPENCLAW.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawAddress = String(body.walletAddress ?? "").trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(rawAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const walletAddress = rawAddress.toLowerCase();
  const nonce = randomUUID().replace(/-/g, "");
  const message = buildMessage(walletAddress, nonce);
  const expiresAt = new Date(Date.now() + NONCE_TTL_MINUTES * 60 * 1000).toISOString();

  const supabase = createServiceRoleClient();
  await supabase
    .from("wallet_login_nonces")
    .delete()
    .eq("wallet_address", walletAddress)
    .lt("expires_at", new Date().toISOString());

  const { error } = await supabase
    .from("wallet_login_nonces")
    .insert({
      wallet_address: walletAddress,
      nonce,
      message,
      expires_at: expiresAt,
      used: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    walletAddress,
    nonce,
    message,
    expiresAt,
  });
}
