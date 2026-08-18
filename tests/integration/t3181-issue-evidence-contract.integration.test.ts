// covers: packages/framework/core/amadeus-common/stages/ideation/intent-capture.md
// size: medium
//
// t3181 — the stage-contract half of #3181: issue-evidence is a first-class
// artifact kind with a producer, and the two inception stages that consume the
// established facts declare it.
//
// WHY THE DELIVERED TREE. The stage contracts travel source -> compiled
// stage-graph.json -> every harness dist. A source-only predicate would go
// green while the compiled graph the engine actually reads stayed stale, so the
// graph assertions here run against `dist/claude/.claude/tools/` (the delivery
// tree) while the frontmatter assertions read the canonical source. Both must
// hold; `bun run build` is what makes them agree.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseStageFrontmatter } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  artifactsRegistry,
  producersOf,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";

const STAGES_SRC = join(
  import.meta.dir,
  "..",
  "..",
  "packages",
  "framework",
  "core",
  "amadeus-common",
  "stages",
);

function stageSource(phase: string, slug: string): string {
  return readFileSync(join(STAGES_SRC, phase, `${slug}.md`), "utf-8");
}

function frontmatter(phase: string, slug: string): Record<string, unknown> {
  const parsed = parseStageFrontmatter(stageSource(phase, slug));
  if (parsed === null) throw new Error(`no frontmatter in ${phase}/${slug}.md`);
  return parsed as unknown as Record<string, unknown>;
}

function consumedArtifacts(phase: string, slug: string): Array<{
  artifact: string;
  required: boolean;
}> {
  const consumes = frontmatter(phase, slug).consumes;
  return Array.isArray(consumes) ? consumes : [];
}

describe("t3181 issue-evidence is a produced artifact kind (FR-EVD-2)", () => {
  test("intent-capture declares it as an optional output in the source contract", () => {
    const optional = frontmatter("ideation", "intent-capture").optional_produces;
    expect(optional).toEqual(["issue-evidence"]);
  });

  test("the compiled graph registers the kind with intent-capture as its producer", () => {
    expect([...artifactsRegistry()]).toContain("issue-evidence");
    expect(producersOf("issue-evidence").map((s) => s.slug)).toEqual([
      "intent-capture",
    ]);
  });
});
