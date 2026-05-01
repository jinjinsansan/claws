import Anthropic from "@anthropic-ai/sdk";
import type { Env, SiteContent, TemplateName } from "../types.js";

export async function generateContent(
  env: Env,
  params: {
    businessName: string;
    businessType: string;
    businessDescription: string;
    templateName: TemplateName;
    characterName: string;
  }
): Promise<SiteContent> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const systemPrompt = `あなたはビジネスHP用のコンテンツライターです。
以下のビジネス情報をもとに、HPのコンテンツをJSON形式で生成してください。
テンプレート「${params.templateName}」に合わせた内容にしてください。
日本語で生成してください。コンテンツは簡潔で魅力的に。`;

  const userPrompt = `以下のビジネス情報でHPコンテンツを生成してください:

ビジネス名: ${params.businessName}
業種: ${params.businessType}
説明: ${params.businessDescription}
担当キャラクター: ${params.characterName}

以下のJSON形式で出力してください（コードブロックなし、JSONのみ）:
{
  "heroTitle": "メインキャッチコピー",
  "heroSubtitle": "サブキャッチ",
  "heroDescription": "ヒーローセクションの説明文（2-3文）",
  "features": [
    { "title": "特徴1タイトル", "description": "特徴1の説明" },
    { "title": "特徴2タイトル", "description": "特徴2の説明" },
    { "title": "特徴3タイトル", "description": "特徴3の説明" }
  ],
  "about": {
    "title": "私たちについて",
    "description": "About セクションの説明（3-4文）",
    "mission": "ミッションステートメント"
  },
  "contact": {
    "title": "お問い合わせ",
    "description": "お気軽にお問い合わせください"
  },
  "footer": {
    "copyright": "© 2026 ${params.businessName}"
  },
  "meta": {
    "title": "${params.businessName} — 公式サイト",
    "description": "SEO用の説明文（120文字以内）"
  }
}`;

  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock?.text ?? "{}";

  // Extract JSON from response (handle code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from LLM response");

  return JSON.parse(jsonMatch[0]) as SiteContent;
}
