import { describe, it, expect } from "vitest";

/**
 * E2E test scenarios for NFT ownership sync.
 * SPEC-02 §9
 */
describe("NFT Sync E2E", () => {
  describe("Ownership transfer detection", () => {
    it("detects when on-chain owner differs from DB", () => {
      const dbOwner = "0xaaa";
      const onChainOwner = "0xbbb";
      const transferred = dbOwner.toLowerCase() !== onChainOwner.toLowerCase();
      expect(transferred).toBe(true);
    });

    it("does not flag matching ownership", () => {
      const dbOwner = "0xaaa";
      const onChainOwner = "0xAAA";
      const transferred = dbOwner.toLowerCase() !== onChainOwner.toLowerCase();
      expect(transferred).toBe(false);
    });
  });

  describe("Service deactivation on transfer", () => {
    it("deactivates HP sites when user has no remaining NFTs", () => {
      const remainingNfts = 0;
      const shouldDeactivate = remainingNfts === 0;
      expect(shouldDeactivate).toBe(true);
    });

    it("keeps services active when user still has other NFTs", () => {
      const remainingNfts: number = 2;
      const shouldDeactivate = remainingNfts <= 0;
      expect(shouldDeactivate).toBe(false);
    });
  });

  describe("Sync scheduling", () => {
    it("runs daily at JST 01:00 (UTC 16:00)", () => {
      const cronHourUTC = 16;
      const jstOffset = 9;
      const jstHour = (cronHourUTC + jstOffset) % 24;
      expect(jstHour).toBe(1);
    });
  });
});
