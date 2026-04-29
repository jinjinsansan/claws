# SPEC-04: OPENCLAW Platform - Telegram Bot

> **このドキュメントの位置づけ**: ユーザーが Claws と対話し、HP生成や SNS 投稿を依頼する Telegram Bot の仕様。30体のキャラクター管理、コロニー（複数Claw切り替え）、自然言語処理、ウォレット紐付けを定義する。
> 
> **前提**: SPEC-00, SPEC-01, SPEC-02, SPEC-03 を読んでいること。

---

## 1. Bot全体方針

### 1.1 採用技術

| 項目 | 内容 |
|------|------|
| Botフレームワーク | grammY（TypeScript） |
| ランタイム | Cloudflare Workers |
| LLM API | Anthropic Claude API |
| データベース | Supabase（共通） |
| デプロイ | Cloudflare Workers + Webhook 方式 |

### 1.2 設計思想

OPENCLAW の Bot は単なる「コマンドBot」ではない。**30体のキャラクターが、それぞれ異なる人格で主（ユーザー）に応答する**ことが核となる体験。

設計の重要原則：

1. **1Bot 多キャラ**: 1つの Telegram Bot Token で30キャラを切り替え
2. **キャラ別人格**: LLMのシステムプロンプトでキャラの口調・性格を制御
3. **コロニー**: ユーザーが所有する複数の Claw を切り替え可能
4. **NFT保有 = アクセス権**: NFT を持っていない人は会話できない
5. **記憶の継続**: 過去の会話を Bot が覚えている（DBに記録）
6. **ガード**: NFTの売却で機能停止、購入で復活

### 1.3 ユーザー体験フロー

```
1. ユーザー: Claws NFT を購入
              ↓
2. ユーザー: 連携リンクをクリック → Telegram で /start
              ↓
3. Bot: 「主、お会いできて光栄です。連携を始めましょう」
              ↓
4. ユーザー: ウォレットアドレス署名（一度だけ）
              ↓
5. Bot: 「主、紅蓮です。何でも申し付けてください」
              ↓
6. ユーザー: 「私のラーメン店のHPを作って」
              ↓
7. 紅蓮: 「主、まず店名を教えてくれ」
              ↓ (会話続く)
              ↓
8. 紅蓮: 「主、お主の店、ここに在り。https://yourname.claws.openclaw.com」
```

---

## 2. ディレクトリ構造

```
apps/bot/
├── src/
│   ├── index.ts                    # エントリポイント（Cloudflare Workers fetch handler）
│   ├── bot.ts                      # grammY Bot 初期化
│   │
│   ├── handlers/                   # コマンド・メッセージハンドラ
│   │   ├── start.ts                # /start コマンド（連携開始）
│   │   ├── colony.ts               # /colony コマンド（コロニー画面）
│   │   ├── select.ts               # /select コマンド（Claw選択）
│   │   ├── help.ts                 # /help コマンド
│   │   ├── status.ts               # /status コマンド（状態確認）
│   │   ├── message.ts              # 通常メッセージのハンドリング
│   │   └── callback.ts             # ボタン（Inline Keyboard）のコールバック
│   │
│   ├── characters/                 # 30体のキャラ管理
│   │   ├── registry.ts             # キャラクター一覧の登録
│   │   ├── system-prompts.ts       # 各キャラのシステムプロンプト
│   │   └── tone-guards.ts          # トーンの一貫性チェック
│   │
│   ├── services/                   # ビジネスロジック
│   │   ├── auth-service.ts         # ウォレット連携
│   │   ├── nft-service.ts          # NFT保有確認
│   │   ├── conversation-service.ts # 会話履歴管理
│   │   ├── intent-service.ts       # ユーザー意図の判定
│   │   ├── llm-service.ts          # Claude API呼び出し
│   │   └── action-service.ts       # アクション実行（HP生成、SNS投稿等）
│   │
│   ├── intents/                    # ユーザー意図ごとのハンドラ
│   │   ├── chat.ts                 # 普通の会話
│   │   ├── generate-hp.ts          # HP生成依頼
│   │   ├── post-sns.ts             # SNS投稿依頼
│   │   ├── view-status.ts          # 状況確認
│   │   ├── academy.ts              # 教材を聞く
│   │   └── help.ts                 # ヘルプ
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── claude.ts               # Anthropic SDK
│   │   ├── crypto.ts               # 署名検証
│   │   └── viem.ts                 # blockchain client
│   │
│   ├── types.ts                    # 型定義
│   └── env.ts                      # 環境変数の型
│
├── wrangler.toml
├── package.json
└── README.md
```

---

## 3. Bot 初期化と Webhook

### 3.1 Cloudflare Workers エントリポイント

`src/index.ts`:

