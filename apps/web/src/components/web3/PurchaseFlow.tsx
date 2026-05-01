"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  USDT_ADDRESS,
  CLAWS_NFT_ADDRESS,
  PRICE_USDT,
  USDT_ABI,
  ClawsNFTAbi,
} from "@/lib/web3/contracts";

type Step = "check" | "approve" | "approving" | "mint" | "minting" | "done" | "error";

export function PurchaseFlow({ characterNo }: { characterNo: number }) {
  const router = useRouter();
  const { address } = useAccount();
  const [step, setStep] = useState<Step>("check");
  const [errorMsg, setErrorMsg] = useState("");
  const [referrer, setReferrer] = useState<`0x${string}` | null>(null);

  // Read referral cookie
  useEffect(() => {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    const refCookie = cookies.find((c) => c.startsWith("oc_ref="));
    if (refCookie) {
      // Resolve referrer code to address via API (Phase 7 will implement full resolution)
      // For now, use treasury as default
    }
    const treasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}` | undefined;
    setReferrer(treasury ?? null);
  }, []);

  // USDT balance
  const { data: balance } = useReadContract({
    address: USDT_ADDRESS,
    abi: USDT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // USDT allowance
  const { data: allowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: USDT_ABI,
    functionName: "allowance",
    args: address ? [address, CLAWS_NFT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval = allowance !== undefined && (allowance as bigint) < PRICE_USDT;
  const hasBalance = balance !== undefined && (balance as bigint) >= PRICE_USDT;

  // Approve tx
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Mint tx
  const {
    writeContract: writeMint,
    data: mintHash,
    isPending: isMintPending,
    error: mintError,
  } = useWriteContract();

  const { isSuccess: mintConfirmed } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // Step transitions
  useEffect(() => {
    if (approveConfirmed) setStep("mint");
  }, [approveConfirmed]);

  useEffect(() => {
    if (mintConfirmed && mintHash) {
      setStep("done");
      router.push(`/thanks?tx=${mintHash}`);
    }
  }, [mintConfirmed, mintHash, router]);

  useEffect(() => {
    if (approveError) {
      setStep("error");
      setErrorMsg(approveError.message.slice(0, 200));
    }
  }, [approveError]);

  useEffect(() => {
    if (mintError) {
      setStep("error");
      setErrorMsg(mintError.message.slice(0, 200));
    }
  }, [mintError]);

  const handleApprove = () => {
    setStep("approving");
    writeApprove({
      address: USDT_ADDRESS,
      abi: USDT_ABI,
      functionName: "approve",
      args: [CLAWS_NFT_ADDRESS, PRICE_USDT],
    });
  };

  const handleMint = () => {
    if (!referrer) {
      setErrorMsg("紹介者アドレスが未設定です。");
      setStep("error");
      return;
    }
    setStep("minting");
    writeMint({
      address: CLAWS_NFT_ADDRESS,
      abi: ClawsNFTAbi as any,
      functionName: "mintClaw",
      args: [characterNo, referrer],
    });
  };

  if (!hasBalance && balance !== undefined) {
    return (
      <div className="p-4 bg-bg-card border border-red-blood/50 rounded-lg">
        <p className="text-red-bright text-sm">
          USDT 残高が不足しています (必要: 300 USDT, 残高: {(Number(balance) / 1e6).toFixed(2)} USDT)
        </p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="p-4 bg-bg-card border border-red-blood/50 rounded-lg">
        <p className="text-red-bright text-sm mb-3">{errorMsg}</p>
        <button
          onClick={() => { setStep("check"); setErrorMsg(""); }}
          className="px-4 py-2 bg-red-blood hover:bg-red-bright text-text-main text-sm rounded transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="p-4 bg-bg-card border border-gold/30 rounded-lg">
        <p className="text-gold text-sm">召喚完了！リダイレクト中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={isApprovePending || step === "approving"}
          className="w-full sm:w-auto px-8 py-4 bg-gold hover:bg-gold-bright text-bg-deep font-bold font-cinzel tracking-wider rounded transition-all disabled:opacity-50"
        >
          {step === "approving" ? "承認中..." : "STEP 1: USDT を承認 (APPROVE)"}
        </button>
      ) : (
        <button
          onClick={handleMint}
          disabled={isMintPending || step === "minting"}
          className="w-full sm:w-auto px-8 py-4 bg-red-blood hover:bg-red-bright text-text-main font-bold font-cinzel tracking-wider rounded border border-gold/40 transition-all disabled:opacity-50"
        >
          {step === "minting" ? "召喚中..." : "SUMMON — 300 USDT"}
        </button>
      )}
      <p className="text-text-mute text-xs">
        {needsApproval
          ? "まず USDT の使用を承認してから召喚できます。"
          : "ボタンを押すとウォレットで取引の確認が求められます。"}
      </p>
    </div>
  );
}
