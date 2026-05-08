import { describe, it, expect, vi } from "vitest";
import { ReferralTreeService } from "../src/services/referral-tree.js";

function createMockSupabase(referrals: Array<{ referrer_user_id: string; generation: number }>) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "referrals") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: referrals, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "user_wallets") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { wallet_address: `0x${val.replace("user-", "")}` },
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  };
}

describe("ReferralTreeService", () => {
  it("returns full 3-gen chain", async () => {
    const supabase = createMockSupabase([
      { referrer_user_id: "user-c", generation: 1 },
      { referrer_user_id: "user-b", generation: 2 },
      { referrer_user_id: "user-a", generation: 3 },
    ]);
    const service = new ReferralTreeService(supabase as never);

    const chain = await service.getReferrerChain("user-d");

    expect(chain.gen1).toEqual({ id: "user-c" });
    expect(chain.gen2).toEqual({ id: "user-b" });
    expect(chain.gen3).toEqual({ id: "user-a" });
  });

  it("returns partial chain when fewer than 3 referrers", async () => {
    const supabase = createMockSupabase([
      { referrer_user_id: "user-c", generation: 1 },
    ]);
    const service = new ReferralTreeService(supabase as never);

    const chain = await service.getReferrerChain("user-d");

    expect(chain.gen1).toEqual({ id: "user-c" });
    expect(chain.gen2).toBeNull();
    expect(chain.gen3).toBeNull();
  });

  it("returns empty chain when no referrers", async () => {
    const supabase = createMockSupabase([]);
    const service = new ReferralTreeService(supabase as never);

    const chain = await service.getReferrerChain("user-d");

    expect(chain.gen1).toBeNull();
    expect(chain.gen2).toBeNull();
    expect(chain.gen3).toBeNull();
  });

  it("retrieves user wallet address", async () => {
    const supabase = createMockSupabase([]);
    const service = new ReferralTreeService(supabase as never);

    const wallet = await service.getUserWallet("user-c");

    expect(wallet).toBe("0xc");
  });
});
