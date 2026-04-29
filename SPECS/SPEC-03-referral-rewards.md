# SPEC-03: OPENCLAW Platform - 紹介報酬システム

> **このドキュメントの位置づけ**: 紹介報酬の計算・分配ロジック仕様。3ティアの基本構造、動的%、日次バッチ処理、透明性の確保方法を定義する。
> 
> **前提**: SPEC-00, SPEC-01, SPEC-02 を読んでいること。

---

## 1. 紹介報酬システムの全体像

### 1.1 設計思想

OPENCLAW の紹介報酬システムは、**ネットワークビジネス経験者が魅力を感じる仕組み**を、**法的にクリーンな範囲で**実装する。設計の核心：

1. **3ティアの基本構造**: 直紹介 30% / 2世代上 10% / 3世代上 5%
2. **動的%（MVP2）**: 紹介人数達成、月間ランキング、ティア合計でボーナス
3. **オフチェーン計算 → オンチェーン送金**: 柔軟性と透明性の両立
4. **デフォルト紐付け**: 紹介者なしユーザーは運営に紐付け
5. **完全な記録**: 全ての計算・送金履歴をDB + ブロックチェーンに記録

### 1.2 報酬構造の概要図

```
ユーザーD が 300 USDT を支払う
                │
                ▼
        ┌───────────────┐
        │ 報酬の総額計算  │
        └───────────────┘
                │
                ▼
    ┌───────────┴────────────┐
    │                            │
    ▼                            ▼
 紹介ティアへの分配               運営取り分
    │                          (165 USDT = 55%)
    │
    ├─→ ユーザーC（直紹介）: 90 USDT (30%)
    ├─→ ユーザーB（2世代上）: 30 USDT (10%)
    └─→ ユーザーA（3世代上）: 15 USDT (5%)

合計: 90 + 30 + 15 + 165 = 300 USDT
```

### 1.3 動的%のイメージ（MVP2）

```
基本: 30 / 10 / 5

ボーナス例:
- 直紹介10人達成 → 35 / 10 / 5（直紹介+5%）
- 直紹介30人達成 → 40 / 10 / 5（直紹介+10%）
- 3ティア合計50人 → 35 / 15 / 10（全ティア+5%）
- 3ティア合計100人 → 40 / 20 / 15（全ティア+10%）
- 月間ランキング1位 → +10% bonus
```

---

## 2. MVP1: 基本3ティア（固定%）

### 2.1 計算ロジック

**前提条件**:
- ユーザー D が 300 USDT で Claws を購入
- ユーザー D の上位3世代に C → B → A という紹介者が存在

**計算式**:
```typescript
const PURCHASE_AMOUNT = 300; // USDT

// 報酬率（MVP1は固定）
const RATES = {
  GEN_1_DIRECT: 30,     // 30%
  GEN_2_INDIRECT: 10,   // 10%
  GEN_3_INDIRECT: 5,    // 5%
};

const rewards = [
  { recipient: C, generation: 1, amount: 300 * 0.30 }, // 90 USDT
  { recipient: B, generation: 2, amount: 300 * 0.10 }, // 30 USDT
  { recipient: A, generation: 3, amount: 300 * 0.05 }, // 15 USDT
];

const operatorShare = 300 - 90 - 30 - 15; // 165 USDT (運営)
```

### 2.2 紹介者がいない場合のロジック

仕様（SPEC-00 で確定）:
- 紹介者なしユーザー → 運営者にデフォルト紐付け
- 運営者 → さらに上位の紹介者なし

つまり：
```
ユーザーD が紹介者なしで購入した場合:

referrer_user_id (gen=1) = ADMIN（運営）
referrer_2_user_id (gen=2) = NULL  
referrer_3_user_id (gen=3) = NULL

報酬計算:
- 運営（gen=1）: 90 USDT
- gen=2 報酬: 0 USDT
- gen=3 報酬: 0 USDT
- 運営取り分（残り）: 300 - 90 = 210 USDT

実際は運営が gen=1 報酬と運営取り分を両方受け取るので、
合計で運営は 300 USDT を全額受け取る。
```

