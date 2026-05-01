import type { Env, SiteContent, TemplateName } from "../types.js";

export interface DeployResult {
  projectId: string;
  deploymentId: string;
  url: string;
}

/**
 * Deploy site to Cloudflare Pages via Direct Upload API.
 * Per §7-7: Templates are deployed once and fetch content dynamically via /api/content.
 * This deployer sets up the Pages project and configures the content API endpoint.
 */
export async function deploySite(
  env: Env,
  params: {
    subdomain: string;
    templateName: TemplateName;
    content: SiteContent;
    siteId: string;
  }
): Promise<DeployResult> {
  const projectName = `oc-${params.subdomain}`;

  // Create Cloudflare Pages project
  const projectRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        production_branch: "main",
      }),
    }
  );

  if (!projectRes.ok) {
    const err = await projectRes.text();
    // Project might already exist (409)
    if (!err.includes("already exists")) {
      throw new Error(`Failed to create Pages project: ${err}`);
    }
  }

  const projectData = await projectRes.json() as { result?: { id: string } };
  const projectId = projectData.result?.id ?? projectName;

  // Build minimal HTML for Direct Upload
  // Per §7-7: The template fetches content from /api/content endpoint dynamically
  const indexHtml = buildTemplateHtml(params.templateName, params.content, params.siteId, env);

  // Create FormData for Direct Upload
  const formData = new FormData();
  const htmlBlob = new Blob([indexHtml], { type: "text/html" });
  formData.append("index.html", htmlBlob, "index.html");

  // Deploy via Direct Upload
  const deployRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    }
  );

  if (!deployRes.ok) {
    const err = await deployRes.text();
    throw new Error(`Failed to deploy: ${err}`);
  }

  const deployData = await deployRes.json() as { result?: { id: string; url: string } };

  return {
    projectId,
    deploymentId: deployData.result?.id ?? "",
    url: `https://${params.subdomain}.${env.SITE_BASE_DOMAIN}`,
  };
}

function buildTemplateHtml(
  _template: TemplateName,
  content: SiteContent,
  _siteId: string,
  _env: Env
): string {
  // MVP1: Server-rendered static HTML with content baked in
  // Phase 2+ will use §7-7 dynamic /api/content approach
  const features = content.features
    ?.map(
      (f) =>
        `<div class="feature"><h3>${f.title}</h3><p>${f.description}</p></div>`
    )
    .join("\n") ?? "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.meta?.title ?? content.heroTitle}</title>
  <meta name="description" content="${content.meta?.description ?? ""}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans JP', sans-serif; color: #1a1a1a; }
    .hero { background: linear-gradient(135deg, #080202 0%, #1a0808 100%); color: #e8d5b5; padding: 80px 20px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; color: #c9a84c; }
    .hero h2 { font-size: 1.2rem; font-weight: 300; margin-bottom: 24px; }
    .hero p { max-width: 600px; margin: 0 auto; line-height: 1.8; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 60px 20px; max-width: 960px; margin: 0 auto; }
    .feature { background: #f9f6f0; padding: 32px; border-radius: 8px; border-left: 4px solid #c9a84c; }
    .feature h3 { color: #080202; margin-bottom: 12px; }
    .feature p { line-height: 1.7; color: #555; }
    .about { background: #080202; color: #e8d5b5; padding: 60px 20px; text-align: center; }
    .about h2 { color: #c9a84c; margin-bottom: 16px; }
    .about p { max-width: 600px; margin: 0 auto; line-height: 1.8; }
    .contact { padding: 60px 20px; text-align: center; }
    .contact h2 { margin-bottom: 16px; }
    footer { background: #080202; color: #888; padding: 24px; text-align: center; font-size: 0.85rem; }
    footer a { color: #c9a84c; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&display=swap" rel="stylesheet">
</head>
<body>
  <section class="hero">
    <h1>${content.heroTitle}</h1>
    <h2>${content.heroSubtitle}</h2>
    <p>${content.heroDescription}</p>
  </section>
  <section class="features">${features}</section>
  <section class="about">
    <h2>${content.about?.title ?? "私たちについて"}</h2>
    <p>${content.about?.description ?? ""}</p>
    ${content.about?.mission ? `<p style="margin-top:16px;color:#c9a84c;">${content.about.mission}</p>` : ""}
  </section>
  <section class="contact">
    <h2>${content.contact?.title ?? "お問い合わせ"}</h2>
    <p>${content.contact?.description ?? ""}</p>
    ${content.contact?.email ? `<p><a href="mailto:${content.contact.email}">${content.contact.email}</a></p>` : ""}
  </section>
  <footer>
    <p>${content.footer?.copyright ?? ""}</p>
    <p style="margin-top:8px;">Powered by <a href="https://openclaw.com">OPENCLAW</a></p>
  </footer>
</body>
</html>`;
}
