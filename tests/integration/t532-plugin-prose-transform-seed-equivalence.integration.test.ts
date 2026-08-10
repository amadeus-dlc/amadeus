// covers: function:transform
// covers: function:seedBytesForHarness
// covers: function:rulesSubdirFor
// size: medium
//
// The build-time plugin projector and runtime staging seed are separate
// delivery paths. Their prose transforms must stay byte-equivalent for every
// authored harness manifest, including each manifest's real rules rename.

import { describe, expect, test } from "bun:test";
import { rulesSubdirFor } from "../../packages/framework/core/tools/amadeus-harness.ts";
import { seedBytesForHarness } from "../../packages/framework/core/tools/amadeus-plugin.ts";
import { transform } from "../../scripts/harness-transform.ts";
import { harnessProjectionFacts } from "../helpers/harness-dir-fixture.ts";

const PATHS = ["stages/x.md", "README.md.example", "plugin.json", "tools/x.ts"] as const;
const FACTS = harnessProjectionFacts();

function corpusBytes(harnessDir: string, hasToken: boolean, hasRulesPath: boolean): Buffer {
  const fragments = ["plain prose"];
  if (hasToken) fragments.push("{{HARNESS_DIR}}/tools/cli.ts");
  if (hasRulesPath) {
    fragments.push(`${hasToken ? "{{HARNESS_DIR}}" : harnessDir}/rules/team.md`);
  }
  return Buffer.from(`${fragments.join(" | ")}\n`, "utf-8");
}

describe("t532 plugin prose transform and seed equivalence", () => {
  test("the fixture exposes all 8 authored manifests and 7 distinct harness dirs", () => {
    expect(FACTS).toHaveLength(8);
    expect(new Set(FACTS.map(({ harnessDir }) => harnessDir)).size).toBe(7);
  });

  for (const { name, harnessDir, rulesRename } of FACTS) {
    test(`${name} transform and seed are byte-equivalent`, () => {
      for (const path of PATHS) {
        for (const hasToken of [false, true]) {
          for (const hasRulesPath of [false, true]) {
            const input = corpusBytes(harnessDir, hasToken, hasRulesPath);
            const projected = transform(path, input, harnessDir, rulesRename);
            const seeded = seedBytesForHarness(path, input, harnessDir);
            expect(
              seeded,
              `${name}:${path}:token=${hasToken}:rules=${hasRulesPath}`,
            ).toEqual(projected);
          }
        }
      }
    });
  }

  for (const harnessDir of [".cursor", ".opencode"] as const) {
    test(`${harnessDir} resolves its manifest-declared rules subdir`, () => {
      expect(rulesSubdirFor(harnessDir)).toBe("amadeus-rules");
    });
  }
});
