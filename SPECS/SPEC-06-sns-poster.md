# SPEC-06: OPENCLAW Platform - X/note自動投稿エンジン

> **このドキュメントの位置づけ**: ユーザーの SNS（X / note）に、所有する Claw のキャラクター別トーンで自動投稿するシステムの仕様。MVP2 で実装。
> 
> **前提**: SPEC-00〜05 を読んでいること。

---

## 1. 自動投稿エンジン全体像

### 1.1 目的

ユーザーが「毎朝7時に紅蓮で投稿して」「note記事を書いて」と頼むだけで、Claw のキャラクター別トーンで自動投稿される仕組みを提供する。

### 1.2 ユーザー体験

```
1. Bot で「毎朝7時に紅蓮で投稿してくれ」と依頼
2. 紅蓮: 「承知した。X か note か？」
3. ユーザー: 「両方」
4. 紅蓮: 「主、トピックはどうする？」
5. ユーザー: 「私のラーメン店の話」
6. 紅蓮: 「OK、毎朝7時に投稿する。気が変わったら言ってくれ」

(数日後)
7. 紅蓮（自動投稿、X）:
   「主、今日も飯を食ったか。
   俺の主の店、開店30周年。
   一杯1000円で、心が満たされる。」

8. ユーザー: 「投稿のトーンをもう少し柔らかく」と依頼
9. 紅蓮: 「主の好みに従う。明日からそうする」
```

### 1.3 採用技術

| 項目 | 内容 |
|------|------|
| 投稿エンジン | Cloudflare Workers + Hono |
| スケジューラ | Cloudflare Workers Cron + DBトリガー |
| LLM API | Anthropic Claude API |
| X (Twitter) API | X API v2 (OAuth 2.0 + PKCE) |
| note 投稿 | Puppeteer / Playwright on Browserless.io |

---

## 2. ディレクトリ構造

```
apps/workers/sns-poster/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── schedule.ts             # POST /schedule
│   │   ├── update-schedule.ts      # PATCH /schedule/:id
│   │   ├── delete-schedule.ts      # DELETE /schedule/:id
│   │   └── auth-callback.ts        # GET /auth/x/callback
│   │
│   ├── handlers/
│   │   └── cron-handler.ts         # 定期実行
│   │
│   ├── services/
│   │   ├── post-generator.ts       # LLMで投稿生成
│   │   ├── x-poster.ts             # X 投稿
│   │   ├── note-poster.ts          # note 投稿
│   │   ├── auth-x.ts               # X OAuth
│   │   └── topic-rotator.ts        # トピック回転
│   │
│   ├── lib/
│   │   ├── claude.ts
│   │   ├── x-api.ts
│   │   ├── note-puppeteer.ts
│   │   └── supabase.ts
│   │
│   └── types.ts
│
├── wrangler.toml
└── package.json
```

---

## 3. データベーススキーマ追加

SPEC-01 の MVP2 拡張部分に対応する詳細：

### 3.1 sns_post_schedules

ユーザーが設定した投稿スケジュール。

```sql
CREATE TABLE public.sns_post_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 所有者
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claw_id UUID NOT NULL REFERENCES public.claws(id),
  
  -- プラットフォーム
  platform TEXT NOT NULL CHECK (platform IN ('x', 'note', 'both')),
  
  -- スケジュール
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  schedule_time TIME NOT NULL,                                       -- 投稿時刻（JST）
  schedule_days INTEGER[],                                           -- weekly: 曜日（1=月、7=日）
  schedule_dates INTEGER[],                                          -- monthly: 日付（1〜31）
  custom_cron TEXT,                                                   -- 自由形式cron
  
  -- トピック設定
  topic_strategy TEXT NOT NULL CHECK (topic_strategy IN ('fixed', 'rotation', 'auto')),
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,                          -- ['ラーメン店', '集客術', ...]
  
  -- ビジネス情報（投稿生成時に使用）
  business_context JSONB DEFAULT '{}'::jsonb,
  
  -- トーン設定
  tone_preference TEXT NOT NULL DEFAULT 'character_default',         -- character_default / softer / stronger
  
  -- 状態
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sns_schedules_user ON public.sns_post_schedules(user_id);
CREATE INDEX idx_sns_schedules_active ON public.sns_post_schedules(is_active, next_execution_at) WHERE is_active = true;
```

