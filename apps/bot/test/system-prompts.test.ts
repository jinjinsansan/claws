import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../src/characters/system-prompts.js";
import type { ClawRecord } from "../src/types.js";

const gurenClaw: ClawRecord = {
  id: "test-guren",
  claw_no: 1,
  name_jp: "紅蓮",
  name_en: "GUREN",
  name_romaji: "guren",
  category: "demon",
  dossier: {
    Personality: "情熱的・直球・迷いなし・押しの強さ",
    "First Person": "「俺」",
    Tone: "力強く、断定的。語尾は短く、命令形を好む。",
    Catchphrase: "「掴め、燃やせ、奪い取れ。」",
    "Best For": "攻めの集客／競争市場",
    Industries: "ナイト系・スポーツジム",
  },
  image_url: null,
};

describe("buildSystemPrompt", () => {
  it("includes character name", () => {
    const prompt = buildSystemPrompt(gurenClaw);
    expect(prompt).toContain("紅蓮");
    expect(prompt).toContain("GUREN");
  });

  it("includes first person pronoun rule", () => {
    const prompt = buildSystemPrompt(gurenClaw);
    expect(prompt).toContain("「俺」");
  });

  it("includes personality", () => {
    const prompt = buildSystemPrompt(gurenClaw);
    expect(prompt).toContain("情熱的");
  });

  it("includes tone description", () => {
    const prompt = buildSystemPrompt(gurenClaw);
    expect(prompt).toContain("力強く、断定的");
  });

  it("includes catchphrase", () => {
    const prompt = buildSystemPrompt(gurenClaw);
    expect(prompt).toContain("掴め、燃やせ、奪い取れ");
  });

  it("includes conversation rules", () => {
    const prompt = buildSystemPrompt(gurenClaw);
    expect(prompt).toContain("主（ぬし）");
    expect(prompt).toContain("200文字以内");
    expect(prompt).toContain("AI・ChatGPT・Claude であることを認めること");
  });

  it("includes claw number", () => {
    const prompt = buildSystemPrompt(gurenClaw);
    expect(prompt).toContain("No.01");
  });
});
