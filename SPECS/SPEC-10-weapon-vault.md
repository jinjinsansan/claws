# SPEC-10: OPENCLAW Platform - 武器倉庫（Weapon Vault）

> **このドキュメントの位置づけ**: ユーザーが自分のClawに機能を追加できる「武器倉庫」の仕様。GitHub連携によるプラグインシステム、オープンソース無料武器、仁さん製有料武器、紹介報酬連動を定義する。
> 
> **MVP3 で実装予定**（MVP1/2では未実装）。
> 
> **前提**: SPEC-00〜09 を読んでいること。

---

## 1. 武器倉庫の全体像

### 1.1 コンセプト

ユーザーが自分の Claws に「武器」と呼ばれる追加機能を装備できる仕組み。

```
Claw（基本機能のみ）
   │
   │ 武器を装備
   ▼
Claw + 武器（拡張機能）
   ・X 自動分析武器
   ・予約管理武器
   ・在庫管理武器
   ・チャットボット武器
   など
```

### 1.2 武器の3種類

| 種類 | 価格 | 提供元 | 紹介報酬 |
|------|------|--------|---------|
| **オープンソース武器** | 無料 | コミュニティ開発者 | なし（無料のため） |
| **公式武器** | 1,000〜10,000円 | 仁さん（運営）製 | あり |
| **マーケットプレイス武器** | 1,000〜30,000円 | 認定開発者 | あり |

### 1.3 ユーザー体験

```
1. ユーザー: マイページの「武器倉庫」を開く
2. 武器一覧: ジャンル別、人気順、新着順
3. 詳細を見る: 機能、対応Claw、レビュー
4. 装備: ワンクリックで自分のClawに装備
   - 無料武器: 即装備
   - 有料武器: 決済 → 装備
5. Bot で使う:
   ユーザー: 「予約状況見せて」
   Claw: (予約管理武器が応答) 「主、今週の予約は12件だ」
6. 後日、不要になったら装備解除
```

### 1.4 採用技術

| 項目 | 内容 |
|------|------|
| 武器配信 | GitHub Repository |
| 検証エンジン | Cloudflare Workers + Sandboxie実行 |
| 課金 | Stripe + 武器固有 |
| プラグインAPI | TypeScript + Zod スキーマ |

---

## 2. 武器の技術構造

### 2.1 武器の最小構成

各武器は GitHub の独立リポジトリで公開する：

```
github.com/<owner>/openclaw-weapon-<name>/
├── manifest.json         # 武器のメタデータ
├── handler.ts            # メインのハンドラコード
├── README.md
├── package.json
├── tests/
│   └── handler.test.ts
└── ...
```

### 2.2 manifest.json

```json
{
  "name": "予約管理武器",
  "name_en": "ReservationManager",
  "version": "1.0.0",
  "description": "サロン・飲食店向け、予約をBotで管理する武器",
  "author": {
    "name": "仁",
    "github": "jinjinsansan",
    "wallet_address": "0x..."
  },
  "category": "business_tool",
  "tags": ["予約", "サロン", "飲食店"],
  "compatible_claws": [6, 14, 17, 18, 22, 25, 28, 29, 30],
  "icon_url": "https://...",
  "screenshot_urls": ["https://..."],
  "price": {
    "currency": "JPY",
    "amount": 5000,
    "billing": "one_time"
  },
  "permissions": [
    "read:user_profile",
    "store:user_data",
    "send:bot_messages"
  ],
  "intents": [
    {
      "trigger": "予約.*確認|予約.*見せ|予約.*教え",
      "handler": "showReservations"
    },
    {
      "trigger": "予約.*追加|新.*予約",
      "handler": "addReservation"
    },
    {
      "trigger": "予約.*削除|キャンセル",
      "handler": "cancelReservation"
    }
  ],
  "commands": [
    {
      "name": "/reservations",
      "description": "予約一覧"
    }
  ]
}
```

### 2.3 handler.ts の仕様

