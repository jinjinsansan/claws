import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  const entries = sitemap();

  it("has 35 entries (5 static + 30 characters)", () => {
    expect(entries).toHaveLength(35);
  });

  it("includes root URL with priority 1.0", () => {
    const root = entries.find((e) => !e.url.includes("/claws") && !e.url.includes("/academy") && !e.url.includes("/legal"));
    expect(root).toBeDefined();
    expect(root!.priority).toBe(1.0);
  });

  it("includes all 30 character detail pages", () => {
    const charPages = entries.filter((e) => e.url.match(/\/claws\/\d{2}-/));
    expect(charPages).toHaveLength(30);
  });

  it("includes /academy", () => {
    const academy = entries.find((e) => e.url.endsWith("/academy"));
    expect(academy).toBeDefined();
  });

  it("all entries have valid URLs", () => {
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https?:\/\//);
    }
  });
});
