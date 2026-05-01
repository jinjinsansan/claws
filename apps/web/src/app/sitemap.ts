import { MetadataRoute } from "next";
import charactersIndex from "@openclaw/characters/data/index.json";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://openclaw.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/claws`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/academy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/legal/tokushoho`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const characterPages: MetadataRoute.Sitemap = charactersIndex.map((c) => {
    const slug = `${String(c.claw_no).padStart(2, "0")}-${c.name_romaji}`;
    return {
      url: `${BASE_URL}/claws/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    };
  });

  return [...staticPages, ...characterPages];
}
