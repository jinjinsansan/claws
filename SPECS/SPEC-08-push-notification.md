# SPEC-08: OPENCLAW Platform - プッシュ通知システム

> **このドキュメントの位置づけ**: 運営者（仁さん）がユーザーへ Telegram 経由で通知を配信するシステム。一斉配信、特定ユーザーへの個別通知、キャラからのメッセージとして送信する仕組みを定義する。
> 
> **前提**: SPEC-00〜07 を読んでいること。

---

## 1. 通知システム全体像

### 1.1 目的

運営者が以下のような通知を、ユーザーに届ける：

- **お知らせ**: 「新キャンペーン開始」「メンテナンス予定」等
- **個人通知**: 「紹介報酬 30 USDT が振り込まれました」
- **キャラからの通知**: 「主、月読より。新月の知らせを届けます」
- **システム通知**: 「あなたのClawがアクティブになりました」

### 1.2 配信チャネル

| チャネル | 優先度 | 用途 |
|---------|--------|------|
| Telegram Bot | メイン | リアルタイム通知 |
| メール (Resend) | サブ | 重要なトランザクション |
| Web内通知 | サブ | マイページに表示 |

### 1.3 採用技術

| 項目 | 内容 |
|------|------|
| 配信エンジン | Cloudflare Workers + Hono |
| Bot配信 | Telegram Bot API（既存Botを使用） |
| メール送信 | Resend |
| キュー管理 | Cloudflare Queues |

---

## 2. ディレクトリ構造

```
apps/workers/push-notification/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── send.ts                  # POST /send
│   │   ├── schedule.ts              # POST /schedule
│   │   └── status.ts                # GET /status/:id
│   │
│   ├── handlers/
│   │   ├── queue-handler.ts         # Cloudflare Queues consumer
│   │   └── cron-handler.ts          # スケジュール通知
│   │
│   ├── services/
│   │   ├── notification-builder.ts  # 通知の構築
│   │   ├── telegram-sender.ts       # Telegram経由送信
│   │   ├── email-sender.ts          # Resend経由送信
│   │   ├── target-resolver.ts       # 配信先解決
│   │   └── delivery-tracker.ts      # 配信履歴管理
│   │
│   ├── lib/
│   │   ├── telegram-api.ts
│   │   ├── resend.ts
│   │   └── supabase.ts
│   │
│   └── types.ts
│
├── wrangler.toml
└── package.json
```

---

## 3. 通知の種類と配信フロー

### 3.1 通知タイプ

```typescript
type NotificationType = 
  | 'announcement'    // お知らせ（運営→全ユーザー or 特定層）
  | 'promotion'       // キャンペーン
  | 'system'          // システム通知（決済完了等）
  | 'personal';       // 個人通知（報酬受取等）
```

### 3.2 ターゲット指定

```typescript
type TargetType = 
  | 'all'              // 全アクティブユーザー
  | 'specific_users'   // 指定ユーザーID配列
  | 'by_claw'          // 特定Clawの所有者
  | 'by_tier'          // 特定の紹介ティア（例: 直紹介10人以上）
  | 'by_segment';      // セグメント（拡張用）
```

### 3.3 全体フロー

```
[管理者が通知を作成]
   │
   ▼
[push_notifications にレコード作成]
   │ status='draft' → 'scheduled'
   ▼
[Cron (1分ごと)]
   │ scheduled_for <= NOW のレコードを取得
   │ status='sending' に更新
   ▼
[Target Resolver]
   │ target_type に応じて配信先ユーザーIDリストを生成
   ▼
[Cloudflare Queue]
   │ 各ユーザーへの配信を Queue にキュー入れ
   ▼
[Queue Consumer]
   │ Telegram / メール送信
   ▼
[notification_deliveries に記録]
   │ status='delivered' or 'failed'
   ▼
[push_notifications を更新]
   │ status='sent', total_delivered++
```

