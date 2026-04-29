# SPEC-11: OPENCLAW Platform - 環境変数・デプロイ・運用

> **このドキュメントの位置づけ**: OPENCLAW Platform の各コンポーネントをデプロイ・運用するための包括ガイド。環境変数の完全リスト、デプロイ手順、CI/CD、監視・アラート、バックアップ、災害復旧を定義する。
> 
> **前提**: SPEC-00〜10 を読んでいること。このドキュメントは「最後の仕上げ」となる運用ガイド。

---

## 1. 環境構成

### 1.1 3環境の方針

| 環境 | 用途 | URL | ブランチ |
|------|------|-----|---------|
| **development** | ローカル開発 | localhost | feature/* |
| **staging** | テスト・QA | staging.openclaw.com | develop |
| **production** | 本番 | openclaw.com | main |

### 1.2 各環境のサービス分離

```
production:
  - Polygon Mainnet
  - Supabase Production Project
  - Cloudflare Pages: openclaw-production
  - Cloudflare Workers: openclaw-*-prod
  - Stripe Live Mode

staging:
  - Polygon Amoy (testnet)
  - Supabase Staging Project
  - Cloudflare Pages: openclaw-staging
  - Cloudflare Workers: openclaw-*-staging
  - Stripe Test Mode

development:
  - Polygon Amoy (testnet) または Anvil
  - Supabase ローカル（docker）
  - localhost:3000（Next.js dev server）
  - Cloudflare Workers ローカル（wrangler dev）
  - Stripe Test Mode
```

---

## 2. 環境変数 完全リスト

### 2.1 全環境変数の総覧

```bash
# =============================================
# Webアプリ (apps/web/) 用
# =============================================

# 公開（NEXT_PUBLIC_）
NEXT_PUBLIC_APP_URL=https://openclaw.com
NEXT_PUBLIC_APP_DOMAIN=openclaw.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Web3
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx

# 運営デフォルト
NEXT_PUBLIC_ADMIN_DEFAULT_REFERRER_WALLET=0x...
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=openclaw_bot

# Stripe（公開）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# 非公開
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...

# 内部API
REWARD_CALCULATOR_URL=https://reward-calc.openclaw.com
REWARD_CALCULATOR_API_KEY=xxx
HP_GENERATOR_URL=https://hp-gen.openclaw.com
HP_GENERATOR_API_KEY=xxx
SNS_POSTER_URL=https://sns.openclaw.com
SNS_POSTER_API_KEY=xxx
NOTIFICATION_URL=https://notify.openclaw.com
NOTIFICATION_API_KEY=xxx
BOT_WORKER_URL=https://bot.openclaw.com

# 管理者
ADMIN_DEFAULT_REFERRER_USER_ID=uuid-...
ADMIN_TELEGRAM_USER_ID=12345678
ADMIN_EMAIL=admin@openclaw.com

# Webhook 署名
WEBHOOK_SIGNATURE_SECRET=xxx

# =============================================
# Telegram Bot (apps/bot/) 用
# =============================================

TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_BOT_USERNAME=openclaw_bot
TELEGRAM_WEBHOOK_SECRET=xxx

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6  # 実装時の最新を使用

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NFT_CONTRACT_ADDRESS=0x...
POLYGON_RPC_URL=https://...

NOTIFICATION_API_KEY=xxx
HP_GENERATOR_URL=https://hp-gen.openclaw.com
HP_GENERATOR_API_KEY=xxx
SNS_POSTER_URL=https://sns.openclaw.com
SNS_POSTER_API_KEY=xxx

# =============================================
# Reward Calculator (apps/workers/reward-calculator/)
# =============================================

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY_REWARD_DISTRIBUTOR=0x...  # ハイセキュリティ
NFT_CONTRACT_ADDRESS=0x...
REWARD_CONTRACT_ADDRESS=0x...
USDT_CONTRACT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
TREASURY_ADDRESS=0x...

ADMIN_DEFAULT_REFERRER_USER_ID=uuid-...

NOTIFICATION_URL=https://notify.openclaw.com
NOTIFICATION_API_KEY=xxx

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# =============================================
# HP Generator (apps/workers/hp-generator/)
# =============================================

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_ZONE_ID=xxx

HP_GENERATOR_API_KEY=xxx  # このサービスのAPIキー（呼び出し元の認証用）

# =============================================
# SNS Poster (apps/workers/sns-poster/)
# =============================================

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# X (Twitter) API
X_CLIENT_ID=xxx
X_CLIENT_SECRET=xxx
X_BEARER_TOKEN=xxx

# 暗号化キー（トークン保護用）
ENCRYPTION_KEY=xxx  # 32文字のランダム文字列

APP_URL=https://openclaw.com

NOTIFICATION_URL=https://notify.openclaw.com
NOTIFICATION_API_KEY=xxx

# =============================================
# Push Notification (apps/workers/push-notification/)
# =============================================

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

TELEGRAM_BOT_TOKEN=xxx
BOT_WORKER_URL=https://bot.openclaw.com
NOTIFICATION_API_KEY=xxx

RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS=noreply@openclaw.com

# =============================================
# NFT Sync Worker (apps/workers/nft-sync/)
# =============================================

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

POLYGON_RPC_URL=https://polygon-rpc.com
NFT_CONTRACT_ADDRESS=0x...

NOTIFICATION_URL=https://notify.openclaw.com
NOTIFICATION_API_KEY=xxx

# =============================================
# Foundry / Smart Contract デプロイ用
# =============================================

PRIVATE_KEY_DEPLOYER=0x...  # スマコンデプロイ用（保管厳重）
TREASURY_ADDRESS=0x...
USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
BASE_URI=https://api.openclaw.com/metadata/

POLYGON_RPC_URL=https://polygon-rpc.com
AMOY_RPC_URL=https://rpc-amoy.polygon.technology

POLYGONSCAN_API_KEY=xxx

BOT_WALLET_ADDRESS=0x...  # 報酬分配用ホットウォレット
```

### 2.2 環境変数の管理方針

```
1. ローカル開発: .env.local（gitignore）
2. ステージング: Cloudflare Workers Secrets
3. 本番: Cloudflare Workers Secrets + 1Password Vault
4. .env.example: 全変数の名前のみ（値なし）をリポジトリに含める
```

### 2.3 シークレット階層

```
最高機密（HSM/Vault推奨）:
  - PRIVATE_KEY_DEPLOYER（スマコンデプロイ）
  - PRIVATE_KEY_REWARD_DISTRIBUTOR（報酬送金）
  - SUPABASE_SERVICE_ROLE_KEY

高機密:
  - ANTHROPIC_API_KEY
  - STRIPE_SECRET_KEY
  - X_CLIENT_SECRET
  - ENCRYPTION_KEY
  - TELEGRAM_BOT_TOKEN

中機密:
  - WEBHOOK_SIGNATURE_SECRET
  - NOTIFICATION_API_KEY 等の内部API Key

低機密（公開可）:
  - NEXT_PUBLIC_* 全て
  - コントラクトアドレス
```

---

## 3. デプロイ手順

### 3.1 初期セットアップ（ゼロから）

```bash
# 1. リポジトリクローン
git clone https://github.com/jinjinsansan/openclaw-platform
cd openclaw-platform

# 2. 依存関係インストール
pnpm install

# 3. 環境変数の準備
cp .env.example .env.local
# .env.local を編集（開発用の値を入れる）

# 4. Supabase ローカル起動（オプション）
pnpm supabase start

# 5. マイグレーション実行
pnpm supabase db push

# 6. キャラクターシード
pnpm seed:characters

# 7. アカデミーフレーズシード
pnpm seed:academy-phrases
```

### 3.2 スマートコントラクトデプロイ

```bash
cd apps/contracts

# テストネット
forge script script/Deploy.s.sol \
  --rpc-url amoy \
  --broadcast \
  --verify \
  --etherscan-api-key $POLYGONSCAN_API_KEY

# 本番（必ずペーパーウォレット → MultiSig 経由）
forge script script/Deploy.s.sol \
  --rpc-url polygon \
  --broadcast \
  --verify \
  --etherscan-api-key $POLYGONSCAN_API_KEY

# デプロイされたアドレスを記録
echo "ClawsNFT: 0x..."
echo "RewardDistributor: 0x..."

# 環境変数に追加
# NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
# NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS=0x...
```

### 3.3 Webアプリ（Next.js）デプロイ

#### Cloudflare Pages にデプロイ

```bash
cd apps/web

# 1. ビルド
pnpm build

# 2. Cloudflare Pages にデプロイ
npx wrangler pages deploy ./out \
  --project-name=openclaw-production \
  --branch=main

# 3. 環境変数を Cloudflare Pages に設定
# ダッシュボードまたは wrangler.toml で
```

または、GitHub連携で自動デプロイ：

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: openclaw-${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
          directory: apps/web/out
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### 3.4 Cloudflare Workers デプロイ

各 Worker のデプロイ：

```bash
# Bot
cd apps/bot
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# ... 他の secrets
wrangler deploy

# Reward Calculator
cd apps/workers/reward-calculator
wrangler secret put PRIVATE_KEY_REWARD_DISTRIBUTOR
# ... 他の secrets
wrangler deploy

# 同様に他の Workers も
```

### 3.5 Telegram Bot Webhook 設定

```bash
# デプロイ後、Webhook URLを設定
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://bot.openclaw.com/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"

# 確認
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

### 3.6 デプロイチェックリスト

```
【スマートコントラクト】
□ ClawsNFT がデプロイされている
□ RewardDistributor がデプロイされている
□ 両方が Polygonscan で verified
□ DEFAULT_ADMIN_ROLE が運営に付与されている
□ DISTRIBUTOR_ROLE が hot wallet に付与されている
□ Treasury アドレスが設定されている
□ 環境変数にアドレスが反映されている

【Webアプリ】
□ Cloudflare Pages にデプロイ完了
□ 全環境変数が設定されている
□ カスタムドメインが設定されている (openclaw.com)
□ HTTPS が有効
□ /health エンドポイントが応答する

【Cloudflare Workers】
□ Bot Worker がデプロイ完了
□ HP Generator Worker
□ SNS Poster Worker
□ Reward Calculator Worker
□ Push Notification Worker
□ NFT Sync Worker
□ 各 Cron が登録されている

【Telegram】
□ Bot Token が有効
□ Webhook URL が設定済み
□ /start コマンドが動作する

【Supabase】
□ 全マイグレーションが適用済み
□ RLS ポリシーが有効
□ シードデータ（30キャラ）が投入済み
□ 管理者ユーザーが登録済み
□ バックアップが有効

【外部サービス】
□ Stripe がライブモードで設定
□ Resend のドメイン認証が完了
□ Cloudflare Stream が有効
□ Polygon RPC が動作

【監視】
□ Sentry / Discord アラートが設定
□ ステータスページが稼働
```

---

## 4. CI/CD パイプライン

### 4.1 GitHub Actions の構成

`.github/workflows/`:

```yaml
# ci.yml - PR時のテスト
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm --filter contracts build
      - run: pnpm --filter contracts test

# deploy-staging.yml - develop ブランチのプッシュで実行
on:
  push:
    branches: [develop]
jobs:
  deploy:
    # ステージングデプロイ

# deploy-production.yml - main ブランチのプッシュで実行
on:
  push:
    branches: [main]
jobs:
  deploy:
    # 本番デプロイ（手動承認付き）

# nft-metadata-update.yml - メタデータ更新時
on:
  push:
    branches: [main]
    paths: ['metadata/**']
jobs:
  upload:
    # IPFS or R2 へアップロード
```

### 4.2 デプロイ承認フロー

本番デプロイは手動承認必須：

```yaml
# deploy-production.yml
jobs:
  deploy:
    environment:
      name: production
      url: https://openclaw.com
    steps:
      # GitHub の Environment Protection で
      # 仁さん（運営）の承認が必須
```

---

## 5. 監視・アラート

### 5.1 監視項目

```
【インフラ】
- Cloudflare Pages の稼働状態
- Cloudflare Workers の稼働状態
- Supabase の稼働状態
- Polygon RPC の応答時間

【アプリケーション】
- HTTPステータスコード（4xx/5xx率）
- API応答時間
- LLM API のコスト
- データベースクエリ時間

【ビジネスメトリクス】
- 1日のNFT購入数
- 紹介報酬の総額
- アクティブユーザー数
- Bot メッセージ数

【スマートコントラクト】
- 運営ウォレットの残高（USDT/MATIC）
- Hot wallet（DISTRIBUTOR_ROLE）の残高
- 失敗トランザクション
```

### 5.2 アラート

#### Discord Webhook

```typescript
// shared/alerting.ts
export async function alertDiscord(
  level: 'info' | 'warning' | 'error' | 'critical',
  message: string,
  env: Env
): Promise<void> {
  const color = {
    info: 0x3498db,
    warning: 0xf39c12,
    error: 0xe74c3c,
    critical: 0x9b0000,
  }[level];
  
  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `🚨 OPENCLAW ${level.toUpperCase()}`,
        description: message,
        color,
        timestamp: new Date().toISOString(),
      }],
    }),
  });
}
```

#### アラート閾値

```
【Critical (即座に対応必要)】
- スマコンが停止 (paused)
- 運営ウォレットの USDT 残高 < 10000 USDT
- ホットウォレットの USDT 残高 < 1000 USDT
- 全Workerのエラー率 > 5%
- DBダウン

【Error (24時間以内に対応)】
- 報酬分配バッチの失敗
- LLM API のコスト急増
- Telegram Bot 応答停止
- 個別 Worker のダウン

【Warning (週次対応)】
- LLMトーンガード違反率 > 10%
- HP生成失敗率 > 3%
- 月間購入数の異常
```

### 5.3 ステータスページ

`status.openclaw.com`:

```
すべてのシステム稼働中 ✅

【サービス】
✅ Webサイト
✅ Telegram Bot
✅ HP生成
✅ SNS自動投稿
✅ 紹介報酬

【ブロックチェーン】
✅ Polygon Mainnet
✅ ClawsNFT スマコン
✅ RewardDistributor

【最近のインシデント】
なし
```

実装: Better Stack, Statuspage.io, または独自実装

---

## 6. ログ管理

### 6.1 各サービスのログ

```
Cloudflare Workers → Cloudflare Logs (Logpush で外部に出力可能)
Next.js (Cloudflare Pages) → Cloudflare Pages Logs
Supabase → Supabase Logs
スマートコントラクト → Polygonscan + Etherscan
```

### 6.2 構造化ログ

各サービスで JSON 形式のログを出力：

```typescript
// 統一ログ形式
function log(level: string, message: string, metadata: any = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'reward-calculator',
    environment: process.env.NODE_ENV,
    ...metadata,
  }));
}

log('info', 'Daily distribution started', {
  totalRewards: 50,
  totalAmount: 3500,
});
```

### 6.3 ログの集約（オプション）

将来的に Datadog や Better Stack で集約：

```yaml
# Cloudflare Logpush 設定
- destination: datadog
- filters: 
    - level: error
    - level: critical
```

---

## 7. バックアップ

### 7.1 Supabase 自動バックアップ

```
Supabase Pro プラン:
- 毎日自動バックアップ
- 7日間のバックアップ保持
- ポイントインタイムリカバリ（PITR）

Supabase Team プラン:
- 30日間バックアップ保持
- PITR有効
```

### 7.2 追加のカスタムバックアップ

毎日重要データを CSV エクスポートして外部ストレージに保管：

```typescript
// apps/workers/backup/src/handlers/daily-backup.ts

export async function performDailyBackup(env: Env) {
  const supabase = createSupabaseClient(env);
  
  const tables = [
    'users',
    'user_wallets',
    'nft_tokens',
    'nft_purchases',
    'referrals',
    'referral_rewards',
    'reward_distributions',
  ];
  
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    
    const csv = convertToCSV(data);
    
    await env.BACKUP_BUCKET.put(
      `daily/${new Date().toISOString().split('T')[0]}/${table}.csv`,
      csv
    );
  }
}
```

### 7.3 スマートコントラクトイベント履歴の保管

ブロックチェーンに記録されているとはいえ、念のため取得してバックアップ：

```typescript
// CharacterMinted, RewardDistributed 等のイベントを取得して保存
async function backupContractEvents(env: Env) {
  const client = createPublicClient({ chain: polygon, transport: http(env.POLYGON_RPC_URL) });
  
  const lastBackupBlock = await getLastBackupBlock(env);
  const currentBlock = await client.getBlockNumber();
  
  const events = await client.getContractEvents({
    address: env.NFT_CONTRACT_ADDRESS,
    abi: ClawsNFTABI,
    eventName: 'CharacterMinted',
    fromBlock: lastBackupBlock,
    toBlock: currentBlock,
  });
  
  await env.BACKUP_BUCKET.put(
    `contract-events/${currentBlock}.json`,
    JSON.stringify(events)
  );
}
```

---

## 8. 災害復旧（DR: Disaster Recovery）

### 8.1 想定される事態

```
【Level 1: 軽微】
- 1サービスのみダウン（例: HP Generator）
- Recovery Time Objective (RTO): 1時間以内
- Recovery Point Objective (RPO): 0分（データロスなし）

【Level 2: 中程度】
- 複数サービスのダウン
- RTO: 4時間以内
- RPO: 5分以内

【Level 3: 重大】
- データセンター全停止 / リージョン障害
- RTO: 24時間以内
- RPO: 1時間以内（前回バックアップ）

【Level 4: 致命的】
- データベース完全消失
- スマートコントラクトの脆弱性発見
- 私鍵漏洩
- RTO: 段階的復旧
- RPO: 24時間（最後の Supabase バックアップ）
```

### 8.2 復旧手順

#### Level 1: 単一サービス復旧

```bash
# 1. 影響範囲を特定（ステータスページ・ログ）
# 2. 該当 Worker を再デプロイ
cd apps/workers/<failed-service>
wrangler deploy

# 3. 動作確認
curl https://<service>.openclaw.com/health
```

#### Level 2: 複数サービス復旧

```bash
# 1. Discord で運営に通知
# 2. すべての Worker のステータス確認
# 3. 必要に応じて全再デプロイ
# 4. データ整合性チェック
```

#### Level 3: リージョン障害

```bash
# 1. Cloudflare の代替リージョンに切替（自動）
# 2. Supabase の代替リージョン確認
# 3. DNS 切替（必要なら）
```

#### Level 4: データ消失

```bash
# 1. Supabase をバックアップから復元
# 2. 環境変数を再設定
# 3. 全 Worker を再デプロイ
# 4. スマートコントラクトはオンチェーンなので維持される
# 5. オンチェーンイベントから DB を再構築
#    - CharacterMinted → nft_purchases / nft_tokens
#    - RewardDistributed → referral_rewards / reward_distributions
```

### 8.3 復旧訓練

四半期ごとに DR 訓練を実施：

```
1. ステージング環境でダウンを意図的に発生
2. 復旧手順を実行
3. 復旧時間を計測
4. 改善点を文書化
```

---

## 9. セキュリティ運用

### 9.1 シークレットローテーション

定期的にシークレットを更新：

```
3ヶ月ごと:
- ANTHROPIC_API_KEY
- ENCRYPTION_KEY
- WEBHOOK_SIGNATURE_SECRET
- 内部API Key 全般

6ヶ月ごと:
- Stripe Secret Key（Webhook 反映に注意）
- TELEGRAM_BOT_TOKEN（Bot 一時停止注意）

ローテーション不可（永続）:
- スマートコントラクトの所有者（変更時はマルチシグ移譲）
- 運営者のメインウォレット
```

### 9.2 アクセス権の定期見直し

```
四半期ごと:
- admin_users テーブルの確認
- スマコン上の Role 保持者の確認
- Cloudflare アカウントへのアクセス権
- Supabase へのアクセス権
- GitHub リポジトリへのアクセス権
```

### 9.3 セキュリティインシデント対応

```
1. 検知（アラート / 通報）
2. 影響範囲の特定
3. 即時対応（pause、key rotation）
4. ユーザー通知（必要なら）
5. 復旧
6. 事後分析（postmortem）
7. 再発防止策の実装
```

---

## 10. パフォーマンス管理

### 10.1 SLO（Service Level Objective）

```
【Webサイト】
- 可用性: 99.9% (月43分のダウンタイム以内)
- ページロード: 95%が3秒以内
- TTFB: 95%が500ms以内

【API】
- 可用性: 99.9%
- 応答時間: 95%が1秒以内（LLMを除く）

【Bot】
- メッセージ応答: 95%が10秒以内（LLM含む）
- 可用性: 99.5%

【スマコン】
- mintClaw 成功率: 99%以上
- 報酬分配成功率: 99%以上
```

### 10.2 パフォーマンス改善

```
【遅い時の対策】

LLM が遅い:
- プロンプトの簡素化
- より短いモデルの使用（必要なら）
- キャッシュ可能な応答のキャッシュ

DB が遅い:
- インデックス見直し
- クエリ最適化
- Connection Pool の設定
- 集計テーブルの導入

Bot が遅い:
- 並行処理化
- 非同期処理
- 静的データのキャッシュ
```

---

## 11. コスト管理

### 11.1 月次コスト見積もり（MVP1、100ユーザー時）

```
Supabase Pro:                $25/月
Cloudflare Workers:          $5-30/月（リクエスト量による）
Cloudflare Pages:            $0（無料枠内）
Cloudflare Stream:           $5/月（動画用、MVP2以降）
Anthropic Claude API:        $50-200/月（Bot会話量による）
Resend:                      $0（3000メール/月まで無料）
Stripe:                      手数料 3.6%
Polygon ガス代:              $1-10/月（バッチ送金、MATIC必要）
Domain:                      $15/年
GitHub:                      $0（個人）
モニタリング (Better Stack): $0-30/月

合計: 約 $90-280/月（最初の100ユーザー）
```

### 11.2 スケーリング時のコスト試算

```
1,000ユーザー時:
- Anthropic API: $500-1500/月
- 全体: $500-1000/月

10,000ユーザー時:
- Anthropic API: $5000-15000/月
- 全体: $5000-15000/月

→ ARPU を考えると黒字ライン:
   10,000ユーザー × 平均 ARPU $100 = $1,000,000
   コストの100倍以上
```

### 11.3 コスト最適化施策

```
1. LLMキャッシュ
2. 静的サイト生成（ISR）
3. CDN活用
4. 不要なバッチ削減
5. 古いデータのアーカイブ
```

---

## 12. 運用ドキュメント

### 12.1 必要なドキュメント

```
/docs/
├── operations/
│   ├── runbook.md              # 日常運用手順
│   ├── incident-response.md    # インシデント対応
│   ├── deployment.md           # デプロイ手順
│   └── maintenance.md          # メンテナンス手順
├── architecture/
│   ├── overview.md
│   ├── data-flow.md
│   └── security.md
├── api/
│   ├── webhooks.md
│   ├── internal-apis.md
│   └── public-api.md           # 将来公開API用
├── developer/
│   ├── setup.md                # 開発環境構築
│   ├── coding-standards.md
│   ├── testing.md
│   └── git-workflow.md
└── user/
    ├── purchase-guide.md       # ユーザー向け購入ガイド
    ├── bot-commands.md         # Bot コマンド一覧
    └── faq.md
```

### 12.2 オンコール体制（将来）

MVP1 段階では仁さん1人で対応。MVP2以降に体制構築：

```
On-Call Schedule:
  - 平日昼間: 開発担当
  - 平日夜間/週末: ローテーション
  - クリティカルアラート: 即時対応
```

---

## 13. リリース管理

### 13.1 バージョニング

セマンティックバージョニング採用：

```
v1.0.0  ← MVP1リリース時
v1.1.0  ← マイナー機能追加
v1.0.1  ← バグ修正
v2.0.0  ← MVP2リリース時（破壊的変更含む）
```

### 13.2 リリースノート

各リリースで作成：

```markdown
# v1.1.0 - 2026-MM-DD

## 新機能
- ✨ 動的%紹介報酬を実装
- ✨ X 自動投稿機能
- ✨ コロニー画面の改善

## 改善
- 🚀 Bot 応答速度を30%改善
- 🚀 HP生成の安定性向上

## バグ修正
- 🐛 NFT保有確認の同期遅延を修正
- 🐛 紹介系図の表示エラーを修正

## 破壊的変更
なし

## 移行ガイド
- マイグレーション 20260601 を実行してください
```

---

## 14. 法務・コンプライアンス対応（実装で支援）

### 14.1 必要な法的表示

技術的に実装すべき：

```
- /terms                 利用規約
- /privacy               プライバシーポリシー
- /tokutei               特定商取引法表記
- /commerce              暗号資産取引に関する注意事項
- Cookie同意バナー
- 利用規約への同意フロー（購入時）
```

### 14.2 データ保護（GDPR / 個人情報保護法）

```
実装すべき機能:
- データ削除リクエスト（退会時）
- データエクスポート機能
- 同意管理（Cookie / マーケティング）
- データ保持期間の明示
```

---

## 15. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-11 環境変数・デプロイ・運用
- 対象: 全プロジェクト

[タスク]
SPEC-11 に記載されている運用基盤を整備してください。

[具体的な要件]
1. .env.example の作成（全環境変数を網羅）
2. GitHub Actions の CI/CD パイプライン
3. デプロイスクリプト
4. 監視・アラート機能
5. バックアップ Worker
6. ヘルスチェックエンドポイント
7. 運用ドキュメント (docs/operations/)

[出力形式]
- 全 .yml, .toml, .md ファイル
- bash スクリプト
- ヘルスチェック実装

[禁止事項]
- シークレットを git にコミットしない
- 本番用のデフォルト値を使わない
- セキュリティチェックを省略しない
```

---

## 16. ローンチチェックリスト（最終確認）

```
【法務】
□ 利用規約・プライバシーポリシー・特商法を弁護士確認
□ 特定商取引法表示が完了
□ 暗号資産取引の注意事項表示
□ 同意フロー実装

【ビジネス】
□ 価格設定の最終確認 (300 USDT)
□ 紹介報酬率の最終確認 (30/10/5)
□ 運営取り分の確認 (55%)
□ Academy 「準備中」表示

【技術】
□ 全テストが通過
□ ステージング環境で動作確認
□ パフォーマンステスト合格
□ セキュリティ監査（最低限 Slither）
□ 監視・アラート稼働

【マーケティング】
□ LP公開
□ 30体カタログ公開
□ X / SNS アカウント開設
□ 仁さんの紹介リンク発行
□ 最初の100人へのアプローチ準備

【サポート体制】
□ 仁さんの連絡先公開
□ FAQ 整備
□ ヘルプドキュメント
□ Discord / Telegram コミュニティ準備
```

---

## 17. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-11**

---

# OPENCLAW Platform 仕様書シリーズ — 完成

仁さん、お疲れさまでした。これで全11本の仕様書が完成しました。

各 SPEC は独立して読めますが、SPEC-00 を起点に全体像を把握してから、必要な SPEC を参照する設計になっています。

Claude Code / Factory Droid に渡す際は、まず SPEC-00 を最初に読ませて、その後タスクごとに該当 SPEC を提示してください。
