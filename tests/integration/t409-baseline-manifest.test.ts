// covers: execution-observability:BaselineRun execution-observability:baseline-manifest
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ExecutionAttempt,
  LogicalOperation,
} from "../../packages/framework/core/tools/amadeus-execution-contract.ts";
import {
  createMemoryExecutionRepository,
  type BaselineRun,
  type ExecutionEventSet,
} from "../../packages/framework/core/tools/amadeus-execution-lifecycle.ts";
import {
  buildBaselineManifest,
  projectBaselineManifest,
} from "../../packages/framework/core/tools/amadeus-baseline-manifest.ts";
import { captureExecutionEnvironment } from "../../packages/framework/core/tools/amadeus-harness-capability.ts";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  seedStateFile,
} from "../harness/fixtures.ts";

const available = <T>(value: T) => ({ state: "available" as const, value });
const origin = {
  stage: "code-generation",
  agent: "amadeus-developer-agent",
  tool: "amadeus-orchestrate",
};
const operation: LogicalOperation = {
  operationId: "root-1",
  rootOperationId: "root-1",
  kind: "baseline",
  origin,
  status: "succeeded",
};
const baseline: BaselineRun = {
  baselineRunId: "baseline-1",
  rootOperationId: "root-1",
  workloadId: "fixed-workload",
  workloadVersion: "1",
  inputDigest: "sha256:input",
  observedGitSha: available("abcdef"),
  startCriteria: available("warmup-started"),
  expectedEndCriteria: available("23-attempts-terminal"),
  actualEndCriteria: available("23-attempts-terminal"),
  status: "running",
};

function attempt(ordinal: number, terminal = true): ExecutionAttempt {
  return {
    attemptId: `attempt-${ordinal}`,
    operationId: "root-1",
    ordinal,
    origin,
    dispatchEvidence: available("accepted"),
    startedAtFact: available(`2026-08-02T00:00:${String(ordinal).padStart(2, "0")}.000Z`),
    finishedAtFact: terminal
      ? available(`2026-08-02T00:00:${String(ordinal).padStart(2, "0")}.100Z`)
      : { state: "incomplete", missingFields: ["finishedAt"] },
    outcome: terminal ? "succeeded" : null,
    terminationReason: terminal ? "completed" : null,
    measurement: terminal
      ? {
          clockSource: "monotonic",
          measurementQuality: "monotonic",
          durationMs: ordinal,
        }
      : null,
    nativeHandle: available(`native-${ordinal}`),
  };
}

function sets(withGap = true, oneOpen = false): ExecutionEventSet[] {
  const environment = captureExecutionEnvironment("codex", {
    model: withGap ? undefined : "gpt-5.6-sol",
    harnessVersion: withGap ? undefined : "0.139.0",
    monotonicClockAvailable: true,
  });
  const root: ExecutionEventSet = {
    eventSetId: "set-root",
    rootOperationId: "root-1",
    idempotencyKey: "root-key",
    payloadFingerprint: "root-fingerprint",
    digest: "root-digest",
    events: [
      {
        type: "operation-started",
        operation,
        start: {
          operation: { ...operation, status: "started" },
          observedStart: {
            wall: "2026-08-02T00:00:00.000Z",
            monotonicMs: 0,
          },
        },
        baseline,
        environment,
      },
      {
        type: "operation-finished",
        finished: {
          operation,
          terminationReason: "completed",
          measurement: {
            clockSource: "monotonic",
            measurementQuality: "monotonic",
            durationMs: 100,
          },
          finishedAtFact: available("2026-08-02T00:01:00.000Z"),
        },
      },
    ],
  };
  return [
    root,
    ...Array.from({ length: 23 }, (_, index): ExecutionEventSet => {
      const value = attempt(index + 1, !(oneOpen && index === 22));
      return {
        eventSetId: `set-${index + 1}`,
        rootOperationId: "root-1",
        idempotencyKey: `attempt-key-${index + 1}`,
        payloadFingerprint: `fingerprint-${index + 1}`,
        digest: `digest-${index + 1}`,
        events: value.outcome
          ? [
              {
                type: "attempt-finished",
                finished: {
                  attempt: {
                    ...value,
                    outcome: value.outcome,
                    terminationReason: value.terminationReason ?? "completed",
                    measurement: value.measurement!,
                  },
                  rootOperationId: "root-1",
                  reservationId: `reservation-${index + 1}`,
                },
              },
            ]
          : [
              {
                type: "attempt-started",
                start: {
                  attempt: value,
                  rootOperationId: "root-1",
                  reservationId: `reservation-${index + 1}`,
                  observedStart: {
                    wall: "2026-08-02T00:00:00.000Z",
                    monotonicMs: 0,
                  },
                },
              },
            ],
      };
    }),
  ];
}

describe("baseline manifest classification and statistics", () => {
  test("23 terminal attempts become warmup 3 + measured 20 with median and p95", () => {
    const manifest = buildBaselineManifest(sets(true), "root-1", {
      workloadId: "fixed-workload",
      inputDigest: "sha256:input",
    });
    expect(manifest.status).toBe("complete-with-gaps");
    expect(manifest.summary).toEqual({
      warmupCount: 3,
      measuredCount: 20,
      medianDurationMs: 13.5,
      p95DurationMs: 22,
    });
    expect(manifest.operations).toHaveLength(1);
    expect(manifest.attempts).toHaveLength(23);
  });

  test("all environment facts available yields complete", () => {
    expect(
      buildBaselineManifest(sets(false), "root-1", {
        workloadId: "fixed-workload",
        inputDigest: "sha256:input",
      }).status,
    ).toBe("complete");
  });

  test("a workload mismatch or nonterminal attempt is invalid and excluded", () => {
    expect(
      buildBaselineManifest(sets(false), "root-1", {
        workloadId: "other-workload",
        inputDigest: "sha256:input",
      }).status,
    ).toBe("invalid");
    expect(
      buildBaselineManifest(sets(false, true), "root-1", {
        workloadId: "fixed-workload",
        inputDigest: "sha256:input",
      }).status,
    ).toBe("invalid");
  });
});

let projectDir: string | undefined;
afterEach(() => cleanupTestProject(projectDir));

test("the manifest is projected under the active Intent evidence contract", () => {
  projectDir = createTestProject();
  seedStateFile(projectDir, "state-init-active.md");
  const repository = createMemoryExecutionRepository();
  repository.transaction((_current, append) => {
    for (const set of sets(false)) append(set);
  });
  const result = projectBaselineManifest(
    projectDir,
    "root-1",
    repository,
    { workloadId: "fixed-workload", inputDigest: "sha256:input" },
  );
  const expected = join(
    projectDir,
    "amadeus",
    "spaces",
    "default",
    "intents",
    DEFAULT_RECORD_DIR,
    "construction",
    "execution-observability-baseline",
    "evidence",
    "baseline-manifest.json",
  );
  expect(result.path).toBe(expected);
  expect(existsSync(expected)).toBe(true);
  expect(JSON.parse(readFileSync(expected, "utf-8")).status).toBe("complete");
});
