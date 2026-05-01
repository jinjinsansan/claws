import { describe, it, expect } from "vitest";
import { selectTemplate } from "../src/services/template-selector.js";

describe("selectTemplate", () => {
  it("returns preference when provided", () => {
    expect(selectTemplate("anything", 1, "salon")).toBe("salon");
  });

  it("selects restaurant for food businesses", () => {
    expect(selectTemplate("飲食店", 1)).toBe("restaurant");
    expect(selectTemplate("カフェ経営", 1)).toBe("restaurant");
    expect(selectTemplate("居酒屋", 1)).toBe("restaurant");
  });

  it("selects salon for beauty businesses", () => {
    expect(selectTemplate("美容サロン", 1)).toBe("salon");
    expect(selectTemplate("エステ", 1)).toBe("salon");
    expect(selectTemplate("ネイルサロン", 1)).toBe("salon");
  });

  it("selects consultant for professional services", () => {
    expect(selectTemplate("コンサルティング", 1)).toBe("consultant");
    expect(selectTemplate("弁護士事務所", 1)).toBe("consultant");
    expect(selectTemplate("税理士", 1)).toBe("consultant");
  });

  it("selects creator for creative businesses", () => {
    expect(selectTemplate("ハンドメイド作家", 1)).toBe("creator");
    expect(selectTemplate("デザイン事務所", 1)).toBe("creator");
  });

  it("selects community for community businesses", () => {
    expect(selectTemplate("コミュニティ運営", 1)).toBe("community");
  });

  it("uses character affinity when no keyword match", () => {
    // Claw No.6 (大黒天) → restaurant affinity
    expect(selectTemplate("一般的な商売", 6)).toBe("restaurant");
    // Claw No.16 (月読) → salon affinity
    expect(selectTemplate("一般的な商売", 16)).toBe("salon");
    // Claw No.13 (武一) → consultant affinity
    expect(selectTemplate("一般的な商売", 13)).toBe("consultant");
  });

  it("defaults to default template", () => {
    expect(selectTemplate("特殊な業種", 1)).toBe("default");
  });
});
