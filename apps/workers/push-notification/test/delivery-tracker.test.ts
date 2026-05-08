import { describe, it, expect, vi } from "vitest";
import { DeliveryTracker } from "../src/services/delivery-tracker.js";

describe("DeliveryTracker", () => {
  it("creates a delivery record", async () => {
    const insertFn = vi.fn().mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "delivery-1" }, error: null }),
      }),
    });

    const supabase = {
      from: vi.fn().mockReturnValue({ insert: insertFn }),
    };

    const tracker = new DeliveryTracker(supabase as never);
    const id = await tracker.createDelivery("notif-1", "user-1", 12345);

    expect(id).toBe("delivery-1");
    expect(supabase.from).toHaveBeenCalledWith("notification_deliveries");
  });

  it("marks delivery as delivered", async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });

    const supabase = {
      from: vi.fn().mockReturnValue({ update: updateFn }),
    };

    const tracker = new DeliveryTracker(supabase as never);
    await tracker.markDelivered("delivery-1", { telegram_message_id: 123 });

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: "delivered" }),
    );
  });

  it("marks delivery as failed", async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });

    const supabase = {
      from: vi.fn().mockReturnValue({ update: updateFn }),
    };

    const tracker = new DeliveryTracker(supabase as never);
    await tracker.markFailed("delivery-1", "Bot blocked");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", failed_reason: "Bot blocked" }),
    );
  });
});
