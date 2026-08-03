// covers: file:packages/framework/core/tools/amadeus-registry-drift.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  compareRegistries,
  extractCliDispatchVerbs,
  extractCliValidVerbs,
  extractEmitterFieldOrder,
  extractStageFieldRegistry,
} from "../../packages/framework/core/tools/amadeus-registry-drift.ts";
import { ACCEPTED_STAGE_FIELDS } from "../../packages/framework/core/tools/amadeus-stage-schema.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const CHANGE_DETECTOR = join(REPO_ROOT, "scripts/detect-ci-changes.sh");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

function expectRegistryMatch(
  expectedName: string,
  expected: readonly string[],
  actualName: string,
  actual: readonly string[],
): void {
  const comparison = compareRegistries({ expectedName, expected, actualName, actual });
  expect(comparison.diagnostics).toEqual([]);
  expect(comparison.valid).toBe(true);
}

function detectChanges(paths: readonly string[]): Record<string, string> {
  const result = spawnSync("bash", [CHANGE_DETECTOR], {
    input: Buffer.from(`${paths.join("\0")}\0`),
    encoding: "utf8",
  });
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  return Object.fromEntries(
    result.stdout
      .trim()
      .split("\n")
      .map((line) => line.split("=", 2)),
  );
}

describe("t416 registry drift guard live contracts", () => {
  test("CLI dispatch and Valid registry contain the same 33 verbs", () => {
    const stateSource = read("packages/framework/core/tools/amadeus-state.ts");

    const dispatch = extractCliDispatchVerbs(stateSource);
    const valid = extractCliValidVerbs(stateSource);

    expect(dispatch).toHaveLength(33);
    expect(valid).toHaveLength(33);
    expectRegistryMatch("CLI dispatch", dispatch, "CLI Valid", valid);
  });

  test("schema, emitter, authoritative spec, and English/Japanese registries match", () => {
    const accepted = [...ACCEPTED_STAGE_FIELDS];
    const projections = [
      [
        "emitter FIELD_ORDER",
        extractEmitterFieldOrder(read("packages/framework/core/tools/amadeus-lib.ts")),
      ],
      [
        "authoritative spec",
        extractStageFieldRegistry(
          read("packages/framework/core/amadeus-common/protocols/stage-definition.md"),
        ),
      ],
      [
        "English reference",
        extractStageFieldRegistry(read("docs/reference/15-stage-definition.md")),
      ],
      [
        "Japanese reference",
        extractStageFieldRegistry(read("docs/reference/15-stage-definition.ja.md")),
      ],
    ] as const;

    expect(accepted).toHaveLength(25);
    expect(accepted).toContain("when");
    for (const [name, fields] of projections) {
      expect(fields).toHaveLength(25);
      expect(fields).toContain("when");
      expectRegistryMatch("schema accepted fields", accepted, name, fields);
    }
  });

  test("when is supported and no longer listed in reserved registries", () => {
    const specReserved = read("packages/framework/core/amadeus-common/protocols/stage-definition.md")
      .split("## Future extensions — reserved namespace")[1] ?? "";
    const englishReserved = read("docs/reference/15-stage-definition.md")
      .split("## Future extensions — reserved namespace")[1] ?? "";
    const japaneseReserved = read("docs/reference/15-stage-definition.ja.md")
      .split("## 将来の拡張 — 予約された名前空間")[1] ?? "";

    for (const reservedSection of [specReserved, englishReserved, japaneseReserved]) {
      expect(reservedSection).not.toBe("");
      expect(reservedSection).not.toMatch(/^\|\s*`when`\s*\|/m);
    }
  });

  test("stage-definition docs-only paths route to the full CI suite", () => {
    for (const path of [
      "docs/reference/15-stage-definition.md",
      "docs/reference/15-stage-definition.ja.md",
    ]) {
      expect(detectChanges([path])).toMatchObject({ full: "true" });
    }
    expect(detectChanges(["docs/reference/01-architecture.md"])).toMatchObject({
      full: "false",
    });
  });
});