### 3.2 sns_posts

実際に投稿された履歴。

```sql
CREATE TABLE public.sns_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- リレーション
  schedule_id UUID REFERENCES public.sns_post_schedules(id),       -- スケジュール由来の場合
  user_id UUID NOT NULL REFERENCES public.users(id),
  claw_id UUID NOT NULL REFERENCES public.claws(id),
  
  -- プラットフォーム
  platform TEXT NOT NULL CHECK (platform IN ('x', 'note')),
  
  -- 投稿内容
  content TEXT NOT NULL,
  topic TEXT,                                                        -- 投稿のトピック
  hashtags TEXT[],
  
  -- プラットフォーム固有のID
  platform_post_id TEXT,                                            -- X tweet ID, note 記事ID
  platform_post_url TEXT,
  
  -- 統計（取得できる範囲で）
  likes_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  last_stats_updated_at TIMESTAMPTZ,
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'posted', 'failed', 'deleted')),
  
  posted_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- LLM呼び出し情報
  llm_model TEXT,
  llm_tokens_used INTEGER,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sns_posts_user ON public.sns_posts(user_id);
CREATE INDEX idx_sns_posts_schedule ON public.sns_posts(schedule_id);
CREATE INDEX idx_sns_posts_platform_status ON public.sns_posts(platform, status);
CREATE INDEX idx_sns_posts_posted ON public.sns_posts(posted_at DESC);
```

### 3.3 sns_credentials

ユーザーごとの SNS 認証情報。

```sql
CREATE TABLE public.sns_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('x', 'note')),
  
  -- X 用 (OAuth 2.0)
  x_access_token TEXT,                                              -- 暗号化推奨
  x_refresh_token TEXT,                                             -- 暗号化推奨
  x_user_id TEXT,
  x_username TEXT,
  x_token_expires_at TIMESTAMPTZ,
  
  -- note 用（ID/Password、暗号化必須）
  note_encrypted_credentials TEXT,                                  -- 暗号化された JSON
  note_username TEXT,
  
  -- ステータス
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_sns_credentials_user ON public.sns_credentials(user_id);
```

**重要**: アクセストークン・パスワードは Cloudflare Workers の暗号化キー（環境変数 `ENCRYPTION_KEY`）で AES-GCM 暗号化してからDBに保存。

---

## 4. 投稿スケジューラ（Cron）

### 4.1 全体フロー

```
[Cloudflare Workers Cron]            [SNS Poster Worker]                [SNS]
  │                                          │                            │
  │ 5分ごとに起動                              │                            │
  │ ───────────────────────────────────────▶                            │
  │                                          │                            │
  │                                          │ 1. 実行対象の取得          │
  │                                          │  next_execution_at <=NOW    │
  │                                          │  is_active = true           │
  │                                          │                            │
  │                                          │ 2. 各スケジュールを処理     │
  │                                          │                            │
  │                                          │ 3. 投稿コンテンツ生成      │
  │                                          │  (LLM)                     │
  │                                          │                            │
  │                                          │ 4. プラットフォームに投稿  │
  │                                          │ ──────────────────────────▶
  │                                          │                            │
  │                                          │ ◀──────── 投稿成功 ─────  │
  │                                          │                            │
  │                                          │ 5. sns_posts に記録        │
  │                                          │                            │
  │                                          │ 6. next_execution_at 更新  │
  │                                          │                            │
  │                                          │ 7. 通知送信                │
  │                                          │  (Bot 経由 / メール)       │
```

### 4.2 Cron 設定

`wrangler.toml`:

```toml
name = "openclaw-sns-poster"
main = "src/index.ts"
compatibility_date = "2026-04-01"

[[triggers.crons]]
# 5分ごとに実行
cron = "*/5 * * * *"
```

