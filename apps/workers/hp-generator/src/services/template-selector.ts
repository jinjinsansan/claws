import type { TemplateName } from "../types.js";

interface CharacterAffinity {
  clawNos: number[];
  template: TemplateName;
}

const AFFINITIES: CharacterAffinity[] = [
  { template: "restaurant", clawNos: [6, 8, 14, 20, 22, 28, 29] },
  { template: "salon", clawNos: [16, 17, 18, 19, 21, 25, 27] },
  { template: "consultant", clawNos: [2, 9, 10, 12, 13, 15, 26] },
  { template: "creator", clawNos: [5, 7, 17, 21] },
  { template: "community", clawNos: [23, 24, 28, 29, 30] },
];

const BUSINESS_TYPE_MAP: Record<string, TemplateName> = {
  "飲食": "restaurant",
  "カフェ": "restaurant",
  "レストラン": "restaurant",
  "食堂": "restaurant",
  "居酒屋": "restaurant",
  "バー": "restaurant",
  "美容": "salon",
  "サロン": "salon",
  "エステ": "salon",
  "ネイル": "salon",
  "ヒーリング": "salon",
  "整体": "salon",
  "マッサージ": "salon",
  "コンサル": "consultant",
  "士業": "consultant",
  "コーチ": "consultant",
  "弁護士": "consultant",
  "税理士": "consultant",
  "クリエイター": "creator",
  "ハンドメイド": "creator",
  "デザイン": "creator",
  "アート": "creator",
  "コミュニティ": "community",
  "サークル": "community",
  "オンラインサロン": "community",
};

export function selectTemplate(
  businessType: string,
  clawNo: number,
  preference?: TemplateName
): TemplateName {
  if (preference) return preference;

  // Business type keyword matching (longer keywords first for specificity)
  const sorted = Object.entries(BUSINESS_TYPE_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, template] of sorted) {
    if (businessType.includes(keyword)) return template;
  }

  // Character affinity
  for (const affinity of AFFINITIES) {
    if (affinity.clawNos.includes(clawNo)) return affinity.template;
  }

  return "default";
}
