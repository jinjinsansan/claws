"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectWalletButton({
  className = "",
}: {
  className?: string;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="px-4 py-2 bg-bg-card text-gold text-sm font-cinzel tracking-wider border border-border-faint rounded">
          {short}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-3 py-2 text-text-dim text-xs hover:text-text-main transition-colors"
        >
          切断
        </button>
      </div>
    );
  }

  const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  return (
    <button
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      disabled={isPending}
      className={`px-5 py-2.5 bg-red-blood hover:bg-red-bright text-text-main text-sm font-cinzel tracking-widest border border-gold/40 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isPending ? "接続中..." : "CONNECT WALLET"}
    </button>
  );
}