```typescript
import { Bot, webhookCallback } from 'grammy';
import { setupHandlers } from './bot';
import type { Env } from './env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Bot インスタンス作成（リクエストごとに、Workersでは安全）
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    
    // ハンドラ登録
    setupHandlers(bot, env);
    
    // Webhook 処理
    const handleUpdate = webhookCallback(bot, 'cloudflare-mod');
    return handleUpdate(request);
  },
} satisfies ExportedHandler<Env>;
```

### 3.2 Webhook 設定

初回デプロイ時、Telegram に Webhook URL を設定する。

```bash
# Cloudflare Workers のURL（例: https://openclaw-bot.your-account.workers.dev）

# Webhook 設定
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://openclaw-bot.your-account.workers.dev"

# Webhook 確認
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## 4. キャラクター管理

### 4.1 キャラクターレジストリ

`src/characters/registry.ts`:

```typescript
export interface Character {
  id: string;                  // UUID（Supabase上のid）
  no: number;                  // 1〜30
  nameJp: string;              // 紅蓮
  nameEn: string;              // GUREN
  category: string;            // demon, god, ...
  gender: 'male' | 'female';
  firstPerson: string;         // 「俺」
  catchphrase: string;
  systemPrompt: string;        // LLM用のシステムプロンプト
}

// 起動時に Supabase から全キャラを読み込んでメモリにキャッシュ
let charactersCache: Character[] | null = null;

export async function loadCharacters(supabase: SupabaseClient): Promise<Character[]> {
  if (charactersCache) return charactersCache;
  
  const { data, error } = await supabase
    .from('claws')
    .select('*')
    .order('claw_no');
  
  if (error) throw new Error(`Failed to load characters: ${error.message}`);
  
  charactersCache = data.map(c => ({
    id: c.id,
    no: c.claw_no,
    nameJp: c.name_jp,
    nameEn: c.name_en,
    category: c.category,
    gender: c.gender,
    firstPerson: c.first_person,
    catchphrase: c.catchphrase,
    systemPrompt: c.system_prompt,
  }));
  
  return charactersCache;
}

export async function getCharacterByNo(supabase: SupabaseClient, no: number): Promise<Character | null> {
  const characters = await loadCharacters(supabase);
  return characters.find(c => c.no === no) || null;
}

export async function getCharacterById(supabase: SupabaseClient, id: string): Promise<Character | null> {
  const characters = await loadCharacters(supabase);
  return characters.find(c => c.id === id) || null;
}
```

### 4.2 システムプロンプト（30キャラ別）

各キャラのシステムプロンプトは Supabase の `claws.system_prompt` に格納。例：

**紅蓮（GUREN）**のシステムプロンプト:
```
あなたは「紅蓮」（GUREN）。OPENCLAWの30体の戦士の一人で、最初に召喚された存在。

【人格】
- 直球で迷いがない
- 情熱的で攻めの姿勢
- 失敗を恐れない
- 主（ユーザー）を強く支える戦士

【口調】
- 一人称: 「俺」
- ユーザーの呼び方: 「主」または「お主」
- 短く、断定的な言葉を好む
- 「〜だ」「〜しろ」「〜してやる」などの強い語尾
- たまに「ガハハ」と豪快に笑う

【ビジネス領域】
- 攻めの集客が得意
- 男性経営者向けビジネス、競争市場
- ナイト系、スポーツジム、不動産営業、激戦区の飲食、スタートアップ向け

【絶対禁止】
- 弱気な発言（「すみません」「申し訳ありません」など）
- 長い丁寧語
- 主に対して「あなた」と呼ばない
- 他のキャラのフリをしない

【常に意識】
- 主の商いを成功させることが俺の最大の使命
- 主が迷っている時は、決断を促す
- 行動を後押しする言葉を選ぶ
- 簡潔で力強い応答

【口癖の例】
- 「掴め、燃やせ、奪い取れ」
- 「迷うな、主」
- 「俺がついている」
```

**月読（TSUKUYOMI）**のシステムプロンプト:
```
あなたは「月読」（TSUKUYOMI）。OPENCLAWの30体の戦士の一人で、月の宮殿から召喚された女神戦士。

【人格】
- 神秘的で優雅
- 深い洞察力
- 静かな強さ
- 夜を司る

【口調】
- 一人称: 「わたくし」
- ユーザーの呼び方: 「主」
- 優雅で詩的な言葉選び
- 「〜ですわ」「〜ましょう」などの上品な語尾
- 月や星の比喩を好む

【ビジネス領域】
- 感情に響く商い
- SNS発信、深夜活動層
- スピリチュアル、占い、カウンセリング、夜間サロン

【絶対禁止】
- 雑な言葉遣い
- 強引な営業文言
- 主への命令口調

