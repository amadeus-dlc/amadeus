// covers: file:packages/framework/core/tools/amadeus-registry-drift.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  compareRegistries,
  extractCliDispatchVerbs,
  extractCliValidVerbs,
  extractEmitterFieldOrder,
  extractStageFieldRegistry,
} from "../../packages/framework/core/tools/amadeus-registry-drift.ts";

const CLI_SOURCE = `
switch (subcommand) {
  case "get":
    get();
    break;
  case "set":
    set();
    break;
  default:
    error(\`Unknown subcommand: \${subcommand}. Valid: get, set\`);
}
`;

const FIELD_REGISTRY = `
<!-- amadeus-stage-field-registry:v1:start -->
| Field |
| --- |
| \`slug\` |
| \`phase\` |
<!-- amadeus-stage-field-registry:v1:end -->
`;

function compare(expected: readonly string[], actual: readonly string[]) {
  return compareRegistries({
    expectedName: "canonical",
    expected,
    actualName: "projection",
    actual,
  });
}

describe("t416 registry drift pure extractors", () => {
  test("extracts dispatch, Valid, emitter, and marked stage fields", () => {
    expect(extractCliDispatchVerbs(CLI_SOURCE)).toEqual(["get", "set"]);
    expect(extractCliValidVerbs(CLI_SOURCE)).toEqual(["get", "set"]);
    expect(
      extractEmitterFieldOrder('const FIELD_ORDER = ["slug", "phase"] as const;'),
    ).toEqual(["slug", "phase"]);
    expect(extractStageFieldRegistry(FIELD_REGISTRY)).toEqual(["slug", "phase"]);
    expect(compare(["get", "set"], ["set", "get"]).valid).toBe(true);
  });

  test("detects a dispatch-only verb", () => {
    const tampered = CLI_SOURCE.replace('case "set":', 'case "archive": break;\ncase "set":');
    const result = compare(
      extractCliDispatchVerbs(tampered),
      extractCliValidVerbs(tampered),
    );

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["archive"]);
    expect(result.diagnostics.join("\n")).toContain("projection: missing entries: archive");
  });

  test("detects a phantom Valid verb", () => {
    const tampered = CLI_SOURCE.replace("Valid: get, set", "Valid: get, set, phantom");
    const result = compare(
      extractCliDispatchVerbs(tampered),
      extractCliValidVerbs(tampered),
    );

    expect(result.valid).toBe(false);
    expect(result.unexpected).toEqual(["phantom"]);
    expect(result.diagnostics.join("\n")).toContain("projection: unexpected entries: phantom");
  });

  test("detects a documentation omission", () => {
    const omitted = FIELD_REGISTRY.replace("| `phase` |\n", "");
    const result = compare(["slug", "phase"], extractStageFieldRegistry(omitted));

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["phase"]);
  });

  test("fails closed when extraction is empty", () => {
    const result = compare(["slug", "phase"], extractStageFieldRegistry("# no marker"));

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContain("projection: empty extraction");
    expect(result.diagnostics.join("\n")).toContain("cardinality mismatch");
  });

  test("detects duplicate entries and raw cardinality mismatch", () => {
    const duplicate = FIELD_REGISTRY.replace("| `phase` |", "| `slug` |\n| `phase` |");
    const result = compare(["slug", "phase"], extractStageFieldRegistry(duplicate));

    expect(result.valid).toBe(false);
    expect(result.duplicateActual).toEqual(["slug"]);
    expect(result.diagnostics).toContain("projection: duplicate entries: slug");
    expect(result.diagnostics.join("\n")).toContain("cardinality mismatch (2 !== 3)");
  });
});
