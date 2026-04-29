/**
 * @openclaw/characters
 *
 * 30 体の OPENCLAW Claws キャラクターデータ。
 * `scripts/extract-characters.py` で claw元画像＆HTML/openclaw_char_*.html から抽出生成される。
 *
 * 各キャラデータは `data/<NN>-<romaji>.json` に保存され、`data/index.json` で一覧化されている。
 *
 * 使い方:
 *   import { characters, getCharacterByNo } from '@openclaw/characters';
 *
 * 注意:
 *   - gender / system_prompt は HTML から抽出できないため、別途補完される（仁さん確認後）。
 *   - DB スキーマ (claws テーブル) は SPEC-01 §3.3 を参照。
 *   - 30 体のメタ情報（名前・番号・口調等）は確定済み。絶対に変更しない。
 */

// 個別キャラJSONをインポート（ビルド時に解決）
// 後続Phaseでカテゴリ別ヘルパー関数を実装する。
// MVP1初期段階では .json ファイルを直接 fetch する形でも動くため、
// この index.ts は段階的に充実させる。

export { default as charactersIndex } from './data/index.json' with { type: 'json' };

export type ClawCategory =
  | 'demon'
  | 'god'
  | 'wild'
  | 'robot'
  | 'human'
  | 'goddess'
  | 'temptress'
  | 'fluffy'
  | 'concierge'
  | 'friend';

export type ClawGender = 'male' | 'female';

export interface ClawDossier {
  Type?: { jp?: string | null; en?: string | null } | string | null;
  Element?: { jp?: string | null; en?: string | null } | string | null;
  Origin?: { jp?: string | null; en?: string | null } | string | null;
  Personality?: string | null;
  'First Person'?: string | null;
  Tone?: string | null;
  Catchphrase?: string | null;
  'Best For'?: string | null;
  Industries?: string | null;
}

export interface ClawCharacter {
  claw_no: number;
  name_jp: string;
  name_en: string;
  name_romaji: string;
  category: ClawCategory;
  gender?: ClawGender; // HTML 抽出後に補完
  tagline: string[];
  image_filename: string;
  primary_color: string;
  accent_color: string;
  dossier: ClawDossier;
  origin_paragraphs: string[];
  your_fate_paragraphs: string[];
  quote: {
    text: string | null;
    lines: string[];
    attribution: string | null;
  } | null;
  daily_routine: Array<{
    time: string | null;
    title: string | null;
    description: string | null;
  }>;
  oaths: Array<{ num: string | null; text: string | null }>;
  kinsmen: Array<{
    no: string | null;
    name: string | null;
    relation: string | null;
    image: string | null;
  }>;
  system_prompt?: string; // SPEC-04 §4.2 のテンプレートで生成
}

export interface ClawIndexEntry {
  claw_no: number;
  name_jp: string;
  name_en: string;
  category: ClawCategory;
  file: string;
}
