"use client";

/**
 * ConnectWalletButton - 現状はプレースホルダー (Phase 2-6)
 *
 * SPEC-07 §5.3 の本格実装は **Phase 3 (NFT 購入フロー実装時)** に移管。
 * 現状は静的 UI のみで、クリックしても接続処理は走らない。
 *
 * Phase 3 で復元する内容:
 *   - wagmi useAccount / useConnect / useDisconnect で実接続
 *   - 接続済みアドレスの省略表示 (0x1234...abcd)
 *   - DISCONNECT ボタン
 *   - エラーハンドリング (未対応チェーン、ユーザー拒否等)
 */

export function ConnectWalletButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-bg-card text-text-mute text-sm font-cinzel tracking-widest border border-border-faint cursor-not-allowed select-none ${className}`}
      title="Phase 3 で実装予定"
      aria-label="ウォレット接続 (Phase 3 で実装予定)"
    >
      WALLET — COMING IN PHASE 3
    </div>
  );
}
