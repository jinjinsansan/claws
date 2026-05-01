export interface Env {
  HP_GENERATOR_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_ZONE_ID: string;
  SITE_BASE_DOMAIN: string;
}

export type SiteStatus = "draft" | "published" | "suspended";

export type TemplateName =
  | "default"
  | "restaurant"
  | "salon"
  | "consultant"
  | "creator"
  | "community";

export interface GenerateRequest {
  userId: string;
  clawId: string;
  clawNo: number;
  businessName: string;
  businessType: string;
  businessDescription: string;
  templatePreference?: TemplateName;
}

export interface UpdateRequest {
  siteId: string;
  userId: string;
  instructions: string;
}

export interface SiteRecord {
  id: string;
  user_id: string;
  claw_id: string;
  subdomain: string;
  business_name: string;
  business_type: string;
  business_description: string | null;
  template_name: TemplateName;
  content: SiteContent;
  status: SiteStatus;
  cloudflare_pages_project_id: string | null;
  current_deployment_id: string | null;
  deployed_at: string | null;
  created_at: string;
}

export interface SiteContent {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  features: { title: string; description: string; icon?: string }[];
  about: {
    title: string;
    description: string;
    mission?: string;
  };
  contact: {
    title: string;
    description: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  footer: {
    copyright: string;
    links?: { label: string; url: string }[];
  };
  meta: {
    title: string;
    description: string;
    ogImage?: string;
  };
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}
