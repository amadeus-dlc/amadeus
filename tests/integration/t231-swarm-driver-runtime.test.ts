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
  buildRefereeFinalizeEnvelope,
  buildTransition,
  createProbingCheckpoint,
  digestValue,
  type AttemptCheckpoint,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";
import { executeSwarmDriverCommand } from "../../packages/framework/core/tools/amadeus-swarm-driver.ts";
import {
  ATTEMPT_FAILURE_CODE_VALUES,
  type AttemptFailureCode,
} from "../../packages/framework/core/tools/amadeus-swarm-finalize-contract.ts";

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

function fixture(
  options: Readonly<{
    nativeAvailable?: boolean;
    invalidEvidence?: boolean;
    now?: () => Date;
    recovery?: AttemptRecoveryPort;
    ownerLive?: boolean;
    auditReadable?: boolean;
  }> = {},
) {
  const checkpoints = new Map<number, AttemptCheckpoint>();
  const audits: { event: DriverAuditEvent; fields: Readonly<Record<string, string>> }[] = [];
  let probeCount = 0;
  let executionCount = 0;
  let failCheckpointWrite = false;
  let id = 0;
  const adapter: DriverAdapter = Object.freeze({
    driver: "codex-ultra",
    supports: (harness: Harness) => harness === "codex",
    probe: async () => {
      probeCount += 1;
      return availableProbe();
    },
    buildLaunch: () => ({
      executable: "codex",
      args: ["exec"],
      cwd: "/repo",
      env: {},
      stdin: "closed" as const,
      timeoutMs: 1_000,
    }),
    normalize: async function* () {},
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
        checkpoints.set(batch, checkpoint);
      },
    },
    audit: {
      append: (event, fields) => audits.push({ event, fields }),
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
  const coordinator = createCoordinator({
    registry: registry.value,
    store,
    mintId: () => `id-${++id}`,
    now: options.now ?? (() => new Date("2026-07-14T00:00:00.000Z")),
    nativeExecution: {
      execute: async ({ plan, waveDigest, nativeRunId }) => {
        executionCount += 1;
        if (options.invalidEvidence) return [];
        return nativeEvents({
          executionId: plan.executionId,
          attemptId: plan.attemptId,
          nonceHash: plan.attemptNonceHash,
          planDigest: plan.planDigest,
          waveDigest,
          nativeRunId,
        });
      },
    },
    recovery: options.recovery,
    observeOwner: (expected) => (options.ownerLive === false ? null : expected),
  });
  return {
    coordinator,
    store,
    audits,
    probeCount: () => probeCount,
    executionCount: () => executionCount,
    failWrites: (enabled: boolean) => {
      failCheckpointWrite = enabled;
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

function probingCheckpoint(): AttemptCheckpoint {
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
      AIDLC_MERGE_FAILED: false,
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
    const f = fixture({ auditReadable: true, now: () => clock, ownerLive: false });
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
