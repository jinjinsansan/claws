export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  BACKUP_BUCKET: R2Bucket;
  API_SECRET: string;
}

export interface BackupResult {
  date: string;
  tables_backed_up: number;
  total_rows: number;
  errors: string[];
}
