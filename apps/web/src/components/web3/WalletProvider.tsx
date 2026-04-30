"use client";

/**
 * WalletProvider - wagmi v2 + viem 接続プロバイダ
 *
 * SPEC-07 §5.3 準拠。Polygon Mainnet 用の wagmi config を提供。
 * Phase 2 では UI 表示のみ。実購入トランザクションは Phase 3 で接続。
 *
 * 接続方式:
 *   - injected (MetaMask, Brave Wallet 等の注入型ウォレット)
 *   - WalletConnect は Phase 3 で追加 (Project ID 取得後)
 */
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { polygon } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// wagmi config (singleton)
const config = createConfig({
  chains: [polygon],
  connectors: [injected()],
  transports: {
    [polygon.id]: http(
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com",
    ),
  },
  ssr: true,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  // QueryClient はコンポーネントマウント時に1度だけ生成 (SSR 安全)
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
