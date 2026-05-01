import type { IntentType } from "../types.js";

interface KeywordRule {
  intent: IntentType;
  keywords: string[];
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    intent: "generate_hp",
    keywords: ["HP作って", "ホームページ", "HP生成", "サイト作って", "HPを作", "HP作成", "ランディングページ"],
  },
  {
    intent: "post_sns",
    keywords: ["投稿して", "ツイートして", "Xに投稿", "noteに投稿", "SNS投稿"],
  },
  {
    intent: "view_status",
    keywords: ["ステータス", "状態", "アカウント情報", "NFT情報"],
  },
  {
    intent: "academy",
    keywords: ["アカデミー", "教材", "フレーズ", "勉強", "学習"],
  },
  {
    intent: "switch_claw",
    keywords: ["キャラ変更", "Claw変更", "切り替え", "コロニー"],
  },
  {
    intent: "help",
    keywords: ["ヘルプ", "使い方", "help", "助けて", "できること"],
  },
];

export function detectIntent(message: string): { intent: IntentType; confidence: number } {
  const normalized = message.toLowerCase().trim();

  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return { intent: rule.intent, confidence: 0.9 };
      }
    }
  }

  return { intent: "chat", confidence: 0.5 };
}
