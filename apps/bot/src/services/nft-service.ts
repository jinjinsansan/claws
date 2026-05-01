import type { SupabaseClient } from "@supabase/supabase-js";

export interface OwnedClaw {
  clawId: string;
  clawNo: number;
  nameJp: string;
  nameEn: string;
  tokenId: number;
}

export async function getOwnedClaws(
  supabase: SupabaseClient,
  userId: string
): Promise<OwnedClaw[]> {
  const { data } = await supabase
    .from("nft_tokens")
    .select("token_id, claw_id, claw_no, claws(name_jp, name_en)")
    .eq("owner_user_id", userId)
    .order("claw_no", { ascending: true });

  if (!data || data.length === 0) return [];

  return data.map((row: Record<string, unknown>) => {
    const claws = row.claws as Record<string, string> | null;
    return {
      clawId: row.claw_id as string,
      clawNo: row.claw_no as number,
      nameJp: claws?.name_jp ?? "",
      nameEn: claws?.name_en ?? "",
      tokenId: row.token_id as number,
    };
  });
}

export async function hasActiveNft(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const claws = await getOwnedClaws(supabase, userId);
  return claws.length > 0;
}
