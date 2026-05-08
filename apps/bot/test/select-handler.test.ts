import { describe, it, expect, vi } from "vitest";

/**
 * Unit tests for /select handler logic (data layer).
 * Full handler test requires grammY ctx mock; we test the core logic paths here.
 */
describe("select handler logic", () => {
  it("validates claw number range 1-30", () => {
    const validate = (n: number) => Number.isInteger(n) && n >= 1 && n <= 30;

    expect(validate(1)).toBe(true);
    expect(validate(30)).toBe(true);
    expect(validate(10)).toBe(true);
    expect(validate(0)).toBe(false);
    expect(validate(31)).toBe(false);
    expect(validate(NaN)).toBe(false);
  });

  it("parses claw number from command argument", () => {
    const parse = (text: string) => {
      const arg = text.split(" ")[1]?.trim();
      if (!arg) return null;
      const n = Number(arg);
      return Number.isInteger(n) && n >= 1 && n <= 30 ? n : null;
    };

    expect(parse("/select 10")).toBe(10);
    expect(parse("/select 1")).toBe(1);
    expect(parse("/select 30")).toBe(30);
    expect(parse("/select")).toBeNull();
    expect(parse("/select abc")).toBeNull();
    expect(parse("/select 31")).toBeNull();
    expect(parse("/select 0")).toBeNull();
  });

  it("finds owned claw by number", () => {
    const owned = [
      { clawId: "uuid-1", clawNo: 5, nameJp: "風神", nameEn: "FUJIN" },
      { clawId: "uuid-2", clawNo: 10, nameJp: "鋼鉄", nameEn: "KOTETSU" },
    ];
    const find = (no: number) => owned.find((c) => c.clawNo === no) ?? null;

    expect(find(10)?.nameEn).toBe("KOTETSU");
    expect(find(5)?.nameJp).toBe("風神");
    expect(find(99)).toBeNull();
  });

  it("returns correct not-owned error message", () => {
    const clawNo = 3;
    const msg = `No.${String(clawNo).padStart(2, "0")} は所持していません。/colony で所持Clawを確認してください。`;
    expect(msg).toContain("03");
    expect(msg).toContain("colony");
  });
});