### 2.3 紹介系図の途中で運営に到達した場合

例: ユーザーD ← ユーザーC ← 運営（A）の系図

```
ユーザーD が 300 USDT で購入

referrer_user_id (gen=1) = C
referrer_2_user_id (gen=2) = ADMIN（運営）
referrer_3_user_id (gen=3) = NULL

報酬計算:
- C: 90 USDT (gen=1, 30%)
- 運営 (gen=2): 30 USDT
- gen=3 報酬: 0
- 運営取り分（残り）: 300 - 90 - 30 = 180 USDT

合計で運営は 30 + 180 = 210 USDT を受け取る。
```

---

## 3. データフロー

### 3.1 購入から報酬分配までの完全フロー

```
========================================================
1. 購入トランザクション（リアルタイム）
========================================================

ユーザー: フロントエンドから mintClaw() 実行
        ↓
スマコン: USDT 300 を treasury に転送、NFT発行
        ↓
ブロックチェーン: CharacterMinted イベント発火
        ↓
バックエンド (Cloudflare Workers): イベントを Webhook で受信
        ↓
DB (Supabase): 
  - nft_purchases に新規レコード追加（status='pending'）
  - nft_tokens に新規レコード追加
  - 紹介系図を辿って referrer_user_id, referrer_2_user_id, referrer_3_user_id を埋める
  - status を 'confirmed' に更新

========================================================
2. 報酬計算（リアルタイム or 日次バッチ）
========================================================

[リアルタイム計算（推奨）]
購入確定後、即座に referral_rewards テーブルに
報酬レコードを作成（status='calculated'）

[または日次バッチ計算]
過去24時間の confirmed な購入を集めて一括計算

========================================================
3. 日次送金バッチ（毎日0時 JST）
========================================================

Cloudflare Workers Cron: 
  - status='calculated' な referral_rewards を取得
  - 200件ずつバッチに分割
  - 各バッチで以下を実行:
    1. batchId 生成
    2. 運営ウォレットから RewardDistributor に USDT 転送
    3. distributeBatch() を呼び出し
    4. オンチェーンで送金実行
    5. 結果を referral_rewards.status を 'sent' に更新
    6. reward_distributions レコードを作成
  - 失敗したものは status='failed' で記録、後で再実行

========================================================
4. 通知（送金完了後）
========================================================

各受取人に通知:
  - Telegram: 「主、紹介報酬 30 USDT が届いた」
  - メール（オプション）
```

### 3.2 リアルタイム計算 vs 日次バッチ

**MVP1 推奨: リアルタイム計算 + 日次送金**

理由:
- 計算は購入直後に行うことで、ユーザー側で「報酬が見える」状態を即座に作る
- 送金は日次バッチでガス効率化（複数ユーザー分をまとめて送金）

実装:
```
購入確定 → 即座に referral_rewards 作成（status='calculated'）
            ユーザーが見られる
            ↓
0時バッチ → status='sent' に更新、実際の送金実行
```

---

## 4. 実装：報酬計算ロジック

### 4.1 ディレクトリ構造

```
apps/workers/reward-calculator/
├── src/
│   ├── index.ts                    # エントリポイント
│   ├── handlers/
│   │   ├── on-purchase.ts          # 購入確定時のリアルタイム計算
│   │   └── daily-batch.ts          # 日次送金バッチ
│   ├── services/
│   │   ├── reward-calculator.ts    # 報酬計算サービス
│   │   ├── reward-distributor.ts   # 送金サービス
│   │   └── referral-tree.ts        # 紹介系図サービス
│   ├── lib/
│   │   ├── viem.ts                 # blockchain client
│   │   ├── supabase.ts             # supabase client
│   │   └── batch-id.ts             # batchId 生成
│   └── types.ts
├── wrangler.toml
└── package.json
```

### 4.2 報酬計算サービス（リアルタイム）

