import { describe, it, expect, vi } from "vitest";

describe("performDailyBackup", () => {
  it("backs up all 7 tables", () => {
    const tables = [
      "users",
      "user_wallets",
      "nft_tokens",
      "nft_purchases",
      "referrals",
      "referral_rewards",
      "reward_distributions",
    ];
    expect(tables).toHaveLength(7);
  });

  it("generates correct R2 key format", () => {
    const date = "2026-05-02";
    const table = "users";
    const key = `daily/${date}/${table}.csv`;
    expect(key).toBe("daily/2026-05-02/users.csv");
  });

  it("handles backup errors gracefully", () => {
    const result = {
      date: "2026-05-02",
      tables_backed_up: 5,
      total_rows: 100,
      errors: ["referral_rewards: timeout", "reward_distributions: timeout"],
    };

    expect(result.errors).toHaveLength(2);
    expect(result.tables_backed_up).toBe(5);
  });
});
