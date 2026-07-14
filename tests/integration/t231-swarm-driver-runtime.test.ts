// covers: module:amadeus-swarm-driver-runtime, requirement:FR-05, requirement:FR-06, requirement:FR-18, audit:SWARM_DRIVER_ATTEMPTED, audit:SWARM_DRIVER_SELECTED, audit:SWARM_DRIVER_TRANSITION, audit:SWARM_NATIVE_EVIDENCE
// size: large

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  DriverRegistration,
  DriverRegistrationSet,
  type DriverAdapter,
  type NormalizedDriverEvent,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts";
import {
  observeProcessIdentity,
  type ProcessIdentity,
} from "../../packages/framework/core/tools/amadeus-armed-process.ts";
import {
  ProbeResult,
  type Harness,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-contract.ts";
import {
  createCoordinator,
  finalizeFailureIsTerminal,
  productionDriverRegistry,
  type AttemptRecoveryPort,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-runtime.ts";
import {
  AttemptStoreError,
  checkpointPath,
  createDriverAttemptStore,
  createFileDriverAttemptStore,
  type DriverAuditEvent,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-store.ts";
import { claudeDriverRegistration } from "../../packages/framework/core/tools/amadeus-swarm-driver-adapters/claude.ts";
import { kiroDriverRegistration } from "../../packages/framework/core/tools/amadeus-swarm-driver-adapters/kiro.ts";
import {
  buildFinalizeRequestBinding,
  buildRunRequestBinding,
  buildRefereeFinalizeEnvelope,
  buildTransition,
  createProbingCheckpoint,
  digestValue,
  parseAttemptCheckpoint,
  type AttemptCheckpoint,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";
import { executeSwarmDriverCommand } from "../../packages/framework/core/tools/amadeus-swarm-driver.ts";
import {
  ATTEMPT_FAILURE_CODE_VALUES,
  type AttemptFailureCode,
} from "../../packages/framework/core/tools/amadeus-swarm-finalize-contract.ts";
import type {
  NativeDispatchCheckpoint,
  NativeDispatchPreparation,
  NativeLifecycleExecutionInput,
  PreparedNativeRun,
} from "../../packages/framework/core/tools/amadeus-swarm-native-execution.ts";

const preparedUnits = Object.freeze([
  Object.freeze({ unit: "alpha", worktreePath: "/repo/alpha", branchName: "unit/alpha" }),
  Object.freeze({ unit: "beta", worktreePath: "/repo/beta", branchName: "unit/beta" }),
]);

const runGitBinding = Object.freeze({
  expectedUnits: Object.freeze([
    Object.freeze({
      unit: "alpha",
      worktreePathDigest: digestValue("/repo/alpha"),
      baseCommit: "base",
      headCommit: "head-a",
    }),
    Object.freeze({
      unit: "beta",
      worktreePathDigest: digestValue("/repo/beta"),
      baseCommit: "base",
      headCommit: "head-b",
    }),
  ]),
  protectedSpec: Object.freeze({ kind: "none" as const }),
  repoIdentityDigest: "repo",
  mergeTargetBranch: "main",
  targetBeforeCommit: "base",
});

function availableProbe() {
  const result = ProbeResult.build({
    status: "available",
    reason: "none",
    modeIdentifier: "codex-ultra",
    checks: [{ name: "mode", ok: true, diagnosticCode: "CLI_AVAILABLE" }],
  });
  if (result.type === "err") throw new Error("Invalid probe fixture");
  return result.value;
}

function nativeEvents(input: Readonly<{
  executionId: string;
  attemptId: string;
  nonceHash: string;
  planDigest: string;
  waveDigest: string;
  nativeRunId: string;
}>): readonly NormalizedDriverEvent[] {
  const common = {
    v: 1 as const,
    driver: "codex-ultra" as const,
    executionId: input.executionId,
    attemptId: input.attemptId,
    attemptNonceHash: input.nonceHash,
    planDigest: input.planDigest,
    waveIndex: 0,
    waveDigest: input.waveDigest,
    nativeRunId: input.nativeRunId,
  };
  return Object.freeze([
    { ...common, kind: "mode-confirmed", source: "model-handshake", modeIdentifier: "codex-ultra" },
    { ...common, kind: "coordinator-started", source: "stream", coordinatorId: "coordinator-1" },
    {
      ...common,
      kind: "native-state-observed",
      source: "hook",
      snapshotDigest: "snapshot-1",
      bindings: [
        { unit: "alpha", childId: "child-alpha" },
        { unit: "beta", childId: "child-beta" },
      ],
    },
    { ...common, kind: "native-child-started", source: "hook", unit: "alpha", childId: "child-alpha" },
    { ...common, kind: "native-child-started", source: "hook", unit: "beta", childId: "child-beta" },
    {
      ...common,
      kind: "native-child-stopped",
      source: "hook",
      unit: "alpha",
      childId: "child-alpha",
      outcome: "completed",
    },
    {
      ...common,
      kind: "native-child-stopped",
      source: "hook",
      unit: "beta",
      childId: "child-beta",
      outcome: "completed",
    },
    { ...common, kind: "native-coordination", source: "hook", marker: "codex-subagent-hook" },
    { ...common, kind: "coordinator-stopped", source: "stream", coordinatorId: "coordinator-1", exitCode: 0 },
  ]);
}

type NativeCallbackMode =
  | "valid"
  | "duplicate-dispatch-prepared"
  | "duplicate-resources-prepared"
  | "invalid-ready-to-arm"
  | "event-bound-capture"
  | "duplicate-capture-bound"
  | "process-observed-then-fails"
  | "duplicate-process-observed"
  | "conflicting-process-observed"
  | "missing-ready-to-arm";

const defaultProcessObservation = Object.freeze({
  processObservedCount: 1,
  conflictingProcessObserved: false,
  failAfterProcessObserved: false,
});

const nativeCallbackPlans = Object.freeze({
  valid: { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 1, ready: true, validNativeRunId: true, captureKind: "hook-only", bindingCount: 0 },
  "duplicate-dispatch-prepared": { ...defaultProcessObservation, dispatchCount: 2, resourceCount: 1, ready: true, validNativeRunId: true, captureKind: "hook-only", bindingCount: 0 },
  "duplicate-resources-prepared": { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 2, ready: true, validNativeRunId: true, captureKind: "hook-only", bindingCount: 0 },
  "invalid-ready-to-arm": { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 1, ready: true, validNativeRunId: false, captureKind: "hook-only", bindingCount: 0 },
  "event-bound-capture": { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 1, ready: true, validNativeRunId: true, captureKind: "event-bound-provider-path", bindingCount: 1 },
  "duplicate-capture-bound": { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 1, ready: true, validNativeRunId: true, captureKind: "event-bound-provider-path", bindingCount: 2 },
  "process-observed-then-fails": { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 1, ready: false, validNativeRunId: true, captureKind: "hook-only", bindingCount: 0, failAfterProcessObserved: true },
  "duplicate-process-observed": { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 1, ready: true, validNativeRunId: true, captureKind: "hook-only", bindingCount: 0, processObservedCount: 2 },
  "conflicting-process-observed": { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 1, ready: true, validNativeRunId: true, captureKind: "hook-only", bindingCount: 0, processObservedCount: 2, conflictingProcessObserved: true },
  "missing-ready-to-arm": { ...defaultProcessObservation, dispatchCount: 1, resourceCount: 1, ready: false, validNativeRunId: true, captureKind: "hook-only", bindingCount: 0 },
} as const satisfies Record<NativeCallbackMode, Readonly<{
  dispatchCount: number;
  resourceCount: number;
  ready: boolean;
  validNativeRunId: boolean;
  captureKind: "hook-only" | "event-bound-provider-path";
  bindingCount: number;
  processObservedCount: number;
  conflictingProcessObserved: boolean;
  failAfterProcessObserved: boolean;
}>>);

async function notifyNativeCallbacks(input: Readonly<{
  plan: (typeof nativeCallbackPlans)[NativeCallbackMode];
  nativeRunId: string;
  dispatchPreparation: NativeDispatchPreparation;
  preparedNativeRun: PreparedNativeRun;
  onDispatchPrepared: NativeLifecycleExecutionInput["onDispatchPrepared"];
  onResourcesPrepared: NativeLifecycleExecutionInput["onResourcesPrepared"];
  onProcessObserved: NativeLifecycleExecutionInput["onProcessObserved"];
  onReadyToArm: NativeLifecycleExecutionInput["onReadyToArm"];
  onCaptureBound: NativeLifecycleExecutionInput["onCaptureBound"];
}>): Promise<void> {
  for (let count = 0; count < input.plan.dispatchCount; count += 1) {
    await input.onDispatchPrepared(input.dispatchPreparation);
  }
  for (let count = 0; count < input.plan.resourceCount; count += 1) {
    await input.onResourcesPrepared(input.preparedNativeRun);
  }
  const dispatch: NativeDispatchCheckpoint = Object.freeze({
    kind: "native",
    nativeRunId: input.plan.validNativeRunId ? input.nativeRunId : "unexpected-native-run",
    preparedNativeRunDigest: digestValue(input.preparedNativeRun),
    resourceReceiptDigest: "resource-receipt",
    processIdentityDigest: "process-identity",
    armDigest: "arm-digest",
    armDeadline: "2026-07-14T00:00:30.000Z",
    capture: input.plan.captureKind === "event-bound-provider-path"
      ? {
          kind: "event-bound-provider-path" as const,
          identityDigest: input.dispatchPreparation.captureIdentityDigest,
          capturePlanDigest: "capture-plan",
          resourcesDigest: "resource-receipt",
          transport: "stdio-json" as const,
        }
      : {
          kind: "hook-only" as const,
          identityDigest: input.dispatchPreparation.captureIdentityDigest,
          capturePlanDigest: "capture-plan",
          resourcesDigest: "resource-receipt",
          transport: "stdio-json" as const,
        },
  });
  for (let count = 0; count < input.plan.processObservedCount; count += 1) {
    input.onProcessObserved?.(
      count > 0 && input.plan.conflictingProcessObserved
        ? Object.freeze({ ...dispatch, processIdentityDigest: "conflicting-process-identity" })
        : dispatch,
    );
  }
  if (input.plan.failAfterProcessObserved) throw new Error("injected post-process-observation failure");
  if (!input.plan.ready) return;
  await input.onReadyToArm(dispatch);
  const binding = {
    kind: "event-bound-provider-path" as const,
    nativeRunId: input.nativeRunId,
    exactPathDigest: "exact-path",
    sourceEventDigest: "source-event",
  };
  for (let count = 0; count < input.plan.bindingCount; count += 1) {
    await input.onCaptureBound(binding);
  }
}

function fixture(
  options: Readonly<{
    nativeAvailable?: boolean;
    invalidEvidence?: boolean;
    now?: () => Date;
    recovery?: AttemptRecoveryPort;
    ownerLive?: boolean | (() => boolean);
    ownerLivenessUnknown?: boolean;
    recoveryOwnerIdentityAvailable?: boolean;
    auditReadable?: boolean;
    callbackMode?: NativeCallbackMode;
    beforeHeartbeat?: () => void;
    heartbeatTimerFailure?: "start" | "stop";
    omitHeartbeatTimer?: boolean;
    omitObserveOwner?: boolean;
    recordNativeEvidenceError?: "stale-writer" | "generic";
    claimActiveRecoveryError?: "claim-active" | "stale-writer" | "generic";
    registrationUnavailableOnRun?: boolean;
    failDispatchPreparationCheckpointWriteOnce?: boolean;
    failDispatchPreparationAuditAppendOnce?: boolean;
    failReadyToArmCheckpointWriteOnce?: boolean;
    failReadyToArmAuditAppendOnce?: boolean;
    invalidDispatchPreparation?: "absolute-path" | "parent-path" | "empty-digest";
  }> = {},
) {
  const checkpoints = new Map<number, AttemptCheckpoint>();
  const audits: { event: DriverAuditEvent; fields: Readonly<Record<string, string>> }[] = [];
  let probeCount = 0;
  let executionCount = 0;
  let failCheckpointWrite = false;
  let failDispatchPreparationCheckpointWrite = options.failDispatchPreparationCheckpointWriteOnce === true;
  let failDispatchPreparationAuditAppend = options.failDispatchPreparationAuditAppendOnce === true;
  let failReadyToArmCheckpointWrite = options.failReadyToArmCheckpointWriteOnce === true;
  let failReadyToArmAuditAppend = options.failReadyToArmAuditAppendOnce === true;
  let heartbeatCallback: (() => void) | undefined;
  let heartbeatDelay: number | undefined;
  let heartbeatCancelled = false;
  let id = 0;
  const adapter: DriverAdapter = Object.freeze({
    driver: "codex-ultra",
    provider: "codex",
    supports: (harness: Harness) => harness === "codex",
    probe: async () => {
      probeCount += 1;
      return availableProbe();
    },
    prepareResources: () => ({ resources: Object.freeze([]), preparationDigest: digestValue([]) }),
    buildExecution: (input) => ({
      launch: {
        executable: "codex",
        args: ["exec"],
        cwd: "/repo",
        env: {},
        transport: { kind: "stdio-json" as const, stdin: "closed" as const, output: "stream-json" as const },
        timeoutMs: 1_000,
      },
      capture: { kind: "hook-only" as const, hookDir: input.evidenceDir },
      captureIdentity: {
        executionId: input.plan.executionId,
        attemptId: input.plan.attemptId,
        attemptNonceHash: input.plan.attemptNonceHash,
        planDigest: input.plan.planDigest,
        waveIndex: input.wave.index,
        waveDigest: digestValue(input.wave),
      },
      resources: Object.freeze([]),
    }),
    resolveCaptureBinding: () => ({ kind: "not-binding" as const }),
    openEvidenceSession: () => Object.freeze({
      liveInputs: Object.freeze({
        providerState: (async function* () {})(),
        nativeEvents: (async function* () {})(),
      }),
      ingest: () => {},
      seal: async function* () {},
      abort: async () => {},
    }),
    observeControl: async function* () {},
  });
  const codex = DriverRegistration.build({
    provider: "codex",
    drivers: ["codex-ultra"],
    harnesses: ["codex"],
    slot: options.nativeAvailable
      ? { kind: "available", adapters: [adapter] }
      : { kind: "unavailable", diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED" },
  });
  if (codex.type === "err") throw new Error("Invalid Codex registration fixture");
  const registry = DriverRegistrationSet.build([
    claudeDriverRegistration,
    codex.value,
    kiroDriverRegistration,
  ]);
  if (registry.type === "err") throw new Error("Invalid registry fixture");
  const store = createDriverAttemptStore({
    checkpoint: {
      read: (batch) => checkpoints.get(batch) ?? null,
      write: (batch, checkpoint) => {
        if (failCheckpointWrite) throw new Error("injected checkpoint write failure");
        if (
          failDispatchPreparationCheckpointWrite &&
          checkpoint.state === "prepared" &&
          checkpoint.dispatchPreparation !== undefined &&
          checkpoint.preparedNativeRun === undefined
        ) {
          failDispatchPreparationCheckpointWrite = false;
          throw new Error("injected dispatch preparation checkpoint write failure");
        }
        if (
          failReadyToArmCheckpointWrite &&
          checkpoint.state === "dispatched" &&
          checkpoint.dispatch.kind === "native"
        ) {
          failReadyToArmCheckpointWrite = false;
          throw new Error("injected ready-to-arm checkpoint write failure");
        }
        checkpoints.set(batch, checkpoint);
      },
    },
    audit: {
      append: (event, fields) => {
        if (
          failDispatchPreparationAuditAppend &&
          event === "SWARM_DRIVER_TRANSITION" &&
          fields["Transition edge"] === "native-dispatch-prepared"
        ) {
          failDispatchPreparationAuditAppend = false;
          throw new Error("injected dispatch preparation audit append failure");
        }
        if (
          failReadyToArmAuditAppend &&
          event === "SWARM_DRIVER_TRANSITION" &&
          fields["Transition edge"] === "prepared-dispatched"
        ) {
          failReadyToArmAuditAppend = false;
          throw new Error("injected ready-to-arm audit append failure");
        }
        audits.push({ event, fields });
      },
      hasEventKey: (key) => audits.some(({ fields }) => fields["Event key"] === key),
      read: () => options.auditReadable
        ? audits.map(({ event, fields }) =>
            `\n## ${event}\n**Timestamp**: 2026-07-14T00:00:00.000Z\n**Event**: ${event}\n${Object.entries(fields)
              .map(([key, value]) => `**${key}**: ${value}`)
              .join("\n")}\n\n---\n`,
          ).join("")
        : "",
    },
    lock: { run: (fn) => fn() },
  });
  const coordinatorStore = Object.freeze({
    ...store,
    recordNativeEvidence(evidence: Parameters<typeof store.recordNativeEvidence>[0]): void {
      if (options.recordNativeEvidenceError === "stale-writer") throw new AttemptStoreError("STALE_WRITER");
      if (options.recordNativeEvidenceError === "generic") throw new Error("injected evidence write failure");
      store.recordNativeEvidence(evidence);
    },
    claimActiveRecovery(claim: Parameters<typeof store.claimActiveRecovery>[0]): AttemptCheckpoint {
      if (options.claimActiveRecoveryError === "claim-active") throw new AttemptStoreError("RECOVERY_CLAIM_ACTIVE");
      if (options.claimActiveRecoveryError === "stale-writer") throw new AttemptStoreError("STALE_WRITER");
      if (options.claimActiveRecoveryError === "generic") throw new Error("injected recovery claim failure");
      return store.claimActiveRecovery(claim);
    },
  });
  let registrationUnavailable = false;
  const coordinatorRegistry = options.registrationUnavailableOnRun
    ? Object.freeze({
        registrations: () => registry.value.registrations(),
        forDriver: (driver: Parameters<typeof registry.value.forDriver>[0]) =>
          registrationUnavailable
            ? productionDriverRegistry.forDriver(driver)
            : registry.value.forDriver(driver),
      })
    : registry.value;
  const coordinator = createCoordinator({
    registry: coordinatorRegistry,
    store: coordinatorStore,
    mintId: () => `id-${++id}`,
    now: options.now ?? (() => new Date("2026-07-14T00:00:00.000Z")),
    nativeExecution: {
      execute: async ({
        launchInput,
        context,
        fencingToken,
        onDispatchPrepared,
        onResourcesPrepared,
        onProcessObserved,
        onReadyToArm,
        onCaptureBound,
      }) => {
        executionCount += 1;
        const callbackPlan = nativeCallbackPlans[options.callbackMode ?? "valid"];
        const dispatchPreparation = {
          kind: "native" as const,
          nativeRunId: launchInput.nativeRunId,
          planDigest: context.planDigest,
          fencingToken,
          waveIndex: context.waveIndex,
          waveDigest: context.waveDigest,
          resourcePreparationDigest: digestValue([]),
          captureIdentityDigest: digestValue({
            executionId: context.executionId,
            attemptId: context.attemptId,
            attemptNonceHash: context.attemptNonceHash,
            planDigest: context.planDigest,
            waveIndex: context.waveIndex,
            waveDigest: context.waveDigest,
          }),
          identityRelativePath: ".amadeus/native/identity.json",
          armRelativePath: ".amadeus/native/arm.json",
          armDigest: "arm-digest",
          runEpochDigest: "run-epoch-digest",
          recoveryJournalRelativePath: ".amadeus/native/recovery.json",
          ...(options.invalidDispatchPreparation === "absolute-path"
            ? { identityRelativePath: "/outside/identity.json" }
            : {}),
          ...(options.invalidDispatchPreparation === "parent-path"
            ? { recoveryJournalRelativePath: "../recovery.json" }
            : {}),
          ...(options.invalidDispatchPreparation === "empty-digest" ? { armDigest: "" } : {}),
        };
        const preparedNativeRun = {
          kind: "native" as const,
          dispatchPreparationDigest: digestValue(dispatchPreparation),
          resourceReceiptDigest: "resource-receipt",
          executionPlanDigest: "execution-plan",
          capturePlanDigest: "capture-plan",
          transportKind: "stdio-json" as const,
          captureKind: callbackPlan.captureKind,
        };
        await notifyNativeCallbacks({
          plan: callbackPlan,
          nativeRunId: launchInput.nativeRunId,
          dispatchPreparation,
          preparedNativeRun,
          onDispatchPrepared,
          onResourcesPrepared,
          onProcessObserved,
          onReadyToArm,
          onCaptureBound,
        });
        options.beforeHeartbeat?.();
        heartbeatCallback?.();
        if (options.invalidEvidence) return [];
        return nativeEvents({
          executionId: launchInput.plan.executionId,
          attemptId: launchInput.plan.attemptId,
          nonceHash: launchInput.plan.attemptNonceHash,
          planDigest: launchInput.plan.planDigest,
          waveDigest: context.waveDigest,
          nativeRunId: launchInput.nativeRunId,
        });
      },
    },
    recovery: options.recovery,
    ...(options.omitObserveOwner
      ? {}
      : {
          observeOwner: (expected: ProcessIdentity) => {
            if (options.ownerLivenessUnknown) return Object.freeze({ status: "unknown" as const });
            const ownerLive = typeof options.ownerLive === "function" ? options.ownerLive() : options.ownerLive;
            return ownerLive === false
              ? Object.freeze({ status: "dead" as const })
              : Object.freeze({ status: "live" as const, observedOwner: expected });
          },
        }),
    ...(options.recoveryOwnerIdentityAvailable === false
      ? { observeRecoveryOwner: () => null }
      : {}),
    ...(options.omitHeartbeatTimer
      ? {}
      : {
          heartbeatTimer: {
            start: (callback: () => void, delay: number) => {
              if (options.heartbeatTimerFailure === "start") throw new Error("injected heartbeat start failure");
              heartbeatCallback = callback;
              heartbeatDelay = delay;
              return "heartbeat-fixture";
            },
            stop: () => {
              if (options.heartbeatTimerFailure === "stop") throw new Error("injected heartbeat stop failure");
              heartbeatCancelled = true;
            },
          },
        }),
  });
  return {
    coordinator,
    store,
    audits,
    probeCount: () => probeCount,
    executionCount: () => executionCount,
    heartbeatDelay: () => heartbeatDelay,
    heartbeatCancelled: () => heartbeatCancelled,
    failWrites: (enabled: boolean) => {
      failCheckpointWrite = enabled;
    },
    makeRegistrationUnavailable: () => {
      registrationUnavailable = true;
    },
  };
}

const baseResolve = Object.freeze({
  harness: "codex" as const,
  units: ["alpha", "beta"],
  topologySignals: [],
  projectDir: "/repo",
  selectionEnvironment: {},
});

async function failNativeAttempt(f: ReturnType<typeof fixture>): Promise<AttemptCheckpoint> {
  const resolved = await f.coordinator.resolve({
    ...baseResolve,
    batch: 1,
    selectionEnvironment: { AMADEUS_SWARM_DRIVER: "codex-ultra" },
  });
  if (resolved.type === "err") throw new Error("resolve fixture failed");
  await f.coordinator.run({
    executionId: resolved.value.executionId,
    attemptId: resolved.value.attemptId,
    batch: 1,
    preparedUnits,
    convergenceCommand: "bun test",
    evidenceDir: "/repo/evidence",
    gitBinding: runGitBinding,
  });
  const checkpoint = f.store.read(1);
  if (checkpoint?.state !== "failed-resumable") throw new Error("failed checkpoint fixture failed");
  return checkpoint;
}

async function runNativeAttempt(f: ReturnType<typeof fixture>) {
  const resolved = await f.coordinator.resolve({
    ...baseResolve,
    batch: 1,
    selectionEnvironment: { AMADEUS_SWARM_DRIVER: "codex-ultra" },
  });
  if (resolved.type === "err") throw new Error("resolve fixture failed");
  return f.coordinator.run({
    executionId: resolved.value.executionId,
    attemptId: resolved.value.attemptId,
    batch: 1,
    preparedUnits,
    convergenceCommand: "bun test",
    evidenceDir: "/repo/evidence",
    gitBinding: runGitBinding,
  });
}

function resumeRequest(checkpoint: AttemptCheckpoint) {
  return {
    batch: 1,
    previousAttemptId: checkpoint.attemptId,
    newAttemptId: "resume-attempt",
    nonceHash: "resume-nonce",
    leaseId: "resume-lease",
    ownerId: "resume-owner",
    mutationId: "resume-mutation",
    reusedConvergedUnits: [],
  } as const;
}

const expiredOwnerProcess = Object.freeze({
  platform: "darwin" as const,
  pid: 42,
  processGroupId: 42,
  startTokenHash: "expired-owner-start-token",
});

function probingCheckpoint(
  options: Readonly<{ ownerProcess?: ProcessIdentity | false }> = {},
): AttemptCheckpoint {
  const checkpoint = createProbingCheckpoint({
    executionId: "audit-only-execution",
    attemptId: "audit-only-attempt",
    batch: 1,
    origin: "initial",
    nonceHash: "audit-only-nonce",
    mutationId: "audit-only-begin",
    lease: {
      leaseId: "audit-only-lease",
      fencingToken: 1,
      ownerId: "audit-only-owner",
      heartbeatAt: "2026-07-14T00:00:00.000Z",
      expiresAt: "2026-07-14T00:00:30.000Z",
      ...(options.ownerProcess === false
        ? {}
        : { ownerProcess: options.ownerProcess ?? expiredOwnerProcess }),
    },
    selectionInput: {
      requested: { source: "default", requested: "auto" },
      harness: "codex",
      batch: 1,
      expectedUnits: ["alpha", "beta"],
      topologySignals: [],
    },
  });
  if (checkpoint.type === "err") throw new Error("probing checkpoint fixture failed");
  return checkpoint.value;
}

async function resolveNativeCheckpoint(f: ReturnType<typeof fixture>): Promise<AttemptCheckpoint> {
  const resolved = await f.coordinator.resolve({
    ...baseResolve,
    batch: 1,
    selectionEnvironment: { AMADEUS_SWARM_DRIVER: "codex-ultra" },
  });
  if (resolved.type === "err") throw new Error("resolve fixture failed");
  const checkpoint = f.store.read(1);
  if (checkpoint?.state !== "selected") throw new Error("selected checkpoint fixture failed");
  return checkpoint;
}

function materializePreparedCheckpoint(
  f: ReturnType<typeof fixture>,
  selected: AttemptCheckpoint,
  withDispatchPreparation: boolean,
): AttemptCheckpoint {
  if (selected.state !== "selected") throw new Error("selected checkpoint fixture failed");
  const runBinding = buildRunRequestBinding({
    preparedUnits,
    gitBinding: runGitBinding,
    convergenceCommand: "bun test",
    evidenceDir: "/repo/evidence",
  });
  if (runBinding.type === "err") throw new Error("run binding fixture failed");
  const waveDigest = digestValue({ index: 0, units: selected.selectionInput.expectedUnits });
  const dispatchPreparation: NativeDispatchPreparation = Object.freeze({
    kind: "native",
    nativeRunId: "prepared-native-run",
    planDigest: selected.selectedContext.planDigest,
    fencingToken: selected.lease.fencingToken + 1,
    waveIndex: 0,
    waveDigest,
    resourcePreparationDigest: digestValue([]),
    captureIdentityDigest: digestValue({
      executionId: selected.executionId,
      attemptId: selected.attemptId,
      attemptNonceHash: selected.nonceHash,
      planDigest: selected.selectedContext.planDigest,
      waveIndex: 0,
      waveDigest,
    }),
    identityRelativePath: ".amadeus/native/identity.json",
    armRelativePath: ".amadeus/native/arm.json",
    armDigest: "prepared-arm",
    runEpochDigest: "prepared-run-epoch",
    recoveryJournalRelativePath: ".amadeus/native/recovery.json",
  });
  const { stateDigest: _stateDigest, ...selectedWithoutDigest } = selected;
  const transition = buildTransition(selected, {
    transitionId: "prepared-fixture-transition",
    edge: "selected-prepared",
    executionId: selected.executionId,
    attemptId: selected.attemptId,
    leaseId: selected.lease.leaseId,
    fencingToken: selected.lease.fencingToken,
    post: {
      ...selectedWithoutDigest,
      state: "prepared",
      lease: {
        ...selected.lease,
        leaseId: "prepared-fixture-lease",
        fencingToken: selected.lease.fencingToken + 1,
      },
      preparedUnits,
      worktreeManifestDigest: digestValue(preparedUnits),
      runBinding: runBinding.value,
      ...(withDispatchPreparation ? { dispatchPreparation } : {}),
    },
  });
  if (transition.type === "err") throw new Error("prepared transition fixture failed");
  const prepared = f.store.transition(transition.value);
  if (prepared.state !== "prepared") throw new Error("prepared checkpoint fixture failed");
  return prepared;
}

describe("t231 swarm driver runtime", () => {
  test("classifies every closed finalize failure code as resumable or terminal", () => {
    const expected = {
      INPUT_INVALID: true,
      EXPLICIT_DRIVER_UNAVAILABLE: true,
      PERSISTENCE_FAILED: false,
      COORDINATOR_FAILED: false,
      NATIVE_EVIDENCE_INVALID: false,
      NATIVE_CHILD_FAILED: false,
      ATTEMPT_LEASE_ACTIVE: false,
      ATTEMPT_LIVENESS_UNKNOWN: false,
      ORPHAN_PROCESS_GROUP_ACTIVE: false,
      REFEREE_CHECK_FAILED: false,
      REFEREE_FINALIZE_FAILED: false,
      REFEREE_CLAIM_ACTIVE: false,
      METADATA_MERGE_FAILED: false,
      CODE_MERGE_FAILED: false,
      PROTECTED_SPEC_BINDING_INVALID: true,
      LYING_CONDUCTOR: true,
      FINALIZE_BINDING_INVALID: true,
      SCHEMA_INVALID: true,
    } satisfies Record<AttemptFailureCode, boolean>;
    expect(Object.keys(expected).sort()).toEqual([...ATTEMPT_FAILURE_CODE_VALUES].sort());
    for (const code of ATTEMPT_FAILURE_CODE_VALUES) {
      expect(finalizeFailureIsTerminal(code)).toBe(expected[code]);
    }
  });

  test("production registry exhaustively exposes four fail-closed native slots", () => {
    expect(productionDriverRegistry.registrations().map((entry) => entry.provider)).toEqual([
      "claude",
      "codex",
      "kiro",
    ]);
    for (const driver of ["claude-agent-teams", "claude-ultracode", "codex-ultra", "kiro-subagent"] as const) {
      expect(productionDriverRegistry.forDriver(driver).slot.kind).toBe("unavailable");
    }
  });

  test("refuses resume while the attempt lease is active", async () => {
    const clock = new Date("2026-07-14T00:00:00.000Z");
    const f = fixture({ nativeAvailable: true, invalidEvidence: true, now: () => clock, ownerLive: false });
    const failed = await failNativeAttempt(f);
    if (failed.state !== "failed-resumable" && failed.state !== "failed-terminal") {
      throw new Error("expected failed checkpoint");
    }
    expect(parseAttemptCheckpoint(failed)).toMatchObject({ type: "ok" });
    expect(failed.failure.recoveryContext).toMatchObject({
      dispatchPreparation: { nativeRunId: expect.any(String) },
      preparedNativeRun: { kind: "native" },
      dispatch: { kind: "native" },
    });
    expect(JSON.stringify(failed.failure.recoveryContext)).not.toContain("/evidence/");
    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LEASE_ACTIVE" },
    });
  });

  test("refuses expired post-dispatch resume when orphan liveness is unknown", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    const f = fixture({ nativeAvailable: true, invalidEvidence: true, now: () => clock, ownerLive: false });
    const failed = await failNativeAttempt(f);
    clock = new Date("2026-07-14T00:00:31.000Z");
    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
  });

  test("resumes an expired attempt only after injected orphan recovery succeeds", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    const recovery: AttemptRecoveryPort = Object.freeze({ recover: async () => "recovered" as const });
    const f = fixture({
      nativeAvailable: true,
      invalidEvidence: true,
      now: () => clock,
      ownerLive: false,
      recovery,
    });
    const failed = await failNativeAttempt(f);
    clock = new Date("2026-07-14T00:00:31.000Z");
    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "ok",
      value: { state: "probing", origin: "resumed", previousAttemptId: failed.attemptId },
    });
  });

  test("materializes an expired active attempt as recovered before resuming it", async () => {
    const recovery: AttemptRecoveryPort = Object.freeze({ recover: async () => "recovered" as const });
    const f = fixture({
      now: () => new Date("2026-07-14T00:00:31.000Z"),
      ownerLive: false,
      recovery,
    });
    const active = f.store.begin(probingCheckpoint());

    expect(await f.coordinator.resume(resumeRequest(active))).toMatchObject({
      type: "ok",
      value: {
        state: "probing",
        origin: "resumed",
        previousAttemptId: active.attemptId,
        lease: { fencingToken: 3 },
      },
    });
    expect(f.audits
      .filter(({ event }) => event === "SWARM_DRIVER_TRANSITION")
      .map(({ fields }) => fields["Transition edge"])).toEqual([
      "active-recovery-claimed",
      "active-attempt-recovered",
      "attempt-resumed",
    ]);
  });

  test("refuses to claim active recovery when the expired owner identity is missing", async () => {
    let recoveryCalls = 0;
    const recovery: AttemptRecoveryPort = Object.freeze({
      recover: async () => {
        recoveryCalls += 1;
        return "recovered" as const;
      },
    });
    const f = fixture({
      now: () => new Date("2026-07-14T00:00:31.000Z"),
      ownerLive: false,
      recovery,
    });
    const active = f.store.begin(probingCheckpoint({ ownerProcess: false }));

    expect(await f.coordinator.resume(resumeRequest(active))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
    expect(recoveryCalls).toBe(0);
    expect(f.store.read(1)).toEqual(active);
  });

  test("refuses to claim active recovery when old-owner liveness observation fails", async () => {
    let recoveryCalls = 0;
    const f = fixture({
      now: () => new Date("2026-07-14T00:00:31.000Z"),
      ownerLivenessUnknown: true,
      recovery: Object.freeze({
        recover: async () => {
          recoveryCalls += 1;
          return "recovered" as const;
        },
      }),
    });
    const active = f.store.begin(probingCheckpoint());

    expect(await f.coordinator.resume(resumeRequest(active))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
    expect(recoveryCalls).toBe(0);
    expect(f.store.read(1)).toEqual(active);
  });

  test("refuses to claim active recovery when the recovery-owner identity cannot be established", async () => {
    let recoveryCalls = 0;
    const f = fixture({
      now: () => new Date("2026-07-14T00:00:31.000Z"),
      ownerLive: false,
      recoveryOwnerIdentityAvailable: false,
      recovery: Object.freeze({
        recover: async () => {
          recoveryCalls += 1;
          return "recovered" as const;
        },
      }),
    });
    const active = f.store.begin(probingCheckpoint());

    expect(await f.coordinator.resume(resumeRequest(active))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
    expect(recoveryCalls).toBe(0);
    expect(f.store.read(1)).toEqual(active);
  });

  test("uses exact process observation when no owner observer is injected", async () => {
    const ownerProcess = observeProcessIdentity(process.pid);
    if (ownerProcess.type === "err") throw new Error("process identity fixture failed");
    const f = fixture({
      now: () => new Date("2026-07-14T00:00:31.000Z"),
      omitObserveOwner: true,
    });
    const active = f.store.begin(probingCheckpoint({ ownerProcess: ownerProcess.value }));

    expect(await f.coordinator.resume(resumeRequest(active))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LEASE_ACTIVE" },
    });
  });

  for (const claimActiveRecoveryError of ["claim-active", "stale-writer"] as const) {
    test(`maps ${claimActiveRecoveryError} recovery claim races to an active lease`, async () => {
      const f = fixture({
        now: () => new Date("2026-07-14T00:00:31.000Z"),
        ownerLive: false,
        claimActiveRecoveryError,
      });
      const active = f.store.begin(probingCheckpoint());

      expect(await f.coordinator.resume(resumeRequest(active))).toMatchObject({
        type: "err",
        error: { code: "ATTEMPT_LEASE_ACTIVE" },
      });
    });
  }

  test("fails closed when an unexpected recovery claim error escapes the store", async () => {
    const f = fixture({
      now: () => new Date("2026-07-14T00:00:31.000Z"),
      ownerLive: false,
      claimActiveRecoveryError: "generic",
    });
    const active = f.store.begin(probingCheckpoint());

    expect(await f.coordinator.resume(resumeRequest(active))).toMatchObject({
      type: "err",
      error: { code: "CHECKPOINT_STATE_INVALID" },
    });
  });

  test("refuses recovery for a failure originating after evidence verification", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    const f = fixture({ nativeAvailable: true, now: () => clock, ownerLive: false });
    expect(await runNativeAttempt(f)).toMatchObject({ type: "ok" });
    const verified = f.store.read(1);
    if (verified?.state !== "evidence-verified") throw new Error("verified checkpoint fixture failed");
    const failedTransition = buildTransition(verified, {
      transitionId: "failed-after-evidence",
      edge: "attempt-failed",
      executionId: verified.executionId,
      attemptId: verified.attemptId,
      leaseId: verified.lease.leaseId,
      fencingToken: verified.lease.fencingToken,
      post: {
        schemaVersion: verified.schemaVersion,
        state: "failed-resumable",
        executionId: verified.executionId,
        attemptId: verified.attemptId,
        batch: verified.batch,
        origin: verified.origin,
        nonceHash: verified.nonceHash,
        lease: verified.lease,
        selectionInput: verified.selectionInput,
        unitStates: verified.unitStates,
        lastMutationId: verified.lastMutationId,
        failure: {
          code: "COORDINATOR_FAILED",
          affectedUnits: verified.selectionInput.expectedUnits,
          failedFromState: "evidence-verified",
        },
      },
    });
    if (failedTransition.type === "err") throw new Error("failed transition fixture failed");
    const failed = f.store.transition(failedTransition.value);
    clock = new Date("2026-07-14T00:00:31.000Z");

    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
  });

  test("locally recovers an expired prepared attempt before dispatch preparation", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    const f = fixture({ nativeAvailable: true, now: () => clock, ownerLive: false });
    const selected = await resolveNativeCheckpoint(f);
    const prepared = materializePreparedCheckpoint(f, selected, false);
    clock = new Date("2026-07-14T00:00:31.000Z");

    expect(await f.coordinator.resume(resumeRequest(prepared))).toMatchObject({
      type: "ok",
      value: { state: "probing", origin: "resumed" },
    });
  });

  test("requires external recovery after native dispatch preparation", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    const f = fixture({ nativeAvailable: true, now: () => clock, ownerLive: false });
    const selected = await resolveNativeCheckpoint(f);
    const prepared = materializePreparedCheckpoint(f, selected, true);
    clock = new Date("2026-07-14T00:00:31.000Z");

    expect(await f.coordinator.resume(resumeRequest(prepared))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
  });

  test("does not locally recover failed prepared attempts with native recovery context", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    const f = fixture({
      nativeAvailable: true,
      callbackMode: "process-observed-then-fails",
      now: () => clock,
      ownerLive: false,
    });
    expect(await runNativeAttempt(f)).toMatchObject({
      type: "err",
      error: { code: "EXECUTION_FAILED" },
    });
    const failed = f.store.read(1);
    expect(failed).toMatchObject({
      state: "failed-resumable",
      failure: {
        failedFromState: "prepared",
        recoveryContext: { dispatchPreparation: { kind: "native" } },
      },
    });
    if (failed?.state !== "failed-resumable") throw new Error("failed checkpoint fixture failed");
    clock = new Date("2026-07-14T00:00:31.000Z");

    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
  });

  test("refuses recovery directly from evidence-verified state", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    const f = fixture({ nativeAvailable: true, now: () => clock, ownerLive: false });
    expect(await runNativeAttempt(f)).toMatchObject({ type: "ok" });
    const verified = f.store.read(1);
    if (verified?.state !== "evidence-verified") throw new Error("verified checkpoint fixture failed");
    clock = new Date("2026-07-14T00:00:31.000Z");

    expect(await f.coordinator.resume(resumeRequest(verified))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
  });

  test("allows exactly one failed-attempt recovery claimant to perform external recovery", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    let releaseRecovery: (() => void) | undefined;
    const recoveryGate = new Promise<void>((resolve) => {
      releaseRecovery = resolve;
    });
    let recoveryCalls = 0;
    const recovery: AttemptRecoveryPort = Object.freeze({
      recover: async () => {
        recoveryCalls += 1;
        await recoveryGate;
        return "recovered" as const;
      },
    });
    const f = fixture({
      nativeAvailable: true,
      invalidEvidence: true,
      now: () => clock,
      ownerLive: false,
      recovery,
    });
    const failed = await failNativeAttempt(f);
    clock = new Date("2026-07-14T00:00:31.000Z");

    const winner = f.coordinator.resume(resumeRequest(failed));
    const loser = f.coordinator.resume({
      ...resumeRequest(failed),
      newAttemptId: "loser-attempt",
      leaseId: "loser-lease",
      mutationId: "loser-mutation",
    });
    await Promise.resolve();
    releaseRecovery?.();

    expect(await winner).toMatchObject({ type: "ok" });
    expect(await loser).toMatchObject({ type: "err", error: { code: "ATTEMPT_LEASE_ACTIVE" } });
    expect(recoveryCalls).toBe(1);
    expect(f.audits.filter(({ fields }) => fields["Transition edge"] === "active-recovery-claimed")).toHaveLength(1);
  });

  test("reconciles an audit-only external recovery before resuming", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    let f: ReturnType<typeof fixture>;
    const recovery: AttemptRecoveryPort = Object.freeze({
      recover: async () => {
        f.failWrites(true);
        return "recovered" as const;
      },
    });
    f = fixture({
      nativeAvailable: true,
      invalidEvidence: true,
      now: () => clock,
      ownerLive: false,
      auditReadable: true,
      recovery,
    });
    const failed = await failNativeAttempt(f);
    clock = new Date("2026-07-14T00:00:31.000Z");

    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "err",
      error: { code: "CHECKPOINT_STATE_INVALID" },
    });
    f.failWrites(false);
    expect(f.coordinator.status(1)).toMatchObject({
      state: "failed-resumable",
      recoveryClaim: { claimId: expect.any(String) },
    });
    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "ok",
      value: { state: "probing", lease: { fencingToken: 4 } },
    });
  });

  test("reclaims an abandoned recovery claim only after its lease expires", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    let ownerLive = false;
    let outcome: "unknown" | "recovered" = "unknown";
    let recoveryCalls = 0;
    const recovery: AttemptRecoveryPort = Object.freeze({
      recover: async () => {
        recoveryCalls += 1;
        return outcome;
      },
    });
    const f = fixture({
      nativeAvailable: true,
      invalidEvidence: true,
      now: () => clock,
      ownerLive: () => ownerLive,
      recovery,
    });
    const failed = await failNativeAttempt(f);
    clock = new Date("2026-07-14T00:00:31.000Z");

    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
    });
    expect(f.store.read(1)?.lease.fencingToken).toBe(3);
    const unknownClaimField = structuredClone(f.store.read(1)!);
    (unknownClaimField.recoveryClaim as unknown as Record<string, unknown>).unexpected = true;
    expect(parseAttemptCheckpoint(unknownClaimField)).toMatchObject({
      type: "err",
      error: { code: "SCHEMA_INVALID" },
    });

    clock = new Date("2026-07-14T00:01:00.000Z");
    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LEASE_ACTIVE" },
    });
    expect(recoveryCalls).toBe(1);

    clock = new Date("2026-07-14T00:01:02.000Z");
    outcome = "recovered";
    ownerLive = true;
    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "err",
      error: { code: "ATTEMPT_LEASE_ACTIVE" },
    });
    expect(recoveryCalls).toBe(1);

    ownerLive = false;
    expect(await f.coordinator.resume(resumeRequest(failed))).toMatchObject({
      type: "ok",
      value: { state: "probing", lease: { fencingToken: 5 } },
    });
    expect(recoveryCalls).toBe(2);
    expect(f.audits.filter(({ fields }) => fields["Transition edge"] === "active-recovery-claimed")).toHaveLength(2);
  });

  test("status reconciles an audit-only failure before returning the checkpoint", async () => {
    const f = fixture({ auditReadable: true });
    const probing = f.store.begin(probingCheckpoint());
    const transition = buildTransition(probing, {
      transitionId: "audit-only-status",
      edge: "attempt-failed",
      executionId: probing.executionId,
      attemptId: probing.attemptId,
      leaseId: probing.lease.leaseId,
      fencingToken: probing.lease.fencingToken,
      post: {
        ...probing,
        state: "failed-resumable",
        failure: { code: "COORDINATOR_FAILED", affectedUnits: ["beta"], failedFromState: "probing" },
      },
    });
    if (transition.type === "err") throw new Error("transition fixture failed");
    f.failWrites(true);
    expect(() => f.store.transition(transition.value)).toThrow("injected checkpoint write failure");
    f.failWrites(false);

    expect(f.coordinator.status(1)).toMatchObject({
      state: "failed-resumable",
      lastMutationId: "audit-only-status",
    });
  });

  test("resume reconciles an audit-only failure before deciding eligibility", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    let recoveryCalls = 0;
    const f = fixture({
      auditReadable: true,
      now: () => clock,
      ownerLive: false,
      recovery: Object.freeze({
        recover: async () => {
          recoveryCalls += 1;
          return "recovered" as const;
        },
      }),
    });
    const probing = f.store.begin(probingCheckpoint());
    const transition = buildTransition(probing, {
      transitionId: "audit-only-resume",
      edge: "attempt-failed",
      executionId: probing.executionId,
      attemptId: probing.attemptId,
      leaseId: probing.lease.leaseId,
      fencingToken: probing.lease.fencingToken,
      post: {
        ...probing,
        state: "failed-resumable",
        failure: { code: "COORDINATOR_FAILED", affectedUnits: ["beta"], failedFromState: "probing" },
      },
    });
    if (transition.type === "err") throw new Error("transition fixture failed");
    f.failWrites(true);
    expect(() => f.store.transition(transition.value)).toThrow("injected checkpoint write failure");
    f.failWrites(false);
    clock = new Date("2026-07-14T00:00:31.000Z");

    expect(await f.coordinator.resume({
      batch: 1,
      previousAttemptId: probing.attemptId,
      newAttemptId: "resume-audit-only",
      nonceHash: "resume-audit-only-nonce",
      leaseId: "resume-audit-only-lease",
      ownerId: "resume-audit-only-owner",
      mutationId: "resume-audit-only-mutation",
      reusedConvergedUnits: [],
    })).toMatchObject({
      type: "ok",
      value: { state: "probing", origin: "resumed", previousAttemptId: probing.attemptId },
    });
    expect(recoveryCalls).toBe(0);
  });

  test("rejects a foreign explicit driver before checkpoint and probe side effects", async () => {
    const f = fixture({ nativeAvailable: true });
    const result = await f.coordinator.resolve({
      ...baseResolve,
      batch: 1,
      selectionEnvironment: { AMADEUS_SWARM_DRIVER: "claude-ultracode" },
    });
    expect(result).toMatchObject({ type: "err", error: { code: "INPUT_INVALID" } });
    expect(f.store.read(1)).toBeNull();
    expect(f.probeCount()).toBe(0);
    expect(f.audits).toHaveLength(0);
  });

  test("rejects conflicting environment before allocating an attempt", async () => {
    const f = fixture({ nativeAvailable: true });
    const result = await f.coordinator.resolve({
      ...baseResolve,
      batch: 1,
      selectionEnvironment: { AMADEUS_SWARM_DRIVER: "auto", AMADEUS_USE_SWARM: "1" },
    });
    expect(result).toMatchObject({ type: "err", error: { code: "INPUT_INVALID" } });
    expect(f.store.read(1)).toBeNull();
    expect(f.probeCount()).toBe(0);
  });

  test("fails an unavailable explicit production slot without executing or falling back", async () => {
    const f = fixture();
    const result = await f.coordinator.resolve({
      ...baseResolve,
      batch: 1,
      selectionEnvironment: { AMADEUS_SWARM_DRIVER: "codex-ultra" },
    });
    expect(result).toMatchObject({ type: "err", error: { code: "EXPLICIT_DRIVER_UNAVAILABLE" } });
    expect(f.store.read(1)?.state).toBe("failed-terminal");
    expect(f.probeCount()).toBe(0);
    expect(f.executionCount()).toBe(0);
  });

  test("refuses to resume a terminal attempt", async () => {
    const f = fixture();
    const resolved = await f.coordinator.resolve({
      ...baseResolve,
      batch: 1,
      selectionEnvironment: { AMADEUS_SWARM_DRIVER: "codex-ultra" },
    });
    expect(resolved).toMatchObject({ type: "err", error: { code: "EXPLICIT_DRIVER_UNAVAILABLE" } });
    const terminal = f.store.read(1);
    if (terminal?.state !== "failed-terminal") throw new Error("terminal checkpoint fixture failed");

    expect(await f.coordinator.resume(resumeRequest(terminal))).toMatchObject({
      type: "err",
      error: { code: "CHECKPOINT_STATE_INVALID" },
    });
  });

  test("fails terminally when prepared Units do not match the selected Units", async () => {
    const f = fixture({ nativeAvailable: true });
    const selected = await resolveNativeCheckpoint(f);

    expect(await f.coordinator.run({
      executionId: selected.executionId,
      attemptId: selected.attemptId,
      batch: 1,
      preparedUnits: [preparedUnits[0]],
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    })).toMatchObject({ type: "err", error: { code: "PREPARED_MANIFEST_INVALID" } });
    expect(f.store.read(1)).toMatchObject({
      state: "failed-terminal",
      failure: { code: "INPUT_INVALID", failedFromState: "selected" },
    });
  });

  test("keeps the selected checkpoint when claiming the run lease cannot persist", async () => {
    const f = fixture({ nativeAvailable: true });
    const selected = await resolveNativeCheckpoint(f);
    f.failWrites(true);
    const result = await f.coordinator.run({
      executionId: selected.executionId,
      attemptId: selected.attemptId,
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    });
    f.failWrites(false);

    expect(result).toMatchObject({ type: "err", error: { code: "CHECKPOINT_STATE_INVALID" } });
    expect(f.store.read(1)?.state).toBe("selected");
  });

  test("fails resumably when a selected native registration disappears before run", async () => {
    const f = fixture({ nativeAvailable: true, registrationUnavailableOnRun: true });
    const selected = await resolveNativeCheckpoint(f);
    f.makeRegistrationUnavailable();

    expect(await f.coordinator.run({
      executionId: selected.executionId,
      attemptId: selected.attemptId,
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    })).toMatchObject({ type: "err", error: { code: "REGISTRATION_UNAVAILABLE" } });
    expect(f.store.read(1)).toMatchObject({
      state: "failed-resumable",
      failure: { code: "COORDINATOR_FAILED", failedFromState: "prepared" },
    });
  });

  test("probes a native candidate exactly once and verifies exact Unit evidence", async () => {
    const f = fixture({ nativeAvailable: true });
    const resolved = await f.coordinator.resolve({
      ...baseResolve,
      batch: 1,
      selectionEnvironment: { AMADEUS_SWARM_DRIVER: "codex-ultra" },
    });
    expect(resolved.type).toBe("ok");
    const run = await f.coordinator.run({
      executionId: resolved.type === "ok" ? resolved.value.executionId : "invalid",
      attemptId: resolved.type === "ok" ? resolved.value.attemptId : "invalid",
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    });
    expect(run).toMatchObject({
      type: "ok",
      value: { kind: "native", driver: "codex-ultra", completedUnits: ["alpha", "beta"] },
    });
    expect(f.probeCount()).toBe(1);
    expect(f.executionCount()).toBe(1);
    expect(f.store.read(1)?.state).toBe("evidence-verified");
    const evidence = f.audits.filter(({ event }) => event === "SWARM_NATIVE_EVIDENCE");
    expect(evidence).toHaveLength(1);
    expect(evidence[0].fields).toMatchObject({
      Driver: "codex-ultra",
      "Verdict code": "VERIFIED",
      Verified: "true",
      Sources: "hook,model-handshake,stream",
      "Unit names": "alpha,beta",
    });
  });

  test("returns execution failure when native evidence loses the run lease race", async () => {
    const f = fixture({ nativeAvailable: true, recordNativeEvidenceError: "stale-writer" });

    expect(await runNativeAttempt(f)).toMatchObject({
      type: "err",
      error: { code: "EXECUTION_FAILED" },
    });
  });

  test("propagates unexpected native evidence persistence failures", async () => {
    const f = fixture({ nativeAvailable: true, recordNativeEvidenceError: "generic" });

    try {
      await runNativeAttempt(f);
      throw new Error("expected native evidence persistence failure");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("injected evidence write failure");
    }
  });

  test("transfers the resolved lease to the run owner with the next fencing token", async () => {
    const f = fixture({ nativeAvailable: true });
    const resolved = await f.coordinator.resolve({
      ...baseResolve,
      batch: 1,
      ownerId: "resolve-process-owner",
      selectionEnvironment: { AMADEUS_SWARM_DRIVER: "codex-ultra" },
    });
    if (resolved.type === "err") throw new Error("resolve fixture failed");
    const resolvedLease = f.store.read(1)?.lease;
    if (!resolvedLease) throw new Error("resolved lease fixture failed");

    expect(await f.coordinator.run({
      executionId: resolved.value.executionId,
      attemptId: resolved.value.attemptId,
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    })).toMatchObject({ type: "ok" });
    expect(f.store.read(1)?.lease).toMatchObject({ fencingToken: 2 });
    expect(f.store.read(1)?.lease.leaseId).not.toBe(resolvedLease.leaseId);
    expect(f.store.read(1)?.lease.ownerId).not.toBe(resolvedLease.ownerId);
    expect(() => f.store.heartbeat({
      batch: 1,
      leaseId: resolvedLease.leaseId,
      fencingToken: resolvedLease.fencingToken,
      heartbeatAt: "2026-07-14T00:00:05.000Z",
      expiresAt: "2026-07-14T00:00:35.000Z",
    })).toThrow(AttemptStoreError);
  });

  test("heartbeats the native run lease every five seconds and stops the timer", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    const f = fixture({
      nativeAvailable: true,
      now: () => clock,
      beforeHeartbeat: () => {
        clock = new Date("2026-07-14T00:00:05.000Z");
      },
    });

    expect(await runNativeAttempt(f)).toMatchObject({ type: "ok" });
    expect(f.heartbeatDelay()).toBe(5_000);
    expect(f.heartbeatCancelled()).toBeTrue();
    expect(f.store.read(1)?.lease).toMatchObject({
      heartbeatAt: "2026-07-14T00:00:05.000Z",
      expiresAt: "2026-07-14T00:00:35.000Z",
    });
  });

  test("uses the default heartbeat timer when none is injected", async () => {
    const f = fixture({ nativeAvailable: true, omitHeartbeatTimer: true });

    expect(await runNativeAttempt(f)).toMatchObject({ type: "ok" });
  });

  for (const heartbeatTimerFailure of ["start", "stop"] as const) {
    test(`fails execution when the heartbeat timer cannot ${heartbeatTimerFailure}`, async () => {
      const f = fixture({ nativeAvailable: true, heartbeatTimerFailure });

      expect(await runNativeAttempt(f)).toMatchObject({
        type: "err",
        error: { code: "EXECUTION_FAILED" },
      });
      expect(f.store.read(1)).toMatchObject({
        state: "failed-resumable",
        failure: { code: "COORDINATOR_FAILED" },
      });
    });
  }

  test("prevents a fenced native run from writing after its heartbeat becomes stale", async () => {
    let clock = new Date("2026-07-14T00:00:00.000Z");
    let staleLease: AttemptCheckpoint["lease"] | undefined;
    let f: ReturnType<typeof fixture>;
    f = fixture({
      nativeAvailable: true,
      now: () => clock,
      beforeHeartbeat: () => {
        clock = new Date("2026-07-14T00:00:31.000Z");
        const active = f.store.read(1);
        if (!active) throw new Error("active fixture missing");
        staleLease = active.lease;
        f.store.claimActiveRecovery({
          batch: active.batch,
          executionId: active.executionId,
          attemptId: active.attemptId,
          expectedLeaseId: active.lease.leaseId,
          expectedFencingToken: active.lease.fencingToken,
          claimId: "replacement-claim",
          recoveryLeaseId: "replacement-lease",
          recoveryOwnerId: "replacement-owner",
          recoveryOwnerProcess: active.lease.ownerProcess ?? expiredOwnerProcess,
          now: clock.toISOString(),
          expiresAt: "2026-07-14T00:01:01.000Z",
          mutationId: "replacement-mutation",
          ownerLivenessVerified: true,
        });
      },
    });

    expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
    expect(f.store.read(1)).toMatchObject({
      state: "dispatched",
      lease: { leaseId: "replacement-lease", fencingToken: 3 },
      recoveryClaim: { claimId: "replacement-claim" },
    });
    expect(f.audits.filter(({ fields }) => fields["Transition edge"] === "attempt-failed")).toHaveLength(0);
    const claimed = f.store.read(1);
    if (!staleLease || !claimed) throw new Error("claimed recovery fixture missing");
    const verdict = Object.freeze({
      ok: true,
      code: "VERIFIED" as const,
      completedUnits: Object.freeze(["alpha", "beta"]),
      sources: Object.freeze(["hook", "model-handshake", "stream"]),
      evidenceDigest: "stale-evidence",
    });
    for (const lease of [staleLease, claimed.lease]) {
      expect(() => f.store.recordNativeEvidence({
        batch: claimed.batch,
        executionId: claimed.executionId,
        attemptId: claimed.attemptId,
        expectedLeaseId: lease.leaseId,
        expectedFencingToken: lease.fencingToken,
        driver: "codex-ultra",
        verdict,
      })).toThrow("STALE_WRITER");
    }
    expect(f.audits.filter(({ event }) => event === "SWARM_NATIVE_EVIDENCE")).toHaveLength(0);
  });

  test("does not heartbeat or auto-recover active floor and legacy dispatches", async () => {
    for (const selectionEnvironment of [{}, { AMADEUS_USE_SWARM: "1" }] as const) {
      let clock = new Date("2026-07-14T00:00:00.000Z");
      let recoveryCalls = 0;
      const f = fixture({
        now: () => clock,
        ownerLive: false,
        recovery: Object.freeze({
          recover: async () => {
            recoveryCalls += 1;
            return "recovered" as const;
          },
        }),
      });
      const resolved = await f.coordinator.resolve({ ...baseResolve, batch: 1, selectionEnvironment });
      if (resolved.type === "err") throw new Error("resolve fixture failed");
      expect(await f.coordinator.run({
        executionId: resolved.value.executionId,
        attemptId: resolved.value.attemptId,
        batch: 1,
        preparedUnits,
        convergenceCommand: "bun test",
        evidenceDir: "/repo/evidence",
        gitBinding: runGitBinding,
      })).toMatchObject({ type: "ok" });
      expect(f.heartbeatDelay()).toBeUndefined();

      clock = new Date("2026-07-14T00:00:31.000Z");
      expect(await f.coordinator.resume(resumeRequest(f.store.read(1)!))).toMatchObject({
        type: "err",
        error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
      });
      expect(f.store.read(1)?.state).toBe("dispatched");
      expect(recoveryCalls).toBe(0);
    }
  });

  for (const [callbackMode, failedFromState] of [
    ["duplicate-dispatch-prepared", "prepared"],
    ["duplicate-resources-prepared", "prepared"],
    ["invalid-ready-to-arm", "prepared"],
    ["duplicate-capture-bound", "dispatched"],
  ] as const) {
    test(`fails closed for invalid native callback sequence: ${callbackMode}`, async () => {
      const f = fixture({ nativeAvailable: true, callbackMode });
      expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
      expect(f.store.read(1)).toMatchObject({
        state: "failed-resumable",
        failure: { code: "COORDINATOR_FAILED", failedFromState },
      });
    });
  }

  test("reconciles audit-only dispatch preparation before recording an execution failure", async () => {
    const f = fixture({
      nativeAvailable: true,
      auditReadable: true,
      failDispatchPreparationCheckpointWriteOnce: true,
    });

    expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
    expect(f.store.read(1)).toMatchObject({
      state: "failed-resumable",
      failure: {
        code: "COORDINATOR_FAILED",
        failedFromState: "prepared",
        recoveryContext: {
          dispatchPreparation: {
            kind: "native",
            runEpochDigest: "run-epoch-digest",
          },
        },
      },
    });
    expect(f.store.readReconciled(1)).toMatchObject({
      state: "failed-resumable",
      failure: {
        recoveryContext: {
          dispatchPreparation: { runEpochDigest: "run-epoch-digest" },
        },
      },
    });
    expect(f.audits.filter(({ event }) => event === "SWARM_DRIVER_RECONCILED").map(({ fields }) => fields.Action).slice(-2))
      .toEqual(["reapplied", "already-materialized"]);
  });

  test("retains captured dispatch preparation when its audit append fails", async () => {
    const f = fixture({
      nativeAvailable: true,
      auditReadable: true,
      failDispatchPreparationAuditAppendOnce: true,
    });

    expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
    const failed = f.store.read(1);
    expect(failed).toMatchObject({
      state: "failed-resumable",
      failure: {
        code: "COORDINATOR_FAILED",
        failedFromState: "prepared",
        recoveryContext: {
          dispatchPreparation: {
            kind: "native",
            runEpochDigest: "run-epoch-digest",
            identityRelativePath: ".amadeus/native/identity.json",
            armRelativePath: ".amadeus/native/arm.json",
            recoveryJournalRelativePath: ".amadeus/native/recovery.json",
          },
        },
      },
    });
    expect(f.store.readReconciled(1)).toEqual(failed);
    expect(f.store.readReconciled(1)).toEqual(failed);
  });

  for (const [failure, injected] of [
    ["checkpoint write", { failReadyToArmCheckpointWriteOnce: true }],
    ["audit append", { failReadyToArmAuditAppendOnce: true }],
  ] as const) {
    test(`retains the ready-to-arm identity when its ${failure} fails`, async () => {
      const f = fixture({ nativeAvailable: true, ...injected });

      expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
      const failed = f.store.read(1);
      expect(parseAttemptCheckpoint(failed)).toMatchObject({ type: "ok" });
      expect(failed).toMatchObject({
        state: "failed-resumable",
        failure: {
          code: "COORDINATOR_FAILED",
          failedFromState: "prepared",
          recoveryContext: {
            dispatchPreparation: {
              kind: "native",
              nativeRunId: expect.any(String),
            },
            preparedNativeRun: {
              kind: "native",
              resourceReceiptDigest: "resource-receipt",
            },
            dispatch: {
              kind: "native",
              processIdentityDigest: "process-identity",
              armDigest: "arm-digest",
            },
          },
        },
      });
    });
  }

  test("retains the observed process identity when execution fails before ready-to-arm", async () => {
    const f = fixture({ nativeAvailable: true, callbackMode: "process-observed-then-fails" });

    expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
    const failed = f.store.read(1);
    expect(parseAttemptCheckpoint(failed)).toMatchObject({ type: "ok" });
    expect(failed).toMatchObject({
      state: "failed-resumable",
      failure: {
        code: "COORDINATOR_FAILED",
        failedFromState: "prepared",
        recoveryContext: {
          dispatchPreparation: { kind: "native" },
          preparedNativeRun: { kind: "native" },
          dispatch: {
            kind: "native",
            processIdentityDigest: "process-identity",
            armDigest: "arm-digest",
          },
        },
      },
    });
  });

  test("accepts repeated observation of the same process identity", async () => {
    const f = fixture({ nativeAvailable: true, callbackMode: "duplicate-process-observed" });

    expect(await runNativeAttempt(f)).toMatchObject({ type: "ok" });
    expect(f.store.read(1)?.state).toBe("evidence-verified");
  });

  test("fails closed when process observation changes before ready-to-arm", async () => {
    const f = fixture({ nativeAvailable: true, callbackMode: "conflicting-process-observed" });

    expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
    const failed = f.store.read(1);
    expect(parseAttemptCheckpoint(failed)).toMatchObject({ type: "ok" });
    expect(failed).toMatchObject({
      state: "failed-resumable",
      failure: {
        failedFromState: "prepared",
        recoveryContext: {
          dispatch: { processIdentityDigest: "process-identity" },
        },
      },
    });
  });

  for (const invalidDispatchPreparation of ["absolute-path", "parent-path", "empty-digest"] as const) {
    test(`rejects ${invalidDispatchPreparation} dispatch preparation before capturing recovery context`, async () => {
      const f = fixture({ nativeAvailable: true, invalidDispatchPreparation });

      expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
      const failed = f.store.read(1);
      expect(failed).toMatchObject({
        state: "failed-resumable",
        failure: { code: "COORDINATOR_FAILED", failedFromState: "prepared" },
      });
      expect(failed?.state === "failed-resumable" ? failed.failure.recoveryContext : undefined).toBeUndefined();
      expect(f.audits.filter(({ fields }) => fields["Transition edge"] === "native-dispatch-prepared")).toHaveLength(0);
    });
  }

  test("persists the event-bound capture receipt before rejecting invalid evidence", async () => {
    const f = fixture({ nativeAvailable: true, invalidEvidence: true, callbackMode: "event-bound-capture" });
    expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EVIDENCE_INVALID" } });
    expect(f.store.read(1)).toMatchObject({
      state: "failed-resumable",
      failure: {
        recoveryContext: {
          dispatch: {
            capture: {
              kind: "event-bound-provider-path",
              binding: {
                kind: "event-bound-provider-path",
                exactPathDigest: "exact-path",
                sourceEventDigest: "source-event",
              },
            },
          },
        },
      },
    });
  });

  test("retains the selected plan digest in native recovery preparation", async () => {
    const f = fixture({ nativeAvailable: true, invalidEvidence: true });
    const resolved = await f.coordinator.resolve({
      ...baseResolve,
      batch: 1,
      selectionEnvironment: { AMADEUS_SWARM_DRIVER: "codex-ultra" },
    });
    if (resolved.type === "err") throw new Error("resolve fixture failed");

    await f.coordinator.run({
      executionId: resolved.value.executionId,
      attemptId: resolved.value.attemptId,
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    });
    expect(f.store.read(1)).toMatchObject({
      state: "failed-resumable",
      failure: { recoveryContext: { dispatchPreparation: { planDigest: resolved.value.planDigest } } },
    });
  });

  test("fails closed when native execution returns without materializing dispatch", async () => {
    const f = fixture({ nativeAvailable: true, callbackMode: "missing-ready-to-arm" });
    expect(await runNativeAttempt(f)).toMatchObject({ type: "err", error: { code: "EXECUTION_FAILED" } });
    const failed = f.store.read(1);
    expect(parseAttemptCheckpoint(failed)).toMatchObject({ type: "ok" });
    expect(failed).toMatchObject({
      state: "failed-resumable",
      failure: {
        code: "COORDINATOR_FAILED",
        failedFromState: "prepared",
        recoveryContext: { dispatch: { processIdentityDigest: "process-identity" } },
      },
    });
  });

  test("falls back only for auto and records an exact floor result", async () => {
    const f = fixture();
    const resolved = await f.coordinator.resolve({ ...baseResolve, batch: 1 });
    expect(resolved).toMatchObject({
      type: "ok",
      value: { selection: { kind: "floor-selection", selected: "codex-exec-floor" } },
    });
    const run = await f.coordinator.run({
      executionId: resolved.type === "ok" ? resolved.value.executionId : "invalid",
      attemptId: resolved.type === "ok" ? resolved.value.attemptId : "invalid",
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    });
    expect(run).toMatchObject({ type: "ok", value: { kind: "floor", selected: "codex-exec-floor" } });
    const correlation = resolved.type === "ok" ? resolved.value : undefined;
    expect(
      f.coordinator.recordFloor({
        executionId: correlation?.executionId ?? "invalid",
        attemptId: correlation?.attemptId ?? "invalid",
        batch: 1,
        selected: "codex-exec-floor",
        planDigest: correlation?.planDigest ?? "invalid",
        completedUnits: ["alpha"],
        resultDigest: "bad",
      }).type,
    ).toBe("err");
    expect(
      f.coordinator.recordFloor({
        executionId: correlation?.executionId ?? "invalid",
        attemptId: correlation?.attemptId ?? "invalid",
        batch: 1,
        selected: "codex-exec-floor",
        planDigest: "wrong-plan",
        completedUnits: ["alpha", "beta"],
        resultDigest: "floor-result",
      }).type,
    ).toBe("err");
    expect(
      f.coordinator.recordFloor({
        executionId: correlation?.executionId ?? "invalid",
        attemptId: correlation?.attemptId ?? "invalid",
        batch: 1,
        selected: "codex-exec-floor",
        planDigest: correlation?.planDigest ?? "invalid",
        completedUnits: ["beta", "alpha"],
        resultDigest: "floor-result",
      }),
    ).toMatchObject({ type: "ok", value: { state: "evidence-verified" } });
  });

  test("keeps legacy execution independent from native selection and records it", async () => {
    const f = fixture({ nativeAvailable: true });
    const resolved = await f.coordinator.resolve({
      ...baseResolve,
      batch: 1,
      selectionEnvironment: { AMADEUS_USE_SWARM: "1" },
    });
    expect(resolved).toMatchObject({
      type: "ok",
      value: { selection: { kind: "legacy-selection", execution: "codex-exec-floor" } },
    });
    expect(f.probeCount()).toBe(0);
    const run = await f.coordinator.run({
      executionId: resolved.type === "ok" ? resolved.value.executionId : "invalid",
      attemptId: resolved.type === "ok" ? resolved.value.attemptId : "invalid",
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    });
    expect(run).toMatchObject({
      type: "ok",
      value: { kind: "legacy", warningCode: "AMADEUS_USE_SWARM_DEPRECATED" },
    });
    expect(
      f.coordinator.recordLegacy({
        executionId: resolved.type === "ok" ? resolved.value.executionId : "invalid",
        attemptId: resolved.type === "ok" ? resolved.value.attemptId : "invalid",
        batch: 1,
        execution: "codex-exec-floor",
        planDigest: resolved.type === "ok" ? resolved.value.planDigest : "invalid",
        completedUnits: ["alpha", "beta"],
        resultDigest: "legacy-result",
      }),
    ).toMatchObject({ type: "ok", value: { state: "evidence-verified" } });
  });

  test("exposes one versioned JSON document and a legacy warning through the CLI", async () => {
    const f = fixture({ nativeAvailable: true });
    const output = await executeSwarmDriverCommand(
      ["resolve", "--project-dir", "/repo"],
      JSON.stringify({
        schemaVersion: 1,
        harness: "codex",
        batch: 1,
        units: ["alpha", "beta"],
        topologySignals: [],
      }),
      {
        coordinator: () => f.coordinator,
        environment: { AMADEUS_USE_SWARM: "1" },
        now: () => new Date("2026-07-14T00:00:00.000Z"),
        mintId: () => "cli-id",
      },
    );
    expect(output.exitCode).toBe(0);
    expect(JSON.parse(output.stdout)).toMatchObject({
      schemaVersion: 1,
      ok: true,
      result: { state: "selected", selection: { kind: "legacy-selection" } },
    });
    expect(output.stdout.trim().split("\n")).toHaveLength(1);
    expect(output.stderr).toBe("AMADEUS_USE_SWARM_DEPRECATED\n");
  });

  test("rejects unknown CLI schema versions without constructing the coordinator", async () => {
    let factoryCalls = 0;
    const output = await executeSwarmDriverCommand(
      ["status", "--project-dir", "/repo"],
      JSON.stringify({ schemaVersion: 2, batch: 1 }),
      {
        coordinator: () => {
          factoryCalls += 1;
          return fixture().coordinator;
        },
        environment: {},
        now: () => new Date("2026-07-14T00:00:00.000Z"),
        mintId: () => "cli-id",
      },
    );
    expect(output.exitCode).toBe(2);
    expect(JSON.parse(output.stdout)).toMatchObject({
      schemaVersion: 1,
      ok: false,
      error: { code: "INPUT_SCHEMA_INVALID" },
    });
    expect(factoryCalls).toBe(0);
  });

  test("rejects unknown public JSON fields before constructing the coordinator", async () => {
    let factoryCalls = 0;
    const output = await executeSwarmDriverCommand(
      ["status", "--project-dir", "/repo"],
      JSON.stringify({ schemaVersion: 1, batch: 1, extra: true }),
      {
        coordinator: () => {
          factoryCalls += 1;
          return fixture().coordinator;
        },
        environment: {},
        now: () => new Date("2026-07-14T00:00:00.000Z"),
        mintId: () => "cli-id",
      },
    );
    expect(output.exitCode).toBe(2);
    expect(factoryCalls).toBe(0);
  });

  test("maps a request-bound lying-conductor result to failed-terminal", async () => {
    const f = fixture();
    const resolved = await f.coordinator.resolve({ ...baseResolve, batch: 1 });
    if (resolved.type === "err") throw new Error("resolve fixture failed");
    await f.coordinator.run({
      executionId: resolved.value.executionId,
      attemptId: resolved.value.attemptId,
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    });
    f.coordinator.recordFloor({
      executionId: resolved.value.executionId,
      attemptId: resolved.value.attemptId,
      batch: 1,
      selected: "codex-exec-floor",
      planDigest: resolved.value.planDigest,
      completedUnits: ["alpha", "beta"],
      resultDigest: "floor-result",
    });
    const checkpoint = f.store.read(1);
    if (checkpoint?.state !== "evidence-verified") throw new Error("checkpoint fixture failed");
    const binding = buildFinalizeRequestBinding({
      executionId: checkpoint.executionId,
      attemptId: checkpoint.attemptId,
      finalizeInvocationId: "finalize-1",
      batch: 1,
      planDigest: checkpoint.selectedContext.planDigest,
      worktreeManifestDigest: checkpoint.worktreeManifestDigest,
      expectedUnits: runGitBinding.expectedUnits,
      claimedUnits: ["alpha", "beta"],
      declinedUnits: [],
      checkCommandDigest: digestValue("bun test"),
      protectedSpec: { kind: "none" },
      repoIdentityDigest: "repo",
      mergeTargetBranch: "main",
      targetBeforeCommit: runGitBinding.targetBeforeCommit,
      mergeStrategy: "squash",
      mergeMessageDigest: "message",
    });
    if (binding.type === "err") throw new Error("binding fixture failed");
    expect(f.coordinator.recordFinalizeRequest(binding.value).type).toBe("ok");
    const envelope = buildRefereeFinalizeEnvelope({
      executionId: checkpoint.executionId,
      attemptId: checkpoint.attemptId,
      finalizeInvocationId: "finalize-1",
      finalizeRequestDigest: binding.value.finalizeRequestDigest,
      batch: 1,
      units: [],
      failures: [
        { unit: "alpha", code: "LYING_CONDUCTOR" },
        { unit: "beta", code: "LYING_CONDUCTOR" },
      ],
      mergeCompleted: false,
    });
    if (envelope.type === "err") throw new Error("envelope fixture failed");
    expect(f.coordinator.recordFinalizeResult(envelope.value)).toMatchObject({
      type: "ok",
      value: { state: "failed-terminal", failure: { code: "LYING_CONDUCTOR" } },
    });
  });

  test("does not accept a finalize request for different Units than the run checkpoint", async () => {
    const f = fixture();
    const resolved = await f.coordinator.resolve({ ...baseResolve, batch: 1 });
    if (resolved.type === "err") throw new Error("resolve fixture failed");
    await f.coordinator.run({
      executionId: resolved.value.executionId,
      attemptId: resolved.value.attemptId,
      batch: 1,
      preparedUnits,
      convergenceCommand: "bun test",
      evidenceDir: "/repo/evidence",
      gitBinding: runGitBinding,
    });
    f.coordinator.recordFloor({
      executionId: resolved.value.executionId,
      attemptId: resolved.value.attemptId,
      batch: 1,
      selected: "codex-exec-floor",
      planDigest: resolved.value.planDigest,
      completedUnits: ["alpha", "beta"],
      resultDigest: "floor-result",
    });
    const checkpoint = f.store.read(1);
    if (checkpoint?.state !== "evidence-verified") throw new Error("checkpoint fixture failed");
    const foreign = buildFinalizeRequestBinding({
      executionId: checkpoint.executionId,
      attemptId: checkpoint.attemptId,
      finalizeInvocationId: "foreign-finalize",
      batch: 1,
      planDigest: checkpoint.selectedContext.planDigest,
      worktreeManifestDigest: checkpoint.worktreeManifestDigest,
      expectedUnits: [
        { unit: "gamma", worktreePathDigest: "gamma", baseCommit: "base", headCommit: "head-g" },
        { unit: "delta", worktreePathDigest: "delta", baseCommit: "base", headCommit: "head-d" },
      ],
      claimedUnits: ["gamma", "delta"],
      declinedUnits: [],
      checkCommandDigest: digestValue("bun test"),
      protectedSpec: { kind: "none" },
      repoIdentityDigest: "repo",
      mergeTargetBranch: "main",
      targetBeforeCommit: "base",
      mergeStrategy: "squash",
      mergeMessageDigest: "message",
    });
    if (foreign.type === "err") throw new Error("foreign fixture failed");
    expect(f.coordinator.recordFinalizeRequest(foreign.value).type).toBe("err");
    expect(f.store.read(1)?.state).toBe("evidence-verified");
  });

  test("rejects a file checkpoint whose semantic digest was tampered", async () => {
    const source = fixture();
    const resolved = await source.coordinator.resolve({ ...baseResolve, batch: 1 });
    if (resolved.type === "err") throw new Error("resolve fixture failed");
    const checkpoint = source.store.read(1);
    if (!checkpoint) throw new Error("checkpoint fixture failed");

    const projectDir = mkdtempSync(join(tmpdir(), "amadeus-t231-"));
    const intent = "intent-1";
    try {
      const path = checkpointPath(projectDir, 1, intent, "default");
      mkdirSync(dirname(path), { recursive: true });
      const tampered = { ...checkpoint, stateDigest: "0".repeat(64) };
      writeFileSync(path, `${JSON.stringify(tampered)}\n`);

      const store = createFileDriverAttemptStore({ projectDir, intent, space: "default" });
      expect(() => store.read(1)).toThrow(AttemptStoreError);

      const serialized = JSON.parse(readFileSync(path, "utf-8")) as { stateDigest: string };
      expect(serialized.stateDigest).toBe("0".repeat(64));
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