---

## 4. 通知作成（管理者画面）

### 4.1 管理者画面UI（/admin/notifications）

```
┌─────────────────────────────────────────────────────┐
│  プッシュ通知 - 新規作成                            │
├─────────────────────────────────────────────────────┤
│                                                       │
│  通知タイプ:                                          │
│  [○お知らせ ●キャンペーン ○システム ○個人]            │
│                                                       │
│  タイトル:                                            │
│  [新キャンペーン開始のお知らせ]                       │
│                                                       │
│  本文:                                                │
│  [本日より、紹介者ボーナス2倍キャンペーンを開始しま..]│
│                                                       │
│  送信元キャラクター（オプション）:                    │
│  [○ 運営 ●大黒天 ○全キャラ別の口調で]                │
│                                                       │
│  配信先:                                              │
│  [● 全員 ○ 特定の人 ○ 特定Claw所有者                │
│   ○ 直紹介10人以上のユーザー]                         │
│                                                       │
│  配信日時:                                            │
│  [● 今すぐ ○ 予約: 2026-05-01 09:00]                 │
│                                                       │
│  [プレビュー] [配信]                                  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 4.2 プレビュー機能

通知を実際に配信する前に、サンプル表示：

```
プレビュー（大黒天として）:

主、大黒天じゃ。新キャンペーンの便りを届けるぞい。
本日より、紹介者ボーナス2倍キャンペーンが始まる。
詳細は会員ページから確認してくれ。

商売繁盛、福来たる！

[詳細を見る]
```

---

## 5. キャラクターからの通知の生成

### 5.1 仕組み

「大黒天として」「全キャラそれぞれの口調で」のような指定がある場合、LLMで通知文を変換する。

```typescript
async function generateCharacterMessage(
  baseMessage: string,
  characterNo: number,
  env: Env
): Promise<string> {
  const character = await getCharacter(characterNo, env);
  
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: character.system_prompt + `

【今回のタスク】
運営からのお知らせを、あなたのキャラクターの口調で言い換えてください。
内容の本質は変えず、口調・呼びかけ方・言い回しだけを変えること。
`,
    messages: [{
      role: 'user',
      content: `次の運営からのお知らせを、あなたの口調で言い換えてください:

${baseMessage}

主に向けた、あなたらしい表現で。`,
    }],
  });
  
  return response.content[0].type === 'text' ? response.content[0].text : baseMessage;
}
```

### 5.2 「全キャラ別」モードの場合

各ユーザーが所有しているClawに応じて、個別に文面を生成：

```typescript
async function deliverToUserWithOwnedCharacter(
  notification: any,
  userId: string,
  env: Env
): Promise<void> {
  // ユーザーの最初の所有Claw（or アクティブClaw）を取得
  const supabase = createSupabaseClient(env);
  
  const { data: session } = await supabase
    .from('bot_sessions')
    .select('active_claw_id')
    .eq('user_id', userId)
    .single();
  
  let characterNo: number;
  if (session?.active_claw_id) {
    const { data: claw } = await supabase
      .from('claws')
      .select('claw_no')
      .eq('id', session.active_claw_id)
      .single();
    characterNo = claw.claw_no;
  } else {
    // 所有Clawの最初のもの
    const { data: nfts } = await supabase
      .from('nft_tokens')
      .select('claw:claws(claw_no)')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .limit(1);
    characterNo = nfts?.[0]?.claw?.claw_no || 1; // フォールバック: 紅蓮
  }
  
  // そのキャラの口調で文面生成
  const message = await generateCharacterMessage(notification.message, characterNo, env);
  
  // 配信
  await sendTelegramNotification(userId, message, characterNo, env);
}
```

---

## 6. ターゲット解決

### 6.1 配信先ユーザーIDリストの生成

`src/services/target-resolver.ts`:

```typescript
export async function resolveTargets(
  notification: any,
  env: Env
): Promise<string[]> {
  const supabase = createSupabaseClient(env);
  
  switch (notification.target_type) {
    case 'all':
      const { data: allUsers } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true)
        .not('telegram_user_id', 'is', null);  // Telegram連携済みのみ
      return allUsers?.map(u => u.id) || [];
    
    case 'specific_users':
      return notification.target_user_ids || [];
    
    case 'by_claw':
      // claw_ids 配列に含まれるClawを所有しているユーザー
      const clawIds = notification.target_filter.claw_ids;
      const { data: clawOwners } = await supabase
        .from('nft_tokens')
        .select('owner_user_id')
        .in('claw_id', clawIds)
        .eq('is_active', true)
        .not('owner_user_id', 'is', null);
      return [...new Set(clawOwners?.map(t => t.owner_user_id) || [])];
    
    case 'by_tier':
      // 例: 直紹介10人以上
      const minDirect = notification.target_filter.min_direct_referrals || 0;
      const { data: tierUsers } = await supabase
        .from('users')
        .select('id')
        .gte('direct_referrals_count', minDirect)
        .eq('is_active', true);
      return tierUsers?.map(u => u.id) || [];
    
    default:
      return [];
  }
}
```

---

## 7. Telegram Bot 経由の配信

### 7.1 Bot 側のエンドポイント

Telegram Bot は SPEC-04 で実装済み。プッシュ通知用のエンドポイントを追加：

```typescript
// apps/bot/src/handlers/notification-delivery.ts