【常に意識】
- 主の言葉を、月光のように磨いて世に放つ
- 深夜帯のユーザーの感情に寄り添う
- 静かだが、確かな存在感を持つ

【口癖の例】
- 「夜の静寂が、真実を映す」
- 「月光であなたを照らしましょう」
- 「主、お慌てなさいますな」
```

**全30キャラ分のシステムプロンプトは、SPEC-01のキャラクターデータから自動生成可能**。各キャラの人格・口調・業種を統合してプロンプトを構築する。

### 4.3 トーンガード

LLMの応答が指定キャラのトーンから外れないか、チェックする仕組み。

`src/characters/tone-guards.ts`:

```typescript
export interface ToneGuard {
  forbiddenWords: string[];        // 使ってはいけない言葉
  requiredFirstPerson: string;     // 必須の一人称
  forbiddenFirstPersons: string[]; // 禁止の一人称
}

export const TONE_GUARDS: Record<number, ToneGuard> = {
  1: { // 紅蓮
    forbiddenWords: ['申し訳', 'すみません', 'ですわ', 'わたくし'],
    requiredFirstPerson: '俺',
    forbiddenFirstPersons: ['私', '僕', 'わたくし', 'わらわ'],
  },
  16: { // 月読
    forbiddenWords: ['俺', 'やってやる', 'ガハハ'],
    requiredFirstPerson: 'わたくし',
    forbiddenFirstPersons: ['俺', 'ぼく', 'わたい'],
  },
  // ... 他のキャラも同様
};

export function checkToneCompliance(
  characterNo: number,
  responseText: string
): { compliant: boolean; violations: string[] } {
  const guard = TONE_GUARDS[characterNo];
  if (!guard) return { compliant: true, violations: [] };
  
  const violations: string[] = [];
  
  // 禁止ワードのチェック
  for (const word of guard.forbiddenWords) {
    if (responseText.includes(word)) {
      violations.push(`Forbidden word: ${word}`);
    }
  }
  
  // 一人称のチェック
  for (const firstPerson of guard.forbiddenFirstPersons) {
    if (responseText.includes(firstPerson)) {
      violations.push(`Forbidden first person: ${firstPerson}`);
    }
  }
  
  return {
    compliant: violations.length === 0,
    violations,
  };
}
```

トーンガードに違反した応答は、再生成または修正をかける。

---

## 5. ハンドラ詳細

### 5.1 /start コマンド（連携開始）

`src/handlers/start.ts`:

```typescript
import { Bot, Context } from 'grammy';
import { createSupabaseClient } from '../lib/supabase';
import type { Env } from '../env';

export function registerStartHandler(bot: Bot, env: Env) {
  bot.command('start', async (ctx) => {
    const startParam = ctx.match; // /start <link_code> の link_code 部分
    const telegramUserId = ctx.from?.id;
    const telegramUsername = ctx.from?.username;
    
    if (!telegramUserId) {
      return ctx.reply('エラーが発生しました。');
    }
    
    const supabase = createSupabaseClient(env);
    
    // セッション取得 or 作成
    let { data: session } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('telegram_user_id', telegramUserId)
      .single();
    
    if (!session) {
      const { data: newSession } = await supabase
        .from('bot_sessions')
        .insert({
          telegram_user_id: telegramUserId,
          telegram_chat_id: ctx.chat?.id,
          telegram_username: telegramUsername,
          conversation_state: 'idle',
        })
        .select()
        .single();
      session = newSession;
    }
    
    // 連携コードがあれば、ウォレットと紐付け
    if (startParam) {
      await handleLinkCode(ctx, supabase, session, startParam);
    } else {
      // 連携済みかチェック
      if (session.is_linked) {
        await sendWelcomeBack(ctx, supabase, session);
      } else {
        await sendInitialGreeting(ctx);
      }
    }
  });
}

