# SPEC-09: OPENCLAW Platform - Academy統合

> **このドキュメントの位置づけ**: Dlogic Academy（既存実装）を OPENCLAW Platform に統合するための仕様。Academy 自体の詳細仕様は既存 `https://github.com/jinjinsansan/dlc/blob/main/ai-builders-lab-spec.md` を参照する。本ドキュメントは「統合ポイント」のみを定義する。
> 
> **前提**: SPEC-00〜08 と、既存の `ai-builders-lab-spec.md` `CURRICULUM.md` を読んでいること。

---

## 1. 統合の全体方針

### 1.1 仁さんとの確定事項（再確認）

```
✅ ブランド階層: OPENCLAW Platform > Academy（補足コンテンツ）
✅ MVP1: Academy ページは「準備中」表示
✅ Bot は MVP1 から Academy 教材を「無料で」ユーザーに教える
✅ 仁さんによる Zoom ウェビナー部分のみ「有料」（100人達成後リリース）
✅ 既存リポジトリ（dlc）をコピーして openclaw-platform に改名
```

### 1.2 統合するコンテンツ

既存 Dlogic Academy が持つ資産：

| 資産 | 統合方針 | リリース時期 |
|------|---------|-------------|
| 8週間カリキュラム | Bot が教える教材として使用 | MVP1 |
| フレーズ集 全8巻（約150フレーズ） | Bot が自然に使用 | MVP1 |
| 動画コンテンツ（仁さん収録） | Cloudflare Streamで配信 | MVP2 |
| Zoomウェビナー | 有料受講者のみ | MVP2 (100人達成後) |
| コミュニティ機能 | 既存仕様を流用 | MVP2 |
| 受発注ボード | 既存仕様を流用 | MVP3 |

### 1.3 統合の3レベル

```
Level 1 (MVP1): Bot 経由の教材提供
  - LLM が Academy 教材内容を学習済みで応答
  - フレーズ集を自然に提示
  - ユーザーは無料で受けられる

Level 2 (MVP2): Web上のAcademyリリース
  - 動画コンテンツ
  - Zoomウェビナー予約システム
  - 有料受講者専用エリア

Level 3 (MVP3): コミュニティ・受発注
  - メンバー間交流
  - 仕事のやり取り
```

---

## 2. MVP1: Bot 経由の教材提供

### 2.1 教材データベース

`academy_phrase_collection` テーブルを新設し、フレーズ集を保持：

```sql
CREATE TABLE public.academy_phrase_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 分類
  volume INTEGER NOT NULL,                  -- 1〜8（フレーズ集の巻数）
  category TEXT NOT NULL,                   -- 'install', 'create', 'design', 'function', 'ai', 'deploy', 'monetize', 'marketing'
  
  -- フレーズ
  phrase TEXT NOT NULL,                     -- 「メモ帳アプリを作って」
  result TEXT NOT NULL,                     -- 「テキスト入力・保存ができるアプリが出来る」
  example TEXT,                             -- より詳しい例
  
  -- 関連情報
  related_week INTEGER,                     -- カリキュラムのどの週か（1〜8）
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phrases_volume ON public.academy_phrase_collection(volume);
CREATE INDEX idx_phrases_category ON public.academy_phrase_collection(category);
CREATE INDEX idx_phrases_week ON public.academy_phrase_collection(related_week);
```

### 2.2 シードデータ

既存 `CURRICULUM.md` のフレーズ集（Vol.1〜Vol.8、約150件）をすべてSQLにシード化：

```sql
-- supabase/migrations/20260429_seed_academy_phrases.sql

INSERT INTO public.academy_phrase_collection (volume, category, phrase, result, related_week, difficulty)
VALUES
  -- Vol.1: はじめてのClaude Code
  (1, 'install', 'メモ帳アプリを作って', 'テキスト入力・保存ができるアプリが出来る', 1, 'beginner'),
  (1, 'install', '電卓を作って', '四則演算ができる電卓アプリが出来る', 1, 'beginner'),
  (1, 'install', 'ToDoリストを作って', 'タスクの追加・完了・削除ができるアプリが出来る', 1, 'beginner'),
  (1, 'install', '占いアプリを作って', 'ランダムに占い結果が出るアプリが出来る', 1, 'beginner'),
  (1, 'install', 'タイマーを作って', 'カウントダウンタイマーが出来る', 1, 'beginner'),
  (1, 'install', 'もっとシンプルにして', '画面がすっきりする', 1, 'beginner'),
  (1, 'install', '色を青系に変えて', '配色が変わる', 1, 'beginner'),
  (1, 'install', '日本語にして', '英語の部分が日本語になる', 1, 'beginner'),
  (1, 'install', 'エラーが出た。直して', 'AIがエラーを自動修正する', 1, 'beginner'),
  (1, 'install', '前の状態に戻して', '変更がリセットされる', 1, 'beginner'),
  
  -- Vol.2: 日本語だけでWebページを作る
  (2, 'create', 'カフェの紹介サイトを作って', 'ヒーロー画像・メニュー・アクセスのあるサイトが出来る', 2, 'beginner'),
  (2, 'create', 'ページの一番上に大きな見出しを入れて', 'ヒーローセクションが追加される', 2, 'beginner'),
  -- ... 残り全部
;
```

