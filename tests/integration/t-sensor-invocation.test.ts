import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  readSensorInvocationScope,
  sensorAllowsInvocationOutput,
  sensorInvocationScopePath,
  type SensorInvocationScope,
} from "../../packages/framework/core/tools/amadeus-sensor-invocation.ts";
import {
  cleanupTestProject,
  createTestProject,
} from "../harness/fixtures.ts";

describe("sensor invocation scope decoding", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTestProject();
  });

  afterEach(() => {
    cleanupTestProject(projectDir);
  });

  test("missing and malformed projection files fail closed", () => {
    expect(readSensorInvocationScope(projectDir)).toBeNull();

    const path = sensorInvocationScopePath(projectDir);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "{not-json", "utf-8");
    expect(readSensorInvocationScope(projectDir)).toBeNull();
  });

  test("non-string output entries fail closed", () => {
    const path = sensorInvocationScopePath(projectDir);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        stage: "requirements-analysis",
        produces: ["requirements.md", 42],
        optional_produces: [],
      }),
      "utf-8",
    );

    expect(readSensorInvocationScope(projectDir)).toBeNull();
  });

  test("document sensors require a declared output while code sensors stay workspace-wide", () => {
    const declared = `${projectDir}/requirements.md`;
    const scope: SensorInvocationScope = {
      version: 1,
      stage: "requirements-analysis",
      produces: [declared],
      optional_produces: [],
    };

    expect(
      sensorAllowsInvocationOutput(
        "document-shape",
        projectDir,
        null,
        declared,
      ),
    ).toBe(false);
    expect(
      sensorAllowsInvocationOutput(
        "document-shape",
        projectDir,
        scope,
        `${projectDir}/memory.md`,
      ),
    ).toBe(false);
    expect(
      sensorAllowsInvocationOutput(
        "document-shape",
        projectDir,
        scope,
        declared,
      ),
    ).toBe(true);
    expect(
      sensorAllowsInvocationOutput(
        "code-quality",
        projectDir,
        null,
        `${projectDir}/src/index.ts`,
      ),
    ).toBe(true);
  });
});
