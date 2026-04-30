import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Cinzel, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/web3/WalletProvider";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["200", "300", "400", "700", "900"],
  variable: "--font-noto-serif",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://openclaw.com",
  ),
  title: {
    default: "OPENCLAW — 三十戦士のクローズ",
    template: "%s | OPENCLAW",
  },
  description:
    "世界初、ザリガニ型 AI エージェント NFT。三十体のクローズ、それぞれが異なる世界線から集結した戦士たち。あなたの商いを、共に灯せ。",
  openGraph: {
    title: "OPENCLAW — 三十戦士のクローズ",
    description:
      "世界初、ザリガニ型 AI エージェント NFT。三十体のクローズが、あなたの商いを支える。",
    siteName: "OPENCLAW Platform",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSans.variable} ${notoSerif.variable} ${cinzel.variable} ${bebas.variable}`}
    >
      <body className="antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
