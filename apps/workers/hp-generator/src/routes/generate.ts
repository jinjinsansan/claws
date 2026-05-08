import type { Context } from "hono";
import type { Env, GenerateRequest } from "../types.js";
import { getSupabase } from "../lib/supabase.js";
import { selectTemplate } from "../services/template-selector.js";
import { generateContent } from "../services/content-generator.js";
import { createSite, updateSiteContent, updateSiteStatus, generateSubdomain } from "../services/site-store.js";
import { deploySite } from "../services/deployer.js";
import { createSubdomainCname } from "../services/dns-manager.js";

type HonoEnv = { Bindings: Env };

export async function handleGenerate(c: Context<HonoEnv>) {
  const env = c.env;
  const body = await c.req.json<GenerateRequest>();

  if (!body.userId || !body.clawId || !body.businessName || !body.businessType) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const supabase = getSupabase(env);

  // Verify NFT ownership
  const { data: nftToken } = await supabase
    .from("nft_tokens")
    .select("token_id")
    .eq("owner_user_id", body.userId)
    .limit(1)
    .single();

  if (!nftToken) {
    return c.json({ error: "No active NFT found" }, 403);
  }

  // Get character info
  const { data: claw } = await supabase
    .from("claws")
    .select("name_jp, name_en")
    .eq("id", body.clawId)
    .single();

  const characterName = claw?.name_jp ?? "OPENCLAW";

  // Select template
  const templateName = selectTemplate(
    body.businessType,
    body.clawNo,
    body.templatePreference
  );

  // Generate subdomain
  const subdomain = generateSubdomain(body.businessName, body.userId);

  // Create site record
  const site = await createSite(supabase, {
    userId: body.userId,
    clawId: body.clawId,
    nftTokenId: Number(nftToken.token_id),
    subdomain,
    businessName: body.businessName,
    businessType: body.businessType,
    businessDescription: body.businessDescription,
    templateName,
  });

  // Return immediately, do async work in background
  const siteUrl = `https://${subdomain}.${env.SITE_BASE_DOMAIN}`;

  // Background async: generate content, deploy, DNS
  c.executionCtx.waitUntil(
    (async () => {
      try {
        const content = await generateContent(env, {
          businessName: body.businessName,
          businessType: body.businessType,
          businessDescription: body.businessDescription,
          templateName,
          characterName,
        });

        await updateSiteContent(supabase, site.id, content);

        const deploy = await deploySite(env, {
          subdomain,
          templateName,
          content,
          siteId: site.id,
        });

        await createSubdomainCname(env, subdomain, `oc-${subdomain}`);

        await updateSiteStatus(supabase, site.id, "published", {
          cloudflare_pages_project_id: deploy.projectId,
          current_deployment_id: deploy.deploymentId,
        });

        // Audit log
        await supabase.from("audit_logs").insert({
          action: "hp_generated",
          actor_type: "system",
          entity_type: "user_site",
          entity_id: site.id,
          metadata: { subdomain, templateName, url: siteUrl },
        });
      } catch (err) {
        console.error("HP generation failed:", err);
        await updateSiteStatus(supabase, site.id, "draft", {
          metadata: { error: String(err) },
        });
      }
    })()
  );

  return c.json({
    siteId: site.id,
    url: siteUrl,
    subdomain,
    templateName,
    status: "building",
  });
}