### 2.3 Bot側の Academy 意図ハンドラ

SPEC-04 で定義した `intents/academy.ts` の詳細実装：

```typescript
// apps/bot/src/intents/academy.ts

import type { Context } from 'grammy';
import { generateAcademyResponse } from '../services/academy-service';

export async function handleAcademy(
  ctx: Context,
  session: any,
  env: Env,
  topic?: string
) {
  const supabase = createSupabaseClient(env);
  const character = await getCharacter(session.active_claw_id, env);
  
  // ユーザーのメッセージから、関連するフレーズや教材を検索
  const userMessage = ctx.message?.text || '';
  
  // ベクトル検索（オプション）またはキーワード検索でフレーズを取得
  const relevantPhrases = await searchPhrases(userMessage, env);
  
  // LLM でキャラクターの口調で説明を生成
  const response = await generateAcademyResponse({
    userMessage,
    character,
    relevantPhrases,
    env,
  });
  
  await ctx.reply(response.text);
  
  if (response.relatedTopics.length > 0) {
    await ctx.reply(
      `もっと知りたい内容があれば言ってくれ:\n` +
      response.relatedTopics.map(t => `・${t}`).join('\n')
    );
  }
  
  // 会話履歴に記録
  await saveOutboundMessage(session, character.id, response.text, env);
}

async function searchPhrases(query: string, env: Env): Promise<any[]> {
  const supabase = createSupabaseClient(env);
  
  // シンプルなキーワード検索
  const { data: phrases } = await supabase
    .from('academy_phrase_collection')
    .select('*')
    .or(`phrase.ilike.%${query}%,result.ilike.%${query}%`)
    .limit(5);
  
  return phrases || [];
}

async function generateAcademyResponse({
  userMessage,
  character,
  relevantPhrases,
  env,
}: {
  userMessage: string;
  character: any;
  relevantPhrases: any[];
  env: Env;
}): Promise<{ text: string; relatedTopics: string[] }> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  
  const systemPrompt = character.system_prompt + `

【今回のタスク】
ユーザーは Claude Code を使って自分でWebサービスを作りたいと考えています。
あなたの口調を維持しながら、以下のことを伝えてください：

1. ユーザーの質問に対する回答（Claude Code でできること）
2. 関連するフレーズ集（実際にClaude Codeに言うべき言葉）
3. 関連する追加トピック

【参考データベース】
${JSON.stringify(relevantPhrases, null, 2)}

【出力形式】
JSON形式で:
{
  "text": "あなたの口調で書かれた回答（フレーズ集の内容を含む）",
  "relatedTopics": ["関連トピック1", "関連トピック2"]
}
`;

  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: userMessage,
    }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
}
```

### 2.4 ユーザー体験例

```
ユーザー: 「Webサイトの作り方を教えて」

紅蓮の応答:
「主、簡単だ。Claude Code に向かってこう言え。

『カフェの紹介サイトを作って』

これだけでヒーロー画像・メニュー・アクセス情報のあるサイトが出来る。

主のラーメン店なら：
『ラーメン店の紹介サイトを作って。店名は○○、住所は○○、メニュー一覧を表で表示して』

このように頼めば、欲しいサイトが手に入る。」

(続けて)
「もっと知りたい内容:
・ページを増やす方法
・デザインを変える方法
・スマホ対応
どれでも聞いてくれ。」
```

---

## 3. MVP2: Web上のAcademyリリース

### 3.1 既存仕様の参照

`apps/web/src/app/(marketing)/academy/` および `apps/web/src/app/account/academy/` の実装は、既存 `ai-builders-lab-spec.md` を**そのまま参照**する。

統合のために変更する点のみここで定義。

### 3.2 統合における変更点

#### a. ブランディング統一

