import { describe, it, expect } from "vitest";
import charactersIndex from "@openclaw/characters/data/index.json";
import type { ClawCategory } from "@openclaw/characters";

const VALID_CATEGORIES: ClawCategory[] = [
  "demon", "god", "wild", "robot", "human",
  "goddess", "temptress", "fluffy", "concierge", "friend",
];

describe("@openclaw/characters data", () => {
  it("has exactly 30 characters", () => {
    expect(charactersIndex).toHaveLength(30);
  });

  it("each character has sequential claw_no from 1 to 30", () => {
    const numbers = charactersIndex.map((c) => c.claw_no);
    expect(numbers).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("each character has required fields", () => {
    for (const c of charactersIndex) {
      expect(c.claw_no).toBeGreaterThanOrEqual(1);
      expect(c.claw_no).toBeLessThanOrEqual(30);
      expect(c.name_jp).toBeTruthy();
      expect(c.name_en).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(c.file).toBeTruthy();
    }
  });

  it("each character has a valid category", () => {
    for (const c of charactersIndex) {
      expect(VALID_CATEGORIES).toContain(c.category);
    }
  });

  it("all name_en values are unique", () => {
    const names = charactersIndex.map((c) => c.name_en);
    expect(new Set(names).size).toBe(30);
  });

  it("all claw_no values are unique", () => {
    const nos = charactersIndex.map((c) => c.claw_no);
    expect(new Set(nos).size).toBe(30);
  });

  it("image_filename is present and ends with .png", () => {
    for (const c of charactersIndex) {
      expect(c.image_filename).toBeTruthy();
      expect(c.image_filename).toMatch(/\.png$/);
    }
  });
});