`src/services/reward-calculator.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RewardItem } from '../types';

const RATES_MVP1 = {
  GEN_1: 30,    // 30%
  GEN_2: 10,    // 10%
  GEN_3: 5,     // 5%
};

const PURCHASE_AMOUNT_USDT = 300;

export class RewardCalculator {
  constructor(
    private supabase: SupabaseClient,
    private adminUserId: string  // 運営者の user_id
  ) {}
  
  /**
   * 購入確定時に呼ばれ、紹介報酬を計算してDBに記録
   */
  async calculateAndStore(purchaseId: string): Promise<RewardItem[]> {
    // 1. 購入情報を取得
    const { data: purchase, error } = await this.supabase
      .from('nft_purchases')
      .select('*, user:users!user_id(*)')
      .eq('id', purchaseId)
      .single();
    
    if (error || !purchase) {
      throw new Error(`Purchase not found: ${purchaseId}`);
    }
    
    if (purchase.status !== 'confirmed') {
      console.log(`Skip: purchase not confirmed yet: ${purchaseId}`);
      return [];
    }
    
    // 2. 紹介系図を取得（最大3世代）
    const referrers = await this.getReferrerChain(purchase.user_id);
    
    // 3. 各世代の報酬を計算
    const rewards: RewardItem[] = [];
    
    if (referrers.gen1) {
      rewards.push({
        recipient_user_id: referrers.gen1.id,
        recipient_wallet_address: await this.getUserWallet(referrers.gen1.id),
        generation: 1,
        rate_percentage: RATES_MVP1.GEN_1,
        amount_usdt: PURCHASE_AMOUNT_USDT * RATES_MVP1.GEN_1 / 100,
        nft_purchase_id: purchaseId,
      });
    }
    
    if (referrers.gen2) {
      rewards.push({
        recipient_user_id: referrers.gen2.id,
        recipient_wallet_address: await this.getUserWallet(referrers.gen2.id),
        generation: 2,
        rate_percentage: RATES_MVP1.GEN_2,
        amount_usdt: PURCHASE_AMOUNT_USDT * RATES_MVP1.GEN_2 / 100,
        nft_purchase_id: purchaseId,
      });
    }
    
    if (referrers.gen3) {
      rewards.push({
        recipient_user_id: referrers.gen3.id,
        recipient_wallet_address: await this.getUserWallet(referrers.gen3.id),
        generation: 3,
        rate_percentage: RATES_MVP1.GEN_3,
        amount_usdt: PURCHASE_AMOUNT_USDT * RATES_MVP1.GEN_3 / 100,
        nft_purchase_id: purchaseId,
      });
    }
    
    // 4. DBに保存
    if (rewards.length > 0) {
      const { error: insertError } = await this.supabase
        .from('referral_rewards')
        .insert(rewards.map(r => ({
          ...r,
          base_rate_percentage: r.rate_percentage,
          bonus_rate_percentage: 0, // MVP1
          status: 'calculated',
          scheduled_for: this.getNextDistributionTime(),
        })));
      
      if (insertError) {
        throw new Error(`Failed to insert rewards: ${insertError.message}`);
      }
    }
    
    return rewards;
  }
  
  /**
   * ユーザーの上位3世代の紹介者を取得
   */
  private async getReferrerChain(userId: string): Promise<{
    gen1: { id: string } | null;
    gen2: { id: string } | null;
    gen3: { id: string } | null;
  }> {
    const result = {
      gen1: null,
      gen2: null,
      gen3: null,
    };
    
    let currentUserId = userId;
    
    for (let gen = 1; gen <= 3; gen++) {
      const { data: user } = await this.supabase
        .from('users')
        .select('id, referrer_user_id')
        .eq('id', currentUserId)
        .single();
      
      if (!user || !user.referrer_user_id) break;
      
      result[`gen${gen}`] = { id: user.referrer_user_id };
      currentUserId = user.referrer_user_id;
    }
    
    return result;
  }
  
  /**
   * ユーザーのプライマリウォレットアドレスを取得
   */
  private async getUserWallet(userId: string): Promise<string> {
    const { data: wallet } = await this.supabase
      .from('user_wallets')
      .select('wallet_address')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .eq('is_verified', true)
      .single();
    
    if (!wallet) {
      throw new Error(`No verified wallet for user: ${userId}`);
    }
    
    return wallet.wallet_address;
  }
  
  /**
   * 次の送金実行時刻（次の0時 JST）
   */
  private getNextDistributionTime(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
}
```

