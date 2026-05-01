import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClawRecord } from "../types.js";

let clawsCache: ClawRecord[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getAllClaws(supabase: SupabaseClient): Promise<ClawRecord[]> {
  if (clawsCache && Date.now() < cacheExpiry) return clawsCache;

  const { data, error } = await supabase
    .from("claws")
    .select("id, claw_no, name_jp, name_en, name_romaji, category, dossier, image_url")
    .order("claw_no", { ascending: true });

  if (error) throw new Error(`Failed to load claws: ${error.message}`);
  clawsCache = data as ClawRecord[];
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return clawsCache;
}

export async function getClawById(
  supabase: SupabaseClient,
  clawId: string
): Promise<ClawRecord | null> {
  const claws = await getAllClaws(supabase);
  return claws.find((c) => c.id === clawId) ?? null;
}

export async function getClawByNo(
  supabase: SupabaseClient,
  clawNo: number
): Promise<ClawRecord | null> {
  const claws = await getAllClaws(supabase);
  return claws.find((c) => c.claw_no === clawNo) ?? null;
}

export function invalidateCache(): void {
  clawsCache = null;
  cacheExpiry = 0;
}
