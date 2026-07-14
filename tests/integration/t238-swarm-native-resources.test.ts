// covers: module:amadeus-swarm-native-resources, requirement:FR-18, requirement:FR-20
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  AdapterResourcePreparation,
  DriverPlan,
  LaunchInput,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts";
import { ProbeResult } from "../../packages/framework/core/tools/amadeus-swarm-driver-contract.ts";
import { digestValue } from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";
import {
  createNativeResourceSupervisor,
  nativeResourceTestSeam,
  type NativeResourceRecoveryTarget,
  type NativeResourceRecoveryOwner,
  type NativeResourceRecoveryObservation,
  type NativeResourceRecoveryObserverPort,
  type NativeResourceSupervisor,
} from "../../packages/framework/core/tools/amadeus-swarm-native-resources.ts";

const roots: string[] = [];

function temporaryRoot(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "amadeus-native-resources-")));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
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
  executionId: "execution-1",
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
  planDigest: "plan-digest",
  attemptNonceHash: "nonce-hash",
});

function launchInput(evidenceDir: string, nativeRunId = "native-run-1"): LaunchInput {
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

function preparation(resources: AdapterResourcePreparation["resources"]): AdapterResourcePreparation {
  return Object.freeze({ resources, preparationDigest: digestValue(resources) });
}

function journalIdentity(path: string, kind: "file" | "directory"): Readonly<{
  dev: string;
  ino: string;
  uid: number;
  mode: number;
  kind: "file" | "directory";
}> {
  const stat = lstatSync(path, { bigint: true });
  return Object.freeze({
    dev: stat.dev.toString(10),
    ino: stat.ino.toString(10),
    uid: Number(stat.uid),
    mode: Number(stat.mode & 0o777n),
    kind,
  });
}

function recoveryOwner(
  nativeRunId: string,
  processIdentityDigest = "pid-42-birth-100-process-digest",
): NativeResourceRecoveryOwner {
  return Object.freeze({
    executionId: driverPlan.executionId,
    attemptId: driverPlan.attemptId,
    attemptNonceHash: driverPlan.attemptNonceHash,
    planDigest: driverPlan.planDigest,
    waveIndex: driverPlan.waves[0].index,
    nativeRunId,
    fencingToken: 7,
    waveDigest: digestValue(driverPlan.waves[0]),
    processIdentityDigest,
  });
}

function resourceRecoveryTarget(
  nativeRunId: string,
  preparationDigest: string,
  processIdentityDigest: string | null = null,
  fencingToken: number | null = processIdentityDigest === null ? null : 7,
): NativeResourceRecoveryTarget {
  return Object.freeze({
    kind: "native-resource-recovery",
    schemaVersion: 1,
    executionId: driverPlan.executionId,
    attemptId: driverPlan.attemptId,
    attemptNonceHash: driverPlan.attemptNonceHash,
    planDigest: driverPlan.planDigest,
    waveIndex: driverPlan.waves[0].index,
    waveDigest: digestValue(driverPlan.waves[0]),
    nativeRunId,
    preparationDigest,
    fencingToken,
    processIdentityDigest,
  });
}

function recoveryObserver(
  observation: Readonly<{
    ownerState?: NativeResourceRecoveryObservation["ownerState"];
    processGroupState?: NativeResourceRecoveryObservation["processGroupState"];
    processIdentityDigest?: string;
  }> = Object.freeze({}),
): NativeResourceRecoveryObserverPort {
  return Object.freeze({
    async observe(owner): Promise<NativeResourceRecoveryObservation> {
      return Object.freeze({
        ownerState: observation.ownerState ?? "dead",
        processIdentityDigest: observation.processIdentityDigest ?? owner.processIdentityDigest,
        processGroupState: observation.processGroupState ?? "stopped",
      });
    },
  });
}

function createTestResourceSupervisor(
  journalRoot: string,
  observation: Parameters<typeof recoveryObserver>[0] = Object.freeze({}),
): NativeResourceSupervisor {
  return createNativeResourceSupervisor({ journalRoot, recoveryObserver: recoveryObserver(observation) });
}

function writePendingJournal(
  journalRoot: string,
  nameCharacter: string,
  pending: Readonly<Record<string, unknown>>,
): void {
  const semantic = Object.freeze({
    schemaVersion: 1 as const,
    nativeRunId: "pending-native-run",
    attemptIdentity: Object.freeze({
      executionId: driverPlan.executionId,
      attemptId: driverPlan.attemptId,
      attemptNonceHash: driverPlan.attemptNonceHash,
      planDigest: driverPlan.planDigest,
      waveIndex: driverPlan.waves[0].index,
      waveDigest: digestValue(driverPlan.waves[0]),
      nativeRunId: "pending-native-run",
    }),
    recoveryOwner: recoveryOwner("pending-native-run"),
    preparationDigest: "preparation-digest",
    receipts: Object.freeze([]),
    cleanupPaths: Object.freeze({}),
    ownerMarkers: Object.freeze({}),
    pending,
  });
  writeFileSync(
    join(journalRoot, `${nameCharacter.repeat(64)}.json`),
    `${JSON.stringify({ ...semantic, journalDigest: digestValue(semantic) })}\n`,
    { mode: 0o600 },
  );
}

function firstJournalPath(journalRoot: string): string {
  const name = readdirSync(journalRoot).find((entry) => entry.endsWith(".json"));
  if (!name) throw new Error("journal fixture missing");
  return join(journalRoot, name);
}

function activeJournalNames(journalRoot: string): readonly string[] {
  return readdirSync(journalRoot).filter((name) => /^[a-f0-9]{64}\.json$/.test(name));
}

function firstCompletedTombstonePath(journalRoot: string): string {
  const name = readdirSync(journalRoot).find((entry) => entry.endsWith(".completed.json"));
  if (!name) throw new Error("completed tombstone fixture missing");
  return join(journalRoot, name);
}

function rewriteJournal(
  journalPath: string,
  mutate: (semantic: Record<string, unknown>) => void,
): void {
  const parsed = JSON.parse(readFileSync(journalPath, "utf-8")) as Record<string, unknown>;
  const { journalDigest: _journalDigest, ...semantic } = structuredClone(parsed);
  mutate(semantic);
  writeFileSync(
    journalPath,
    `${JSON.stringify({ ...semantic, journalDigest: digestValue(semantic) })}\n`,
    { mode: 0o600 },
  );
}

async function materializedOwnedFileFixture(root: string, nativeRunId: string): Promise<Readonly<{
  journalRoot: string;
  journalPath: string;
  ownedFile: string;
  resources: Awaited<ReturnType<NativeResourceSupervisor["materialize"]>>;
  supervisor: NativeResourceSupervisor;
}>> {
  const journalRoot = join(root, "journals");
  const ownedFile = join(root, "owned.json");
  mkdirSync(journalRoot, { mode: 0o700 });
  const plans = Object.freeze([Object.freeze({
    kind: "attempt-owned-file" as const,
    resourceId: "settings",
    path: ownedFile,
    bytes: new TextEncoder().encode("owned"),
    mode: "0600" as const,
  })]);
  const supervisor = createTestResourceSupervisor(journalRoot);
  const resources = await supervisor.materialize(preparation(plans), launchInput(root, nativeRunId));
  return Object.freeze({
    journalRoot,
    journalPath: firstJournalPath(journalRoot),
    ownedFile,
    resources,
    supervisor,
  });
}

type QuarantineCrashState =
  | "intent-before-rename"
  | "intent-after-rename"
  | "moved"
  | "deleting-before-unlink"
  | "deleting-after-unlink";

function writeQuarantineCrashFixture(
  journalRoot: string,
  originalPath: string,
  state: QuarantineCrashState,
): string {
  const journalName = readdirSync(journalRoot).find((name) => name.endsWith(".json"));
  if (!journalName) throw new Error("journal fixture missing");
  const journalPath = join(journalRoot, journalName);
  const parsed = JSON.parse(readFileSync(journalPath, "utf-8")) as Record<string, unknown>;
  const { journalDigest: _journalDigest, ...semantic } = parsed;
  const identity = journalIdentity(originalPath, "file");
  const quarantinePath = join(dirname(originalPath), `.owned.json.amadeus-quarantine-crash-${state}`);
  const persistedState = state.startsWith("intent")
    ? "intent"
    : state === "moved"
      ? "moved"
      : "deleting";
  if (state !== "intent-before-rename") renameSync(originalPath, quarantinePath);
  if (state === "deleting-after-unlink") unlinkSync(quarantinePath);
  const withQuarantine = Object.freeze({
    ...semantic,
    quarantine: Object.freeze({
      schemaVersion: 1 as const,
      resourceId: "settings",
      originalPath,
      quarantinePath,
      state: persistedState,
      expectation: Object.freeze({
        identity,
        contentDigest: createHash("sha256").update("owned").digest("hex"),
        removal: "file" as const,
      }),
    }),
  });
  writeFileSync(
    journalPath,
    `${JSON.stringify({ ...withQuarantine, journalDigest: digestValue(withQuarantine) })}\n`,
    { mode: 0o600 },
  );
  return quarantinePath;
}

function crashInjectedResourceModule(
  root: string,
  crashPoint: "after-link" | "after-mkdir",
): string {
  const sourcePath = resolve(
    import.meta.dir,
    "../../packages/framework/core/tools/amadeus-swarm-native-resources.ts",
  );
  const sourceRoot = dirname(sourcePath);
  const importsRewritten = readFileSync(sourcePath, "utf-8").replace(
    /from "(\.\/[^"\n]+)";/g,
    (_, relativePath: string) => `from ${JSON.stringify(pathToFileURL(resolve(sourceRoot, relativePath)).href)};`,
  );
  const needle = crashPoint === "after-link"
    ? "  linkSync(stagingPath, plan.path);"
    : "    mkdirSync(path, { mode: 0o700 });";
  const injected = importsRewritten.replace(
    needle,
    `${needle}\n    process.kill(process.pid, "SIGSTOP");`,
  );
  if (injected === importsRewritten) throw new Error(`crash point not found: ${crashPoint}`);
  const modulePath = join(root, `resources-${crashPoint}.ts`);
  writeFileSync(modulePath, injected, { mode: 0o600 });
  return pathToFileURL(modulePath).href;
}

function injectCleanupSwap(
  source: string,
  foreignPath: string,
  resourceKind: "file" | "directory" = "file",
): string {
  const fileNeedle = "  quarantineResource(\n    path,\n    receipt.resourceId,";
  const directoryPrefix = "function removeOwnedDirectory(\n  receipt: MaterializedAuxiliaryResource,\n  cleanupPath: string,\n  ownerMarker: string,\n  journal?: QuarantineJournalPort,\n): void {\n  const identity = reservationIsOwned(receipt, cleanupPath, ownerMarker);\n  if (!identity) return;\n";
  const directoryNeedle = `${directoryPrefix}  quarantineResource(`;
  const fileSwap = `  unlinkSync(path);\n  renameSync(${JSON.stringify(foreignPath)}, path);`;
  const directorySwap = `  rmSync(cleanupPath, { recursive: true });\n  renameSync(${JSON.stringify(foreignPath)}, cleanupPath);`;
  const injected = resourceKind === "directory"
    ? source.replace(
        directoryNeedle,
        `${directoryPrefix}${directorySwap}\n  quarantineResource(`,
      )
    : source.replace(fileNeedle, `${fileSwap}\n${fileNeedle}`);
  if (injected === source) throw new Error("owned-file cleanup injection point not found");
  return injected;
}

