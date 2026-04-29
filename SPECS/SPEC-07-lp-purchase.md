# SPEC-07: OPENCLAW Platform - LP・購入フロー（Next.js）

> **このドキュメントの位置づけ**: ユーザーが LP からアクセスし、ウォレット接続して NFT を購入するまでの Webアプリケーション仕様。会員エリア、管理者ダッシュボードも含む。
> 
> **前提**: SPEC-00〜06 を読んでいること。

---

## 1. 全体像

### 1.1 採用技術

| 項目 | 内容 |
|------|------|
| Webフレームワーク | Next.js 14（App Router） |
| 言語 | TypeScript |
| スタイル | Tailwind CSS |
| 認証 | Supabase Auth + Custom Wallet Auth |
| Web3 | wagmi v2 + viem |
| ウォレット | RainbowKit / ConnectKit / wagmi 標準 |
| ホスティング | Cloudflare Pages |

### 1.2 ページ構成

```
openclaw.com/
│
├── /                        ← LP（既存HTMLをNext.js化）
├── /claws                   ← 30体カタログ
├── /claws/[no-name]         ← 各キャラ詳細ページ（30個、既存HTML流用）
├── /apply                   ← 購入フロー入口（紹介者リンク経由）
├── /thanks                  ← 購入完了
│
├── /login                   ← ログイン
├── /register                ← 新規登録
│
├── /account                 ← 会員エリア（要認証）
│   ├── /dashboard           ← マイダッシュボード
│   ├── /claws               ← 所有Claws一覧
│   ├── /sites               ← HP管理
│   ├── /referrals           ← 紹介系図・報酬
│   ├── /settings            ← 設定（ウォレット連携、Telegram連携）
│   └── /academy             ← Academy（準備中表示）
│
├── /admin                   ← 管理者エリア（要 admin 権限）
│   ├── /dashboard           ← 全体統計
│   ├── /users               ← ユーザー管理
│   ├── /purchases           ← 購入履歴
│   ├── /referrals           ← 紹介系図・分配履歴
│   ├── /notifications       ← プッシュ通知送信
│   └── /settings            ← システム設定
│
└── /api/                    ← Next.js Route Handlers
    ├── /auth/...
    ├── /purchase/webhook    ← 購入確定 Webhook
    ├── /telegram/link       ← Telegram 連携用
    └── ...
```

---

## 2. ディレクトリ構造

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (marketing)/                     # LP・カタログ（公開）
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                     # LP
│   │   │   ├── claws/
│   │   │   │   ├── page.tsx                 # 30体カタログ
│   │   │   │   └── [slug]/page.tsx          # 各キャラ詳細
│   │   │   ├── apply/page.tsx               # 購入フロー
│   │   │   └── thanks/page.tsx              # 完了
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── account/                         # 会員エリア
│   │   │   ├── layout.tsx                   # 認証ガード付き
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── claws/page.tsx
│   │   │   ├── sites/page.tsx
│   │   │   ├── referrals/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── admin/                           # 管理者エリア
│   │   │   ├── layout.tsx                   # admin ガード付き
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── ...
│   │   │
│   │   └── api/                             # Route Handlers
│   │       ├── auth/...
│   │       ├── purchase/
│   │       │   └── webhook/route.ts
│   │       └── ...
│   │
│   ├── components/
│   │   ├── ui/                              # 汎用UI
│   │   ├── marketing/
│   │   │   ├── Hero.tsx
│   │   │   ├── ClawCard.tsx
│   │   │   ├── PurchaseModal.tsx
│   │   │   └── ...
│   │   ├── account/
│   │   ├── admin/
│   │   └── web3/
│   │       ├── ConnectWalletButton.tsx
│   │       ├── PurchaseButton.tsx
│   │       └── WalletProvider.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── admin.ts
│   │   ├── web3/
│   │   │   ├── config.ts                    # wagmi config
│   │   │   ├── contracts.ts                 # ABI/addresses
│   │   │   └── hooks.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   │
│   ├── data/
│   │   └── characters/                      # 30体のキャラデータ（共通）
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   └── types/
│
├── public/
│   ├── claws/                                # 30体PNG画像
│   └── ...
│
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. LP（既存HTMLのNext.js化）

