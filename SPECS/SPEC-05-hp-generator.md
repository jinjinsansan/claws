# SPEC-05: OPENCLAW Platform - HP生成エージェント

> **このドキュメントの位置づけ**: ユーザーが Telegram Bot 経由で「HPを作って」と依頼した時に、実際にWebサイトを生成・デプロイ・公開するシステムの仕様。
> 
> **前提**: SPEC-00〜04 を読んでいること。

---

## 1. HP生成エージェント全体像

### 1.1 目的

ユーザーが自分の Claw に「ラーメン店のHPを作って」と依頼すると、数分以内に独自URLでアクセスできるWebサイトが完成する仕組みを提供する。

### 1.2 ユーザー体験

```
1. Bot で「HPを作って」と依頼
2. Bot が必要情報を聞く（店名・業種・概要等）
3. Claw が情報を確認
4. 「主、お主の城を建てる。少し待て」
5. 数分後: 完成URLが届く
   https://yourname.claws.openclaw.com
6. ユーザーがURLにアクセスして完成を確認
7. 後日: Bot で「HP の見出しを変えて」と依頼すると更新できる
```

### 1.3 採用技術

| 項目 | 内容 |
|------|------|
| HP生成エンジン | Cloudflare Workers + Hono |
| LLM API | Anthropic Claude API（コンテンツ生成） |
| ホスティング | Cloudflare Pages |
| サブドメイン管理 | Cloudflare DNS API |
| テンプレートエンジン | Next.js 14 + Tailwind CSS |
| 画像 | Cloudflare R2（ユーザーアップロード画像） |

---

## 2. ディレクトリ構造

```
apps/workers/hp-generator/
├── src/
│   ├── index.ts                    # Cloudflare Workers エントリポイント
│   ├── routes/
│   │   ├── generate.ts             # POST /generate
│   │   ├── update.ts               # POST /update
│   │   ├── delete.ts               # DELETE /delete
│   │   └── status.ts               # GET /status/:siteId
│   │
│   ├── services/
│   │   ├── content-generator.ts    # LLMでコンテンツ生成
│   │   ├── template-builder.ts     # テンプレート選択・組立
│   │   ├── deployer.ts             # Cloudflare Pages へデプロイ
│   │   ├── dns-manager.ts          # サブドメイン管理
│   │   └── site-store.ts           # サイトデータの保存・取得
│   │
│   ├── templates/                  # 業種別テンプレート
│   │   ├── default/                # 汎用
│   │   ├── restaurant/             # 飲食店
│   │   ├── salon/                  # サロン・美容室
│   │   ├── consultant/             # コンサル・士業
│   │   ├── creator/                # クリエイター・ハンドメイド
│   │   └── community/              # コミュニティ運営
│   │
│   ├── lib/
│   │   ├── claude.ts
│   │   ├── cloudflare-pages.ts
│   │   ├── supabase.ts
│   │   └── r2-storage.ts
│   │
│   └── types.ts
│
├── wrangler.toml
└── package.json

apps/templates/                     # Cloudflare Pages にデプロイされる Next.js
├── default/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   └── data/
│   │       └── content.json        # サイトコンテンツ
│   ├── public/
│   ├── package.json
│   └── next.config.mjs
├── restaurant/
└── ...
```

---

## 3. テンプレート設計

### 3.1 テンプレート一覧（MVP1）

最低限の6種類でカバーする：

| テンプレート名 | 想定業種 | キャラとの相性 |
|--------------|---------|---------------|
| `default` | 汎用 | 全キャラ |
| `restaurant` | 飲食店、カフェ | 商太、熊嵐、桃兎 |
| `salon` | 美容、サロン、ヒーリング | 弁天、観音、紅唇 |
| `consultant` | 士業、コンサル、コーチ | 武一、学、翡翠、紫水晶 |
| `creator` | ハンドメイド、クリエイター | 弁天、妖精 |
| `community` | コミュニティ、サロン運営 | 葵、菫、観音 |

### 3.2 各テンプレートの構造

各テンプレートは Next.js 14 のプロジェクト。共通構造：

```
templates/<name>/
├── src/app/
│   ├── page.tsx                    # メインページ
│   ├── layout.tsx                  # レイアウト
│   ├── about/page.tsx              # 概要
│   ├── contact/page.tsx            # お問い合わせ
│   └── globals.css
├── src/data/
│   └── content.json                # サイト固有のコンテンツ（生成時に差し込まれる）
├── src/components/
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── Contact.tsx
│   └── Footer.tsx
└── package.json
```