```
既存 (Dlogic Academy):
- カラー: 黒・紺 + ゴールド
- ロゴ: Dlogic Academy

OPENCLAW統合後:
- カラー: そのまま使用（既存OPENCLAWと色味も近い）
- ロゴ: OPENCLAW Academy
- 上部に「OPENCLAW Platform」へのリンク
```

#### b. 認証の統合

```
既存 (Dlogic Academy):
- Supabase Auth (Email + Password)
- 独立したアカウント

OPENCLAW統合後:
- 同じ Supabase プロジェクトを使う
- ウォレット署名でログイン可能
- Claws NFT 保有者は Academy にも自動アクセス可（無料部分）
```

#### c. 料金プランの統合

既存料金体系を維持しつつ、Claws オーナー特典を追加：

```
動画のみ: ¥49,800
動画+メールサポート: ¥98,000
Zoom型: ¥150,000
コミュニティ月額: ¥2,980-4,980

【追加: Clawsオーナー特典】
- Bot 経由の教材は無料で利用可（MVP1から）
- Zoom型を購入すると、コミュニティ月額が6ヶ月無料
```

#### d. データベース統合

既存の Dlogic Academy 用テーブルを、OPENCLAW Supabase に統合：

```sql
-- 以下のテーブルを追加（既存 ai-builders-lab-spec.md より）

CREATE TABLE public.academy_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cloudflare_video_id TEXT,
  duration_seconds INTEGER,
  unlocked_at TIMESTAMPTZ,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.academy_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.academy_videos(id) ON DELETE CASCADE,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_watched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE TABLE public.academy_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  plan_required TEXT NOT NULL CHECK (plan_required IN ('free', 'video_only', 'video_email', 'zoom')),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.academy_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  plan TEXT NOT NULL CHECK (plan IN ('video_only', 'video_email', 'zoom', 'community')),
  
  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,                                       -- 月額の場合
  stripe_payment_intent_id TEXT,                                     -- 一括の場合
  
  amount_yen INTEGER NOT NULL,
  
  -- 期間
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,                                                -- 月額の場合は次の更新日
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'failed')),
  cancelled_at TIMESTAMPTZ,
  
  -- メタ
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_academy_subs_user ON public.academy_subscriptions(user_id);
CREATE INDEX idx_academy_subs_status ON public.academy_subscriptions(status);
```

### 3.3 Stripe 決済との統合

```
既存: Stripe で日本円決済
OPENCLAW統合: そのまま維持（NFTはUSDT、AcademyはJPY）

理由:
- Academy は日本人向けで日本円が自然
- 一括払いの場合、Stripe の方が楽
- 月額サブスクも Stripe で管理しやすい
```

### 3.4 Webルーティング

```
既存:
academy.dlogicai.in/
├── /
├── /launch
├── /apply
├── /members/
└── ...

OPENCLAW統合後:
openclaw.com/
├── ...
├── /academy            ← 新設: Academy LP
├── /academy/launch     ← ローンチ動画
├── /academy/apply      ← 申込
└── /account/academy/   ← 受講中エリア（要認証）
    ├── /dashboard
    ├── /videos
    ├── /materials
    └── ...
```

---

## 4. MVP3: コミュニティ・受発注

### 4.1 既存仕様（流用）

`ai-builders-lab-spec.md` の以下のセクションをそのまま実装：

- セクション 9-4: コミュニティ（掲示板）
- セクション 9-6: 受発注ボード

### 4.2 OPENCLAW統合での拡張

#### コミュニティ
```
既存:
- カテゴリ別掲示板
- スレッド・返信・いいね

統合後の追加機能:
- 自分のClawの一覧をプロフィールに表示
- 「このClawがおすすめ」カテゴリ
- メンション時に Bot 通知
```

#### 受発注ボード
```
既存:
- 依頼/受注の投稿
- 検索・フィルター
- 応募ボタン

統合後の追加機能:
- 依頼ジャンルにキャラクター連携
  例:「集客HPの依頼」→ 紅蓮、商太、観音などのキャラを「マッチした人」として推薦
- 取引完了時の評価制度
- 仁さん（運営）への直接依頼ボタン（既存仕様）
```

---

## 5. 既存リポジトリのコード移行

### 5.1 移行手順