### 3.1 既存資産

仁さんと一緒に作った `openclaw_lp.html` を Next.js のページコンポーネントに変換する。

### 3.2 LP の構造

`src/app/(marketing)/page.tsx`:

```typescript
import Hero from '@/components/marketing/Hero';
import StorySection from '@/components/marketing/StorySection';
import CharactersSection from '@/components/marketing/CharactersSection';
import OathSection from '@/components/marketing/OathSection';
import SummoningSection from '@/components/marketing/SummoningSection';
import ColonySection from '@/components/marketing/ColonySection';
import CtaSection from '@/components/marketing/CtaSection';

interface PageProps {
  searchParams: { ref?: string };
}

export default async function HomePage({ searchParams }: PageProps) {
  const referralCode = searchParams.ref;
  
  // 紹介者コードがある場合、cookieに保存（30日間）
  if (referralCode) {
    // クライアント側で実行する処理（Next.js Middleware で対応）
  }
  
  return (
    <main>
      <Hero referralCode={referralCode} />
      <StorySection />
      <CharactersSection />
      <OathSection />
      <SummoningSection />
      <ColonySection />
      <CtaSection referralCode={referralCode} />
    </main>
  );
}
```

### 3.3 紹介者コード処理（Middleware）

`src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'oc_ref';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30日

export function middleware(request: NextRequest) {
  const refCode = request.nextUrl.searchParams.get('ref');
  const response = NextResponse.next();
  
  if (refCode) {
    response.cookies.set(COOKIE_NAME, refCode, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false, // クライアントから読めるように
      secure: true,
      sameSite: 'lax',
    });
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 4. 30体カタログページ

### 4.1 一覧ページ

`src/app/(marketing)/claws/page.tsx`:

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server';
import ClawCard from '@/components/marketing/ClawCard';

export const dynamic = 'force-dynamic';

export default async function ClawsCatalogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: claws } = await supabase
    .from('claws')
    .select('*')
    .eq('is_active', true)
    .order('claw_no');
  
  return (
    <main className="min-h-screen bg-bg-deep">
      <section className="container mx-auto px-4 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-text-main mb-4">
          30 戦士が、汝を待つ
        </h1>
        <p className="text-text-dim mb-12">
          各 Claw が、それぞれ異なる主のために召喚される。
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {claws?.map(claw => (
            <ClawCard key={claw.id} claw={claw} />
          ))}
        </div>
      </section>
    </main>
  );
}
```

### 4.2 各キャラ詳細ページ

既に作成済みの `openclaw_char_XX_YY.html` を Next.js にコンバート。

`src/app/(marketing)/claws/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import ClawDetail from '@/components/marketing/ClawDetail';

interface PageProps {
  params: { slug: string };  // 例: '01-guren', '02-hyosho'
  searchParams: { ref?: string };
}

export async function generateStaticParams() {
  // ビルド時に30件分のページを生成
  const supabase = await createSupabaseServerClient();
  const { data: claws } = await supabase.from('claws').select('claw_no, name_romaji');
  
  return claws?.map(claw => ({
    slug: `${String(claw.claw_no).padStart(2, '0')}-${claw.name_romaji}`,
  })) || [];
}

export default async function ClawDetailPage({ params, searchParams }: PageProps) {
  // slug からキャラを特定
  const [noStr, ...nameParts] = params.slug.split('-');
  const clawNo = parseInt(noStr);
  
  const supabase = await createSupabaseServerClient();
  const { data: claw } = await supabase
    .from('claws')
    .select('*')
    .eq('claw_no', clawNo)
    .single();
  
  if (!claw) notFound();
  
  return <ClawDetail claw={claw} referralCode={searchParams.ref} />;
}

export async function generateMetadata({ params }: PageProps) {
  // ... SEO用メタデータ
}
```

---

## 5. 購入フロー

### 5.1 全体フロー

