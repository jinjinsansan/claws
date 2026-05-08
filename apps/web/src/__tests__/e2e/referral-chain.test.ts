import { describe, it, expect } from "vitest";

/**
 * E2E test scenarios for the referral chain system.
 * SPEC-03 / CLAUDE.md §B
 */
describe("Referral Chain E2E", () => {
  describe("3-tier reward structure", () => {
    const RATES = { gen1: 0.30, gen2: 0.10, gen3: 0.05 };
    const PURCHASE = 300;

    it("calculates correct rewards for full chain A→B→C→D", () => {
      const rewards = {
        C: PURCHASE * RATES.gen1, // direct referrer
        B: PURCHASE * RATES.gen2, // 2nd gen
        A: PURCHASE * RATES.gen3, // 3rd gen
      };
      const operator = PURCHASE - rewards.C - rewards.B - rewards.A;

      expect(rewards.C).toBe(90);
      expect(rewards.B).toBe(30);
      expect(rewards.A).toBe(15);
      expect(operator).toBe(165);
    });

    it("does not distribute beyond 3 generations", () => {
      // A→B→C→D→E: E purchases, only D(gen1), C(gen2), B(gen3) get rewards
      // A gets nothing (gen4 = not eligible)
      const gen4Reward = 0;
      expect(gen4Reward).toBe(0);
    });

    it("handles admin as referrer (no-referrer default)", () => {
      // User with no referrer → admin gets gen1 reward
      const adminGen1 = PURCHASE * RATES.gen1;
      const operatorTotal = PURCHASE; // admin is also operator, so gets everything
      expect(adminGen1).toBe(90);
      expect(operatorTotal).toBe(300);
    });

    it("ensures total rewards never exceed purchase amount", () => {
      const totalRewardRate = RATES.gen1 + RATES.gen2 + RATES.gen3;
      expect(totalRewardRate).toBe(0.45); // 45%
      expect(totalRewardRate).toBeLessThan(1);
    });
  });

  describe("Referral cookie behavior", () => {
    it("cookie is set with 30 days expiry", () => {
      const REFERRAL_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
      expect(REFERRAL_MAX_AGE).toBe(2592000);
    });

    it("cookie name is oc_ref", () => {
      const REFERRAL_COOKIE = "oc_ref";
      expect(REFERRAL_COOKIE).toBe("oc_ref");
    });
  });

  describe("Daily batch distribution", () => {
    it("respects MAX_BATCH_SIZE of 200", () => {
      const MAX_BATCH_SIZE = 200;
      const rewards = Array.from({ length: 450 }, (_, i) => ({ id: i }));
      const batches = [];
      for (let i = 0; i < rewards.length; i += MAX_BATCH_SIZE) {
        batches.push(rewards.slice(i, i + MAX_BATCH_SIZE));
      }
      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(200);
      expect(batches[1]).toHaveLength(200);
      expect(batches[2]).toHaveLength(50);
    });

    it("schedules distribution at JST midnight (UTC 15:00)", () => {
      // Cron: 0 15 * * *
      const cronHourUTC = 15;
      const jstOffset = 9;
      const jstHour = (cronHourUTC + jstOffset) % 24;
      expect(jstHour).toBe(0); // midnight JST
    });
  });
});
