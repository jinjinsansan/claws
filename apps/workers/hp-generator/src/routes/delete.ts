import type { Context } from "hono";
import type { Env } from "../types.js";
import { getSupabase } from "../lib/supabase.js";
import { getSiteById, suspendSite } from "../services/site-store.js";
import { deleteSubdomainCname } from "../services/dns-manager.js";

type HonoEnv = { Bindings: Env };

export async function handleDelete(c: Context<HonoEnv>) {
  const env = c.env;
  const siteId = c.req.param("siteId");
  const userId = c.req.header("X-User-Id");

  if (!siteId) return c.json({ error: "Missing siteId" }, 400);

  const supabase = getSupabase(env);
  const site = await getSiteById(supabase, siteId);

  if (!site) return c.json({ error: "Site not found" }, 404);
  if (userId && site.user_id !== userId) return c.json({ error: "Unauthorized" }, 403);

  // Soft delete
  await supabase
    .from("user_sites")
    .update({ deleted_at: new Date().toISOString(), status: "suspended", suspended_reason: "deleted" })
    .eq("id", siteId);

  // Remove DNS in background
  c.executionCtx.waitUntil(deleteSubdomainCname(env, site.subdomain));

  return c.json({ success: true });
}

export async function handleSuspend(c: Context<HonoEnv>) {
  const siteId = c.req.param("siteId");
  const body = await c.req.json<{ reason: string }>();

  if (!siteId) return c.json({ error: "Missing siteId" }, 400);

  const supabase = getSupabase(c.env);
  await suspendSite(supabase, siteId, body.reason ?? "nft_sold");

  return c.json({ success: true });
}