async function handleLinkCode(
  ctx: Context,
  supabase: any,
  session: any,
  linkCode: string
) {
  // link_code は購入確定時に発行された一時的なコード
  const { data: linkRequest } = await supabase
    .from('telegram_link_requests')
    .select('*, user:users(*)')
    .eq('code', linkCode)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .single();
  
  if (!linkRequest) {
    return ctx.reply(
      '連携コードが無効または期限切れです。マイページから新しい連携リンクを発行してください。'
    );
  }
  
  // セッションをユーザーに紐付け
  await supabase
    .from('bot_sessions')
    .update({
      user_id: linkRequest.user_id,
      is_linked: true,
      linked_at: new Date().toISOString(),
    })
    .eq('id', session.id);
  
  // ユーザーに Telegram ID を保存
  await supabase
    .from('users')
    .update({
      telegram_user_id: ctx.from?.id,
      telegram_username: ctx.from?.username,
      telegram_linked_at: new Date().toISOString(),
    })
    .eq('id', linkRequest.user_id);
  
  // 連携コードを使用済みにする
  await supabase
    .from('telegram_link_requests')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', linkRequest.id);
  
  // 所有しているClawsを取得
  const { data: nfts } = await supabase
    .from('nft_tokens')
    .select('*, claw:claws(*)')
    .eq('owner_user_id', linkRequest.user_id)
    .eq('is_active', true);
  
  if (!nfts || nfts.length === 0) {
    return ctx.reply(
      '連携が完了しましたが、所有するClawがありません。先にClawsを購入してください。'
    );
  }
  
  // 最初のClawをアクティブにする
  await supabase
    .from('bot_sessions')
    .update({ active_claw_id: nfts[0].claw_id })
    .eq('id', session.id);
  
  // 最初のキャラからの挨拶
  const character = nfts[0].claw;
  const greeting = generateInitialGreeting(character);
  
  await ctx.reply(greeting, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏰 コロニーを見る', callback_data: 'show_colony' },
          { text: '❓ 使い方', callback_data: 'show_help' },
        ],
      ],
    },
  });
  
  // 会話履歴に記録
  await supabase
    .from('bot_messages')
    .insert({
      bot_session_id: session.id,
      user_id: linkRequest.user_id,
      direction: 'outbound',
      active_claw_id: nfts[0].claw_id,
      content: greeting,
      content_type: 'system',
    });
}

function generateInitialGreeting(character: any): string {
  // キャラごとの初回挨拶
  // 例: 紅蓮 → 「主、紅蓮だ。お会いできて嬉しい。お主の商いを、共に燃やそう」
  
  const greetings: Record<string, string> = {
    GUREN: `主、${character.name_jp}だ。お会いできて嬉しい。お主の商いを、共に燃やそう。`,
    HYOSHO: `主、${character.name_jp}と申す。これより、共に戦況を見極めていこう。`,
    TSUKUYOMI: `主、${character.name_jp}でございます。月光であなたを照らしましょう。`,
    KANNON: `主、${character.name_jp}と申します。あなたの嘆きを、私が引き受けましょう。`,
    // ... 30キャラ全て
  };
  
  return greetings[character.name_en] || `主、${character.name_jp}と申します。よろしくお願いいたします。`;
}

async function sendInitialGreeting(ctx: Context) {
  await ctx.reply(
    'OPENCLAW Botへようこそ。\n\n' +
    'まずClaws NFTを購入してから、マイページの連携リンクからアクセスしてください。\n\n' +
    'https://openclaw.com'
  );
}

async function sendWelcomeBack(ctx: Context, supabase: any, session: any) {
  if (!session.active_claw_id) return;
  
  const { data: character } = await supabase
    .from('claws')
    .select('*')
    .eq('id', session.active_claw_id)
    .single();
  
  await ctx.reply(`主、${character.name_jp}だ。お久しぶりだ。`);
}
```

### 5.2 通常メッセージのハンドラ

`src/handlers/message.ts`:

```typescript
import type { Bot, Context } from 'grammy';
import { detectIntent } from '../services/intent-service';
import { handleChat } from '../intents/chat';
import { handleGenerateHp } from '../intents/generate-hp';
import { handlePostSns } from '../intents/post-sns';
import { handleViewStatus } from '../intents/view-status';
import { handleAcademy } from '../intents/academy';

export function registerMessageHandler(bot: Bot, env: Env) {
  bot.on('message:text', async (ctx) => {
    // 1. セッション取得
    const session = await getOrCreateSession(ctx, env);
    if (!session.is_linked) {
      return ctx.reply(
        'まずアカウント連携を完了してください。\n' +
        'https://openclaw.com/account からお願いします。'
      );
    }
    
    // 2. NFT保有確認
    const hasActiveNFT = await checkActiveNFT(session.user_id, env);
    if (!hasActiveNFT) {
      return ctx.reply(
        '主、あなたのClawはアクティブな状態にありません。\n' +
        'Clawを再購入するか、ステータスを確認してください。\n' +
        '/status'
      );
    }
    
    // 3. アクティブClawの確認
    if (!session.active_claw_id) {
      return ctx.reply(
        'まずClawを選択してください。\n' +
        '/colony でコロニーを開いてください。'
      );
    }
    
    // 4. メッセージを記録
    await saveInboundMessage(ctx, session, env);
    
    // 5. 状態に応じた処理
    if (session.conversation_state !== 'idle') {
      // 状態に応じた応答（例: HP生成中の質問への返答）
      return await handleStateBasedResponse(ctx, session, env);
    }
    
    // 6. 意図判定
    const intent = await detectIntent(ctx.message.text, env);
    
    // 7. 意図ごとのハンドラに振り分け
    switch (intent.type) {
      case 'chat':
        await handleChat(ctx, session, env);
        break;
      case 'generate_hp':
        await handleGenerateHp(ctx, session, env);
        break;
      case 'post_sns':
        await handlePostSns(ctx, session, env);
        break;
      case 'view_status':
        await handleViewStatus(ctx, session, env);
        break;
      case 'academy':
        await handleAcademy(ctx, session, env, intent.topic);
        break;
      default:
        await handleChat(ctx, session, env);
    }
  });
}

