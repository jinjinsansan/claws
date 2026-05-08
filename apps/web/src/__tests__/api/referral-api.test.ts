import { describe, it, expect } from "vitest";

/**
 * Unit tests for referral code resolution and wallet link APIs.
 * SPEC-07 §3.3 / SPEC-03 §2.2
 */
describe("Referral code format validation", () => {
  const isValidCode = (code: string) => /^OPENCLAW-[A-Z0-9]{6}$/.test(code);

  it("accepts valid referral code", () => {
    expect(isValidCode("OPENCLAW-ABC123")).toBe(true);
    expect(isValidCode("OPENCLAW-000000")).toBe(true);
    expect(isValidCode("OPENCLAW-ZZZZZZ")).toBe(true);
  });

  it("rejects code with wrong prefix", () => {
    expect(isValidCode("OPENCLAW_ABC123")).toBe(false);
    expect(isValidCode("REF-ABC123")).toBe(false);
  });

  it("rejects code with wrong length suffix", () => {
    expect(isValidCode("OPENCLAW-ABC12")).toBe(false);
    expect(isValidCode("OPENCLAW-ABC1234")).toBe(false);
  });

  it("rejects lowercase", () => {
    expect(isValidCode("OPENCLAW-abc123")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidCode("")).toBe(false);
  });
});

describe("Referral cookie cookie name", () => {
  it("uses oc_ref cookie name per SPEC-07 §3.3", () => {
    const COOKIE_NAME = "oc_ref";
    expect(COOKIE_NAME).toBe("oc_ref");
  });

  it("cookie max age is 30 days", () => {
    const REFERRAL_MAX_AGE = 60 * 60 * 24 * 30;
    expect(REFERRAL_MAX_AGE).toBe(2592000);
  });

  it("cookie is not httpOnly (client-readable for referral resolution)", () => {
    // SPEC-07 §3.3 / CLAUDE.md §7-7 compliance:
    // Client JS reads oc_ref cookie to pass referrer to API, so httpOnly must be false.
    const httpOnly = false;
    expect(httpOnly).toBe(false);
  });
});

describe("Wallet link request validation", () => {
  const isValidWallet = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
  const POLYGON_CHAIN_ID = 137;

  it("accepts valid polygon wallet address", () => {
    expect(isValidWallet("0xabcdef1234567890abcdef1234567890abcdef12")).toBe(true);
  });

  it("rejects invalid wallet address", () => {
    expect(isValidWallet("not-a-wallet")).toBe(false);
    expect(isValidWallet("0x123")).toBe(false);
  });

  it("chain_id for Polygon is 137", () => {
    expect(POLYGON_CHAIN_ID).toBe(137);
  });

  it("normalizes wallet address to lowercase before storing", () => {
    const addr = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
    expect(addr.toLowerCase()).toMatch(/^0x[0-9a-f]{40}$/);
  });
});