### 3.3 content.json の構造（共通）

各サイトに固有のコンテンツを保持する JSON。テンプレート間で共通の構造を持つ：

```json
{
  "site": {
    "name": "ラーメン店名",
    "tagline": "心を込めた一杯を、毎日。",
    "description": "...",
    "logo": "/logo.png",
    "favicon": "/favicon.ico"
  },
  "hero": {
    "headline": "本当の一杯を、求めて。",
    "subheadline": "創業30年、変わらぬ味。",
    "cta": {
      "text": "メニューを見る",
      "link": "#menu"
    },
    "backgroundImage": "/hero.jpg"
  },
  "sections": [
    {
      "type": "features",
      "title": "三つの強み",
      "items": [
        { "icon": "🍜", "title": "国産小麦", "description": "..." },
        { "icon": "🌿", "title": "添加物不使用", "description": "..." },
        { "icon": "👨‍🍳", "title": "30年の技", "description": "..." }
      ]
    },
    {
      "type": "menu",
      "title": "メニュー",
      "items": [
        { "name": "醤油ラーメン", "price": "850円", "description": "..." }
      ]
    },
    {
      "type": "access",
      "title": "アクセス",
      "address": "東京都渋谷区...",
      "hours": "11:00-22:00",
      "tel": "03-1234-5678",
      "mapEmbed": "https://maps.google.com/..."
    },
    {
      "type": "contact",
      "title": "お問い合わせ",
      "email": "info@example.com",
      "form": true
    }
  ],
  "theme": {
    "colors": {
      "primary": "#8b0000",
      "secondary": "#c9a961",
      "background": "#080202",
      "text": "#f0e6d6"
    },
    "fonts": {
      "heading": "Noto Serif JP",
      "body": "Noto Sans JP"
    }
  },
  "meta": {
    "ownerUserId": "uuid-...",
    "characterNo": 14,
    "createdAt": "2026-04-29T...",
    "updatedAt": "2026-04-29T..."
  }
}
```

---

## 4. HP生成のフロー

### 4.1 全体シーケンス

```
[Bot]                    [HP-Generator Worker]                [Cloudflare]
  │                              │                                │
  │ 1. POST /generate            │                                │
  │ ─────────────────────────────▶                               │
  │ { userId, characterNo,      │                                │
  │   businessInfo }             │                                │
  │                              │                                │
  │                              │ 2. Validate NFT ownership      │
  │                              │ (Supabase に確認)              │
  │                              │                                │
  │                              │ 3. Choose template based on    │
  │                              │ business_type & character     │
  │                              │                                │
  │                              │ 4. Generate content with LLM   │
  │                              │ ─────────────────────▶        │
  │                              │ ◀─────────────────────         │
  │                              │ ヘッドライン、説明等          │
  │                              │                                │
  │                              │ 5. Build site project          │
  │                              │ (template + content.json)      │
  │                              │                                │
  │                              │ 6. Create Cloudflare Pages    │
  │                              │ project                        │
  │                              │ ────────────────────────▶     │
  │                              │                                │
  │                              │ 7. Deploy to Cloudflare Pages │
  │                              │ ────────────────────────▶     │
  │                              │ ◀───── deployment URL ─────   │
  │                              │                                │
  │                              │ 8. Setup custom subdomain      │
  │                              │ (DNS API)                      │
  │                              │ ────────────────────────▶     │
  │                              │                                │
  │                              │ 9. Save to user_sites          │
  │                              │ (Supabase)                     │
  │                              │                                │
  │ 10. Response                 │                                │
  │ ◀─────────────────────────── │                                │
  │ { url, siteId }              │                                │
  │                              │                                │
  │ 11. Notify user              │                                │
```

### 4.2 詳細実装

`src/routes/generate.ts`:

```typescript
import { Hono } from 'hono';
import type { Env } from '../types';
import { generateContent } from '../services/content-generator';
import { selectTemplate } from '../services/template-builder';
import { deployToPages } from '../services/deployer';
import { setupSubdomain } from '../services/dns-manager';
import { saveSite } from '../services/site-store';

const app = new Hono<{ Bindings: Env }>();

interface GenerateRequest {
  userId: string;
  characterNo: number;
  businessInfo: {
    businessName: string;
    businessType: string;
    description: string;
    address?: string;
    hours?: string;
    tel?: string;
    email?: string;
    keywords?: string[];
  };
  preferences?: {
    designStyle?: 'minimal' | 'warm' | 'professional' | 'playful';
    primaryColor?: string;
  };
}

interface GenerateResponse {
  siteId: string;
  url: string;
  subdomain: string;
  status: 'building' | 'deploying' | 'ready';
}

app.post('/generate', async (c) => {
  // 1. リクエストの検証
  const body: GenerateRequest = await c.req.json();
  
  // 認証
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${c.env.HP_GENERATOR_API_KEY}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // 2. NFT保有確認
  const hasActiveNFT = await verifyNFTOwnership(body.userId, c.env);
  if (!hasActiveNFT) {
    return c.json({ error: 'No active NFT found' }, 403);
  }
  
  // 3. 既存サイトのチェック
  const existingSite = await getExistingSite(body.userId, body.characterNo, c.env);
  if (existingSite) {
    return c.json({
      error: 'Site already exists',
      siteId: existingSite.id,
      url: existingSite.url,
    }, 409);
  }
  
  // 4. サブドメイン生成（ユニーク性チェック）
  const subdomain = await generateUniqueSubdomain(body.businessInfo.businessName, c.env);
  
  // 5. user_sites レコード作成（status='draft'）
  const siteId = await createSiteRecord({
    userId: body.userId,
    characterNo: body.characterNo,
    subdomain,
    businessInfo: body.businessInfo,
    env: c.env,
  });
  
  // 6. 非同期でビルド・デプロイ実行
  c.executionCtx.waitUntil(
    buildAndDeploy(siteId, body, subdomain, c.env)
  );
  
  // 7. 即座にレスポンス（ユーザーには status を伝える）
  return c.json<GenerateResponse>({
    siteId,
    url: `https://${subdomain}.claws.openclaw.com`,
    subdomain,
    status: 'building',
  });
});

async function buildAndDeploy(
  siteId: string,
  request: GenerateRequest,
  subdomain: string,
  env: Env
): Promise<void> {
  try {
    // 1. テンプレート選択
    const template = selectTemplate(request.businessInfo.businessType, request.characterNo);
    
    // 2. LLMでコンテンツ生成
    const content = await generateContent({
      businessInfo: request.businessInfo,
      characterNo: request.characterNo,
      template: template.name,
      env,
    });
    
    // 3. テーマ適用
    const finalContent = applyTheme(content, request.preferences, request.characterNo);
    
    // 4. Cloudflare Pages プロジェクト作成
    const pagesProject = await createPagesProject(siteId, env);
    
    // 5. ビルド成果物を Cloudflare Pages にデプロイ
    const deployment = await deployToPages({
      project: pagesProject,
      template,
      content: finalContent,
      env,
    });
    
    // 6. サブドメイン設定
    await setupSubdomain(subdomain, deployment.url, env);
    
    // 7. user_sites レコード更新
    await updateSiteRecord(siteId, {
      status: 'published',
      cloudflarePagesProjectId: pagesProject.id,
      currentDeploymentId: deployment.id,
      deployedAt: new Date().toISOString(),
      content: finalContent,
    }, env);
    
    // 8. ユーザーに通知（Telegram Bot 経由）
    await notifyUserSiteReady(request.userId, request.characterNo, subdomain, env);
    
  } catch (error: any) {
    console.error(`Site build failed for ${siteId}:`, error);
    
    await updateSiteRecord(siteId, {
      status: 'draft',
      metadata: { error: error.message },
    }, env);
    
    await notifyUserSiteFailed(request.userId, request.characterNo, error.message, env);
  }
}

export default app;
```

### 4.3 コンテンツ生成（LLM）

`src/services/content-generator.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../types';

interface ContentGenerationRequest {
  businessInfo: any;
  characterNo: number;
  template: string;
  env: Env;
}