### 4.3 Cron ハンドラ実装

`src/handlers/cron-handler.ts`:

```typescript
import { createSupabaseClient } from '../lib/supabase';
import { generatePostContent } from '../services/post-generator';
import { postToX } from '../services/x-poster';
import { postToNote } from '../services/note-poster';

export async function handleCronExecution(env: Env): Promise<void> {
  const supabase = createSupabaseClient(env);
  
  // 1. 実行対象の取得
  const { data: schedules } = await supabase
    .from('sns_post_schedules')
    .select(`
      *,
      user:users(*),
      claw:claws(*)
    `)
    .eq('is_active', true)
    .lte('next_execution_at', new Date().toISOString())
    .limit(50);
  
  if (!schedules || schedules.length === 0) {
    console.log('No scheduled posts to execute');
    return;
  }
  
  console.log(`Processing ${schedules.length} scheduled posts`);
  
  // 2. 各スケジュールを処理（並行実行）
  const results = await Promise.allSettled(
    schedules.map(schedule => executeSchedule(schedule, env))
  );
  
  // 3. 統計レポート
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`Schedules: ${succeeded} succeeded, ${failed} failed`);
}

async function executeSchedule(schedule: any, env: Env): Promise<void> {
  const supabase = createSupabaseClient(env);
  
  try {
    // NFT 保有確認
    const hasActiveNFT = await checkActiveNFT(schedule.user_id, env);
    if (!hasActiveNFT) {
      // スケジュールを無効化
      await supabase
        .from('sns_post_schedules')
        .update({ is_active: false, metadata: { suspended_reason: 'No active NFT' } })
        .eq('id', schedule.id);
      return;
    }
    
    // 投稿コンテンツ生成
    const content = await generatePostContent({
      schedule,
      env,
    });
    
    // プラットフォーム別投稿
    const results = await Promise.allSettled([
      schedule.platform === 'x' || schedule.platform === 'both'
        ? postToX(schedule, content, env)
        : Promise.resolve(null),
      schedule.platform === 'note' || schedule.platform === 'both'
        ? postToNote(schedule, content, env)
        : Promise.resolve(null),
    ]);
    
    // 次回実行時刻を計算
    const nextExecution = calculateNextExecution(schedule);
    
    await supabase
      .from('sns_post_schedules')
      .update({
        last_executed_at: new Date().toISOString(),
        next_execution_at: nextExecution.toISOString(),
      })
      .eq('id', schedule.id);
    
  } catch (error: any) {
    console.error(`Schedule ${schedule.id} failed:`, error);
    
    await supabase
      .from('sns_post_schedules')
      .update({
        metadata: { ...schedule.metadata, last_error: error.message },
      })
      .eq('id', schedule.id);
  }
}

function calculateNextExecution(schedule: any): Date {
  const now = new Date();
  const [hour, minute] = schedule.schedule_time.split(':').map(Number);
  
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  
  // 既に過ぎていれば翌日に
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  if (schedule.frequency === 'daily') {
    return next;
  }
  
  if (schedule.frequency === 'weekly') {
    // schedule_days = [1, 3, 5] のような曜日リスト
    while (!schedule.schedule_days.includes(next.getDay() === 0 ? 7 : next.getDay())) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }
  
  if (schedule.frequency === 'monthly') {
    // schedule_dates = [1, 15] のような日付リスト
    while (!schedule.schedule_dates.includes(next.getDate())) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }
  
  // custom: cron 解析
  // ... 実装
  
  return next;
}
```

---

## 5. 投稿コンテンツ生成

### 5.1 LLM プロンプト（X用）