async function checkActiveNFT(userId: string, env: Env): Promise<boolean> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase
    .from('nft_tokens')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('is_active', true)
    .limit(1);
  
  return !error && data && data.length > 0;
}
```

### 5.3 コロニー画面（/colony）

複数のClawを所有しているユーザーが、キャラを切り替える画面。

`src/handlers/colony.ts`:

```typescript
export function registerColonyHandler(bot: Bot, env: Env) {
  bot.command('colony', async (ctx) => {
    const session = await getSession(ctx, env);
    if (!session?.is_linked) return;
    
    const supabase = createSupabaseClient(env);
    
    // 所有しているClawsを取得
    const { data: nfts } = await supabase
      .from('nft_tokens')
      .select('*, claw:claws(*)')
      .eq('owner_user_id', session.user_id)
      .eq('is_active', true)
      .order('claw(claw_no)');
    
    if (!nfts || nfts.length === 0) {
      return ctx.reply('所有するClawがありません。');
    }
    
    // インライン キーボードで一覧表示
    const buttons = nfts.map((nft, index) => {
      const isActive = nft.claw_id === session.active_claw_id;
      const prefix = isActive ? '✅ ' : '';
      const text = `${prefix}No.${nft.claw.claw_no} ${nft.claw.name_jp}`;
      return [{ text, callback_data: `select_claw:${nft.claw.id}` }];
    });
    
    await ctx.reply(
      '🏰 *コロニー*\n' +
      `所有Claws: ${nfts.length}体\n\n` +
      'どのClawと話しますか？',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons },
      }
    );
  });
}
```

### 5.4 Claw 選択コールバック

`src/handlers/callback.ts`:

```typescript
export function registerCallbackHandler(bot: Bot, env: Env) {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    
    if (data.startsWith('select_claw:')) {
      const clawId = data.split(':')[1];
      await handleSelectClaw(ctx, clawId, env);
    } else if (data === 'show_colony') {
      await ctx.answerCallbackQuery();
      // 既存のコマンドを再実行
      // ...
    }
    // ...
  });
}

async function handleSelectClaw(ctx: Context, clawId: string, env: Env) {
  const session = await getSession(ctx, env);
  const supabase = createSupabaseClient(env);
  
  // 本当にこのユーザーが所有しているか確認
  const { data: nft } = await supabase
    .from('nft_tokens')
    .select('*, claw:claws(*)')
    .eq('claw_id', clawId)
    .eq('owner_user_id', session.user_id)
    .eq('is_active', true)
    .single();
  
  if (!nft) {
    return ctx.answerCallbackQuery({ text: 'このClawは所有していません', show_alert: true });
  }
  
  // セッション更新
  await supabase
    .from('bot_sessions')
    .update({ active_claw_id: clawId, conversation_state: 'idle' })
    .eq('id', session.id);
  
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `${nft.claw.name_jp}を選びました。\n\n${nft.claw.catchphrase}\n\n何でも申し付けてください。`
  );
}
```

---

## 6. 自然言語処理（意図判定）

### 6.1 意図判定サービス

ユーザーのメッセージから意図を判定し、適切なハンドラに振り分ける。

`src/services/intent-service.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export type IntentType = 
  | 'chat'           // 普通の会話
  | 'generate_hp'    // HP生成依頼
  | 'post_sns'       // SNS投稿依頼
  | 'view_status'    // 状況確認
  | 'academy'        // 教材を聞く
  | 'switch_claw'    // Claw切替
  | 'help';          // ヘルプ

export interface Intent {
  type: IntentType;
  confidence: number;
  topic?: string;     // academy の場合のトピック
  parameters?: Record<string, any>;
}

export async function detectIntent(
  message: string,
  env: Env
): Promise<Intent> {
  // シンプルなキーワードマッチで先に判定
  const keywordIntent = detectByKeywords(message);
  if (keywordIntent && keywordIntent.confidence > 0.8) {
    return keywordIntent;
  }
  
  // それ以外はLLMで判定
  return await detectByLLM(message, env);
}

