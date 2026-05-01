import type { Context } from "hono";
import type { Env } from "../types.js";
import { getSupabase } from "../lib/supabase.js";
import { getSiteById } from "../services/site-store.js";

type HonoEnv = { Bindings: Env };

export async function handleStatus(c: Context<HonoEnv>) {
  const siteId = c.req.param("siteId");
  if (!siteId) return c.json({ error: "Missing siteId" }, 400);

  const supabase = getSupabase(c.env);
  const site = await getSiteById(supabase, siteId);

  if (!site) return c.json({ error: "Site not found" }, 404);

  return c.json({
    siteId: site.id,
    subdomain: site.subdomain,
    status: site.status,
    templateName: site.template_name,
    deployedAt: site.deployed_at,
    url: site.status === "published"
      ? `https://${site.subdomain}.${c.env.SITE_BASE_DOMAIN}`
      : null,
  });
}
