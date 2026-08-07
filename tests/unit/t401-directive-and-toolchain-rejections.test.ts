// Fail-closed branches that the surrounding suites reach around rather than
// through: the directive schema's absent-gate and non-string-element paths, the
// JDK distribution manifest's identity rejections, the model-pipeline error
// mapper's exhaustiveness guard, and the JSON command parser's malformed input.

import { describe, expect, test } from "bun:test";
import {
  directiveSelfCheckExamples,
  validateDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";
import { parseJsonBytes } from "../../plugins/formal-model-check/tools/contract.ts";
import { toTlaModelHarnessError } from "../../plugins/formal-model-check/tools/tla-arm.ts";
import {
  createJdkDistributionManifest,
  FIXED_JDK_RUN_PROFILE,
} from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";
import type { TlaModelPipelineError } from "../../plugins/formal-model-check/tools/tla-model-loader.ts";

const SHA = "a".repeat(64);

function runStage(): Record<string, unknown> {
  const example = directiveSelfCheckExamples.find((directive) => directive.kind === "run-stage");
  if (example === undefined) throw new Error("missing run-stage fixture");
  return { ...example } as Record<string, unknown>;
}

describe("t401 directive schema fail-closed branches", () => {
  test("names the gate field when it is absent entirely", () => {
    const { gate: _gate, ...withoutGate } = runStage();
    const result = validateDirective(withoutGate);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.join("; ")).toContain(
      "missing required field: gate",
    );
  });

  test("names the offending index of a non-string array element", () => {
    const result = validateDirective({ ...runStage(), consumes: ["ok.md", 7] });
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.join("; ")).toContain("consumes[1] must be string");
  });
});

describe("t401 JDK distribution manifest identity rejections", () => {
  const input = (overrides: Record<string, unknown>) => ({
    vendor: FIXED_JDK_RUN_PROFILE.vendor,
    version: FIXED_JDK_RUN_PROFILE.version,
    javaExecutablePath: "bin/java",
    javaExecutableSha256: SHA,
    entries: [{ kind: "FILE", path: "bin/java", target: null, byteLength: 1024, sha256: SHA }],
    ...overrides,
  }) as Parameters<typeof createJdkDistributionManifest>[0];

  test("rejects a vendor or version outside the fixed run profile", () => {
    for (const overrides of [{ vendor: "other-vendor" }, { version: "25.0.0" }]) {
      expect(createJdkDistributionManifest(input(overrides))).toMatchObject({
        ok: false,
        error: { kind: "JdkDistributionError" },
      });
    }
  });

  test("rejects a non-canonical executable path or a malformed executable digest", () => {
    for (const overrides of [
      { javaExecutablePath: "/bin/java" },
      { javaExecutablePath: "bin/../bin/java" },
      { javaExecutableSha256: "A".repeat(64) },
    ]) {
      expect(createJdkDistributionManifest(input(overrides))).toMatchObject({
        ok: false,
        error: { kind: "JdkDistributionError" },
      });
    }
  });
});

describe("t401 model pipeline error mapping", () => {
  test("wraps every declared load code", () => {
    const error = {
      kind: "MODEL_LOAD",
      code: "MODEL_MAP_INVALID",
      relativePath: "amadeus/spaces/default/specs/tla/model-map.json",
      detail: "invalid",
    } as TlaModelPipelineError;
    expect(toTlaModelHarnessError(error).message.length).toBeGreaterThan(0);
  });

  test("throws rather than silently mapping an undeclared code", () => {
    const undeclared = {
      kind: "MODEL_LOAD",
      code: "NOT_A_DECLARED_CODE",
      relativePath: "amadeus/spaces/default/specs/tla/model-map.json",
      detail: "undeclared",
    } as unknown as TlaModelPipelineError;
    expect(() => toTlaModelHarnessError(undeclared)).toThrow(
      /unhandled TLA model pipeline error/,
    );
  });
});

describe("t401 command payload parsing", () => {
  test("reports malformed JSON as a schema error rather than throwing", () => {
    expect(parseJsonBytes(new TextEncoder().encode("{not json"))).toMatchObject({
      ok: false,
      error: { kind: "SchemaError", path: "$", message: "invalid JSON" },
    });
  });
});
