// covers: execution-observability:ExecutionProjectionSink execution-observability:required-projection
// size: medium

import { afterEach, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createMemoryExecutionRepository,
  type ExecutionEventSet,
} from "../../packages/framework/core/tools/amadeus-execution-lifecycle.ts";
import { createRequiredExecutionProjectionSink } from "../../packages/framework/core/tools/amadeus-execution-projection.ts";
import {
  getField,
  runtimeGraphPath,
  stateFilePath,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  cleanupTestProject,
  createTestProject,
  seedStateFile,
} from "../harness/fixtures.ts";

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