### 4.3 日次送金バッチ

`src/handlers/daily-batch.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
import { polygon } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

import { RewardDistributorABI } from '../abi/RewardDistributor';
import { ERC20ABI } from '../abi/ERC20';
import { generateBatchId } from '../lib/batch-id';

const MAX_BATCH_SIZE = 200; // RewardDistributor.MAX_BATCH_SIZE と一致

export async function executeDailyDistribution(env: Env) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // 1. 送金対象を取得（status='calculated' で scheduled_for が現在以前）
  const { data: rewards, error } = await supabase
    .from('referral_rewards')
    .select('*')
    .eq('status', 'calculated')
    .lte('scheduled_for', new Date().toISOString())
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch pending rewards:', error);
    return;
  }
  
  if (!rewards || rewards.length === 0) {
    console.log('No pending rewards to distribute');
    return;
  }
  
  console.log(`Processing ${rewards.length} rewards`);
  
  // 2. バッチに分割（最大200件ずつ）
  const batches = [];
  for (let i = 0; i < rewards.length; i += MAX_BATCH_SIZE) {
    batches.push(rewards.slice(i, i + MAX_BATCH_SIZE));
  }
  
  // 3. 各バッチを処理
  for (const batch of batches) {
    await processBatch(batch, env, supabase);
  }
}

async function processBatch(
  batch: any[],
  env: Env,
  supabase: any
) {
  const batchId = generateBatchId();
  const totalAmount = batch.reduce((sum, r) => sum + Number(r.amount_usdt), 0);
  
  console.log(`Processing batch ${batchId}: ${batch.length} rewards, total ${totalAmount} USDT`);
  
  // distributions レコード作成（pending）
  const { data: distribution } = await supabase
    .from('reward_distributions')
    .insert({
      batch_id: batchId,
      total_recipients: batch.length,
      total_amount_usdt: totalAmount,
      status: 'pending',
    })
    .select()
    .single();
  
  if (!distribution) {
    console.error('Failed to create distribution record');
    return;
  }
  
  // referral_rewards のステータス更新
  await supabase
    .from('referral_rewards')
    .update({ 
      status: 'scheduled',
      distribution_id: distribution.id,
    })
    .in('id', batch.map(r => r.id));
  
  try {
    // ブロックチェーンへの送金実行
    const txHash = await executeOnChainDistribution(batch, batchId, totalAmount, env);
    
    // 成功
    await supabase
      .from('reward_distributions')
      .update({
        status: 'sent',
        transaction_hash: txHash,
        executed_at: new Date().toISOString(),
      })
      .eq('id', distribution.id);
    
    await supabase
      .from('referral_rewards')
      .update({ status: 'sent' })
      .in('id', batch.map(r => r.id));
    
    console.log(`Batch ${batchId} sent: ${txHash}`);
    
    // 通知システムへの連携（SPEC-08）
    for (const reward of batch) {
      await sendRewardNotification(reward, supabase);
    }
    
  } catch (error: any) {
    console.error(`Batch ${batchId} failed:`, error.message);
    
    // 失敗
    await supabase
      .from('reward_distributions')
      .update({
        status: 'failed',
        failed_reason: error.message,
      })
      .eq('id', distribution.id);
    
    await supabase
      .from('referral_rewards')
      .update({ 
        status: 'failed',
        metadata: { error: error.message },
      })
      .in('id', batch.map(r => r.id));
  }
}

async function executeOnChainDistribution(
  batch: any[],
  batchId: string,
  totalAmount: number,
  env: Env
): Promise<string> {
  const account = privateKeyToAccount(env.PRIVATE_KEY_REWARD_DISTRIBUTOR as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(env.POLYGON_RPC_URL),
  });
  
  // 1. 運営ウォレットから RewardDistributor へ USDT 転送
  const totalAmountWei = parseUnits(totalAmount.toString(), 6); // USDT decimals = 6
  
  const transferHash = await walletClient.writeContract({
    address: env.USDT_CONTRACT_ADDRESS as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'transfer',
    args: [env.REWARD_CONTRACT_ADDRESS as `0x${string}`, totalAmountWei],
  });
  
  // 確認待ち
  // (実装上は publicClient.waitForTransactionReceipt を使用)
  
  // 2. distributeBatch 呼び出し
  const rewards = batch.map(r => ({
    recipient: r.recipient_wallet_address as `0x${string}`,
    amount: parseUnits(r.amount_usdt.toString(), 6),
    generation: r.generation,
    sourcePurchaseId: `0x${Buffer.from(r.nft_purchase_id).toString('hex').padEnd(64, '0').substring(0, 64)}` as `0x${string}`,
  }));
  
  const distributeHash = await walletClient.writeContract({
    address: env.REWARD_CONTRACT_ADDRESS as `0x${string}`,
    abi: RewardDistributorABI,
    functionName: 'distributeBatch',
    args: [`0x${batchId}` as `0x${string}`, rewards],
  });
  
  return distributeHash;
}

async function sendRewardNotification(reward: any, supabase: any) {
  // SPEC-08 の通知システムへ
  await supabase
    .from('push_notifications')
    .insert({
      title: '紹介報酬が届きました',
      message: `${reward.amount_usdt} USDT の報酬が、あなたのウォレットに送られました。`,
      notification_type: 'system',
      target_type: 'specific_users',
      target_user_ids: [reward.recipient_user_id],
      status: 'scheduled',
      scheduled_for: new Date().toISOString(),
    });
}
```