export async function generateContent(req: ContentGenerationRequest): Promise<any> {
  const anthropic = new Anthropic({
    apiKey: req.env.ANTHROPIC_API_KEY,
  });
  
  // キャラクターの口調情報を取得
  const character = await getCharacter(req.characterNo, req.env);
  
  // システムプロンプト
  const systemPrompt = `
あなたは「${character.name_jp}」というキャラクターのHP制作担当エージェントです。
ユーザー（主）のために、Webサイトの構成とコンテンツを作成します。

以下のルールを必ず守ってください：

1. **キャラクターの世界観を反映**
   - キャラ: ${character.name_jp}（${character.category}・${character.element}）
   - 口調: ${character.tone}
   - 一人称: ${character.first_person}

2. **業種に最適化**
   - ユーザーのビジネスに最適化されたコピー
   - SEO観点で重要なキーワードを自然に含める

3. **JSON形式で回答**
   - 後述のスキーマに従って、JSON形式で出力
   - JSONの外には何も書かない

4. **コピーは魅力的に**
   - ヘッドラインは強く、サブはわかりやすく
   - 押し付けがましくならない範囲で訴求
`;

  const userPrompt = `
以下のビジネス情報をもとに、Webサイトのコンテンツを生成してください。

【ビジネス情報】
- 名前: ${req.businessInfo.businessName}
- 業種: ${req.businessInfo.businessType}
- 説明: ${req.businessInfo.description}
${req.businessInfo.address ? `- 住所: ${req.businessInfo.address}` : ''}
${req.businessInfo.hours ? `- 営業時間: ${req.businessInfo.hours}` : ''}
${req.businessInfo.tel ? `- 電話: ${req.businessInfo.tel}` : ''}

【テンプレート】: ${req.template}

【出力するJSONスキーマ】

{
  "site": {
    "name": "...",
    "tagline": "...",
    "description": "..."
  },
  "hero": {
    "headline": "...",
    "subheadline": "...",
    "cta": { "text": "...", "link": "#contact" }
  },
  "sections": [
    {
      "type": "features",
      "title": "...",
      "items": [
        { "icon": "...", "title": "...", "description": "..." },
        ...3つほど
      ]
    },
    ${req.businessInfo.businessType === 'restaurant' ? `{
      "type": "menu",
      "title": "メニュー",
      "items": [{ "name": "...", "price": "...", "description": "..." }]
    },` : ''}
    {
      "type": "access",
      "title": "アクセス",
      "address": "...",
      "hours": "...",
      "tel": "..."
    },
    {
      "type": "contact",
      "title": "お問い合わせ",
      "email": "...",
      "form": true
    }
  ]
}

JSON のみで応答してください。
`;

  const response = await anthropic.messages.create({
    model: req.env.ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  // JSON 抽出
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from LLM response');
  }
  
  return JSON.parse(jsonMatch[0]);
}
```

### 4.4 Cloudflare Pages へのデプロイ

`src/services/deployer.ts`:

```typescript
import type { Env } from '../types';

interface DeployRequest {
  project: { id: string; name: string };
  template: { name: string; files: Record<string, string> };
  content: any;
  env: Env;
}

export async function deployToPages(req: DeployRequest): Promise<{
  id: string;
  url: string;
}> {
  // 1. テンプレートのファイルに content.json を加える
  const files = {
    ...req.template.files,
    'src/data/content.json': JSON.stringify(req.content, null, 2),
  };
  
  // 2. Cloudflare Pages Direct Upload API でデプロイ
  // https://developers.cloudflare.com/pages/get-started/direct-upload/
  
  // 注意: Direct Uploadはビルド済みファイルを要求するため、
  // 事前にビルド済みのテンプレートを用意するか、Cloudflare Workers でビルドする必要がある
  
  // MVP1: 事前ビルド済みのテンプレート + content.json を使う方式
  // ビルド時にcontent.jsonを参照する形のNext.jsテンプレートを作成
  
  const formData = new FormData();
  for (const [path, content] of Object.entries(files)) {
    formData.append('files', new Blob([content]), path);
  }
  formData.append('manifest', JSON.stringify(generateManifest(files)));
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${req.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${req.project.name}/deployments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    }
  );
  
  if (!response.ok) {
    throw new Error(`Deploy failed: ${await response.text()}`);
  }
  
  const result = await response.json();
  
  return {
    id: result.result.id,
    url: result.result.url,
  };
}

function generateManifest(files: Record<string, string>): Record<string, string> {
  // マニフェスト形式: { path: hash }
  // 実装はファイルのSHA256ハッシュ
  const manifest: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    manifest[path] = computeSha256(content);
  }
  return manifest;
}

function computeSha256(content: string): string {
  // crypto.subtle.digest を使用
  // ...
  return '...';
}
```

### 4.5 サブドメイン管理

`src/services/dns-manager.ts`:

```typescript
import type { Env } from '../types';

