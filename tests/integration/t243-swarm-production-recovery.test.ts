// covers: module:amadeus-swarm-native-recovery, module:amadeus-swarm-driver-runtime, requirement:FR-18, requirement:FR-20
// size: large

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readAllAuditShards, recordDir } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { observeProcessIdentity } from "../../packages/framework/core/tools/amadeus-armed-process.ts";
import type {
  AuxiliaryResourcePlan,
  DriverAdapter,
  DriverPlan,
  LaunchInput,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts";
import {
  ProbeResult,
  type RedactedDriverRequest,
  type RedactedSelection,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-contract.ts";
import {
  buildDispatchDigest,
  buildRunRequestBinding,
  buildTransition,
  canonicalPreparedUnits,
  createProbingCheckpoint,
  digestValue,
  parseAttemptCheckpoint,
  type AttemptCheckpoint,
  type CheckpointWithoutDigest,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";
import {
  createProductionCoordinator,
  type NativeExecutionPort,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-runtime.ts";
import {
  createFileDriverAttemptStore,
  type DriverAttemptStore,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-store.ts";
import {
  classifyTopology,
  parseDriverRequest,
  selectDriver,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-selector.ts";
import type {
  NativeLifecycleExecutionInput,
  NativeDispatchCheckpoint,
  NativeDispatchPreparation,
  PreparedNativeRun,
} from "../../packages/framework/core/tools/amadeus-swarm-native-execution.ts";
import {
  type NativeAttemptProcessRecoveryPort,
  type NativeAttemptResourceRecoveryPort,
  createNativeAttemptRecovery,
} from "../../packages/framework/core/tools/amadeus-swarm-native-recovery.ts";
import type {
  NativeProcessRecoveryReceipt,
  NativeProcessRecoveryTarget,
} from "../../packages/framework/core/tools/amadeus-swarm-native-process.ts";
import type {
  NativeResourceCleanupReceipt,
  NativeResourceRecoveryTarget,
} from "../../packages/framework/core/tools/amadeus-swarm-native-resources.ts";
import { createProductionNativeSupervisors } from "../../packages/framework/core/tools/amadeus-swarm-native-supervisors.ts";

const BATCH = 1;
const INTENT = "production-recovery-intent";
const SPACE = "default";
const OLD_ATTEMPT_ID = "attempt-before-restart";
const FRESH_ATTEMPT_ID = "attempt-after-restart";
const UNITS = Object.freeze(["alpha", "beta"]);
const EPOCH = "2020-01-01T00:00:00.000Z";
const EXPIRED = "2020-01-01T00:00:30.000Z";
const EXECUTION_ID = "execution-across-restart";
const NONCE_HASH = "nonce-before-restart";
const PLAN_DIGEST = digestValue("plan-before-restart");
const RESOURCE_FENCING_TOKEN = 2;
const WAVE_INDEX = 0;
const WAVE_DIGEST = digestValue({ index: WAVE_INDEX, units: UNITS });

const preparedUnitsResult = canonicalPreparedUnits(Object.freeze([
  Object.freeze({ unit: "alpha", worktreePath: "/repo/alpha", branchName: "unit/alpha" }),
  Object.freeze({ unit: "beta", worktreePath: "/repo/beta", branchName: "unit/beta" }),
]));
if (preparedUnitsResult.type === "err") throw new Error("invalid prepared-unit fixture");
const PREPARED_UNITS = preparedUnitsResult.value;

const runBindingResult = buildRunRequestBinding({
  preparedUnits: PREPARED_UNITS,
  gitBinding: Object.freeze({
    expectedUnits: Object.freeze([
      Object.freeze({
        unit: "alpha",
        worktreePathDigest: digestValue("/repo/alpha"),
        baseCommit: "base",
        headCommit: "head-alpha",
      }),
      Object.freeze({
        unit: "beta",
        worktreePathDigest: digestValue("/repo/beta"),
        baseCommit: "base",
        headCommit: "head-beta",
      }),
    ]),
    protectedSpec: Object.freeze({ kind: "none" as const }),
    repoIdentityDigest: "repo-identity",
    mergeTargetBranch: "main",
    targetBeforeCommit: "base",
  }),
  convergenceCommand: "bun test",
  evidenceDir: "/repo/evidence",
});
if (runBindingResult.type === "err") throw new Error("invalid run-binding fixture");
const RUN_BINDING = runBindingResult.value;

const unreachableNativeExecution: NativeExecutionPort = Object.freeze({
  async execute(): Promise<never> {
    throw new Error("native execution is outside the recovery test");
  },
});

type SeedResult = Readonly<{
  checkpoint: Extract<AttemptCheckpoint, Readonly<{ state: "failed-resumable" }>>;
  resourceFencingToken: number;
}>;

type NativeRecoveryArtifacts = Readonly<{
  dispatchPreparation: NativeDispatchPreparation;
  preparedNativeRun: PreparedNativeRun;
  dispatch: NativeDispatchCheckpoint;
}>;

type AuditCounts = Readonly<{
  recoveryCompletions: number;
  freshAttempts: number;
}>;

type RecoveryStage = "process" | "resource" | "disposal";

type StageObservation = Readonly<{
  stage: RecoveryStage;
  attemptId: string | null;
  recoveryCompletions: number;
  freshAttempts: number;
}>;

function unwrapCheckpoint(result: ReturnType<typeof createProbingCheckpoint>): AttemptCheckpoint {
  if (result.type === "err") throw new Error(`invalid probing fixture: ${result.error.code}`);
  return result.value;
}

function transition(
  store: DriverAttemptStore,
  checkpoint: AttemptCheckpoint,
  transitionId: string,
  edge: Parameters<typeof buildTransition>[1]["edge"],
  post: CheckpointWithoutDigest,
): AttemptCheckpoint {
  const result = buildTransition(checkpoint, {
    transitionId,
    edge,
    executionId: checkpoint.executionId,
    attemptId: checkpoint.attemptId,
    leaseId: checkpoint.lease.leaseId,
    fencingToken: checkpoint.lease.fencingToken,
    post,
  });
  if (result.type === "err") {
    throw new Error(`invalid ${edge} fixture: ${result.error.code}:${result.error.field ?? ""}`);
  }
  return store.transition(result.value);
}

function nativeSelectionFixture(): Readonly<{
  requested: RedactedDriverRequest;
  selection: RedactedSelection;
}> {
  const request = parseDriverRequest({ AMADEUS_SWARM_DRIVER: "codex-ultra" });
  const topology = classifyTopology(UNITS, []);
  const probe = ProbeResult.build({
    status: "available",
    reason: "none",
    modeIdentifier: "codex-ultra",
    checks: Object.freeze([
      Object.freeze({ name: "mode", ok: true, diagnosticCode: "CLI_AVAILABLE" }),
    ]),
  });
  if (request.type === "err" || topology.type === "err" || probe.type === "err") {
    throw new Error("invalid native selection fixture");
  }
  const selection = selectDriver({
    request: request.value,
    harness: "codex",
    topology: topology.value,
    capabilities: Object.freeze([
      Object.freeze({ driver: "codex-ultra" as const, result: probe.value }),
    ]),
  });
  if (selection.type === "err") throw new Error("native selection fixture failed");
  return Object.freeze({
    requested: request.value.toRedactedJSON(),
    selection: selection.value.toRedactedJSON(),
  });
}

function productionDriverPlan(): DriverPlan {
  const probe = ProbeResult.build({
    status: "available",
    reason: "none",
    modeIdentifier: "codex-ultra",
    checks: Object.freeze([
      Object.freeze({ name: "mode", ok: true, diagnosticCode: "CLI_AVAILABLE" }),
    ]),
  });
  if (probe.type === "err") throw new Error("invalid production driver plan fixture");
  return Object.freeze({
    kind: "driver-plan",
    schemaVersion: 1,
    executionId: EXECUTION_ID,
    attemptId: OLD_ATTEMPT_ID,
    requested: "codex-ultra",
    selected: "codex-ultra",
    executionMode: "native",
    harness: "codex",
    batch: BATCH,
    topology: "coordinated",
    topologyReason: "coordination-signal",
    fallbackReason: "none",
    probe: probe.value,
    waves: Object.freeze([Object.freeze({ index: WAVE_INDEX, units: UNITS })]),
    planDigest: PLAN_DIGEST,
    attemptNonceHash: NONCE_HASH,
  });
}

function productionLaunchInput(root: string, nativeRunId: string): LaunchInput {
  const plan = productionDriverPlan();
  return Object.freeze({
    plan,
    wave: plan.waves[0],
    preparedUnits: PREPARED_UNITS,
    convergenceCommand: "bun test",
    evidenceDir: root,
    nativeRunId,
  });
}

function productionAdapter(root: string, ownedDirectory: string): DriverAdapter {
  const resources: readonly AuxiliaryResourcePlan[] = Object.freeze([
    Object.freeze({
      kind: "attempt-owned-directory",
      resourceId: "owned-provider-state",
      path: ownedDirectory,
      mode: "0700",
    }),
  ]);
  const preparation = Object.freeze({ resources, preparationDigest: digestValue(resources) });
  return Object.freeze({
    driver: "codex-ultra",
    provider: "codex",
    supports: (harness) => harness === "codex",
    probe: async () => productionDriverPlan().probe,
    prepareResources: () => preparation,
    buildExecution: (input) => Object.freeze({
      launch: Object.freeze({
        executable: process.execPath,
        args: Object.freeze(["-e", "await new Promise(() => {})"]),
        cwd: root,
        env: Object.freeze({ PATH: process.env.PATH ?? "" }),
        transport: Object.freeze({
          kind: "stdio-json" as const,
          stdin: "closed" as const,
          output: "jsonl" as const,
        }),
        timeoutMs: 5_000,
      }),
      capture: Object.freeze({ kind: "hook-only" as const, hookDir: ownedDirectory }),
      captureIdentity: Object.freeze({
        executionId: input.plan.executionId,
        attemptId: input.plan.attemptId,
        attemptNonceHash: input.plan.attemptNonceHash,
        planDigest: input.plan.planDigest,
        waveIndex: input.wave.index,
        waveDigest: digestValue(input.wave),
      }),
      resources,
    }),
    resolveCaptureBinding: () => Object.freeze({ kind: "not-binding" as const }),
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
}

function deferred(): Readonly<{
  promise: Promise<void>;
  resolve(): void;
  reject(reason: unknown): void;
}> {
  let resolvePromise!: () => void;
  let rejectPromise!: (reason: unknown) => void;
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return Object.freeze({ promise, resolve: resolvePromise, reject: rejectPromise });
}

function activeResourceJournalCount(journalRoot: string): number {
  return readdirSync(journalRoot).filter((name) => /^[a-f0-9]{64}\.json$/.test(name)).length;
}

function seedFailedNativeAttempt(
  projectDir: string,
  recoveryArtifacts?: NativeRecoveryArtifacts,
): SeedResult {
  const store = createFileDriverAttemptStore({ projectDir, intent: INTENT, space: SPACE });
  const { requested, selection } = nativeSelectionFixture();
  const probing = unwrapCheckpoint(createProbingCheckpoint({
    executionId: EXECUTION_ID,
    attemptId: OLD_ATTEMPT_ID,
    batch: BATCH,
    origin: "initial",
    nonceHash: NONCE_HASH,
    mutationId: "probing-before-restart",
    lease: Object.freeze({
      leaseId: "probing-lease",
      fencingToken: 1,
      ownerId: "owner-before-restart",
      heartbeatAt: EPOCH,
      expiresAt: EXPIRED,
      ownerProcess: Object.freeze({
        platform: process.platform === "linux" ? "linux" as const : "darwin" as const,
        pid: 2_147_483_647,
        processGroupId: 2_147_483_647,
        startTokenHash: "owner-before-restart-token",
      }),
    }),
    selectionInput: Object.freeze({
      requested,
      harness: "codex",
      batch: BATCH,
      expectedUnits: UNITS,
      topologySignals: Object.freeze([]),
    }),
  }));
  store.begin(probing);

  const selected = transition(store, probing, "selected-before-restart", "probe-selected", {
    schemaVersion: 1,
    state: "selected",
    executionId: probing.executionId,
    attemptId: probing.attemptId,
    batch: probing.batch,
    origin: probing.origin,
    nonceHash: probing.nonceHash,
    lease: probing.lease,
    selectionInput: probing.selectionInput,
    unitStates: probing.unitStates,
    lastMutationId: probing.lastMutationId,
    selectedContext: Object.freeze({
      selection,
      probeDigest: digestValue("probe-before-restart"),
      planDigest: PLAN_DIGEST,
    }),
  });
  if (selected.state !== "selected") throw new Error("selected fixture failed");

  const preparedLease = Object.freeze({
    ...selected.lease,
    leaseId: "prepared-lease",
    fencingToken: selected.lease.fencingToken + 1,
  });
  const prepared = transition(store, selected, "prepared-before-restart", "selected-prepared", {
    schemaVersion: 1,
    state: "prepared",
    executionId: selected.executionId,
    attemptId: selected.attemptId,
    batch: selected.batch,
    origin: selected.origin,
    nonceHash: selected.nonceHash,
    lease: preparedLease,
    selectionInput: selected.selectionInput,
    unitStates: selected.unitStates,
    lastMutationId: selected.lastMutationId,
    selectedContext: selected.selectedContext,
    preparedUnits: PREPARED_UNITS,
    worktreeManifestDigest: digestValue(PREPARED_UNITS),
    runBinding: RUN_BINDING,
  });
  if (prepared.state !== "prepared") throw new Error("prepared fixture failed");
  if (prepared.lease.fencingToken !== RESOURCE_FENCING_TOKEN) {
    throw new Error("resource fencing fixture failed");
  }

  const waveDigest = digestValue({ index: WAVE_INDEX, units: prepared.selectionInput.expectedUnits });
  const dispatchPreparation: NativeDispatchPreparation = recoveryArtifacts?.dispatchPreparation ??
    Object.freeze({
      kind: "native",
      nativeRunId: "native-run-before-restart",
      planDigest: prepared.selectedContext.planDigest,
      fencingToken: prepared.lease.fencingToken,
      waveIndex: WAVE_INDEX,
      waveDigest,
      resourcePreparationDigest: digestValue("resource-preparation-before-restart"),
      captureIdentityDigest: digestValue({
        executionId: prepared.executionId,
        attemptId: prepared.attemptId,
        attemptNonceHash: prepared.nonceHash,
        planDigest: prepared.selectedContext.planDigest,
        waveIndex: WAVE_INDEX,
        waveDigest,
      }),
      identityRelativePath: ".amadeus/native/identity.json",
      armRelativePath: ".amadeus/native/arm.json",
      armDigest: "arm-before-restart",
      runEpochDigest: "run-epoch-before-restart",
      recoveryJournalRelativePath: ".amadeus/native/recovery.json",
    });
  const dispatchPrepared = transition(
    store,
    prepared,
    "dispatch-prepared-before-restart",
    "native-dispatch-prepared",
    Object.freeze({ ...prepared, stateDigest: undefined, dispatchPreparation }),
  );
  if (dispatchPrepared.state !== "prepared") throw new Error("dispatch-prepared fixture failed");

  const preparedNativeRun: PreparedNativeRun = recoveryArtifacts?.preparedNativeRun ??
    Object.freeze({
      kind: "native",
      dispatchPreparationDigest: digestValue(dispatchPreparation),
      resourceReceiptDigest: "resource-receipt-before-restart",
      executionPlanDigest: "execution-plan-before-restart",
      capturePlanDigest: "capture-plan-before-restart",
      transportKind: "stdio-json",
      captureKind: "hook-only",
    });
  const resourcesPrepared = transition(
    store,
    dispatchPrepared,
    "resources-prepared-before-restart",
    "native-resources-prepared",
    Object.freeze({ ...dispatchPrepared, stateDigest: undefined, preparedNativeRun }),
  );
  if (resourcesPrepared.state !== "prepared") throw new Error("resources-prepared fixture failed");

  const dispatch: NativeDispatchCheckpoint = recoveryArtifacts?.dispatch ?? Object.freeze({
    kind: "native",
    nativeRunId: dispatchPreparation.nativeRunId,
    preparedNativeRunDigest: digestValue(preparedNativeRun),
    resourceReceiptDigest: preparedNativeRun.resourceReceiptDigest,
    processIdentityDigest: "process-before-restart",
    armDigest: dispatchPreparation.armDigest,
    armDeadline: EXPIRED,
    capture: Object.freeze({
      kind: "hook-only",
      identityDigest: dispatchPreparation.captureIdentityDigest,
      capturePlanDigest: preparedNativeRun.capturePlanDigest,
      resourcesDigest: preparedNativeRun.resourceReceiptDigest,
      transport: preparedNativeRun.transportKind,
    }),
  });
  const dispatched = transition(store, resourcesPrepared, "dispatched-before-restart", "prepared-dispatched", {
    schemaVersion: 1,
    state: "dispatched",
    executionId: resourcesPrepared.executionId,
    attemptId: resourcesPrepared.attemptId,
    batch: resourcesPrepared.batch,
    origin: resourcesPrepared.origin,
    nonceHash: resourcesPrepared.nonceHash,
    lease: resourcesPrepared.lease,
    selectionInput: resourcesPrepared.selectionInput,
    unitStates: resourcesPrepared.unitStates,
    lastMutationId: resourcesPrepared.lastMutationId,
    selectedContext: resourcesPrepared.selectedContext,
    preparedUnits: resourcesPrepared.preparedUnits,
    worktreeManifestDigest: resourcesPrepared.worktreeManifestDigest,
    runBinding: resourcesPrepared.runBinding,
    dispatchPreparation,
    preparedNativeRun,
    dispatch,
    dispatchDigest: buildDispatchDigest({
      executionId: resourcesPrepared.executionId,
      attemptId: resourcesPrepared.attemptId,
      manifestDigest: resourcesPrepared.worktreeManifestDigest,
      selection: resourcesPrepared.selectedContext.selection,
      runBinding: resourcesPrepared.runBinding,
      dispatch,
    }),
  });
  if (dispatched.state !== "dispatched") throw new Error("dispatched fixture failed");

  const failed = transition(store, dispatched, "failed-before-restart", "attempt-failed", {
    schemaVersion: 1,
    state: "failed-resumable",
    executionId: dispatched.executionId,
    attemptId: dispatched.attemptId,
    batch: dispatched.batch,
    origin: dispatched.origin,
    nonceHash: dispatched.nonceHash,
    lease: dispatched.lease,
    selectionInput: dispatched.selectionInput,
    unitStates: dispatched.unitStates,
    lastMutationId: dispatched.lastMutationId,
    failure: Object.freeze({
      code: "COORDINATOR_FAILED",
      affectedUnits: dispatched.selectionInput.expectedUnits,
      failedFromState: "dispatched",
      recoveryContext: Object.freeze({ dispatchPreparation, preparedNativeRun, dispatch }),
    }),
  });
  if (failed.state !== "failed-resumable") throw new Error("failed-resumable fixture failed");
  const persisted = store.read(BATCH);
  const parsed = parseAttemptCheckpoint(persisted);
  if (parsed.type === "err" || parsed.value.state !== "failed-resumable") {
    throw new Error("persisted recovery fixture failed validation");
  }
  return Object.freeze({
    checkpoint: parsed.value,
    resourceFencingToken: parsed.value.lease.fencingToken,
  });
}

function processReceipt(target: NativeProcessRecoveryTarget): NativeProcessRecoveryReceipt {
  const semantic = Object.freeze({
    kind: "native-process-recovery-receipt" as const,
    schemaVersion: 1 as const,
    targetDigest: digestValue(target),
    nativeRunId: target.nativeRunId,
    armDigest: target.armDigest,
    runEpochDigest: target.runEpochDigest,
    processIdentityDigest: target.processIdentityDigest,
    disposition: "stopped" as const,
  });
  return Object.freeze({ ...semantic, receiptDigest: digestValue(semantic) });
}

function resourceReceipt(target: NativeResourceRecoveryTarget): NativeResourceCleanupReceipt {
  const semantic = Object.freeze({
    kind: "native-resource-cleanup-receipt" as const,
    schemaVersion: 1 as const,
    targetDigest: digestValue(target),
    nativeRunId: target.nativeRunId,
    resourceReceiptDigest: "resource-receipt-before-restart",
    cleanupScopeDigest: "cleanup-scope-before-restart",
    disposition: "cleaned" as const,
  });
  return Object.freeze({ ...semantic, receiptDigest: digestValue(semantic) });
}

function auditCounts(projectDir: string): AuditCounts {
  const audit = readAllAuditShards(projectDir, INTENT, SPACE);
  const count = (edge: string): number => audit.split(`**Transition edge**: ${edge}`).length - 1;
  return Object.freeze({
    recoveryCompletions: count("active-attempt-recovered"),
    freshAttempts: count("attempt-resumed"),
  });
}

function observeStage(projectDir: string, stage: RecoveryStage): StageObservation {
  const checkpoint = createFileDriverAttemptStore({
    projectDir,
    intent: INTENT,
    space: SPACE,
  }).read(BATCH);
  return Object.freeze({ stage, attemptId: checkpoint?.attemptId ?? null, ...auditCounts(projectDir) });
}

function resumeRequest(checkpoint: AttemptCheckpoint) {
  return Object.freeze({
    batch: BATCH,
    previousAttemptId: checkpoint.attemptId,
    newAttemptId: FRESH_ATTEMPT_ID,
    nonceHash: "nonce-after-restart",
    leaseId: "lease-after-restart",
    ownerId: "owner-after-restart",
    mutationId: "resume-after-restart",
    reusedConvergedUnits: Object.freeze([]),
  });
}

type UnknownAt = "process" | "resource" | "disposal";

function unknownRecoveryFixture(unknownAt: UnknownAt) {
  const projectDir = mkdtempSync(join(tmpdir(), "amadeus-t243-"));
  const seeded = seedFailedNativeAttempt(projectDir);
  const stages: StageObservation[] = [];
  let processCalls = 0;
  let resourceCalls = 0;
  let disposalCalls = 0;
  let resourceTarget: NativeResourceRecoveryTarget | undefined;
  const process: NativeAttemptProcessRecoveryPort = Object.freeze({
    async recoverAttempt(target) {
      processCalls += 1;
      stages.push(observeStage(projectDir, "process"));
      if (unknownAt === "process") return Object.freeze({ status: "unknown" as const });
      return Object.freeze({ status: "stopped" as const, receipt: processReceipt(target) });
    },
    async disposeRecoveredAttempt() {
      disposalCalls += 1;
      stages.push(observeStage(projectDir, "disposal"));
      return Object.freeze({ status: "unknown" as const });
    },
  });
  const resources: NativeAttemptResourceRecoveryPort = Object.freeze({
    async recoverAttempt(target) {
      resourceCalls += 1;
      stages.push(observeStage(projectDir, "resource"));
      resourceTarget = target;
      if (unknownAt === "resource") return Object.freeze({ status: "unknown" as const });
      return Object.freeze({ status: "cleaned" as const, receipt: resourceReceipt(target) });
    },
  });
  const coordinator = createProductionCoordinator({
    projectDir,
    intent: INTENT,
    space: SPACE,
    nativeExecution: unreachableNativeExecution,
    recovery: createNativeAttemptRecovery({ process, resources }),
  });
  return Object.freeze({
    projectDir,
    seeded,
    coordinator,
    stages,
    resourceTarget: () => resourceTarget,
    callCounts: () => Object.freeze({ process: processCalls, resource: resourceCalls, disposal: disposalCalls }),
  });
}

function recoveryStages(...stages: RecoveryStage[]): readonly RecoveryStage[] {
  return Object.freeze(stages);
}

const UNKNOWN_SCENARIOS: readonly Readonly<{
  unknownAt: UnknownAt;
  stages: readonly RecoveryStage[];
  calls: Readonly<{ process: number; resource: number; disposal: number }>;
}>[] = Object.freeze([
  Object.freeze({
    unknownAt: "process",
    stages: recoveryStages("process"),
    calls: Object.freeze({ process: 1, resource: 0, disposal: 0 }),
  }),
  Object.freeze({
    unknownAt: "resource",
    stages: recoveryStages("process", "resource"),
    calls: Object.freeze({ process: 1, resource: 1, disposal: 0 }),
  }),
  Object.freeze({
    unknownAt: "disposal",
    stages: recoveryStages("process", "resource", "disposal"),
    calls: Object.freeze({ process: 1, resource: 1, disposal: 1 }),
  }),
]);

describe("t243 production native recovery", () => {
  test("starts a fresh attempt only after exact production recovery completes", async () => {
    const projectDir = mkdtempSync(join(tmpdir(), "amadeus-t243-"));
    try {
      const seeded = seedFailedNativeAttempt(projectDir);
      const stages: StageObservation[] = [];
      let resourceTarget: NativeResourceRecoveryTarget | undefined;
      let resourceCalls = 0;
      let disposalCalls = 0;
      const process: NativeAttemptProcessRecoveryPort = Object.freeze({
        async recoverAttempt(target) {
          stages.push(observeStage(projectDir, "process"));
          expect(resourceCalls).toBe(0);
          return Object.freeze({ status: "stopped" as const, receipt: processReceipt(target) });
        },
        async disposeRecoveredAttempt({ target, recoveryReceipt }) {
          disposalCalls += 1;
          stages.push(observeStage(projectDir, "disposal"));
          const semantic = Object.freeze({
            kind: "native-process-disposal-receipt" as const,
            schemaVersion: 1 as const,
            disposalId: "disposal-after-restart",
            targetDigest: digestValue(target),
            recoveryReceiptDigest: recoveryReceipt.receiptDigest,
            nativeRunId: target.nativeRunId,
            runEpochDigest: target.runEpochDigest,
            disposition: "disposed" as const,
          });
          return Object.freeze({
            status: "disposed" as const,
            receipt: Object.freeze({ ...semantic, receiptDigest: digestValue(semantic) }),
            recoveryReceipt,
          });
        },
      });
      const resources: NativeAttemptResourceRecoveryPort = Object.freeze({
        async recoverAttempt(target) {
          resourceCalls += 1;
          stages.push(observeStage(projectDir, "resource"));
          expect(disposalCalls).toBe(0);
          resourceTarget = target;
          return Object.freeze({ status: "cleaned" as const, receipt: resourceReceipt(target) });
        },
      });
      const coordinator = createProductionCoordinator({
        projectDir,
        intent: INTENT,
        space: SPACE,
        nativeExecution: unreachableNativeExecution,
        recovery: createNativeAttemptRecovery({ process, resources }),
      });

      expect(await coordinator.resume(resumeRequest(seeded.checkpoint))).toMatchObject({
        type: "ok",
        value: {
          state: "probing",
          origin: "resumed",
          previousAttemptId: OLD_ATTEMPT_ID,
          attemptId: FRESH_ATTEMPT_ID,
        },
      });
      expect(stages.map(({ stage }) => stage)).toEqual(["process", "resource", "disposal"]);
      expect(stages).toEqual(stages.map((stage) => ({
        ...stage,
        attemptId: OLD_ATTEMPT_ID,
        recoveryCompletions: 0,
        freshAttempts: 0,
      })));
      expect(resourceTarget).toMatchObject({
        attemptId: OLD_ATTEMPT_ID,
        fencingToken: seeded.resourceFencingToken,
        processIdentityDigest: "process-before-restart",
      });
      expect(coordinator.status(BATCH)).toMatchObject({
        state: "probing",
        origin: "resumed",
        attemptId: FRESH_ATTEMPT_ID,
        lease: { fencingToken: seeded.resourceFencingToken + 2 },
      });
      expect(auditCounts(projectDir)).toEqual({ recoveryCompletions: 1, freshAttempts: 1 });
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("recovers durable process and bound resources through a restarted production factory", async () => {
    const projectDir = realpathSync(mkdtempSync(join(tmpdir(), "amadeus-t243-production-")));
    const context = Object.freeze({ projectDir, intent: INTENT, space: SPACE });
    const root = recordDir(projectDir, INTENT, SPACE);
    if (!root) throw new Error("production record directory fixture failed");
    const journalRoot = join(root, ".amadeus-swarm-driver", "native", "resources");
    const providerRoot = join(root, "provider-state");
    const ownedDirectory = join(providerRoot, "owned-attempt");
    const foreignSibling = join(providerRoot, "foreign-sibling");
    const nativeRunId = "native-run-production-factory-restart";
    const reachedCrashBoundary = deferred();
    const crashBarrier = deferred();
    let dispatchPreparation: NativeDispatchPreparation | undefined;
    let preparedNativeRun: PreparedNativeRun | undefined;
    let dispatch: NativeDispatchCheckpoint | undefined;
    let executionAttempt: ReturnType<NativeExecutionPort["execute"]> | undefined;
    try {
      mkdirSync(root, { recursive: true, mode: 0o700 });
      mkdirSync(providerRoot, { recursive: true, mode: 0o700 });
      mkdirSync(foreignSibling, { mode: 0o700 });
      const first = createProductionNativeSupervisors(context);
      const lifecycle: NativeLifecycleExecutionInput = Object.freeze({
        adapter: productionAdapter(root, ownedDirectory),
        launchInput: productionLaunchInput(root, nativeRunId),
        context: Object.freeze({
          driver: "codex-ultra",
          executionId: EXECUTION_ID,
          attemptId: OLD_ATTEMPT_ID,
          attemptNonceHash: NONCE_HASH,
          planDigest: PLAN_DIGEST,
          waveIndex: WAVE_INDEX,
          waveDigest: WAVE_DIGEST,
          expectedUnits: UNITS,
        }),
        fencingToken: RESOURCE_FENCING_TOKEN,
        onDispatchPrepared: async (value) => {
          dispatchPreparation = value;
        },
        onResourcesPrepared: async (value) => {
          preparedNativeRun = value;
        },
        onProcessObserved: (value) => {
          dispatch = value;
        },
        onReadyToArm: async (value) => {
          dispatch = value;
          reachedCrashBoundary.resolve();
          await crashBarrier.promise;
        },
        onCaptureBound: async () => {},
      });
      executionAttempt = first.execution.execute(lifecycle);
      void executionAttempt.catch(() => {});
      await Promise.race([
        reachedCrashBoundary.promise,
        executionAttempt.then(
          () => Promise.reject(new Error("production execution completed before crash boundary")),
          (error) => Promise.reject(error),
        ),
      ]);
      if (!dispatchPreparation || !preparedNativeRun || !dispatch) {
        throw new Error("production execution did not publish exact recovery artifacts");
      }
      const recoveryArtifacts: NativeRecoveryArtifacts = Object.freeze({
        dispatchPreparation,
        preparedNativeRun,
        dispatch,
      });

      const processJournal = join(root, dispatchPreparation.recoveryJournalRelativePath);
      const durableIdentity = JSON.parse(
        readFileSync(join(root, dispatchPreparation.identityRelativePath), "utf-8"),
      ) as { process: { pid: number } };
      expect(existsSync(processJournal)).toBeTrue();
      expect(activeResourceJournalCount(journalRoot)).toBe(1);
      expect(existsSync(ownedDirectory)).toBeTrue();
      expect(existsSync(foreignSibling)).toBeTrue();
      expect(observeProcessIdentity(durableIdentity.process.pid).type).toBe("ok");

      const seeded = seedFailedNativeAttempt(projectDir, recoveryArtifacts);
      const restarted = createProductionNativeSupervisors(context);
      let claimedRecoveryCheckpoint: AttemptCheckpoint | undefined;
      const observedRecovery = Object.freeze({
        async recover(input: Parameters<typeof restarted.recovery.recover>[0]) {
          claimedRecoveryCheckpoint = input.checkpoint;
          return await restarted.recovery.recover(input);
        },
      });
      const coordinator = createProductionCoordinator({
        ...context,
        nativeExecution: restarted.execution,
        recovery: observedRecovery,
      });

      expect(await coordinator.resume(resumeRequest(seeded.checkpoint))).toMatchObject({
        type: "ok",
        value: {
          state: "probing",
          origin: "resumed",
          previousAttemptId: OLD_ATTEMPT_ID,
          attemptId: FRESH_ATTEMPT_ID,
        },
      });
      expect(existsSync(ownedDirectory)).toBeFalse();
      expect(existsSync(foreignSibling)).toBeTrue();
      expect(existsSync(processJournal)).toBeFalse();
      expect(activeResourceJournalCount(journalRoot)).toBe(0);
      expect(observeProcessIdentity(durableIdentity.process.pid).type).toBe("err");
      expect(auditCounts(projectDir)).toEqual({ recoveryCompletions: 1, freshAttempts: 1 });

      const replayed = createProductionNativeSupervisors(context);
      if (!claimedRecoveryCheckpoint) throw new Error("production recovery checkpoint was not observed");
      expect(await replayed.recovery.recover({
        checkpoint: claimedRecoveryCheckpoint,
        observedOwner: null,
      })).toBe("recovered");
      expect(existsSync(ownedDirectory)).toBeFalse();
      expect(existsSync(foreignSibling)).toBeTrue();
      expect(activeResourceJournalCount(journalRoot)).toBe(0);
      const replayCoordinator = createProductionCoordinator({
        ...context,
        nativeExecution: replayed.execution,
        recovery: replayed.recovery,
      });
      expect(await replayCoordinator.resume(resumeRequest(seeded.checkpoint))).toMatchObject({
        type: "err",
        error: { code: "CHECKPOINT_STATE_INVALID" },
      });
      expect(existsSync(ownedDirectory)).toBeFalse();
      expect(existsSync(foreignSibling)).toBeTrue();
      expect(activeResourceJournalCount(journalRoot)).toBe(0);
      expect(auditCounts(projectDir)).toEqual({ recoveryCompletions: 1, freshAttempts: 1 });
    } finally {
      crashBarrier.reject(new Error("simulated production controller crash"));
      await executionAttempt?.catch(() => {});
      rmSync(projectDir, { recursive: true, force: true });
    }
  }, 15_000);

  for (const scenario of UNKNOWN_SCENARIOS) {
    test(`does not complete recovery or start a fresh attempt when ${scenario.unknownAt} is unknown`, async () => {
      const fixture = unknownRecoveryFixture(scenario.unknownAt);
      try {
        expect(await fixture.coordinator.resume(resumeRequest(fixture.seeded.checkpoint))).toMatchObject({
          type: "err",
          error: { code: "ATTEMPT_LIVENESS_UNKNOWN" },
        });
        expect(fixture.stages.map(({ stage }) => stage)).toEqual([...scenario.stages]);
        expect(fixture.callCounts()).toEqual(scenario.calls);
        expect(fixture.stages).toEqual(fixture.stages.map((stage) => ({
          ...stage,
          attemptId: OLD_ATTEMPT_ID,
          recoveryCompletions: 0,
          freshAttempts: 0,
        })));
        expect(fixture.coordinator.status(BATCH)?.attemptId).toBe(OLD_ATTEMPT_ID);
        expect(fixture.coordinator.status(BATCH)?.recoveryClaim?.recoveredTransitionId).toBeUndefined();
        expect(auditCounts(fixture.projectDir)).toEqual({ recoveryCompletions: 0, freshAttempts: 0 });
        if (scenario.unknownAt !== "process") {
          expect(fixture.resourceTarget()).toMatchObject({
            attemptId: OLD_ATTEMPT_ID,
            fencingToken: fixture.seeded.resourceFencingToken,
            processIdentityDigest: "process-before-restart",
          });
        }
      } finally {
        rmSync(fixture.projectDir, { recursive: true, force: true });
      }
    });
  }
});
