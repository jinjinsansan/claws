import { describe, it, expect } from "vitest";
import { config } from "@/middleware";

describe("middleware config", () => {
  it("protects /members/* routes", () => {
    expect(config.matcher).toContain("/members/:path*");
  });

  it("protects /admin/* routes", () => {
    expect(config.matcher).toContain("/admin/:path*");
  });

  it("handles /login route", () => {
    expect(config.matcher).toContain("/login");
  });

  it("handles /register route", () => {
    expect(config.matcher).toContain("/register");
  });
});