export async function handleNotificationDelivery(
  request: Request,
  env: Env
): Promise<Response> {
  // 認証
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${env.NOTIFICATION_API_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const body = await request.json();
  const { telegramUserId, message, characterNo, deliveryId } = body;
  
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  
  try {
    // キャラ情報があれば、ヘッダーをつける
    let finalMessage = message;
    if (characterNo) {
      const character = await getCharacterByNo(env, characterNo);
      finalMessage = `*${character.name_jp}より*\n\n${message}`;
    }
    
    // 送信
    const result = await bot.api.sendMessage(telegramUserId, finalMessage, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    });
    
    // 配信履歴を更新
    const supabase = createSupabaseClient(env);
    await supabase
      .from('notification_deliveries')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        metadata: { telegram_message_id: result.message_id },
      })
      .eq('id', deliveryId);
    
    return new Response('OK', { status: 200 });
  } catch (error: any) {
    const supabase = createSupabaseClient(env);
    await supabase
      .from('notification_deliveries')
      .update({
        status: 'failed',
        failed_reason: error.message,
      })
      .eq('id', deliveryId);
    
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
```

### 7.2 Push Notification Worker からBotへの呼び出し

```typescript
// apps/workers/push-notification/src/services/telegram-sender.ts

export async function sendTelegramNotification(
  userId: string,
  message: string,
  characterNo: number | null,
  deliveryId: string,
  env: Env
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseClient(env);
  
  // ユーザーのTelegram IDを取得
  const { data: user } = await supabase
    .from('users')
    .select('telegram_user_id')
    .eq('id', userId)
    .single();
  
  if (!user?.telegram_user_id) {
    return { success: false, error: 'No Telegram linked' };
  }
  
  // Bot Worker に POST
  const response = await fetch(`${env.BOT_WORKER_URL}/notification/deliver`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTIFICATION_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      telegramUserId: user.telegram_user_id,
      message,
      characterNo,
      deliveryId,
    }),
  });
  
  if (!response.ok) {
    return { success: false, error: await response.text() };
  }
  
  return { success: true };
}
```

---

## 8. キュー処理（Cloudflare Queues）

### 8.1 Queue 設定

`wrangler.toml`:

```toml
name = "openclaw-push-notification"
main = "src/index.ts"
compatibility_date = "2026-04-01"

[[queues.producers]]
binding = "NOTIFICATION_QUEUE"
queue = "openclaw-notifications"