### 4.4 wrangler.toml（Cron 設定）

```toml
name = "openclaw-reward-calculator"
main = "src/index.ts"
compatibility_date = "2026-04-01"

[[triggers.crons]]
# 毎日0時（UTC 15時 = JST 0時）に実行
cron = "0 15 * * *"

[vars]
# 公開設定可能なもの
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS = "..."
NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS = "..."
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"

# 秘密情報は wrangler secret put で設定
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - PRIVATE_KEY_REWARD_DISTRIBUTOR
# - POLYGON_RPC_URL
```

---

## 5. MVP2: 動的%の実装

### 5.1 動的%のルール定義

仁さんの過去のネットワークビジネス経験から導出。MVP2 で実装。

```typescript
// apps/workers/reward-calculator/src/lib/dynamic-rates.ts

export interface DynamicRateRule {
  id: string;
  name: string;
  description: string;
  condition: (stats: UserStats) => boolean;
  bonus: {
    gen1?: number;
    gen2?: number;
    gen3?: number;
    all?: number;  // 全ティアに適用
  };
}

export const DYNAMIC_RULES: DynamicRateRule[] = [
  // 直紹介人数達成ボーナス
  {
    id: 'direct-10',
    name: '直紹介10人達成',
    description: '直紹介者が10人を超えるとgen1+5%',
    condition: (stats) => stats.directReferralsCount >= 10,
    bonus: { gen1: 5 },
  },
  {
    id: 'direct-30',
    name: '直紹介30人達成',
    description: '直紹介者が30人を超えるとgen1+10%',
    condition: (stats) => stats.directReferralsCount >= 30,
    bonus: { gen1: 10 },
  },
  
  // 3ティア合計人数達成ボーナス
  {
    id: 'total-50',
    name: '3ティア合計50人',
    description: '3ティア合計が50人を超えると全ティア+5%',
    condition: (stats) => stats.totalReferralsCount >= 50,
    bonus: { all: 5 },
  },
  {
    id: 'total-100',
    name: '3ティア合計100人',
    description: '3ティア合計が100人を超えると全ティア+10%',
    condition: (stats) => stats.totalReferralsCount >= 100,
    bonus: { all: 10 },
  },
  
  // 月間ランキングボーナス
  {
    id: 'monthly-top-3',
    name: '月間ランキング上位3位以内',
    description: '前月のランキング上位3位なら全ティア+5%',
    condition: (stats) => stats.monthlyRank !== null && stats.monthlyRank <= 3,
    bonus: { all: 5 },
  },
];

export interface UserStats {
  userId: string;
  directReferralsCount: number;       // 直紹介者数
  totalReferralsCount: number;        // 3世代までの紹介者総数
  monthlyRank: number | null;         // 前月のランキング順位（NULLなら集計なし）
}
```