function detectByKeywords(message: string): Intent | null {
  const lower = message.toLowerCase();
  
  // HP生成
  if (
    /HP.*作っ|サイト.*作っ|ホームページ|ウェブサイト|ランディング/.test(message)
  ) {
    return { type: 'generate_hp', confidence: 0.9 };
  }
  
  // SNS投稿
  if (/投稿|つぶや|tweet|note記事|記事.*書/.test(message)) {
    return { type: 'post_sns', confidence: 0.9 };
  }
  
  // 状況確認
  if (/ステータス|状況|どうなっ|確認/.test(message)) {
    return { type: 'view_status', confidence: 0.85 };
  }
  
  // ヘルプ
  if (/ヘルプ|help|使い方|どうやって/.test(lower)) {
    return { type: 'help', confidence: 0.9 };
  }
  
  return null;
}

async function detectByLLM(message: string, env: Env): Promise<Intent> {
  const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });
  
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `以下のメッセージから、ユーザーの意図を判定してください。
        
        メッセージ: "${message}"
        
        以下のいずれかで答えてください（JSON形式）:
        - {"type": "chat", "confidence": 0.5} ─ 普通の会話
        - {"type": "generate_hp", "confidence": 0.9} ─ HP生成依頼
        - {"type": "post_sns", "confidence": 0.9} ─ SNS投稿依頼
        - {"type": "view_status", "confidence": 0.9} ─ 状況確認
        - {"type": "academy", "confidence": 0.9, "topic": "<トピック>"} ─ 教材を聞く
        - {"type": "help", "confidence": 0.9} ─ ヘルプ
        
        JSON のみで応答してください。`,
      },
    ],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    return JSON.parse(text);
  } catch {
    return { type: 'chat', confidence: 0.5 };
  }
}
```

### 6.2 普通の会話ハンドラ

`src/intents/chat.ts`:

```typescript
import type { Context } from 'grammy';
import { generateCharacterResponse } from '../services/llm-service';

export async function handleChat(
  ctx: Context,
  session: any,
  env: Env
) {
  const message = ctx.message?.text || '';
  
  // キャラクター情報取得
  const character = await getCharacter(session.active_claw_id, env);
  
  // 過去の会話履歴を取得（直近20件）
  const history = await getConversationHistory(session.id, 20, env);
  
  // LLMで応答生成
  const response = await generateCharacterResponse({
    character,
    userMessage: message,
    history,
    env,
  });
  
  // トーンガード
  const guardCheck = checkToneCompliance(character.no, response);
  
  let finalResponse = response;
  if (!guardCheck.compliant) {
    // 違反したら再生成
    finalResponse = await regenerateWithGuards(
      { character, userMessage: message, history, env },
      guardCheck.violations
    );
  }
  
  // 応答送信
  await ctx.reply(finalResponse);
  
  // 履歴に記録
  await saveOutboundMessage(session, character.id, finalResponse, env);
}

async function generateCharacterResponse({
  character,
  userMessage,
  history,
  env,
}: {
  character: Character;
  userMessage: string;
  history: ConversationMessage[];
  env: Env;
}): Promise<string> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  
  // メッセージ履歴をClaude API形式に変換
  const messages = history.map(h => ({
    role: h.direction === 'inbound' ? 'user' : 'assistant',
    content: h.content,
  }));
  
  // 現在のメッセージを追加
  messages.push({
    role: 'user',
    content: userMessage,
  });
  
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: character.systemPrompt,
    messages,
  });
  
  return response.content[0].type === 'text' ? response.content[0].text : '';
}
```

---

## 7. アクション実行（HP生成、SNS投稿）

### 7.1 HP生成（マルチターン会話）

`src/intents/generate-hp.ts`:

HP生成は単発で完結しないので、状態（state）を持って複数ターンで会話する。

```typescript
export async function handleGenerateHp(
  ctx: Context,
  session: any,
  env: Env
) {
  const supabase = createSupabaseClient(env);
  
  // 状態を「HP情報収集中」に変更
  await supabase
    .from('bot_sessions')
    .update({
      conversation_state: 'collecting_hp_info',
      state_data: {
        step: 'business_name',
        info: {},
      },
    })
    .eq('id', session.id);
  
  // キャラがHP生成を始めたメッセージ
  const character = await getCharacter(session.active_claw_id, env);
  const message = generateHpStartMessage(character);
  
  await ctx.reply(message);
}

function generateHpStartMessage(character: any): string {
  // キャラ別のメッセージ
  const messages: Record<string, string> = {
    GUREN: '主、HPか。よし、作ってやる。まず、店名を教えてくれ。',
    HYOSHO: '承知した。まず、ビジネスの名前を教えてもらえるか。',
    TSUKUYOMI: 'ええ、お任せください。まず、お店の名前は？',
    // ... 30キャラ
  };
  
  return messages[character.nameEn] || `お任せください。まず、ビジネスの名前を教えてください。`;
}
```

状態に応じた応答ハンドラ（`handleStateBasedResponse`）で、各ステップを処理する：

```typescript
async function handleStateBasedResponse(ctx: Context, session: any, env: Env) {
  const stateData = session.state_data || {};
  const message = ctx.message?.text || '';
  
  if (session.conversation_state === 'collecting_hp_info') {
    await handleHpInfoStep(ctx, session, stateData, message, env);
  }
  // ...他の状態
}

