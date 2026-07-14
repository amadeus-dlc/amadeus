// covers: module:amadeus-swarm-driver-supervisor, module:amadeus-swarm-driver-lifecycle, requirement:NFR-03, requirement:NFR-04
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  armRun,
  consumeArm,
  createPlannedRun,
  executeArmedProcess,
  observeProcessIdentity,
  parseArmedProcessProgress,
  readRunIdentity,
  sameProcess,
  writeRunIdentity,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-supervisor.ts";
import {
  buildDispatchDigest,
  digestValue,
  parseAttemptCheckpoint,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";
import type {
  CaptureCheckpoint,
  NativeDispatchCheckpoint,
} from "../../packages/framework/core/tools/amadeus-swarm-native-execution.ts";

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "amadeus-supervisor-"));
  roots.push(value);
  return value;
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("fixture is not an object");
  return value as Record<string, unknown>;
}

function withStateDigest(value: Record<string, unknown>): Record<string, unknown> {
  const { stateDigest: _ignored, ...semantic } = value;
  const lease = object(semantic.lease);
  return {
    ...semantic,
    stateDigest: digestValue({
      ...semantic,
      lease: { ...lease, heartbeatAt: undefined, expiresAt: undefined },
    }),
  };
}

function nativeCheckpoint(captureKind: "fixed-provider-path" | "event-bound-provider-path" = "fixed-provider-path") {
  const preparedUnits = [
    { unit: "alpha", worktreePath: "/repo/alpha", branchName: "unit/alpha" },
    { unit: "beta", worktreePath: "/repo/beta", branchName: "unit/beta" },
  ];
  const expectedUnits = [
    { unit: "alpha", worktreePathDigest: digestValue("/repo/alpha"), baseCommit: "base", headCommit: "head-a" },
    { unit: "beta", worktreePathDigest: digestValue("/repo/beta"), baseCommit: "base", headCommit: "head-b" },
  ];
  const runBindingSemantic = {
    schemaVersion: 1 as const,
    expectedUnits,
    checkCommandDigest: "check",
    protectedSpec: { kind: "none" as const },
    repoIdentityDigest: "repo",
    mergeTargetBranch: "main",
    targetBeforeCommit: "base",
    evidenceDirDigest: "evidence",
  };
  const runBinding = { ...runBindingSemantic, runBindingDigest: digestValue(runBindingSemantic) };
  const selection = {
    kind: "native-selection" as const,
    schemaVersion: 1 as const,
    source: "new-env" as const,
    requested: "codex-ultra" as const,
    selected: "codex-ultra" as const,
    executionMode: "native" as const,
    harness: "codex" as const,
    topology: { topology: "unknown" as const, reason: "no-signal" as const, signals: [] },
    fallbackReason: "none" as const,
    capabilityDetails: [],
    probe: {
      status: "available" as const,
      reason: "none" as const,
      modeIdentifier: "codex-ultra",
      checks: [{ name: "mode" as const, ok: true, diagnosticCode: "CLI_AVAILABLE" as const }],
    },
  };
  const waveDigest = digestValue({ index: 0, units: ["alpha", "beta"] });
  const dispatchPreparation = {
    kind: "native" as const,
    nativeRunId: "native-run",
    fencingToken: 1,
    waveIndex: 0,
    waveDigest,
    resourcePreparationDigest: "resource-plan",
    captureIdentityDigest: digestValue({
      executionId: "execution",
      attemptId: "attempt",
      attemptNonceHash: "nonce",
      planDigest: "plan",
      waveIndex: 0,
      waveDigest,
    }),
    identityRelativePath: ".amadeus-native/identity.json",
    armRelativePath: ".amadeus-native/arm.json",
    armDigest: "arm",
    recoveryJournalRelativePath: ".amadeus-native/recovery.json",
  };
  const preparedNativeRun = {
    kind: "native" as const,
    dispatchPreparationDigest: digestValue(dispatchPreparation),
    resourceReceiptDigest: "resources",
    executionPlanDigest: "execution-plan",
    capturePlanDigest: "capture-plan",
    transportKind: "stdio-json" as const,
    captureKind,
  };
  const capture: CaptureCheckpoint = captureKind === "fixed-provider-path"
    ? {
        kind: "fixed-provider-path",
        identityDigest: dispatchPreparation.captureIdentityDigest,
        capturePlanDigest: "capture-plan",
        resourcesDigest: "resources",
        transport: "stdio-json",
        binding: {
          kind: "fixed-provider-path",
          nativeRunId: "native-run",
          sourceResourceIds: ["provider-run"],
          exactPathDigest: "path",
          sourcePlanDigest: "resource-plan",
        },
      }
    : {
        kind: "event-bound-provider-path",
        identityDigest: dispatchPreparation.captureIdentityDigest,
        capturePlanDigest: "capture-plan",
        resourcesDigest: "resources",
        transport: "stdio-json",
        binding: {
          kind: "event-bound-provider-path",
          nativeRunId: "native-run",
          exactPathDigest: "path",
          sourceEventDigest: "event",
        },
      };
  const dispatch: NativeDispatchCheckpoint = {
    kind: "native" as const,
    nativeRunId: "native-run",
    preparedNativeRunDigest: digestValue(preparedNativeRun),
    resourceReceiptDigest: "resources",
    processIdentityDigest: "process",
    armDigest: "arm",
    armDeadline: "2026-07-14T00:00:30.000Z",
    capture,
  };
  const manifestDigest = digestValue(preparedUnits);
  return withStateDigest({
    schemaVersion: 1,
    executionId: "execution",
    attemptId: "attempt",
    batch: 1,
    origin: "initial",
    nonceHash: "nonce",
    lease: {
      leaseId: "lease",
      fencingToken: 1,
      ownerId: "owner",
      heartbeatAt: "2026-07-14T00:00:00.000Z",
      expiresAt: "2026-07-14T00:00:30.000Z",
    },
    selectionInput: {
      requested: { source: "new-env", requested: "codex-ultra" },
      harness: "codex",
      batch: 1,
      expectedUnits: ["alpha", "beta"],
      topologySignals: [],
    },
    unitStates: { alpha: "dispatched", beta: "dispatched" },
    lastMutationId: "mutation",
    state: "dispatched",
    selectedContext: { selection, probeDigest: "probe", planDigest: "plan" },
    preparedUnits,
    worktreeManifestDigest: manifestDigest,
    dispatchPreparation,
    preparedNativeRun,
    dispatch,
    dispatchDigest: buildDispatchDigest({
      executionId: "execution",
      attemptId: "attempt",
      manifestDigest,
      selection,
      runBinding,
      dispatch,
    }),
    runBinding,
  });
}

