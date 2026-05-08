import { describe, it, expect } from "vitest";
import { convertToCSV } from "../src/lib/csv.js";

describe("convertToCSV", () => {
  it("converts simple data to CSV", () => {
    const data = [
      { id: "1", name: "Alice", amount: 100 },
      { id: "2", name: "Bob", amount: 200 },
    ];

    const csv = convertToCSV(data);

    expect(csv).toBe("id,name,amount\n1,Alice,100\n2,Bob,200");
  });

  it("handles empty array", () => {
    expect(convertToCSV([])).toBe("");
  });

  it("escapes commas in values", () => {
    const data = [{ id: "1", note: "hello, world" }];
    const csv = convertToCSV(data);
    expect(csv).toBe('id,note\n1,"hello, world"');
  });

  it("escapes quotes in values", () => {
    const data = [{ id: "1", note: 'say "hi"' }];
    const csv = convertToCSV(data);
    expect(csv).toBe('id,note\n1,"say ""hi"""');
  });

  it("handles null and undefined values", () => {
    const data = [{ id: "1", name: null, extra: undefined }];
    const csv = convertToCSV(data as Record<string, unknown>[]);
    expect(csv).toBe("id,name,extra\n1,,");
  });

  it("handles JSON objects in values", () => {
    const data = [{ id: "1", meta: { key: "val" } }];
    const csv = convertToCSV(data as Record<string, unknown>[]);
    // JSON contains quotes and braces, so it gets CSV-escaped with wrapping quotes
    expect(csv).toContain("meta");
    expect(csv).toContain("key");
    expect(csv).toContain("val");
  });
});