```
[LP / カタログ]
   │
   │ 「召喚する」ボタン
   ▼
[購入モーダル / /apply ページ]
   │
   │ 1. キャラ選択
   │ 2. 紹介者コード確認
   │ 3. ウォレット接続（MetaMask 等）
   │ 4. USDT Approve（300 USDT 分）
   │ 5. mintClaw() トランザクション送信
   │
   ▼
[トランザクション確認画面]
   │
   │ ・ブロック確認待ち
   │ ・Etherscan等でtx確認
   ▼
[Webhook 起動]
   │
   │ Cloudflare Workers が
   │ CharacterMinted Event を検知
   │
   ▼
[Backend 処理]
   │
   │ ・nft_purchases レコード作成
   │ ・nft_tokens レコード作成
   │ ・referrals チェーン作成
   │ ・referral_rewards 計算（即時）
   │ ・Telegram 連携リンク発行
   │
   ▼
[/thanks ページ]
   │
   │ ・購入完了表示
   │ ・Telegram 連携 QR コード
   │ ・連携リンク
```

### 5.2 購入モーダル / ページ

`src/app/(marketing)/apply/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import { ConnectWalletButton } from '@/components/web3/ConnectWalletButton';
import { CharacterSelection } from '@/components/marketing/CharacterSelection';
import { PurchaseFlow } from '@/components/marketing/PurchaseFlow';

export default function ApplyPage() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');
  const characterNo = searchParams.get('claw');
  
  const { isConnected, address } = useAccount();
  const [selectedClaw, setSelectedClaw] = useState<number | null>(
    characterNo ? parseInt(characterNo) : null
  );
  
  return (
    <main className="min-h-screen bg-bg-deep py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-bold text-text-main mb-8 text-center">
          Claws を召喚する
        </h1>
        
        {/* Step 1: キャラ選択 */}
        {!selectedClaw && (
          <CharacterSelection onSelect={setSelectedClaw} />
        )}
        
        {/* Step 2: ウォレット接続 */}
        {selectedClaw && !isConnected && (
          <div className="text-center">
            <p className="text-text-dim mb-6">
              続けるには、ウォレットを接続してください
            </p>
            <ConnectWalletButton />
          </div>
        )}
        
        {/* Step 3: 購入実行 */}
        {selectedClaw && isConnected && address && (
          <PurchaseFlow
            characterNo={selectedClaw}
            walletAddress={address}
            referralCode={referralCode}
          />
        )}
      </div>
    </main>
  );
}
```

### 5.3 ウォレット接続コンポーネント

`src/components/web3/WalletProvider.tsx`:

```typescript
'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { metaMask, walletConnect, injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = createConfig({
  chains: [polygon],
  connectors: [
    metaMask(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID! }),
    injected(),
  ],
  transports: {
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
  },
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 5.4 購入フローの実装

`src/components/marketing/PurchaseFlow.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { CLAWS_NFT_ABI, USDT_ABI, NFT_CONTRACT_ADDRESS, USDT_CONTRACT_ADDRESS } from '@/lib/web3/contracts';

interface PurchaseFlowProps {
  characterNo: number;
  walletAddress: `0x${string}`;
  referralCode: string | null;
}

