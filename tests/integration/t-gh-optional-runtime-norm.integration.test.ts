import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPOSITORY_ROOT = join(import.meta.dir, "../..");
const PROJECT_RULES_PATH = join(
  REPOSITORY_ROOT,
  "amadeus/spaces/default/memory/project.md",
);
const TARGET_CID = "practices-discovery:gh-scripts-boundary";
const LEGACY_CLAUSE = "scripts/ 配下の repo ローカル開発支援ツールに限定";

// Re-baselined by #2921 after the norm distillation in #2919. The clause used to be
// pinned verbatim against the 260719-mirror-productization design document; the
// distilled clause is shorter than that historical draft, so the verbatim-sync
// contract no longer holds. What survives — and what this file now pins — is the set
// of security and governance invariants, asserted as substrings of the distilled text.
function targetClause(projectRules: string): string {
  const lines = projectRules
    .split("\n")
    .filter((line) => line.includes(`cid:${TARGET_CID}`));
  expect(lines).toHaveLength(1);
  return lines[0]
    .replace(/^\s*-\s*/, "")
    .replace(/\s*<!--\s*cid:[^>]+-->\s*$/, "")
    .trim();
}

describe("gh optional runtime project norm", () => {
  const projectRules = readFileSync(PROJECT_RULES_PATH, "utf8");

  test("keeps exactly one CID rule and drops the legacy clause", () => {
    expect(projectRules.match(new RegExp(`cid:${TARGET_CID}`, "g"))).toHaveLength(
      1,
    );
    expect(projectRules).not.toContain(LEGACY_CLAUSE);
  });

  test("keeps the security and governance boundaries inseparable", () => {
    const clause = targetClause(projectRules);
    for (const requiredText of [
      "optional dependency",
      "runnable / auth readiness",
      "loud fail",
      "credential は gh の store へ委譲",
      "token を保持・出力しない",
      "create / close の人間承認境界は維持",
    ]) {
      expect(clause).toContain(requiredText);
    }
  });
});