/**
 * Cloudflare DNS API でサブドメインを設定
 */
export async function setupSubdomain(
  subdomain: string,
  pagesUrl: string,
  env: Env
): Promise<void> {
  // claws.openclaw.com というワイルドカードゾーンに、CNAME レコードを追加
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: `${subdomain}.claws`,
        content: pagesUrl,
        proxied: true,
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`DNS setup failed: ${await response.text()}`);
  }
  
  // Cloudflare Pages にカスタムドメインを追加
  await addCustomDomainToPages(subdomain, env);
}

async function addCustomDomainToPages(subdomain: string, env: Env): Promise<void> {
  const fullDomain = `${subdomain}.claws.openclaw.com`;
  
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${subdomain}/domains`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: fullDomain }),
    }
  );
}

/**
 * サブドメインの一意性を確保
 */
export async function generateUniqueSubdomain(
  businessName: string,
  env: Env
): Promise<string> {
  // 1. ベースとなるスラグを生成
  const baseSlug = slugify(businessName);
  
  // 2. 同じスラグが既に存在するかチェック
  const supabase = createSupabaseClient(env);
  let candidate = baseSlug;
  let suffix = 1;
  
  while (true) {
    const { data, error } = await supabase
      .from('user_sites')
      .select('id')
      .eq('subdomain', candidate)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (!data) break;
    
    suffix++;
    candidate = `${baseSlug}-${suffix}`;
    if (suffix > 99) {
      candidate = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      break;
    }
  }
  
  return candidate;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    || 'site';
}
```

---

## 5. HP更新（マルチターン）

ユーザーが「ヘッドラインを変えて」「メニューを追加して」等のリクエストをした時の処理。

### 5.1 更新エンドポイント

`src/routes/update.ts`:

```typescript
app.post('/update', async (c) => {
  const body: UpdateRequest = await c.req.json();
  
  // 1. サイト取得
  const site = await getSite(body.siteId, c.env);
  if (!site || site.user_id !== body.userId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  // 2. 自然言語による変更指示を解釈
  const updates = await interpretUpdateInstruction({
    instruction: body.instruction,
    currentContent: site.content,
    characterNo: site.character_no,
    env: c.env,
  });
  
  // 3. content.json を更新
  const newContent = applyUpdates(site.content, updates);
  
  // 4. 再デプロイ
  const deployment = await redeployToPages({
    project: { id: site.cloudflare_pages_project_id, name: site.subdomain },
    template: getTemplate(site.template_name),
    content: newContent,
    env: c.env,
  });
  
  // 5. DBを更新
  await updateSite(body.siteId, {
    content: newContent,
    current_deployment_id: deployment.id,
    deployed_at: new Date().toISOString(),
  }, c.env);
  
  return c.json({
    siteId: body.siteId,
    url: `https://${site.subdomain}.claws.openclaw.com`,
    status: 'updated',
  });
});

async function interpretUpdateInstruction({
  instruction,
  currentContent,
  characterNo,
  env,
}: {
  instruction: string;
  currentContent: any;
  characterNo: number;
  env: Env;
}): Promise<any> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: `あなたはHPの内容を更新するエージェントです。
現在のサイトコンテンツと、ユーザーの自然言語指示を受け取り、変更点をJSON形式で返してください。
変更箇所は JSON Patch RFC 6902 形式で表現してください。`,
    messages: [{
      role: 'user',
      content: `
【現在のコンテンツ】
${JSON.stringify(currentContent, null, 2)}

【ユーザーの指示】
${instruction}

【出力】
変更点を JSON Patch 形式で返してください。
`,
    }],
  });
  
  // ... JSON抽出
}
```

---

## 6. NFT売却時のサイト停止

NFT売却が検知された場合（SPEC-02のNFT同期Worker）、関連するサイトを停止する。

```typescript
// apps/workers/nft-sync/src/index.ts に追加

async function deactivateUserServices(userId: string, tokenId: number) {
  const supabase = createSupabaseClient();
  
  // 1. user_sites を suspended に
  await supabase
    .from('user_sites')
    .update({
      status: 'suspended',
      suspended_reason: 'NFT transferred or sold',
    })
    .eq('user_id', userId)
    .eq('nft_token_id', tokenId);
  
  // 2. サイトの content を「サービス停止中」に書き換えて再デプロイ
  // ... 実装
}
```

---

## 7. キャラクターによる業種マッチング

各キャラと業種の相性をマッピング。テンプレート選択ロジックに使用：

```typescript
// src/services/template-builder.ts

