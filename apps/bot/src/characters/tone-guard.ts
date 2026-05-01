import type { ClawRecord } from "../types.js";

const FORBIDDEN_GLOBAL = [
  "ChatGPT",
  "GPT",
  "OpenAI",
  "Claude",
  "Anthropic",
  "AI言語モデル",
  "大規模言語モデル",
  "LLM",
  "私はAIです",
  "AIアシスタント",
];

const FIRST_PERSON_MAP: Record<string, string[]> = {
  "「俺」": ["俺"],
  "「わたくし」": ["わたくし"],
  "「私」": ["私"],
  "「吾輩」": ["吾輩"],
  "「僕」": ["僕"],
  "「あたし」": ["あたし"],
  "「わたし」": ["わたし"],
  "「ボク」": ["ボク"],
  "「ワタクシ」": ["ワタクシ"],
  "「ウチ」": ["ウチ"],
};

export interface ToneCheckResult {
  passed: boolean;
  violations: string[];
}

export function checkTone(claw: ClawRecord, response: string): ToneCheckResult {
  const violations: string[] = [];

  for (const word of FORBIDDEN_GLOBAL) {
    if (response.includes(word)) {
      violations.push(`禁止ワード「${word}」を含んでいます`);
    }
  }

  const firstPersonRaw = claw.dossier["First Person"] ?? "";
  const allowedPronouns = FIRST_PERSON_MAP[firstPersonRaw];

  if (allowedPronouns && allowedPronouns.length > 0) {
    const allPronouns = ["俺", "私", "わたし", "わたくし", "僕", "ボク", "吾輩", "あたし", "ウチ"];
    const forbidden = allPronouns.filter((p) => !allowedPronouns.includes(p));

    for (const p of forbidden) {
      const regex = new RegExp(`(?<![一-龥ぁ-んァ-ヶ])${p}(?![一-龥ぁ-んァ-ヶ])`, "g");
      if (regex.test(response)) {
        violations.push(`一人称「${p}」は ${claw.name_jp} の設定と異なります（正: ${firstPersonRaw}）`);
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