```typescript
import type { WeaponHandler, BotContext, WeaponState } from '@openclaw/weapon-sdk';

// 武器のエクスポート関数（必須）
export const handler: WeaponHandler = {
  // 起動時の初期化
  async onInstall(ctx: BotContext): Promise<void> {
    // 武器が装備された時に呼ばれる
    await ctx.storage.set('reservations', []);
    await ctx.bot.reply('予約管理武器を装備しました。「予約見せて」と言ってみて。');
  },
  
  // 装備解除時
  async onUninstall(ctx: BotContext): Promise<void> {
    // クリーンアップ
  },
  
  // 各 intent の処理
  intents: {
    showReservations: async (ctx: BotContext) => {
      const reservations = await ctx.storage.get<Reservation[]>('reservations') || [];
      const upcoming = reservations.filter(r => new Date(r.date) > new Date());
      
      if (upcoming.length === 0) {
        await ctx.bot.reply('主、現在予約はない。');
        return;
      }
      
      const list = upcoming
        .slice(0, 10)
        .map(r => `・${r.date} ${r.time} ${r.customer}`)
        .join('\n');
      
      await ctx.bot.reply(`主、これから${upcoming.length}件の予約だ。\n\n${list}`);
    },
    
    addReservation: async (ctx: BotContext) => {
      // マルチターン会話で予約情報を聞く
      await ctx.session.setState('adding_reservation', { step: 'date' });
      await ctx.bot.reply('日付を教えてくれ。例: 2026-05-01');
    },
    
    cancelReservation: async (ctx: BotContext) => {
      // ...
    },
  },
  
  // 状態遷移ハンドラ（マルチターン対応）
  states: {
    adding_reservation: async (ctx: BotContext, message: string) => {
      const state = ctx.session.getState();
      // ...ステップごとの処理
    },
  },
};

interface Reservation {
  id: string;
  date: string;
  time: string;
  customer: string;
  notes?: string;
}
```

### 2.4 Weapon SDK

`@openclaw/weapon-sdk` パッケージを提供。武器開発者はこのSDKを使う：

```typescript
// @openclaw/weapon-sdk

export interface BotContext {
  // ユーザー情報
  user: {
    id: string;
    walletAddress: string;
  };
  
  // アクティブClaw
  claw: {
    id: string;
    nameJp: string;
    nameEn: string;
  };
  
  // ストレージ
  storage: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
  };
  
  // Bot 操作
  bot: {
    reply(message: string): Promise<void>;
    sendMessage(userId: string, message: string): Promise<void>;
  };
  
  // セッション管理
  session: {
    getState(): { name: string; data: any } | null;
    setState(name: string, data: any): Promise<void>;
    clearState(): Promise<void>;
  };
  
  // LLM 呼び出し
  llm: {
    generate(prompt: string, options?: LLMOptions): Promise<string>;
  };
  
  // ユーザーが入力したメッセージ
  message: {
    text: string;
    timestamp: Date;
  };
  
  // 環境変数（武器ごとの設定）
  env: Record<string, string>;
}

export interface WeaponHandler {
  onInstall?(ctx: BotContext): Promise<void>;
  onUninstall?(ctx: BotContext): Promise<void>;
  intents: Record<string, (ctx: BotContext) => Promise<void>>;
  states?: Record<string, (ctx: BotContext, message: string) => Promise<void>>;
}
```

---

## 3. データベーススキーマ追加

### 3.1 weapons（武器マスター）

