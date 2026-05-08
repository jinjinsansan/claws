import { createSupabaseClient } from "../lib/supabase.js";
import { convertToCSV } from "../lib/csv.js";
import type { Env, BackupResult } from "../types.js";

const BACKUP_TABLES = [
  "users",
  "user_wallets",
  "nft_tokens",
  "nft_purchases",
  "referrals",
  "referral_rewards",
  "reward_distributions",
] as const;

/**
 * Daily backup: exports important tables to R2 as CSV.
 * SPEC-11 §7.2
 */
export async function performDailyBackup(env: Env): Promise<BackupResult> {
  const supabase = createSupabaseClient(env);
  const date = new Date().toISOString().split("T")[0] ?? "unknown";

  const result: BackupResult = {
    date,
    tables_backed_up: 0,
    total_rows: 0,
    errors: [],
  };

  for (const table of BACKUP_TABLES) {
    try {
      // Supabase default limit is 1000; fetch all rows with pagination
      let allRows: Record<string, unknown>[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error: pageError } = await supabase
          .from(table)
          .select("*")
          .range(offset, offset + pageSize - 1);

        if (pageError) {
          throw pageError;
        }

        const rows = page ?? [];
        allRows = allRows.concat(rows as Record<string, unknown>[]);
        hasMore = rows.length === pageSize;
        offset += pageSize;
      }

      const rows = allRows;
      const csv = convertToCSV(rows as Record<string, unknown>[]);
      const key: string = `daily/${date}/${table}.csv`;

      await env.BACKUP_BUCKET.put(key, csv || "", {
        httpMetadata: { contentType: "text/csv" },
        customMetadata: { table, date: date as string, rows: String(rows.length) },
      });

      result.tables_backed_up++;
      result.total_rows += rows.length;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`${table}: ${msg}`);
    }
  }

  await supabase.from("audit_logs").insert({
    action: "daily_backup_completed",
    actor_type: "system",
    entity_type: "backup",
    metadata: result,
  });

  return result;
}
