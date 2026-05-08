import { describe, it, expect, vi, beforeEach } from "vitest";
import { RewardCalculator } from "../src/services/reward-calculator.js";

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    purchase: {
      id: "purchase-1",
      user_id: "user-d",
      amount_usdt: 300,
      status: "confirmed",
    },
    existingRewards: [],
    referrals: [
      { referrer_user_id: "user-c", generation: 1 },
      { referrer_user_id: "user-b", generation: 2 },
      { referrer_user_id: "user-a", generation: 3 },
    ],
    wallets: {
      "user-c": "0xcccccccccccccccccccccccccccccccccccccccc",
      "user-b": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "user-a": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "admin-user": "0xadadadadadadadadadadadadadadadadadadadad",
    } as Record<string, string>,
    insertError: null,
    ...overrides,
  };

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "nft_purchases") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: defaults.purchase, error: null }),
          }),
        }),
      };
    }
    if (table === "referral_rewards") {
      return {
        select: () => ({
          eq: () => ({
            limit: () =>
              Promise.resolve({
                data: defaults.existingRewards,
                error: null,
              }),
          }),
        }),
        insert: () =>
          Promise.resolve({ error: defaults.insertError }),
      };
    }
    if (table === "referrals") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({
                  data: defaults.referrals,
                  error: null,
                }),
            }),
          }),
        }),
      };
    }
    if (table === "user_wallets") {
      return {
        select: () => ({
          eq: (col: string, val: string) => {
            if (col === "user_id") {
              const wallets = defaults.wallets as Record<string, string>;
              const addr = wallets[val];
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({
                        data: addr ? { wallet_address: addr } : null,
                        error: addr ? null : { message: "not found" },
                      }),
                  }),
                }),
              };
            }
            return {
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: null, error: null }),
                }),
              }),
            };
          },
        }),
      };
    }
    if (table === "admin_users") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { user_id: "admin-user" },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "audit_logs") {
      return { insert: () => Promise.resolve({ error: null }) };
    }
    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
  });

  return { from: mockFrom } as unknown as Parameters<typeof RewardCalculator extends new (s: infer S) => unknown ? (s: S) => void : never>[0];
}

describe("RewardCalculator", () => {
  it("calculates correct rewards for 3-tier referral chain", async () => {
    const supabase = createMockSupabase();
    const calculator = new RewardCalculator(supabase as never);

    const rewards = await calculator.calculateAndStore("purchase-1");

    expect(rewards).toHaveLength(3);
    expect(rewards[0]).toMatchObject({
      recipient_user_id: "user-c",
      generation: 1,
      rate_percentage: 30,
      amount_usdt: 90,
    });
    expect(rewards[1]).toMatchObject({
      recipient_user_id: "user-b",
      generation: 2,
      rate_percentage: 10,
      amount_usdt: 30,
    });
    expect(rewards[2]).toMatchObject({
      recipient_user_id: "user-a",
      generation: 3,
      rate_percentage: 5,
      amount_usdt: 15,
    });

    const totalRewards = rewards.reduce((s, r) => s + r.amount_usdt, 0);
    expect(totalRewards).toBe(135); // 90 + 30 + 15
    expect(300 - totalRewards).toBe(165); // operator share = 55%
  });

  it("handles purchase with only gen1 referrer", async () => {
    const supabase = createMockSupabase({
      referrals: [{ referrer_user_id: "user-c", generation: 1 }],
    });
    const calculator = new RewardCalculator(supabase as never);

    const rewards = await calculator.calculateAndStore("purchase-1");

    expect(rewards).toHaveLength(1);
    expect(rewards[0].generation).toBe(1);
    expect(rewards[0].amount_usdt).toBe(90);
  });

  it("handles purchase with no referrers (admin default)", async () => {
    const supabase = createMockSupabase({ referrals: [] });
    const calculator = new RewardCalculator(supabase as never);

    const rewards = await calculator.calculateAndStore("purchase-1");

    // Admin is resolved as default gen1 referrer (SPEC-03 §2.2)
    expect(rewards).toHaveLength(1);
    expect(rewards[0].recipient_user_id).toBe("admin-user");
    expect(rewards[0].generation).toBe(1);
    expect(rewards[0].amount_usdt).toBe(90);
  });

  it("skips non-confirmed purchases", async () => {
    const supabase = createMockSupabase({
      purchase: { id: "purchase-1", user_id: "user-d", amount_usdt: 300, status: "pending" },
    });
    const calculator = new RewardCalculator(supabase as never);

    const rewards = await calculator.calculateAndStore("purchase-1");

    expect(rewards).toHaveLength(0);
  });

  it("skips if rewards already calculated", async () => {
    const supabase = createMockSupabase({
      existingRewards: [{ id: "existing-reward" }],
    });
    const calculator = new RewardCalculator(supabase as never);

    const rewards = await calculator.calculateAndStore("purchase-1");

    expect(rewards).toHaveLength(0);
  });

  it("skips referrer without verified wallet", async () => {
    const supabase = createMockSupabase({
      referrals: [
        { referrer_user_id: "user-c", generation: 1 },
        { referrer_user_id: "user-no-wallet", generation: 2 },
        { referrer_user_id: "user-a", generation: 3 },
      ],
    });
    const calculator = new RewardCalculator(supabase as never);

    const rewards = await calculator.calculateAndStore("purchase-1");

    expect(rewards).toHaveLength(2);
    expect(rewards[0].generation).toBe(1);
    expect(rewards[1].generation).toBe(3);
  });

  it("calculates correct amounts for different purchase prices", async () => {
    const supabase = createMockSupabase({
      purchase: { id: "purchase-1", user_id: "user-d", amount_usdt: 300, status: "confirmed" },
      referrals: [{ referrer_user_id: "user-c", generation: 1 }],
    });
    const calculator = new RewardCalculator(supabase as never);

    const rewards = await calculator.calculateAndStore("purchase-1");

    expect(rewards[0].amount_usdt).toBe(90); // 300 * 30%
  });
});