```sql
CREATE TABLE public.weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 識別情報
  slug TEXT NOT NULL UNIQUE,                 -- 'reservation-manager'
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,                    -- 'business_tool', 'analytics', 'communication', 'fun', etc.
  tags TEXT[] DEFAULT '{}',
  
  -- バージョン
  current_version TEXT NOT NULL,
  
  -- GitHub
  github_repo TEXT NOT NULL,                 -- 'jinjinsansan/openclaw-weapon-reservation'
  github_branch TEXT NOT NULL DEFAULT 'main',
  manifest_path TEXT NOT NULL DEFAULT 'manifest.json',
  handler_path TEXT NOT NULL DEFAULT 'dist/handler.js',  -- ビルド後
  
  -- 開発者
  developer_id UUID REFERENCES public.weapon_developers(id),
  developer_name TEXT NOT NULL,
  developer_wallet TEXT NOT NULL,
  
  -- 互換性
  compatible_claws INTEGER[] NOT NULL,       -- [1, 2, 3, ...] 互換するClaw番号
  required_permissions TEXT[] NOT NULL,
  
  -- 価格
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('free', 'one_time', 'subscription')),
  price_jpy INTEGER,                         -- NULL if free
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'deprecated')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  
  -- ビジュアル
  icon_url TEXT,
  screenshot_urls TEXT[] DEFAULT '{}',
  
  -- 統計
  install_count INTEGER NOT NULL DEFAULT 0,
  active_install_count INTEGER NOT NULL DEFAULT 0,
  rating_average NUMERIC(3,2),
  rating_count INTEGER NOT NULL DEFAULT 0,
  
  -- 売上（運営の取り分の合計）
  total_revenue_yen INTEGER NOT NULL DEFAULT 0,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_weapons_slug ON public.weapons(slug);
CREATE INDEX idx_weapons_category ON public.weapons(category);
CREATE INDEX idx_weapons_status ON public.weapons(status) WHERE status = 'approved';
CREATE INDEX idx_weapons_developer ON public.weapons(developer_id);
```

### 3.2 weapon_developers（武器開発者）

```sql
CREATE TABLE public.weapon_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id),
  
  -- 認定情報
  display_name TEXT NOT NULL,
  bio TEXT,
  github_username TEXT,
  website_url TEXT,
  
  -- ステータス
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- 報酬受取先
  receiver_wallet_address TEXT NOT NULL,
  
  -- 統計
  total_weapons_published INTEGER NOT NULL DEFAULT 0,
  total_revenue_received_yen INTEGER NOT NULL DEFAULT 0,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 weapon_purchases（武器購入履歴）

```sql
CREATE TABLE public.weapon_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES public.users(id),
  weapon_id UUID NOT NULL REFERENCES public.weapons(id),
  weapon_version TEXT NOT NULL,
  
  -- 取引
  amount_jpy INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  
  -- 紹介者（購入時のスナップショット）
  referrer_user_id UUID REFERENCES public.users(id),
  referrer_2_user_id UUID REFERENCES public.users(id),
  referrer_3_user_id UUID REFERENCES public.users(id),
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'refunded', 'failed')),
  
  confirmed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weapon_purchases_user ON public.weapon_purchases(user_id);
CREATE INDEX idx_weapon_purchases_weapon ON public.weapon_purchases(weapon_id);
```

### 3.4 weapon_installations（武器装備状態）

```sql
CREATE TABLE public.weapon_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES public.users(id),
  weapon_id UUID NOT NULL REFERENCES public.weapons(id),
  claw_id UUID NOT NULL REFERENCES public.claws(id),
  nft_token_id BIGINT NOT NULL,
  
  -- 装備状態
  is_active BOOLEAN NOT NULL DEFAULT true,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,
  
  -- 武器のバージョン（更新追跡）
  installed_version TEXT NOT NULL,
  
  -- 武器固有のストレージ（武器が使うデータ）
  storage_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- 武器固有の設定
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, weapon_id, claw_id)
);