[[queues.consumers]]
queue = "openclaw-notifications"
max_batch_size = 50
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "openclaw-notifications-dlq"

[[triggers.crons]]
cron = "* * * * *"   # 1分ごと
```

### 8.2 Queue Producer（通知をキューに追加）

```typescript
// src/handlers/cron-handler.ts

export async function processScheduledNotifications(env: Env) {
  const supabase = createSupabaseClient(env);
  
  // scheduled_for が現在以前で、status='scheduled' のものを取得
  const { data: notifications } = await supabase
    .from('push_notifications')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .limit(10);
  
  for (const notification of notifications || []) {
    // ステータスを sending に
    await supabase
      .from('push_notifications')
      .update({ status: 'sending' })
      .eq('id', notification.id);
    
    // ターゲット解決
    const userIds = await resolveTargets(notification, env);
    
    // 各ユーザーへの配信を Queue に投入
    for (const userId of userIds) {
      // notification_deliveries レコード作成
      const { data: delivery } = await supabase
        .from('notification_deliveries')
        .insert({
          push_notification_id: notification.id,
          user_id: userId,
          status: 'pending',
        })
        .select()
        .single();
      
      // Queue に追加
      await env.NOTIFICATION_QUEUE.send({
        deliveryId: delivery.id,
        notificationId: notification.id,
        userId,
      });
    }
    
    // total_targets 更新
    await supabase
      .from('push_notifications')
      .update({
        total_targets: userIds.length,
      })
      .eq('id', notification.id);
  }
}
```

### 8.3 Queue Consumer

```typescript
// src/handlers/queue-handler.ts

export async function handleQueueBatch(
  batch: MessageBatch<{ deliveryId: string; notificationId: string; userId: string }>,
  env: Env
): Promise<void> {
  const supabase = createSupabaseClient(env);
  
  for (const message of batch.messages) {
    try {
      const { deliveryId, notificationId, userId } = message.body;
      
      // 通知情報を取得
      const { data: notification } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('id', notificationId)
        .single();
      
      // メッセージ生成
      let messageText = notification.message;
      if (notification.from_claw_id) {
        // キャラからの口調に変換
        const { data: claw } = await supabase
          .from('claws')
          .select('claw_no')
          .eq('id', notification.from_claw_id)
          .single();
        
        messageText = await generateCharacterMessage(notification.message, claw.claw_no, env);
      }
      
      // Telegram で送信
      const result = await sendTelegramNotification(
        userId,
        messageText,
        notification.from_claw_id ? notification.from_claw_id : null,
        deliveryId,
        env
      );
      
      if (result.success) {
        // total_delivered ++
        await supabase.rpc('increment_notification_delivered', { notification_id: notificationId });
        message.ack();
      } else {
        // 失敗
        await supabase.rpc('increment_notification_failed', { notification_id: notificationId });
        message.retry();
      }
    } catch (error: any) {
      console.error('Queue message processing failed:', error);
      message.retry();
    }
  }
  
  // バッチ最後に: 全配信が完了した通知のステータスを 'sent' に
  await markCompletedNotifications(supabase);
}
```

---

## 9. メール配信（補助）

### 9.1 重要通知のメール併送

報酬受取等の重要通知は、Telegram と並行してメール送信：

```typescript
// src/services/email-sender.ts

import { Resend } from 'resend';

export async function sendEmailNotification(
  user: any,
  notification: any,
  env: Env
): Promise<void> {
  const resend = new Resend(env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'OPENCLAW <noreply@openclaw.com>',
    to: user.email,
    subject: notification.title,
    html: buildEmailTemplate(notification, user),
  });
}