export function PurchaseFlow({ characterNo, walletAddress, referralCode }: PurchaseFlowProps) {
  const [step, setStep] = useState<'check' | 'approving' | 'purchasing' | 'completed'>('check');
  const [referrerAddress, setReferrerAddress] = useState<`0x${string}`>(/* 運営アドレス（デフォルト） */);
  
  const PRICE_USDT = parseUnits('300', 6);
  
  // 1. USDT 残高チェック
  const { data: usdtBalance } = useReadContract({
    address: USDT_CONTRACT_ADDRESS,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: [walletAddress],
  });
  
  // 2. USDT Allowance チェック
  const { data: usdtAllowance } = useReadContract({
    address: USDT_CONTRACT_ADDRESS,
    abi: USDT_ABI,
    functionName: 'allowance',
    args: [walletAddress, NFT_CONTRACT_ADDRESS],
  });
  
  const needsApproval = (usdtAllowance ?? 0n) < PRICE_USDT;
  const hasInsufficientBalance = (usdtBalance ?? 0n) < PRICE_USDT;
  
  // 3. Approve transaction
  const { writeContractAsync: writeApprove } = useWriteContract();
  
  // 4. Mint transaction
  const { writeContractAsync: writeMint } = useWriteContract();
  const [mintTxHash, setMintTxHash] = useState<`0x${string}` | undefined>();
  
  const { isLoading: isMinting, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintTxHash,
  });
  
  // 5. 紹介者アドレスの解決
  useEffect(() => {
    if (referralCode) {
      // 紹介者コードからウォレットアドレスを取得
      fetch(`/api/referrer/${referralCode}`)
        .then(r => r.json())
        .then(data => setReferrerAddress(data.walletAddress));
    } else {
      setReferrerAddress(process.env.NEXT_PUBLIC_ADMIN_DEFAULT_REFERRER_WALLET as `0x${string}`);
    }
  }, [referralCode]);
  
  const handlePurchase = async () => {
    try {
      // Step 1: Approve USDT (必要なら)
      if (needsApproval) {
        setStep('approving');
        const approveTx = await writeApprove({
          address: USDT_CONTRACT_ADDRESS,
          abi: USDT_ABI,
          functionName: 'approve',
          args: [NFT_CONTRACT_ADDRESS, PRICE_USDT],
        });
        // Approve確認待ち
      }
      
      // Step 2: Mint
      setStep('purchasing');
      const mintTx = await writeMint({
        address: NFT_CONTRACT_ADDRESS,
        abi: CLAWS_NFT_ABI,
        functionName: 'mintClaw',
        args: [characterNo, referrerAddress],
      });
      setMintTxHash(mintTx);
    } catch (error: any) {
      console.error('Purchase failed:', error);
      // エラー表示
    }
  };
  
  // 完了時
  useEffect(() => {
    if (isMintSuccess) {
      setStep('completed');
      // /thanks へ遷移（tx hash付き）
      window.location.href = `/thanks?tx=${mintTxHash}`;
    }
  }, [isMintSuccess, mintTxHash]);
  
  return (
    <div className="bg-bg-card border border-border-faint rounded-lg p-8">
      <h2 className="text-2xl font-bold text-text-main mb-6">
        召喚を実行
      </h2>
      
      <div className="space-y-4 mb-8">
        <div>
          <span className="text-text-dim">ウォレット:</span>
          <span className="text-text-main ml-2 font-mono text-sm">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
        
        <div>
          <span className="text-text-dim">USDT 残高:</span>
          <span className={`ml-2 ${hasInsufficientBalance ? 'text-red-500' : 'text-text-main'}`}>
            {usdtBalance ? `${Number(usdtBalance) / 1e6} USDT` : '...'}
          </span>
        </div>
        
        <div>
          <span className="text-text-dim">必要金額:</span>
          <span className="text-gold-bright ml-2 font-bold">300 USDT</span>
        </div>
        
        {referralCode && (
          <div>
            <span className="text-text-dim">紹介者:</span>
            <span className="text-text-main ml-2 font-mono text-sm">
              {referralCode}
            </span>
          </div>
        )}
      </div>
      
      {hasInsufficientBalance && (
        <div className="bg-red-900/30 border border-red-500/50 rounded p-4 mb-6">
          <p className="text-red-400">
            USDT 残高が足りません。ウォレットに USDT (Polygon版) をご用意ください。
          </p>
        </div>
      )}
      
      <button
        onClick={handlePurchase}
        disabled={hasInsufficientBalance || step !== 'check'}
        className="w-full py-4 bg-red-blood hover:bg-red-bright text-text-main font-bold rounded transition disabled:opacity-50"
      >
        {step === 'check' && (needsApproval ? 'USDT Approve → 召喚' : '召喚する')}
        {step === 'approving' && 'USDT Approve 中...'}
        {step === 'purchasing' && '召喚中...'}
        {step === 'completed' && '完了'}
      </button>
    </div>
  );
}
```

### 5.5 購入完了 Webhook

`src/app/api/purchase/webhook/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { polygon } from 'viem/chains';
import { createServiceRoleClient } from '@/lib/supabase/admin';

// Webhook は Cloudflare Workers がブロックチェーンイベントを監視して送信する想定
// 別案: Alchemy / QuickNode の Webhook 機能を使う

