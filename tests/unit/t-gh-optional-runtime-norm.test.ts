import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPOSITORY_ROOT = join(import.meta.dir, "../..");
const PROJECT_RULES_PATH = join(
  REPOSITORY_ROOT,
  "amadeus/spaces/default/memory/project.md",
);
const BUSINESS_LOGIC_MODEL_PATH = join(
  REPOSITORY_ROOT,
  "amadeus/spaces/default/intents/260719-mirror-productization/construction/gh-optional-runtime-norm/functional-design/business-logic-model.md",
);
const TARGET_CID = "practices-discovery:gh-scripts-boundary";
const LEGACY_CLAUSE =
  "scripts/ 配下の repo ローカル開発支援ツールに限定";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalClause(design: string): string {
  const match = design.match(
    /置換後のcanonical clause:\s*\n\s*>\s*(.+)\n/,
  );
  if (!match?.[1]) {
    throw new Error("canonical gh optional runtime clause is missing");
  }
  return normalizeWhitespace(match[1]);
}

function targetClause(projectRules: string): string {
  const lines = projectRules
    .split("\n")
    .filter((line) => line.includes(`cid:${TARGET_CID}`));
  expect(lines).toHaveLength(1);
  return normalizeWhitespace(
    lines[0]
      .replace(/^\s*-\s*/, "")
      .replace(/\s*<!--\s*cid:[^>]+-->\s*$/, ""),
  );
}

describe("gh optional runtime project norm", () => {
  const projectRules = readFileSync(PROJECT_RULES_PATH, "utf8");
  const design = readFileSync(BUSINESS_LOGIC_MODEL_PATH, "utf8");

  test("replaces the unique CID rule with the exact canonical clause", () => {
    expect(projectRules.match(new RegExp(`cid:${TARGET_CID}`, "g"))).toHaveLength(
      1,
    );
    expect(projectRules).not.toContain(LEGACY_CLAUSE);
    expect(targetClause(projectRules)).toBe(canonicalClause(design));
  });

  test("keeps the security and governance boundaries inseparable", () => {
    const clause = targetClause(projectRules);
    for (const requiredText of [
      "mirror capability",
      "credentialはghのcredential storeへ委譲",
      "tokenを保持・出力しない",
      "argument arrayのみ",
      "create/closeの人間承認境界は維持",
    ]) {
      expect(clause).toContain(requiredText);
    }
  });
});