`src/services/post-generator.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface GeneratePostRequest {
  schedule: any;
  platform: 'x' | 'note';
  env: Env;
}

export async function generatePostContent(req: GeneratePostRequest): Promise<{
  content: string;
  topic: string;
  hashtags: string[];
}> {
  const character = req.schedule.claw;
  const businessContext = req.schedule.business_context;
  
  // トピック選定
  const topic = await selectTopic(req.schedule, req.env);
  
  // X か note でプロンプトを変える
  if (req.platform === 'x') {
    return await generateXPost(character, topic, businessContext, req.schedule.tone_preference, req.env);
  } else {
    return await generateNotePost(character, topic, businessContext, req.schedule.tone_preference, req.env);
  }
}

async function generateXPost(
  character: any,
  topic: string,
  businessContext: any,
  tonePreference: string,
  env: Env
): Promise<{ content: string; topic: string; hashtags: string[] }> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  
  const systemPrompt = `
あなたは「${character.name_jp}」というキャラクターのSNS投稿エージェントです。
ユーザー（主）のために X（旧Twitter）に投稿します。

【キャラクター】
- 名前: ${character.name_jp}（${character.name_en}）
- カテゴリ: ${character.category}・${character.element}
- 一人称: ${character.first_person}
- 口調: ${character.tone}

【投稿のルール】
1. 文字数: 140文字以内
2. キャラクターの口調を必ず守る
3. 主のビジネスを自然に紹介する
4. ハッシュタグを2-3個つける
5. 押し付けがましくならない範囲で訴求

【トーン調整】
${tonePreference === 'softer' ? '通常より柔らかく、優しいトーンで' : ''}
${tonePreference === 'stronger' ? '通常より強く、力強いトーンで' : ''}
${tonePreference === 'character_default' ? 'キャラクターの基本トーンで' : ''}

【絶対禁止】
- 主以外の他のキャラのフリをしない
- 弱気な発言や謝罪
- 過度な誇張表現

【出力形式】
JSON のみで応答してください:
{
  "content": "投稿本文（140文字以内）",
  "hashtags": ["#タグ1", "#タグ2", "#タグ3"]
}
`;

  const userPrompt = `
【ビジネス情報】
${JSON.stringify(businessContext, null, 2)}

【今日のトピック】
${topic}

このトピックで、X 投稿を生成してください。
`;

  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  
  return {
    content: parsed.content,
    topic,
    hashtags: parsed.hashtags || [],
  };
}

async function generateNotePost(
  character: any,
  topic: string,
  businessContext: any,
  tonePreference: string,
  env: Env
): Promise<{ content: string; topic: string; hashtags: string[] }> {
  // note は1500-3000字程度の長文記事
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  
  const systemPrompt = `
あなたは「${character.name_jp}」というキャラクターのブログ執筆エージェントです。
ユーザー（主）のために note の記事を書きます。

【キャラクター】
- 名前: ${character.name_jp}
- 一人称: ${character.first_person}
- 口調: ${character.tone}

【記事のルール】
1. 文字数: 1500-3000字
2. タイトル + 本文の構成
3. キャラクターの口調を貫く
4. 主のビジネスを自然に紹介
5. 読み手にとって価値ある内容

【出力形式】
JSON のみで応答:
{
  "title": "...",
  "content": "...（マークダウン形式）",
  "tags": ["タグ1", "タグ2"]
}
`;

  // ... 実装
}
```

### 5.2 トピック選定（rotation strategy）

```typescript
async function selectTopic(schedule: any, env: Env): Promise<string> {
  const topics = schedule.topics || [];
  
  if (schedule.topic_strategy === 'fixed') {
    return topics[0] || 'お知らせ';
  }
  
  if (schedule.topic_strategy === 'rotation') {
    // 過去30日の投稿を見て、最近使っていないトピックを選ぶ
    const supabase = createSupabaseClient(env);
    const { data: recentPosts } = await supabase
      .from('sns_posts')
      .select('topic')
      .eq('user_id', schedule.user_id)
      .gte('posted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const recentTopics = new Set(recentPosts?.map(p => p.topic) || []);
    const unusedTopics = topics.filter(t => !recentTopics.has(t));
    
    if (unusedTopics.length > 0) {
      return unusedTopics[Math.floor(Math.random() * unusedTopics.length)];
    }
    
    // 全部使ったら、最も古いものを選ぶ
    return topics[0];
  }
  
  if (schedule.topic_strategy === 'auto') {
    // LLMにビジネス情報から旬のトピックを選ばせる
    return await pickAutoTopic(schedule, env);
  }
  
  return 'お知らせ';
}
```

