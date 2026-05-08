import { describe, it, expect, vi } from "vitest";
import { SyncProcessor } from "../src/services/sync-processor.js";

vi.mock("../src/services/ownership-checker.js", () => ({
  OwnershipChecker: vi.fn().mockImplementation(() => ({
    getOnChainOwner: vi.fn().mockImplementation((tokenId: number) => {
      if (tokenId === 1) return Promise.resolve("0xnewowner1");
      if (tokenId === 2) return Promise.resolve("0xoriginalowner2");
      if (tokenId === 3) return Promise.resolve(null);
      return Promise.resolve("0xoriginal");
    }),
  })),
}));

function createMockSupabase(tokens: Array<Record<string, unknown>>) {
  const updateCalls: Array<Record<string, unknown>> = [];
  const insertCalls: Array<Record<string, unknown>> = [];

  return {
    client: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "nft_tokens") {
          return {
            select: (sel: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.head) {
                return {
                  eq: () => ({
                    eq: () => ({
                      neq: () => Promise.resolve({ count: 0, error: null }),
                    }),
                  }),
                };
              }
              return {
                eq: () => Promise.resolve({ data: tokens, error: null }),
              };
            },
            update: (data: Record<string, unknown>) => {
              updateCalls.push(data);
              return { eq: () => Promise.resolve({ error: null }) };
            },
          };
        }
        if (table === "user_wallets") {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { user_id: "new-user" }, error: null }),
              }),
            }),
          };
        }
        if (table === "user_sites") {
          return {
            update: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            }),
          };
        }
        if (table === "audit_logs" || table === "push_notifications") {
          return {
            insert: (data: Record<string, unknown>) => {
              insertCalls.push(data);
              return Promise.resolve({ error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      }),
    },
    updateCalls,
    insertCalls,
  };
}

describe("SyncProcessor", () => {
  const mockEnv = {
    POLYGON_RPC_URL: "https://rpc.test",
    NFT_CONTRACT_ADDRESS: "0xcontract",
  } as never;

  it("detects ownership transfer", async () => {
    const tokens = [
      { id: "t1", token_id: 1, owner_wallet_address: "0xoriginalowner1", owner_user_id: "user-1", claw_id: "c1", claw_no: 1, is_active: true },
    ];
    const { client } = createMockSupabase(tokens);
    const processor = new SyncProcessor(client as never, mockEnv);

    const result = await processor.syncAll();

    expect(result.total_checked).toBe(1);
    expect(result.transfers_detected).toBe(1);
  });

  it("skips tokens with unchanged ownership", async () => {
    const tokens = [
      { id: "t2", token_id: 2, owner_wallet_address: "0xoriginalowner2", owner_user_id: "user-2", claw_id: "c2", claw_no: 2, is_active: true },
    ];
    const { client } = createMockSupabase(tokens);
    const processor = new SyncProcessor(client as never, mockEnv);

    const result = await processor.syncAll();

    expect(result.total_checked).toBe(1);
    expect(result.transfers_detected).toBe(0);
  });

  it("counts errors for unreachable tokens", async () => {
    const tokens = [
      { id: "t3", token_id: 3, owner_wallet_address: "0xowner3", owner_user_id: "user-3", claw_id: "c3", claw_no: 3, is_active: true },
    ];
    const { client } = createMockSupabase(tokens);
    const processor = new SyncProcessor(client as never, mockEnv);

    const result = await processor.syncAll();

    expect(result.total_checked).toBe(1);
    expect(result.errors).toBe(1);
  });

  it("handles empty token list", async () => {
    const { client } = createMockSupabase([]);
    const processor = new SyncProcessor(client as never, mockEnv);

    const result = await processor.syncAll();

    expect(result.total_checked).toBe(0);
    expect(result.transfers_detected).toBe(0);
  });
});
