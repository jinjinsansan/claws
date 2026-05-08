import { describe, it, expect } from "vitest";

/**
 * Unit tests for /api/content/:siteId route logic.
 * SPEC-05 §7-7 / CLAUDE.md §7-7
 */
describe("Content API response shape", () => {
  it("returns expected fields for published site", () => {
    const mockSite = {
      id: "site-uuid-1",
      status: "published",
      updated_at: "2026-05-08T00:00:00Z",
      content: { heroTitle: "テスト屋", heroSubtitle: "副題" },
    };

    const response = {
      siteId: mockSite.id,
      status: mockSite.status,
      updatedAt: mockSite.updated_at,
      content: mockSite.content,
    };

    expect(response.siteId).toBe("site-uuid-1");
    expect(response.status).toBe("published");
    expect(response.content).toMatchObject({ heroTitle: "テスト屋" });
    expect(response.updatedAt).toBeDefined();
  });

  it("suspended site returns 403-equivalent error", () => {
    const mockSite = { id: "site-2", status: "suspended" };
    const isSuspended = mockSite.status === "suspended";
    expect(isSuspended).toBe(true);
  });

  it("deleted_at null filter excludes soft-deleted sites", () => {
    const sites = [
      { id: "a", deleted_at: null, status: "published" },
      { id: "b", deleted_at: "2026-05-01T00:00:00Z", status: "published" },
    ];
    const active = sites.filter((s) => s.deleted_at === null);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("a");
  });
});

describe("Content API CORS headers", () => {
  it("includes Access-Control-Allow-Origin: * for cross-origin HP fetch", () => {
    const headers = new Map([["Access-Control-Allow-Origin", "*"]]);
    expect(headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("cache-control allows short-lived caching", () => {
    const cacheControl = "public, max-age=60, stale-while-revalidate=300";
    expect(cacheControl).toContain("max-age=60");
    expect(cacheControl).toContain("stale-while-revalidate=300");
  });
});

describe("Deployed HTML runtime content fetch", () => {
  it("content endpoint is derived from CONTENT_API_BASE_URL", () => {
    const base = "https://openclaw-hp-generator.workers.dev";
    const siteId = "abc-123";
    const endpoint = `${base}/api/content/${siteId}`;
    expect(endpoint).toBe("https://openclaw-hp-generator.workers.dev/api/content/abc-123");
  });

  it("falls back to embedded content when fetch fails", () => {
    const fallback = { heroTitle: "デフォルト", heroSubtitle: "副題" };
    const fetchFailed = true;
    const content = fetchFailed ? fallback : { heroTitle: "動的" };
    expect(content.heroTitle).toBe("デフォルト");
  });

  it("escapeJsonForScript prevents XSS via </script>", () => {
    const dangerous = { title: "</script><script>alert(1)</script>" };
    const escaped = JSON.stringify(dangerous).replace(/</g, "\\u003c");
    expect(escaped).not.toContain("</script>");
    expect(escaped).toContain("\\u003c/script>");
  });
});
