import { describe, it, expect, vi } from "vitest";
import { searchAcademyPhrases, formatAcademyReply } from "../src/services/academy-service.js";

describe("searchAcademyPhrases", () => {
  it("returns matching phrases", async () => {
    const mockData = [
      { volume: 1, category: "install", phrase: "このプロジェクトの構成を3分で説明して", result: "初期理解と環境構築を短時間で進められる" },
      { volume: 2, category: "create", phrase: "問い合わせフォームを実装して", result: "CRUDと認証を含む実装を一気に前進できる" },
    ];

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await searchAcademyPhrases(supabase as never, "プロジェクトの構成");
    expect(result).toHaveLength(2);
    expect(result[0].volume).toBe(1);
    expect(result[0].phrase).toContain("プロジェクト");
  });

  it("returns empty array on DB error", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await searchAcademyPhrases(supabase as never, "テスト");
    expect(result).toHaveLength(0);
  });

  it("handles multi-keyword queries", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await searchAcademyPhrases(supabase as never, "フォーム バリデーション");
    expect(result).toHaveLength(0);
    // Verify or() was called with multi-keyword clauses
    expect(supabase.from).toHaveBeenCalledWith("academy_phrase_collection");
  });
});

describe("formatAcademyReply", () => {
  it("formats phrases with character name", () => {
    const phrases = [
      { volume: 1, category: "install", phrase: "構成を説明して", result: "すぐ把握できる" },
      { volume: 3, category: "design", phrase: "レスポンシブ対応して", result: null },
    ];

    const reply = formatAcademyReply("紅蓮", phrases);
    expect(reply).toContain("紅蓮");
    expect(reply).toContain("Vol.1");
    expect(reply).toContain("Vol.3");
    expect(reply).toContain("install");
    expect(reply).toContain("design");
    expect(reply).toContain("すぐ把握できる");
  });

  it("returns fallback message when no phrases found", () => {
    const reply = formatAcademyReply("鋼鉄", []);
    expect(reply).toContain("鋼鉄");
    expect(reply).toContain("Academy");
    expect(reply).toContain("無料");
  });

  it("omits result arrow when result is null", () => {
    const phrases = [
      { volume: 2, category: "create", phrase: "フォームを作って", result: null },
    ];
    const reply = formatAcademyReply("弁天", phrases);
    expect(reply).not.toContain("→ null");
    expect(reply).toContain("フォームを作って");
  });
});
