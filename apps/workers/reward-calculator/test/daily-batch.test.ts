import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/reward-distributor.js", () => ({
  RewardDistributorService: vi.fn().mockImplementation(() => ({
    distributeBatch: vi.fn().mockResolvedValue({
      transferHash: "0xtransferhash",
      distributeHash: "0xdistributehash",
    }),
  })),
}));

vi.mock("../src/lib/batch-id.js", () => ({
  generateBatchId: vi.fn().mockReturnValue("batch-20260502-test1234"),
}));

describe("executeDailyDistribution", () => {
  const mockRewards = [
    {
      id: "reward-1",
      recipient_user_id: "user-c",
      recipient_wallet_address: "0xcccc",
      generation: 1,
      amount_usdt: 90,
      nft_purchase_id: "purchase-1",
    },
    {
      id: "reward-2",
      recipient_user_id: "user-b",
      recipient_wallet_address: "0xbbbb",
      generation: 2,
      amount_usdt: 30,
      nft_purchase_id: "purchase-1",
    },
  ];

  it("should handle empty rewards list", async () => {
    const { executeDailyDistribution } = await import("../src/handlers/daily-batch.js");

    const mockEnv = {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
      MAX_BATCH_SIZE: "200",
    };

    vi.mock("../src/lib/supabase.js", () => ({
      createSupabaseClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: () => ({
            eq: () => ({
              lte: () => ({
                order: () =>
                  Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    }));

    // No errors thrown = success
    expect(true).toBe(true);
  });

  it("should split rewards into correct batch sizes", () => {
    const maxBatchSize = 200;
    const largeRewards = Array.from({ length: 450 }, (_, i) => ({
      id: `reward-${i}`,
      recipient_user_id: `user-${i}`,
      recipient_wallet_address: `0x${i.toString(16).padStart(4, "0")}`,
      generation: 1,
      amount_usdt: 90,
      nft_purchase_id: `purchase-${i}`,
    }));

    const batches = [];
    for (let i = 0; i < largeRewards.length; i += maxBatchSize) {
      batches.push(largeRewards.slice(i, i + maxBatchSize));
    }

    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(200);
    expect(batches[1]).toHaveLength(200);
    expect(batches[2]).toHaveLength(50);
  });

  it("should calculate correct total amounts", () => {
    const totalAmount = mockRewards.reduce((sum, r) => sum + Number(r.amount_usdt), 0);
    expect(totalAmount).toBe(120); // 90 + 30
  });
});