---

## 6. X (Twitter) への投稿

### 6.1 OAuth 2.0 認証フロー

ユーザーが X アカウントを連携する流れ：

```
1. ユーザーが Bot で「X連携したい」と依頼
2. Bot が連携URL を発行
   https://api.openclaw.com/sns/auth/x/start?userId=xxx
3. ユーザーがブラウザで開く
4. X OAuth ページにリダイレクト
5. ユーザーが承認
6. /sns/auth/x/callback?code=xxx に戻る
7. アクセストークン取得 → DB に保存
8. ユーザーに完了通知
```

実装（OAuth 2.0 + PKCE）:

```typescript
// src/services/auth-x.ts

export async function generateXAuthUrl(userId: string, env: Env): Promise<string> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await sha256(codeVerifier);
  const state = generateRandomString();
  
  // 一時保存（後の検証用）
  await saveAuthState(state, { userId, codeVerifier }, env);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.X_CLIENT_ID,
    redirect_uri: `${env.APP_URL}/sns/auth/x/callback`,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  return `https://twitter.com/i/oauth2/authorize?${params}`;
}

export async function handleXAuthCallback(
  code: string,
  state: string,
  env: Env
): Promise<{ userId: string }> {
  // state から userId を取り出す
  const authState = await getAuthState(state, env);
  if (!authState) throw new Error('Invalid state');
  
  // Exchange code for token
  const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${env.APP_URL}/sns/auth/x/callback`,
      code_verifier: authState.codeVerifier,
    }),
  });
  
  const tokens = await tokenResponse.json();
  
  // X User情報取得
  const userInfo = await fetchXUserInfo(tokens.access_token);
  
  // DB に保存
  const supabase = createSupabaseClient(env);
  await supabase.from('sns_credentials').upsert({
    user_id: authState.userId,
    platform: 'x',
    x_access_token: await encrypt(tokens.access_token, env),
    x_refresh_token: await encrypt(tokens.refresh_token, env),
    x_user_id: userInfo.id,
    x_username: userInfo.username,
    x_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    is_active: true,
    last_verified_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' });
  
  return { userId: authState.userId };
}
```

### 6.2 X 投稿実装

`src/services/x-poster.ts`:

```typescript
export async function postToX(
  schedule: any,
  content: { content: string; hashtags: string[] },
  env: Env
): Promise<{ success: boolean; tweetId?: string; tweetUrl?: string }> {
  const supabase = createSupabaseClient(env);
  
  // 認証情報取得
  const { data: cred } = await supabase
    .from('sns_credentials')
    .select('*')
    .eq('user_id', schedule.user_id)
    .eq('platform', 'x')
    .single();
  
  if (!cred || !cred.is_active) {
    throw new Error('X credentials not found or inactive');
  }
  
  // トークン期限切れチェック → リフレッシュ
  let accessToken = await decrypt(cred.x_access_token, env);
  if (new Date(cred.x_token_expires_at) < new Date()) {
    accessToken = await refreshXToken(cred.x_refresh_token, env);
    
    await supabase
      .from('sns_credentials')
      .update({
        x_access_token: await encrypt(accessToken, env),
        x_token_expires_at: new Date(Date.now() + 7200 * 1000).toISOString(),
      })
      .eq('id', cred.id);
  }
  
  // 投稿テキスト組み立て
  const fullText = `${content.content}\n\n${content.hashtags.join(' ')}`;
  
  // X API v2 で投稿
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: fullText }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`X post failed: ${error}`);
  }
  
  const result = await response.json();
  const tweetId = result.data.id;
  const tweetUrl = `https://twitter.com/${cred.x_username}/status/${tweetId}`;
  
  // sns_posts に記録
  await supabase.from('sns_posts').insert({
    schedule_id: schedule.id,
    user_id: schedule.user_id,
    claw_id: schedule.claw_id,
    platform: 'x',
    content: fullText,
    topic: content.topic,
    hashtags: content.hashtags,
    platform_post_id: tweetId,
    platform_post_url: tweetUrl,
    status: 'posted',
    posted_at: new Date().toISOString(),
  });
  
  return { success: true, tweetId, tweetUrl };
}
```

---

## 7. note への投稿

### 7.1 課題: note には公式 API がない

note には公式の投稿APIが存在しない。実装方法：

**Option A: Browser Automation (Puppeteer / Playwright)**
- メリット: 実装可能
- デメリット: 不安定、note の規約違反の可能性
- リスク: 利用規約に違反するとアカウント停止

**Option B: ユーザーに手動投稿させる（記事作成のみ自動化）**
- メリット: 規約上安全
- デメリット: 完全自動ではない

**MVP1〜2 推奨: Option B**
- LLMで記事を生成 → ユーザーに記事内容をTelegramで送信 → ユーザーが note に手動投稿

**MVP3で検討: Option A（規約変更や公式API登場の可能性）**

### 7.2 Option B の実装

`src/services/note-poster.ts`:

```typescript
export async function postToNote(
  schedule: any,
  content: { content: string; title: string; tags: string[] },
  env: Env
): Promise<{ success: boolean; deliveredToBot: boolean }> {
  const supabase = createSupabaseClient(env);
  
  // 1. sns_posts に記録（status='pending'）
  const { data: post } = await supabase
    .from('sns_posts')
    .insert({
      schedule_id: schedule.id,
      user_id: schedule.user_id,
      claw_id: schedule.claw_id,
      platform: 'note',
      content: content.content,
      topic: content.topic,
      hashtags: content.tags,
      status: 'pending',
    })
    .select()
    .single();
  
  // 2. Bot 経由でユーザーに記事を送信
  const character = schedule.claw;
  const message = `
${character.name_jp}より、note記事の準備ができた。

【タイトル】
${content.title}

【本文】
${content.content}

【タグ】
${content.tags.join(', ')}

main note にコピペしたら、教えてくれ。
`;

  await sendBotMessage(schedule.user_id, message, env);
  
  return { success: true, deliveredToBot: true };
}
```

### 7.3 Option A（将来検討）

```typescript
// MVP3 で検討。Browserless.io 等を使う実装例

