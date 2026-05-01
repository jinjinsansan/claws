import { describe, it, expect } from "vitest";
import { detectIntent } from "../src/services/intent-service.js";

describe("detectIntent", () => {
  it("detects HP generation intent", () => {
    expect(detectIntent("HP作って").intent).toBe("generate_hp");
    expect(detectIntent("ホームページ作成したい").intent).toBe("generate_hp");
    expect(detectIntent("サイト作って欲しい").intent).toBe("generate_hp");
  });

  it("detects SNS posting intent", () => {
    expect(detectIntent("Xに投稿して").intent).toBe("post_sns");
    expect(detectIntent("ツイートして").intent).toBe("post_sns");
  });

  it("detects help intent", () => {
    expect(detectIntent("ヘルプ").intent).toBe("help");
    expect(detectIntent("使い方を教えて").intent).toBe("help");
    expect(detectIntent("help").intent).toBe("help");
  });

  it("detects status intent", () => {
    expect(detectIntent("ステータス確認").intent).toBe("view_status");
    expect(detectIntent("アカウント情報").intent).toBe("view_status");
  });

  it("detects academy intent", () => {
    expect(detectIntent("アカデミーについて").intent).toBe("academy");
    expect(detectIntent("フレーズ教えて").intent).toBe("academy");
  });

  it("detects switch claw intent", () => {
    expect(detectIntent("キャラ変更したい").intent).toBe("switch_claw");
    expect(detectIntent("コロニー見せて").intent).toBe("switch_claw");
  });

  it("defaults to chat for unknown messages", () => {
    expect(detectIntent("こんにちは").intent).toBe("chat");
    expect(detectIntent("今日の売上どうかな").intent).toBe("chat");
  });

  it("returns high confidence for keyword matches", () => {
    expect(detectIntent("HP作って").confidence).toBe(0.9);
  });

  it("returns lower confidence for chat fallback", () => {
    expect(detectIntent("こんにちは").confidence).toBe(0.5);
  });
});