function swapInjectedResourceModule(
  root: string,
  foreignPath: string,
  resourceKind: "file" | "directory" = "file",
): string {
  const sourcePath = resolve(
    import.meta.dir,
    "../../packages/framework/core/tools/amadeus-swarm-native-resources.ts",
  );
  const sourceRoot = dirname(sourcePath);
  const importsRewritten = readFileSync(sourcePath, "utf-8").replace(
    /from "(\.\/[^"\n]+)";/g,
    (_, relativePath: string) => `from ${JSON.stringify(pathToFileURL(resolve(sourceRoot, relativePath)).href)};`,
  );
  const injected = injectCleanupSwap(importsRewritten, foreignPath, resourceKind);
  const modulePath = join(root, `resources-swap-${resourceKind}-after-inspection.ts`);
  writeFileSync(modulePath, injected, { mode: 0o600 });
  return pathToFileURL(modulePath).href;
}

function precisionSwapInjectedResourceModule(
  root: string,
  foreignPath: string,
  differingField: "dev" | "ino",
  resourceKind: "file" | "directory" = "file",
  injectSwap = true,
): string {
  const sourcePath = resolve(
    import.meta.dir,
    "../../packages/framework/core/tools/amadeus-swarm-native-resources.ts",
  );
  const sourceRoot = dirname(sourcePath);
  let source = readFileSync(sourcePath, "utf-8")
    .replace(
      /from "(\.\/[^"\n]+)";/g,
      (_, relativePath: string) => `from ${JSON.stringify(pathToFileURL(resolve(sourceRoot, relativePath)).href)};`,
    )
    .replace("  fstatSync,", "  fstatSync as realFstatSync,")
    .replace("  lstatSync,", "  lstatSync as realLstatSync,");
  const prelude = `
const amadeusForeignStat = realLstatSync(${JSON.stringify(foreignPath)}, { bigint: true });
function amadeusPrecisionStat(stat: BigIntStats): BigIntStats {
  const foreign = stat.dev === amadeusForeignStat.dev && stat.ino === amadeusForeignStat.ino;
  return new Proxy(stat, {
    get(target, property) {
      if (property === "dev") return ${differingField === "dev" ? "9007199254740992n + (foreign ? 1n : 0n)" : "17n"};
      if (property === "ino") return ${differingField === "ino" ? "9007199254740992n + (foreign ? 1n : 0n)" : "23n"};
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
function lstatSync(path: Parameters<typeof realLstatSync>[0]): BigIntStats {
  return amadeusPrecisionStat(realLstatSync(path, { bigint: true }));
}
function fstatSync(descriptor: number): BigIntStats {
  return amadeusPrecisionStat(realFstatSync(descriptor, { bigint: true }));
}
`;
  source = source.replace("type ResourceIdentity =", `${prelude}\ntype ResourceIdentity =`);
  const injected = injectSwap ? injectCleanupSwap(source, foreignPath, resourceKind) : source;
  const modulePath = join(root, `resources-precision-${differingField}-${resourceKind}.ts`);
  writeFileSync(modulePath, injected, { mode: 0o600 });
  return pathToFileURL(modulePath).href;
}

function pendingContainerFixture(
  root: string,
  kind: "attempt-owned-directory" | "exclusive-reservation",
  cleanupPath: string,
  ownerMarker: string,
  includeTargetIdentity = true,
): Readonly<Record<string, unknown>> {
  const sidecarPath = join(root, ".pending-owner-token");
  const ownerToken = "pending-owner-token\n";
  writeFileSync(sidecarPath, ownerToken, { mode: 0o600 });
  const identity = journalIdentity(cleanupPath, "directory");
  return Object.freeze({
    kind,
    resourceId: "owned-container",
    cleanupPath,
    ownerMarker,
    sidecarPath,
    ownerToken,
    sidecarIdentity: journalIdentity(sidecarPath, "file"),
    ...(includeTargetIdentity ? { identity } : {}),
  });
}