```bash
# 1. 既存 dlc リポジトリをコピー
cd ~
git clone https://github.com/jinjinsansan/dlc openclaw-platform
cd openclaw-platform
rm -rf .git
git init

# 2. ディレクトリ整理
# 既存 src/ → apps/web/src/ に移動
mkdir -p apps/web
mv src apps/web/
mv next.config.mjs tsconfig.json tailwind.config.ts package.json package-lock.json apps/web/

# 3. モノレポ化
# pnpm + Turborepo セットアップ（SPEC-00 の構造に合わせる）

# 4. ブランディング変更
# - Dlogic Academy → OPENCLAW Academy
# - ロゴ・カラー調整（基本そのまま）

# 5. 新機能のスケルトン作成
mkdir -p apps/contracts apps/bot apps/workers/{hp-generator,sns-poster,reward-calculator,push-notification}
mkdir -p packages/{shared,db,characters}
```

### 5.2 既存コード活用ポイント

```
活用するもの:
✅ Next.js プロジェクト構造
✅ Tailwind 設定
✅ 既存LPデザイン（流用）
✅ 既存DBスキーマ（拡張する形）
✅ Stripe決済ロジック（Academy用）

新規追加するもの:
- スマートコントラクト
- Telegram Bot
- HP生成エンジン
- SNS自動投稿
- 紹介報酬システム
- プッシュ通知
- ウォレット連携
```

---

## 6. Academy 機能リリーススケジュール

### 6.1 全体スケジュール

```
MVP1 (2-3ヶ月)
├─ Bot 経由の教材提供
├─ Academy LPは「準備中」表示
└─ 動画・Zoom 部分は未公開

MVP2 (3-6ヶ月後、100人達成後)
├─ Academy LP正式公開
├─ 動画コンテンツリリース
├─ Zoom ウェビナー予約システム稼働
└─ 1期生募集開始

MVP3 (6-12ヶ月後)
├─ コミュニティ機能
├─ 受発注ボード
└─ 卒業生コミュニティ月額
```

### 6.2 「準備中」表示の実装

`apps/web/src/app/(marketing)/academy/page.tsx`:

```typescript
export default function AcademyComingSoonPage() {
  return (
    <main className="min-h-screen bg-bg-deep flex items-center justify-center">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-bold text-gold-bright mb-8">
          OPENCLAW Academy
        </h1>
        
        <div className="text-2xl text-text-main mb-12">
          準備中
        </div>
        
        <p className="text-text-dim text-lg mb-8">
          Claws オーナーは、Bot を通じて Academy の教材を
          <br />
          <span className="text-gold-bright">無料で</span>
          受けることができます。
        </p>
        
        <div className="bg-bg-card border border-border-faint rounded-lg p-8 mb-8">
          <p className="text-text-main mb-4">
            <strong>本格リリース予定</strong>
          </p>
          <p className="text-text-dim">
            最初の100人が集まり次第、Zoom ウェビナーをはじめとする
            <br />
            プレミアムコンテンツをリリースします。
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-text-dim">
            それまでは、Bot で大黒天や学に「Claude Code の使い方を教えて」と
            <br />
            話しかけてください。
          </p>
        </div>
        
        <a
          href="/claws"
          className="inline-block mt-12 px-8 py-4 bg-red-blood hover:bg-red-bright text-text-main font-bold rounded transition"
        >
          Claws を召喚する
        </a>
      </div>
    </main>
  );
}
```

---

## 7. Academy 動画生成（仁さん収録）

### 7.1 仁さんのタスク

MVP1 → MVP2 への移行期に、仁さんが以下を収録：

```
Week 1〜8 の各週、約40-50分の動画 × 8本
合計: 約320-400分（5〜6時間）

各週の構成:
├─ オープニング（2分）
├─ 実演（30-40分）画面共有でClaude Codeに話しかけながら作る
├─ フレーズ集解説（5分）
└─ 宿題説明（3分）
```

### 7.2 配信インフラ

```
動画ファイル
   ↓
Cloudflare Stream にアップロード
   ↓
academy_videos テーブルに登録
   ↓
受講者が会員エリアで視聴
   ↓
academy_video_progress に進捗保存
```

---

## 8. Bot との連携詳細（MVP2以降）

### 8.1 視聴中の質問対応

```
ユーザーが Academy の動画を視聴中、
Telegramで「Week 3の課題で詰まってる」と相談
   ↓
Bot がコンテキストを把握（Week 3のテーマ：デザイン）
   ↓
学（Claw）が、デザイン関連のフレーズ集や具体例を提示
```

### 8.2 進捗確認

```
ユーザー: 「私のAcademy進捗どうなってる？」
   ↓
Bot: 「主、現在 Week 3 まで完了。残り5週分だ。
       次は Week 4『機能追加』の動画を見るといい。」
```

実装：

