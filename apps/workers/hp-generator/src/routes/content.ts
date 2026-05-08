import type { Context } from "hono";
import type { Env } from "../types.js";
import { getSupabase } from "../lib/supabase.js";

type HonoEnv = { Bindings: Env };

export async function handleContent(c: Context<HonoEnv>) {
  const siteId = c.req.param("siteId");
  if (!siteId) return c.json({ error: "Missing siteId" }, 400);

  const supabase = getSupabase(c.env);
  const { data: site, error } = await supabase
    .from("user_sites")
    .select("id, content, status, updated_at")
    .eq("id", siteId)
    .is("deleted_at", null)
    .single();

  if (error || !site) {
    return c.json({ error: "Site not found" }, 404);
  }

  if (site.status === "suspended") {
    c.header("Access-Control-Allow-Origin", "*");
    return c.json({ error: "Site suspended" }, 403);
  }

  c.header("Access-Control-Allow-Origin", "*");
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return c.json({
    siteId: site.id,
    status: site.status,
    updatedAt: site.updated_at,
    content: site.content,
  });
}
