"use client";

/**
 * WalletProvider - 現状はプレースホルダー (Phase 2-6)
 *
 * SPEC-07 §5.3 の本格実装は **Phase 3 (NFT 購入フロー実装時)** に移管。
 *
 * 移管理由:
 *   - wagmi v2 + viem は Phase 3 のスマコン購入時にこそ核となる
 *   - Phase 2 単体での wagmi 統合は walletConnect バレル resolve 問題で
 *     Next.js webpack ビルドが不安定 (porto/viem 等の peer dep 解決失敗)
 *   - Phase 3 で Foundry スマコンをデプロイする際に wagmi も一気に組み込む
 *     方が、最低限の動作確認 (mintClaw → ABI 連携) を含めて検証できる
 *
 * Phase 3 で復元する内容:
 *   - wagmi createConfig (Polygon mainnet)
 *   - injected コネクタ + Phase 3 で必要なら walletConnect / coinbase
 *   - QueryClientProvider
 *   - 購入フロー (apps/web/src/app/apply/page.tsx 等で usePurchase 等)
 *
 * 現状はパススルーのみ。children をそのまま返す。
 */
import type { ReactNode } from "react";

export function WalletProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
