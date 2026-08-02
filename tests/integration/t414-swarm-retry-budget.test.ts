// covers: convergence-budgets:swarm-retry-gate
// size: medium

import { afterEach, expect, spyOn, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import {
  decideStopContinuation,
  stopBudgetMode,
  stopContinuationBlockCap,
  stopContinuationDefaultCap,
} from "../../packages/framework/core/hooks/amadeus-stop.ts";
import { handleRetry } from "../../packages/framework/core/tools/amadeus-swarm.ts";
import {
  cleanupTestProject,
  createTestProject,
  seedAuditFile,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

let projectDir: string | undefined;

afterEach(() => {
  cleanupTestProject(projectDir);
  projectDir = undefined;
  delete process.env.AMADEUS_SWARM_RETRY_CAP;
  delete process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP;
  resetOtelPerProject();
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

function invalidRetry(args: string[]): { code: number; body: unknown } {
  let output = "";
  let code = -1;
  class ExitSignal extends Error {}
  const error = spyOn(console, "error").mockImplementation((value) => {
    output = String(value);
  });
  const originalExit = process.exit.bind(process);
  process.exit = ((value?: number) => {
    code = value ?? 0;
    throw new ExitSignal();
  }) as typeof process.exit;
  try {
    handleRetry(args);
  } catch (cause) {
    if (!(cause instanceof ExitSignal)) throw cause;
  } finally {
    process.exit = originalExit;
    error.mockRestore();
  }
  return { code, body: JSON.parse(output) };
}

test("stop policy helpers bound overrides and reserve against the source adapter", () => {
  const interactive = "- **Construction Autonomy Mode**: interactive\n";
  const autonomous = "- **Construction Autonomy Mode**: autonomous\n";
  const gated = "- **Construction Autonomy Mode**: gated\n";
  expect(stopContinuationDefaultCap(interactive)).toBe(2);
  expect(stopContinuationDefaultCap(autonomous)).toBe(8);
  expect(stopContinuationDefaultCap(gated)).toBe(8);
  expect(stopBudgetMode(interactive)).toBe("interactive");
  expect(stopBudgetMode(autonomous)).toBe("autonomous");
  expect(stopBudgetMode(gated)).toBe("gated");

  projectDir = createTestProject();
  process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = "not-a-number";
  expect(stopContinuationBlockCap(interactive)).toBe(2);
  process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = "11";
  expect(stopContinuationBlockCap(autonomous)).toBe(8);
  process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = "1";
  expect(stopContinuationBlockCap(interactive)).toBe(1);

  seedStateFile(projectDir, "state-construction.md");
  seedAuditFile(projectDir);
  const state = readFileSync(seededStateFile(projectDir), "utf-8");
  expect(decideStopContinuation(projectDir, state, false, "session-a")).toBe(true);
  expect(decideStopContinuation(projectDir, state, true, "session-a")).toBe(false);
  process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = "2";
  expect(decideStopContinuation(projectDir, state, true, "session-a")).toBe(false);
});

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

test("retry arguments and state fail closed before reserving a worker", () => {
  projectDir = seedActiveProject();
  const base = [
    "--project-dir",
    projectDir,
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
    "native-failure-1",
  ];
  expect(invalidRetry(base.filter((value, index) => index !== 2 && index !== 3))).toMatchObject({
    code: 1,
    body: { error: expect.stringContaining("unit name") },
  });
  expect(invalidRetry([...base, "--retry-class", "mystery"])).toMatchObject({
    code: 1,
    body: { error: expect.stringContaining("--retry-class") },
  });
  expect(invalidRetry([...base, "--effect-status", "mystery"])).toMatchObject({
    code: 1,
    body: { error: expect.stringContaining("--effect-status") },
  });
  expect(invalidRetry([...base, "--source-surface", "mystery"])).toMatchObject({
    code: 1,
    body: { error: expect.stringContaining("--source-surface") },
  });
  expect(
    invalidRetry(base.filter((value, index) => index !== 8 && index !== 9)),
  ).toMatchObject({ code: 1, body: { error: expect.stringContaining("cause-code") } });
  expect(
    invalidRetry(base.filter((value, index) => index !== 12 && index !== 13)),
  ).toMatchObject({ code: 1, body: { error: expect.stringContaining("delivery-id") } });

  process.env.AMADEUS_SWARM_RETRY_CAP = "4";
  expect(retry("invalid-cap")).toEqual({
    code: 2,
    body: {
      kind: "retry-refused",
      reasonCode: "budget-policy-mismatch",
      recommendedNextAction: "halt-and-ask",
    },
  });

  cleanupTestProject(projectDir);
  projectDir = createTestProject();
  delete process.env.AMADEUS_SWARM_RETRY_CAP;
  expect(retry("missing-state")).toEqual({
    code: 2,
    body: {
      kind: "retry-refused",
      reasonCode: "state-inconsistent",
      recommendedNextAction: "halt-and-ask",
    },
  });
  writeFileSync(seededStateFile(projectDir), "- **Revision Count**: 0\n", "utf-8");
  expect(retry("missing-stage")).toEqual({
    code: 2,
    body: {
      kind: "retry-refused",
      reasonCode: "state-inconsistent",
      recommendedNextAction: "halt-and-ask",
    },
  });
});

test("a policy change for an existing retry subject is refused durably", () => {
  projectDir = seedActiveProject();
  expect(retry("native-failure-1")).toMatchObject({ code: 0 });
  process.env.AMADEUS_SWARM_RETRY_CAP = "1";
  expect(retry("native-failure-2")).toEqual({
    code: 2,
    body: {
      kind: "retry-refused",
      reasonCode: "budget-policy-mismatch",
      recommendedNextAction: "halt-and-ask",
    },
  });
});