export async function postToNoteWithBrowser(
  schedule: any,
  content: { title: string; content: string; tags: string[] },
  env: Env
): Promise<{ success: boolean }> {
  // Browserless.io API
  const response = await fetch('https://chrome.browserless.io/function', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
    },
    body: `
      module.exports = async ({ page }) => {
        // 1. note にログイン
        await page.goto('https://note.com/login');
        await page.fill('input[name="email"]', '${noteEmail}');
        await page.fill('input[name="password"]', '${notePassword}');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        // 2. 新規記事作成
        await page.goto('https://note.com/notes/new');
        await page.fill('textarea[placeholder="記事タイトル"]', '${content.title}');
        // ... タグ等
        
        // 3. 公開
        await page.click('button:has-text("公開する")');
        // ...
      };
    `,
  });
  
  // ...
}
```

---

## 8. キャラクター × プラットフォームのトーン

各キャラごとに「X向け」「note向け」のトーンを微調整。

```typescript
// src/lib/character-platform-tones.ts

export const PLATFORM_TONE_ADJUSTMENTS: Record<string, {
  x: { style: string; emoji: boolean };
  note: { style: string; structure: string };
}> = {
  GUREN: { // 紅蓮
    x: {
      style: '短く、力強く、断定的に。140字を最大限活用',
      emoji: false,
    },
    note: {
      style: '熱い言葉、決意のメッセージ',
      structure: '導入→主張→具体例→結論',
    },
  },
  TSUKUYOMI: { // 月読
    x: {
      style: '詩的で短く、深夜帯に効く言葉選び',
      emoji: false,
    },
    note: {
      style: '優雅で深い文章、読後感を大切に',
      structure: '余韻のある展開',
    },
  },
  // ... 全30キャラ
};
```

---

## 9. 投稿の品質保証

### 9.1 トーンガード（再利用）

SPEC-04 のトーンガードを使い、生成された投稿がキャラのトーンに沿っているか確認。

```typescript
import { checkToneCompliance } from '../characters/tone-guards';