describe("t238 native auxiliary resource supervisor", () => {
  test("rolls back earlier resources atomically when later materialization fails", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const reservation = join(root, "reservation");
    const guarded = join(root, "guarded-team");
    const ownedDirectory = join(root, "owned");
    const first = join(ownedDirectory, "first.json");
    const existing = join(root, "existing.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(existing, "foreign", { mode: 0o600 });
    const plans = Object.freeze([
      Object.freeze({
        kind: "exclusive-reservation" as const,
        resourceId: "reservation",
        candidates: Object.freeze([
          Object.freeze({ reservationPath: reservation, guardedPaths: Object.freeze([guarded]) }),
        ]),
      }),
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "owned-directory",
        path: ownedDirectory,
        mode: "0700" as const,
      }),
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "first",
        path: first,
        bytes: new TextEncoder().encode("first"),
        mode: "0600" as const,
      }),
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "conflict",
        path: existing,
        bytes: new TextEncoder().encode("replacement"),
        mode: "0600" as const,
      }),
    ]);
    const supervisor = createTestResourceSupervisor(journalRoot);

    await expect(supervisor.materialize(preparation(plans), launchInput(join(root, "evidence")))).rejects.toThrow(
      "RESOURCE_MATERIALIZATION_FAILED",
    );

    expect(existsSync(first)).toBeFalse();
    expect(existsSync(ownedDirectory)).toBeFalse();
    expect(existsSync(reservation)).toBeFalse();
    expect(readFileSync(existing, "utf-8")).toBe("foreign");
    expect(activeJournalNames(journalRoot)).toEqual([]);
  });

  test("selects the first free exclusive reservation candidate and rechecks it before arm", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const blockedGuard = join(root, "blocked-team");
    const freeGuard = join(root, "free-team");
    const blockedReservation = join(root, "reservation-0");
    const selectedReservation = join(root, "reservation-1");
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(blockedGuard, { mode: 0o700 });
    const plans = Object.freeze([
      Object.freeze({
        kind: "exclusive-reservation" as const,
        resourceId: "session-prefix",
        candidates: Object.freeze([
          Object.freeze({ reservationPath: blockedReservation, guardedPaths: Object.freeze([blockedGuard]) }),
          Object.freeze({ reservationPath: selectedReservation, guardedPaths: Object.freeze([freeGuard]) }),
        ]),
      }),
    ]);
    const resourcePlan = preparation(plans);
    const supervisor = createTestResourceSupervisor(journalRoot);

    const resources = await supervisor.materialize(resourcePlan, launchInput(join(root, "evidence")));
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("native-run-1"));

    expect(resources.resources).toHaveLength(1);
    expect(resources.resources[0]).toMatchObject({
      kind: "exclusive-reservation",
      resourceId: "session-prefix",
      selectedCandidateIndex: 1,
      resolvedPaths: [freeGuard],
    });
    expect(existsSync(blockedReservation)).toBeFalse();
    expect(existsSync(selectedReservation)).toBeTrue();
    await expect(supervisor.verifyForArm(resourcePlan, resources)).resolves.toBeUndefined();
    mkdirSync(freeGuard, { mode: 0o700 });
    await expect(supervisor.verifyForArm(resourcePlan, resources)).rejects.toThrow(
      "RESOURCE_ARM_VERIFICATION_FAILED",
    );
    await supervisor.cleanup(resources);
    expect(existsSync(selectedReservation)).toBeFalse();
    expect(existsSync(freeGuard)).toBeTrue();
    await expect(supervisor.cleanup(resources)).resolves.toBeUndefined();
  });

  test("replays an exact cleanup receipt after ordinary cleanup and restart", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const nativeRunId = "ordinary-cleanup-replay";
    mkdirSync(journalRoot, { mode: 0o700 });
    const resourcePlan = preparation(Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]));
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(resourcePlan, launchInput(root, nativeRunId));
    const owner = recoveryOwner(nativeRunId);
    await supervisor.bindRecoveryOwner(resources, owner);
    const target = resourceRecoveryTarget(
      nativeRunId,
      resourcePlan.preparationDigest,
      owner.processIdentityDigest,
      owner.fencingToken,
    );

    await supervisor.cleanup(resources);
    const restarted = createTestResourceSupervisor(journalRoot);
    const first = await restarted.recoverAttempt(target);
    const replayed = await restarted.recoverAttempt(target);

    expect(first).toMatchObject({
      status: "cleaned",
      receipt: {
        kind: "native-resource-cleanup-receipt",
        schemaVersion: 1,
        targetDigest: digestValue(target),
        nativeRunId,
        resourceReceiptDigest: resources.receiptDigest,
        disposition: "cleaned",
      },
    });
    expect(replayed).toEqual(first);
    expect(existsSync(ownedFile)).toBeFalse();
  });

  test("publishes an exact cleanup receipt during recovery sweep", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const nativeRunId = "sweep-cleanup-replay";
    mkdirSync(journalRoot, { mode: 0o700 });
    const resourcePlan = preparation(Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]));
    const first = createTestResourceSupervisor(journalRoot);
    const resources = await first.materialize(resourcePlan, launchInput(root, nativeRunId));
    const owner = recoveryOwner(nativeRunId);
    await first.bindRecoveryOwner(resources, owner);
    const target = resourceRecoveryTarget(
      nativeRunId,
      resourcePlan.preparationDigest,
      owner.processIdentityDigest,
      owner.fencingToken,
    );
    const restarted = createTestResourceSupervisor(journalRoot);

    await expect(restarted.recover()).resolves.toEqual({ recovered: 1, retained: 0 });
    await expect(restarted.recoverAttempt(target)).resolves.toMatchObject({
      status: "cleaned",
      receipt: { resourceReceiptDigest: resources.receiptDigest },
    });
  });

  for (const corruption of ["tampered", "symlink", "mode"] as const) {
    test(`fails closed for a ${corruption} exact cleanup tombstone`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const ownedFile = join(root, "owned.json");
      const nativeRunId = `cleanup-tombstone-${corruption}`;
      mkdirSync(journalRoot, { mode: 0o700 });
      const resourcePlan = preparation(Object.freeze([Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("owned"),
        mode: "0600" as const,
      })]));
      const supervisor = createTestResourceSupervisor(journalRoot);
      const resources = await supervisor.materialize(resourcePlan, launchInput(root, nativeRunId));
      const owner = recoveryOwner(nativeRunId);
      await supervisor.bindRecoveryOwner(resources, owner);
      const target = resourceRecoveryTarget(
        nativeRunId,
        resourcePlan.preparationDigest,
        owner.processIdentityDigest,
        owner.fencingToken,
      );
      await supervisor.cleanup(resources);
      const tombstonePath = firstCompletedTombstonePath(journalRoot);

      if (corruption === "tampered") {
        const tombstone = JSON.parse(readFileSync(tombstonePath, "utf-8")) as Record<string, unknown>;
        (tombstone.receipt as Record<string, unknown>).cleanupScopeDigest = "tampered";
        writeFileSync(tombstonePath, `${JSON.stringify(tombstone)}\n`, { mode: 0o600 });
      } else if (corruption === "symlink") {
        const foreign = join(root, "foreign-tombstone.json");
        writeFileSync(foreign, readFileSync(tombstonePath), { mode: 0o600 });
        unlinkSync(tombstonePath);
        symlinkSync(foreign, tombstonePath);
      } else {
        chmodSync(tombstonePath, 0o644);
      }

      await expect(createTestResourceSupervisor(journalRoot).recoverAttempt(target)).resolves.toEqual({
        status: "unknown",
      });
      expect(existsSync(tombstonePath)).toBeTrue();
    });
  }

  test("retains a foreign inode during exact resource recovery", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const foreignFile = join(root, "foreign.json");
    const nativeRunId = "exact-cleanup-foreign-inode";
    mkdirSync(journalRoot, { mode: 0o700 });
    const resourcePlan = preparation(Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]));
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(resourcePlan, launchInput(root, nativeRunId));
    const owner = recoveryOwner(nativeRunId);
    await supervisor.bindRecoveryOwner(resources, owner);
    writeFileSync(foreignFile, "owned", { mode: 0o600 });
    unlinkSync(ownedFile);
    renameSync(foreignFile, ownedFile);
    const target = resourceRecoveryTarget(
      nativeRunId,
      resourcePlan.preparationDigest,
      owner.processIdentityDigest,
      owner.fencingToken,
    );

    await expect(supervisor.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    expect(readFileSync(ownedFile, "utf-8")).toBe("owned");
    expect(activeJournalNames(journalRoot)).toHaveLength(1);
    expect(readdirSync(journalRoot).filter((name) => name.endsWith(".completed.json"))).toEqual([]);
  });

  test("distinguishes an absent exact resource journal from unknown recovery state", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    mkdirSync(journalRoot, { mode: 0o700 });
    const target = resourceRecoveryTarget("absent-run", "preparation-digest", null, 7);

    await expect(createTestResourceSupervisor(journalRoot).recoverAttempt(target)).resolves.toEqual({
      status: "absent",
    });
  });

  test("rejects an exact recovery target bound to another resource owner", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const nativeRunId = "exact-owner-binding";
    mkdirSync(journalRoot, { mode: 0o700 });
    const resourcePlan = preparation(Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]));
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(resourcePlan, launchInput(root, nativeRunId));
    const owner = recoveryOwner(nativeRunId);
    await supervisor.bindRecoveryOwner(resources, owner);

    for (const target of [
      resourceRecoveryTarget(nativeRunId, resourcePlan.preparationDigest, owner.processIdentityDigest, 8),
      resourceRecoveryTarget(nativeRunId, resourcePlan.preparationDigest, "other-process", 7),
    ]) {
      await expect(supervisor.recoverAttempt(target)).resolves.toEqual({ status: "unknown" });
    }
    expect(readFileSync(ownedFile, "utf-8")).toBe("owned");
    expect(activeJournalNames(journalRoot)).toHaveLength(1);
  });

  for (const recoveryCase of [
    Object.freeze({ ownerState: "live" as const, processGroupState: "live" as const, cleaned: false }),
    Object.freeze({ ownerState: "dead" as const, processGroupState: "live" as const, cleaned: false }),
    Object.freeze({ ownerState: "dead" as const, processGroupState: "stopped" as const, cleaned: true }),
  ]) {
    test(`exact recovery requires a stopped bound process: ${recoveryCase.ownerState}/${recoveryCase.processGroupState}`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const ownedFile = join(root, "owned.json");
      const nativeRunId = `exact-observation-${recoveryCase.ownerState}-${recoveryCase.processGroupState}`;
      mkdirSync(journalRoot, { mode: 0o700 });
      const resourcePlan = preparation(Object.freeze([Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("owned"),
        mode: "0600" as const,
      })]));
      const supervisor = createTestResourceSupervisor(journalRoot, recoveryCase);
      const resources = await supervisor.materialize(resourcePlan, launchInput(root, nativeRunId));
      const owner = recoveryOwner(nativeRunId);
      await supervisor.bindRecoveryOwner(resources, owner);
      const target = resourceRecoveryTarget(
        nativeRunId,
        resourcePlan.preparationDigest,
        owner.processIdentityDigest,
        owner.fencingToken,
      );

      const result = await supervisor.recoverAttempt(target);

      expect(result.status).toBe(recoveryCase.cleaned ? "cleaned" : "unknown");
      expect(existsSync(ownedFile)).toBe(!recoveryCase.cleaned);
      expect(activeJournalNames(journalRoot)).toHaveLength(recoveryCase.cleaned ? 0 : 1);
    });
  }

  for (const crashAfter of [
    "cleanup-complete",
    "tombstone-published",
    "journal-unlinked",
  ] as const) {
    test(`replays exact cleanup after a crash at ${crashAfter}`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const ownedFile = join(root, "owned.json");
      const nativeRunId = `exact-crash-${crashAfter}`;
      mkdirSync(journalRoot, { mode: 0o700 });
      const resourcePlan = preparation(Object.freeze([Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("owned"),
        mode: "0600" as const,
      })]));
      const supervisor = nativeResourceTestSeam.createCrashInjected({ journalRoot, crashAfter });
      const resources = await supervisor.materialize(resourcePlan, launchInput(root, nativeRunId));
      const target = resourceRecoveryTarget(nativeRunId, resourcePlan.preparationDigest);

      await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_CLEANUP_TEST_CRASH");
      const recovered = await createTestResourceSupervisor(journalRoot).recoverAttempt(target);

      expect(recovered.status).toBe("cleaned");
      expect(existsSync(ownedFile)).toBeFalse();
      expect(activeJournalNames(journalRoot)).toEqual([]);
    });
  }

  test("materializes owned directories and files while binding a pre-arm baseline", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedDirectory = join(root, "evidence");
    const ownedFile = join(ownedDirectory, "settings.json");
    const baseline = join(root, "provider-state.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(baseline, "before", { mode: 0o600 });
    const plans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "evidence",
        path: ownedDirectory,
        mode: "0700" as const,
      }),
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode('{"hooks":[]}'),
        mode: "0600" as const,
      }),
      Object.freeze({
        kind: "pre-arm-baseline" as const,
        resourceId: "provider-baseline",
        exactPaths: Object.freeze([baseline]),
        allowAbsent: false,
      }),
    ]);
    const resourcePlan = preparation(plans);
    const supervisor = createTestResourceSupervisor(journalRoot);

    const resources = await supervisor.materialize(resourcePlan, launchInput(ownedDirectory));
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("native-run-1"));

    expect(readFileSync(ownedFile, "utf-8")).toBe('{"hooks":[]}');
    expect(resources.resources.map(({ kind }) => kind)).toEqual([
      "attempt-owned-directory",
      "attempt-owned-file",
      "pre-arm-baseline",
    ]);
    await expect(supervisor.verifyForArm(resourcePlan, resources)).resolves.toBeUndefined();
    writeFileSync(baseline, "after", { mode: 0o600 });
    await expect(supervisor.verifyForArm(resourcePlan, resources)).rejects.toThrow(
      "RESOURCE_ARM_VERIFICATION_FAILED",
    );
    await supervisor.cleanup(resources);
    expect(existsSync(ownedFile)).toBeFalse();
    expect(existsSync(ownedDirectory)).toBeFalse();
    expect(readFileSync(baseline, "utf-8")).toBe("after");
  });

  test("does not delete a symlink that replaced an attempt-owned file", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const foreignFile = join(root, "foreign.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(foreignFile, "foreign", { mode: 0o600 });
    const plans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("owned"),
        mode: "0600" as const,
      }),
    ]);
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(preparation(plans), launchInput(join(root, "evidence")));
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("native-run-1"));
    unlinkSync(ownedFile);
    symlinkSync(foreignFile, ownedFile);

    await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_OWNER_INVALID");

    expect(lstatSync(ownedFile).isSymbolicLink()).toBeTrue();
    expect(readFileSync(foreignFile, "utf-8")).toBe("foreign");
    expect(await supervisor.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(lstatSync(ownedFile).isSymbolicLink()).toBeTrue();
  });

  test("does not delete a same-content file with a foreign inode", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const foreignFile = join(root, "foreign.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(foreignFile, "same-content", { mode: 0o600 });
    const plans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("same-content"),
        mode: "0600" as const,
      }),
    ]);
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(preparation(plans), launchInput(join(root, "evidence")));
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("native-run-1"));
    const originalInode = lstatSync(ownedFile).ino;
    unlinkSync(ownedFile);
    linkSync(foreignFile, ownedFile);

    expect(lstatSync(ownedFile).ino).not.toBe(originalInode);
    expect(lstatSync(ownedFile).ino).toBe(lstatSync(foreignFile).ino);
    await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_OWNER_INVALID");
    expect(readFileSync(ownedFile, "utf-8")).toBe("same-content");
  });

  test("quarantines and preserves a foreign inode swapped in after inspection", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const foreignFile = join(root, "foreign.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    const injectedModule = await import(swapInjectedResourceModule(root, foreignFile));
    const plans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("owned"),
        mode: "0600" as const,
      }),
    ]);
    const supervisor = injectedModule.createNativeResourceSupervisor({
      journalRoot,
      recoveryObserver: recoveryObserver(),
    });
    const resources = await supervisor.materialize(preparation(plans), launchInput(root));
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("native-run-1"));
    writeFileSync(foreignFile, "foreign", { mode: 0o600 });

    await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_OWNER_INVALID");

    const quarantined = readdirSync(root).find((name) =>
      name.startsWith(".owned.json.amadeus-quarantine-")
    );
    expect(quarantined).toBeDefined();
    expect(readFileSync(join(root, quarantined!), "utf-8")).toBe("foreign");
    const journalPath = join(journalRoot, readdirSync(journalRoot)[0]!);
    const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as {
      quarantine: { expectation: { identity: { dev: unknown; ino: unknown } } };
    };
    expect(journal.quarantine.expectation.identity.dev).toMatch(/^\d+$/);
    expect(journal.quarantine.expectation.identity.ino).toMatch(/^\d+$/);
  });

  for (const differingField of ["ino", "dev"] as const) {
    test(`preserves a same-content foreign file when bigint ${differingField} differs above 2^53`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const ownedFile = join(root, "owned.json");
      const foreignFile = join(root, "foreign.json");
      mkdirSync(journalRoot, { mode: 0o700 });
      writeFileSync(foreignFile, "same-content", { mode: 0o600 });
      const injectedModule = await import(
        precisionSwapInjectedResourceModule(root, foreignFile, differingField)
      );
      const plans = Object.freeze([Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("same-content"),
        mode: "0600" as const,
      })]);
      const supervisor = injectedModule.createNativeResourceSupervisor({
        journalRoot,
        recoveryObserver: recoveryObserver(),
      });
      const resources = await supervisor.materialize(preparation(plans), launchInput(root));
      await supervisor.bindRecoveryOwner(resources, recoveryOwner("native-run-1"));

      await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_OWNER_INVALID");

      const quarantineName = readdirSync(root).find((name) =>
        name.startsWith(".owned.json.amadeus-quarantine-")
      );
      expect(quarantineName).toBeDefined();
      expect(readFileSync(join(root, quarantineName!), "utf-8")).toBe("same-content");
      const journalPath = join(journalRoot, readdirSync(journalRoot)[0]!);
      const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as {
        quarantine: { expectation: { identity: Record<"dev" | "ino", string> } };
      };
      expect(journal.quarantine.expectation.identity[differingField]).toBe("9007199254740992");
      const restarted = injectedModule.createNativeResourceSupervisor({
        journalRoot,
        recoveryObserver: recoveryObserver(),
      });
      expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
      expect(readFileSync(join(root, quarantineName!), "utf-8")).toBe("same-content");
      expect(readdirSync(journalRoot)).toHaveLength(1);
    });
  }

  test("cleans a resource whose exact bigint inode is above 2^53", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const unrelatedFile = join(root, "unrelated.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(unrelatedFile, "unrelated", { mode: 0o600 });
    const injectedModule = await import(
      precisionSwapInjectedResourceModule(root, unrelatedFile, "ino", "file", false)
    );
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const supervisor = injectedModule.createNativeResourceSupervisor({ journalRoot });
    const resources = await supervisor.materialize(preparation(plans), launchInput(root));

    await expect(supervisor.cleanup(resources)).resolves.toBeUndefined();
    expect(existsSync(ownedFile)).toBeFalse();
    expect(readFileSync(unrelatedFile, "utf-8")).toBe("unrelated");
    expect(activeJournalNames(journalRoot)).toEqual([]);
  });

  test("quarantines and preserves a foreign directory swapped in after inspection", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedDirectory = join(root, "owned-directory");
    const foreignDirectory = join(root, "foreign-directory");
    mkdirSync(journalRoot, { mode: 0o700 });
    const injectedModule = await import(
      swapInjectedResourceModule(root, foreignDirectory, "directory")
    );
    const plans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "evidence",
        path: ownedDirectory,
        mode: "0700" as const,
      }),
    ]);
    const supervisor = injectedModule.createNativeResourceSupervisor({
      journalRoot,
      recoveryObserver: recoveryObserver(),
    });
    const resources = await supervisor.materialize(preparation(plans), launchInput(root));
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("native-run-1"));
    mkdirSync(foreignDirectory, { mode: 0o700 });
    writeFileSync(join(foreignDirectory, "sentinel"), "foreign", { mode: 0o600 });

    await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_OWNER_INVALID");

    const quarantined = readdirSync(root).find((name) =>
      name.startsWith(".owned-directory.amadeus-quarantine-")
    );
    expect(quarantined).toBeDefined();
    expect(readFileSync(join(root, quarantined!, "sentinel"), "utf-8")).toBe("foreign");
  });

  test("preserves a same-marker foreign directory when bigint inode differs above 2^53", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedDirectory = join(root, "owned-directory");
    const foreignDirectory = join(root, "foreign-directory");
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(foreignDirectory, { mode: 0o700 });
    writeFileSync(join(foreignDirectory, ".amadeus-owner.json"), "placeholder\n", { mode: 0o600 });
    const injectedModule = await import(
      precisionSwapInjectedResourceModule(root, foreignDirectory, "ino", "directory")
    );
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-directory" as const,
      resourceId: "evidence",
      path: ownedDirectory,
      mode: "0700" as const,
    })]);
    const supervisor = injectedModule.createNativeResourceSupervisor({
      journalRoot,
      recoveryObserver: recoveryObserver(),
    });
    const resources = await supervisor.materialize(preparation(plans), launchInput(root));
    const ownerMarker = readFileSync(join(ownedDirectory, ".amadeus-owner.json"), "utf-8");
    writeFileSync(join(foreignDirectory, ".amadeus-owner.json"), ownerMarker, { mode: 0o600 });
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("native-run-1"));

    await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_OWNER_INVALID");

    const quarantineName = readdirSync(root).find((name) =>
      name.startsWith(".owned-directory.amadeus-quarantine-")
    );
    expect(quarantineName).toBeDefined();
    expect(readFileSync(join(root, quarantineName!, ".amadeus-owner.json"), "utf-8")).toBe(ownerMarker);
    expect(readdirSync(journalRoot)).toHaveLength(1);
  });

  test("retains active owned resources without a bound recovery owner", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedDirectory = join(root, "evidence");
    const ownedFile = join(ownedDirectory, "settings.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-directory" as const,
        resourceId: "evidence",
        path: ownedDirectory,
        mode: "0700" as const,
      }),
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("settings"),
        mode: "0600" as const,
      }),
    ]);
    const first = createTestResourceSupervisor(journalRoot);
    await first.materialize(preparation(plans), launchInput(ownedDirectory));

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(ownedFile, "utf-8")).toBe("settings");
    expect(existsSync(ownedDirectory)).toBeTrue();
    expect(readdirSync(journalRoot)).toHaveLength(1);
  });

  test("cleans an unbound managed resource through the exact active instance capability", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const supervisor = createTestResourceSupervisor(journalRoot, {
      ownerState: "live",
      processGroupState: "live",
    });
    const resources = await supervisor.materialize(preparation(plans), launchInput(root));

    await expect(supervisor.cleanup(resources)).resolves.toBeUndefined();
    expect(existsSync(ownedFile)).toBeFalse();
    expect(activeJournalNames(journalRoot)).toEqual([]);
  });

  for (const recoveryCase of [
    Object.freeze({ ownerState: "live" as const, processGroupState: "live" as const, recovered: false }),
    Object.freeze({ ownerState: "dead" as const, processGroupState: "live" as const, recovered: false }),
    Object.freeze({ ownerState: "dead" as const, processGroupState: "stopped" as const, recovered: true }),
  ]) {
    test(`requires dead owner and stopped group: ${recoveryCase.ownerState}/${recoveryCase.processGroupState}`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const ownedFile = join(root, "owned.json");
      const nativeRunId = `observation-${recoveryCase.ownerState}-${recoveryCase.processGroupState}`;
      mkdirSync(journalRoot, { mode: 0o700 });
      const plans = Object.freeze([
        Object.freeze({
          kind: "attempt-owned-file" as const,
          resourceId: "settings",
          path: ownedFile,
          bytes: new TextEncoder().encode("owned"),
          mode: "0600" as const,
        }),
      ]);
      const owner = recoveryOwner(nativeRunId);
      const first = createTestResourceSupervisor(journalRoot);
      const resources = await first.materialize(preparation(plans), launchInput(root, nativeRunId));
      await first.bindRecoveryOwner(resources, owner);
      const restarted = createTestResourceSupervisor(journalRoot, {
        ownerState: recoveryCase.ownerState,
        processGroupState: recoveryCase.processGroupState,
      });
      expect(await restarted.recover()).toEqual(
        recoveryCase.recovered ? { recovered: 1, retained: 0 } : { recovered: 0, retained: 1 },
      );
      expect(existsSync(ownedFile)).toBe(!recoveryCase.recovered);
      expect(activeJournalNames(journalRoot)).toHaveLength(recoveryCase.recovered ? 0 : 1);
    });
  }

  for (const activeCase of [
    Object.freeze({ ownerState: "live" as const, processGroupState: "live" as const }),
    Object.freeze({ ownerState: "dead" as const, processGroupState: "live" as const }),
  ]) {
    test(`cleanup retains resources while supervised ownership is ${activeCase.ownerState}/${activeCase.processGroupState}`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const ownedFile = join(root, "owned.json");
      const nativeRunId = `cleanup-${activeCase.ownerState}-${activeCase.processGroupState}`;
      mkdirSync(journalRoot, { mode: 0o700 });
      const plans = Object.freeze([Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("owned"),
        mode: "0600" as const,
      })]);
      const supervisor = createTestResourceSupervisor(journalRoot, activeCase);
      const resources = await supervisor.materialize(preparation(plans), launchInput(root, nativeRunId));
      await supervisor.bindRecoveryOwner(resources, recoveryOwner(nativeRunId));

      await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_PROCESS_ACTIVE");
      expect(readFileSync(ownedFile, "utf-8")).toBe("owned");
      expect(readdirSync(journalRoot)).toHaveLength(1);
    });
  }

  for (const crashState of [
    "intent-before-rename",
    "intent-after-rename",
    "moved",
    "deleting-before-unlink",
    "deleting-after-unlink",
  ] as const) {
    test(`rolls a durable quarantine ${crashState} state forward after restart`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const ownedFile = join(root, "owned.json");
      const nativeRunId = `quarantine-${crashState}`;
      mkdirSync(journalRoot, { mode: 0o700 });
      const plans = Object.freeze([Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("owned"),
        mode: "0600" as const,
      })]);
      const first = createTestResourceSupervisor(journalRoot);
      const resources = await first.materialize(preparation(plans), launchInput(root, nativeRunId));
      await first.bindRecoveryOwner(resources, recoveryOwner(nativeRunId));
      const quarantinePath = writeQuarantineCrashFixture(journalRoot, ownedFile, crashState);

      const restarted = createTestResourceSupervisor(journalRoot);
      expect(await restarted.recover()).toEqual({ recovered: 1, retained: 0 });
      expect(existsSync(ownedFile)).toBeFalse();
      expect(existsSync(quarantinePath)).toBeFalse();
      expect(activeJournalNames(journalRoot)).toEqual([]);
    });
  }

  test("retains resources when the observer reports a reused process identity", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const nativeRunId = "observation-reused-pid";
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "settings",
        path: ownedFile,
        bytes: new TextEncoder().encode("owned"),
        mode: "0600" as const,
      }),
    ]);
    const owner = recoveryOwner(nativeRunId);
    const first = createTestResourceSupervisor(journalRoot);
    const resources = await first.materialize(preparation(plans), launchInput(root, nativeRunId));
    await first.bindRecoveryOwner(resources, owner);
    const restarted = createTestResourceSupervisor(journalRoot, {
      processIdentityDigest: "pid-42-birth-999-process-digest",
    });
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(ownedFile, "utf-8")).toBe("owned");
  });

  test("treats an exact recovery owner rebind as an idempotent no-op", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const nativeRunId = "rebind-identical-owner";
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const owner = recoveryOwner(nativeRunId);
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(preparation(plans), launchInput(root, nativeRunId));
    await supervisor.bindRecoveryOwner(resources, owner);
    const journalPath = join(journalRoot, readdirSync(journalRoot)[0]!);
    const before = lstatSync(journalPath);

    await expect(supervisor.bindRecoveryOwner(resources, owner)).resolves.toBeUndefined();

    const after = lstatSync(journalPath);
    expect({ dev: after.dev, ino: after.ino, mtimeMs: after.mtimeMs }).toEqual({
      dev: before.dev,
      ino: before.ino,
      mtimeMs: before.mtimeMs,
    });
  });

  test("rejects a recovery owner rebind with a different process identity digest", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const nativeRunId = "rebind-different-process";
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const ownerA = recoveryOwner(nativeRunId);
    const ownerB = Object.freeze({ ...ownerA, processIdentityDigest: "different-process-digest" });
    const observer: NativeResourceRecoveryObserverPort = Object.freeze({
      async observe(owner): Promise<NativeResourceRecoveryObservation> {
        const ownerAIsStillBound = owner.processIdentityDigest === ownerA.processIdentityDigest;
        return Object.freeze({
          ownerState: ownerAIsStillBound ? "live" : "dead",
          processIdentityDigest: owner.processIdentityDigest,
          processGroupState: ownerAIsStillBound ? "live" : "stopped",
        });
      },
    });
    const supervisor = createNativeResourceSupervisor({ journalRoot, recoveryObserver: observer });
    const resources = await supervisor.materialize(preparation(plans), launchInput(root, nativeRunId));
    await supervisor.bindRecoveryOwner(resources, ownerA);

    await expect(supervisor.bindRecoveryOwner(resources, ownerB)).rejects.toThrow(
      "RESOURCE_RECOVERY_OWNER_CONFLICT",
    );
    await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_PROCESS_ACTIVE");

    const journalPath = join(journalRoot, readdirSync(journalRoot)[0]!);
    const durable = JSON.parse(readFileSync(journalPath, "utf-8")) as Record<string, unknown>;
    expect(durable.recoveryOwner).toEqual(ownerA);
    const restarted = createNativeResourceSupervisor({ journalRoot, recoveryObserver: observer });
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(ownedFile, "utf-8")).toBe("owned");
  });

  test("rejects a recovery owner rebind with a different fencing token", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const nativeRunId = "rebind-different-fence";
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const ownerA = recoveryOwner(nativeRunId);
    const ownerB = Object.freeze({ ...ownerA, fencingToken: ownerA.fencingToken + 1 });
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(preparation(plans), launchInput(root, nativeRunId));
    await supervisor.bindRecoveryOwner(resources, ownerA);

    await expect(supervisor.bindRecoveryOwner(resources, ownerB)).rejects.toThrow(
      "RESOURCE_RECOVERY_OWNER_CONFLICT",
    );
    const journalPath = join(journalRoot, readdirSync(journalRoot)[0]!);
    const durable = JSON.parse(readFileSync(journalPath, "utf-8")) as Record<string, unknown>;
    expect(durable.recoveryOwner).toEqual(ownerA);
  });

  test("reports a bound attempt identity change as a recovery owner conflict", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const nativeRunId = "rebind-different-attempt";
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: join(root, "owned.json"),
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const ownerA = recoveryOwner(nativeRunId);
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(preparation(plans), launchInput(root, nativeRunId));
    await supervisor.bindRecoveryOwner(resources, ownerA);

    await expect(supervisor.bindRecoveryOwner(
      resources,
      Object.freeze({ ...ownerA, waveDigest: "different-wave-digest" }),
    )).rejects.toThrow("RESOURCE_RECOVERY_OWNER_CONFLICT");
  });

  test("rejects an initial recovery owner with fencing token zero", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const nativeRunId = "invalid-zero-fence";
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(preparation(plans), launchInput(root, nativeRunId));

    await expect(supervisor.bindRecoveryOwner(
      resources,
      Object.freeze({ ...recoveryOwner(nativeRunId), fencingToken: 0 }),
    )).rejects.toThrow("RESOURCE_JOURNAL_INVALID");
    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(ownedFile, "utf-8")).toBe("owned");
  });

  test("tracks identical baseline receipts by exact materialization instance", async () => {
    for (const cleanupOrder of [[0, 1], [1, 0]] as const) {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const baseline = join(root, "provider-state.json");
      mkdirSync(journalRoot, { mode: 0o700 });
      writeFileSync(baseline, "before", { mode: 0o600 });
      const resourcePlan = preparation(Object.freeze([
        Object.freeze({
          kind: "pre-arm-baseline" as const,
          resourceId: "provider-baseline",
          exactPaths: Object.freeze([baseline]),
          allowAbsent: false,
        }),
      ]));
      const supervisor = createTestResourceSupervisor(journalRoot);
      const materialized = await Promise.all([
        supervisor.materialize(resourcePlan, launchInput(join(root, "evidence-a"), "native-run-a")),
        supervisor.materialize(resourcePlan, launchInput(join(root, "evidence-b"), "native-run-b")),
      ]);
      expect(materialized[0].receiptDigest).toBe(materialized[1].receiptDigest);

      await supervisor.cleanup(materialized[cleanupOrder[0]]);
      await supervisor.cleanup(materialized[cleanupOrder[1]]);
      expect(activeJournalNames(journalRoot)).toEqual([]);

      const third = await supervisor.materialize(
        resourcePlan,
        launchInput(join(root, "evidence-c"), "native-run-c"),
      );
      expect(third.receiptDigest).toBe(materialized[0].receiptDigest);
      await supervisor.cleanup(third);
      expect(activeJournalNames(journalRoot)).toEqual([]);
    }
  });

  test("retains an unbound owned file when killed after hard-link", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    const childScript = join(root, "materialize.ts");
    mkdirSync(journalRoot, { mode: 0o700 });
    const resourceModule = crashInjectedResourceModule(root, "after-link");
    const lifecycleModule = pathToFileURL(
      resolve(import.meta.dir, "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts"),
    ).href;
    writeFileSync(
      childScript,
      `
import { createNativeResourceSupervisor } from ${JSON.stringify(resourceModule)};
import { digestValue } from ${JSON.stringify(lifecycleModule)};
const resources = Object.freeze([Object.freeze({
  kind: "attempt-owned-file",
  resourceId: "settings",
  path: ${JSON.stringify(ownedFile)},
  bytes: new TextEncoder().encode("owned"),
  mode: "0600",
})]);
const supervisor = createNativeResourceSupervisor({ journalRoot: ${JSON.stringify(journalRoot)} });
await supervisor.materialize(Object.freeze({ resources, preparationDigest: digestValue(resources) }), Object.freeze({
  plan: Object.freeze(${JSON.stringify(driverPlan)}),
  wave: Object.freeze(${JSON.stringify(driverPlan.waves[0])}),
  preparedUnits: Object.freeze([]),
  convergenceCommand: "bun test",
  evidenceDir: ${JSON.stringify(root)},
  nativeRunId: "killed-native-run",
}));
`,
      { mode: 0o600 },
    );
    const child = Bun.spawn([process.execPath, childScript], {
      stdout: "ignore",
      stderr: "pipe",
    });
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && child.exitCode === null && !existsSync(ownedFile)) {
      await Bun.sleep(1);
    }
    if (!existsSync(ownedFile)) {
      child.kill("SIGKILL");
      await child.exited;
      throw new Error(`child did not reach hard-link: ${await new Response(child.stderr).text()}`);
    }
    child.kill("SIGKILL");
    await child.exited;

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(existsSync(ownedFile)).toBeTrue();
    expect(readdirSync(journalRoot)).toHaveLength(1);
  }, 20_000);

  test("retains an unbound owned directory when killed immediately after mkdir", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedDirectory = join(root, "owned-directory");
    const childScript = join(root, "materialize-directory.ts");
    mkdirSync(journalRoot, { mode: 0o700 });
    const resourceModule = crashInjectedResourceModule(root, "after-mkdir");
    const lifecycleModule = pathToFileURL(
      resolve(import.meta.dir, "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts"),
    ).href;
    writeFileSync(
      childScript,
      `
import { createNativeResourceSupervisor } from ${JSON.stringify(resourceModule)};
import { digestValue } from ${JSON.stringify(lifecycleModule)};
const resources = Object.freeze([Object.freeze({
  kind: "attempt-owned-directory",
  resourceId: "evidence",
  path: ${JSON.stringify(ownedDirectory)},
  mode: "0700",
})]);
const supervisor = createNativeResourceSupervisor({ journalRoot: ${JSON.stringify(journalRoot)} });
await supervisor.materialize(Object.freeze({ resources, preparationDigest: digestValue(resources) }), Object.freeze({
  plan: Object.freeze(${JSON.stringify(driverPlan)}),
  wave: Object.freeze(${JSON.stringify(driverPlan.waves[0])}),
  preparedUnits: Object.freeze([]),
  convergenceCommand: "bun test",
  evidenceDir: ${JSON.stringify(root)},
  nativeRunId: "killed-directory-run",
}));
`,
      { mode: 0o600 },
    );
    const child = Bun.spawn([process.execPath, childScript], {
      stdout: "ignore",
      stderr: "pipe",
    });
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && child.exitCode === null && !existsSync(ownedDirectory)) {
      await Bun.sleep(1);
    }
    if (!existsSync(ownedDirectory)) {
      child.kill("SIGKILL");
      await child.exited;
      throw new Error(`child did not reach mkdir: ${await new Response(child.stderr).text()}`);
    }
    child.kill("SIGKILL");
    await child.exited;

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(existsSync(ownedDirectory)).toBeTrue();
    expect(readdirSync(journalRoot)).toHaveLength(1);
  }, 20_000);

  test("retains an empty reservation without a recorded target inode", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const reservationPath = join(root, "reservation");
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(reservationPath, { mode: 0o700 });
    writePendingJournal(
      journalRoot,
      "8",
      pendingContainerFixture(
        root,
        "exclusive-reservation",
        reservationPath,
        "future-marker\n",
        false,
      ),
    );

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(existsSync(reservationPath)).toBeTrue();
    expect(readdirSync(journalRoot)).toHaveLength(1);
  });

  test("retains an old journal whose inode identity uses unsafe numbers", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const stagingPath = join(root, ".legacy-owned.tmp");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(stagingPath, "owned", { mode: 0o600 });
    const stat = lstatSync(stagingPath);
    writePendingJournal(journalRoot, "7", Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath: join(root, "owned.json"),
      stagingPath,
      contentDigest: createHash("sha256").update("owned").digest("hex"),
      ready: true,
      identity: Object.freeze({
        dev: stat.dev,
        ino: stat.ino,
        uid: stat.uid,
        mode: stat.mode & 0o777,
        kind: "file" as const,
      }),
    }));

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(stagingPath, "utf-8")).toBe("owned");
    expect(readdirSync(journalRoot)).toHaveLength(1);
  });

  for (const schemaCase of [
    Object.freeze({
      name: "a non-reservation receipt with a candidate index",
      mutate(semantic: Record<string, unknown>): void {
        const receipts = semantic.receipts as Record<string, unknown>[];
        receipts[0] = { ...receipts[0], selectedCandidateIndex: 0 };
      },
    }),
    Object.freeze({
      name: "a negative attempt wave index",
      mutate(semantic: Record<string, unknown>): void {
        semantic.attemptIdentity = {
          ...semantic.attemptIdentity as Record<string, unknown>,
          waveIndex: -1,
        };
      },
    }),
  ]) {
    test(`retains a strict journal containing ${schemaCase.name}`, async () => {
      const root = temporaryRoot();
      const fixture = await materializedOwnedFileFixture(root, `strict-${schemaCase.name}`);
      rewriteJournal(fixture.journalPath, schemaCase.mutate);

      const restarted = createTestResourceSupervisor(fixture.journalRoot);
      expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
      expect(readFileSync(fixture.ownedFile, "utf-8")).toBe("owned");
      expect(readdirSync(fixture.journalRoot)).toHaveLength(1);
    });
  }

  test("retains a ready pending file without a durable inode identity", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    mkdirSync(journalRoot, { mode: 0o700 });
    writePendingJournal(journalRoot, "1", Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath: join(root, "owned.json"),
      stagingPath: join(root, ".owned.tmp"),
      contentDigest: createHash("sha256").update("owned").digest("hex"),
      ready: true,
    }));

    expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readdirSync(journalRoot)).toHaveLength(1);
  });

  test("retains a pending container whose target identity lacks a sidecar identity", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const cleanupPath = join(root, "pending-directory");
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(cleanupPath, { mode: 0o700 });
    writePendingJournal(journalRoot, "2", Object.freeze({
      kind: "attempt-owned-directory" as const,
      resourceId: "evidence",
      cleanupPath,
      ownerMarker: "owner\n",
      sidecarPath: join(root, ".owner-token"),
      ownerToken: "token\n",
      identity: journalIdentity(cleanupPath, "directory"),
    }));

    expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(existsSync(cleanupPath)).toBeTrue();
  });

  test("retains a journal whose pending resource duplicates a durable receipt", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "duplicate-pending-receipt");
    rewriteJournal(fixture.journalPath, (semantic) => {
      delete semantic.receiptDigest;
      semantic.pending = Object.freeze({
        kind: "attempt-owned-file",
        resourceId: "settings",
        targetPath: fixture.ownedFile,
        stagingPath: join(root, ".owned.tmp"),
        contentDigest: createHash("sha256").update("owned").digest("hex"),
        ready: false,
      });
    });

    expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(fixture.ownedFile, "utf-8")).toBe("owned");
  });

  test("retains a journal whose recovery owner is bound to another wave", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "owner-attempt-mismatch");
    await fixture.supervisor.bindRecoveryOwner(fixture.resources, recoveryOwner("owner-attempt-mismatch"));
    rewriteJournal(fixture.journalPath, (semantic) => {
      semantic.recoveryOwner = {
        ...semantic.recoveryOwner as Record<string, unknown>,
        waveDigest: "different-wave-digest",
      };
    });

    expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(fixture.ownedFile, "utf-8")).toBe("owned");
  });

  test("rejects invalid quarantine expectation shapes and field combinations", async () => {
    for (const [index, expectation] of [
      Object.freeze({ removal: "invalid" }),
      Object.freeze({
        identity: Object.freeze({ dev: "1", ino: "1", uid: 1, mode: 0o700, kind: "directory" }),
        contentDigest: "content",
        ownerMarker: "owner\n",
        removal: "marker-only-directory",
      }),
    ].entries()) {
      const root = temporaryRoot();
      const fixture = await materializedOwnedFileFixture(root, `invalid-quarantine-${index}`);
      rewriteJournal(fixture.journalPath, (semantic) => {
        semantic.quarantine = Object.freeze({
          schemaVersion: 1,
          resourceId: "quarantine",
          originalPath: join(root, "original"),
          quarantinePath: join(root, "quarantine"),
          state: "moved",
          expectation,
        });
      });

      expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({
        recovered: 0,
        retained: 1,
      });
      expect(readFileSync(fixture.ownedFile, "utf-8")).toBe("owned");
    }
  });

  for (const removal of ["owned-tree", "marker-only-directory"] as const) {
    test(`recovers a durable ${removal} quarantine`, async () => {
      const root = temporaryRoot();
      const fixture = await materializedOwnedFileFixture(root, `valid-quarantine-${removal}`);
      const originalPath = join(root, `original-${removal}`);
      const quarantinePath = join(root, `quarantine-${removal}`);
      const ownerMarker = "quarantine-owner\n";
      await fixture.supervisor.bindRecoveryOwner(
        fixture.resources,
        recoveryOwner(`valid-quarantine-${removal}`),
      );
      mkdirSync(quarantinePath, { mode: 0o700 });
      writeFileSync(join(quarantinePath, ".amadeus-owner.json"), ownerMarker, { mode: 0o600 });
      rewriteJournal(fixture.journalPath, (semantic) => {
        semantic.quarantine = Object.freeze({
          schemaVersion: 1,
          resourceId: "quarantine",
          originalPath,
          quarantinePath,
          state: "moved",
          expectation: Object.freeze({
            identity: journalIdentity(quarantinePath, "directory"),
            ownerMarker,
            removal,
          }),
        });
      });

      expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({
        recovered: 1,
        retained: 0,
      });
      expect(existsSync(quarantinePath)).toBeFalse();
    });
  }

  test("retains a quarantine with an unknown WAL state", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "unknown-quarantine-state");
    writeQuarantineCrashFixture(fixture.journalRoot, fixture.ownedFile, "moved");
    rewriteJournal(fixture.journalPath, (semantic) => {
      semantic.quarantine = {
        ...semantic.quarantine as Record<string, unknown>,
        state: "unknown",
      };
    });

    expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
  });

  test("retains a quarantine whose file content changed after the durable move", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "changed-quarantine-content");
    await fixture.supervisor.bindRecoveryOwner(
      fixture.resources,
      recoveryOwner("changed-quarantine-content"),
    );
    const quarantinePath = writeQuarantineCrashFixture(fixture.journalRoot, fixture.ownedFile, "moved");
    writeFileSync(quarantinePath, "changed", { mode: 0o600 });

    expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(quarantinePath, "utf-8")).toBe("changed");
  });

  test("retains a marker-only quarantine containing an extra entry", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "marker-quarantine-extra-entry");
    await fixture.supervisor.bindRecoveryOwner(
      fixture.resources,
      recoveryOwner("marker-quarantine-extra-entry"),
    );
    const originalPath = join(root, "reservation-original");
    const quarantinePath = join(root, "reservation-quarantine");
    const ownerMarker = "reservation-owner\n";
    mkdirSync(quarantinePath, { mode: 0o700 });
    writeFileSync(join(quarantinePath, ".amadeus-owner.json"), ownerMarker, { mode: 0o600 });
    writeFileSync(join(quarantinePath, "foreign"), "foreign", { mode: 0o600 });
    rewriteJournal(fixture.journalPath, (semantic) => {
      semantic.quarantine = Object.freeze({
        schemaVersion: 1,
        resourceId: "reservation",
        originalPath,
        quarantinePath,
        state: "moved",
        expectation: Object.freeze({
          identity: journalIdentity(quarantinePath, "directory"),
          ownerMarker,
          removal: "marker-only-directory",
        }),
      });
    });

    expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(join(quarantinePath, "foreign"), "utf-8")).toBe("foreign");
  });

  test("retains a quarantine whose owned inode disappeared", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "missing-quarantine-inode");
    await fixture.supervisor.bindRecoveryOwner(
      fixture.resources,
      recoveryOwner("missing-quarantine-inode"),
    );
    const quarantinePath = writeQuarantineCrashFixture(fixture.journalRoot, fixture.ownedFile, "moved");
    unlinkSync(quarantinePath);

    expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readdirSync(fixture.journalRoot)).toHaveLength(1);
  });

  test("recovers a hard-linked file from a durable pending intent", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const stagingPath = join(root, ".owned.json.amadeus-pending.tmp");
    const targetPath = join(root, "owned.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(stagingPath, "owned", { mode: 0o600 });
    linkSync(stagingPath, targetPath);
    const pending = Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath,
      stagingPath,
      contentDigest: createHash("sha256").update("owned").digest("hex"),
      ready: true,
      identity: journalIdentity(stagingPath, "file"),
    });
    writePendingJournal(journalRoot, "a", pending);

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 1, retained: 0 });
    expect(existsSync(stagingPath)).toBeFalse();
    expect(existsSync(targetPath)).toBeFalse();
    expect(activeJournalNames(journalRoot)).toEqual([]);
  });

  test("recovers an identified staging inode when the file write was interrupted", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const stagingPath = join(root, ".owned.json.amadeus-interrupted.tmp");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(stagingPath, "partial", { mode: 0o600 });
    writePendingJournal(journalRoot, "f", Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath: join(root, "owned.json"),
      stagingPath,
      contentDigest: createHash("sha256").update("complete").digest("hex"),
      ready: false,
      identity: journalIdentity(stagingPath, "file"),
    }));

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 1, retained: 0 });
    expect(existsSync(stagingPath)).toBeFalse();
    expect(activeJournalNames(journalRoot)).toEqual([]);
  });

  for (const [kind, nameCharacter] of [
    ["attempt-owned-directory", "b"],
    ["exclusive-reservation", "c"],
  ] as const) {
    test(`recovers an exact ${kind} inode and marker from a durable pending intent`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const cleanupPath = join(root, kind);
      const ownerMarker = `${JSON.stringify({ nativeRunId: "pending-native-run", kind })}\n`;
      mkdirSync(journalRoot, { mode: 0o700 });
      mkdirSync(cleanupPath, { mode: 0o700 });
      writeFileSync(join(cleanupPath, ".amadeus-owner.json"), ownerMarker, { mode: 0o600 });
      writePendingJournal(
        journalRoot,
        nameCharacter,
        pendingContainerFixture(root, kind, cleanupPath, ownerMarker),
      );

      const restarted = createTestResourceSupervisor(journalRoot);
      expect(await restarted.recover()).toEqual({ recovered: 1, retained: 0 });
      expect(existsSync(cleanupPath)).toBeFalse();
      expect(activeJournalNames(journalRoot)).toEqual([]);
    });
  }

  test("recovers an identified directory when owner-marker creation was interrupted", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const cleanupPath = join(root, "interrupted-directory");
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(cleanupPath, { mode: 0o700 });
    writePendingJournal(
      journalRoot,
      "9",
      pendingContainerFixture(
        root,
        "attempt-owned-directory",
        cleanupPath,
        "expected-marker\n",
      ),
    );

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 1, retained: 0 });
    expect(existsSync(cleanupPath)).toBeFalse();
    expect(activeJournalNames(journalRoot)).toEqual([]);
  });

  test("preserves a symlink that replaced a pending owned-file inode", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const stagingPath = join(root, ".owned.json.amadeus-pending.tmp");
    const targetPath = join(root, "owned.json");
    const foreignPath = join(root, "foreign.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(stagingPath, "owned", { mode: 0o600 });
    writeFileSync(foreignPath, "foreign", { mode: 0o600 });
    linkSync(stagingPath, targetPath);
    const pending = Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath,
      stagingPath,
      contentDigest: createHash("sha256").update("owned").digest("hex"),
      ready: true,
      identity: journalIdentity(stagingPath, "file"),
    });
    writePendingJournal(journalRoot, "d", pending);
    unlinkSync(targetPath);
    symlinkSync(foreignPath, targetPath);

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 1, retained: 0 });
    expect(existsSync(stagingPath)).toBeFalse();
    expect(lstatSync(targetPath).isSymbolicLink()).toBeTrue();
    expect(readFileSync(foreignPath, "utf-8")).toBe("foreign");
  });

  test("retains recovery state when a symlink replaces a pending directory inode", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const cleanupPath = join(root, "owned-directory");
    const foreignPath = join(root, "foreign-directory");
    const ownerMarker = "owned-marker\n";
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(cleanupPath, { mode: 0o700 });
    writeFileSync(join(cleanupPath, ".amadeus-owner.json"), ownerMarker, { mode: 0o600 });
    writePendingJournal(
      journalRoot,
      "e",
      pendingContainerFixture(root, "attempt-owned-directory", cleanupPath, ownerMarker),
    );
    rmSync(cleanupPath, { recursive: true });
    mkdirSync(foreignPath, { mode: 0o700 });
    writeFileSync(join(foreignPath, "sentinel"), "foreign", { mode: 0o600 });
    symlinkSync(foreignPath, cleanupPath, "dir");

    const restarted = createTestResourceSupervisor(journalRoot);
    expect(await restarted.recover()).toEqual({ recovered: 0, retained: 1 });
    expect(lstatSync(cleanupPath).isSymbolicLink()).toBeTrue();
    expect(readFileSync(join(foreignPath, "sentinel"), "utf-8")).toBe("foreign");
    expect(readdirSync(journalRoot)).toEqual([`${"e".repeat(64)}.json`]);
  });

  test("binds an all-absent baseline and rejects a partial appearance before arm", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const first = join(root, "session-1.json");
    const second = join(root, "session-2.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    const plans = Object.freeze([
      Object.freeze({
        kind: "pre-arm-baseline" as const,
        resourceId: "session-baseline",
        exactPaths: Object.freeze([first, second]),
        allowAbsent: true,
      }),
    ]);
    const resourcePlan = preparation(plans);
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(resourcePlan, launchInput(join(root, "evidence")));

    expect(resources.resources[0]?.resolvedPaths).toEqual([]);
    await expect(supervisor.verifyForArm(resourcePlan, resources)).resolves.toBeUndefined();
    writeFileSync(first, "appeared", { mode: 0o600 });
    await expect(supervisor.verifyForArm(resourcePlan, resources)).rejects.toThrow(
      "RESOURCE_BASELINE_INVALID",
    );
    await supervisor.cleanup(resources);
    expect(readFileSync(first, "utf-8")).toBe("appeared");
  });

  test("rejects a managed path whose parent is not a directory", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const parent = join(root, "not-a-directory");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(parent, "foreign", { mode: 0o600 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: join(parent, "settings.json"),
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);

    await expect(
      createTestResourceSupervisor(journalRoot).materialize(preparation(plans), launchInput(root)),
    ).rejects.toThrow("RESOURCE_MATERIALIZATION_FAILED");
    expect(readFileSync(parent, "utf-8")).toBe("foreign");
  });

  test("removes an exclusively-created journal when its directory sync fails", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    mkdirSync(journalRoot, { mode: 0o700 });
    const supervisor = createTestResourceSupervisor(journalRoot);
    chmodSync(journalRoot, 0o300);
    try {
      await expect(
        supervisor.materialize(preparation(Object.freeze([])), launchInput(root, "initial-sync-failure")),
      ).rejects.toThrow();
    } finally {
      chmodSync(journalRoot, 0o700);
    }
    expect(activeJournalNames(journalRoot)).toEqual([]);
  });

  test("removes a temporary journal when an atomic replacement fails", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "atomic-replacement-failure");
    let digestReads = 0;
    const owner = new Proxy(recoveryOwner("atomic-replacement-failure"), {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver);
        if (property === "processIdentityDigest" && ++digestReads === 2) {
          unlinkSync(fixture.journalPath);
          mkdirSync(fixture.journalPath, { mode: 0o700 });
        }
        return value;
      },
    });

    await expect(fixture.supervisor.bindRecoveryOwner(fixture.resources, owner)).rejects.toThrow();
    expect(readdirSync(fixture.journalRoot).filter((name) => name.endsWith(".tmp"))).toEqual([]);
    expect(lstatSync(fixture.journalPath).isDirectory()).toBeTrue();
  });

  test("retains a recovery journal whose mode is not private", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "public-journal-mode");
    chmodSync(fixture.journalPath, 0o644);

    expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({
      recovered: 0,
      retained: 1,
    });
  });

  test("retains recovery when quarantine metadata is inaccessible", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const lockedRoot = join(root, "locked");
    const ownedFile = join(lockedRoot, "owned.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(lockedRoot, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const supervisor = createTestResourceSupervisor(journalRoot);
    const resources = await supervisor.materialize(preparation(plans), launchInput(root, "locked-quarantine"));
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("locked-quarantine"));
    writeQuarantineCrashFixture(journalRoot, ownedFile, "moved");
    chmodSync(lockedRoot, 0o000);
    try {
      expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    } finally {
      chmodSync(lockedRoot, 0o700);
    }
  });

  test("retains a pending container whose sidecar token changed", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const cleanupPath = join(root, "owned-directory");
    const ownerMarker = "owned-marker\n";
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(cleanupPath, { mode: 0o700 });
    const pending = pendingContainerFixture(root, "attempt-owned-directory", cleanupPath, ownerMarker);
    writePendingJournal(journalRoot, "7", pending);
    writeFileSync(String(pending.sidecarPath), "foreign-token\n", { mode: 0o600 });

    expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(String(pending.sidecarPath), "utf-8")).toBe("foreign-token\n");
  });

  test("retains a ready pending file whose owned content changed", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const stagingPath = join(root, ".owned.json.amadeus-pending.tmp");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(stagingPath, "owned", { mode: 0o600 });
    const pending = Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath: join(root, "owned.json"),
      stagingPath,
      contentDigest: createHash("sha256").update("owned").digest("hex"),
      ready: true,
      identity: journalIdentity(stagingPath, "file"),
    });
    writePendingJournal(journalRoot, "6", pending);
    writeFileSync(stagingPath, "changed", { mode: 0o600 });

    expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(stagingPath, "utf-8")).toBe("changed");
  });

  test("retains an unidentified pending file when its staging path exists", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const stagingPath = join(root, ".owned.json.amadeus-pending.tmp");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(stagingPath, "partial", { mode: 0o600 });
    writePendingJournal(journalRoot, "5", Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath: join(root, "owned.json"),
      stagingPath,
      contentDigest: createHash("sha256").update("owned").digest("hex"),
      ready: false,
    }));

    expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(stagingPath, "utf-8")).toBe("partial");
  });

  test("clears an unidentified pending file when its staging path is absent", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    mkdirSync(journalRoot, { mode: 0o700 });
    writePendingJournal(journalRoot, "2", Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath: join(root, "owned.json"),
      stagingPath: join(root, ".owned.json.amadeus-missing.tmp"),
      contentDigest: createHash("sha256").update("owned").digest("hex"),
      ready: false,
    }));

    expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 1, retained: 0 });
    expect(activeJournalNames(journalRoot)).toEqual([]);
  });

  test("retains a pending file whose staging inode does not match", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const stagingPath = join(root, ".owned.json.amadeus-pending.tmp");
    const foreignPath = join(root, "foreign.tmp");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(stagingPath, "partial", { mode: 0o600 });
    writeFileSync(foreignPath, "foreign", { mode: 0o600 });
    writePendingJournal(journalRoot, "4", Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      targetPath: join(root, "owned.json"),
      stagingPath,
      contentDigest: createHash("sha256").update("owned").digest("hex"),
      ready: false,
      identity: journalIdentity(foreignPath, "file"),
    }));

    expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 0, retained: 1 });
    expect(readFileSync(stagingPath, "utf-8")).toBe("partial");
  });

  test("removes an owned pending sidecar after its target disappeared", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const cleanupPath = join(root, "interrupted-directory");
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(cleanupPath, { mode: 0o700 });
    const pending = pendingContainerFixture(
      root,
      "attempt-owned-directory",
      cleanupPath,
      "expected-marker\n",
    );
    writePendingJournal(journalRoot, "3", pending);
    rmdirSync(cleanupPath);

    expect(await createTestResourceSupervisor(journalRoot).recover()).toEqual({ recovered: 1, retained: 0 });
    expect(existsSync(String(pending.sidecarPath))).toBeFalse();
  });

  test("rejects an exclusive reservation when every candidate path already exists", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const reservations = [join(root, "reservation-a"), join(root, "reservation-b")];
    mkdirSync(journalRoot, { mode: 0o700 });
    for (const path of reservations) mkdirSync(path, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "exclusive-reservation" as const,
      resourceId: "session-prefix",
      candidates: Object.freeze(reservations.map((reservationPath, index) => Object.freeze({
        reservationPath,
        guardedPaths: Object.freeze([join(root, `guard-${index}`)]),
      }))),
    })]);

    await expect(
      createTestResourceSupervisor(journalRoot).materialize(preparation(plans), launchInput(root)),
    ).rejects.toThrow("RESOURCE_MATERIALIZATION_FAILED");
    expect(reservations.every((path) => existsSync(path))).toBeTrue();
    expect(readdirSync(journalRoot)).toEqual([]);
  });

  test("propagates a non-contention failure while creating a reservation", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const reservationPath = join(root, "reservation");
    mkdirSync(journalRoot, { mode: 0o700 });
    const guardedPaths = new Proxy(Object.freeze([join(root, "guarded")]), {
      get(target, property, receiver) {
        if (property === "some") return () => { throw new Error("guard inspection failed"); };
        return Reflect.get(target, property, receiver);
      },
    });
    const plans = Object.freeze([Object.freeze({
      kind: "exclusive-reservation" as const,
      resourceId: "session-prefix",
      candidates: Object.freeze([Object.freeze({ reservationPath, guardedPaths })]),
    })]);

    await expect(
      createTestResourceSupervisor(journalRoot).materialize(preparation(plans), launchInput(root)),
    ).rejects.toThrow("RESOURCE_MATERIALIZATION_FAILED");
    expect(existsSync(reservationPath)).toBeFalse();
  });

  test("rejects an attempt-owned directory when its path already exists", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedDirectory = join(root, "owned");
    mkdirSync(journalRoot, { mode: 0o700 });
    mkdirSync(ownedDirectory, { mode: 0o700 });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-directory" as const,
      resourceId: "evidence",
      path: ownedDirectory,
      mode: "0700" as const,
    })]);

    await expect(
      createTestResourceSupervisor(journalRoot).materialize(preparation(plans), launchInput(root)),
    ).rejects.toThrow("RESOURCE_MATERIALIZATION_FAILED");
    expect(existsSync(ownedDirectory)).toBeTrue();
    expect(readdirSync(journalRoot)).toEqual([]);
  });

  test("rejects a symbolic-link pre-arm baseline", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const target = join(root, "target.json");
    const baseline = join(root, "baseline.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(target, "foreign", { mode: 0o600 });
    symlinkSync(target, baseline);
    const plans = Object.freeze([Object.freeze({
      kind: "pre-arm-baseline" as const,
      resourceId: "provider-baseline",
      exactPaths: Object.freeze([baseline]),
      allowAbsent: false,
    })]);

    await expect(
      createTestResourceSupervisor(journalRoot).materialize(preparation(plans), launchInput(root)),
    ).rejects.toThrow("RESOURCE_MATERIALIZATION_FAILED");
    expect(lstatSync(baseline).isSymbolicLink()).toBeTrue();
  });

  for (const corruption of ["path-kind", "owner-marker"] as const) {
    test(`preserves a reservation with corrupted ${corruption}`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const reservationPath = join(root, "reservation");
      mkdirSync(journalRoot, { mode: 0o700 });
      const plans = Object.freeze([Object.freeze({
        kind: "exclusive-reservation" as const,
        resourceId: "session-prefix",
        candidates: Object.freeze([Object.freeze({
          reservationPath,
          guardedPaths: Object.freeze([join(root, "guarded")]),
        })]),
      })]);
      const supervisor = createTestResourceSupervisor(journalRoot);
      const resources = await supervisor.materialize(preparation(plans), launchInput(root));
      if (corruption === "path-kind") {
        rmSync(reservationPath, { recursive: true });
        writeFileSync(reservationPath, "foreign", { mode: 0o600 });
      } else {
        writeFileSync(join(reservationPath, ".amadeus-owner.json"), "foreign\n", { mode: 0o600 });
      }

      await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_OWNER_INVALID");
      expect(existsSync(reservationPath)).toBeTrue();
    });
  }

  test("rejects an owned file whose content changes before arm", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "changed-before-arm");
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: fixture.ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    writeFileSync(fixture.ownedFile, "changed", { mode: 0o600 });

    await expect(fixture.supervisor.verifyForArm(preparation(plans), fixture.resources)).rejects.toThrow(
      "RESOURCE_ARM_VERIFICATION_FAILED",
    );
  });

  for (const kind of ["exclusive-reservation", "attempt-owned-directory"] as const) {
    test(`rejects a missing ${kind} before arm`, async () => {
      const root = temporaryRoot();
      const journalRoot = join(root, "journals");
      const managedPath = join(root, "managed");
      mkdirSync(journalRoot, { mode: 0o700 });
      const plans = kind === "exclusive-reservation"
        ? Object.freeze([Object.freeze({
            kind,
            resourceId: "managed",
            candidates: Object.freeze([Object.freeze({
              reservationPath: managedPath,
              guardedPaths: Object.freeze([join(root, "guarded")]),
            })]),
          })])
        : Object.freeze([Object.freeze({
            kind,
            resourceId: "managed",
            path: managedPath,
            mode: "0700" as const,
          })]);
      const resourcePlan = preparation(plans);
      const supervisor = createTestResourceSupervisor(journalRoot);
      const resources = await supervisor.materialize(resourcePlan, launchInput(root));
      rmSync(managedPath, { recursive: true });

      await expect(supervisor.verifyForArm(resourcePlan, resources)).rejects.toThrow(
        "RESOURCE_ARM_VERIFICATION_FAILED",
      );
    });
  }

  test("rejects a plan-to-receipt resource identity mismatch before arm", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "plan-receipt-mismatch");
    const originalPlans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: fixture.ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const mismatchedPlan = Object.freeze({ ...originalPlans[0], resourceId: "different-settings" });
    const plans = new Proxy(originalPlans, {
      get(target, property, receiver) {
        if (property === "entries") {
          return () => [[0, mismatchedPlan] as const][Symbol.iterator]();
        }
        return Reflect.get(target, property, receiver);
      },
    });

    await expect(fixture.supervisor.verifyForArm(Object.freeze({
      resources: plans,
      preparationDigest: fixture.resources.preparationDigest,
    }), fixture.resources)).rejects.toThrow("RESOURCE_ARM_VERIFICATION_FAILED");
  });

  test("rejects malformed materialized resource-set bindings before journal lookup", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "resource-set-bindings");
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: fixture.ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const resourcePlan = preparation(plans);
    const emptyResources = Object.freeze([]) as typeof fixture.resources.resources;
    for (const malformed of [
      Object.freeze({ ...fixture.resources, preparationDigest: "different-preparation" }),
      Object.freeze({ ...fixture.resources, receiptDigest: "different-receipt" }),
      Object.freeze({
        ...fixture.resources,
        resources: emptyResources,
        receiptDigest: digestValue(emptyResources),
      }),
    ]) {
      await expect(fixture.supervisor.verifyForArm(resourcePlan, malformed)).rejects.toThrow(
        "RESOURCE_ARM_VERIFICATION_FAILED",
      );
    }
  });

  test("rejects a journal whose preparation binding changes after materialization", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "changed-journal-binding");
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: fixture.ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    rewriteJournal(fixture.journalPath, (semantic) => {
      semantic.preparationDigest = "different-preparation";
    });

    await expect(fixture.supervisor.verifyForArm(preparation(plans), fixture.resources)).rejects.toThrow(
      "RESOURCE_JOURNAL_INVALID",
    );
  });

  test("retains an impossible quarantine intent topology", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "invalid-quarantine-topology");
    await fixture.supervisor.bindRecoveryOwner(
      fixture.resources,
      recoveryOwner("invalid-quarantine-topology"),
    );
    const quarantinePath = join(root, "quarantine-copy.json");
    writeFileSync(quarantinePath, "owned", { mode: 0o600 });
    rewriteJournal(fixture.journalPath, (semantic) => {
      semantic.quarantine = Object.freeze({
        schemaVersion: 1,
        resourceId: "settings",
        originalPath: fixture.ownedFile,
        quarantinePath,
        state: "intent",
        expectation: Object.freeze({
          identity: journalIdentity(quarantinePath, "file"),
          contentDigest: createHash("sha256").update("owned").digest("hex"),
          removal: "file",
        }),
      });
    });

    expect(await createTestResourceSupervisor(fixture.journalRoot).recover()).toEqual({
      recovered: 0,
      retained: 1,
    });
    expect(readFileSync(fixture.ownedFile, "utf-8")).toBe("owned");
    expect(readFileSync(quarantinePath, "utf-8")).toBe("owned");
  });

  test("retains resources when the recovery observer throws", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const ownedFile = join(root, "owned.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    const observer: NativeResourceRecoveryObserverPort = Object.freeze({
      async observe(): Promise<NativeResourceRecoveryObservation> {
        throw new Error("observer unavailable");
      },
    });
    const supervisor = createNativeResourceSupervisor({ journalRoot, recoveryObserver: observer });
    const plans = Object.freeze([Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "settings",
      path: ownedFile,
      bytes: new TextEncoder().encode("owned"),
      mode: "0600" as const,
    })]);
    const resources = await supervisor.materialize(preparation(plans), launchInput(root, "throwing-observer"));
    await supervisor.bindRecoveryOwner(resources, recoveryOwner("throwing-observer"));

    await expect(supervisor.cleanup(resources)).rejects.toThrow("RESOURCE_PROCESS_ACTIVE");
    expect(readFileSync(ownedFile, "utf-8")).toBe("owned");
  });

  test("reports rollback failure when an earlier owned resource changes", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    const first = join(root, "first.json");
    const conflict = join(root, "conflict.json");
    mkdirSync(journalRoot, { mode: 0o700 });
    writeFileSync(conflict, "foreign", { mode: 0o600 });
    const latePlan = Object.freeze({
      kind: "attempt-owned-file" as const,
      resourceId: "conflict",
      get path(): string {
        if (existsSync(first)) writeFileSync(first, "changed", { mode: 0o600 });
        return conflict;
      },
      bytes: new TextEncoder().encode("replacement"),
      mode: "0600" as const,
    });
    const plans = Object.freeze([
      Object.freeze({
        kind: "attempt-owned-file" as const,
        resourceId: "first",
        path: first,
        bytes: new TextEncoder().encode("first"),
        mode: "0600" as const,
      }),
      latePlan,
    ]);

    await expect(
      createTestResourceSupervisor(journalRoot).materialize(preparation(plans), launchInput(root)),
    ).rejects.toThrow("RESOURCE_ROLLBACK_FAILED");
    expect(readFileSync(first, "utf-8")).toBe("changed");
    expect(readFileSync(conflict, "utf-8")).toBe("foreign");
  });

  test("rejects an initial recovery owner bound to another attempt", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "different-owner-attempt");
    const owner = Object.freeze({
      ...recoveryOwner("different-owner-attempt"),
      planDigest: "different-plan-digest",
    });

    await expect(fixture.supervisor.bindRecoveryOwner(fixture.resources, owner)).rejects.toThrow(
      "RESOURCE_RECOVERY_OWNER_INVALID",
    );
  });

  test("rejects a newly-created resource owned by another effective uid", async () => {
    const root = temporaryRoot();
    const journalRoot = join(root, "journals");
    mkdirSync(journalRoot, { mode: 0o700 });
    const supervisor = createTestResourceSupervisor(journalRoot);
    const getuidDescriptor = Object.getOwnPropertyDescriptor(process, "getuid");
    if (!getuidDescriptor || typeof process.getuid !== "function") throw new Error("getuid unavailable");
    Object.defineProperty(process, "getuid", {
      ...getuidDescriptor,
      value: () => getuidDescriptor.value.call(process) + 1,
    });
    try {
      await expect(
        supervisor.materialize(preparation(Object.freeze([])), launchInput(root, "foreign-effective-uid")),
      ).rejects.toThrow("RESOURCE_OWNER_INVALID");
    } finally {
      Object.defineProperty(process, "getuid", getuidDescriptor);
    }
  });

  test("rejects an inode uid outside JavaScript's safe integer range", () => {
    const root = temporaryRoot();
    const stat = lstatSync(root, { bigint: true });
    const unsafeUidStat = new Proxy(stat, {
      get(target, property) {
        if (property === "uid") return BigInt(Number.MAX_SAFE_INTEGER) + 1n;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    expect(() => nativeResourceTestSeam.statUid(unsafeUidStat)).toThrow("RESOURCE_OWNER_INVALID");
  });

  test("rejects a tampered materialized resource receipt digest", async () => {
    const root = temporaryRoot();
    const fixture = await materializedOwnedFileFixture(root, "tampered-cleanup-receipt");
    const malformed = Object.freeze({ ...fixture.resources, receiptDigest: "different-receipt" });
    expect(() => nativeResourceTestSeam.validateResourceReceiptDigest(malformed)).toThrow(
      "RESOURCE_JOURNAL_INVALID",
    );
    expect(readFileSync(fixture.ownedFile, "utf-8")).toBe("owned");
  });

  test("rejects a symlinked recovery journal root without writing through it", () => {
    const root = temporaryRoot();
    const actualRoot = join(root, "actual-journals");
    const linkedRoot = join(root, "linked-journals");
    mkdirSync(actualRoot, { mode: 0o700 });
    symlinkSync(actualRoot, linkedRoot, "dir");

    expect(() => createNativeResourceSupervisor({ journalRoot: linkedRoot })).toThrow(
      "RESOURCE_JOURNAL_ROOT_INVALID",
    );
    expect(readdirSync(actualRoot)).toEqual([]);
  });
});
