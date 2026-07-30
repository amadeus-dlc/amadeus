import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import type { RunStageDirective } from "./amadeus-directive.ts";
import {
  hooksHealthDir,
  isPlainObject,
  writeFileAtomic,
} from "./amadeus-lib.ts";

const SENSOR_INVOCATION_VERSION = 1;
const SENSOR_INVOCATION_FILE = "sensor-invocation.json";

// Transient, atomically-replaced projection of the latest run-stage directive.
// The hook consumes this exact-path allowlist instead of reconstructing artifact
// paths from stage names, which keeps per-unit and optional resolution local to
// the orchestrator's existing path-resolution seam.
export interface SensorInvocationScope {
  version: typeof SENSOR_INVOCATION_VERSION;
  stage: string;
  produces: string[];
  optional_produces: string[];
}

export function sensorInvocationScopePath(projectDir: string): string {
  return join(hooksHealthDir(projectDir), SENSOR_INVOCATION_FILE);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return null;
  }
  return value;
}

export function readSensorInvocationScope(
  projectDir: string,
): SensorInvocationScope | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(sensorInvocationScopePath(projectDir), "utf-8"),
    );
    if (!isPlainObject(parsed)) return null;
    if (parsed.version !== SENSOR_INVOCATION_VERSION) return null;
    if (typeof parsed.stage !== "string" || parsed.stage.length === 0) return null;
    const produces = stringArray(parsed.produces);
    const optionalProduces = stringArray(parsed.optional_produces);
    if (produces === null || optionalProduces === null) return null;
    return {
      version: SENSOR_INVOCATION_VERSION,
      stage: parsed.stage,
      produces,
      optional_produces: optionalProduces,
    };
  } catch {
    return null;
  }
}

function absoluteTarget(projectDir: string, target: string): string {
  return resolve(isAbsolute(target) ? target : join(projectDir, target));
}

export function invocationDeclaresOutput(
  projectDir: string,
  scope: SensorInvocationScope,
  filePath: string,
): boolean {
  const actual = absoluteTarget(projectDir, filePath);
  const optional = new Set(
    scope.optional_produces.map((target) => absoluteTarget(projectDir, target)),
  );
  const candidates = new Set(
    scope.produces.map((target) => absoluteTarget(projectDir, target)),
  );
  if (!candidates.has(actual)) return false;
  return !optional.has(actual) || existsSync(actual);
}

export function projectSensorInvocation(
  projectDir: string,
  directive: RunStageDirective,
): void {
  const path = sensorInvocationScopePath(projectDir);
  mkdirSync(hooksHealthDir(projectDir), { recursive: true });
  const scope: SensorInvocationScope = {
    version: SENSOR_INVOCATION_VERSION,
    stage: directive.stage,
    produces: [...directive.produces],
    optional_produces: [...(directive.optional_produces ?? [])],
  };
  writeFileAtomic(path, `${JSON.stringify(scope, null, 2)}\n`);
}

export function sensorUsesDeclaredOutputScope(category: string | undefined): boolean {
  return category === "document-shape" || category === "governance";
}

/** Apply exact invocation scoping only to document and governance sensors. */
export function sensorAllowsInvocationOutput(
  category: string | undefined,
  projectDir: string,
  scope: SensorInvocationScope | null,
  filePath: string,
): boolean {
  if (!sensorUsesDeclaredOutputScope(category)) return true;
  return scope !== null && invocationDeclaresOutput(projectDir, scope, filePath);
}