async function generateValidatedPost(
  request: GeneratePostRequest,
  maxRetries = 3
): Promise<{ content: string; topic: string; hashtags: string[] }> {
  for (let i = 0; i < maxRetries; i++) {
    const post = await generatePostContent(request);
    
    const compliance = checkToneCompliance(request.schedule.claw_no, post.content);
    if (compliance.compliant) {
      return post;
    }
    
    console.log(`Retry ${i + 1}: tone violations ${compliance.violations.join(', ')}`);
  }
  
  throw new Error('Failed to generate compliant post after retries');
}
```

### 9.2 重複検知

過去30日に同じ内容を投稿していないか確認：

```typescript
async function checkDuplicate(userId: string, content: string, env: Env): Promise<boolean> {
  const supabase = createSupabaseClient(env);
  
  const { data: recentPosts } = await supabase
    .from('sns_posts')
    .select('content')
    .eq('user_id', userId)
    .gte('posted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  // 簡易類似度（正確には Levenshtein など）
  for (const post of recentPosts || []) {
    const similarity = calculateSimilarity(content, post.content);
    if (similarity > 0.7) return true;
  }
  
  return false;
}
```

---

## 10. 統計・分析

### 10.1 統計取得（X側）

X API で統計を取得し、`sns_posts` を更新：

```typescript
// 日次バッチで統計更新
async function updatePostStats(env: Env) {
  const supabase = createSupabaseClient(env);
  
  // 過去30日のXポストで、まだ統計が古いものを取得
  const { data: posts } = await supabase
    .from('sns_posts')
    .select('*')
    .eq('platform', 'x')
    .eq('status', 'posted')
    .gte('posted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .or(`last_stats_updated_at.is.null,last_stats_updated_at.lt.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`);
  
  for (const post of posts || []) {
    const stats = await fetchTweetStats(post.platform_post_id, env);
    
    await supabase
      .from('sns_posts')
      .update({
        likes_count: stats.like_count,
        retweets_count: stats.retweet_count,
        replies_count: stats.reply_count,
        views_count: stats.impression_count,
        last_stats_updated_at: new Date().toISOString(),
      })
      .eq('id', post.id);
  }
}
```

### 10.2 ユーザー向けダッシュボード

会員エリア（マイページ）で確認可能：
- 過去30日の投稿数
- 平均エンゲージメント
- ベスト投稿（最もRT・いいねが多い）
- キャラ別パフォーマンス

実装は SPEC-07 で。

---

## 11. 監視・運用

### 11.1 メトリクス

```
- 投稿成功率（X / note 別）
- 平均生成時間
- LLM API のコスト
- トーンガード違反率
- 失敗の原因
- ユーザー別投稿数
```

### 11.2 アラート

- 連続して同じユーザーで投稿失敗 → 認証情報の問題の可能性
- LLM API のエラー率上昇
- X API のレート制限到達

---

## 12. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-06 X/note自動投稿エンジン
- 対象: apps/workers/sns-poster/

[タスク]
SPEC-06 に記載されているSNS自動投稿エンジンを実装してください。

[具体的な要件]
1. SNS Poster Worker（Cloudflare Workers + Hono）
2. データベーススキーマ追加（sns_post_schedules, sns_posts, sns_credentials）
3. Cron による定期実行
4. X API v2 連携（OAuth 2.0 + PKCE）
5. note の Option B 実装（記事生成 → Bot送信）
6. キャラクター別トーン制御
7. 重複検知
8. 統計更新バッチ

[出力形式]
- 全ソースコード
- マイグレーションファイル
- README.md

[禁止事項]
- 仕様書から逸脱しない
- アクセストークンを暗号化なしで保存しない
- note 自動投稿は Option B（手動投稿）を採用
```

---

## 13. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-06**

次のドキュメント: SPEC-07 LP・購入フロー
