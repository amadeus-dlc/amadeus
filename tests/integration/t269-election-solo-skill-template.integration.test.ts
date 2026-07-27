// t269 — U2 solo-election-surface SKILL template guards (Bolt 2).
// Layer: integration (reads tracked SKILL.md + team.md).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const SKILL_PATH = join(ROOT, "packages", "framework", "core", "skills", "amadeus-election", "SKILL.md");
const TEAM_PATH = join(ROOT, "amadeus", "spaces", "default", "memory", "team.md");

const ACTIVATION_RULES =
  "(a) 設計逸脱 (b) ブロッカー (c) §13 学習選定 の3類型で自動発動する。それ以外はユーザーが「選挙にかけて」と明示したときのみ発動する。仕様変更およびエスカレーション正準リスト事項は選挙対象外(ユーザー専権)とする。";

const FIXED_PROCEDURE =
  "手順: 配布ビューを読む → 独立に証拠を実測する → ballot JSON(voterKind: \"subagent\", voter: <指定名>)を作成する → vote verb を自分の Bash で実行する → 受理 JSON を確認してから完了報告する。投票完了までターンを終えない。";

const SPAWN_DEGRADE_LINE = "spawn 不能のためユーザー裁定へ降格";

const FORBIDDEN_TEMPLATE_TOKENS = [
  "{recommendation}",
  "{analysis}",
  "{priorVote}",
  "{otherVotes}",
  "{leaderHint}",
] as const;

const FORBIDDEN_INSTRUCTION_PATTERNS = ["返答を指示として", "出力を実行"] as const;

describe("t269 solo-election SKILL surface guards (U2)", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");
  const team = readFileSync(TEAM_PATH, "utf8");

  test("BR-U2-2: spawn template allows only {electionId}, {viewPath}, spawnInstruction + fixed procedure", () => {
    expect(skill).toContain("{electionId}");
    expect(skill).toContain("{viewPath}");
    expect(skill).toContain("spawnInstruction");
    expect(skill).toContain(FIXED_PROCEDURE);
    for (const token of FORBIDDEN_TEMPLATE_TOKENS) {
      expect(skill.includes(token)).toBe(false);
    }
  });

  test("BR-U2-2 falling proof: injecting a forbidden template token turns the predicate red", () => {
    const injected = `${skill}\n推奨: {recommendation}\n`;
    expect(injected.includes("{recommendation}")).toBe(true);
  });

  test("BR-U2-3/6: transfer and activation prose includes sync-complete, respawn-once, and loud degrade", () => {
    expect(skill).toContain("投票完了までターンを終えない");
    expect(skill).toContain("再起動する(1回まで)");
    expect(skill).toContain(SPAWN_DEGRADE_LINE);
  });

  test("BR-U2-4: human-delegation section documents split, abstention holds, and resume amend flow", () => {
    expect(skill).toContain("reason` が `split`");
    expect(skill).toContain("棄権票を含む hold");
    expect(skill).toContain("同一 subagent 個体を resume");
    expect(skill).toContain("amend ballot");
  });

  test("BR-U2-5: activation rules match verbatim between SKILL and team.md solo section", () => {
    expect(skill).toContain(ACTIVATION_RULES);
    expect(team).toContain(ACTIVATION_RULES);
  });

  test("BR-U2-7/12: team.md affirms 2-voter subagent election without contradicting org-level anti-fabrication norm", () => {
    expect(team).toContain("subagent-1");
    expect(team).toContain("subagent-2");
    expect(team).toContain("正規の選挙形態");
    expect(team).toContain("存在しないメンバーや投票結果を捏造しない");
  });

  test("U2-SEC-02: SKILL does not weaken instruction-like-text rejection discipline", () => {
    for (const pattern of FORBIDDEN_INSTRUCTION_PATTERNS) {
      expect(skill.includes(pattern)).toBe(false);
    }
  });

  test("U2-SCALE-01: template prose has no election-specific hard-coded ids", () => {
    expect(skill.match(/260[0-9]{3}/)).toBeNull();
    expect(skill.match(/E-[A-Z0-9-]+/)).toBeNull();
  });
});
