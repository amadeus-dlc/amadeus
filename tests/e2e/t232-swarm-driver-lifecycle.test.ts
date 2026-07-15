// covers: module:amadeus-swarm-referee-finalize, requirement:FR-15, requirement:FR-20, requirement:FR-21
// size: large

import { afterAll, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  executeBoundFinalize,
  createFileBoundFinalizeStore,
  type AuditDirective,
  type BoundFinalizePorts,
  type BoundFinalizeStore,
  type FinalizeClaim,
  type FinalizeProgress,
  parseFinalizeProgress,
} from "../../packages/framework/core/tools/amadeus-swarm-referee-finalize.ts";
import {
  buildFinalizeRequestBinding,
  buildRefereeFinalizeEnvelope,
  validateRefereeEnvelope,
} from "../../packages/framework/core/tools/amadeus-swarm-finalize-contract.ts";
import { digestValue } from "../../packages/framework/core/tools/amadeus-swarm-canonical.ts";
import { appendAuditEntry } from "../../packages/framework/core/tools/amadeus-audit.ts";
import { stateMergedPostcondition } from "../../packages/framework/core/tools/amadeus-bolt.ts";
import {
  getField,
  readAllAuditShards,
  readStateFile,
  recordDir,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  observeProcessIdentity,
  sameProcess,
} from "../../packages/framework/core/tools/amadeus-armed-process.ts";
import {
  finalizeOperationId,
  validateFinalizeOperationClaim,
} from "../../packages/framework/core/tools/amadeus-swarm-operation-claim.ts";
import {
  openOperationJournal,
  parseOperationJournal,
  recordOperationStep,
} from "../../packages/framework/core/tools/amadeus-swarm-operation-journal.ts";
import {
  FIXTURES_DIR,
  cleanupWorktreeFixture,
  seededAuditDir,
  seededStateFile,
  setupWorktreeFixture,
} from "../harness/fixtures.ts";

const fixtureRoots: string[] = [];
afterAll(() => {
  for (const root of fixtureRoots) cleanupWorktreeFixture(root);
});

function realFixture(): string {
  const projectDir = setupWorktreeFixture();
  fixtureRoots.push(projectDir);
  writeFileSync(
    seededStateFile(projectDir),
    readFileSync(join(FIXTURES_DIR, "state-construction.md"), "utf-8"),
  );
  mkdirSync(seededAuditDir(projectDir), { recursive: true });
  writeFileSync(join(seededAuditDir(projectDir), "fixture.md"), "# AI-DLC Audit Log\n");
  writeFileSync(
    join(projectDir, ".gitignore"),
    [
      "amadeus/active-space",
      "amadeus/.amadeus-clone-id",
      "amadeus/spaces/*/intents/active-intent",
      "amadeus/spaces/*/intents/*/runtime-graph.json",
      "amadeus/spaces/*/intents/*/.amadeus-*",
      "amadeus/spaces/*/intents/*/audit/",
      "",
    ].join("\n"),
  );
  spawnSync("git", ["add", "-A"], { cwd: projectDir });
  spawnSync("git", ["commit", "-q", "--amend", "--no-edit"], { cwd: projectDir });
  return projectDir;
}

