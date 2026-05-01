import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * POST /api/purchase/webhook
 *
 * Receives purchase confirmation from blockchain event monitoring.
 * Creates nft_purchases, nft_tokens records, resolves referral chain.
 *
 * SPEC-07 §5.5 — Phase 7 でフル実装予定。
 * 現在は基本的なレコード作成のみ。
 */
export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.PURCHASE_WEBHOOK_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tokenId,
      characterNo,
      buyerWallet,
      referrerWallet,
      transactionHash,
      blockNumber,
      amountUsdt,
    } = body;

    if (!tokenId || !characterNo || !buyerWallet || !transactionHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const walletLower = buyerWallet.toLowerCase();

    // Find or create user by wallet
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("user_id")
      .eq("wallet_address", walletLower)
      .single();

    const userId = wallet?.user_id ?? null;

    // Find claw by number
    const { data: claw } = await supabase
      .from("claws")
      .select("id")
      .eq("claw_no", characterNo)
      .single();

    if (!claw) {
      return NextResponse.json({ error: "Invalid character number" }, { status: 400 });
    }

    // Create nft_tokens record
    const contractAddress = process.env.NEXT_PUBLIC_CLAWS_NFT_ADDRESS ?? "";
    const { data: nftToken, error: nftError } = await supabase
      .from("nft_tokens")
      .insert({
        token_id: tokenId,
        contract_address: contractAddress.toLowerCase(),
        chain_id: 137,
        claw_id: claw.id,
        claw_no: characterNo,
        owner_wallet_address: walletLower,
        owner_user_id: userId,
        minted_at: new Date().toISOString(),
        metadata_uri: `${process.env.NFT_BASE_URI ?? ""}${characterNo}.json`,
      })
      .select("id")
      .single();

    if (nftError) {
      console.error("nft_tokens insert error:", nftError);
      return NextResponse.json({ error: "Failed to create NFT record" }, { status: 500 });
    }

    // Create nft_purchases record
    const { data: purchase, error: purchaseError } = await supabase
      .from("nft_purchases")
      .insert({
        user_id: userId,
        buyer_wallet_address: walletLower,
        claw_id: claw.id,
        claw_no: characterNo,
        token_id: tokenId,
        nft_token_record_id: nftToken.id,
        amount_usdt: amountUsdt ?? 300,
        transaction_hash: transactionHash,
        block_number: blockNumber,
        chain_id: 137,
        referrer_user_id: null,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (purchaseError) {
      console.error("nft_purchases insert error:", purchaseError);
      return NextResponse.json({ error: "Failed to create purchase record" }, { status: 500 });
    }

    // Create telegram_link_requests for Bot onboarding
    if (userId) {
      await supabase
        .from("telegram_link_requests")
        .insert({
          user_id: userId,
          status: "pending",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      action: "nft_purchase_confirmed",
      actor_type: "system",
      target_type: "nft_purchase",
      target_id: purchase.id,
      metadata: { tokenId, characterNo, transactionHash, buyerWallet: walletLower },
    });

    return NextResponse.json({
      success: true,
      tokenId,
      purchaseId: purchase.id,
      nftTokenId: nftToken.id,
    });
  } catch (error) {
    console.error("Purchase webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
