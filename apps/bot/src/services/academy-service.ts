import type { SupabaseClient } from "@supabase/supabase-js";

interface AcademyPhrase {
  volume: number;
  category: string;
  phrase: string;
  result: string | null;
}

export async function searchAcademyPhrases(
  supabase: SupabaseClient,
  query: string,
  limit = 3,
): Promise<AcademyPhrase[]> {
  const keywords = query
    .replace(/[。、！!？?\s]/g, " ")
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const clauses = keywords.length > 0 ? keywords : [query];
  const orQuery = clauses
    .flatMap((k) => [
      `phrase.ilike.%${k}%`,
      `result.ilike.%${k}%`,
      `category.ilike.%${k}%`,
    ])
    .join(",");

  const { data, error } = await supabase
    .from("academy_phrase_collection")
    .select("volume, category, phrase, result")
    .or(orQuery)
    .eq("is_active", true)
    .order("volume", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }
  return data as AcademyPhrase[];
}

export function formatAcademyReply(characterName: string, phrases: AcademyPhrase[]): string {
  if (phrases.length === 0) {
    return (
      `${characterName}: Academy は準備中だが、教材はBotから無料で案内できる。\n` +
      "まずは、作りたいものを具体的に言ってくれ。最適なフレーズを提案する。"
    );
  }

  const lines = phrases.map((p, i) => {
    const result = p.result ? ` → ${p.result}` : "";
    return `${i + 1}. Vol.${p.volume} [${p.category}] 「${p.phrase}」${result}`;
  });

  return (
    `${characterName}: Academy教材から、今の質問に近いフレーズを出す。\n\n` +
    `${lines.join("\n")}\n\n` +
    "このまま Claude Code に入力して試してみろ。必要なら次の一手も作る。"
  );
}