function failedCheckpointWithRecovery(): Record<string, unknown> {
  const source = nativeCheckpoint();
  return withStateDigest({
    schemaVersion: source.schemaVersion,
    executionId: source.executionId,
    attemptId: source.attemptId,
    batch: source.batch,
    origin: source.origin,
    nonceHash: source.nonceHash,
    lease: source.lease,
    selectionInput: source.selectionInput,
    unitStates: source.unitStates,
    lastMutationId: "failure",
    state: "failed-resumable",
    failure: {
      code: "COORDINATOR_FAILED",
      affectedUnits: ["alpha", "beta"],
      failedFromState: "dispatched",
      recoveryContext: {
        dispatchPreparation: source.dispatchPreparation,
        preparedNativeRun: source.preparedNativeRun,
        dispatch: source.dispatch,
      },
    },
  });
}

afterEach(() => {
  for (const value of roots.splice(0)) rmSync(value, { recursive: true, force: true });
});

describe("t230 armed process supervisor", () => {
  test("observes a hashed identity for the current macOS/Linux process", () => {
    const identity = observeProcessIdentity(process.pid);
    expect(identity.type).toBe("ok");
    if (identity.type === "ok") {
      expect(identity.value.startTokenHash).toHaveLength(64);
      expect(identity.value.pid).toBe(process.pid);
    }
  });

  test("rejects Windows instead of inferring liveness", () => {
    expect(observeProcessIdentity(process.pid, "win32")).toEqual({
      type: "err",
      error: { code: "PLATFORM_UNSUPPORTED" },
    });
  });

  test("confines identity and arm files to the attempt directory", () => {
    const dir = root();
    expect(
      createPlannedRun({
        rootDir: dir,
        runId: "run-1",
        identityPath: join(dir, "..", "identity.json"),
        armPath: join(dir, "arm.json"),
        armDeadline: "2026-07-14T00:00:30.000Z",
        armCoordinates: {},
      }),
    ).toEqual({ type: "err", error: { code: "PATH_ESCAPE" } });
  });

  test("materializes identity before accepting a one-time arm", () => {
    const dir = root();
    const coordinates = {
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
    };
    const planResult = createPlannedRun({
      rootDir: dir,
      runId: "run-1",
      identityPath: join(dir, "identity.json"),
      armPath: join(dir, "arm.json"),
      armDeadline: "2026-07-14T00:00:30.000Z",
      armCoordinates: coordinates,
    });
    if (planResult.type === "err") throw new Error("fixture failed");
    expect(readRunIdentity(planResult.value).type).toBe("err");
    const processIdentity = observeProcessIdentity(process.pid);
    if (processIdentity.type === "err") throw new Error("identity unavailable");
    const identity = writeRunIdentity(planResult.value, processIdentity.value);
    const read = readRunIdentity(planResult.value);
    expect(read.type).toBe("ok");
    const receipt = {
      schemaVersion: 1 as const,
      runId: "run-1",
      ...coordinates,
      identityDigest: digestValue(identity),
    };
    expect(armRun(planResult.value, identity, receipt).type).toBe("ok");
    expect(armRun(planResult.value, identity, receipt)).toEqual({
      type: "err",
      error: { code: "ARM_ALREADY_CONSUMED" },
    });
    expect(consumeArm(planResult.value, identity).type).toBe("ok");
    expect(consumeArm(planResult.value, identity)).toEqual({
      type: "err",
      error: { code: "ARM_ALREADY_CONSUMED" },
    });
  });

  test("rejects a replay bound to another identity", () => {
    const dir = root();
    const coordinates = {
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
    };
    const plan = createPlannedRun({
      rootDir: dir,
      runId: "run-1",
      identityPath: join(dir, "identity.json"),
      armPath: join(dir, "arm.json"),
      armDeadline: "2026-07-14T00:00:30.000Z",
      armCoordinates: coordinates,
    });
    const observed = observeProcessIdentity(process.pid);
    if (plan.type === "err" || observed.type === "err") throw new Error("fixture failed");
    const identity = writeRunIdentity(plan.value, observed.value);
    const altered = { ...identity, process: { ...identity.process, startTokenHash: "different" } };
    const receipt = {
      schemaVersion: 1 as const,
      runId: "run-1",
      ...coordinates,
      identityDigest: digestValue(altered),
    };
    expect(armRun(plan.value, identity, receipt)).toEqual({
      type: "err",
      error: { code: "ARM_INVALID" },
    });
    expect(sameProcess(identity.process, altered.process)).toBeFalse();
  });

  test("rejects secret-like arm coordinates without persisting the value", () => {
    const dir = root();
    const result = createPlannedRun({
      rootDir: dir,
      runId: "run-1",
      identityPath: join(dir, "identity.json"),
      armPath: join(dir, "arm.json"),
      armDeadline: "2026-07-14T00:00:30.000Z",
      armCoordinates: { providerToken: "canary-secret" },
    });
    expect(result).toEqual({ type: "err", error: { code: "ARM_INVALID" } });
    expect(JSON.stringify(result)).not.toContain("canary-secret");
  });

  test("establishes identity and consumes an arm before launching the child", async () => {
    const phases: string[] = [];
    const result = await executeArmedProcess({
      rootDir: root(),
      runId: "run-success",
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 7,
      executable: process.execPath,
      args: ["-e", "console.log('armed-child')"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "" },
      stdin: "closed",
      timeoutMs: 5_000,
      onProgress: (progress) => {
        expect(parseArmedProcessProgress(progress).type).toBe("ok");
        phases.push(progress.phase);
      },
    });
    expect(result.type).toBe("ok");
    if (result.type === "ok") {
      expect(result.value.exitCode).toBe(0);
      expect(result.value.stdout.trim()).toBe("armed-child");
      expect(result.value.identity.startTokenHash).toHaveLength(64);
    }
    expect(phases).toEqual(["planned", "identity-established", "arm-approved", "armed", "terminal"]);
  });

  test("does not arm or launch the child when arm approval persistence fails", async () => {
    const dir = root();
    const marker = join(dir, "child-started");
    const phases: string[] = [];
    const result = await executeArmedProcess({
      rootDir: dir,
      runId: "run-progress-failure",
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
      executable: process.execPath,
      args: ["-e", "await Bun.write(process.env.MARKER, 'started')"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "", MARKER: marker },
      stdin: "closed",
      timeoutMs: 5_000,
      onProgress: (progress) => {
        phases.push(progress.phase);
        if (progress.phase === "arm-approved") throw new Error("injected progress failure");
      },
    });
    expect(result).toEqual({ type: "err", error: { code: "PROGRESS_PERSIST_FAILED" } });
    expect(phases).toEqual(["planned", "identity-established", "arm-approved"]);
    expect(existsSync(marker)).toBeFalse();
  });

  test("closes child stdin instead of inheriting the caller stream", async () => {
    const result = await executeArmedProcess({
      rootDir: root(),
      runId: "run-closed-stdin",
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
      executable: process.execPath,
      args: ["-e", "console.log((await Bun.stdin.text()).length)"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "" },
      stdin: "closed",
      timeoutMs: 5_000,
    });
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.stdout.trim()).toBe("0");
  });

  test("terminates the exact process group when the armed child times out", async () => {
    const result = await executeArmedProcess({
      rootDir: root(),
      runId: "run-timeout",
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
      executable: process.execPath,
      args: ["-e", "await Bun.sleep(10_000)"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "" },
      stdin: "closed",
      timeoutMs: 50,
    });
    expect(result).toEqual({ type: "err", error: { code: "PROCESS_TIMEOUT" } });
  });

  test("accepts both closed native capture binding schemas", () => {
    expect(parseAttemptCheckpoint(nativeCheckpoint())).toMatchObject({ type: "ok" });
    expect(parseAttemptCheckpoint(nativeCheckpoint("event-bound-provider-path"))).toMatchObject({ type: "ok" });
  });

  test("rejects capture checkpoint fields outside the closed schema", () => {
    const invalidKind = structuredClone(nativeCheckpoint());
    object(object(invalidKind.dispatch).capture).kind = "unknown";
    const invalidTransport = structuredClone(nativeCheckpoint());
    object(object(invalidTransport.dispatch).capture).transport = "pipe";
    const invalidBindingKind = structuredClone(nativeCheckpoint());
    object(object(object(invalidBindingKind.dispatch).capture).binding).kind = "event-bound-provider-path";
    const emptyResourceIds = structuredClone(nativeCheckpoint());
    object(object(object(emptyResourceIds.dispatch).capture).binding).sourceResourceIds = [];

    for (const checkpoint of [invalidKind, invalidTransport, invalidBindingKind, emptyResourceIds]) {
      expect(parseAttemptCheckpoint(checkpoint)).toMatchObject({
        type: "err",
        error: { code: "SCHEMA_INVALID", field: "dispatchPreparation" },
      });
    }
  });

  test("rejects native preparation correlations before accepting the dispatch", () => {
    const checkpoint = structuredClone(nativeCheckpoint());
    object(checkpoint.dispatchPreparation).captureIdentityDigest = "mismatched-identity";
    expect(parseAttemptCheckpoint(checkpoint)).toMatchObject({
      type: "err",
      error: { code: "SCHEMA_INVALID", field: "dispatchPreparation" },
    });
  });

  test("rejects recovery context fields outside the closed schema", () => {
    const extraContextField = structuredClone(failedCheckpointWithRecovery());
    const extraContextFailure = object(extraContextField.failure);
    object(extraContextFailure.recoveryContext).unexpected = true;
    const mismatchedPreparation = structuredClone(failedCheckpointWithRecovery());
    const mismatchFailure = object(mismatchedPreparation.failure);
    const mismatchRecovery = object(mismatchFailure.recoveryContext);
    object(mismatchRecovery.preparedNativeRun).dispatchPreparationDigest = "mismatch";
    const extraFailureField = structuredClone(failedCheckpointWithRecovery());
    object(extraFailureField.failure).unexpected = true;

    for (const checkpoint of [extraContextField, mismatchedPreparation, extraFailureField]) {
      expect(parseAttemptCheckpoint(checkpoint)).toMatchObject({
        type: "err",
        error: { code: "SCHEMA_INVALID", field: "failure" },
      });
    }
  });
});
