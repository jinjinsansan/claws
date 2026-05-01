import { describe, it, expect } from "vitest";
import { checkTone } from "../src/characters/tone-guard.js";
import type { ClawRecord } from "../src/types.js";

const makeClawRecord = (firstPerson: string, name = "テスト"): ClawRecord => ({
  id: "test-id",
  claw_no: 1,
  name_jp: name,
  name_en: "TEST",
  name_romaji: "test",
  category: "demon",
  dossier: { "First Person": firstPerson },
  image_url: null,
});

describe("checkTone", () => {
  it("passes when no violations found", () => {
    const claw = makeClawRecord("「俺」", "紅蓮");
    const result = checkTone(claw, "俺が主の商いを助ける。任せろ。");
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("detects forbidden global words", () => {
    const claw = makeClawRecord("「俺」");
    const result = checkTone(claw, "私はChatGPTです。何でも聞いてください。");
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes("ChatGPT"))).toBe(true);
  });

  it("detects AI identity disclosure", () => {
    const claw = makeClawRecord("「俺」");
    const result = checkTone(claw, "私はAIアシスタントとしてお手伝いします");
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes("AIアシスタント"))).toBe(true);
  });

  it("detects Claude mention", () => {
    const claw = makeClawRecord("「俺」");
    const result = checkTone(claw, "Claudeとして応答しています");
    expect(result.passed).toBe(false);
  });

  it("detects Anthropic mention", () => {
    const claw = makeClawRecord("「俺」");
    const result = checkTone(claw, "Anthropicが開発しました");
    expect(result.passed).toBe(false);
  });

  it("passes for character with correct first person pronoun", () => {
    const claw = makeClawRecord("「わたくし」");
    const result = checkTone(claw, "わたくしが主をお導きいたします。");
    expect(result.passed).toBe(true);
  });
});