function git(projectDir: string, args: readonly string[]): string {
  const result = spawnSync("git", [...args], { cwd: projectDir, encoding: "utf-8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

const invocation = Object.freeze({
  schemaVersion: 1 as const,
  finalizeInvocationId: "finalize-1",
  checkCommand: "bun test",
  mergeMessage: "Merge swarm batch 1",
});

function binding() {
  const result = buildFinalizeRequestBinding({
    executionId: "execution-1",
    attemptId: "attempt-1",
    finalizeInvocationId: invocation.finalizeInvocationId,
    batch: 1,
    planDigest: "plan-1",
    worktreeManifestDigest: "manifest-1",
    expectedUnits: [
      { unit: "beta", worktreePathDigest: "path-beta", baseCommit: "base", headCommit: "head-beta" },
      { unit: "alpha", worktreePathDigest: "path-alpha", baseCommit: "base", headCommit: "head-alpha" },
    ],
    claimedUnits: ["beta", "alpha"],
    declinedUnits: [],
    checkCommandDigest: digestValue(invocation.checkCommand),
    protectedSpec: { kind: "none" },
    repoIdentityDigest: "repo-1",
    mergeTargetBranch: "main",
    targetBeforeCommit: "base",
    mergeStrategy: "squash",
    mergeMessageDigest: digestValue(invocation.mergeMessage),
  });
  if (result.type === "err") throw new Error("Invalid binding fixture");
  return result.value;
}

function memoryStore(options: Readonly<{ failCompletedUpdateOnce?: boolean; claimActive?: boolean }> = {}) {
  let progress: FinalizeProgress | null = null;
  let result: ReturnType<typeof binding> extends never ? never : import("../../packages/framework/core/tools/amadeus-swarm-finalize-contract.ts").RefereeFinalizeEnvelope | null = null;
  let failCompletedUpdate = options.failCompletedUpdateOnce ?? false;
  const audit: AuditDirective[] = [];
  const claimSemantic = Object.freeze({
    schemaVersion: 1,
    finalizeInvocationId: invocation.finalizeInvocationId,
    finalizeRequestDigest: binding().finalizeRequestDigest,
    ownerPid: process.pid,
    ownerStartTokenHash: "owner",
    fencingToken: 1,
    expiresAt: "2026-07-14T00:00:30.000Z",
    status: "active",
  });
  const claim: FinalizeClaim = Object.freeze({ ...claimSemantic, claimDigest: digestValue(claimSemantic) });
  const append = (directives: readonly AuditDirective[]) => {
    for (const directive of directives) {
      const duplicate = audit.some(
        (entry) =>
          entry.event === directive.event &&
          entry.fields["Unit name"] === directive.fields["Unit name"] &&
          entry.fields["Finalize invocation ID"] === directive.fields["Finalize invocation ID"],
      );
      if (!duplicate) audit.push(directive);
    }
  };
  const store: BoundFinalizeStore = Object.freeze({
    acquire: (request) => {
      if (options.claimActive) throw new Error("claim active");
      if (!progress) {
        const progressSemantic = Object.freeze({
          schemaVersion: 1 as const,
          finalizeInvocationId: request.finalizeInvocationId,
          finalizeRequestDigest: request.finalizeRequestDigest,
          fencingToken: 1,
          units: Object.freeze(
            Object.fromEntries(request.expectedUnits.map(({ unit }) => [unit, Object.freeze({ state: "pending" })])),
          ),
        });
        progress = Object.freeze({ ...progressSemantic, progressDigest: digestValue(progressSemantic) });
      }
      return Object.freeze({ claim, progress: progress as FinalizeProgress, claimPath: "/claim.json", result });
    },
    heartbeat: (value) => value,
    update: (_claim, next, directives = []) => {
      if (failCompletedUpdate && Object.values(next.units).some((unit) => unit.state === "completed")) {
        failCompletedUpdate = false;
        throw new Error("injected checkpoint failure");
      }
      append(directives);
      progress = next;
    },
    complete: (_claim, next, envelope, directives) => {
      append(directives);
      progress = next;
      result = envelope;
    },
  });
  return { store, audit, progress: () => progress, result: () => result };
}

function ports(overrides: Partial<BoundFinalizePorts> = {}) {
  const calls: string[] = [];
  const codeOperations = new Map<string, import("../../packages/framework/core/tools/amadeus-swarm-finalize-contract.ts").CodeMergeOutcome>();
  const value: BoundFinalizePorts = Object.freeze({
    validateRequest: async () => null,
    validateUnit: async (unit) => {
      calls.push(`validate:${unit.unit}`);
      return null;
    },
    reverify: async ({ unit }) => {
      calls.push(`verify:${unit}`);
      return true;
    },
    mergeAidlc: async ({ unit, operationId }) => {
      calls.push(`aidlc:${unit}:${operationId}`);
      return {
        stateMergeDigest: `state-${unit}`,
        auditMergeDigest: `audit-${unit}`,
        runtimeFragmentMergeDigest: `runtime-${unit}`,
      };
    },
    mergeCode: async ({ unit, operationId }) => {
      calls.push(`code:${unit}:${operationId}`);
      const existing = codeOperations.get(operationId);
      if (existing) return existing;
      const outcome = Object.freeze({
        strategy: "squash" as const,
        targetBeforeCommit: "base",
        targetAfterCommit: `after-${unit}`,
        resultTreeDigest: `tree-${unit}`,
      });
      codeOperations.set(operationId, outcome);
      return outcome;
    },
    ...overrides,
  });
  return { ports: value, calls, codeOperations };
}

describe("t232 bound swarm lifecycle", () => {
  test("finalizes two Units in slug order and returns an exact request-bound envelope", async () => {
    const request = binding();
    const memory = memoryStore();
    const p = ports();
    const outcome = await executeBoundFinalize({ binding: request, invocation, store: memory.store, ports: p.ports });
    expect(outcome.type).toBe("ok");
    if (outcome.type === "err") return;
    expect(outcome.value.mergeCompleted).toBeTrue();
    expect(outcome.value.units.map(({ unit }) => unit)).toEqual(["alpha", "beta"]);
    expect(validateRefereeEnvelope(request, outcome.value).type).toBe("ok");
    expect(p.calls.filter((entry) => entry.startsWith("verify:")).map((entry) => entry.split(":")[1])).toEqual([
      "alpha",
      "beta",
    ]);
    expect(memory.audit.filter(({ event }) => event === "SWARM_UNIT_CONVERGED")).toHaveLength(2);
    expect(memory.audit.filter(({ event }) => event === "SWARM_COMPLETED")).toHaveLength(1);
  });

  test("rejects invocation binding drift before acquiring a claim", async () => {
    const memory = memoryStore({ claimActive: true });
    const outcome = await executeBoundFinalize({
      binding: binding(),
      invocation: { ...invocation, checkCommand: "different" },
      store: memory.store,
      ports: ports().ports,
    });
    expect(outcome).toEqual({ type: "err", error: { code: "FINALIZE_BINDING_INVALID" } });
  });

  test("rejects open, secret-bearing, missing, and mistyped bound finalize invocations", async () => {
    const invalid = [
      { ...invocation, unexpected: true },
      { ...invocation, providerToken: "must-not-pass" },
      { schemaVersion: 1, finalizeInvocationId: invocation.finalizeInvocationId, checkCommand: invocation.checkCommand },
      { ...invocation, checkCommand: 42 },
    ];
    for (const candidate of invalid) {
      const outcome = await executeBoundFinalize({
        binding: binding(),
        invocation: candidate as typeof invocation,
        store: memoryStore({ claimActive: true }).store,
        ports: ports().ports,
      });
      expect(outcome).toEqual({ type: "err", error: { code: "FINALIZE_BINDING_INVALID" } });
    }
  });

  test("rejects unknown, out-of-order, or mistyped operation journal steps", () => {
    const projectDir = realFixture();
    const record = recordDir(projectDir);
    if (!record) throw new Error("record fixture unavailable");
    const claimPath = join(record, ".amadeus-swarm-referee", "finalize-journal-shape", "claim.json");
    const opened = openOperationJournal({
      claimPath,
      operationId: "journal-shape",
      kind: "metadata-merge",
      request: { unit: "alpha", finalizeRequestDigest: "request-journal-shape" },
    });
    expect(() =>
      recordOperationStep(opened.path, opened.journal, "unknown-step", { verified: true }),
    ).toThrow("operation step invalid");
    expect(() =>
      recordOperationStep(opened.path, opened.journal, "state-merged", {
        event: "STATE_MERGED",
        unit: "alpha",
        operationId: "journal-shape",
        finalizeRequestDigest: "request-journal-shape",
      }),
    ).toThrow("operation step order invalid");
    expect(() =>
      recordOperationStep(opened.path, opened.journal, "bolt-completed", { verified: true }),
    ).toThrow("operation step evidence invalid");
  });

  test("refuses a live competing finalize claim", async () => {
    const outcome = await executeBoundFinalize({
      binding: binding(),
      invocation,
      store: memoryStore({ claimActive: true }).store,
      ports: ports().ports,
    });
    expect(outcome).toEqual({ type: "err", error: { code: "REFEREE_CLAIM_ACTIVE" } });
  });

  test("turns a lying conductor into terminal Unit failures without merge side effects", async () => {
    const memory = memoryStore();
    const p = ports({ reverify: async () => false });
    const outcome = await executeBoundFinalize({ binding: binding(), invocation, store: memory.store, ports: p.ports });
    expect(outcome.type).toBe("ok");
    if (outcome.type === "err") return;
    expect(outcome.value.mergeCompleted).toBeFalse();
    expect(outcome.value.failures).toEqual([
      { unit: "alpha", code: "LYING_CONDUCTOR" },
      { unit: "beta", code: "LYING_CONDUCTOR" },
    ]);
    expect(p.calls.some((entry) => entry.startsWith("aidlc:"))).toBeFalse();
    expect(p.calls.some((entry) => entry.startsWith("code:"))).toBeFalse();
  });

  test("blocks every merge when one Unit changes the protected specification", async () => {
    const memory = memoryStore();
    const p = ports({
      validateUnit: async (unit) =>
        unit.unit === "alpha" ? "PROTECTED_SPEC_BINDING_INVALID" : null,
    });
    const outcome = await executeBoundFinalize({
      binding: binding(),
      invocation,
      store: memory.store,
      ports: p.ports,
    });
    expect(outcome.type).toBe("ok");
    if (outcome.type === "err") return;
    expect(outcome.value.mergeCompleted).toBeFalse();
    expect(outcome.value.failures).toEqual([
      { unit: "alpha", code: "PROTECTED_SPEC_BINDING_INVALID" },
      { unit: "beta", code: "REFEREE_FINALIZE_FAILED" },
    ]);
    expect(p.calls.some((entry) => entry.startsWith("aidlc:"))).toBeFalse();
    expect(p.calls.some((entry) => entry.startsWith("code:"))).toBeFalse();
  });

  test("replays a code operation with the same ID after result-checkpoint failure", async () => {
    const memory = memoryStore({ failCompletedUpdateOnce: true });
    const p = ports();
    const first = await executeBoundFinalize({ binding: binding(), invocation, store: memory.store, ports: p.ports });
    expect(first).toEqual({ type: "err", error: { code: "PERSISTENCE_FAILED" } });
    expect(memory.progress()?.units.alpha.state).toBe("code-merging");
    const second = await executeBoundFinalize({ binding: binding(), invocation, store: memory.store, ports: p.ports });
    expect(second.type).toBe("ok");
    const alphaCodeCalls = p.calls.filter((entry) => entry.startsWith("code:alpha:"));
    expect(alphaCodeCalls).toHaveLength(2);
    expect(new Set(alphaCodeCalls.map((entry) => entry.split(":")[2])).size).toBe(1);
    expect(memory.audit.filter(({ event }) => event === "SWARM_UNIT_CONVERGED")).toHaveLength(2);
    expect(memory.audit.filter(({ event }) => event === "SWARM_COMPLETED")).toHaveLength(1);
  });

  test("sweeps crash-resumed mid-merge Units into terminal failures when a later Unit blocks the merge", async () => {
    const request = binding();
    const memory = memoryStore({ failCompletedUpdateOnce: true });
    const first = await executeBoundFinalize({ binding: request, invocation, store: memory.store, ports: ports().ports });
    expect(first).toEqual({ type: "err", error: { code: "PERSISTENCE_FAILED" } });
    expect(memory.progress()?.units.alpha.state).toBe("code-merging");
    const p = ports({
      validateUnit: async (unit) => (unit.unit === "beta" ? "PROTECTED_SPEC_BINDING_INVALID" : null),
    });
    const outcome = await executeBoundFinalize({ binding: request, invocation, store: memory.store, ports: p.ports });
    expect(outcome.type).toBe("ok");
    if (outcome.type === "err") return;
    expect(outcome.value.mergeCompleted).toBeFalse();
    expect(outcome.value.failures).toEqual([
      { unit: "alpha", code: "REFEREE_FINALIZE_FAILED" },
      { unit: "beta", code: "PROTECTED_SPEC_BINDING_INVALID" },
    ]);
    expect(validateRefereeEnvelope(request, outcome.value).type).toBe("ok");
  });

  test("sweeps crash-resumed mid-merge Units into terminal failures when request validation fails on resume", async () => {
    const request = binding();
    const memory = memoryStore({ failCompletedUpdateOnce: true });
    const first = await executeBoundFinalize({ binding: request, invocation, store: memory.store, ports: ports().ports });
    expect(first).toEqual({ type: "err", error: { code: "PERSISTENCE_FAILED" } });
    expect(memory.progress()?.units.alpha.state).toBe("code-merging");
    const p = ports({ validateRequest: async () => "FINALIZE_BINDING_INVALID" });
    const outcome = await executeBoundFinalize({ binding: request, invocation, store: memory.store, ports: p.ports });
    expect(outcome.type).toBe("ok");
    if (outcome.type === "err") return;
    expect(outcome.value.mergeCompleted).toBeFalse();
    expect(outcome.value.failures).toEqual([
      { unit: "alpha", code: "FINALIZE_BINDING_INVALID" },
      { unit: "beta", code: "FINALIZE_BINDING_INVALID" },
    ]);
    expect(validateRefereeEnvelope(request, outcome.value).type).toBe("ok");
  });

  test("rejects open or digest-tampered stored finalize progress", () => {
    const request = binding();
    const semantic = Object.freeze({
      schemaVersion: 1 as const,
      finalizeInvocationId: request.finalizeInvocationId,
      finalizeRequestDigest: request.finalizeRequestDigest,
      fencingToken: 1,
      units: Object.freeze({
        alpha: Object.freeze({ state: "pending" as const }),
        beta: Object.freeze({ state: "verified" as const }),
      }),
    });
    const valid = Object.freeze({ ...semantic, progressDigest: digestValue(semantic) });
    expect(parseFinalizeProgress(valid, request).progressDigest).toBe(valid.progressDigest);
    expect(() => parseFinalizeProgress({ ...valid, fencingToken: 2 }, request)).toThrow("progress conflict");
    expect(() =>
      parseFinalizeProgress(
        { ...valid, units: { ...valid.units, alpha: { state: "pending", unexpected: true } } },
        request,
      ),
    ).toThrow("progress conflict");
  });

  test("rejects digest-tampered stored claim and result files", () => {
    const request = binding();
    for (const artifact of ["claim", "result"] as const) {
      const projectDir = realFixture();
      const record = recordDir(projectDir);
      if (!record) throw new Error("record fixture unavailable");
      const dir = join(record, ".amadeus-swarm-referee", `finalize-${request.finalizeInvocationId}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "request.json"), JSON.stringify(request));
      if (artifact === "claim") {
        const semantic = Object.freeze({
          schemaVersion: 1 as const,
          finalizeInvocationId: request.finalizeInvocationId,
          finalizeRequestDigest: request.finalizeRequestDigest,
          ownerPid: process.pid,
          ownerStartTokenHash: "owner",
          fencingToken: 1,
          expiresAt: "2026-07-14T00:00:00.000Z",
          status: "active" as const,
        });
        writeFileSync(
          join(dir, "claim.json"),
          JSON.stringify({ ...semantic, fencingToken: 2, claimDigest: digestValue(semantic) }),
        );
      } else {
        const envelope = buildRefereeFinalizeEnvelope({
          executionId: request.executionId,
          attemptId: request.attemptId,
          finalizeInvocationId: request.finalizeInvocationId,
          finalizeRequestDigest: request.finalizeRequestDigest,
          batch: request.batch,
          units: [],
          failures: request.expectedUnits.map(({ unit }) => ({ unit, code: "REFEREE_FINALIZE_FAILED" as const })),
          mergeCompleted: false,
        });
        if (envelope.type === "err") throw new Error("result fixture failed");
        writeFileSync(join(dir, "result.json"), JSON.stringify({ ...envelope.value, resultDigest: "tampered" }));
      }
      expect(() => createFileBoundFinalizeStore({ projectDir }).acquire(request)).toThrow();
    }
  });

  test("rejects open or digest-tampered operation claims before a merge primitive", () => {
    const projectDir = realFixture();
    const record = recordDir(projectDir);
    if (!record) throw new Error("record fixture unavailable");
    const finalizeInvocationId = "operation-claim-fixture";
    const claimDir = join(record, ".amadeus-swarm-referee", `finalize-${finalizeInvocationId}`);
    const claimPath = join(claimDir, "claim.json");
    mkdirSync(claimDir, { recursive: true });
    const semantic = Object.freeze({
      schemaVersion: 1 as const,
      finalizeInvocationId,
      finalizeRequestDigest: "request-digest",
      ownerPid: process.pid,
      ownerStartTokenHash: "owner-start-token",
      fencingToken: 1,
      expiresAt: "2030-07-14T00:00:00.000Z",
      status: "active" as const,
    });
    const operationId = finalizeOperationId(finalizeInvocationId, "alpha", "metadata-merge");
    const validates = () =>
      validateFinalizeOperationClaim({
        projectDir,
        claimPath,
        operationId,
        fencingToken: 1,
        unit: "alpha",
        operation: "metadata-merge",
        now: new Date("2026-07-14T00:00:00.000Z"),
      });

    writeFileSync(claimPath, JSON.stringify({ ...semantic, claimDigest: digestValue(semantic) }));
    expect(validates()).toBeTrue();
    writeFileSync(
      claimPath,
      JSON.stringify({ ...semantic, unexpected: true, claimDigest: digestValue({ ...semantic, unexpected: true }) }),
    );
    expect(validates()).toBeFalse();
    writeFileSync(claimPath, JSON.stringify({ ...semantic, claimDigest: "tampered" }));
    expect(validates()).toBeFalse();
  });

  test("recovers the exact armed process group before fencing a stale claimant", async () => {
    const projectDir = realFixture();
    const request = binding();
    const record = recordDir(projectDir);
    if (!record) throw new Error("record fixture unavailable");
    const dir = join(record, ".amadeus-swarm-referee", `finalize-${request.finalizeInvocationId}`);
    mkdirSync(dir, { recursive: true });
    const child = spawn(process.execPath, ["-e", "await Bun.sleep(60_000)"], {
      cwd: projectDir,
      detached: true,
      stdio: "ignore",
    });
    if (!child.pid) throw new Error("child fixture unavailable");
    let identity = observeProcessIdentity(child.pid);
    for (let attempt = 0; identity.type === "err" && attempt < 50; attempt += 1) {
      await Bun.sleep(10);
      identity = observeProcessIdentity(child.pid);
    }
    if (identity.type === "err") throw new Error("child identity unavailable");
    try {
      const claimSemantic = Object.freeze({
        schemaVersion: 1 as const,
        finalizeInvocationId: request.finalizeInvocationId,
        finalizeRequestDigest: request.finalizeRequestDigest,
        ownerPid: 2_147_483_647,
        ownerStartTokenHash: "dead-owner",
        fencingToken: 1,
        expiresAt: "2026-07-14T00:00:00.000Z",
        status: "active" as const,
      });
      const plan = Object.freeze({
        schemaVersion: 1 as const,
        runId: "stale-run",
        identityPath: join(dir, "stale-run", "identity.json"),
        armPath: join(dir, "stale-run", "arm.json"),
        armDigest: "arm-digest",
        armDeadline: "2026-07-14T00:00:00.000Z",
      });
      const runSemantic = Object.freeze({
        schemaVersion: 1 as const,
        runId: plan.runId,
        phase: "armed" as const,
        plan,
        identity: identity.value,
        armReceiptDigest: "receipt-digest",
      });
      const run = Object.freeze({ ...runSemantic, progressDigest: digestValue(runSemantic) });
      const progressSemantic = Object.freeze({
        schemaVersion: 1 as const,
        finalizeInvocationId: request.finalizeInvocationId,
        finalizeRequestDigest: request.finalizeRequestDigest,
        fencingToken: 1,
        units: Object.freeze({
          alpha: Object.freeze({ state: "metadata-merging" as const, operationId: "metadata-alpha", run }),
          beta: Object.freeze({ state: "pending" as const }),
        }),
      });
      writeFileSync(join(dir, "request.json"), JSON.stringify(request));
      writeFileSync(
        join(dir, "claim.json"),
        JSON.stringify({ ...claimSemantic, claimDigest: digestValue(claimSemantic) }),
      );
      writeFileSync(
        join(dir, "progress.json"),
        JSON.stringify({ ...progressSemantic, progressDigest: digestValue(progressSemantic) }),
      );

      const acquired = createFileBoundFinalizeStore({
        projectDir,
        now: () => new Date("2026-07-14T00:01:00.000Z"),
      }).acquire(request);
      expect(acquired.claim.fencingToken).toBe(2);
      await Promise.race([
        new Promise<void>((resolveClose) => child.once("close", () => resolveClose())),
        Bun.sleep(1_000),
      ]);
      const after = observeProcessIdentity(identity.value.pid, identity.value.platform);
      expect(after.type === "err" || !sameProcess(identity.value, after.value)).toBeTrue();
    } finally {
      try {
        process.kill(-identity.value.processGroupId, "SIGKILL");
      } catch {
        // The takeover path already terminated the exact process group.
      }
    }
  });

  test("resumes real Git cleanup without a duplicate commit after code landed before its journal marker", () => {
    const projectDir = realFixture();
    const swarmTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-swarm.ts");
    const worktreeTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-worktree.ts");
    const prepared = spawnSync(
      process.execPath,
      [swarmTool, "--project-dir", projectDir, "prepare", "--batch", "1", "--units", "alpha,beta", "--base", "main"],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(prepared.status).toBe(0);
    const unitPath = join(projectDir, ".amadeus", "worktrees", "bolt-alpha");
    writeFileSync(join(unitPath, "alpha-crash.txt"), "alpha\n");
    git(unitPath, ["add", "alpha-crash.txt"]);
    git(unitPath, ["commit", "-q", "-m", "feat: crash fixture"]);
    const targetBefore = git(projectDir, ["rev-parse", "HEAD"]);
    const sourceHead = git(unitPath, ["rev-parse", "HEAD"]);
    const invocationId = "finalize-crash";
    const operationId = finalizeOperationId(invocationId, "alpha", "code-merge");
    const record = recordDir(projectDir);
    if (!record) throw new Error("record fixture unavailable");
    const claimDir = join(record, ".amadeus-swarm-referee", `finalize-${invocationId}`);
    mkdirSync(claimDir, { recursive: true });
    const claimSemantic = Object.freeze({
      schemaVersion: 1 as const,
      finalizeInvocationId: invocationId,
      finalizeRequestDigest: "request-crash",
      ownerPid: process.pid,
      ownerStartTokenHash: "owner-crash",
      fencingToken: 1,
      expiresAt: "2099-01-01T00:00:00.000Z",
      status: "active" as const,
    });
    const claimPath = join(claimDir, "claim.json");
    writeFileSync(claimPath, JSON.stringify({ ...claimSemantic, claimDigest: digestValue(claimSemantic) }));

    git(projectDir, ["merge", "--squash", "bolt-alpha"]);
    git(projectDir, ["commit", "-m", `Merge crash fixture\n\nAmadeus-Operation: ${operationId}`]);
    const landed = git(projectDir, ["rev-parse", "HEAD"]);
    const countBeforeResume = git(projectDir, ["rev-list", "--count", "HEAD"]);

    const resumed = spawnSync(
      process.execPath,
      [
        worktreeTool,
        "--project-dir",
        projectDir,
        "merge",
        "--slug",
        "alpha",
        "--target",
        "main",
        "--strategy",
        "squash",
        "--message",
        "Merge crash fixture",
        "--operation-id",
        operationId,
        "--claim-file",
        claimPath,
        "--fencing-token",
        "1",
        "--metadata-merged",
        "true",
        "--expected-target-head",
        targetBefore,
        "--expected-source-head",
        sourceHead,
      ],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(resumed.status).toBe(0);
    expect(git(projectDir, ["rev-parse", "HEAD"])).toBe(landed);
    expect(git(projectDir, ["rev-list", "--count", "HEAD"])).toBe(countBeforeResume);
    expect(existsSync(unitPath)).toBeFalse();
    const journal = parseOperationJournal(
      JSON.parse(readFileSync(join(claimDir, "operations", `${operationId}.json`), "utf-8")),
    );
    expect(Object.keys(journal.completedSteps).sort()).toEqual([
      "audit-intent",
      "branch-deleted",
      "code-landed",
      "worktree-removed",
    ]);
    expect(journal.result).toBeDefined();

    writeFileSync(join(projectDir, "post-finalize.txt"), "later\n");
    git(projectDir, ["add", "post-finalize.txt"]);
    git(projectDir, ["commit", "-q", "-m", "feat: advance target after finalize"]);
    const replayed = spawnSync(
      process.execPath,
      [
        worktreeTool,
        "--project-dir",
        projectDir,
        "merge",
        "--slug",
        "alpha",
        "--target",
        "main",
        "--strategy",
        "squash",
        "--message",
        "Merge crash fixture",
        "--operation-id",
        operationId,
        "--claim-file",
        claimPath,
        "--fencing-token",
        "1",
        "--metadata-merged",
        "true",
        "--expected-target-head",
        targetBefore,
        "--expected-source-head",
        sourceHead,
      ],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(replayed.status).not.toBe(0);
    expect(`${replayed.stdout}\n${replayed.stderr}`).toContain(
      "Target HEAD no longer matches the bound code-landed commit.",
    );
  });

  test("resumes metadata merge from an observed state-merge postcondition", () => {
    const projectDir = realFixture();
    const swarmTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-swarm.ts");
    const boltTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-bolt.ts");
    const stateTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-state.ts");
    const prepared = spawnSync(
      process.execPath,
      [swarmTool, "--project-dir", projectDir, "prepare", "--batch", "1", "--units", "alpha,beta", "--base", "main"],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(prepared.status).toBe(0);
    const invocationId = "finalize-metadata-crash";
    const operationId = finalizeOperationId(invocationId, "alpha", "metadata-merge");
    const record = recordDir(projectDir);
    if (!record) throw new Error("record fixture unavailable");
    const claimDir = join(record, ".amadeus-swarm-referee", `finalize-${invocationId}`);
    mkdirSync(claimDir, { recursive: true });
    const claimSemantic = Object.freeze({
      schemaVersion: 1 as const,
      finalizeInvocationId: invocationId,
      finalizeRequestDigest: "request-metadata-crash",
      ownerPid: process.pid,
      ownerStartTokenHash: "owner-metadata-crash",
      fencingToken: 1,
      expiresAt: "2099-01-01T00:00:00.000Z",
      status: "active" as const,
    });
    const claimPath = join(claimDir, "claim.json");
    writeFileSync(claimPath, JSON.stringify({ ...claimSemantic, claimDigest: digestValue(claimSemantic) }));
    const mergedState = spawnSync(
      process.execPath,
      [
        stateTool,
        "merge",
        "--slug",
        "alpha",
        "--operation-id",
        operationId,
        "--finalize-request-digest",
        claimSemantic.finalizeRequestDigest,
        "--project-dir",
        projectDir,
      ],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(mergedState.status).toBe(0);

    const resumed = spawnSync(
      process.execPath,
      [
        boltTool,
        "--project-dir",
        projectDir,
        "complete",
        "--merge",
        "--slug",
        "alpha",
        "--batch",
        "1",
        "--name",
        "alpha",
        "--operation-id",
        operationId,
        "--finalize-request-digest",
        claimSemantic.finalizeRequestDigest,
        "--claim-file",
        claimPath,
        "--fencing-token",
        "1",
      ],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(resumed.status).toBe(0);
    const journal = parseOperationJournal(
      JSON.parse(readFileSync(join(claimDir, "operations", `${operationId}.json`), "utf-8")),
    );
    expect(Object.keys(journal.completedSteps).sort()).toEqual([
      "audit-merged",
      "bolt-completed",
      "runtime-fragment-merged",
      "state-merged",
    ]);
    expect(journal.result).toBeDefined();
  });

  test("does not treat a historical metadata audit row as the current operation postcondition", () => {
    const projectDir = realFixture();
    const swarmTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-swarm.ts");
    const boltTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-bolt.ts");
    const stateTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-state.ts");
    expect(spawnSync(
      process.execPath,
      [swarmTool, "--project-dir", projectDir, "prepare", "--batch", "1", "--units", "alpha,beta", "--base", "main"],
      { cwd: projectDir, encoding: "utf-8" },
    ).status).toBe(0);

    const invocationId = "finalize-current-metadata";
    const operationId = finalizeOperationId(invocationId, "alpha", "metadata-merge");
    const historicalMerge = spawnSync(
      process.execPath,
      [
        stateTool,
        "merge",
        "--slug",
        "alpha",
        "--operation-id",
        "historical-operation",
        "--finalize-request-digest",
        "historical-request",
        "--project-dir",
        projectDir,
      ],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(historicalMerge.status).toBe(0);

    const record = recordDir(projectDir);
    if (!record) throw new Error("record fixture unavailable");
    const claimDir = join(record, ".amadeus-swarm-referee", `finalize-${invocationId}`);
    mkdirSync(claimDir, { recursive: true });
    const claimSemantic = Object.freeze({
      schemaVersion: 1 as const,
      finalizeInvocationId: invocationId,
      finalizeRequestDigest: "current-request",
      ownerPid: process.pid,
      ownerStartTokenHash: "owner-current-metadata",
      fencingToken: 1,
      expiresAt: "2099-01-01T00:00:00.000Z",
      status: "active" as const,
    });
    const claimPath = join(claimDir, "claim.json");
    writeFileSync(claimPath, JSON.stringify({ ...claimSemantic, claimDigest: digestValue(claimSemantic) }));

    const resumed = spawnSync(
      process.execPath,
      [
        boltTool,
        "--project-dir",
        projectDir,
        "complete",
        "--merge",
        "--slug",
        "alpha",
        "--batch",
        "1",
        "--name",
        "alpha",
        "--operation-id",
        operationId,
        "--finalize-request-digest",
        claimSemantic.finalizeRequestDigest,
        "--claim-file",
        claimPath,
        "--fencing-token",
        "1",
      ],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(resumed.status).not.toBe(0);
    expect(`${resumed.stdout}\n${resumed.stderr}`).toContain("already merged");
    const journal = parseOperationJournal(
      JSON.parse(readFileSync(join(claimDir, "operations", `${operationId}.json`), "utf-8")),
    );
    expect(Object.keys(journal.completedSteps)).toEqual(["bolt-completed"]);
  });

  test("re-runs the state merge when the audit row exists but Bolt Refs still holds the slug", () => {
    // Crash window: handleMerge appends STATE_MERGED before writeStateFile, so
    // a crash between the two leaves the audit row on disk with main state
    // unmerged. The resumed journal must NOT trust the row alone.
    const projectDir = realFixture();
    const swarmTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-swarm.ts");
    const boltTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-bolt.ts");
    expect(spawnSync(
      process.execPath,
      [swarmTool, "--project-dir", projectDir, "prepare", "--batch", "1", "--units", "alpha,beta", "--base", "main"],
      { cwd: projectDir, encoding: "utf-8" },
    ).status).toBe(0);

    const invocationId = "finalize-crash-window";
    const operationId = finalizeOperationId(invocationId, "alpha", "metadata-merge");
    appendAuditEntry(
      "STATE_MERGED",
      {
        "Bolt slug": "alpha",
        "Operation ID": operationId,
        "Finalize request digest": "crash-window-request",
      },
      projectDir,
    );
    expect(getField(readStateFile(projectDir), "Bolt Refs") ?? "").toContain("alpha");

    // In-process seam: the resumed step must ignore the audit row while the
    // slug still sits in main's Bolt Refs, and only accept it once removed.
    const auditRow = Object.freeze({ event: "STATE_MERGED", unit: "alpha" });
    const postconditionFlags = { slug: "alpha" };
    expect(stateMergedPostcondition(projectDir, postconditionFlags, () => null)).toBeNull();
    expect(stateMergedPostcondition(projectDir, postconditionFlags, () => auditRow)).toBeNull();

    const record = recordDir(projectDir);
    if (!record) throw new Error("record fixture unavailable");
    const claimDir = join(record, ".amadeus-swarm-referee", `finalize-${invocationId}`);
    mkdirSync(claimDir, { recursive: true });
    const claimSemantic = Object.freeze({
      schemaVersion: 1 as const,
      finalizeInvocationId: invocationId,
      finalizeRequestDigest: "crash-window-request",
      ownerPid: process.pid,
      ownerStartTokenHash: "owner-crash-window",
      fencingToken: 1,
      expiresAt: "2099-01-01T00:00:00.000Z",
      status: "active" as const,
    });
    const claimPath = join(claimDir, "claim.json");
    writeFileSync(claimPath, JSON.stringify({ ...claimSemantic, claimDigest: digestValue(claimSemantic) }));

    const resumed = spawnSync(
      process.execPath,
      [
        boltTool,
        "--project-dir",
        projectDir,
        "complete",
        "--merge",
        "--slug",
        "alpha",
        "--batch",
        "1",
        "--name",
        "alpha",
        "--operation-id",
        operationId,
        "--finalize-request-digest",
        claimSemantic.finalizeRequestDigest,
        "--claim-file",
        claimPath,
        "--fencing-token",
        "1",
      ],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(resumed.status, `${resumed.stdout}\n${resumed.stderr}`).toBe(0);
    expect(getField(readStateFile(projectDir), "Bolt Refs") ?? "").not.toContain("alpha");
    expect(stateMergedPostcondition(projectDir, postconditionFlags, () => auditRow)).toBe(auditRow);
    const journal = parseOperationJournal(
      JSON.parse(readFileSync(join(claimDir, "operations", `${operationId}.json`), "utf-8")),
    );
    expect(Object.keys(journal.completedSteps).sort()).toEqual([
      "audit-merged",
      "bolt-completed",
      "runtime-fragment-merged",
      "state-merged",
    ]);
  });

  test("runs the bound CLI through real AIDLC and code merges for two Units", () => {
    const projectDir = realFixture();
    const swarmTool = join(process.cwd(), "packages", "framework", "core", "tools", "amadeus-swarm.ts");
    const prepared = spawnSync(
      process.execPath,
      [
        swarmTool,
        "--project-dir",
        projectDir,
        "prepare",
        "--batch",
        "1",
        "--units",
        "alpha,beta",
        "--base",
        "main",
      ],
      { cwd: projectDir, encoding: "utf-8" },
    );
    expect(prepared.status).toBe(0);
    const units = ["alpha", "beta"] as const;
    for (const unit of units) {
      const worktree = join(projectDir, ".amadeus", "worktrees", `bolt-${unit}`);
      writeFileSync(join(worktree, `${unit}.txt`), `${unit}\n`);
      git(worktree, ["add", `${unit}.txt`]);
      git(worktree, ["commit", "-q", "-m", `feat: implement ${unit}`]);
    }
    const targetBeforeCommit = git(projectDir, ["rev-parse", "HEAD"]);
    const commonDir = git(projectDir, ["rev-parse", "--git-common-dir"]);
    const bound = buildFinalizeRequestBinding({
      executionId: "execution-real",
      attemptId: "attempt-real",
      finalizeInvocationId: "finalize-real",
      batch: 1,
      planDigest: "plan-real",
      worktreeManifestDigest: "manifest-real",
      expectedUnits: units.map((unit) => {
        const worktree = join(projectDir, ".amadeus", "worktrees", `bolt-${unit}`);
        return {
          unit,
          worktreePathDigest: digestValue(resolve(worktree)),
          baseCommit: git(worktree, ["merge-base", "main", "HEAD"]),
          headCommit: git(worktree, ["rev-parse", "HEAD"]),
        };
      }),
      claimedUnits: units,
      declinedUnits: [],
      checkCommandDigest: digestValue("test -f alpha.txt || test -f beta.txt"),
      protectedSpec: { kind: "none" },
      repoIdentityDigest: digestValue(resolve(projectDir, commonDir)),
      mergeTargetBranch: "main",
      targetBeforeCommit,
      mergeStrategy: "squash",
      mergeMessageDigest: digestValue("Merge real swarm"),
    });
    if (bound.type === "err") throw new Error("binding fixture failed");
    const bindingPath = join(projectDir, "bound-finalize.json");
    const invocationPath = join(projectDir, "bound-invocation.json");
    writeFileSync(bindingPath, JSON.stringify(bound.value));
    writeFileSync(
      invocationPath,
      JSON.stringify({
        schemaVersion: 1,
        finalizeInvocationId: "finalize-real",
        checkCommand: "test -f alpha.txt || test -f beta.txt",
        mergeMessage: "Merge real swarm",
      }),
    );
    const record = recordDir(projectDir);
    if (!record) throw new Error("record fixture unavailable");
    const finalizeDir = join(record, ".amadeus-swarm-referee", "finalize-finalize-real");
    const metadataOperationId = finalizeOperationId("finalize-real", "alpha", "metadata-merge");
    mkdirSync(join(finalizeDir, metadataOperationId), { recursive: true });
    writeFileSync(join(finalizeDir, metadataOperationId, "arm.json.consumed"), "stale\n");
    const staleClaimSemantic = Object.freeze({
      schemaVersion: 1 as const,
      finalizeInvocationId: "finalize-real",
      finalizeRequestDigest: bound.value.finalizeRequestDigest,
      ownerPid: 2_147_483_647,
      ownerStartTokenHash: "dead-finalize-owner",
      fencingToken: 1,
      expiresAt: "2000-01-01T00:00:00.000Z",
      status: "active" as const,
    });
    const staleProgressSemantic = Object.freeze({
      schemaVersion: 1 as const,
      finalizeInvocationId: "finalize-real",
      finalizeRequestDigest: bound.value.finalizeRequestDigest,
      fencingToken: 1,
      units: Object.freeze({
        alpha: Object.freeze({ state: "metadata-merging" as const, operationId: metadataOperationId }),
        beta: Object.freeze({ state: "pending" as const }),
      }),
    });
    writeFileSync(join(finalizeDir, "request.json"), JSON.stringify(bound.value));
    writeFileSync(
      join(finalizeDir, "claim.json"),
      JSON.stringify({ ...staleClaimSemantic, claimDigest: digestValue(staleClaimSemantic) }),
    );
    writeFileSync(
      join(finalizeDir, "progress.json"),
      JSON.stringify({ ...staleProgressSemantic, progressDigest: digestValue(staleProgressSemantic) }),
    );
    const finalized = spawnSync(
      process.execPath,
      [
        swarmTool,
        "--project-dir",
        projectDir,
        "finalize",
        "--binding-file",
        bindingPath,
        "--invocation-file",
        invocationPath,
      ],
      { cwd: projectDir, encoding: "utf-8", timeout: 120_000 },
    );
    expect(finalized.stderr).toBe("");
    expect(readAllAuditShards(projectDir)).not.toContain("**Event**: ERROR_LOGGED");
    const output = JSON.parse(finalized.stdout);
    expect(output).toMatchObject({ type: "ok", value: { mergeCompleted: true, failures: [] } });
    expect(finalized.status).toBe(0);
    expect(output.value.units.map((unit: { unit: string }) => unit.unit)).toEqual(["alpha", "beta"]);
    expect(existsSync(join(projectDir, "alpha.txt"))).toBeTrue();
    expect(existsSync(join(projectDir, "beta.txt"))).toBeTrue();
    expect(existsSync(join(projectDir, ".amadeus", "worktrees", "bolt-alpha"))).toBeFalse();
    expect(existsSync(join(projectDir, ".amadeus", "worktrees", "bolt-beta"))).toBeFalse();
    const terminalClaim = JSON.parse(readFileSync(join(finalizeDir, "claim.json"), "utf-8")) as {
      fencingToken: number;
      status: string;
    };
    expect(terminalClaim).toMatchObject({ fencingToken: 2, status: "terminal" });
    const metadataJournal = parseOperationJournal(
      JSON.parse(readFileSync(join(finalizeDir, "operations", `${metadataOperationId}.json`), "utf-8")),
    );
    expect(metadataJournal.operationId).toBe(metadataOperationId);
    expect(metadataJournal.result).toBeDefined();
  }, 120_000);
});