```typescript
async function handleAcademyProgressQuery(
  ctx: Context,
  userId: string,
  env: Env
) {
  const supabase = createSupabaseClient(env);
  
  // 受講契約確認
  const { data: subscription } = await supabase
    .from('academy_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  if (!subscription) {
    return ctx.reply('主、まだAcademyを受講していない。準備が整い次第、案内する。');
  }
  
  // 進捗取得
  const { data: progress } = await supabase
    .from('academy_video_progress')
    .select('video:academy_videos(week, title), completed')
    .eq('user_id', userId)
    .order('video.week');
  
  const completedWeeks = progress?.filter(p => p.completed).map(p => p.video.week) || [];
  const maxCompleted = Math.max(0, ...completedWeeks);
  
  await ctx.reply(
    `主、現在 Week ${maxCompleted} まで完了。\n` +
    `残り ${8 - maxCompleted} 週分だ。\n\n` +
    `次は Week ${maxCompleted + 1} だな。頑張れ。`
  );
}
```

---

## 9. Academy のマネタイズ統合

### 9.1 紹介報酬の連動

Academy 受講料も、Claws と同じ紹介報酬システムに乗せる：

```
ユーザー A が Academy Zoom 型 (¥150,000) を購入
   ↓
A の紹介者 B に報酬が発生
   - 直紹介 (B): 15%
   - 2世代上 (C): 5%
   - 3世代上 (D): 2%
   - 運営取り分: 78%

(NFT より低めの%設定。理由: Academy は仁さんが直接労力を使うため)
```

### 9.2 実装

`referral_rewards` テーブルは、source の種類を区別できるようにする：

```sql
ALTER TABLE public.referral_rewards
  ADD COLUMN source_type TEXT NOT NULL DEFAULT 'nft_purchase'
    CHECK (source_type IN ('nft_purchase', 'academy_subscription', 'weapon_purchase'));

ALTER TABLE public.referral_rewards
  ADD COLUMN academy_subscription_id UUID REFERENCES public.academy_subscriptions(id);

ALTER TABLE public.referral_rewards
  ADD COLUMN weapon_purchase_id UUID;  -- MVP3 で使用
```

報酬計算サービスの拡張：

```typescript
const REWARD_RATES = {
  nft_purchase: {
    GEN_1: 30, GEN_2: 10, GEN_3: 5,
  },
  academy_subscription: {
    GEN_1: 15, GEN_2: 5, GEN_3: 2,
  },
  weapon_purchase: {
    GEN_1: 20, GEN_2: 7, GEN_3: 3,
  },
};
```

---

## 10. テスト方針

### 10.1 統合テスト

```typescript
describe('Academy Integration', () => {
  it('Bot teaches phrases for free to NFT holders', async () => {
    // ユーザーAがNFT保有
    // Botに「Webサイトの作り方教えて」と聞く
    // 関連フレーズが返ってくる
  });
  
  it('NFT holder can preview academy materials', async () => {
    // 動画ライブラリの「お試し」コンテンツが見られる
  });
  
  it('Academy subscription generates referral rewards', async () => {
    // ¥150,000のZoom型を購入
    // 紹介者に15%報酬発生
  });
});
```

---

## 11. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-09 Academy統合
- 既存仕様書: ai-builders-lab-spec.md, CURRICULUM.md（dlcリポジトリ）
- 対象: apps/web/src/app/(marketing)/academy/, apps/web/src/app/account/academy/

[タスク]
SPEC-09 と既存 Academy 仕様書を統合した実装をしてください。

[具体的な要件]
1. MVP1:
   - /academy ページに「準備中」表示
   - Bot が Academy のフレーズ集を教材として使う
   - academy_phrase_collection テーブル作成 + シード

2. MVP2 (フェーズ分けて):
   - 既存 ai-builders-lab-spec.md の通りに実装
   - OPENCLAW のブランディングに合わせる
   - Stripe 決済統合
   - 紹介報酬連動

3. MVP3:
   - 既存仕様のコミュニティ・受発注ボード
   - キャラ連動

[既存資産]
- https://github.com/jinjinsansan/dlc 内のNext.js コード
- CURRICULUM.md（カリキュラム詳細）
- ai-builders-lab-spec.md（技術仕様）

[出力形式]
- マイグレーション
- React コンポーネント
- README.md（既存資産の活用方法）

[禁止事項]
- 既存のカリキュラムを勝手に変えない
- 既存価格設定を変えない（¥49,800〜¥150,000維持）
- フレーズ集の文言を変えない
```

---

## 12. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-09**

次のドキュメント: SPEC-10 武器倉庫
