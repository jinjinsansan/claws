"use client";

/**
 * ConnectWalletButton - ウォレット接続/切断 UI
 *
 * SPEC-07 §5.3 準拠。Phase 2 では UI のみ。Phase 3 で購入フローと連携。
 * - 未接続: 「ウォレット接続」ボタン (MetaMask 等を起動)
 * - 接続済み: アドレス省略表示 + 切断ボタン
 */
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ConnectWalletButton({
  className = "",
}: {
  className?: string;
}) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div
        className={`inline-flex items-center gap-3 px-4 py-2 border border-gold/40 bg-bg-card text-text-main text-sm font-cinzel tracking-widest ${className}`}
      >
        <span className="text-gold-bright">{shortenAddress(address)}</span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="text-text-mute hover:text-red-bright transition-colors text-xs"
          aria-label="Disconnect wallet"
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  // 注入型コネクタ (MetaMask 等) を取得
  const injectedConnector = connectors.find((c) => c.type === "injected");

  return (
    <button
      type="button"
      onClick={() => {
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      }}
      disabled={isConnecting || !injectedConnector}
      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-red-blood hover:bg-red-bright disabled:opacity-50 disabled:cursor-not-allowed text-text-main text-sm font-cinzel tracking-widest border border-gold/40 transition-colors ${className}`}
    >
      {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
    </button>
  );
}
