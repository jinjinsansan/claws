import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteRecord, SiteContent, SiteStatus, TemplateName } from "../types.js";

export async function createSite(
  supabase: SupabaseClient,
  params: {
    userId: string;
    clawId: string;
    subdomain: string;
    businessName: string;
    businessType: string;
    businessDescription: string;
    templateName: TemplateName;
  }
): Promise<SiteRecord> {
  const { data, error } = await supabase
    .from("user_sites")
    .insert({
      user_id: params.userId,
      claw_id: params.clawId,
      subdomain: params.subdomain,
      business_name: params.businessName,
      business_type: params.businessType,
      business_description: params.businessDescription,
      template_name: params.templateName,
      status: "draft",
      content: {},
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create site: ${error.message}`);
  return data as SiteRecord;
}

export async function updateSiteContent(
  supabase: SupabaseClient,
  siteId: string,
  content: SiteContent
): Promise<void> {
  const { error } = await supabase
    .from("user_sites")
    .update({ content })
    .eq("id", siteId);
  if (error) throw new Error(`Failed to update content: ${error.message}`);
}

export async function updateSiteStatus(
  supabase: SupabaseClient,
  siteId: string,
  status: SiteStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const update: Record<string, unknown> = { status, ...extra };
  if (status === "published") update.deployed_at = new Date().toISOString();

  const { error } = await supabase
    .from("user_sites")
    .update(update)
    .eq("id", siteId);
  if (error) throw new Error(`Failed to update status: ${error.message}`);
}

export async function getSiteById(
  supabase: SupabaseClient,
  siteId: string
): Promise<SiteRecord | null> {
  const { data } = await supabase
    .from("user_sites")
    .select("*")
    .eq("id", siteId)
    .single();
  return data as SiteRecord | null;
}

export async function getSiteByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<SiteRecord | null> {
  const { data } = await supabase
    .from("user_sites")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data as SiteRecord | null;
}

export async function suspendSite(
  supabase: SupabaseClient,
  siteId: string,
  reason: string
): Promise<void> {
  await updateSiteStatus(supabase, siteId, "suspended", { suspended_reason: reason });
}

export function generateSubdomain(businessName: string, userId: string): string {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "")
    .slice(0, 20);
  const hash = userId.slice(0, 8);
  return `${slug || "site"}-${hash}`;
}