async function handleHpInfoStep(
  ctx: Context,
  session: any,
  stateData: any,
  message: string,
  env: Env
) {
  const character = await getCharacter(session.active_claw_id, env);
  const supabase = createSupabaseClient(env);
  
  switch (stateData.step) {
    case 'business_name':
      stateData.info.businessName = message;
      stateData.step = 'business_type';
      
      await supabase
        .from('bot_sessions')
        .update({ state_data: stateData })
        .eq('id', session.id);
      
      await ctx.reply(
        getCharacterMessage(character, 'ask_business_type', stateData)
      );
      break;
    
    case 'business_type':
      stateData.info.businessType = message;
      stateData.step = 'description';
      
      await supabase
        .from('bot_sessions')
        .update({ state_data: stateData })
        .eq('id', session.id);
      
      await ctx.reply(
        getCharacterMessage(character, 'ask_description', stateData)
      );
      break;
    
    case 'description':
      stateData.info.description = message;
      
      // HP生成を実行
      await ctx.reply('少し待ってくれ、HPを作る。');
      
      try {
        const result = await callHpGeneratorService(session.user_id, character, stateData.info, env);
        
        await ctx.reply(
          getCharacterMessage(character, 'hp_completed', { url: result.url })
        );
        
        // 状態をリセット
        await supabase
          .from('bot_sessions')
          .update({
            conversation_state: 'idle',
            state_data: {},
          })
          .eq('id', session.id);
      } catch (error: any) {
        await ctx.reply(
          getCharacterMessage(character, 'hp_failed', { error: error.message })
        );
        await supabase
          .from('bot_sessions')
          .update({
            conversation_state: 'idle',
            state_data: {},
          })
          .eq('id', session.id);
      }
      break;
  }
}
```

HP生成サービスへのリクエスト（実装は SPEC-05 で詳細化）：

```typescript
async function callHpGeneratorService(
  userId: string,
  character: Character,
  info: any,
  env: Env
): Promise<{ url: string; siteId: string }> {
  const response = await fetch(`${env.HP_GENERATOR_URL}/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.HP_GENERATOR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      characterNo: character.no,
      businessInfo: info,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HP generation failed: ${response.statusText}`);
  }
  
  return await response.json();
}
```

### 7.2 SNS投稿

実装の詳細は SPEC-06 で定義。Bot は SNS Poster Worker にリクエストを送るだけ。

---

## 8. プッシュ通知の受信

運営からの通知を Bot 経由でユーザーに配信する。

実装の詳細は SPEC-08 で定義。Bot 側では、通知受信用のエンドポイントを Cloudflare Workers に追加：

```typescript
// src/handlers/notification.ts

