import { describe, it, expect } from "vitest";
import { generateBatchId } from "../src/lib/batch-id.js";

describe("generateBatchId", () => {
  it("generates a batch ID with correct prefix", () => {
    const id = generateBatchId();
    expect(id).toMatch(/^batch-\d{8}-[a-z0-9]+$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateBatchId()));
    expect(ids.size).toBe(100);
  });

  it("includes current date", () => {
    const id = generateBatchId();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(id).toContain(today);
  });
});
