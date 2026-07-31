// covers: harness-instrument:archived-guard-corpus
// size: medium
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  callNames,
  GUARD_CORPUS_FILES as FILES,
  GUARD_CORPUS_TOOLS_DIR as TOOLS,
} from "../lib/guard-corpus-ast.ts";

describe("archived guard AST corpus", () => {
  test("every owned sink file reaches the required guard or capability", () => {
    const sources = Object.fromEntries(
      FILES.map((name) => [name, readFileSync(join(TOOLS, name), "utf-8")]),
    );
    const calls = Object.fromEntries(
      Object.entries(sources).map(([name, source]) => [name, callNames(source)]),
    );
    expect(calls["amadeus-utility.ts"]).toContain("setActiveIntentCursor");
    expect(calls["amadeus-utility.ts"]).toContain("guardIntentOperation");
    expect(calls["amadeus-utility.ts"]).toContain("resolveIntentOperationTargetLocked");
    expect(calls["amadeus-orchestrate.ts"]).toContain("archivedNextGuard");
    expect(calls["amadeus-orchestrate.ts"]).toContain("resolveIntentOperationTargetLocked");
    expect(calls["amadeus-state.ts"]).toContain("removeField");
    expect(calls["amadeus-state.ts"]).toContain("guardIntentOperation");
    expect(calls["amadeus-state.ts"]).toContain("resolveIntentOperationTargetLocked");
    expect(calls["amadeus-lib.ts"]).toContain("transitionIntentStatusLocked");
  });
});