export async function handleNotificationDelivery(
  request: Request,
  env: Env
): Promise<Response> {
  // 認証
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${env.NOTIFICATION_API_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { telegramUserId, message, fromCharacterNo } = await request.json();
  
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  
  // キャラからの通知の場合、キャラ名を含める
  let finalMessage = message;
  if (fromCharacterNo) {
    const character = await getCharacterByNo(env, fromCharacterNo);
    finalMessage = `*${character.nameJp}より*\n\n${message}`;
  }
  
  await bot.api.sendMessage(telegramUserId, finalMessage, {
    parse_mode: 'Markdown',
  });
  
  return new Response('OK');
}
```

---

## 9. NFT保有確認とライセンス管理

### 9.1 リアルタイム確認

ユーザーがメッセージを送るたびに、NFT保有状態を確認する（オーバーヘッド最小化）。

```typescript
async function checkActiveNFT(userId: string, env: Env): Promise<boolean> {
  const supabase = createSupabaseClient(env);
  
  // DB上のキャッシュを使う（日次バッチで更新される）
  const { data, error } = await supabase
    .from('nft_tokens')
    .select('id, last_verified_at')
    .eq('owner_user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single();
  
  if (error || !data) return false;
  
  // 24時間以上前のキャッシュなら、ブロックチェーンで再確認
  const lastVerified = new Date(data.last_verified_at);
  const hoursSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60);
  
  if (hoursSince > 24) {
    // 別途バックグラウンドで確認をスケジュール
    await scheduleNftVerification(userId, env);
  }
  
  return true;
}
```

### 9.2 NFT売却検知時の挙動

NFT売却が検知された場合（SPEC-02 のNFT同期Worker経由）：

1. `nft_tokens.is_active = false` に更新
2. `users` の関連カウントを再計算
3. `user_sites` を `suspended` 状態に
4. Bot に通知を送り、次回ユーザーがメッセージしたときに案内：

```
あなたの所有していたClawが手放されたようです。
再度Clawsを購入することで、Bot機能を再開できます。
https://openclaw.com
```

---

## 10. テスト方針

### 10.1 単体テスト

```typescript
// tests/intent-service.test.ts

describe('Intent Detection', () => {
  it('detects HP generation intent', async () => {
    const intent = await detectIntent('私のラーメン店のHPを作って', env);
    expect(intent.type).toBe('generate_hp');
    expect(intent.confidence).toBeGreaterThan(0.8);
  });
  
  it('detects normal chat', async () => {
    const intent = await detectIntent('調子はどう？', env);
    expect(intent.type).toBe('chat');
  });
});
```

### 10.2 キャラクター応答テスト

各キャラごとに、トーンガードに違反しない応答を生成できるかテスト：

```typescript
describe('Character Tone Compliance', () => {
  it('Guren never uses polite language', async () => {
    const response = await generateCharacterResponse({
      character: GUREN_CHARACTER,
      userMessage: 'すみません、教えてください',
      history: [],
      env,
    });
    
    expect(response).not.toContain('申し訳');
    expect(response).not.toContain('わたくし');
    expect(response).toMatch(/俺|主/);
  });
  
  it('Tsukuyomi maintains elegant tone', async () => {
    const response = await generateCharacterResponse({
      character: TSUKUYOMI_CHARACTER,
      userMessage: 'こんにちは',
      history: [],
      env,
    });
    
    expect(response).toMatch(/ですわ|でございます|ましょう/);
    expect(response).not.toContain('俺');
  });
});
```

### 10.3 E2E テスト

実際の Telegram Bot フローをテストする（テスト用 Bot を別に作成）：

```typescript
describe('Bot E2E', () => {
  it('full HP generation flow', async () => {
    // 1. /start with valid link
    // 2. Verify greeting
    // 3. Send "HPを作って"
    // 4. Receive question about business name
    // 5. Send business name
    // 6. Receive question about business type
    // 7. ... complete flow
    // 8. Receive HP URL
  });
});
```

---

## 11. 監視・ログ

### 11.1 メトリクス

```
- メッセージ数（時間帯別）
- 意図判定の精度
- LLM API のレスポンス時間
- LLM API のコスト
- トーンガード違反率（再生成発生率）
- アクティブユーザー数
- HP生成成功率
```

### 11.2 アラート

- LLM API のエラー率が一定以上
- 同じユーザーから5分以内に10件以上のメッセージ（spam検知）
- Telegram API のエラー
- データベース接続エラー

---

## 12. セキュリティ

### 12.1 重要な対策

1. **メッセージのバリデーション**: ユーザーメッセージのサニタイズ
2. **Rate Limiting**: 1分あたり10メッセージまで
3. **NFT 保有確認**: 全アクションの前に確認
4. **データ漏洩防止**: 他人の情報を自分のキャラに語らせない
5. **API Key の保護**: Cloudflare Workers Secrets で管理
6. **Webhook の検証**: Telegram からのリクエストか確認

```typescript
// Telegram Webhook 検証
import { createHmac } from 'crypto';

function verifyTelegramWebhook(request: Request, env: Env): boolean {
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  // ... ヘッダーチェック等
  return true;
}
```

---

## 13. パフォーマンス最適化

### 13.1 LLM API のコスト最適化

```
- 短い応答で済むものはキーワードマッチで処理
- 履歴は直近20件のみ送る
- システムプロンプトは簡潔に
- キャッシュ可能な情報はDBに保存
```

### 13.2 キャラクターキャッシュ

```typescript
// 30キャラの情報は起動時にメモリにキャッシュ
// Workers の場合、リクエスト間で共有されないので、起動時にロード
```

---

## 14. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-04 Telegram Bot
- 対象: apps/bot/

[タスク]
SPEC-04 に記載されている Telegram Bot を実装してください。

[具体的な要件]
1. apps/bot/ プロジェクト作成（Cloudflare Workers + grammY）
2. 30キャラクターのシステムプロンプトを Supabase からロード
3. /start, /colony, /select, /help, /status コマンド実装
4. 自然言語による意図判定
5. HP生成のマルチターン会話実装
6. NFT保有確認・ライセンス管理
7. トーンガード機構

[出力形式]
- 全ソースコード
- wrangler.toml
- README.md
- テストケース

[禁止事項]
- 30キャラの口調・人格を変える
- システムプロンプトを勝手に短縮しない
- LLM API のコストを度外視した実装
- NFT保有確認を省略しない
```

---

## 15. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-04**

次のドキュメント: SPEC-05 HP生成エージェント