### 5.2 ボーナス適用ロジック

```typescript
// apps/workers/reward-calculator/src/services/dynamic-rate-calculator.ts

export class DynamicRateCalculator {
  constructor(private supabase: SupabaseClient) {}
  
  /**
   * 紹介者の現在の動的%を計算
   */
  async calculateRates(referrerUserId: string): Promise<{
    gen1: number;
    gen2: number;
    gen3: number;
    appliedBonuses: string[]; // 適用されたボーナスのID
  }> {
    // 基本%
    let gen1 = 30;
    let gen2 = 10;
    let gen3 = 5;
    
    const appliedBonuses: string[] = [];
    
    // ユーザーの統計を取得
    const stats = await this.getUserStats(referrerUserId);
    
    // 各ルールを適用
    for (const rule of DYNAMIC_RULES) {
      if (rule.condition(stats)) {
        if (rule.bonus.gen1) gen1 += rule.bonus.gen1;
        if (rule.bonus.gen2) gen2 += rule.bonus.gen2;
        if (rule.bonus.gen3) gen3 += rule.bonus.gen3;
        if (rule.bonus.all) {
          gen1 += rule.bonus.all;
          gen2 += rule.bonus.all;
          gen3 += rule.bonus.all;
        }
        appliedBonuses.push(rule.id);
      }
    }
    
    // 上限チェック（合計が運営取り分を侵食しないように）
    const total = gen1 + gen2 + gen3;
    if (total > 80) {
      // 上限80%を超えたら、比例的に削減
      const ratio = 80 / total;
      gen1 = Math.round(gen1 * ratio);
      gen2 = Math.round(gen2 * ratio);
      gen3 = Math.round(gen3 * ratio);
    }
    
    return { gen1, gen2, gen3, appliedBonuses };
  }
  
  private async getUserStats(userId: string): Promise<UserStats> {
    const { data: user } = await this.supabase
      .from('users')
      .select('direct_referrals_count, total_referrals_count')
      .eq('id', userId)
      .single();
    
    // 前月のランキング取得
    const { data: ranking } = await this.supabase
      .from('monthly_rankings')
      .select('rank')
      .eq('user_id', userId)
      .eq('year_month', this.getPreviousMonth())
      .single();
    
    return {
      userId,
      directReferralsCount: user?.direct_referrals_count || 0,
      totalReferralsCount: user?.total_referrals_count || 0,
      monthlyRank: ranking?.rank || null,
    };
  }
  
  private getPreviousMonth(): string {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

### 5.3 月間ランキング集計（MVP2）

毎月1日に前月の集計を実行。

```typescript
// apps/workers/reward-calculator/src/handlers/monthly-ranking.ts

export async function aggregateMonthlyRanking(env: Env) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // 前月の年月
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  
  // 前月の月初・月末
  const start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
  
  // 紹介者ごとに直紹介数を集計（各紹介経由で発生した購入）
  const { data: aggregation } = await supabase
    .from('nft_purchases')
    .select('referrer_user_id, count(*)')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .eq('status', 'confirmed')
    .not('referrer_user_id', 'is', null)
    // .group('referrer_user_id') // SQL の GROUP BY 相当
    ;
  
  // 上位順にランキング
  // ... 実装はSupabaseのRPCで集計する方が確実
  
  // monthly_rankings テーブルに保存
  // ...
}
```

---

## 6. データベーススキーマ追加（MVP2用）

SPEC-01 に追加するテーブル：

### 6.1 monthly_rankings

```sql
CREATE TABLE public.monthly_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES public.users(id),
  year_month TEXT NOT NULL,                          -- '2026-04'
  
  -- 集計値
  direct_referrals_count INTEGER NOT NULL DEFAULT 0,
  direct_revenue_usdt NUMERIC(20,6) NOT NULL DEFAULT 0,
  total_referrals_count INTEGER NOT NULL DEFAULT 0,
  total_revenue_usdt NUMERIC(20,6) NOT NULL DEFAULT 0,
  
  -- ランキング
  rank INTEGER,
  rank_change_from_previous INTEGER,                 -- 前月比
  
  -- ボーナス情報
  bonus_qualified BOOLEAN DEFAULT false,
  bonus_amount_usdt NUMERIC(20,6) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, year_month)
);

