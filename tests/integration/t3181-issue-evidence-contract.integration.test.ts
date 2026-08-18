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
  return parseStageFrontmatter(stageSource(phase, slug));
}

function consumedArtifacts(
  phase: string,
  slug: string,
): Array<{ artifact: string; required: boolean }> {
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

  test("intent-capture points at the capture verb for issue-first intents", () => {
    const body = stageSource("ideation", "intent-capture");
    expect(body).toContain("issue-evidence fetch --issues");
  });

  // FR-MEAS-1/2: the capture is a cost intervention, so the contract carries the
  // number it is measured against, the target, and the method — a later
  // measurement that does not restate its own tree and command is not evidence.
  test("fixes the baseline, the target and the measurement method", () => {
    const body = stageSource("ideation", "intent-capture");
    expect(body).toContain("**Effect measurement.**");
    expect(body).toContain("47 minutes");
    expect(body).toContain("215855ea7");
    expect(body).toContain("under 35 minutes");
    expect(body).toContain("`STAGE_STARTED`/`STAGE_COMPLETED`");
    expect(body).toContain("900 s");
  });
});

describe("t3181 requirements-analysis consumes the evidence (FR-EVD-3)", () => {
  test("declares it as an optional upstream input", () => {
    expect(consumedArtifacts("inception", "requirements-analysis")).toContainEqual({
      artifact: "issue-evidence",
      required: false,
    });
  });

  test("tells the stage to read it instead of re-deriving established facts", () => {
    const body = stageSource("inception", "requirements-analysis");
    expect(body).toContain("issue-evidence.md");
    expect(body).toContain(
      "Facts a cross-review has already established — mechanisms, `file:line` citations, acceptance criteria — are consumed, never re-derived",
    );
  });

  test("keeps the upstream-coverage note in step with the whole consumes list", () => {
    const body = stageSource("inception", "requirements-analysis");
    const declared = consumedArtifacts("inception", "requirements-analysis").map(
      (c) => c.artifact,
    );
    const note = body.slice(body.indexOf("- **`upstream-coverage`**"));
    const parenthetical = note.slice(0, note.indexOf("\n"));
    for (const artifact of declared) {
      expect(parenthetical).toContain(`\`${artifact}\``);
    }
  });
});

describe("t3181 reverse-engineering consumes the evidence (FR-EVD-4)", () => {
  test("derives the recorded scan focus from it when it is present", () => {
    const body = stageSource("inception", "reverse-engineering");
    const scanRecord = body.slice(body.indexOf("**Per-intent scan record"));
    expect(scanRecord).toContain("issue-evidence.md");
  });

  // Deliberately NOT a declared consume. A frontmatter entry would put every
  // one of this stage's nine codekb outputs under the upstream-coverage
  // citation obligation the moment an evidence file exists — exactly the
  // inception ceremony this intent removes. FR-EVD-4's acceptance is a body
  // grep, and the paragraph above satisfies it. Pinned so the entry cannot
  // reappear by reflex.
  test("does NOT declare it in frontmatter consumes", () => {
    const declared = consumedArtifacts("inception", "reverse-engineering").map(
      (c) => c.artifact,
    );
    expect(declared).not.toContain("issue-evidence");
  });
});