export async function POST(request: Request) {
  const body = await request.json();
  
  // Webhook 署名検証
  const signature = request.headers.get('X-Webhook-Signature');
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const { 
    transactionHash, 
    blockNumber, 
    buyer, 
    tokenId, 
    characterNo, 
    referrer,
    priceUSDT,
  } = body;
  
  const supabase = createServiceRoleClient();
  
  // 1. ユーザーを特定（ウォレットアドレスから）
  let userId: string;
  const { data: existingWallet } = await supabase
    .from('user_wallets')
    .select('user_id')
    .eq('wallet_address', buyer.toLowerCase())
    .single();
  
  if (existingWallet) {
    userId = existingWallet.user_id;
  } else {
    // 新規ユーザー作成（メールなしでもOK、後で連携時にメール紐付け）
    const { data: newUser } = await supabase.auth.admin.createUser({
      email: `wallet-${buyer.toLowerCase()}@openclaw.local`,
      email_confirm: true,
    });
    userId = newUser.user.id;
    
    await supabase.from('user_wallets').insert({
      user_id: userId,
      wallet_address: buyer.toLowerCase(),
      chain_id: 137,
      is_primary: true,
      is_verified: true,
    });
  }
  
  // 2. キャラ取得
  const { data: claw } = await supabase
    .from('claws')
    .select('id')
    .eq('claw_no', characterNo)
    .single();
  
  // 3. 紹介者の特定
  let referrerUserId: string | null = null;
  if (referrer.toLowerCase() !== process.env.ADMIN_DEFAULT_REFERRER_WALLET?.toLowerCase()) {
    const { data: refWallet } = await supabase
      .from('user_wallets')
      .select('user_id')
      .eq('wallet_address', referrer.toLowerCase())
      .single();
    referrerUserId = refWallet?.user_id || null;
  }
  
  // ユーザーに紹介者情報をセット（初回のみ）
  if (referrerUserId) {
    await supabase
      .from('users')
      .update({ referrer_user_id: referrerUserId })
      .eq('id', userId)
      .is('referrer_user_id', null);
  }
  
  // 4. 上位3世代の紹介者取得
  const { data: chain } = await supabase
    .from('referrals')
    .select('referrer_user_id, generation')
    .eq('referred_user_id', userId)
    .order('generation');
  
  // 5. nft_purchases レコード作成
  const { data: purchase } = await supabase
    .from('nft_purchases')
    .insert({
      user_id: userId,
      buyer_wallet_address: buyer.toLowerCase(),
      claw_id: claw.id,
      claw_no: characterNo,
      token_id: tokenId,
      amount_usdt: 300,
      transaction_hash: transactionHash,
      block_number: blockNumber,
      chain_id: 137,
      referrer_user_id: chain?.find(c => c.generation === 1)?.referrer_user_id || null,
      referrer_2_user_id: chain?.find(c => c.generation === 2)?.referrer_user_id || null,
      referrer_3_user_id: chain?.find(c => c.generation === 3)?.referrer_user_id || null,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  // 6. nft_tokens レコード作成
  await supabase
    .from('nft_tokens')
    .insert({
      token_id: tokenId,
      contract_address: process.env.NFT_CONTRACT_ADDRESS,
      chain_id: 137,
      claw_id: claw.id,
      claw_no: characterNo,
      owner_wallet_address: buyer.toLowerCase(),
      owner_user_id: userId,
      is_active: true,
      last_verified_at: new Date().toISOString(),
      minted_at: new Date().toISOString(),
      initial_purchase_id: purchase.id,
    });
  
  // 7. 紹介報酬のリアルタイム計算（SPEC-03）
  await fetch(`${process.env.REWARD_CALCULATOR_URL}/calculate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REWARD_CALCULATOR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ purchaseId: purchase.id }),
  });
  
  // 8. Telegram 連携リンク発行
  const linkCode = generateLinkCode();
  await supabase
    .from('telegram_link_requests')
    .insert({
      user_id: userId,
      code: linkCode,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used: false,
    });
  
  // 9. メール送信（購入完了 + Telegram 連携手順）
  await sendPurchaseCompletedEmail(userId, characterNo, linkCode);
  
  return NextResponse.json({ success: true });
}
```

### 5.6 完了ページ

`src/app/(marketing)/thanks/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode.react';

export default function ThanksPage() {
  const searchParams = useSearchParams();
  const tx = searchParams.get('tx');
  
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [characterInfo, setCharacterInfo] = useState<any>(null);
  
  useEffect(() => {
    // tx hash から購入情報を取得
    fetch(`/api/purchase/info?tx=${tx}`)
      .then(r => r.json())
      .then(data => {
        setLinkCode(data.linkCode);
        setCharacterInfo(data.character);
      });
  }, [tx]);
  
  if (!linkCode || !characterInfo) {
    return <div>処理中...</div>;
  }
  
  const telegramLink = `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${linkCode}`;
  
  return (
    <main className="min-h-screen bg-bg-deep py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gold-bright mb-4">
            召喚、完了
          </h1>
          <p className="text-text-dim">
            主、{characterInfo.name_jp} がお主の元へやってきた。
          </p>
        </div>
        
        <div className="bg-bg-card border border-border-faint rounded-lg p-8">
          <h2 className="text-xl font-bold text-text-main mb-4">
            次のステップ：Telegramで {characterInfo.name_jp} と会話する
          </h2>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="bg-white p-4 rounded">
              <QRCode value={telegramLink} size={200} />
            </div>
            
            <div>
              <p className="text-text-dim mb-4">
                スマホで QR コードをスキャンするか、下のボタンから連携してください。
              </p>
              <a
                href={telegramLink}
                className="inline-block px-8 py-4 bg-red-blood hover:bg-red-bright text-text-main font-bold rounded transition"
              >
                Telegram で開く
              </a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border-faint">
            <p className="text-text-mute text-sm">
              連携リンクの有効期限: 24時間以内<br />
              トランザクション: <a href={`https://polygonscan.com/tx/${tx}`} className="text-gold underline">{tx?.slice(0, 10)}...</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
```

---

## 6. 認証・会員エリア

### 6.1 認証戦略

```
1. ウォレット署名による認証（メイン）
   - ユーザーがウォレット接続 → 署名 → Supabase Auth セッション発行

2. メール+パスワード（オプション）
   - 後から追加可能（メールリカバリ用）

3. Telegram経由のリンク（プライマリではない）
```

### 6.2 ウォレット署名ログイン

`src/lib/auth.ts`:

```typescript
import { createPublicClient, http, recoverMessageAddress } from 'viem';
import { polygon } from 'viem/chains';

export async function signInWithWallet(
  walletAddress: string,
  signature: string,
  message: string
): Promise<{ session: any }> {
  // 1. 署名を検証
  const recoveredAddress = await recoverMessageAddress({
    message,
    signature: signature as `0x${string}`,
  });
  
  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Invalid signature');
  }
  
  // 2. user を取得 or 作成
  const supabase = createServiceRoleClient();
  
  let { data: wallet } = await supabase
    .from('user_wallets')
    .select('user_id, user:users(*)')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();
  
  if (!wallet) {
    // 新規作成
    const { data: newUser } = await supabase.auth.admin.createUser({
      email: `wallet-${walletAddress.toLowerCase()}@openclaw.local`,
      email_confirm: true,
    });
    
    await supabase.from('user_wallets').insert({
      user_id: newUser.user.id,
      wallet_address: walletAddress.toLowerCase(),
      chain_id: 137,
      is_primary: true,
      is_verified: true,
    });
    
    wallet = { user_id: newUser.user.id, user: newUser.user };
  }
  
  // 3. Magic Linkで認証セッション発行
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: wallet.user.email,
  });
  
  // 4. クライアント側で sessionにセット
  
  return { session: linkData };
}
```

### 6.3 会員エリアのレイアウト

`src/app/account/layout.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AccountNav from '@/components/account/AccountNav';

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return (
    <div className="min-h-screen bg-bg-deep flex">
      <AccountNav user={user} />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
```

### 6.4 主要画面

各画面の概要のみ記載（実装はClaude Codeに委任）：

**/account/dashboard**:
- 所持Claws数、累計報酬、最近の活動
- お知らせ、Telegram連携状態

**/account/claws**:
- 所持Claws一覧（30体のうち持ってるもの）
- 各Clawから「会話する」「HPを管理」「投稿スケジュール」へリンク

**/account/sites**:
- 自分が作ったHP一覧
- 各HPの編集、停止、削除

**/account/referrals**:
- 自分の紹介コード（コピーボタン付き）
- 紹介系図のツリー表示
- 報酬履歴
- 動的%の現在状態（MVP2以降）

**/account/settings**:
- ウォレット管理（追加、変更）
- Telegram連携状態
- メールアドレス変更
- 退会

---

## 7. 管理者ダッシュボード

### 7.1 主要画面

**/admin/dashboard**:
- 全体KPI（総売上、総ユーザー数、総NFT発行数、運営取り分）
- 日別購入グラフ
- 最新の購入5件

**/admin/users**:
- 全ユーザー検索・一覧
- ユーザー詳細（紹介系図、購入履歴、Bot活動）
- アカウントアクション（停止、強制ログアウト等）

**/admin/purchases**:
- 全購入履歴
- 状態別フィルター
- CSV エクスポート

**/admin/referrals**:
- 紹介系図全体ビュー
- 報酬分配の実行履歴
- 失敗バッチの再実行

**/admin/notifications**:
- 通知作成・編集・送信
- 配信先選択（全員、特定キャラ所有者、特定ユーザー）
- 配信履歴

**/admin/settings**:
- システム設定
- 動的%ルール編集（MVP2以降）
- 緊急停止スイッチ

### 7.2 アクセス制御

```typescript
// src/app/admin/layout.tsx

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');
  
  // 管理者チェック
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (!adminUser) {
    redirect('/account/dashboard');
  }
  
  return (
    <div className="min-h-screen bg-bg-deep flex">
      <AdminNav user={user} role={adminUser.role} />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
```

---

## 8. パフォーマンス最適化

### 8.1 ISR（Incremental Static Regeneration）

各キャラ詳細ページは ISR で生成：

```typescript
export const revalidate = 3600; // 1時間ごとに再生成
```

### 8.2 画像最適化

- Next.js Image コンポーネント使用
- WebP / AVIF 対応
- 適切なサイズの提供

### 8.3 Cloudflare の活用

- キャッシュ設定
- Cloudflare Workers でAPI高速化
- Cloudflare Images で画像配信

---

## 9. SEO 対策

### 9.1 メタデータ

各ページで `generateMetadata` を実装：

```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const claw = await getClaw(params.slug);
  
  return {
    title: `${claw.name_jp} / ${claw.name_en} - OPENCLAW`,
    description: claw.tagline,
    openGraph: {
      images: [`/claws/${claw.image_filename}`],
    },
  };
}
```

### 9.2 sitemap.xml

`src/app/sitemap.ts`:

```typescript
export default async function sitemap() {
  const supabase = await createSupabaseServerClient();
  const { data: claws } = await supabase.from('claws').select('claw_no, name_romaji');
  
  return [
    { url: 'https://openclaw.com', lastModified: new Date() },
    { url: 'https://openclaw.com/claws', lastModified: new Date() },
    ...claws!.map(c => ({
      url: `https://openclaw.com/claws/${String(c.claw_no).padStart(2, '0')}-${c.name_romaji}`,
      lastModified: new Date(),
    })),
  ];
}
```

---

## 10. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-07 LP・購入フロー
- 対象: apps/web/

[タスク]
SPEC-07 に記載されているWebアプリケーションを実装してください。

[具体的な要件]
1. Next.js 14（App Router） + TypeScript + Tailwind CSS
2. 既存LPのNext.js化
3. 30体カタログ + 各キャラ詳細ページ（ビルド時生成）
4. 購入フロー（wagmi + viem）
5. ウォレット署名認証
6. 会員エリア（マイページ）
7. 管理者ダッシュボード
8. Webhook（購入完了処理）

[既存資産]
- openclaw_lp.html（メインLP）
- openclaw_30claws_collage.html（30体集合）
- openclaw_char_01_guren.html ... 30個（各キャラ詳細）

これらのデザインと文章をそのままNext.jsのコンポーネントに変換してください。

[出力形式]
- 全ソースコード
- README.md
- 画面遷移図

[禁止事項]
- 既存のデザインを大きく変更しない
- セキュリティ（管理者ガード、ウォレット検証）を省略しない
```

---

## 11. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-07**

次のドキュメント: SPEC-08 プッシュ通知システム