CREATE INDEX idx_monthly_rankings_user ON public.monthly_rankings(user_id);
CREATE INDEX idx_monthly_rankings_month ON public.monthly_rankings(year_month);
CREATE INDEX idx_monthly_rankings_rank ON public.monthly_rankings(year_month, rank);
```

### 6.2 dynamic_reward_rates

ある時点でユーザーに適用される動的%を記録するテーブル（履歴管理）。

```sql
CREATE TABLE public.dynamic_reward_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES public.users(id),
  
  -- 適用される%
  gen1_rate NUMERIC(5,2) NOT NULL,                   -- 30.00 など
  gen2_rate NUMERIC(5,2) NOT NULL,
  gen3_rate NUMERIC(5,2) NOT NULL,
  
  -- ボーナス内訳
  applied_bonuses TEXT[] DEFAULT '{}',               -- 適用されたボーナスID
  
  -- 有効期間
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,                       -- NULLは現在も有効
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dynamic_rates_user_active ON public.dynamic_reward_rates(user_id) WHERE effective_until IS NULL;
```

---

## 7. 透明性のためのダッシュボード

### 7.1 ユーザー向け（マイページ）

ユーザーが自分の紹介報酬状況を確認できるページ。

**表示内容**:
```
【紹介統計】
- 直紹介者数: 12人
- 2世代上紹介者数: 35人
- 3世代上紹介者数: 58人
- 累計報酬: 4,500 USDT

【現在の報酬率（動的%）】
- 直紹介: 35% (基本30% + ボーナス5%)
- 2世代上: 10%
- 3世代上: 5%
- 適用ボーナス: 直紹介10人達成

【最近の報酬】
- 2026-04-29: 90 USDT (直紹介・ユーザーDの購入から)
- 2026-04-28: 30 USDT (2世代上・ユーザーEの購入から)
- ...

【月間ランキング】
- 今月: 5位（前月比 +2）
- 上位3位ボーナス対象: あと2位
```

### 7.2 管理者向け（運営ダッシュボード）

```
【全体統計】
- 累計売上: 30,000 USDT (100件 × 300 USDT)
- 累計分配済み報酬: 12,000 USDT (40%)
- 運営取り分: 18,000 USDT (60%)

【紹介系図】
- ツリー表示
- 各ノードのクリックで詳細

【日次バッチログ】
- 2026-04-29: 50件、3,500 USDT 分配（成功）
- 2026-04-28: 38件、2,800 USDT 分配（成功）
```

実装は SPEC-07 で詳細化。

---

## 8. テスト方針

### 8.1 単体テスト

```typescript
// tests/reward-calculator.test.ts

