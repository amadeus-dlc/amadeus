// covers: execution-observability:audit-repository execution-observability:canonical-event-set
// size: medium

import { afterEach, beforeEach, expect, test } from "bun:test";
import type { Clock } from "../../packages/framework/core/tools/amadeus-execution-contract.ts";
import {
  createAuditExecutionRepository,
  createExecutionLifecycleCoordinator,
} from "../../packages/framework/core/tools/amadeus-execution-lifecycle.ts";
import { resetOtelBootstrapForTests } from "../../packages/framework/core/otel/bootstrap.ts";
import { resetFatalLatchForTests } from "../../packages/framework/core/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../packages/framework/core/otel/logger-provider.ts";
import { resetMeterProviderForTests } from "../../packages/framework/core/otel/meter-provider.ts";
import { resetTracerProviderForTests } from "../../packages/framework/core/otel/tracer-provider.ts";
import {
  cleanupTestProject,
  createTestProject,
  seedStateFile,
} from "../harness/fixtures.ts";

let projectDir: string | undefined;

beforeEach(() => {
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetMeterProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  projectDir = createTestProject();
  seedStateFile(projectDir, "state-init-active.md");
});

afterEach(() => {
  cleanupTestProject(projectDir);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetMeterProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
});

test("a lifecycle event set is canonically appended once and rebuilds in a fresh repository", () => {
  const clock: Clock = {
    wallNow: () => "2026-08-02T00:00:00.000Z",
    monotonicNowMs: () => 1,
  };
  const repository = createAuditExecutionRepository(projectDir!);
  const coordinator = createExecutionLifecycleCoordinator({
    clock,
    repository,
    projectionSink: {
      projectRequired(eventSet) {
        return {
          digest: eventSet.digest,
          stateProjectionReceiptId: "state",
          runtimeProjectionReceiptId: "runtime",
        };
      },
      rebuildRequired() {
        throw new Error("not used");
      },
      projectTelemetry() {
        return { projected: true };
      },
    },
  });
  const request = {
    idempotencyKey: "root-key",
    input: {
      intentUuid: "intent-uuid",
      stageSlug: "code-generation",
      stageInstanceId: "unit-a",
      revision: 1,
      kind: "stage",
      origin: {
        stage: "code-generation",
        agent: "amadeus-developer-agent",
        tool: "amadeus-orchestrate",
      },
    },
  };
  const first = coordinator.startOperation(request);
  expect(first.ok).toBe(true);
  expect(coordinator.startOperation(request)).toEqual(first);
  expect(repository.readEventSets()).toHaveLength(1);

  const rebuilt = createAuditExecutionRepository(projectDir!);
  expect(rebuilt.readEventSets()).toEqual(repository.readEventSets());
});
