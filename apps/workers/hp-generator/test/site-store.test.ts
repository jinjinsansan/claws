import { describe, it, expect } from "vitest";
import { generateSubdomain } from "../src/services/site-store.js";

describe("generateSubdomain", () => {
  it("generates subdomain from business name and user id", () => {
    const result = generateSubdomain("My Cafe", "abcdefgh-1234-5678-9012-123456789012");
    expect(result).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });

  it("strips non-alphanumeric characters", () => {
    const result = generateSubdomain("Café & Bar!!", "abcdefgh-1234");
    expect(result).not.toContain("&");
    expect(result).not.toContain("!");
  });

  it("limits slug length to 20 chars", () => {
    const result = generateSubdomain("a".repeat(50), "abcdefgh-1234");
    const slug = result.split("-")[0];
    expect(slug.length).toBeLessThanOrEqual(20);
  });

  it("uses fallback for empty business name", () => {
    const result = generateSubdomain("", "abcdefgh-1234");
    expect(result).toMatch(/^site-/);
  });

  it("includes user id hash suffix", () => {
    const result = generateSubdomain("test", "abcdefgh-1234");
    expect(result).toContain("abcdefgh");
  });

  it("handles Japanese characters in business name", () => {
    const result = generateSubdomain("焼肉太郎", "abcdefgh-1234");
    expect(result).toContain("abcdefgh");
  });
});
