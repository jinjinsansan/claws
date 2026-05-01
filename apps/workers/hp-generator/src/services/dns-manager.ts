import type { Env } from "../types.js";

export async function createSubdomainCname(
  env: Env,
  subdomain: string,
  pagesProjectName: string
): Promise<void> {
  const fqdn = `${subdomain}.${env.SITE_BASE_DOMAIN}`;
  const target = `${pagesProjectName}.pages.dev`;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "CNAME",
        name: fqdn,
        content: target,
        proxied: true,
        ttl: 1, // auto
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    // Record might already exist (81057)
    if (!err.includes("already exists")) {
      throw new Error(`Failed to create DNS record: ${err}`);
    }
  }
}

export async function deleteSubdomainCname(
  env: Env,
  subdomain: string
): Promise<void> {
  const fqdn = `${subdomain}.${env.SITE_BASE_DOMAIN}`;

  // Find record
  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records?name=${fqdn}&type=CNAME`,
    {
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
    }
  );

  if (!listRes.ok) return;

  const listData = await listRes.json() as { result?: { id: string }[] };
  const records = listData.result ?? [];

  for (const record of records) {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records/${record.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      }
    );
  }
}
