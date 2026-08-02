// covers: convergence-budgets:swarm-retry-gate
// size: medium

import { afterEach, expect, spyOn, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { handleRetry } from "../../packages/framework/core/tools/amadeus-swarm.ts";
import { resetOtelBootstrapForTests } from "../../packages/framework/core/otel/bootstrap.ts";
import { resetFatalLatchForTests } from "../../packages/framework/core/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../packages/framework/core/otel/logger-provider.ts";
import { resetMeterProviderForTests } from "../../packages/framework/core/otel/meter-provider.ts";
import { resetTracerProviderForTests } from "../../packages/framework/core/otel/tracer-provider.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededStateFile,
} from "../harness/fixtures.ts";

let projectDir: string | undefined;

afterEach(() => {
  cleanupTestProject(projectDir);
  projectDir = undefined;
  delete process.env.AMADEUS_SWARM_RETRY_CAP;
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetMeterProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
});

function seedActiveProject(): string {
  const project = createTestProject();
  writeFileSync(
    seededStateFile(project),
    [
      "- **Current Stage**: code-generation",
      "- **Revision Count**: 0",
      "- **Status**: running",
      "- **Active Agent**: amadeus-developer-agent",
      "",
    ].join("\n"),
    "utf-8",
  );
  return project;
}

function retry(deliveryId: string, overrides: string[] = []): { code: number; body: unknown } {
  let output = "";
  let code = -1;
  const log = spyOn(console, "log").mockImplementation((value) => {
    output = String(value);
  });
  try {
    handleRetry(
      [
        "--project-dir",
        projectDir!,
        "--unit",
        "unit-a",
        "--retry-class",
        "recoverable-transient",
        "--effect-status",
        "no-effect-confirmed",
        "--cause-code",
        "worker-spawn-unavailable",
        "--source-surface",
        "swarm-worker-start",
        "--delivery-id",
        deliveryId,
        ...overrides,
      ],
      (value) => {
        code = value;
      },
    );
  } finally {
    log.mockRestore();
  }
  return { code, body: JSON.parse(output) };
}

test("swarm retries replay one delivery and reject default-cap+1 durably", () => {
  projectDir = seedActiveProject();

  expect(retry("native-failure-1")).toMatchObject({
    code: 0,
    body: { kind: "retry-authorized", retryOrdinal: 1, remaining: 1, backoffMs: 50 },
  });
  expect(retry("native-failure-1")).toMatchObject({
    code: 0,
    body: { kind: "retry-authorized", retryOrdinal: 1, remaining: 1, backoffMs: 50 },
  });
  expect(retry("native-failure-2")).toMatchObject({
    code: 0,
    body: { kind: "retry-authorized", retryOrdinal: 2, remaining: 0, backoffMs: 100 },
  });
  const exhausted = retry("native-failure-3");
  expect(exhausted).toMatchObject({
    code: 2,
    body: {
      kind: "retry-refused",
      termination: {
        schemaVersion: 1,
        reasonCode: "budget-exhausted",
        budget: { state: "available", value: { consumed: 2, cap: 2 } },
      },
    },
  });
  expect(retry("native-failure-4")).toEqual(exhausted);
});

test("a red check or non-allowlisted fact cannot authorize another worker", () => {
  projectDir = seedActiveProject();

  expect(
    retry("red-check", ["--cause-code", "convergence-check-red"]),
  ).toEqual({
    code: 2,
    body: {
      kind: "retry-refused",
      reasonCode: "retry-not-allowlisted",
      recommendedNextAction: "halt-and-ask",
    },
  });
  expect(retry("unknown-effect", ["--effect-status", "unknown"])).toEqual({
    code: 2,
    body: {
      kind: "retry-refused",
      reasonCode: "retry-effect-unknown",
      recommendedNextAction: "halt-and-ask",
    },
  });
  expect(retry("native-failure-1")).toMatchObject({
    code: 0,
    body: { retryOrdinal: 1 },
  });
});
