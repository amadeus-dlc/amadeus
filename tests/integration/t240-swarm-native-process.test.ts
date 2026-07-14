// covers: module:amadeus-swarm-native-process, requirement:BR-10, requirement:BR-11
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  createNativeProcessPort,
  nativeProcessTestSeam,
} from "../../packages/framework/core/tools/amadeus-swarm-native-process.ts";
import {
  createNativeResourceSupervisor,
} from "../../packages/framework/core/tools/amadeus-swarm-native-resources.ts";
import { observeProcessIdentity } from "../../packages/framework/core/tools/amadeus-armed-process.ts";
import { digestValue } from "../../packages/framework/core/tools/amadeus-swarm-canonical.ts";
import type {
  AdapterResourcePreparation,
  DriverAdapter,
  DriverPlan,
  LaunchInput,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts";
import { ProbeResult } from "../../packages/framework/core/tools/amadeus-swarm-driver-contract.ts";
import {
  createLifecycleNativeExecution,
  type NativeDispatchPreparation,
  type NativeProcessOutputFrame,
  type NativeResourceRecoveryOwner,
} from "../../packages/framework/core/tools/amadeus-swarm-native-execution.ts";

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "amadeus-native-process-"));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) rmSync(value, { recursive: true, force: true });
});

const probe = ProbeResult.build({
  status: "available",
  reason: "none",
  modeIdentifier: "codex-ultra",
  checks: Object.freeze([
    Object.freeze({ name: "mode", ok: true, diagnosticCode: "CLI_AVAILABLE" }),
  ]),
});
if (probe.type === "err") throw new Error("invalid probe fixture");

const driverPlan: DriverPlan = Object.freeze({
  kind: "driver-plan",
  schemaVersion: 1,
  executionId: "exec-1",
  attemptId: "attempt-1",
  requested: "codex-ultra",
  selected: "codex-ultra",
  executionMode: "native",
  harness: "codex",
  batch: 1,
  topology: "coordinated",
  topologyReason: "coordination-signal",
  fallbackReason: "none",
  probe: probe.value,
  waves: Object.freeze([Object.freeze({ index: 0, units: Object.freeze(["alpha", "beta"]) })]),
  planDigest: "plan-1",
  attemptNonceHash: "nonce-1",
});

const context = Object.freeze({
  driver: "codex-ultra" as const,
  executionId: driverPlan.executionId,
  attemptId: driverPlan.attemptId,
  attemptNonceHash: driverPlan.attemptNonceHash,
  planDigest: driverPlan.planDigest,
  waveIndex: driverPlan.waves[0].index,
  waveDigest: digestValue(driverPlan.waves[0]),
  expectedUnits: driverPlan.waves[0].units,
});

function launchInput(evidenceDir: string, nativeRunId: string): LaunchInput {
  return Object.freeze({
    plan: driverPlan,
    wave: driverPlan.waves[0],
    preparedUnits: Object.freeze([
      Object.freeze({ unit: "alpha", worktreePath: "/repo/alpha", branchName: "unit/alpha" }),
      Object.freeze({ unit: "beta", worktreePath: "/repo/beta", branchName: "unit/beta" }),
    ]),
    convergenceCommand: "bun test",
    evidenceDir,
    nativeRunId,
  });
}

function resourcePreparation(
  resources: AdapterResourcePreparation["resources"],
): AdapterResourcePreparation {
  return Object.freeze({ resources, preparationDigest: digestValue(resources) });
}

function outputCollector() {
  const frames: NativeProcessOutputFrame[] = [];
  const failures: unknown[] = [];
  let closes = 0;
  return {
    frames,
    failures,
    closes: () => closes,
    port: Object.freeze({
      publish: (_nativeRunId: string, frame: NativeProcessOutputFrame) => frames.push(frame),
      close: () => { closes += 1; },
      fail: (_nativeRunId: string, error: unknown) => failures.push(error),
    }),
  };
}

function recoveryJournal(dir: string, relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dir, relativePath), "utf-8")) as Record<string, unknown>;
}

type TestProcessPlan = ReturnType<ReturnType<typeof createNativeProcessPort>["plan"]>;
type TestClaimRecord = Parameters<typeof nativeProcessTestSeam.createSpawnClaim>[0];

function claimRecord(dir: string, plan: TestProcessPlan): TestClaimRecord {
  const journal = recoveryJournal(dir, plan.recoveryJournalRelativePath);
  const runDirectoryPath = join(dir, dirname(plan.recoveryJournalRelativePath));
  return {
    publicPlan: plan,
    wrapperPlan: Object.freeze({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      identityPath: join(dir, plan.identityRelativePath),
      armPath: join(dir, plan.armRelativePath),
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
    }),
    runDirectoryPath,
    ownerMarkerPath: join(runDirectoryPath, "owner.json"),
    owner: journal.owner,
    recoveryJournalPath: join(dir, plan.recoveryJournalRelativePath),
    lifecycle: journal,
  } as TestClaimRecord;
}

function dormantLaunch(dir: string) {
  return {
    executable: process.execPath,
    args: ["-e", "await new Promise(() => {})"],
    cwd: dir,
    env: { PATH: process.env.PATH ?? "" },
    transport: { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const },
    timeoutMs: 5_000,
  };
}

function recoveryOwner(
  nativeRunId: string,
  fencingToken: number,
  processIdentityDigest: string,
): NativeResourceRecoveryOwner {
  return Object.freeze({
    executionId: context.executionId,
    attemptId: context.attemptId,
    attemptNonceHash: context.attemptNonceHash,
    planDigest: context.planDigest,
    waveIndex: context.waveIndex,
    waveDigest: context.waveDigest,
    nativeRunId,
    fencingToken,
    processIdentityDigest,
  });
}

function processGroupIsStopped(processGroupId: number): boolean {
  try {
    process.kill(-processGroupId, 0);
    return false;
  } catch (error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ESRCH";
  }
}

async function waitForFile(path: string): Promise<void> {
  for (let attempt = 0; attempt < 200 && !existsSync(path); attempt += 1) {
    await Bun.sleep(5);
  }
  if (!existsSync(path)) throw new Error(`fixture file was not written: ${path}`);
}

async function waitForStoppedProcessGroup(processGroupId: number): Promise<void> {
  for (let attempt = 0; attempt < 200 && !processGroupIsStopped(processGroupId); attempt += 1) {
    await Bun.sleep(5);
  }
}

