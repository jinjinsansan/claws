import { describe, it, expect, vi } from "vitest";
import { resolveTargets } from "../src/services/target-resolver.js";
import type { Notification } from "../src/types.js";

function mockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    title: "Test",
    message: "Test message",
    notification_type: "announcement",
    target_type: "all",
    target_filter: {},
    target_user_ids: null,
    from_claw_id: null,
    scheduled_for: null,
    status: "scheduled",
    ...overrides,
  };
}

function createMockSupabase(users: Array<{ id: string; telegram_user_id: number; email: string }>) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              not: () => Promise.resolve({ data: users, error: null }),
            }),
            in: () => ({
              not: () => Promise.resolve({ data: users, error: null }),
            }),
            gte: () => ({
              eq: () => ({
                not: () => Promise.resolve({ data: users, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "nft_tokens") {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                not: () =>
                  Promise.resolve({
                    data: users.map((u) => ({ owner_user_id: u.id })),
                    error: null,
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

describe("resolveTargets", () => {
  const testUsers = [
    { id: "user-1", telegram_user_id: 111, email: "a@test.com" },
    { id: "user-2", telegram_user_id: 222, email: "b@test.com" },
  ];

  it("resolves 'all' target type", async () => {
    const supabase = createMockSupabase(testUsers);
    const notification = mockNotification({ target_type: "all" });

    const targets = await resolveTargets(notification, supabase as never);

    expect(targets).toHaveLength(2);
    expect(targets[0].user_id).toBe("user-1");
    expect(targets[0].telegram_user_id).toBe(111);
  });

  it("resolves 'specific_users' target type", async () => {
    const supabase = createMockSupabase(testUsers);
    const notification = mockNotification({
      target_type: "specific_users",
      target_user_ids: ["user-1", "user-2"],
    });

    const targets = await resolveTargets(notification, supabase as never);

    expect(targets).toHaveLength(2);
  });

  it("resolves 'by_claw' target type", async () => {
    const supabase = createMockSupabase(testUsers);
    const notification = mockNotification({
      target_type: "by_claw",
      target_filter: { claw_ids: ["claw-1"] },
    });

    const targets = await resolveTargets(notification, supabase as never);

    expect(targets).toHaveLength(2);
  });

  it("resolves 'by_tier' target type", async () => {
    const supabase = createMockSupabase(testUsers);
    const notification = mockNotification({
      target_type: "by_tier",
      target_filter: { min_direct_referrals: 5 },
    });

    const targets = await resolveTargets(notification, supabase as never);

    expect(targets).toHaveLength(2);
  });

  it("returns empty array for empty by_claw filter", async () => {
    const supabase = createMockSupabase([]);
    const notification = mockNotification({
      target_type: "by_claw",
      target_filter: { claw_ids: [] },
    });

    const targets = await resolveTargets(notification, supabase as never);

    expect(targets).toHaveLength(0);
  });

  it("returns empty array for empty specific_users", async () => {
    const supabase = createMockSupabase([]);
    const notification = mockNotification({
      target_type: "specific_users",
      target_user_ids: [],
    });

    const targets = await resolveTargets(notification, supabase as never);

    expect(targets).toHaveLength(0);
  });
});