const CHARACTER_TEMPLATE_MAP: Record<number, string[]> = {
  1: ['default', 'consultant'],         // 紅蓮
  2: ['consultant', 'default'],         // 氷晶
  3: ['default', 'salon'],              // 闇影
  4: ['default'],                       // 雷神
  5: ['creator', 'default'],            // 風神
  6: ['restaurant', 'salon'],           // 大黒天
  7: ['creator', 'consultant'],         // 狼牙
  8: ['restaurant', 'community'],       // 熊嵐
  9: ['consultant'],                    // 鷹眼
  10: ['default', 'consultant'],        // 鋼鉄
  11: ['default'],                      // 電光
  12: ['consultant'],                   // 量子
  13: ['consultant'],                   // 武一
  14: ['restaurant', 'default'],        // 商太
  15: ['consultant', 'creator'],        // 学
  16: ['salon', 'creator'],             // 月読
  17: ['salon', 'creator'],             // 弁天
  18: ['salon', 'community'],           // 観音
  19: ['salon', 'creator'],             // 紅唇
  20: ['restaurant', 'creator'],        // 黒猫
  21: ['salon', 'creator'],             // 妖精
  22: ['restaurant', 'salon', 'community'], // 桃兎
  23: ['community', 'default'],         // 雪羊
  24: ['default', 'community'],         // 花栗鼠
  25: ['salon', 'consultant'],          // 真珠
  26: ['consultant'],                   // 翡翠
  27: ['salon', 'consultant'],          // 紫水晶
  28: ['restaurant', 'community'],      // 葵
  29: ['restaurant', 'community'],      // 茜
  30: ['community', 'salon'],           // 菫
};

const BUSINESS_TYPE_TEMPLATE_MAP: Record<string, string> = {
  'ラーメン店': 'restaurant',
  'カフェ': 'restaurant',
  '飲食店': 'restaurant',
  '美容室': 'salon',
  'エステ': 'salon',
  'サロン': 'salon',
  'カウンセリング': 'salon',
  'ヒーリング': 'salon',
  'ハンドメイド': 'creator',
  'クリエイター': 'creator',
  'コンサル': 'consultant',
  'コーチング': 'consultant',
  '士業': 'consultant',
  'コミュニティ': 'community',
  'オンラインサロン': 'community',
};

export function selectTemplate(businessType: string, characterNo: number): { name: string; files: any } {
  // 1. 業種から第1候補
  let templateName = BUSINESS_TYPE_TEMPLATE_MAP[businessType] || 'default';
  
  // 2. キャラクターとの相性チェック
  const characterPreferred = CHARACTER_TEMPLATE_MAP[characterNo] || ['default'];
  if (!characterPreferred.includes(templateName)) {
    // キャラに合わない場合、デフォルトに戻す
    templateName = characterPreferred[0];
  }
  
  return loadTemplate(templateName);
}
```

---

## 8. 監視・運用

### 8.1 メトリクス

```
- HP生成リクエスト数
- 生成成功/失敗率
- 平均生成時間
- LLM API のコスト
- Cloudflare Pages のビルド時間
- 失敗の原因別カウント
```

### 8.2 失敗時の自動再試行

ビルド失敗の原因が一時的な場合、最大3回まで自動再試行：

```typescript
async function buildWithRetry(siteId: string, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await buildAndDeploy(siteId);
      return;
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      console.log(`Retry ${attempt}/${maxRetries}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## 9. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-05 HP生成エージェント
- 対象: apps/workers/hp-generator/, apps/templates/

[タスク]
SPEC-05 に記載されているHP生成エージェントを実装してください。

[具体的な要件]
1. HP生成 Worker（Cloudflare Workers + Hono）
2. 6種類のテンプレート（Next.js）
3. LLMでのコンテンツ生成
4. Cloudflare Pages へのデプロイ
5. サブドメイン管理（CNAME）
6. 更新フロー

[出力形式]
- 全ソースコード
- 6つのテンプレート
- README.md（デプロイ手順、環境変数）

[禁止事項]
- 仕様書から逸脱しない
- セキュリティ（NFT保有確認）を省略しない
```

---

## 10. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-05**

次のドキュメント: SPEC-06 X/note自動投稿エンジン
