// #2929 FR-BND-3: the model-completeness sensor only fires on the paths its
// manifest `matches` glob selects, so a governed model-map entry outside that
// glob is watched by nobody — drift on it is silent. This test binds the two
// ledgers together: every registered `implPath` must be selected by the glob
// the sensor actually ships.
//
// BR-6 (no oracle cancellation): the glob semantics come from the PRODUCTION
// matcher `matchesGlob`, imported rather than re-implemented. A defect in the
// matcher itself is out of scope here (the matcher's own tests own that); this
// test detects only the coverage drift between manifest and model map.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { matchesGlob } from "../../packages/framework/core/tools/amadeus-sensor.ts";
import type { ModelMap } from "../../plugins/formal-model-check/tools/tla-model-map.ts";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST_RELATIVE = "plugins/formal-model-check/sensors/amadeus-model-completeness.md";
const MODEL_MAP_RELATIVE = "amadeus/spaces/default/specs/tla/model-map.json";

// The sensor dispatcher and the PostToolUse hook both apply the glob to the
// tool's `file_path`, which is absolute — hence the manifest's leading `**/`.
// Comparing against the same shape keeps this check faithful to production.
function absolute(relativePath: string): string {
  return join(REPOSITORY_ROOT, relativePath);
}

// Fail closed: a manifest whose frontmatter or `matches` key cannot be read is
// an unknown state, not a pass.
function readMatchesGlob(): string {
  const manifest = readFileSync(absolute(MANIFEST_RELATIVE), "utf8");
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(manifest);
  if (!frontmatter) throw new Error(`${MANIFEST_RELATIVE} has no YAML frontmatter block`);
  const matches = /^matches:[ \t]*(.+)$/m.exec(frontmatter[1] ?? "");
  if (!matches) throw new Error(`${MANIFEST_RELATIVE} declares no matches glob`);
  return (matches[1] ?? "").trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
}

function readModelMap(): ModelMap {
  return JSON.parse(readFileSync(absolute(MODEL_MAP_RELATIVE), "utf8")) as ModelMap;
}

describe("model-completeness sensor glob covers every governed model-map entry", () => {
  test("selects every registered implementation entry", () => {
    const glob = readMatchesGlob();
    const modelMap = readModelMap();
    const registered = [
      ...new Set(modelMap.models.flatMap((model) => model.entries.map((entry) => entry.implPath))),
    ].sort();
    expect(registered.length).toBeGreaterThan(0);
    const uncovered = registered.filter((implPath) => !matchesGlob(glob, absolute(implPath)));
    expect(uncovered).toEqual([]);
  });

  test("keeps the spec-asset branch that fires the sensor on model and cfg edits", () => {
    const glob = readMatchesGlob();
    expect(matchesGlob(glob, absolute(MODEL_MAP_RELATIVE))).toBe(true);
    expect(matchesGlob(glob, absolute("amadeus/spaces/default/specs/tla/FormalElection.tla"))).toBe(true);
  });

  test("does not select unrelated files", () => {
    const glob = readMatchesGlob();
    expect(matchesGlob(glob, absolute("packages/framework/core/tools/amadeus-sensor.ts"))).toBe(false);
    expect(matchesGlob(glob, absolute("README.md"))).toBe(false);
  });
});
