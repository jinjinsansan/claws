"use client";

import { http, createConfig } from "wagmi";
import { polygon, polygonAmoy } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

const isProduction = process.env.NODE_ENV === "production";

export const wagmiConfig = createConfig({
  chains: isProduction ? [polygon] : [polygonAmoy, polygon],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_AMOY_RPC_URL),
  },
  ssr: true,
});
