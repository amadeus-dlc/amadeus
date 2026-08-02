// covers: execution-observability:ExecutionProjectionSink execution-observability:required-projection
// size: medium

import { afterEach, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createMemoryExecutionRepository,
  type ExecutionEventSet,
} from "../../packages/framework/core/tools/amadeus-execution-lifecycle.ts";
import { createRequiredExecutionProjectionSink } from "../../packages/framework/core/tools/amadeus-execution-projection.ts";
import {
  auditFilePath,
  getField,
  runtimeGraphPath,
  stateFilePath,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { compile } from "../../packages/framework/core/tools/amadeus-runtime.ts";
import {
  cleanupTestProject,
  createTestProject,
  seedStateFile,
} from "../harness/fixtures.ts";

process.env.AMADEUS_STAGE_GRAPH ??= join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "data",
  "stage-graph.json",
);

const set: ExecutionEventSet = {
  eventSetId: "set-1",
  rootOperationId: "root-1",
  idempotencyKey: "key-1",
  payloadFingerprint: "payload-1",
  digest: "digest-1",
  events: [],
};

let projectDir: string | undefined;
afterEach(() => cleanupTestProject(projectDir));

function fixture() {
  projectDir = createTestProject();
  seedStateFile(projectDir, "state-init-active.md");
  writeFileSync(
    runtimeGraphPath(projectDir),
    '{"workflow_id":"w","scope":"feature","started_at":"t","stages":[]}\n',
    "utf-8",
  );
  const repository = createMemoryExecutionRepository();
  repository.transaction((_sets, append) => append(set));
  return { projectDir, repository };
}

test("state and runtime projections advance to the canonical digest", () => {
  const value = fixture();
  const sink = createRequiredExecutionProjectionSink(value.projectDir, value.repository);
  expect(sink.projectRequired(set)).toEqual({
    digest: "digest-1",
    stateProjectionReceiptId: "state-projection-digest-1",
    runtimeProjectionReceiptId: "runtime-projection-digest-1",
  });
  expect(
    getField(readFileSync(stateFilePath(value.projectDir), "utf-8"), "Execution Projection Digest"),
  ).toBe("digest-1");
  expect(
    JSON.parse(readFileSync(runtimeGraphPath(value.projectDir), "utf-8"))
      .execution_observability,
  ).toEqual({
    root_operation_id: "root-1",
    event_set_digest: "digest-1",
  });
});

test("reprojecting the same digest keeps one state field", () => {
  const value = fixture();
  const sink = createRequiredExecutionProjectionSink(value.projectDir, value.repository);
  sink.projectRequired(set);
  sink.projectRequired(set);

  const state = readFileSync(stateFilePath(value.projectDir), "utf-8");
  expect(state.match(/^- \*\*Execution Projection Digest\*\*:/gm)).toHaveLength(1);
});

test("the first required projection creates a missing runtime graph", () => {
  const value = fixture();
  rmSync(runtimeGraphPath(value.projectDir));

  const sink = createRequiredExecutionProjectionSink(value.projectDir, value.repository);
  expect(sink.projectRequired(set).digest).toBe("digest-1");
  expect(
    JSON.parse(readFileSync(runtimeGraphPath(value.projectDir), "utf-8"))
      .execution_observability,
  ).toEqual({
    root_operation_id: "root-1",
    event_set_digest: "digest-1",
  });
});

test("runtime compile preserves the required-projected canonical cursor", () => {
  const value = fixture();
  const sink = createRequiredExecutionProjectionSink(value.projectDir, value.repository);
  sink.projectRequired(set);

  const auditPath = auditFilePath(value.projectDir);
  mkdirSync(dirname(auditPath), { recursive: true });
  writeFileSync(
    auditPath,
    [
      {
        schemaVersion: 1,
        seq: 1,
        cloneId: "projection-test",
        intentId: "intent-1",
        timestamp: "2026-08-02T00:00:00.000Z",
        heading: "Workflow Started",
        event: "WORKFLOW_STARTED",
        fields: { "Workflow ID": "workflow-1", Scope: "feature" },
      },
      {
        schemaVersion: 1,
        seq: 2,
        cloneId: "projection-test",
        intentId: "intent-1",
        timestamp: "2026-08-02T00:00:01.000Z",
        heading: "Execution Event Set Committed",
        event: "EXECUTION_EVENT_SET_COMMITTED",
        fields: {
          "Root Operation Id": "root-1",
          "Event Set Digest": "digest-1",
        },
      },
      {
        schemaVersion: 1,
        seq: 3,
        cloneId: "projection-test",
        intentId: "intent-1",
        timestamp: "2026-08-02T00:00:02.000Z",
        heading: "Execution Event Set Committed",
        event: "EXECUTION_EVENT_SET_COMMITTED",
        fields: {
          "Root Operation Id": "root-1",
          "Event Set Digest": "digest-2-not-yet-projected",
        },
      },
    ].map((row) => JSON.stringify(row)).join("\n") + "\n",
    "utf-8",
  );

  compile({ projectDir: value.projectDir });
  expect(
    JSON.parse(readFileSync(runtimeGraphPath(value.projectDir), "utf-8"))
      .execution_observability,
  ).toEqual({
    root_operation_id: "root-1",
    event_set_digest: "digest-1",
  });
});

test("a partial projection fails loud and rebuild converges from canonical audit", () => {
  const value = fixture();
  const failing = createRequiredExecutionProjectionSink(value.projectDir, value.repository, {
    writeRuntime() {
      throw new Error("injected runtime projection failure");
    },
  });
  expect(() => failing.projectRequired(set)).toThrow(
    "injected runtime projection failure",
  );
  expect(
    getField(readFileSync(stateFilePath(value.projectDir), "utf-8"), "Execution Projection Digest"),
  ).toBe("digest-1");

  const repaired = createRequiredExecutionProjectionSink(value.projectDir, value.repository);
  expect(repaired.rebuildRequired("root-1").digest).toBe("digest-1");
});