CREATE INDEX idx_weapon_installations_user_active ON public.weapon_installations(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_weapon_installations_weapon ON public.weapon_installations(weapon_id);
```

### 3.5 weapon_reviews（レビュー）

```sql
CREATE TABLE public.weapon_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  weapon_id UUID NOT NULL REFERENCES public.weapons(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  installation_id UUID REFERENCES public.weapon_installations(id),
  
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(weapon_id, user_id)
);

CREATE INDEX idx_weapon_reviews_weapon ON public.weapon_reviews(weapon_id);
```

---

## 4. 武器の実行アーキテクチャ

### 4.1 セキュリティ要件

ユーザーが任意の武器をインストールするため、**サンドボックス実行**が必須。

採用方針：
- **Cloudflare Workers の隔離環境**を使う
- 各武器は独立したWorkerで実行
- Bot Worker は武器Workerを呼び出すだけ

### 4.2 武器Worker のアーキテクチャ

```
[Bot Worker]
   │
   │ ユーザーメッセージ + Claw選択 + 装備武器リスト
   ▼
[Intent Resolver]
   │
   │ どの武器が応答すべきかを判定
   ▼
[Weapon Worker (武器ごとに分離)]
   │
   │ 武器固有のロジック実行
   │ - SDKを通じてストレージアクセス
   │ - SDKを通じてLLM呼び出し
   │ - SDKを通じてBot応答生成
   ▼
[Bot Worker に応答を返す]
   │
   ▼
[ユーザー]
```

### 4.3 武器Worker の動的読み込み

```typescript
// apps/bot/src/services/weapon-runner.ts

export async function runWeapon(
  installation: any,
  ctx: BotContext,
  env: Env
): Promise<{ handled: boolean; response?: string }> {
  const weapon = await getWeapon(installation.weapon_id, env);
  
  // GitHub からビルド済みハンドラをフェッチ（キャッシュあり）
  const handlerCode = await fetchWeaponCode(weapon, env);
  
  // 武器コードを Cloudflare Workers の隔離環境で実行
  const result = await executeInSandbox(handlerCode, ctx, env);
  
  return result;
}

async function fetchWeaponCode(weapon: any, env: Env): Promise<string> {
  // Cloudflare KV にキャッシュ
  const cached = await env.WEAPON_CACHE.get(`${weapon.id}:${weapon.current_version}`);
  if (cached) return cached;
  
  // GitHub から取得
  const url = `https://raw.githubusercontent.com/${weapon.github_repo}/${weapon.github_branch}/${weapon.handler_path}`;
  const code = await (await fetch(url)).text();
  
  // セキュリティ検査
  await scanCode(code);
  
  // キャッシュ
  await env.WEAPON_CACHE.put(`${weapon.id}:${weapon.current_version}`, code, {
    expirationTtl: 3600,
  });
  
  return code;
}

async function executeInSandbox(
  code: string,
  ctx: BotContext,
  env: Env
): Promise<{ handled: boolean; response?: string }> {
  // Cloudflare Workers の Service Bindings を使う場合
  // または Function 機能（実行時動的JS実行）
  
  // 簡易実装: Function constructor + restricted globals
  const restrictedCtx = createRestrictedContext(ctx);
  
  try {
    const wrappedCode = `
      "use strict";
      ${code}
      return { handler };
    `;
    
    const fn = new Function('ctx', 'env', wrappedCode);
    const { handler } = fn(restrictedCtx, env);
    
    // intent matching 後の handler 呼び出し
    const intent = matchIntent(handler.intents, ctx.message.text);
    if (intent) {
      await handler.intents[intent](restrictedCtx);
      return { handled: true, response: ctx.lastResponse };
    }
    
    return { handled: false };
  } catch (error: any) {
    console.error(`Weapon execution failed:`, error);
    return { handled: false };
  }
}
```

### 4.4 セキュリティスキャン

GitHubからフェッチしたコードに、危険なパターンが含まれていないかチェック：

```typescript
async function scanCode(code: string): Promise<void> {
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /process\.env/,
    /require\s*\(\s*['"]fs['"]/,
    /require\s*\(\s*['"]child_process['"]/,
    /import\s+.*\s+from\s+['"]fs['"]/,
    /globalThis\./,
    /\.constructor\.constructor/,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error(`Dangerous code pattern detected: ${pattern}`);
    }
  }
}
```

---

## 5. 武器の登録フロー

### 5.1 開発者の手順

```
1. 武器のリポジトリを作成
   github.com/<user>/openclaw-weapon-<name>

2. SDK をインストール
   pnpm add @openclaw/weapon-sdk

3. handler.ts を実装

4. テストを書く

5. ビルド (TypeScript → JavaScript)

6. OPENCLAW Platform で武器を登録
   /developer/weapons/new

7. 仁さんがレビュー → 承認

8. マーケットプレイスに公開
```

### 5.2 開発者ダッシュボード

`/developer/dashboard`:

```
【私の武器】
┌─────────────────────────────────────┐
│ 予約管理武器              v1.2.0   │
│ ⭐ 4.5 (152レビュー)                │
│ 423 インストール                   │
│ ¥2,115,000 累計売上                │
│                                       │
│ [編集] [更新] [統計] [設定]         │
└─────────────────────────────────────┘

【新規武器を申請】
[+ 武器を申請する]

【売上】
今月: ¥85,000
累計: ¥2,115,000
[出金: ¥85,000 (Stripe Express経由)]
```

### 5.3 仁さんによる審査

`/admin/weapons/pending`:

```
【審査待ち武器】
┌─────────────────────────────────────┐
│ 在庫管理武器 (新規)                  │
│ 開発者: yamada_dev                   │
│ GitHub: yamada/openclaw-weapon-stock│
│ カテゴリ: business_tool              │
│                                       │
│ [コードレビュー] [テスト実行]       │
│ [承認] [却下]                       │
└─────────────────────────────────────┘
```

---

## 6. 武器の購入フロー

### 6.1 マーケットプレイス UI

`/marketplace`:

```
┌──────────────────────────────────────────────────┐
│  武器倉庫 - Weapon Vault                         │
├──────────────────────────────────────────────────┤
│                                                    │
│  [カテゴリ選択 ▼] [価格 ▼] [評価 ▼] [新着 ▼]   │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ 予約管理武器  │  │ 在庫管理武器 │              │
│  │ 仁          │  │ yamada      │              │
│  │ ⭐4.5 (152) │  │ ⭐4.2 (89)  │              │
│  │ ¥5,000      │  │ ¥3,000      │              │
│  └──────────────┘  └──────────────┘             │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ X分析武器    │  │ AIアバター   │              │
│  │ 仁          │  │ kana_dev    │              │
│  │ ⭐4.8 (340) │  │ ⭐4.0 (52)  │              │
│  │ FREE        │  │ ¥2,000      │              │
│  └──────────────┘  └──────────────┘             │
│                                                    │
└──────────────────────────────────────────────────┘
```

### 6.2 購入ボタン

```typescript
// apps/web/src/app/marketplace/[slug]/page.tsx

export default function WeaponDetailPage({ params }: { params: { slug: string } }) {
  // ...
  
  const handlePurchase = async () => {
    // 1. Stripe決済セッション作成
    const response = await fetch('/api/weapons/checkout', {
      method: 'POST',
      body: JSON.stringify({
        weaponId: weapon.id,
        clawId: selectedClawId,
      }),
    });
    
    const { sessionId } = await response.json();
    
    // 2. Stripe Checkout へリダイレクト
    const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
    await stripe!.redirectToCheckout({ sessionId });
  };
  
  return (
    // UI ...
  );
}
```

### 6.3 Stripe Webhook → 装備

```typescript
// apps/web/src/app/api/stripe/webhook/route.ts

export async function POST(request: Request) {
  // ... Stripe 検証
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // 武器購入の場合
    if (session.metadata?.type === 'weapon_purchase') {
      const { weaponId, userId, clawId } = session.metadata;
      
      // 1. weapon_purchases レコード作成
      const supabase = createServiceRoleClient();
      const { data: purchase } = await supabase
        .from('weapon_purchases')
        .insert({
          user_id: userId,
          weapon_id: weaponId,
          weapon_version: '...',
          amount_jpy: session.amount_total / 100,
          stripe_payment_intent_id: session.payment_intent,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      // 2. 武器を装備
      await supabase.from('weapon_installations').insert({
        user_id: userId,
        weapon_id: weaponId,
        claw_id: clawId,
        nft_token_id: '...',
        installed_version: '...',
        is_active: true,
      });
      
      // 3. 紹介報酬の計算（SPEC-03 と同じロジック、source_type='weapon_purchase'）
      await calculateWeaponReferralRewards(purchase.id);
      
      // 4. 通知送信
      await notifyUserWeaponInstalled(userId, weaponId);
    }
  }
}
```

---

## 7. 紹介報酬の連動

### 7.1 武器購入時の報酬

```
ユーザーAが武器を ¥5,000 で購入
   ↓
紹介者B（直紹介）: 20% = ¥1,000
2世代上C: 7% = ¥350
3世代上D: 3% = ¥150
開発者（武器の作者）: 50% = ¥2,500
運営（仁さん）: 残り 20% = ¥1,000

※ 開発者が仁さん本人の場合、開発者と運営の取り分が合算される
```

### 7.2 計算ロジック

```typescript
// SPEC-03 で定義した REWARD_RATES に追加

const REWARD_RATES = {
  nft_purchase: { GEN_1: 30, GEN_2: 10, GEN_3: 5 },
  academy_subscription: { GEN_1: 15, GEN_2: 5, GEN_3: 2 },
  weapon_purchase: { GEN_1: 20, GEN_2: 7, GEN_3: 3 },
};

const WEAPON_DEVELOPER_SHARE = 50; // 開発者の取り分
const WEAPON_OPERATOR_SHARE = 20;  // 運営の取り分（紹介報酬30%差し引いた残り）
```

---

## 8. 武器の品質管理

### 8.1 自動テスト

各武器のリポジトリに必須のテスト：

```typescript
// tests/handler.test.ts

import { handler } from '../src/handler';
import { createTestContext } from '@openclaw/weapon-sdk/testing';

describe('ReservationManager', () => {
  it('shows reservations when user asks', async () => {
    const ctx = createTestContext({
      message: '予約を見せて',
    });
    
    await ctx.storage.set('reservations', [
      { date: '2026-05-01', time: '14:00', customer: 'tanaka' },
    ]);
    
    await handler.intents.showReservations(ctx);
    
    expect(ctx.lastResponse).toContain('1件の予約');
    expect(ctx.lastResponse).toContain('tanaka');
  });
});
```

### 8.2 セキュリティ自動スキャン

CI/CD でコードを検査：

```yaml
# .github/workflows/security.yml
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test
      - run: npm run security-scan  # @openclaw/weapon-sdk が提供
```

### 8.3 ユーザーレビューによる品質管理

評価1〜2が一定数たまると、武器を一時停止して再審査：

```typescript
// 評価が低い武器の自動チェック
async function checkLowRatedWeapons(env: Env) {
  const supabase = createSupabaseClient(env);
  
  const { data: lowRated } = await supabase
    .from('weapons')
    .select('id, name, rating_average, rating_count')
    .lt('rating_average', 2.5)
    .gte('rating_count', 10)
    .eq('status', 'approved');
  
  for (const weapon of lowRated || []) {
    // 一時停止
    await supabase
      .from('weapons')
      .update({
        status: 'suspended',
        metadata: { suspended_reason: 'Low rating', auto_suspended: true },
      })
      .eq('id', weapon.id);
    
    // 開発者に通知
    await notifyDeveloperSuspension(weapon, env);
  }
}
```

---

## 9. 武器の更新

### 9.1 開発者によるバージョンアップ

```
1. 開発者: GitHub に新バージョンを push
2. リポジトリの release を作成 (v1.1.0)
3. OPENCLAW 開発者ダッシュボードで更新を申請
4. 仁さんが審査
5. 承認後、自動的に既存ユーザーに更新通知
6. ユーザーが「更新」ボタンをクリック
   - 既存のストレージデータは保持
   - コードのみ更新
```

### 9.2 後方互換性の保証

開発者は SDK のバージョンを宣言：

```json
{
  "compatibility": {
    "weapon_sdk": "^2.0.0",
    "openclaw_platform": "^1.5.0"
  }
}
```

互換性が無くなったら、ユーザーに警告 + 強制更新ガイド。

---

## 10. ユーザー体験フロー

### 10.1 武器を見つける

```
1. ユーザー: 「主、予約管理ってできる？」
2. Bot: 「主、武器倉庫に予約管理武器がある。
        装備すれば、俺ができるようになる。
        詳細はこちら: https://openclaw.com/marketplace/reservation-manager」
```

### 10.2 装備する

```
1. ユーザー: マーケットプレイスで武器ページ開く
2. 「装備する」ボタン → ¥5,000 決済
3. 装備するClaw を選択（装備時は1つのClawに紐づく）
4. 完了
5. Bot から通知: 「主、予約管理武器を装備した」
```

### 10.3 使う

```
ユーザー: 「予約見せて」
Bot (紅蓮 + 予約管理武器): 「主、今週の予約は12件だ。
                          一覧:
                          ・5/1 14:00 田中さん
                          ・5/2 11:00 佐藤さん
                          ...」
```

### 10.4 解除する

```
1. /account/weapons で「解除」ボタン
2. 確認: 「データは保持されますが、武器機能は停止します」
3. 解除完了（再装備可能、データ復元）
4. 解除後30日間データを保持、その後削除（規約に明記）
```

---

## 11. ロイヤリティ・収益分配

### 11.1 開発者への送金

毎月1日に集計し、月末までにStripe Express経由で送金：

```typescript
// apps/workers/weapon-revenue/src/handlers/monthly-payout.ts

export async function processMonthlyPayout(env: Env) {
  const supabase = createSupabaseClient(env);
  
  const lastMonth = getPreviousMonthRange();
  
  // 開発者ごとの集計
  const { data: developers } = await supabase
    .from('weapon_developers')
    .select('*');
  
  for (const developer of developers || []) {
    // 過去月の売上集計
    const { data: revenue } = await supabase.rpc('calculate_developer_revenue', {
      developer_id: developer.id,
      start_date: lastMonth.start.toISOString(),
      end_date: lastMonth.end.toISOString(),
    });
    
    if (revenue.amount_jpy < 1000) continue; // 最低出金額
    
    // Stripe で送金
    await stripe.transfers.create({
      amount: revenue.amount_jpy,
      currency: 'jpy',
      destination: developer.stripe_account_id,
      description: `OPENCLAW Weapon Royalty - ${lastMonth.label}`,
    });
    
    // 履歴記録
    await supabase.from('weapon_payouts').insert({
      developer_id: developer.id,
      amount_jpy: revenue.amount_jpy,
      period_start: lastMonth.start,
      period_end: lastMonth.end,
      status: 'sent',
    });
  }
}
```

---

## 12. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-10 武器倉庫
- 対象: apps/web/src/app/marketplace/, apps/workers/weapon-runner/, packages/weapon-sdk/
- フェーズ: MVP3（後で実装、まず仕様書を完成させる）

[タスク]
SPEC-10 に記載されている武器倉庫システムを実装してください。

[具体的な要件]
1. @openclaw/weapon-sdk パッケージ作成
2. 武器登録・審査UI (/admin/weapons, /developer/dashboard)
3. マーケットプレイス UI (/marketplace)
4. 武器実行エンジン（Cloudflare Workers + サンドボックス）
5. Stripe決済 + 紹介報酬連動
6. セキュリティスキャン
7. レビュー機能

[出力形式]
- 全ソースコード
- SDK のドキュメント
- 開発者ガイド

[禁止事項]
- セキュリティスキャンを省略しない
- 任意のコード実行を許可しない
- 仕様書から逸脱しない

[備考]
- MVP3 での実装。MVP1/2 では基本機能のみ実装すること
- 最初は仁さん製の武器のみで運用、外部開発者は後から開放
```

---

## 13. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-10**

次のドキュメント: SPEC-11 環境変数・デプロイ・運用