describe('RewardCalculator', () => {
  it('calculates correct rewards for 3-tier referral chain', async () => {
    // A -> B -> C -> D の系図を作成
    const chain = await setupReferralChain([
      { email: 'a@test.com' },
      { email: 'b@test.com', referrerEmail: 'a@test.com' },
      { email: 'c@test.com', referrerEmail: 'b@test.com' },
      { email: 'd@test.com', referrerEmail: 'c@test.com' },
    ]);
    
    // D が購入
    const purchase = await createPurchase(chain.D, 300);
    
    // 報酬計算
    const calculator = new RewardCalculator(supabase, ADMIN_ID);
    const rewards = await calculator.calculateAndStore(purchase.id);
    
    // 検証
    expect(rewards).toHaveLength(3);
    expect(rewards[0].generation).toBe(1);
    expect(rewards[0].amount_usdt).toBe(90);   // C's reward
    expect(rewards[1].generation).toBe(2);
    expect(rewards[1].amount_usdt).toBe(30);   // B's reward
    expect(rewards[2].generation).toBe(3);
    expect(rewards[2].amount_usdt).toBe(15);   // A's reward
  });
  
  it('handles purchase with no referrer (defaults to admin)', async () => {
    // 紹介者なしで購入
    const user = await createUser({ email: 'newbie@test.com' });
    // user.referrer_user_id should be ADMIN_ID (set by trigger)
    
    const purchase = await createPurchase(user, 300);
    
    const calculator = new RewardCalculator(supabase, ADMIN_ID);
    const rewards = await calculator.calculateAndStore(purchase.id);
    
    // 管理者が gen=1 報酬を受け取る
    expect(rewards).toHaveLength(1);
    expect(rewards[0].recipient_user_id).toBe(ADMIN_ID);
    expect(rewards[0].generation).toBe(1);
    expect(rewards[0].amount_usdt).toBe(90);
  });
  
  // ... その他多数
});
```

### 8.2 E2E テスト（バッチ送金）

```typescript
// tests/e2e/daily-batch.test.ts

describe('Daily distribution batch', () => {
  it('processes pending rewards end-to-end', async () => {
    // 1. テストデータ作成: 5件の calculated reward
    // 2. バッチ実行
    // 3. オンチェーンの送金を確認（mock or testnet）
    // 4. DBのステータスが 'sent' になっていることを確認
    // 5. 通知が作成されていることを確認
  });
});
```

---

## 9. 監視・アラート

### 9.1 重要な監視メトリクス

```
- 日次分配バッチの成功/失敗
- 失敗したバッチの件数
- claimableBalance に積まれた金額（Pull モード移行）
- 運営ウォレットのUSDT残高（送金資金の枯渇監視）
- スマコンの一時停止状態
```

### 9.2 アラート設定

Cloudflare Workers の Logging + Discord/Slack Webhook：

```typescript
// 失敗時にアラート
async function notifyAdmin(message: string, env: Env) {
  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `🚨 OPENCLAW Alert: ${message}`,
    }),
  });
}
```

---

## 10. 法的考慮（実装上の対応）

### 10.1 透明性の担保

実装で対応する項目：

- [ ] 全ての報酬発生・送金履歴をDB + ブロックチェーン両方に記録
- [ ] ユーザーが自分の報酬履歴を完全に閲覧可能
- [ ] 監査ログ（audit_logs）に管理者の重要操作を記録
- [ ] 定期的なレポート出力機能（CSV/PDF）

### 10.2 同意フロー

購入時に以下を表示・同意取得：
- 紹介報酬の仕組み（3ティア構造）
- 動的%の説明（MVP2以降）
- 「個別の収益を保証するものではない」注意文
- 利用規約・プライバシーポリシーへの同意

### 10.3 運営者の決定事項（仕様書外）

法務面の最終判断は運営者が弁護士と相談。Claude Code はコード実装で技術的にサポートする。

---

## 11. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-03 紹介報酬システム
- 対象: apps/workers/reward-calculator/

[タスク]
SPEC-03 に記載されている報酬計算・分配システムを実装してください。

[具体的な要件]
1. apps/workers/reward-calculator/ プロジェクトを作成（Cloudflare Workers + Hono）
2. リアルタイム計算ハンドラー（購入確定時）
3. 日次送金バッチ（Cron）
4. テストケース（単体 + E2E）

[出力形式]
- 全ソースコード
- wrangler.toml
- README.md（環境変数設定、デプロイ手順）

[禁止事項]
- 報酬率（30%/10%/5%）を勝手に変更しない
- バッチサイズ200を超えない
- DBの整合性を犠牲にしない（必ずトランザクション意識）
```

---

## 12. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-03**

次のドキュメント: SPEC-04 Telegram Bot