describe("t240 provider-neutral native process", () => {
  test("recovers a durable planned process as explicitly unarmed", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    const plan = port.plan({
      nativeRunId: "run-planned-recovery",
      evidenceDir: dir,
      context,
      fencingToken: 3,
    });
    const target = Object.freeze({
      kind: "native-process-recovery" as const,
      schemaVersion: 1 as const,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      processIdentityDigest: null,
    });
    const receipt = Object.freeze({
      kind: "native-process-recovery-receipt" as const,
      schemaVersion: 1 as const,
      targetDigest: digestValue(target),
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      processIdentityDigest: null,
      disposition: "unarmed" as const,
    });

    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      state: "planned",
    });
    expect(port.activeRecordCount()).toBe(1);
    await expect(port.recoverAttempt(target)).resolves.toEqual({
      status: "unarmed",
      receipt: Object.freeze({ ...receipt, receiptDigest: digestValue(receipt) }),
    });

    await port.releasePlan(plan);
    await port.releasePlan(plan);
    expect(existsSync(join(dir, dirname(plan.recoveryJournalRelativePath)))).toBeFalse();
    expect(port.activeRecordCount()).toBe(0);

    const replacement = port.plan({
      nativeRunId: plan.nativeRunId,
      evidenceDir: dir,
      context,
      fencingToken: 3,
    });
    expect(replacement.runEpochDigest).not.toBe(plan.runEpochDigest);
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    const restarted = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    await expect(restarted.releasePlan(plan)).rejects.toThrow("NATIVE_PROCESS_PLAN_CONFLICT");
    expect(existsSync(join(dir, dirname(replacement.recoveryJournalRelativePath)))).toBeTrue();
    await restarted.releasePlan(replacement);
  });

  test("keeps a published dispatch plan recoverable when resource materialization fails", async () => {
    const dir = root();
    const processPort = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    const preparation = resourcePreparation(Object.freeze([]));
    const adapter: DriverAdapter = Object.freeze({
      driver: "codex-ultra",
      provider: "codex",
      supports: (harness) => harness === "codex",
      probe: async () => probe.value,
      prepareResources: () => preparation,
      buildExecution: () => { throw new Error("must not build"); },
      resolveCaptureBinding: () => Object.freeze({ kind: "not-binding" as const }),
      openEvidenceSession: () => { throw new Error("must not open evidence"); },
      observeControl: async function* () {},
    });
    const execution = createLifecycleNativeExecution({
      resources: Object.freeze({
        materialize: async () => { throw new Error("materialize failed"); },
        bindRecoveryOwner: async () => {},
        verifyForArm: async () => {},
        cleanup: async () => {},
      }),
      capture: Object.freeze({
        start: async () => { throw new Error("must not capture"); },
      }),
      process: processPort,
    });
    let published: NativeDispatchPreparation | undefined;

    await expect(execution.execute({
      adapter,
      launchInput: launchInput(dir, "run-materialize-failure-recovery"),
      context,
      fencingToken: 5,
      onDispatchPrepared: async (value) => { published = value; },
      onResourcesPrepared: async () => {},
      onReadyToArm: async () => {},
      onCaptureBound: async () => {},
    })).rejects.toThrow("materialize failed");
    if (!published) throw new Error("dispatch preparation was not published");
    const target = Object.freeze({
      kind: "native-process-recovery" as const,
      schemaVersion: 1 as const,
      nativeRunId: published.nativeRunId,
      armDigest: published.armDigest,
      runEpochDigest: published.runEpochDigest,
      processIdentityDigest: null,
    });

    expect(recoveryJournal(dir, published.recoveryJournalRelativePath)).toMatchObject({
      state: "planned",
      runEpochDigest: published.runEpochDigest,
    });
    await expect(processPort.recoverAttempt(target)).resolves.toMatchObject({ status: "unarmed" });
    await processPort.releasePlan({
      nativeRunId: published.nativeRunId,
      identityRelativePath: published.identityRelativePath,
      armRelativePath: published.armRelativePath,
      armDigest: published.armDigest,
      runEpochDigest: published.runEpochDigest,
      recoveryJournalRelativePath: published.recoveryJournalRelativePath,
    });
  });

  test("does not release a plan after another port advances its durable journal", async () => {
    const dir = root();
    const portA = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      terminationGraceMs: 50,
      wrapperExecutable: "\0",
    });
    const plan = portA.plan({
      nativeRunId: "run-cross-port-release-fence",
      evidenceDir: dir,
      context,
      fencingToken: 4,
    });
    const portB = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      terminationGraceMs: 50,
    });
    expect(portB.plan({
      nativeRunId: plan.nativeRunId,
      evidenceDir: dir,
      context,
      fencingToken: 4,
    })).toEqual(plan);
    const session = await portB.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "await new Promise(() => {})"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
        timeoutMs: 5_000,
      },
    });
    const runDirectory = join(dir, dirname(plan.recoveryJournalRelativePath));

    await expect(portA.releasePlan(plan)).rejects.toThrow("NATIVE_PROCESS_PLAN_ACTIVE");
    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({ state: "spawned" });
    expect(existsSync(runDirectory)).toBeTrue();
    await expect(portA.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "process.exit(0)"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
        timeoutMs: 1_000,
      },
    })).rejects.toThrow("NATIVE_PROCESS_STATE_SPAWNED");
    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({ state: "spawned" });

    await session.terminateAndWait("cross-port-release-test");
    await session.dispose();
  }, 10_000);

  test("rejects a stale second port after the first advances the durable plan", async () => {
    const dir = root();
    const output = { publish: () => {}, close: () => {}, fail: () => {} };
    const portA = createNativeProcessPort({ rootDir: dir, output, terminationGraceMs: 50 });
    const plan = portA.plan({
      nativeRunId: "run-cross-port-spawn-claim",
      evidenceDir: dir,
      context,
      fencingToken: 14,
    });
    const portB = createNativeProcessPort({ rootDir: dir, output, terminationGraceMs: 50 });
    expect(portB.plan({
      nativeRunId: plan.nativeRunId,
      evidenceDir: dir,
      context,
      fencingToken: 14,
    })).toEqual(plan);
    const spawnInput = {
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "await new Promise(() => {})"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const },
        timeoutMs: 5_000,
      },
    };

    const results = await Promise.allSettled([
      portA.spawn(spawnInput),
      portB.spawn(spawnInput),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const winner = results.find((result) => result.status === "fulfilled");
    if (winner?.status !== "fulfilled") throw new Error("expected one cross-port spawn winner");
    const journal = recoveryJournal(dir, plan.recoveryJournalRelativePath);
    expect(journal).toMatchObject({ state: "spawned", runEpochDigest: plan.runEpochDigest });
    expect(JSON.parse(readFileSync(
      join(dir, dirname(plan.recoveryJournalRelativePath), "spawn-claim.json"),
      "utf-8",
    ))).toMatchObject({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      ownerDigest: digestValue(journal.owner),
      token: expect.any(String),
    });

    await winner.value.terminateAndWait("cross-port-spawn-claim-test");
    await winner.value.dispose();
  }, 10_000);

  test("creates one immutable exclusive claim for independently loaded planned records", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    const plan = port.plan({
      nativeRunId: "run-exclusive-spawn-claim",
      evidenceDir: dir,
      context,
      fencingToken: 15,
    });
    const runDirectoryPath = join(dir, dirname(plan.recoveryJournalRelativePath));
    const journal = recoveryJournal(dir, plan.recoveryJournalRelativePath);
    type ClaimRecord = Parameters<typeof nativeProcessTestSeam.createSpawnClaim>[0];
    const independentlyLoadedRecord = (): ClaimRecord => ({
      publicPlan: plan,
      wrapperPlan: Object.freeze({
        schemaVersion: 1,
        nativeRunId: plan.nativeRunId,
        identityPath: join(dir, plan.identityRelativePath),
        armPath: join(dir, plan.armRelativePath),
        armDigest: plan.armDigest,
        runEpochDigest: plan.runEpochDigest,
      }),
      runDirectoryPath,
      ownerMarkerPath: join(runDirectoryPath, "owner.json"),
      owner: journal.owner,
      recoveryJournalPath: join(dir, plan.recoveryJournalRelativePath),
      lifecycle: journal,
    }) as ClaimRecord;
    const recordA = independentlyLoadedRecord();
    const recordB = independentlyLoadedRecord();

    const winnerClaim = nativeProcessTestSeam.createSpawnClaim(recordA);
    const claimPath = join(runDirectoryPath, "spawn-claim.json");
    const winnerBytes = readFileSync(claimPath, "utf-8");
    expect(winnerClaim).toMatchObject({
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      ownerDigest: digestValue(journal.owner),
    });
    expect(() => nativeProcessTestSeam.createSpawnClaim(recordB))
      .toThrow("NATIVE_PROCESS_SPAWN_CLAIMED");
    expect(readFileSync(claimPath, "utf-8")).toBe(winnerBytes);
    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({
      state: "planned",
      runEpochDigest: plan.runEpochDigest,
      owner: journal.owner,
    });

    unlinkSync(claimPath);
    await port.releasePlan(plan);
  });

  test("releases an exclusive claim when lifecycle transition fails before publication", async () => {
    const dir = root();
    let nowCalls = 0;
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      now: () => {
        nowCalls += 1;
        if (nowCalls === 3) {
          return {
            toISOString: () => { throw new Error("transition clock failed"); },
          } as unknown as Date;
        }
        return new Date();
      },
    });
    const plan = port.plan({
      nativeRunId: "run-unadvanced-claim-release",
      evidenceDir: dir,
      context,
      fencingToken: 16,
    });
    const runDirectory = join(dir, dirname(plan.recoveryJournalRelativePath));

    await expect(port.spawn({ plan, launch: dormantLaunch(dir) }))
      .rejects.toThrow("transition clock failed");
    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({
      state: "planned",
      runEpochDigest: plan.runEpochDigest,
    });
    expect(existsSync(join(runDirectory, "spawn-claim.json"))).toBeFalse();
    await port.releasePlan(plan);
  });

  test("fails closed for missing and conflicting durable plans", async () => {
    const dir = root();
    const output = { publish: () => {}, close: () => {}, fail: () => {} };
    const port = createNativeProcessPort({ rootDir: dir, output });
    const planInput = {
      nativeRunId: "run-plan-conflict-coverage",
      evidenceDir: dir,
      context,
      fencingToken: 21,
    };
    const plan = port.plan(planInput);
    const unadopted = createNativeProcessPort({ rootDir: dir, output });

    await expect(unadopted.spawn({ plan, launch: dormantLaunch(dir) }))
      .rejects.toThrow("NATIVE_PROCESS_PLAN_MISSING");
    expect(() => port.plan({ ...planInput, fencingToken: 22 }))
      .toThrow("NATIVE_PROCESS_PLAN_CONFLICT");
    expect(() => unadopted.plan({ ...planInput, fencingToken: 22 }))
      .toThrow("NATIVE_PROCESS_PLAN_CONFLICT");

    const journalPath = join(dir, plan.recoveryJournalRelativePath);
    const plannedJournal = readFileSync(journalPath, "utf-8");
    const conflictingJournal = JSON.parse(plannedJournal) as Record<string, unknown>;
    conflictingJournal.armDigest = "conflicting-durable-arm";
    writeFileSync(journalPath, `${JSON.stringify(conflictingJournal)}\n`, "utf-8");
    await expect(port.spawn({ plan, launch: dormantLaunch(dir) }))
      .rejects.toThrow("NATIVE_PROCESS_PLAN_CONFLICT");
    writeFileSync(journalPath, plannedJournal, "utf-8");
    await port.releasePlan(plan);
  });

  test("fails closed across lifecycle and claim validation seams", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    const plan = port.plan({
      nativeRunId: "run-lifecycle-claim-validation",
      evidenceDir: dir,
      context,
      fencingToken: 24,
    });
    const record = claimRecord(dir, plan);
    const journalPath = join(dir, plan.recoveryJournalRelativePath);
    const plannedJournal = readFileSync(journalPath, "utf-8");

    writeFileSync(journalPath, "{}\n", "utf-8");
    expect(() => nativeProcessTestSeam.transitionLifecycle(
      record,
      ["planned"],
      "spawned",
      () => new Date(),
    )).toThrow("NATIVE_PROCESS_STATE_CONFLICT");
    writeFileSync(journalPath, plannedJournal, "utf-8");

    const runDirectory = record.runDirectoryPath;
    const ownedBackup = `${runDirectory}-owned`;
    renameSync(runDirectory, ownedBackup);
    mkdirSync(runDirectory);
    expect(() => nativeProcessTestSeam.createSpawnClaim(record))
      .toThrow("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
    rmSync(runDirectory, { recursive: true });
    renameSync(ownedBackup, runDirectory);

    const claim = nativeProcessTestSeam.createSpawnClaim(record);
    const claimPath = join(runDirectory, "spawn-claim.json");
    const claimBytes = readFileSync(claimPath, "utf-8");
    writeFileSync(claimPath, `${JSON.stringify({ ...claim, token: "foreign" })}\n`, "utf-8");
    expect(() => nativeProcessTestSeam.removeSpawnClaim(record, claim))
      .toThrow("NATIVE_PROCESS_SPAWN_CLAIM_MISMATCH");
    expect(() => nativeProcessTestSeam.releaseUnadvancedSpawnClaim(record, claim, record.lifecycle))
      .toThrow("NATIVE_PROCESS_SPAWN_CLAIM_MISMATCH");
    expect(() => nativeProcessTestSeam.restorePlannedAfterSpawnFailure(record, claim, () => new Date()))
      .toThrow("NATIVE_PROCESS_SPAWN_CLAIM_MISMATCH");
    writeFileSync(claimPath, claimBytes, "utf-8");

    expect(() => nativeProcessTestSeam.restorePlannedAfterSpawnFailure(record, claim, () => new Date()))
      .toThrow("NATIVE_PROCESS_STATE_CONFLICT");
    expect(() => nativeProcessTestSeam.releaseUnadvancedSpawnClaim(
      record,
      claim,
      { ...record.lifecycle, state: "spawned" },
    )).toThrow("NATIVE_PROCESS_STATE_CONFLICT");
    nativeProcessTestSeam.removeSpawnClaim(record, claim);
    await port.releasePlan(plan);
  });

  test("preserves an exclusive claim when transition rollback loses ownership", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    const plan = port.plan({
      nativeRunId: "run-claim-transition-rollback-conflict",
      evidenceDir: dir,
      context,
      fencingToken: 25,
    });
    const record = claimRecord(dir, plan);
    const ownedBackup = `${record.runDirectoryPath}-owned`;

    let failure: unknown;
    try {
      nativeProcessTestSeam.claimSpawnTransition(
        record,
        new Date(Date.now() + 1_000).toISOString(),
        () => {
          renameSync(record.runDirectoryPath, ownedBackup);
          mkdirSync(record.runDirectoryPath);
          throw new Error("transition clock failed after ownership replacement");
        },
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as Error).message).toBe("NATIVE_PROCESS_SPAWN_ROLLBACK_FAILED");
    expect(existsSync(join(ownedBackup, "spawn-claim.json"))).toBeTrue();
  });

  test("retains a started process when exact stopping cannot be proved", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      terminationGraceMs: 50,
    });
    const plan = port.plan({
      nativeRunId: "run-unproved-started-recovery",
      evidenceDir: dir,
      context,
      fencingToken: 26,
    });
    const session = await port.spawn({ plan, launch: dormantLaunch(dir) });
    const identity = await session.observeIdentity();
    const target = {
      kind: "native-process-recovery" as const,
      schemaVersion: 1 as const,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      processIdentityDigest: identity.processIdentityDigest,
    };
    const owned = {
      runDirectory: dirname(plan.recoveryJournalRelativePath),
      journal: recoveryJournal(dir, plan.recoveryJournalRelativePath),
    } as Parameters<typeof nativeProcessTestSeam.recoverStartedNativeProcess>[1];

    try {
      await expect(nativeProcessTestSeam.recoverStartedNativeProcess(dir, owned, target, 1, {
        observeGuardian: () => "live",
        observeGroup: () => "live",
        signalExactGroup: () => false,
        pause: async () => {},
      })).resolves.toEqual({ status: "unknown" });
    } finally {
      await session.terminateAndWait("unproved-recovery-cleanup");
      await session.dispose();
    }
  }, 10_000);

  test("fails closed when initial recovery journal persistence loses ownership", () => {
    const dir = root();
    const nativeRunId = "run-initial-journal-persistence-failure";
    const runDirectory = join(
      dir,
      `.amadeus-swarm-driver/native/${digestValue(nativeRunId).slice(0, 24)}`,
    );
    const ownedBackup = `${runDirectory}-owned`;
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      now: () => {
        renameSync(runDirectory, ownedBackup);
        writeFileSync(runDirectory, "foreign", "utf-8");
        return new Date();
      },
    });

    expect(() => port.plan({
      nativeRunId,
      evidenceDir: dir,
      context,
      fencingToken: 27,
    })).toThrow("NATIVE_PROCESS_SPAWN_ROLLBACK_FAILED");
    expect(readFileSync(runDirectory, "utf-8")).toBe("foreign");
    expect(existsSync(join(ownedBackup, "owner.json"))).toBeTrue();
  });

  test("fails closed for foreign and unstable release plans", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    const plan = port.plan({
      nativeRunId: "run-release-conflict-coverage",
      evidenceDir: dir,
      context,
      fencingToken: 23,
    });
    const runDirectory = join(dir, dirname(plan.recoveryJournalRelativePath));
    const ownedBackup = `${runDirectory}-owned`;
    renameSync(runDirectory, ownedBackup);
    mkdirSync(runDirectory);
    writeFileSync(join(runDirectory, "foreign"), "preserve", "utf-8");
    await expect(port.releasePlan(plan))
      .rejects.toThrow("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
    expect(readFileSync(join(runDirectory, "foreign"), "utf-8")).toBe("preserve");
    rmSync(runDirectory, { recursive: true });
    renameSync(ownedBackup, runDirectory);

    let unstableValue = 0;
    const unstablePlan = { ...plan };
    Object.defineProperty(unstablePlan, "unstable", {
      enumerable: true,
      get: () => { unstableValue += 1; return unstableValue; },
    });
    await expect(port.releasePlan(unstablePlan))
      .rejects.toThrow("NATIVE_PROCESS_PLAN_CONFLICT");
    await port.releasePlan(plan);
  });

  test("stops only an exact live guardian group and proves the whole group stopped", async () => {
    const guardian = Object.freeze({
      platform: "darwin" as const,
      pid: 701,
      processGroupId: 701,
      startTokenHash: "guardian-701",
    });
    const cases = [
      {
        name: "TERM stops the exact group",
        observations: [["live", "live"], ["dead", "stopped"]] as const,
        expected: "stopped",
        signals: ["SIGTERM"],
      },
      {
        name: "KILL stops the exact group after grace",
        observations: [["live", "live"], ["live", "live"], ["dead", "stopped"]] as const,
        expected: "stopped",
        signals: ["SIGTERM", "SIGKILL"],
      },
      {
        name: "an already stopped group is proved without signaling",
        observations: [["dead", "stopped"]] as const,
        expected: "stopped",
        signals: [],
      },
      {
        name: "a reused PID is not treated as stopped",
        observations: [["reused", "stopped"]] as const,
        expected: "unknown",
        signals: [],
      },
      {
        name: "a headless live group is retained",
        observations: [["dead", "live"]] as const,
        expected: "unknown",
        signals: [],
      },
      {
        name: "EPERM or an unknown observation is retained",
        observations: [["unknown", "unknown"]] as const,
        expected: "unknown",
        signals: [],
      },
      {
        name: "a group that outlives its guardian after TERM is retained",
        observations: [["live", "live"], ["dead", "live"]] as const,
        expected: "unknown",
        signals: ["SIGTERM"],
      },
      {
        name: "a guardian identity reused after TERM is retained without KILL",
        observations: [["live", "live"], ["reused", "live"]] as const,
        expected: "unknown",
        signals: ["SIGTERM"],
      },
      {
        name: "TERM is not sent when the exact identity recheck fails",
        observations: [["live", "live"]] as const,
        expected: "unknown",
        signals: [],
        failedSignal: "SIGTERM" as const,
      },
      {
        name: "KILL is not sent when the exact identity recheck fails",
        observations: [["live", "live"], ["live", "live"]] as const,
        expected: "unknown",
        signals: ["SIGTERM"],
        failedSignal: "SIGKILL" as const,
      },
      {
        name: "KILL without a stopped proof remains unknown",
        observations: [["live", "live"], ["live", "live"], ["dead", "unknown"]] as const,
        expected: "unknown",
        signals: ["SIGTERM", "SIGKILL"],
      },
    ] as const;

    for (const fixture of cases) {
      const pending = [...fixture.observations];
      let current: (typeof pending)[number] | undefined;
      const signals: NodeJS.Signals[] = [];
      const result = await nativeProcessTestSeam.recoverExactNativeProcess(guardian, 1, {
        observeGuardian: () => {
          current = pending.shift();
          if (!current) throw new Error(`missing guardian observation for ${fixture.name}`);
          return current[0];
        },
        observeGroup: () => {
          if (!current) throw new Error(`missing group observation for ${fixture.name}`);
          return current[1];
        },
        signalExactGroup: (_identity, signal) => {
          if ("failedSignal" in fixture && fixture.failedSignal === signal) return false;
          signals.push(signal);
          return true;
        },
        pause: async () => {},
      });
      expect(result, fixture.name).toBe(fixture.expected);
      expect(signals, fixture.name).toEqual([...fixture.signals]);
      expect(pending, fixture.name).toHaveLength(0);
    }

    await expect(nativeProcessTestSeam.recoverExactNativeProcess(
      { ...guardian, processGroupId: guardian.pid + 1 },
      1,
      {
        observeGuardian: () => "live",
        observeGroup: () => "live",
        signalExactGroup: () => true,
        pause: async () => {},
      },
    )).resolves.toBe("unknown");
  });

  test("recovers an orphaned exact guardian without disposing its durable run", async () => {
    const dir = root();
    const ownerPort = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      armTimeoutMs: 2_000,
      terminationGraceMs: 50,
    });
    const plan = ownerPort.plan({
      nativeRunId: "run-orphaned-guardian-recovery",
      evidenceDir: dir,
      context,
      fencingToken: 13,
    });
    const session = await ownerPort.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "await new Promise(() => {})"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
        timeoutMs: 5_000,
      },
    });
    const identity = await session.observeIdentity();
    await session.arm();
    const target = Object.freeze({
      kind: "native-process-recovery" as const,
      schemaVersion: 1 as const,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      processIdentityDigest: null,
    });
    const receipt = Object.freeze({
      kind: "native-process-recovery-receipt" as const,
      schemaVersion: 1 as const,
      targetDigest: digestValue(target),
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      processIdentityDigest: identity.processIdentityDigest,
      disposition: "stopped" as const,
    });
    const journalPath = join(dir, plan.recoveryJournalRelativePath);
    const crashedAfterIdentity = JSON.parse(readFileSync(journalPath, "utf-8")) as Record<string, unknown>;
    crashedAfterIdentity.state = "spawned";
    delete crashedAfterIdentity.processIdentityDigest;
    const journalBeforeRecovery = `${JSON.stringify(crashedAfterIdentity)}\n`;
    writeFileSync(journalPath, journalBeforeRecovery, "utf-8");
    const recoveryPort = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      terminationGraceMs: 50,
    });

    await expect(recoveryPort.recoverAttempt(target)).resolves.toEqual({
      status: "stopped",
      receipt: Object.freeze({ ...receipt, receiptDigest: digestValue(receipt) }),
    });
    const exactTarget = Object.freeze({
      ...target,
      processIdentityDigest: identity.processIdentityDigest,
    });
    const exactReceipt = Object.freeze({
      ...receipt,
      targetDigest: digestValue(exactTarget),
    });
    await expect(recoveryPort.recoverAttempt(exactTarget)).resolves.toEqual({
      status: "stopped",
      receipt: Object.freeze({ ...exactReceipt, receiptDigest: digestValue(exactReceipt) }),
    });
    expect(readFileSync(journalPath, "utf-8")).toBe(journalBeforeRecovery);
    expect(existsSync(dirname(journalPath))).toBeTrue();
  }, 10_000);

  test("recovers an exact guardian after its controller is killed", async () => {
    const dir = root();
    const readyPath = join(dir, "controller-crash-ready.json");
    const sourceUrl = new URL(
      "../../packages/framework/core/tools/amadeus-swarm-native-process.ts",
      import.meta.url,
    ).href;
    const controllerScript = `
      import { createNativeProcessPort } from ${JSON.stringify(sourceUrl)};
      const context = ${JSON.stringify(context)};
      const rootDir = ${JSON.stringify(dir)};
      const port = createNativeProcessPort({
        rootDir,
        output: { publish: () => {}, close: () => {}, fail: () => {} },
        armTimeoutMs: 2_000,
      });
      const plan = port.plan({
        nativeRunId: "run-controller-crash-recovery",
        evidenceDir: rootDir,
        context,
        fencingToken: 19,
      });
      const session = await port.spawn({
        plan,
        launch: {
          executable: process.execPath,
          args: ["-e", "await new Promise(() => {})"],
          cwd: rootDir,
          env: { PATH: process.env.PATH ?? "" },
          transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
          timeoutMs: 10_000,
        },
      });
      const identity = await session.observeIdentity();
      await session.arm();
      const durableIdentity = JSON.parse(await Bun.file(rootDir + "/" + plan.identityRelativePath).text());
      await Bun.write(${JSON.stringify(readyPath)}, JSON.stringify({
        target: {
          kind: "native-process-recovery",
          schemaVersion: 1,
          nativeRunId: plan.nativeRunId,
          armDigest: plan.armDigest,
          runEpochDigest: plan.runEpochDigest,
          processIdentityDigest: identity.processIdentityDigest,
        },
        processGroupId: durableIdentity.process.processGroupId,
        recoveryJournalRelativePath: plan.recoveryJournalRelativePath,
      }));
      await new Promise(() => {});
    `;
    const controller = Bun.spawn([process.execPath, "-e", controllerScript], {
      cwd: dir,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    let processGroupId: number | undefined;
    try {
      await waitForFile(readyPath);
      const ready = JSON.parse(readFileSync(readyPath, "utf-8")) as {
        target: Parameters<ReturnType<typeof createNativeProcessPort>["recoverAttempt"]>[0];
        processGroupId: number;
        recoveryJournalRelativePath: string;
      };
      processGroupId = ready.processGroupId;
      controller.kill("SIGKILL");
      await controller.exited;

      const recoveryPort = createNativeProcessPort({
        rootDir: dir,
        output: { publish: () => {}, close: () => {}, fail: () => {} },
        terminationGraceMs: 50,
      });
      await expect(recoveryPort.recoverAttempt(ready.target)).resolves.toMatchObject({
        status: "stopped",
        receipt: { processIdentityDigest: ready.target.processIdentityDigest },
      });
      expect(processGroupIsStopped(ready.processGroupId)).toBeTrue();
      expect(existsSync(join(dir, ready.recoveryJournalRelativePath))).toBeTrue();
    } finally {
      controller.kill("SIGKILL");
      if (processGroupId !== undefined && !processGroupIsStopped(processGroupId)) {
        try { process.kill(-processGroupId, "SIGKILL"); } catch {}
        await waitForStoppedProcessGroup(processGroupId);
      }
    }
  }, 10_000);

  test("keeps absent, corrupt, mismatched, and identity-less recovery state unknown", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    const plan = port.plan({
      nativeRunId: "run-closed-recovery-target",
      evidenceDir: dir,
      context,
      fencingToken: 17,
    });
    const target = Object.freeze({
      kind: "native-process-recovery" as const,
      schemaVersion: 1 as const,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      processIdentityDigest: null,
    });
    const journalPath = join(dir, plan.recoveryJournalRelativePath);
    const ownerPath = join(dirname(journalPath), "owner.json");
    const plannedJournal = readFileSync(journalPath, "utf-8");
    const ownerMarker = readFileSync(ownerPath, "utf-8");

    const unknownTargets = [
      { ...target, nativeRunId: "missing-native-run" },
      { ...target, armDigest: "wrong-arm" },
      { ...target, runEpochDigest: "wrong-epoch" },
      { ...target, processIdentityDigest: "unexpected-process" },
      { ...target, extra: "not-closed" },
    ];
    for (const unknownTarget of unknownTargets) {
      await expect(port.recoverAttempt(unknownTarget)).resolves.toEqual({ status: "unknown" });
    }

    writeFileSync(journalPath, "{}\n", "utf-8");
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    writeFileSync(journalPath, plannedJournal, "utf-8");

    writeFileSync(ownerPath, "{}\n", "utf-8");
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    writeFileSync(ownerPath, ownerMarker, "utf-8");

    const runDirectory = dirname(journalPath);
    const ownedBackup = `${runDirectory}-owned`;
    renameSync(runDirectory, ownedBackup);
    mkdirSync(runDirectory);
    writeFileSync(ownerPath, `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      token: "foreign-owner-token",
    })}\n`, "utf-8");
    writeFileSync(journalPath, plannedJournal, "utf-8");
    writeFileSync(join(runDirectory, "foreign"), "preserve", "utf-8");
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    expect(readFileSync(join(runDirectory, "foreign"), "utf-8")).toBe("preserve");
    rmSync(runDirectory, { recursive: true });
    renameSync(ownedBackup, runDirectory);

    const identityPath = join(dir, plan.identityRelativePath);
    const armPath = join(dir, plan.armRelativePath);
    writeFileSync(identityPath, "{}\n", "utf-8");
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    unlinkSync(identityPath);
    writeFileSync(armPath, "{}\n", "utf-8");
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    unlinkSync(armPath);
    writeFileSync(`${armPath}.consumed`, "{}\n", "utf-8");
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    unlinkSync(`${armPath}.consumed`);

    const spawnClaimPath = join(runDirectory, "spawn-claim.json");
    const journalOwner = (JSON.parse(plannedJournal) as { owner: unknown }).owner;
    writeFileSync(spawnClaimPath, `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      ownerDigest: digestValue(journalOwner),
      token: "controller-crashed-before-journal-transition",
    })}\n`, "utf-8");
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    await expect(port.releasePlan(plan)).rejects.toThrow("NATIVE_PROCESS_PLAN_ACTIVE");
    expect(existsSync(runDirectory)).toBeTrue();
    unlinkSync(spawnClaimPath);

    const spawnedWithoutIdentity = {
      ...JSON.parse(plannedJournal) as Record<string, unknown>,
      state: "spawned",
      armDeadline: new Date(Date.now() + 5_000).toISOString(),
    };
    writeFileSync(journalPath, `${JSON.stringify(spawnedWithoutIdentity)}\n`, "utf-8");
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    const observed = observeProcessIdentity(process.pid);
    if (observed.type !== "ok") throw new Error("test process identity unavailable");
    const wrongEpochIdentity = {
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: "wrong-epoch",
      armDeadline: spawnedWithoutIdentity.armDeadline,
      process: observed.value,
    };
    writeFileSync(identityPath, `${JSON.stringify(wrongEpochIdentity)}\n`, "utf-8");
    expect(nativeProcessTestSeam.readRunIdentity(
      identityPath,
      plan,
      String(spawnedWithoutIdentity.armDeadline),
    )).toBeNull();
    await expect(port.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    unlinkSync(identityPath);

    writeFileSync(journalPath, plannedJournal, "utf-8");
    await port.releasePlan(plan);
  });

  test("cleans owned resources only after the exact observed process stops", async () => {
    const dir = realpathSync(root());
    const journalRoot = join(dir, "resource-journals");
    const ownedDirectory = join(dir, "owned-evidence");
    mkdirSync(journalRoot, { mode: 0o700 });
    const processPort = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      armTimeoutMs: 2_000,
      terminationGraceMs: 500,
    });
    const resourceSupervisor = createNativeResourceSupervisor({
      journalRoot,
      recoveryObserver: processPort.recoveryObserver,
    });
    const resources = await resourceSupervisor.materialize(
      resourcePreparation(Object.freeze([
        Object.freeze({
          kind: "attempt-owned-directory" as const,
          resourceId: "owned-evidence",
          path: ownedDirectory,
          mode: "0700" as const,
        }),
      ])),
      launchInput(dir, "run-process-resource-integration"),
    );
    const plan = processPort.plan({
      nativeRunId: "run-process-resource-integration",
      evidenceDir: dir,
      context,
      fencingToken: 7,
    });
    const session = await processPort.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "await new Promise(() => {})"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
        timeoutMs: 5_000,
      },
    });
    const identity = await session.observeIdentity();
    await resourceSupervisor.bindRecoveryOwner(
      resources,
      recoveryOwner(plan.nativeRunId, 7, identity.processIdentityDigest),
    );

    await expect(resourceSupervisor.cleanup(resources)).rejects.toThrow("RESOURCE_PROCESS_ACTIVE");
    expect(existsSync(ownedDirectory)).toBeTrue();

    await session.terminateAndWait("resource-integration-test");
    await expect(resourceSupervisor.cleanup(resources)).resolves.toBeUndefined();
    expect(existsSync(ownedDirectory)).toBeFalse();
    await session.dispose();
  });

  test("observes an exact recovery owner without mutating durable process state", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      armTimeoutMs: 2_000,
      terminationGraceMs: 500,
    });
    const plan = port.plan({
      nativeRunId: "run-recovery-observer",
      evidenceDir: dir,
      context,
      fencingToken: 11,
    });
    const session = await port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "await new Promise(() => {})"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
        timeoutMs: 5_000,
      },
    });
    const identity = await session.observeIdentity();
    const owner = recoveryOwner(plan.nativeRunId, 11, identity.processIdentityDigest);
    const journalPath = join(dir, plan.recoveryJournalRelativePath);
    const beforeLiveObservation = readFileSync(journalPath, "utf-8");

    await expect(port.recoveryObserver.observe(owner)).resolves.toEqual({
      ownerState: "live",
      processIdentityDigest: identity.processIdentityDigest,
      processGroupState: "live",
    });
    expect(readFileSync(journalPath, "utf-8")).toBe(beforeLiveObservation);

    const armingWithoutChild = {
      ...JSON.parse(beforeLiveObservation) as Record<string, unknown>,
      state: "arming",
    };
    writeFileSync(journalPath, `${JSON.stringify(armingWithoutChild)}\n`, "utf-8");
    const beforeArmingObservation = readFileSync(journalPath, "utf-8");
    await expect(port.recoveryObserver.observe(owner)).resolves.toEqual({
      ownerState: "live",
      processIdentityDigest: identity.processIdentityDigest,
      processGroupState: "live",
    });
    expect(readFileSync(journalPath, "utf-8")).toBe(beforeArmingObservation);
    writeFileSync(journalPath, beforeLiveObservation, "utf-8");

    await session.terminateAndWait("observer-test");
    const beforeStoppedObservation = readFileSync(journalPath, "utf-8");
    const terminalMismatch = JSON.parse(beforeStoppedObservation) as Record<string, unknown>;
    terminalMismatch.terminal = {
      ...(terminalMismatch.terminal as Record<string, unknown>),
      processIdentityDigest: "foreign-process-identity",
    };
    writeFileSync(journalPath, `${JSON.stringify(terminalMismatch)}\n`, "utf-8");
    await expect(port.recoveryObserver.observe(owner)).resolves.toEqual({
      ownerState: "unknown",
      processIdentityDigest: identity.processIdentityDigest,
      processGroupState: "unknown",
    });
    writeFileSync(journalPath, beforeStoppedObservation, "utf-8");
    await expect(port.recoveryObserver.observe(owner)).resolves.toEqual({
      ownerState: "dead",
      processIdentityDigest: identity.processIdentityDigest,
      processGroupState: "stopped",
    });
    expect(readFileSync(journalPath, "utf-8")).toBe(beforeStoppedObservation);
    await session.dispose();
  });

  test("pins the guardian while an exited provider leaves a grandchild and never exposes controller IPC", async () => {
    const dir = root();
    const readyPath = join(dir, "guardian-provider-ready");
    const releasePath = join(dir, "guardian-provider-release");
    const providerPath = join(dir, "guardian-provider.json");
    const grandchildPath = join(dir, "guardian-grandchild-pid");
    const foreign = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 60_000)"], {
      detached: true,
      stdio: "ignore",
    });
    if (!foreign.pid) throw new Error("foreign fixture did not start");
    const foreignIdentity = observeProcessIdentity(foreign.pid);
    if (foreignIdentity.type !== "ok") throw new Error("foreign fixture identity unavailable");
    expect(foreignIdentity.value.processGroupId).toBe(foreignIdentity.value.pid);

    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      armTimeoutMs: 2_000,
      terminationGraceMs: 50,
    });
    const plan = port.plan({
      nativeRunId: "run-guardian-provider-exit",
      evidenceDir: dir,
      context,
      fencingToken: 12,
    });
    const grandchildSource = [
      "process.on('SIGTERM', () => {});",
      "await Bun.write(process.env.GRANDCHILD_PATH, String(process.pid));",
      "await new Promise(() => {});",
    ].join(" ");
    const providerSource = [
      "await Bun.write(process.env.PROVIDER_PATH, JSON.stringify({",
      "  pid: process.pid,",
      "  hasSend: typeof process.send === 'function',",
      "  nodeChannelFd: process.env.NODE_CHANNEL_FD ?? null,",
      "}));",
      `Bun.spawn([process.execPath, "-e", ${JSON.stringify(grandchildSource)}], {`,
      "  env: { ...process.env, GRANDCHILD_PATH: process.env.GRANDCHILD_PATH },",
      "  stdout: 'ignore', stderr: 'ignore',",
      "});",
      "while (!(await Bun.file(process.env.GRANDCHILD_PATH).exists())) await Bun.sleep(5);",
      "await Bun.write(process.env.READY_PATH, 'ready');",
      "while (!(await Bun.file(process.env.RELEASE_PATH).exists())) await Bun.sleep(5);",
      "process.exit(0);",
    ].join(" ");
    const transport = { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const };
    const session = await port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", providerSource],
        cwd: dir,
        env: {
          PATH: process.env.PATH ?? "",
          READY_PATH: readyPath,
          RELEASE_PATH: releasePath,
          PROVIDER_PATH: providerPath,
          GRANDCHILD_PATH: grandchildPath,
        },
        transport,
        timeoutMs: 5_000,
      },
    });
    const identity = await session.observeIdentity();
    const guardian = JSON.parse(readFileSync(join(dir, plan.identityRelativePath), "utf-8")) as {
      process: { pid: number; processGroupId: number };
    };
    expect(guardian.process.processGroupId).toBe(guardian.process.pid);
    try {
      await session.arm();
      await waitForFile(readyPath);
      const providerReceipt = JSON.parse(readFileSync(providerPath, "utf-8")) as {
        pid: number;
        hasSend: boolean;
        nodeChannelFd: string | null;
      };
      const provider = observeProcessIdentity(providerReceipt.pid);
      const grandchild = observeProcessIdentity(Number(readFileSync(grandchildPath, "utf-8")));
      if (provider.type !== "ok" || grandchild.type !== "ok") throw new Error("provider fixture identity unavailable");
      expect(provider.value.processGroupId).toBe(guardian.process.processGroupId);
      expect(grandchild.value.processGroupId).toBe(guardian.process.processGroupId);
      expect(providerReceipt).toMatchObject({ hasSend: false, nodeChannelFd: null });

      writeFileSync(releasePath, "release", "utf-8");
      const terminal = await session.waitForTerminal({ transport });
      expect(terminal.exitCode).toBe(0);
      expect(terminal.processIdentityDigest).toBe(identity.processIdentityDigest);
      expect(processGroupIsStopped(guardian.process.processGroupId)).toBeTrue();
      expect(observeProcessIdentity(provider.value.pid).type).toBe("err");
      expect(observeProcessIdentity(grandchild.value.pid).type).toBe("err");
      const foreignAfter = observeProcessIdentity(foreignIdentity.value.pid);
      expect(foreignAfter.type).toBe("ok");
      if (foreignAfter.type === "ok") expect(foreignAfter.value).toEqual(foreignIdentity.value);
      await session.dispose();
    } finally {
      if (!processGroupIsStopped(guardian.process.processGroupId)) {
        try { process.kill(-guardian.process.processGroupId, "SIGKILL"); } catch {}
      }
      foreign.kill("SIGKILL");
    }
  }, 10_000);

  test("keeps the guardian identity pinned across the last-grandchild TERM exit race", async () => {
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const dir = root();
      const grandchildPath = join(dir, `race-grandchild-${iteration}`);
      const port = createNativeProcessPort({
        rootDir: dir,
        output: { publish: () => {}, close: () => {}, fail: () => {} },
        armTimeoutMs: 2_000,
        terminationGraceMs: 50,
      });
      const plan = port.plan({
        nativeRunId: `run-last-grandchild-race-${iteration}`,
        evidenceDir: dir,
        context,
        fencingToken: 30 + iteration,
      });
      const grandchildSource = [
        "process.on('SIGTERM', () => setTimeout(() => process.exit(0), 30));",
        "await Bun.write(process.env.GRANDCHILD_PATH, String(process.pid));",
        "await new Promise(() => {});",
      ].join(" ");
      const providerSource = [
        `Bun.spawn([process.execPath, "-e", ${JSON.stringify(grandchildSource)}], {`,
        "  env: { ...process.env, GRANDCHILD_PATH: process.env.GRANDCHILD_PATH },",
        "  stdout: 'ignore', stderr: 'ignore',",
        "});",
        "while (!(await Bun.file(process.env.GRANDCHILD_PATH).exists())) await Bun.sleep(5);",
        "process.exit(0);",
      ].join(" ");
      const transport = { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const };
      const session = await port.spawn({
        plan,
        launch: {
          executable: process.execPath,
          args: ["-e", providerSource],
          cwd: dir,
          env: { PATH: process.env.PATH ?? "", GRANDCHILD_PATH: grandchildPath },
          transport,
          timeoutMs: 3_000,
        },
      });
      await session.observeIdentity();
      const guardian = JSON.parse(readFileSync(join(dir, plan.identityRelativePath), "utf-8")) as {
        process: { pid: number; processGroupId: number };
      };
      await session.arm();
      const terminal = await session.waitForTerminal({ transport });
      expect(terminal.exitCode).toBe(0);
      expect(processGroupIsStopped(guardian.process.processGroupId)).toBeTrue();
      expect(observeProcessIdentity(Number(readFileSync(grandchildPath, "utf-8"))).type).toBe("err");
      await session.dispose();
    }
  }, 10_000);

  test("retains a headless provider group for recovery observation after guardian failure", async () => {
    const dir = root();
    const providerPath = join(dir, "headless-provider-pid");
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      armTimeoutMs: 2_000,
      terminationGraceMs: 50,
    });
    const plan = port.plan({
      nativeRunId: "run-headless-recovery",
      evidenceDir: dir,
      context,
      fencingToken: 41,
    });
    const transport = { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const };
    const session = await port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: [
          "-e",
          "process.on('SIGTERM', () => {}); await Bun.write(process.env.PROVIDER_PATH, String(process.pid)); await new Promise(() => {});",
        ],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "", PROVIDER_PATH: providerPath },
        transport,
        timeoutMs: 5_000,
      },
    });
    const identity = await session.observeIdentity();
    const owner = recoveryOwner(plan.nativeRunId, 41, identity.processIdentityDigest);
    const guardian = JSON.parse(readFileSync(join(dir, plan.identityRelativePath), "utf-8")) as {
      process: { pid: number; processGroupId: number };
    };
    await session.arm();
    await waitForFile(providerPath);
    const recoveryPort = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    await expect(recoveryPort.recoveryObserver.observe(owner)).resolves.toEqual({
      ownerState: "live",
      processIdentityDigest: identity.processIdentityDigest,
      processGroupState: "live",
    });

    process.kill(guardian.process.pid, "SIGKILL");
    for (let attempt = 0; attempt < 200 && observeProcessIdentity(guardian.process.pid).type === "ok"; attempt += 1) {
      await Bun.sleep(5);
    }
    await expect(recoveryPort.recoveryObserver.observe(owner)).resolves.toEqual({
      ownerState: "dead",
      processIdentityDigest: identity.processIdentityDigest,
      processGroupState: "live",
    });
    expect(observeProcessIdentity(Number(readFileSync(providerPath, "utf-8"))).type).toBe("ok");

    process.kill(-guardian.process.processGroupId, "SIGKILL");
    await waitForStoppedProcessGroup(guardian.process.processGroupId);
    expect(processGroupIsStopped(guardian.process.processGroupId)).toBeTrue();
  }, 10_000);

  test("uses the current Bun executable for stdio and PTY wrappers instead of node from PATH", async () => {
    const dir = root();
    const stubDir = join(dir, "stub-bin");
    const stubMarker = join(dir, "node-stub-called");
    const nodeStub = join(stubDir, "node");
    const sourceUrl = new URL(
      "../../packages/framework/core/tools/amadeus-swarm-native-process.ts",
      import.meta.url,
    ).href;
    mkdirSync(stubDir, { recursive: true });
    writeFileSync(nodeStub, '#!/bin/sh\nprintf called > "$NODE_STUB_MARKER"\nexit 97\n', { mode: 0o755 });

    const script = `
      import { createNativeProcessPort } from ${JSON.stringify(sourceUrl)};
      const context = Object.freeze({
        driver: "codex-ultra",
        executionId: "exec-default-wrapper",
        attemptId: "attempt-default-wrapper",
        attemptNonceHash: "nonce-default-wrapper",
        planDigest: "plan-default-wrapper",
        waveIndex: 0,
        waveDigest: "wave-default-wrapper",
        expectedUnits: Object.freeze(["alpha"]),
      });
      const port = createNativeProcessPort({
        rootDir: ${JSON.stringify(dir)},
        output: {
          publish: (_nativeRunId, frame) => process.stdout.write(frame.bytes),
          close: () => {},
          fail: () => {},
        },
        armTimeoutMs: 2_000,
      });
      const plan = port.plan({
        nativeRunId: "run-default-wrapper",
        evidenceDir: ${JSON.stringify(dir)},
        context,
        fencingToken: 1,
      });
      const transport = { kind: "stdio-json", stdin: "closed", output: "jsonl" };
      const session = await port.spawn({
        plan,
        launch: {
          executable: process.execPath,
          args: ["-e", "console.log('provider-ready')"],
          cwd: ${JSON.stringify(dir)},
          env: { PATH: process.env.PATH ?? "" },
          transport,
          timeoutMs: 1_000,
        },
      });
      await session.observeIdentity();
      await session.arm();
      const terminal = await session.waitForTerminal({ transport });
      if (terminal.exitCode !== 0) throw new Error(\`unexpected exit: \${terminal.exitCode}\`);

      const ptyMarker = ${JSON.stringify(join(dir, "pty-default-wrapper"))};
      const ptyTransport = {
        kind: "pty-interactive",
        initialInput: new TextEncoder().encode("begin\\n"),
        columns: 80,
        rows: 24,
        exitOnSignal: "ready-for-graceful-exit",
        gracefulExitInput: new TextEncoder().encode("quit\\n"),
        controlTimeoutMs: 1_000,
        gracefulExitTimeoutMs: 1_000,
      };
      const ptyPlan = port.plan({
        nativeRunId: "run-default-pty-wrapper",
        evidenceDir: ${JSON.stringify(dir)},
        context,
        fencingToken: 2,
      });
      const ptySession = await port.spawn({
        plan: ptyPlan,
        launch: {
          executable: process.execPath,
          args: [
            "-e",
            "process.stdin.setRawMode?.(true); process.stdin.resume(); process.stdin.on('data', async (chunk) => { const text = chunk.toString(); if (text.includes('begin')) await Bun.write(process.env.MARKER, 'initial'); if (text.includes('quit')) process.exit(0); }); await new Promise(() => {});",
          ],
          cwd: ${JSON.stringify(dir)},
          env: { PATH: process.env.PATH ?? "", MARKER: ptyMarker },
          transport: ptyTransport,
          timeoutMs: 2_000,
        },
      });
      await ptySession.observeIdentity();
      await ptySession.arm();
      const ptyTerminal = await ptySession.waitForTerminal({
        transport: ptyTransport,
        controlSignals: (async function* () {
          for (let attempt = 0; attempt < 50 && !(await Bun.file(ptyMarker).exists()); attempt += 1) {
            await Bun.sleep(10);
          }
          yield {
            kind: "ready-for-graceful-exit",
            driver: context.driver,
            executionId: context.executionId,
            attemptId: context.attemptId,
            attemptNonceHash: context.attemptNonceHash,
            planDigest: context.planDigest,
            waveIndex: context.waveIndex,
            waveDigest: context.waveDigest,
            coveredUnits: context.expectedUnits,
            liveEvidenceDigest: "live-evidence",
          };
        })(),
      });
      if (ptyTerminal.exitCode !== 0) throw new Error(\`unexpected PTY exit: \${ptyTerminal.exitCode}\`);
    `;
    const child = Bun.spawn([process.execPath, "-e", script], {
      cwd: dir,
      env: {
        ...process.env,
        PATH: `${stubDir}:${process.env.PATH ?? ""}`,
        NODE_STUB_MARKER: stubMarker,
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);

    expect(exitCode, stderr).toBe(0);
    expect(stdout).toContain("provider-ready");
    expect(readFileSync(join(dir, "pty-default-wrapper"), "utf-8")).toBe("initial");
    expect(existsSync(stubMarker)).toBeFalse();
  });

  test("serializes spawn and arm while journaling the lifecycle until disposal", async () => {
    const dir = root();
    let currentTime = new Date(Date.now() - 10_000);
    const output = outputCollector();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: output.port,
      armTimeoutMs: 2_000,
      now: () => new Date(currentTime.getTime()),
    });
    const planInput = {
      nativeRunId: "run-lifecycle",
      evidenceDir: dir,
      context,
      fencingToken: 6,
    };
    const conflictingRunDirectory = join(
      dir,
      `.amadeus-swarm-driver/native/${digestValue("run-lifecycle-conflict").slice(0, 24)}`,
    );
    mkdirSync(conflictingRunDirectory, { recursive: true });
    const prePlanForeign = join(conflictingRunDirectory, "foreign");
    writeFileSync(prePlanForeign, "preserve", "utf-8");
    expect(() => port.plan({ ...planInput, nativeRunId: "run-lifecycle-conflict" }))
      .toThrow("NATIVE_PROCESS_RUN_DIRECTORY_EXISTS");
    expect(readFileSync(prePlanForeign, "utf-8")).toBe("preserve");
    rmSync(conflictingRunDirectory, { recursive: true });

    const plan = port.plan(planInput);
    const runDirectory = join(dir, dirname(plan.recoveryJournalRelativePath));
    expect(plan).not.toHaveProperty("armDeadline");
    expect(port.plan(planInput)).toEqual(plan);
    expect(existsSync(runDirectory)).toBeTrue();
    expect(port.activeRecordCount()).toBe(1);

    currentTime = new Date();
    const spawnInput = {
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "console.log('complete')"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const },
        timeoutMs: 2_000,
      },
    };
    const spawnResults = await Promise.allSettled([port.spawn(spawnInput), port.spawn(spawnInput)]);
    expect(spawnResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const spawned = spawnResults.find((result) => result.status === "fulfilled");
    if (spawned?.status !== "fulfilled") throw new Error("expected one spawn winner");
    const session = spawned.value;
    const spawnedJournal = recoveryJournal(dir, plan.recoveryJournalRelativePath);
    expect(spawnedJournal).toMatchObject({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      state: "spawned",
      owner: {
        device: expect.any(String),
        inode: expect.any(String),
        userId: expect.any(String),
        markerDigest: expect.any(String),
      },
    });
    const authoritativeArmDeadline = String(spawnedJournal.armDeadline);
    expect(Number.isNaN(Date.parse(authoritativeArmDeadline))).toBeFalse();

    const identity = await session.observeIdentity();
    expect(identity.armDeadline).toBe(authoritativeArmDeadline);
    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({
      state: "spawned",
      processIdentityDigest: identity.processIdentityDigest,
    });
    const firstArm = session.arm();
    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({ state: "arming" });
    const secondArm = session.arm();
    const armResults = await Promise.allSettled([firstArm, secondArm]);
    expect(armResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({
      state: "armed",
      processIdentityDigest: expect.any(String),
    });

    await session.waitForTerminal({ transport: spawnInput.launch.transport });
    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({
      state: "terminal",
      terminal: { nativeRunId: plan.nativeRunId, exitCode: 0 },
    });

    const ownedBackup = `${runDirectory}-owned`;
    renameSync(runDirectory, ownedBackup);
    mkdirSync(runDirectory);
    const foreignFile = join(runDirectory, "foreign");
    writeFileSync(foreignFile, "preserve", "utf-8");
    await expect(session.dispose()).rejects.toThrow("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
    expect(readFileSync(foreignFile, "utf-8")).toBe("preserve");
    expect(port.activeRecordCount()).toBe(1);

    rmSync(runDirectory, { recursive: true });
    const foreignTarget = join(dir, "foreign-target");
    mkdirSync(foreignTarget);
    const symlinkTargetFile = join(foreignTarget, "preserve");
    writeFileSync(symlinkTargetFile, "preserve", "utf-8");
    symlinkSync(foreignTarget, runDirectory, "dir");
    await expect(session.dispose()).rejects.toThrow("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
    expect(readFileSync(symlinkTargetFile, "utf-8")).toBe("preserve");

    unlinkSync(runDirectory);
    renameSync(ownedBackup, runDirectory);
    await session.dispose();
    expect(existsSync(runDirectory)).toBeFalse();
    expect(port.activeRecordCount()).toBe(0);
    await expect(session.observeIdentity()).rejects.toThrow("NATIVE_PROCESS_DISPOSED");
  });

  test("restores durable planned state when wrapper spawn throws synchronously", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      wrapperExecutable: "\0",
    });
    const plan = port.plan({
      nativeRunId: "run-wrapper-spawn-failure",
      evidenceDir: dir,
      context,
      fencingToken: 7,
    });
    const runDirectory = join(dir, dirname(plan.recoveryJournalRelativePath));

    await expect(port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "process.exit(0)"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
        timeoutMs: 1_000,
      },
    })).rejects.toThrow();

    expect(recoveryJournal(dir, plan.recoveryJournalRelativePath)).toMatchObject({
      state: "planned",
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
    });
    expect(port.activeRecordCount()).toBe(1);
    expect(existsSync(runDirectory)).toBeTrue();
    expect(existsSync(join(runDirectory, "spawn-claim.json"))).toBeFalse();
    await expect(port.recoverAttempt({
      kind: "native-process-recovery",
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      processIdentityDigest: null,
    })).resolves.toMatchObject({ status: "unarmed" });
    await port.releasePlan(plan);
    expect(existsSync(runDirectory)).toBeFalse();
  });

  test("preserves a foreign run directory replacement during spawn rollback", async () => {
    const dir = root();
    let runDirectory = "";
    const ownedBackup = join(dir, "owned-run-backup");
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      get wrapperExecutable() {
        renameSync(runDirectory, ownedBackup);
        mkdirSync(runDirectory);
        writeFileSync(join(runDirectory, "foreign"), "preserve", "utf-8");
        return "\0";
      },
    });
    const plan = port.plan({
      nativeRunId: "run-foreign-spawn-rollback",
      evidenceDir: dir,
      context,
      fencingToken: 8,
    });
    runDirectory = join(dir, dirname(plan.recoveryJournalRelativePath));

    let failure: unknown;
    try {
      await port.spawn({
        plan,
        launch: {
          executable: process.execPath,
          args: ["-e", "process.exit(0)"],
          cwd: dir,
          env: { PATH: process.env.PATH ?? "" },
          transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
          timeoutMs: 1_000,
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as Error).message).toBe("NATIVE_PROCESS_SPAWN_ROLLBACK_FAILED");
    expect(readFileSync(join(runDirectory, "foreign"), "utf-8")).toBe("preserve");
    expect(existsSync(ownedBackup)).toBeTrue();
    expect(port.activeRecordCount()).toBe(1);
  });

  test("does not mutate a foreign directory installed before spawn", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    const plan = port.plan({
      nativeRunId: "run-pre-spawn-directory-replacement",
      evidenceDir: dir,
      context,
      fencingToken: 9,
    });
    const runDirectory = join(dir, dirname(plan.recoveryJournalRelativePath));
    const ownedBackup = `${runDirectory}-owned`;
    renameSync(runDirectory, ownedBackup);
    mkdirSync(runDirectory);
    writeFileSync(join(runDirectory, "owner.json"), `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      token: "foreign-token",
    })}\n`, "utf-8");
    const foreignRecovery = `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      owner: { device: "1", inode: "1", userId: "1", markerDigest: "foreign" },
      armDigest: plan.armDigest,
      runEpochDigest: "foreign-epoch",
      state: "planned",
      updatedAt: new Date().toISOString(),
    })}\n`;
    const foreignRecoveryPath = join(runDirectory, "recovery.json");
    writeFileSync(foreignRecoveryPath, foreignRecovery, "utf-8");

    await expect(port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "process.exit(0)"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
        timeoutMs: 1_000,
      },
    })).rejects.toThrow("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");

    expect(readFileSync(foreignRecoveryPath, "utf-8")).toBe(foreignRecovery);
    expect(existsSync(runDirectory)).toBeTrue();
    expect(existsSync(ownedBackup)).toBeTrue();
  });

  test("materializes wrapper identity before one-time arm permits stdio launch", async () => {
    const dir = root();
    const marker = join(dir, "provider-started");
    const providerPidPath = join(dir, "provider-pid");
    const releasePath = join(dir, "provider-release");
    const output = outputCollector();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: output.port,
      wrapperExecutable: process.execPath,
      armTimeoutMs: 2_000,
      terminationGraceMs: 500,
    });
    const plan = port.plan({
      nativeRunId: "run-stdio",
      evidenceDir: dir,
      context,
      fencingToken: 7,
    });
    expect(plan.armDigest).toBe(digestValue({
      nativeRunId: "run-stdio",
      executionId: context.executionId,
      attemptId: context.attemptId,
      attemptNonceHash: context.attemptNonceHash,
      planDigest: context.planDigest,
      waveIndex: context.waveIndex,
      waveDigest: context.waveDigest,
      fencingToken: 7,
    }));
    expect(plan.identityRelativePath).toStartWith(".amadeus-swarm-driver/native/");
    expect(plan.armRelativePath).toStartWith(".amadeus-swarm-driver/native/");
    expect(plan.recoveryJournalRelativePath).toStartWith(".amadeus-swarm-driver/native/");
    const session = await port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: [
          "-e",
          "await Bun.write(process.env.PID_PATH, String(process.pid)); await Bun.write(process.env.MARKER, 'started'); console.log('ready'); console.error('diagnostic'); while (!(await Bun.file(process.env.RELEASE_PATH).exists())) await Bun.sleep(5);",
        ],
        cwd: dir,
        env: {
          PATH: process.env.PATH ?? "",
          MARKER: marker,
          PID_PATH: providerPidPath,
          RELEASE_PATH: releasePath,
        },
        transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
        timeoutMs: 3_000,
      },
    });

    const identity = await session.observeIdentity();
    expect(identity.processIdentityDigest).toHaveLength(64);
    expect(identity.armDigest).toBe(plan.armDigest);
    expect(Number.isNaN(Date.parse(identity.armDeadline))).toBeFalse();
    expect(existsSync(marker)).toBeFalse();

    await session.arm();
    await waitForFile(marker);
    const wrapperIdentity = JSON.parse(
      readFileSync(join(dir, plan.identityRelativePath), "utf-8"),
    ) as { process: { pid: number; processGroupId: number } };
    const providerIdentity = observeProcessIdentity(Number(readFileSync(providerPidPath, "utf-8")));
    if (providerIdentity.type !== "ok") throw new Error("provider identity unavailable");
    expect(wrapperIdentity.process.processGroupId).toBe(wrapperIdentity.process.pid);
    expect(providerIdentity.value.processGroupId).toBe(wrapperIdentity.process.processGroupId);
    writeFileSync(releasePath, "release", "utf-8");
    const terminal = await session.waitForTerminal({
      transport: { kind: "stdio-json", stdin: "closed", output: "jsonl" },
    });
    expect(terminal).toMatchObject({
      transport: "stdio-json",
      exitCode: 0,
      nativeRunId: "run-stdio",
      processIdentityDigest: identity.processIdentityDigest,
    });
    expect(readFileSync(marker, "utf-8")).toBe("started");
    expect(processGroupIsStopped(wrapperIdentity.process.processGroupId)).toBeTrue();
    expect(output.frames.map(({ kind, transport, channel }) => ({ kind, transport, channel }))).toContainEqual({
      kind: "evidence",
      transport: "stdio-json",
      channel: "stdout",
    });
    expect(output.frames.map(({ kind, transport, channel }) => ({ kind, transport, channel }))).toContainEqual({
      kind: "diagnostic",
      transport: "stdio-json",
      channel: "stderr",
    });
    expect(Buffer.concat(output.frames.filter((frame) => frame.kind === "evidence").map((frame) => frame.bytes)).toString())
      .toContain("ready");
    expect(Buffer.concat(output.frames.filter((frame) => frame.kind === "diagnostic").map((frame) => frame.bytes)).toString())
      .toContain("diagnostic");
    expect(output.closes()).toBe(1);
    expect(output.failures).toEqual([]);
    expect(() => session.arm()).toThrow("NATIVE_PROCESS_ARM_ALREADY_CONSUMED");
  });

  test("drains a 32 MiB stdout stream completely before the wrapper exits", async () => {
    const dir = root();
    const output = outputCollector();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: output.port,
      armTimeoutMs: 2_000,
    });
    const plan = port.plan({
      nativeRunId: "run-large-output",
      evidenceDir: dir,
      context,
      fencingToken: 10,
    });
    const transport = { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const };
    const session = await port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: ["-e", "process.stdout.write(Buffer.alloc(32 * 1024 * 1024, 0x61))"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport,
        timeoutMs: 10_000,
      },
    });
    await session.observeIdentity();
    await session.arm();
    const terminal = await session.waitForTerminal({ transport });
    const evidence = Buffer.concat(
      output.frames.filter((frame) => frame.kind === "evidence").map((frame) => frame.bytes),
    );

    expect(terminal.exitCode).toBe(0);
    expect(evidence.byteLength).toBe(32 * 1024 * 1024);
    expect(evidence.every((byte) => byte === 0x61)).toBeTrue();
    await session.dispose();
  }, 15_000);

  test("delivers PTY initial input and one correlated graceful-exit input", async () => {
    const dir = root();
    const marker = join(dir, "pty-initial");
    const providerPidPath = join(dir, "pty-provider-pid");
    const output = outputCollector();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: output.port,
      armTimeoutMs: 2_000,
      terminationGraceMs: 500,
    });
    const plan = port.plan({
      nativeRunId: "run-pty",
      evidenceDir: dir,
      context,
      fencingToken: 8,
    });
    const transport = {
      kind: "pty-interactive" as const,
      initialInput: new TextEncoder().encode("begin\n"),
      columns: 120 as const,
      rows: 40 as const,
      exitOnSignal: "ready-for-graceful-exit" as const,
      gracefulExitInput: new TextEncoder().encode("quit\n"),
      controlTimeoutMs: 2_000,
      gracefulExitTimeoutMs: 2_000,
    };
    const session = await port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: [
          "-e",
          "await Bun.write(process.env.PID_PATH, String(process.pid)); process.stdin.setRawMode?.(true); process.stdin.resume(); let initialWrite = Promise.resolve(); process.stdin.on('data', async (chunk) => { const text = chunk.toString(); if (text.includes('begin')) initialWrite = Bun.write(process.env.MARKER, 'initial'); if (text.includes('quit')) { await initialWrite; console.log('graceful'); process.exit(0); } }); await new Promise(() => {});",
        ],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "", MARKER: marker, PID_PATH: providerPidPath },
        transport,
        timeoutMs: 4_000,
      },
    });
    await session.observeIdentity();
    const wrapperIdentity = JSON.parse(
      readFileSync(join(dir, plan.identityRelativePath), "utf-8"),
    ) as { process: { pid: number; processGroupId: number } };
    expect(wrapperIdentity.process.processGroupId).toBe(wrapperIdentity.process.pid);
    await session.arm();
    const terminal = await session.waitForTerminal({
      transport,
      controlSignals: (async function* () {
        for (let attempt = 0; attempt < 50 && !existsSync(marker); attempt += 1) await Bun.sleep(10);
        const providerIdentity = observeProcessIdentity(Number(readFileSync(providerPidPath, "utf-8")));
        if (providerIdentity.type !== "ok") throw new Error("PTY provider identity unavailable");
        expect(providerIdentity.value.processGroupId).toBe(wrapperIdentity.process.processGroupId);
        yield {
          kind: "ready-for-graceful-exit" as const,
          driver: "codex-ultra" as const,
          executionId: context.executionId,
          attemptId: context.attemptId,
          attemptNonceHash: context.attemptNonceHash,
          planDigest: context.planDigest,
          waveIndex: context.waveIndex,
          waveDigest: context.waveDigest,
          coveredUnits: context.expectedUnits,
          liveEvidenceDigest: "live-evidence",
        };
      })(),
    });

    expect(typeof terminal.controlSignalDigest).toBe("string");
    expect(terminal.controlSignalDigest).toHaveLength(64);
    expect(terminal).toMatchObject({
      transport: "pty-interactive",
      exitCode: 0,
      nativeRunId: "run-pty",
    });
    expect(readFileSync(marker, "utf-8")).toBe("initial");
    expect(processGroupIsStopped(wrapperIdentity.process.processGroupId)).toBeTrue();
    expect(output.frames.length).toBeGreaterThan(0);
    expect(output.frames.every((frame) => (
      frame.kind === "diagnostic" && frame.transport === "pty-interactive" && frame.channel === "pty"
    ))).toBeTrue();
    expect(Buffer.concat(output.frames.map((frame) => frame.bytes)).toString()).toContain("graceful");
    expect(output.closes()).toBe(1);
    expect(output.failures).toEqual([]);
  });

  test("drains the final PTY diagnostic before reporting an invalid control message", async () => {
    const dir = root();
    const identityPath = join(dir, "invalid-control-identity.json");
    const armPath = join(dir, "invalid-control-arm.json");
    const readyPath = join(dir, "invalid-control-ready");
    const tailPath = join(dir, "invalid-control-tail");
    const nativeRunId = "run-invalid-pty-control";
    const armDigest = digestValue({ nativeRunId, token: "invalid-control" });
    const runEpochDigest = digestValue({ nativeRunId, epoch: 1 });
    const wrapperPlan = {
      schemaVersion: 1,
      nativeRunId,
      identityPath,
      armPath,
      armDigest,
      runEpochDigest,
      armDeadline: new Date(Date.now() + 5_000).toISOString(),
    };
    const wrapper = spawn(process.execPath, [
      fileURLToPath(new URL(
        "../../packages/framework/core/tools/amadeus-swarm-native-process.ts",
        import.meta.url,
      )),
      "native-process-wrapper",
      Buffer.from(JSON.stringify(wrapperPlan), "utf-8").toString("base64"),
    ], {
      detached: true,
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    });
    if (!wrapper.stdin || !wrapper.stdout || !wrapper.stderr) {
      throw new Error("wrapper fixture stdio unavailable");
    }
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    wrapper.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    wrapper.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    const providerTerminal = new Promise<Record<string, unknown>>((resolveTerminal, rejectTerminal) => {
      wrapper.once("message", (message) => resolveTerminal(message as Record<string, unknown>));
      wrapper.once("error", rejectTerminal);
      wrapper.once("exit", () => rejectTerminal(new Error("wrapper exited before provider terminal")));
    });
    const closed = new Promise<void>((resolveClosed) => wrapper.once("close", () => resolveClosed()));
    const providerSource = [
      "let stopping = false;",
      "process.on('SIGTERM', async () => {",
      "  if (stopping) return;",
      "  stopping = true;",
      "  await new Promise((resolve) => process.stdout.write('tail-diagnostic\\n', resolve));",
      "  await Bun.write(process.env.TAIL_PATH, 'tail-written');",
      "  process.exit(0);",
      "});",
      "await Bun.write(process.env.READY_PATH, 'ready');",
      "await new Promise(() => {});",
    ].join(" ");
    const launch = {
      kind: "launch",
      executable: process.execPath,
      args: ["-e", providerSource],
      cwd: dir,
      env: {
        PATH: process.env.PATH ?? "",
        READY_PATH: readyPath,
        TAIL_PATH: tailPath,
      },
      transport: {
        kind: "pty-interactive",
        initialInputBase64: "",
        columns: 80,
        rows: 24,
      },
    };
    wrapper.stdin.write(`${JSON.stringify(launch)}\n`);
    await waitForFile(identityPath);
    const identity = JSON.parse(readFileSync(identityPath, "utf-8")) as {
      process: { pid: number; processGroupId: number };
    };
    expect(identity.process.processGroupId).toBe(identity.process.pid);
    try {
      writeFileSync(armPath, `${JSON.stringify({
        schemaVersion: 1,
        nativeRunId,
        armDigest,
        runEpochDigest,
        processIdentityDigest: digestValue(identity.process),
      })}\n`, "utf-8");
      await waitForFile(readyPath);
      wrapper.stdin.write('{"kind":"graceful-exit","inputBase64":42}\n');
      const terminal = await Promise.race([
        providerTerminal,
        Bun.sleep(3_000).then(() => { throw new Error("provider terminal timed out"); }),
      ]);
      expect(terminal).toMatchObject({
        kind: "provider-terminal",
        nativeRunId,
        providerExitCode: 125,
      });
      expect(readFileSync(tailPath, "utf-8")).toBe("tail-written");
      process.kill(-identity.process.processGroupId, "SIGKILL");
      await closed;
      expect(Buffer.concat(output).toString()).toContain("tail-diagnostic");
      expect(Buffer.concat(errors).toString()).toBe("");
    } finally {
      if (!processGroupIsStopped(identity.process.processGroupId)) {
        try { process.kill(-identity.process.processGroupId, "SIGKILL"); } catch {}
      }
    }
  }, 10_000);

  test("escalates a stdio timeout from TERM to identity-rechecked KILL and waits for exit", async () => {
    const dir = root();
    const pidPath = join(dir, "provider-pid");
    const grandchildPidPath = join(dir, "timeout-grandchild-pid");
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      wrapperExecutable: process.execPath,
      armTimeoutMs: 2_000,
      terminationGraceMs: 100,
    });
    const plan = port.plan({
      nativeRunId: "run-timeout",
      evidenceDir: dir,
      context,
      fencingToken: 9,
    });
    const transport = { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const };
    const grandchildSource = "process.on('SIGTERM', () => {}); await Bun.write(process.env.GRANDCHILD_PID_PATH, String(process.pid)); await new Promise(() => {});";
    const session = await port.spawn({
      plan,
      launch: {
        executable: process.execPath,
        args: [
          "-e",
          `process.on('SIGTERM', () => {}); Bun.spawn([process.execPath, "-e", ${JSON.stringify(grandchildSource)}], { env: { ...process.env, GRANDCHILD_PID_PATH: process.env.GRANDCHILD_PID_PATH }, stdout: 'ignore', stderr: 'ignore' }); while (!(await Bun.file(process.env.GRANDCHILD_PID_PATH).exists())) await Bun.sleep(5); await Bun.write(process.env.PID_PATH, String(process.pid)); await new Promise(() => {});`,
        ],
        cwd: dir,
        env: {
          PATH: process.env.PATH ?? "",
          PID_PATH: pidPath,
          GRANDCHILD_PID_PATH: grandchildPidPath,
        },
        transport,
        timeoutMs: 700,
      },
    });
    await session.observeIdentity();
    const wrapperIdentity = JSON.parse(
      readFileSync(join(dir, plan.identityRelativePath), "utf-8"),
    ) as { process: { pid: number; processGroupId: number } };
    await session.arm();
    for (let attempt = 0; attempt < 50 && !existsSync(pidPath); attempt += 1) await Bun.sleep(10);
    expect(existsSync(pidPath)).toBeTrue();
    await expect(session.waitForTerminal({ transport })).rejects.toThrow("NATIVE_PROCESS_TIMEOUT");
    const terminal = await session.terminateAndWait("test-timeout");
    expect(terminal.exitCode).not.toBe(0);
    const providerPid = Number(readFileSync(pidPath, "utf-8"));
    const grandchildPid = Number(readFileSync(grandchildPidPath, "utf-8"));
    expect(observeProcessIdentity(providerPid).type).toBe("err");
    expect(observeProcessIdentity(grandchildPid).type).toBe("err");
    expect(processGroupIsStopped(wrapperIdentity.process.processGroupId)).toBeTrue();
  });

  test("drives owned-directory validation and rollback failures in process", () => {
    const dir = root();
    expect(() => nativeProcessTestSeam.runDirectoryForPlan({
      nativeRunId: "invalid-plan",
      identityRelativePath: "foreign/identity.json",
      armRelativePath: "foreign/arm.json",
      armDigest: "digest",
      runEpochDigest: "epoch",
      recoveryJournalRelativePath: "foreign/recovery.json",
    })).toThrow("NATIVE_PROCESS_PLAN_INVALID");
    expect(nativeProcessTestSeam.directoryMatchesOwner(join(dir, "missing"), {
      device: "1",
      inode: "1",
      userId: "1",
      markerDigest: "missing",
    })).toBeFalse();
    expect(nativeProcessTestSeam.markerMatchesOwner(
      join(dir, "missing-marker"),
      "missing",
      { device: "1", inode: "1", userId: "1", markerDigest: "missing" },
    )).toBeFalse();

    const successPath = join(dir, "rollback-success");
    const success = nativeProcessTestSeam.createOwnedRunDirectory(successPath, "rollback-success");
    nativeProcessTestSeam.rollbackOwnedDirectoryInitialization(
      successPath,
      "rollback-success",
      success.owner,
    );
    expect(existsSync(successPath)).toBeFalse();

    const wrongOwnerPath = join(dir, "rollback-wrong-owner");
    const wrongOwner = nativeProcessTestSeam.createOwnedRunDirectory(wrongOwnerPath, "rollback-wrong-owner");
    expect(() => nativeProcessTestSeam.rollbackOwnedDirectoryInitialization(
      wrongOwnerPath,
      "rollback-wrong-owner",
      { ...wrongOwner.owner, inode: "0" },
    )).toThrow("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");

    const wrongMarkerPath = join(dir, "rollback-wrong-marker");
    const wrongMarker = nativeProcessTestSeam.createOwnedRunDirectory(wrongMarkerPath, "rollback-wrong-marker");
    writeFileSync(wrongMarker.markerPath, "{}\n", "utf-8");
    expect(() => nativeProcessTestSeam.rollbackOwnedDirectoryInitialization(
      wrongMarkerPath,
      "rollback-wrong-marker",
      wrongMarker.owner,
    )).toThrow("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");

    const changedAfterRenamePath = join(dir, "rollback-after-rename");
    const changedAfterRename = nativeProcessTestSeam.createOwnedRunDirectory(
      changedAfterRenamePath,
      "rollback-after-rename",
    );
    expect(() => nativeProcessTestSeam.rollbackOwnedDirectoryInitialization(
      changedAfterRenamePath,
      "rollback-after-rename",
      changedAfterRename.owner,
      (quarantine) => writeFileSync(join(quarantine, "owner.json"), "{}\n", "utf-8"),
    )).toThrow("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");

    const invalidMarkerPath = join(dir, "create-invalid-marker");
    expect(() => nativeProcessTestSeam.createOwnedRunDirectory(
      invalidMarkerPath,
      "create-invalid-marker",
      (markerPath) => writeFileSync(markerPath, "{}\n", "utf-8"),
    )).toThrow("NATIVE_PROCESS_DIRECTORY_INITIALIZATION_ROLLBACK_FAILED");
    expect(existsSync(invalidMarkerPath)).toBeTrue();

    const markerWriteFailurePath = join(dir, "create-marker-write-failure");
    expect(() => nativeProcessTestSeam.createOwnedRunDirectory(
      markerWriteFailurePath,
      "create-marker-write-failure",
      () => { throw new Error("marker write failed"); },
    )).toThrow("marker write failed");
    expect(existsSync(markerWriteFailurePath)).toBeFalse();

    const rollbackFailurePath = join(dir, "create-rollback-failure");
    const ownedBackup = `${rollbackFailurePath}-owned`;
    let failure: unknown;
    try {
      nativeProcessTestSeam.createOwnedRunDirectory(
        rollbackFailurePath,
        "create-rollback-failure",
        () => {
          renameSync(rollbackFailurePath, ownedBackup);
          mkdirSync(rollbackFailurePath);
          throw new Error("marker write failed");
        },
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as Error).message).toBe("NATIVE_PROCESS_DIRECTORY_INITIALIZATION_ROLLBACK_FAILED");
    expect(existsSync(ownedBackup)).toBeTrue();
  });

  test("fails closed across in-process identity and signal branches", async () => {
    const observed = observeProcessIdentity(process.pid);
    if (observed.type !== "ok") throw new Error("test process identity unavailable");
    const identity = observed.value;
    expect(nativeProcessTestSeam.signalExactProcessGroup(
      identity,
      "SIGTERM",
      () => { throw new Error("signal denied"); },
    )).toBeFalse();
    expect(await nativeProcessTestSeam.waitUntilGone(identity, 1)).toBeFalse();

    await expect(nativeProcessTestSeam.terminatePinnedGuardianGroup(
      { ...identity, processGroupId: identity.pid + 1 },
      Promise.resolve(1),
      1,
    )).rejects.toThrow("NATIVE_PROCESS_GUARDIAN_GROUP_UNFENCED");
    const missingLeader = {
      platform: identity.platform,
      pid: 2_000_000_000,
      processGroupId: 2_000_000_000,
      startTokenHash: "missing",
    } as const;
    await expect(nativeProcessTestSeam.terminatePinnedGuardianGroup(
      missingLeader,
      Promise.resolve(1),
      1,
    )).rejects.toThrow("NATIVE_PROCESS_GUARDIAN_GROUP_UNFENCED");

    const injectedLeader = {
      platform: identity.platform,
      pid: 777_777,
      processGroupId: 777_777,
      startTokenHash: "injected",
    } as const;
    const secondSignalFails = {
      signalGroup: (_value: typeof injectedLeader, signal: NodeJS.Signals) => signal === "SIGTERM",
      pause: async () => {},
      waitGone: async () => true,
      waitGroup: async () => "stopped" as const,
    };
    await expect(nativeProcessTestSeam.terminatePinnedGuardianGroup(
      injectedLeader,
      Promise.resolve(1),
      1,
      secondSignalFails,
    )).rejects.toThrow("NATIVE_PROCESS_GUARDIAN_GROUP_UNFENCED");

    const groupRemainsLive = {
      signalGroup: () => true,
      pause: async () => {},
      waitGone: async () => true,
      waitGroup: async () => "live" as const,
    };
    await expect(nativeProcessTestSeam.terminatePinnedGuardianGroup(
      injectedLeader,
      Promise.resolve(1),
      1,
      groupRemainsLive,
    )).rejects.toThrow("NATIVE_PROCESS_GUARDIAN_GROUP_ACTIVE");
    await expect(nativeProcessTestSeam.terminatePinnedGuardianGroup(
      injectedLeader,
      new Promise<number>(() => {}),
      1,
      { ...groupRemainsLive, waitGroup: async () => "stopped" as const },
    )).rejects.toThrow("NATIVE_PROCESS_GUARDIAN_ACTIVE");

    expect(nativeProcessTestSeam.signalExactProcess(
      identity,
      "SIGTERM",
      () => { throw new Error("signal denied"); },
    )).toBeFalse();
    const childSignals: NodeJS.Signals[] = [];
    await nativeProcessTestSeam.stopExactChild(identity, {
      signal: (_value, signal) => { childSignals.push(signal); return true; },
      waitGone: async () => childSignals.length > 1,
    });
    expect(childSignals).toEqual(["SIGTERM", "SIGKILL"]);
    await expect(nativeProcessTestSeam.stopExactChild(identity, {
      signal: () => true,
      waitGone: async () => false,
    })).rejects.toThrow("NATIVE_PROCESS_CHILD_ACTIVE");
    await nativeProcessTestSeam.stopExactChild(identity, {
      signal: () => true,
      waitGone: async () => true,
    });

    expect(await nativeProcessTestSeam.waitUntilProcessGroupStopped(identity.processGroupId, 1)).toBe("live");
    expect(nativeProcessTestSeam.providerSharesGuardianGroup(2_000_000_000, identity)).toBeNull();
    expect(nativeProcessTestSeam.providerSharesGuardianGroup(identity.pid, identity)).toEqual(identity);
  });

  test("validates recovery journals and identities through the in-process seam", async () => {
    const dir = root();
    const port = createNativeProcessPort({
      rootDir: dir,
      output: { publish: () => {}, close: () => {}, fail: () => {} },
    });
    expect(() => port.plan({
      nativeRunId: "",
      evidenceDir: dir,
      context,
      fencingToken: 0,
    })).toThrow("NATIVE_PROCESS_PLAN_INVALID");
    const plan = port.plan({
      nativeRunId: "run-recovery-seam",
      evidenceDir: dir,
      context,
      fencingToken: 52,
    });
    const runDirectory = join(dir, dirname(plan.recoveryJournalRelativePath));
    const plannedJournal = recoveryJournal(dir, plan.recoveryJournalRelativePath);
    const ownership = {
      markerPath: join(runDirectory, "owner.json"),
      owner: plannedJournal.owner as ReturnType<
        typeof nativeProcessTestSeam.createOwnedRunDirectory
      >["owner"],
    };
    const observed = observeProcessIdentity(process.pid);
    if (observed.type !== "ok") throw new Error("test process identity unavailable");
    const armDeadline = new Date(Date.now() + 5_000).toISOString();
    const identity = {
      schemaVersion: 1 as const,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      armDeadline,
      process: observed.value,
    };
    const identityPath = join(dir, plan.identityRelativePath);
    const journalPath = join(dir, plan.recoveryJournalRelativePath);
    writeFileSync(identityPath, `${JSON.stringify(identity)}\n`, "utf-8");
    writeFileSync(journalPath, `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      armDigest: plan.armDigest,
      runEpochDigest: plan.runEpochDigest,
      owner: ownership.owner,
      state: "spawned",
      updatedAt: new Date().toISOString(),
      armDeadline,
      processIdentityDigest: digestValue(observed.value),
    })}\n`, "utf-8");
    const owner = recoveryOwner(plan.nativeRunId, 52, digestValue(observed.value));

    expect(await port.recoveryObserver.observe(owner)).toEqual({
      ownerState: "live",
      processIdentityDigest: owner.processIdentityDigest,
      processGroupState: "live",
    });
    expect(nativeProcessTestSeam.recoveryObservationFromStates(owner, "live", "stopped")).toEqual({
      ownerState: "unknown",
      processIdentityDigest: owner.processIdentityDigest,
      processGroupState: "unknown",
    });
    expect(nativeProcessTestSeam.readRunIdentity(identityPath, plan, armDeadline)).toEqual(identity);

    writeFileSync(identityPath, "{}\n", "utf-8");
    expect(nativeProcessTestSeam.readRunIdentity(identityPath, plan, armDeadline)).toBeNull();
    writeFileSync(identityPath, "not-json", "utf-8");
    expect(nativeProcessTestSeam.readRunIdentity(identityPath, plan, armDeadline)).toBeNull();
    writeFileSync(journalPath, "not-json", "utf-8");
    expect(nativeProcessTestSeam.readProcessRecoveryJournal(journalPath, plan.nativeRunId)).toBeNull();
    expect(await port.recoveryObserver.observe(owner)).toEqual({
      ownerState: "unknown",
      processIdentityDigest: owner.processIdentityDigest,
      processGroupState: "unknown",
    });
  });

  test("executes wrapper parsing, arm, stdio, PTY, and IPC helpers in process", async () => {
    const dir = root();
    const observed = observeProcessIdentity(process.pid);
    if (observed.type !== "ok") throw new Error("test process identity unavailable");
    const wrapperIdentity = observed.value;
    const nativeRunId = "run-wrapper-helper-seam";
    const armDigest = digestValue({ nativeRunId });
    const runEpochDigest = digestValue({ nativeRunId, epoch: 1 });
    const armPath = join(dir, "arm.json");
    const plan = {
      schemaVersion: 1 as const,
      nativeRunId,
      identityPath: join(dir, "identity.json"),
      armPath,
      armDigest,
      runEpochDigest,
      armDeadline: new Date(Date.now() + 2_000).toISOString(),
    };
    const identity = {
      schemaVersion: 1 as const,
      nativeRunId,
      armDigest,
      runEpochDigest,
      armDeadline: plan.armDeadline,
      process: wrapperIdentity,
    };
    writeFileSync(armPath, `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId,
      armDigest,
      runEpochDigest,
      processIdentityDigest: digestValue(wrapperIdentity),
    })}\n`, "utf-8");
    expect(await nativeProcessTestSeam.waitForArm(plan, identity)).toBeTrue();
    expect(await nativeProcessTestSeam.waitForArm(plan, identity)).toBeFalse();

    const wrongEpochPlan = { ...plan, armPath: join(dir, "wrong-epoch-arm.json") };
    writeFileSync(wrongEpochPlan.armPath, `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId,
      armDigest,
      runEpochDigest: "wrong-epoch",
      processIdentityDigest: digestValue(wrapperIdentity),
    })}\n`, "utf-8");
    expect(await nativeProcessTestSeam.waitForArm(wrongEpochPlan, identity)).toBeFalse();

    const polledPlan = {
      ...plan,
      armPath: join(dir, "polled-arm.json"),
      armDeadline: new Date(Date.now() + 2_000).toISOString(),
    };
    setTimeout(() => writeFileSync(polledPlan.armPath, `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId,
      armDigest,
      runEpochDigest,
      processIdentityDigest: digestValue(wrapperIdentity),
    })}\n`, "utf-8"), 20);
    expect(await nativeProcessTestSeam.waitForArm(polledPlan, {
      ...identity,
      armDeadline: polledPlan.armDeadline,
    })).toBeTrue();

    const malformedPlan = { ...plan, armPath: join(dir, "malformed-arm.json") };
    writeFileSync(malformedPlan.armPath, "not-json", "utf-8");
    expect(await nativeProcessTestSeam.waitForArm(malformedPlan, {
      ...identity,
      armDeadline: malformedPlan.armDeadline,
    })).toBeFalse();
    const expiredPlan = {
      ...plan,
      armPath: join(dir, "expired-arm.json"),
      armDeadline: new Date(Date.now() - 1).toISOString(),
    };
    expect(await nativeProcessTestSeam.waitForArm(expiredPlan, {
      ...identity,
      armDeadline: expiredPlan.armDeadline,
    })).toBeFalse();

    const stdioMessage = {
      kind: "launch" as const,
      executable: process.execPath,
      args: ["-e", "for await (const _chunk of process.stdin) {} process.exit(0)"],
      cwd: dir,
      env: { PATH: process.env.PATH ?? "" },
      transport: { kind: "stdio-json" as const, stdin: { kind: "closed" as const } },
    };
    expect(nativeProcessTestSeam.parseLaunch(JSON.stringify(stdioMessage))).toEqual(stdioMessage);
    expect(nativeProcessTestSeam.parseLaunch("{}")) .toBeNull();
    expect(nativeProcessTestSeam.parseLaunch("not-json")).toBeNull();
    expect(await nativeProcessTestSeam.runStdioProvider(stdioMessage, wrapperIdentity)).toBe(0);
    const bytesMessage = {
      ...stdioMessage,
      args: [
        "-e",
        "let value = ''; for await (const chunk of process.stdin) value += chunk; process.exit(value === 'hello' ? 0 : 2)",
      ],
      transport: {
        kind: "stdio-json" as const,
        stdin: { kind: "bytes" as const, base64: Buffer.from("hello").toString("base64") },
      },
    };
    expect(await nativeProcessTestSeam.runStdioProvider(bytesMessage, wrapperIdentity)).toBe(0);
    const ptyMessage = {
      ...stdioMessage,
      transport: {
        kind: "pty-interactive" as const,
        initialInputBase64: "",
        columns: 80,
        rows: 24,
      },
    };
    expect(await nativeProcessTestSeam.runStdioProvider(ptyMessage, wrapperIdentity)).toBe(125);
    expect(await nativeProcessTestSeam.runStdioProvider(
      stdioMessage,
      { ...wrapperIdentity, processGroupId: wrapperIdentity.processGroupId + 1 },
    )).toBe(125);

    const writes: Uint8Array[] = [];
    await nativeProcessTestSeam.writePtyOutput(new Uint8Array([1]), {
      write: (bytes) => { writes.push(bytes); return true; },
      once: () => {},
    });
    await nativeProcessTestSeam.writePtyOutput(new Uint8Array([2]), {
      write: (bytes) => { writes.push(bytes); return false; },
      once: (_event, listener) => listener(),
    });
    expect(writes).toHaveLength(2);

    const iterator = (values: readonly string[]): AsyncIterator<string> => (async function* () {
      for (const value of values) yield value;
    })();
    expect(await nativeProcessTestSeam.runPtyProvider(stdioMessage, iterator([]), wrapperIdentity)).toBe(125);
    const ptyExitMessage = {
      ...ptyMessage,
      args: [
        "-e",
        "process.stdin.setRawMode?.(true); process.stdin.resume(); process.stdin.on('data', (chunk) => { if (chunk.toString().includes('quit')) process.exit(0); }); await new Promise(() => {})",
      ],
    };
    expect(await nativeProcessTestSeam.runPtyProvider(
      ptyExitMessage,
      iterator([JSON.stringify({ kind: "graceful-exit", inputBase64: Buffer.from("quit").toString("base64") })]),
      wrapperIdentity,
    )).toBe(0);
    expect(await nativeProcessTestSeam.runPtyProvider(
      { ...ptyMessage, args: ["-e", "await new Promise(() => {})"] },
      iterator(["not-json"]),
      wrapperIdentity,
    )).toBe(125);
    expect(await nativeProcessTestSeam.runPtyProvider(
      { ...ptyMessage, args: ["-e", "await new Promise(() => {})"] },
      iterator([JSON.stringify({ kind: "graceful-exit", inputBase64: 42 })]),
      wrapperIdentity,
    )).toBe(125);
    expect(await nativeProcessTestSeam.runPtyProvider(
      { ...ptyMessage, args: ["-e", "process.exit(0)"] },
      { next: () => new Promise(() => {}) },
      wrapperIdentity,
    )).toBe(0);
    expect(await nativeProcessTestSeam.runPtyProvider(
      { ...ptyMessage, args: ["-e", "await new Promise(() => {})"] },
      iterator([]),
      { ...wrapperIdentity, processGroupId: wrapperIdentity.processGroupId + 1 },
    )).toBe(125);

    const terminalMessage = {
      kind: "provider-terminal" as const,
      schemaVersion: 1 as const,
      nativeRunId,
      guardianIdentityDigest: digestValue(wrapperIdentity),
      providerExitCode: 0,
    };
    let disconnectListener: (() => void) | undefined;
    await nativeProcessTestSeam.notifyProviderTerminal(terminalMessage, {
      connected: true,
      once: (_event, listener) => { disconnectListener = listener; },
      off: () => {},
      send: (_message, callback) => { callback(); disconnectListener?.(); },
    });
    await nativeProcessTestSeam.notifyProviderTerminal(terminalMessage, {
      connected: true,
      once: () => {},
      off: () => {},
      send: () => { throw new Error("ipc closed"); },
    });
    await nativeProcessTestSeam.notifyProviderTerminal(terminalMessage, {
      connected: false,
      once: () => {},
      off: () => {},
    });
    await expect(nativeProcessTestSeam.pinGuardian(Promise.reject(new Error("stop pin"))))
      .rejects.toThrow("stop pin");
  }, 15_000);

  test("executes wrapper main decisions with injected process boundaries", async () => {
    const dir = root();
    const fakeIdentity = {
      platform: process.platform as "darwin" | "linux",
      pid: 432_100,
      processGroupId: 432_100,
      startTokenHash: "wrapper-main-start",
    };
    const plan = {
      schemaVersion: 1 as const,
      nativeRunId: "run-wrapper-main-seam",
      identityPath: join(dir, "identity.json"),
      armPath: join(dir, "arm.json"),
      armDigest: "wrapper-main-arm",
      runEpochDigest: "wrapper-main-epoch",
      armDeadline: new Date(Date.now() + 2_000).toISOString(),
    };
    const encodedPlan = Buffer.from(JSON.stringify(plan), "utf-8").toString("base64");
    const launch = {
      kind: "launch" as const,
      executable: process.execPath,
      args: ["-e", "process.exit(0)"],
      cwd: dir,
      env: { PATH: process.env.PATH ?? "" },
      transport: { kind: "stdio-json" as const, stdin: { kind: "closed" as const } },
    };
    const readerFor = (line: string) => {
      const input = new PassThrough();
      input.end(`${line}\n`);
      return createInterface({ input, crlfDelay: Infinity });
    };
    const exits: number[] = [];
    const notifications: Record<string, unknown>[] = [];
    let ranStdio = false;
    await expect(nativeProcessTestSeam.wrapperMain(encodedPlan, {
      platform: fakeIdentity.platform,
      pid: fakeIdentity.pid,
      exit: (code) => { exits.push(code); },
      onTerm: (listener) => listener(),
      observe: () => ({ type: "ok", value: fakeIdentity }),
      openReader: () => readerFor(JSON.stringify(launch)),
      waitForArm: async () => true,
      runStdio: async () => { ranStdio = true; return 17; },
      destroyInput: () => {},
      notify: async (message) => { notifications.push(message); },
      pin: async () => { throw new Error("pin reached"); },
    })).rejects.toThrow("pin reached");
    expect(exits).toEqual([]);
    expect(ranStdio).toBeTrue();
    expect(JSON.parse(readFileSync(plan.identityPath, "utf-8"))).toMatchObject({
      nativeRunId: plan.nativeRunId,
      process: fakeIdentity,
    });
    expect(notifications).toEqual([expect.objectContaining({
      kind: "provider-terminal",
      nativeRunId: plan.nativeRunId,
      providerExitCode: 17,
    })]);

    await nativeProcessTestSeam.wrapperMain(encodedPlan, {
      platform: "win32",
      exit: (code) => { exits.push(code); },
    });
    await nativeProcessTestSeam.wrapperMain("not-base64-json", {
      platform: fakeIdentity.platform,
      exit: (code) => { exits.push(code); },
      onTerm: () => {},
    });
    await nativeProcessTestSeam.wrapperMain(encodedPlan, {
      platform: fakeIdentity.platform,
      pid: fakeIdentity.pid,
      exit: (code) => { exits.push(code); },
      onTerm: () => {},
      observe: () => observeProcessIdentity(-1),
    });
    await nativeProcessTestSeam.wrapperMain(encodedPlan, {
      platform: fakeIdentity.platform,
      pid: fakeIdentity.pid,
      exit: (code) => { exits.push(code); },
      onTerm: () => {},
      observe: () => ({ type: "ok", value: { ...fakeIdentity, processGroupId: fakeIdentity.pid + 1 } }),
    });
    await nativeProcessTestSeam.wrapperMain(encodedPlan, {
      platform: fakeIdentity.platform,
      pid: fakeIdentity.pid,
      exit: (code) => { exits.push(code); },
      onTerm: () => {},
      observe: () => ({ type: "ok", value: fakeIdentity }),
      openReader: () => readerFor("{}"),
      writeIdentity: () => {},
    });
    await nativeProcessTestSeam.wrapperMain(encodedPlan, {
      platform: fakeIdentity.platform,
      pid: fakeIdentity.pid,
      exit: (code) => { exits.push(code); },
      onTerm: () => {},
      observe: () => ({ type: "ok", value: fakeIdentity }),
      openReader: () => readerFor(JSON.stringify(launch)),
      writeIdentity: () => {},
      waitForArm: async () => false,
    });
    expect(exits).toEqual([125, 125, 125, 125, 126, 126]);

    let ranPty = false;
    const ptyLaunch = {
      ...launch,
      transport: { kind: "pty-interactive" as const, initialInputBase64: "", columns: 80, rows: 24 },
    };
    await expect(nativeProcessTestSeam.wrapperMain(encodedPlan, {
      platform: fakeIdentity.platform,
      pid: fakeIdentity.pid,
      exit: () => {},
      onTerm: () => {},
      observe: () => ({ type: "ok", value: fakeIdentity }),
      openReader: () => readerFor(JSON.stringify(ptyLaunch)),
      writeIdentity: () => {},
      waitForArm: async () => true,
      runPty: async () => { ranPty = true; return 0; },
      destroyInput: () => {},
      notify: async () => {},
      pin: async () => { throw new Error("pty pin reached"); },
    })).rejects.toThrow("pty pin reached");
    expect(ranPty).toBeTrue();
  });

  test("drives guardian session failures without a detached coverage boundary", async () => {
    const dir = root();
    const observed = observeProcessIdentity(process.pid);
    if (observed.type !== "ok") throw new Error("test process identity unavailable");
    let sequence = 0;
    const makeSession = (input: Readonly<{
      transport?: "stdio-json" | "pty-interactive";
      deadlineMs?: number;
      output?: Readonly<{
        publish(nativeRunId: string, frame: NativeProcessOutputFrame): void;
        close(nativeRunId: string): void;
        fail(nativeRunId: string, error: unknown): void;
      }>;
    }> = {}) => {
      sequence += 1;
      const port = createNativeProcessPort({
        rootDir: dir,
        output: { publish: () => {}, close: () => {}, fail: () => {} },
      });
      const plan = port.plan({
        nativeRunId: `run-fake-session-${sequence}`,
        evidenceDir: dir,
        context,
        fencingToken: 60 + sequence,
      });
      const runDirectoryPath = join(dir, dirname(plan.recoveryJournalRelativePath));
      const plannedJournal = recoveryJournal(dir, plan.recoveryJournalRelativePath);
      const ownership = {
        markerPath: join(runDirectoryPath, "owner.json"),
        owner: plannedJournal.owner as ReturnType<
          typeof nativeProcessTestSeam.createOwnedRunDirectory
        >["owner"],
      };
      const armDeadline = new Date(Date.now() + (input.deadlineMs ?? 2_000)).toISOString();
      const wrapperPlan = {
        schemaVersion: 1 as const,
        nativeRunId: plan.nativeRunId,
        identityPath: join(dir, plan.identityRelativePath),
        armPath: join(dir, plan.armRelativePath),
        armDigest: plan.armDigest,
        runEpochDigest: plan.runEpochDigest,
        armDeadline,
      };
      const record = {
        publicPlan: plan,
        wrapperPlan: {
          schemaVersion: 1 as const,
          nativeRunId: plan.nativeRunId,
          identityPath: wrapperPlan.identityPath,
          armPath: wrapperPlan.armPath,
          armDigest: wrapperPlan.armDigest,
          runEpochDigest: wrapperPlan.runEpochDigest,
        },
        runDirectoryPath,
        ownerMarkerPath: ownership.markerPath,
        owner: ownership.owner,
        recoveryJournalPath: join(dir, plan.recoveryJournalRelativePath),
        lifecycle: {
          schemaVersion: 1 as const,
          nativeRunId: plan.nativeRunId,
          armDigest: plan.armDigest,
          runEpochDigest: plan.runEpochDigest,
          owner: ownership.owner,
          state: "spawned" as const,
          updatedAt: new Date().toISOString(),
          armDeadline,
        },
      };
      writeFileSync(record.recoveryJournalPath, `${JSON.stringify(record.lifecycle)}\n`, "utf-8");
      const child = Object.assign(new EventEmitter(), {
        pid: process.pid,
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        send: () => true,
      });
      const transport = input.transport === "pty-interactive"
        ? {
            kind: "pty-interactive" as const,
            initialInput: new Uint8Array(),
            columns: 120 as const,
            rows: 40 as const,
            exitOnSignal: "ready-for-graceful-exit" as const,
            gracefulExitInput: new Uint8Array(),
            controlTimeoutMs: 1_000,
            gracefulExitTimeoutMs: 1_000,
          }
        : { kind: "stdio-json" as const, stdin: "closed" as const, output: "jsonl" as const };
      const launch = {
        executable: process.execPath,
        args: ["-e", "process.exit(0)"],
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" },
        transport,
        timeoutMs: 2_000,
      };
      const output = input.output ?? { publish: () => {}, close: () => {}, fail: () => {} };
      const session = nativeProcessTestSeam.sessionFor(
        child as unknown as Parameters<typeof nativeProcessTestSeam.sessionFor>[0],
        record,
        wrapperPlan,
        launch,
        `${JSON.stringify({ kind: "launch" })}\n`,
        output,
        observed.value.platform,
        10,
        Date.now(),
        () => new Date(),
        () => {},
      );
      return { child, plan, record, session, wrapperPlan, launch };
    };
    const writeIdentity = (
      fixture: ReturnType<typeof makeSession>,
      processIdentity = observed.value,
    ) => writeFileSync(fixture.wrapperPlan.identityPath, `${JSON.stringify({
      schemaVersion: 1,
      nativeRunId: fixture.plan.nativeRunId,
      armDigest: fixture.plan.armDigest,
      runEpochDigest: fixture.plan.runEpochDigest,
      armDeadline: fixture.wrapperPlan.armDeadline,
      process: processIdentity,
    })}\n`, "utf-8");

    const invalidTerminalChild = new EventEmitter();
    const invalidTerminal = nativeProcessTestSeam.observeProviderTerminal(
      invalidTerminalChild as unknown as Parameters<typeof nativeProcessTestSeam.observeProviderTerminal>[0],
      "run-invalid-terminal",
    );
    invalidTerminalChild.emit("message", { kind: "invalid" });
    await expect(invalidTerminal).rejects.toThrow("NATIVE_PROCESS_PROVIDER_TERMINAL_INVALID");
    const exitedChild = new EventEmitter();
    const exitedTerminal = nativeProcessTestSeam.observeProviderTerminal(
      exitedChild as unknown as Parameters<typeof nativeProcessTestSeam.observeProviderTerminal>[0],
      "run-exited-terminal",
    );
    exitedChild.emit("exit", 1);
    await expect(exitedTerminal).rejects.toThrow("NATIVE_PROCESS_GUARDIAN_EXITED");

    const frames: NativeProcessOutputFrame[] = [];
    const outputFailure = makeSession({
      transport: "pty-interactive",
      output: {
        publish: (_nativeRunId, frame) => {
          frames.push(frame);
          throw new Error("publish failed");
        },
        close: () => {},
        fail: () => { throw new Error("fail callback failed"); },
      },
    });
    outputFailure.child.stderr.emit("data", Buffer.from("pty-error"));
    expect(frames).toEqual([expect.objectContaining({
      kind: "diagnostic",
      transport: "pty-interactive",
      channel: "pty",
    })]);

    const closeFailure = makeSession({
      output: {
        publish: () => {},
        close: () => { throw new Error("close failed"); },
        fail: () => {},
      },
    });
    closeFailure.child.emit("close", 0);

    const identityMismatch = makeSession();
    writeIdentity(identityMismatch, { ...observed.value, startTokenHash: "foreign-start" });
    await expect(identityMismatch.session.observeIdentity()).rejects.toThrow("NATIVE_PROCESS_IDENTITY_MISMATCH");

    const missingIdentity = makeSession({ deadlineMs: 20 });
    await expect(missingIdentity.session.observeIdentity()).rejects.toThrow("NATIVE_PROCESS_IDENTITY_TIMEOUT");

    const armConflict = makeSession();
    writeIdentity(armConflict);
    await armConflict.session.observeIdentity();
    writeFileSync(armConflict.wrapperPlan.armPath, "occupied", "utf-8");
    await expect(armConflict.session.arm()).rejects.toThrow("NATIVE_PROCESS_ARM_ALREADY_CONSUMED");
    expect(recoveryJournal(dir, armConflict.plan.recoveryJournalRelativePath)).toMatchObject({ state: "spawned" });

    const terminalMismatch = makeSession();
    writeIdentity(terminalMismatch);
    const terminalIdentity = await terminalMismatch.session.observeIdentity();
    await terminalMismatch.session.arm();
    terminalMismatch.child.emit("message", {
      kind: "provider-terminal",
      schemaVersion: 1,
      nativeRunId: terminalMismatch.plan.nativeRunId,
      guardianIdentityDigest: "wrong-guardian",
      providerExitCode: 0,
    });
    await expect(terminalMismatch.session.waitForTerminal({
      transport: terminalMismatch.launch.transport,
    })).rejects.toThrow("NATIVE_PROCESS_PROVIDER_TERMINAL_INVALID");
    expect(terminalIdentity.processIdentityDigest).toBe(digestValue(observed.value));
  });

  test("fails closed before planning on Windows", () => {
    const port = createNativeProcessPort({
      rootDir: root(),
      output: { publish: () => {}, close: () => {}, fail: () => {} },
      platform: "win32",
    });
    expect(() => port.plan({
      nativeRunId: "run-windows",
      evidenceDir: "/ignored",
      context,
      fencingToken: 1,
    })).toThrow("NATIVE_PROCESS_PLATFORM_UNSUPPORTED");
  });
});
