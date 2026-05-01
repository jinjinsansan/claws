import { describe, it, expect } from "vitest";
import { ADMIN_EMAIL } from "@/lib/admin";

describe("admin config", () => {
  it("uses openclaw.com domain for default admin email", () => {
    expect(ADMIN_EMAIL).toContain("@openclaw.com");
  });

  it("does not reference ai-builders-lab", () => {
    expect(ADMIN_EMAIL).not.toContain("ai-builders-lab");
  });
});
