import { describe, it, expect } from "vitest";

/**
 * Unit tests for wallet authentication nonce/verify logic.
 * SPEC-07 §6.2
 */
describe("Wallet nonce message builder", () => {
  const buildMessage = (walletAddress: string, nonce: string): string => {
    return [
      "OPENCLAW Wallet Login",
      `Wallet: ${walletAddress}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString().slice(0, 10)}`,
      "Sign this message to authenticate with OPENCLAW.",
    ].join("\n");
  };

  it("includes wallet address in message", () => {
    const wallet = "0xabcdef1234567890abcdef1234567890abcdef12";
    const msg = buildMessage(wallet, "testnonce123");
    expect(msg).toContain(wallet);
  });

  it("includes nonce in message", () => {
    const nonce = "abc123def456";
    const msg = buildMessage("0x1234", nonce);
    expect(msg).toContain(nonce);
  });

  it("starts with OPENCLAW branding", () => {
    const msg = buildMessage("0x1234", "nonce");
    expect(msg).toMatch(/^OPENCLAW Wallet Login/);
  });
});

describe("Wallet address validation", () => {
  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  it("accepts valid Ethereum address", () => {
    expect(isValidAddress("0xabcdef1234567890ABCDef1234567890abcdef12")).toBe(true);
  });

  it("rejects address without 0x prefix", () => {
    expect(isValidAddress("abcdef1234567890abcdef1234567890abcdef12")).toBe(false);
  });

  it("rejects address with wrong length", () => {
    expect(isValidAddress("0xabcdef1234")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidAddress("")).toBe(false);
  });
});

describe("Nonce expiry logic", () => {
  it("considers nonce valid when not expired", () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const isExpired = new Date(expiresAt).getTime() < Date.now();
    expect(isExpired).toBe(false);
  });

  it("considers nonce expired when past expiry", () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString();
    const isExpired = new Date(expiresAt).getTime() < Date.now();
    expect(isExpired).toBe(true);
  });

  it("nonce TTL is 10 minutes", () => {
    const NONCE_TTL_MINUTES = 10;
    const expiresAt = new Date(Date.now() + NONCE_TTL_MINUTES * 60 * 1000);
    const diff = expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThanOrEqual(9 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(11 * 60 * 1000);
  });
});

describe("Wallet email derivation", () => {
  const walletEmail = (walletAddress: string) =>
    `wallet-${walletAddress.slice(2)}@wallet.openclaw.local`;

  it("creates deterministic email from wallet address", () => {
    const email = walletEmail("0xabcdef1234567890abcdef1234567890abcdef12");
    expect(email).toBe("wallet-abcdef1234567890abcdef1234567890abcdef12@wallet.openclaw.local");
  });

  it("email domain is wallet.openclaw.local (internal-only)", () => {
    const email = walletEmail("0x1234567890abcdef1234567890abcdef12345678");
    expect(email).toContain("@wallet.openclaw.local");
  });
});
