// t242 — U6 election-skill guards (Bolt 5, FR-8a). The SKILL must stay a thin
// directive-forwarding wrapper: no election-procedure vocabulary (the protocol
// source of truth is the TS state machine — FR-0), a fixed 4-section structure,
// and explicit human delegation with no auto-resolution language.
// Layer: integration (reads the tracked SKILL.md — a fixed repo file).
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "packages",
  "framework",
  "core",
  "skills",
  "amadeus-election",
  "SKILL.md",
);
const ROOT = join(import.meta.dir, "..", "..");

// Canonical forbidden-vocabulary set (BR-K1, single definition — the four
// rule categories of FR-8a: GoA tally rules, thresholds/sides, shuffle
// procedure, tally condition branches). Vocabulary is chosen to avoid
// colliding with the SKILL's own legitimate transfer-loop words
// (vocabulary-collision-vacuity-guard: the vacuity test below proves the
// predicate still fires on rule sentences).
const FORBIDDEN_VOCABULARY: readonly string[] = [
  // GoA aggregation rules
  "賛成側",
  "反対側",
  "定足数",
  "多数決",
  "GoA 1-3",
  "1-3/6",
  "7-8",
  // thresholds / hold conditions
  "2票以上",
  "1票でも",
  "同数",
  "quorum-short",
  "discussion-needed",
  // shuffle procedure
  "シャッフル",
  "シード",
  "fnv1a",
  "mulberry32",
  "表示順",
  // tally condition branches
  "開票条件",
  "early tally",
  "タイ",
];

function forbiddenHits(text: string): string[] {
  return FORBIDDEN_VOCABULARY.filter((word) => text.includes(word));
}

const REQUIRED_SECTIONS = ["## 起動", "## 転送", "## 人間委譲", "## 終了"] as const;

describe("t242 election skill guards (FR-8a)", () => {
  const skill = readFileSync(SKILL_PATH, "utf8");

  test("BR-K1: the tracked SKILL.md contains none of the forbidden rule vocabulary", () => {
    expect(forbiddenHits(skill)).toEqual([]);
  });

  test("BR-K1 falling proof: injecting a rule sentence turns the predicate red", () => {
    const injected = `${skill}\n開票は賛成側が反対側を上回り定足数を満たしたときに行う。\n`;
    const hits = forbiddenHits(injected);
    expect(hits.length).toBeGreaterThanOrEqual(3); // 賛成側/反対側/定足数
  });

  test("BR-K2 vacuity guard: the predicate is not silenced by the SKILL's own boilerplate", () => {
    // A document made ONLY of the SKILL's structural boilerplate (headings +
    // frontmatter) must pass, while a single rule word appended to that same
    // boilerplate must fail — proving the predicate neither always-fires on
    // the template nor got emptied by vocabulary collision.
    const boilerplate = REQUIRED_SECTIONS.join("\n");
    expect(forbiddenHits(boilerplate)).toEqual([]);
    expect(forbiddenHits(`${boilerplate}\nシャッフル`)).toEqual(["シャッフル"]);
  });

  test("BR-K3: the SKILL keeps the 4-section structure (起動/転送/人間委譲/終了)", () => {
    for (const section of REQUIRED_SECTIONS) {
      expect(skill).toContain(section);
    }
    // exactly these H2 sections, in order
    const h2 = skill.split("\n").filter((l) => l.startsWith("## "));
    expect(h2).toEqual([...REQUIRED_SECTIONS]);
  });

  test("BR-K4: human delegation is explicit and no auto-resolution language appears", () => {
    expect(skill).toContain("人間の裁定事項");
    expect(skill).toContain("このスキルは次の一手を自分で決めない");
    for (const auto of ["自動で解決", "自動解決", "スキルが判断", "自分で裁定"]) {
      expect(skill.includes(auto)).toBe(false);
    }
  });

  test("FR-2b: the canonical skill uses only the harness-relative election CLI token", () => {
    const skill = readFileSync(SKILL_PATH, "utf8");
    expect(skill).toContain("{{HARNESS_DIR}}/tools/amadeus-election.ts");
    expect(skill).not.toContain("scripts/amadeus-election.ts");
  });

  test("FR-2d: compatibility requires bun and no repository checkout", () => {
    const skill = readFileSync(SKILL_PATH, "utf8");
    expect(skill).toContain("compatibility: Requires bun;");
    expect(skill).not.toContain("repository checkout");
  });

  test("FR-2a: the contrib source is gone after promotion", () => {
    expect(existsSync(join(ROOT, "contrib", "skills", "amadeus-election"))).toBe(false);
  });

  test("FR-2c: generated Claude and Codex skills resolve their own harness paths", () => {
    const claude = readFileSync(join(ROOT, ".claude", "skills", "amadeus-election", "SKILL.md"), "utf8");
    const codex = readFileSync(join(ROOT, ".agents", "skills", "amadeus-election", "SKILL.md"), "utf8");
    expect(claude).toContain(".claude/tools/amadeus-election.ts");
    expect(codex).toContain(".codex/tools/amadeus-election.ts");
    expect(claude).not.toContain("{{HARNESS_DIR}}");
    expect(codex).not.toContain("{{HARNESS_DIR}}");
  });

  test("FR-2c: non-target harness distributions do not receive the election skill", () => {
    for (const [harness, dir] of [
      ["cursor", ".cursor"],
      ["kiro", ".kiro"],
      ["kiro-ide", ".kiro"],
      ["opencode", ".opencode"],
    ] as const) {
      expect(
        existsSync(join(ROOT, "dist", harness, dir, "skills", "amadeus-election")),
      ).toBe(false);
    }
  });
});
