import type { Context } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import type { Env, UpdateRequest, SiteContent } from "../types.js";
import { getSupabase } from "../lib/supabase.js";
import { getSiteById, updateSiteContent, updateSiteStatus } from "../services/site-store.js";
import { deploySite } from "../services/deployer.js";

type HonoEnv = { Bindings: Env };

export async function handleUpdate(c: Context<HonoEnv>) {
  const env = c.env;
  const body = await c.req.json<UpdateRequest>();

  if (!body.siteId || !body.userId || !body.instructions) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const supabase = getSupabase(env);
  const site = await getSiteById(supabase, body.siteId);

  if (!site) return c.json({ error: "Site not found" }, 404);
  if (site.user_id !== body.userId) return c.json({ error: "Unauthorized" }, 403);
  if (site.status === "suspended") return c.json({ error: "Site is suspended" }, 403);

  // Use LLM to interpret update instructions and modify content
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: `あなたはHP更新アシスタントです。ユーザーの指示に基づいて、既存のHPコンテンツJSONを修正してください。
修正後のJSON全体を返してください（コードブロックなし、JSONのみ）。`,
    messages: [
      {
        role: "user",
        content: `現在のコンテンツ:\n${JSON.stringify(site.content, null, 2)}\n\n更新指示: ${body.instructions}\n\n修正後のJSON全体を返してください。`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock?.text ?? "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return c.json({ error: "Failed to generate updated content" }, 500);

  const updatedContent = JSON.parse(jsonMatch[0]) as SiteContent;
  await updateSiteContent(supabase, site.id, updatedContent);

  // Redeploy in background
  c.executionCtx.waitUntil(
    (async () => {
      try {
        const deploy = await deploySite(env, {
          subdomain: site.subdomain,
          templateName: site.template_name,
          content: updatedContent,
          siteId: site.id,
        });
        await updateSiteStatus(supabase, site.id, "published", {
          current_deployment_id: deploy.deploymentId,
        });
      } catch (err) {
        console.error("HP update deploy failed:", err);
      }
    })()
  );

  return c.json({ success: true, status: "updating" });
}