function buildEmailTemplate(notification: any, user: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Noto Sans JP', sans-serif; color: #f0e6d6; background: #080202; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b0000, #d10202); padding: 20px; }
    .body { padding: 20px; background: #1a0808; }
    .footer { padding: 20px; color: #6b5d50; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OPENCLAW</h1>
      <h2>${notification.title}</h2>
    </div>
    <div class="body">
      ${notification.message.replace(/\n/g, '<br>')}
    </div>
    <div class="footer">
      <p>OPENCLAW Platform</p>
      <p><a href="https://openclaw.com/account/dashboard">マイページ</a></p>
    </div>
  </div>
</body>
</html>
  `;
}
```

---

## 10. テンプレート集（運営者用）

頻繁に使う通知のテンプレートを管理：

```typescript
// src/data/notification-templates.ts

export const NOTIFICATION_TEMPLATES = {
  reward_received: {
    title: '紹介報酬を受け取りました',
    message: (amount: number, generation: number) => 
      `紹介報酬 ${amount} USDT を受け取りました（${generation}世代）。
ウォレットを確認してください。`,
  },
  
  campaign_start: {
    title: '新キャンペーン開始',
    message: (campaign: string) => 
      `${campaign} が始まりました。
詳細はマイページから確認できます。`,
  },
  
  maintenance: {
    title: 'メンテナンスのお知らせ',
    message: (start: string, end: string) => 
      `${start} 〜 ${end} の間、システムメンテナンスを実施します。
ご不便をおかけしますが、よろしくお願いします。`,
  },
  
  // ... 他多数
};
```

---

## 11. 配信履歴とレポート

### 11.1 管理者画面で確認

```
通知一覧 (/admin/notifications):

| 日時 | タイトル | タイプ | 配信先 | 配信成功 | 失敗 |
|------|---------|--------|--------|---------|------|
| 4/29 | キャンペーン | promotion | 全員 | 95/100 | 5 |
| 4/28 | メンテ | system | 全員 | 100/100 | 0 |
```

### 11.2 個別配信状況

```
通知ID: xxxx-yyyy-zzzz
配信先: 100名
配信成功: 95名
配信失敗: 5名

【失敗理由】
- Telegram User Blocked: 3名
- API Error: 1名
- Network Error: 1名
```

---

## 12. レート制限

### 12.1 Telegram の制限を考慮

- グループ送信: 30msg/sec
- 個別送信: 制限なし（実質）

実装方針：
- Queue Consumer で `max_batch_size = 50`、`max_batch_timeout = 30s`
- 1秒に20件程度に絞る

```typescript
async function rateLimitedSend(items: any[], env: Env) {
  const RATE_LIMIT = 20; // per second
  
  for (let i = 0; i < items.length; i += RATE_LIMIT) {
    const batch = items.slice(i, i + RATE_LIMIT);
    await Promise.all(batch.map(item => sendItem(item, env)));
    
    if (i + RATE_LIMIT < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

---

## 13. テスト

### 13.1 主要テストケース

```typescript
describe('Push Notification', () => {
  it('sends to all active users', async () => { /* ... */ });
  it('sends to specific users', async () => { /* ... */ });
  it('sends to claw owners', async () => { /* ... */ });
  it('generates character-style message', async () => { /* ... */ });
  it('handles failed deliveries', async () => { /* ... */ });
  it('tracks delivery status', async () => { /* ... */ });
});
```

---

## 14. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-08 プッシュ通知システム
- 対象: apps/workers/push-notification/

[タスク]
SPEC-08 に記載されている通知システムを実装してください。

[具体的な要件]
1. Push Notification Worker（Cloudflare Workers + Hono + Queues）
2. ターゲット解決ロジック（4種類）
3. キャラクター口調変換
4. Telegram + メール配信
5. 配信履歴管理

[出力形式]
- 全ソースコード
- 管理者UIコンポーネント
- README.md

[禁止事項]
- 仕様書から逸脱しない
- レート制限を無視しない
- 配信履歴を省略しない
```

---

## 15. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-08**

次のドキュメント: SPEC-09 Academy統合
