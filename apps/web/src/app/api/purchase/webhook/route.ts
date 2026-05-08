import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * POST /api/purchase/webhook
 *
 * Receives purchase confirmation from blockchain event monitoring.
 * Creates nft_purchases, nft_tokens records, resolves referral chain,
 * and triggers reward calculation via the reward-calculator Worker.
 *
 * SPEC-07 §5.5 / SPEC-03 §3.1
 */
export async function POST(request: NextRequest) {
  try {
    // PURCHASE_WEBHOOK_SECRET is the canonical name (SPEC-11 §2.1).
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

    if (!wallet?.user_id) {
      return NextResponse.json(
        { error: "No registered user found for buyer wallet. User must register before purchasing." },
        { status: 400 }
      );
    }
    const userId: string = wallet.user_id;

    // Resolve referrer_user_id from referrerWallet (on-chain referrer param)
    let referrerUserId: string | null = null;
    if (userId) {
      // First: try to resolve from users.referrer_user_id (set by trigger on registration)
      const { data: user } = await supabase
        .from("users")
        .select("referrer_user_id")
        .eq("id", userId)
        .single();
      referrerUserId = user?.referrer_user_id ?? null;
    }
    if (!referrerUserId && referrerWallet) {
      // Fallback: resolve referrer from wallet address
      const refWalletLower = referrerWallet.toLowerCase();
      const { data: refWallet } = await supabase
        .from("user_wallets")
        .select("user_id")
        .eq("wallet_address", refWalletLower)
        .single();
      referrerUserId = refWallet?.user_id ?? null;
    }

    // If referrer was resolved post-signup, persist it when user has no referrer yet.
    if (referrerUserId) {
      await supabase
        .from("users")
        .update({ referrer_user_id: referrerUserId })
        .eq("id", userId)
        .is("referrer_user_id", null);
    }

    const { data: referralChain } = await supabase
      .from("referrals")
      .select("referrer_user_id, generation")
      .eq("referred_user_id", userId)
      .order("generation", { ascending: true });

    const gen1Referrer = referralChain?.find((r) => r.generation === 1)?.referrer_user_id ?? referrerUserId;
    const gen2Referrer = referralChain?.find((r) => r.generation === 2)?.referrer_user_id ?? null;
    const gen3Referrer = referralChain?.find((r) => r.generation === 3)?.referrer_user_id ?? null;

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
        referrer_user_id: gen1Referrer,
        referrer_2_user_id: gen2Referrer,
        referrer_3_user_id: gen3Referrer,
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
    // Schema: code (auto-generated by trigger), expires_at (default 24h), used (default false)
    if (userId) {
      await supabase
        .from("telegram_link_requests")
        .insert({ user_id: userId });
    }

    // Audit log (schema uses entity_type/entity_id, not target_type/target_id)
    await supabase.from("audit_logs").insert({
      action: "nft_purchase_confirmed",
      actor_type: "system",
      entity_type: "nft_purchase",
      entity_id: purchase.id,
      metadata: { tokenId, characterNo, transactionHash, buyerWallet: walletLower },
    });

    // Trigger referral reward calculation (SPEC-03 §3.2: real-time calculation)
    const rewardCalcUrl = process.env.REWARD_CALCULATOR_URL;
    const rewardCalcKey = process.env.REWARD_CALCULATOR_API_KEY;
    if (rewardCalcUrl && rewardCalcKey && purchase.id) {
      try {
        await fetch(`${rewardCalcUrl}/on-purchase`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${rewardCalcKey}`,
          },
          body: JSON.stringify({ purchaseId: purchase.id }),
        });
      } catch (rewardErr) {
        console.error("Reward calculation trigger failed (non-blocking):", rewardErr);
      }
    }

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
