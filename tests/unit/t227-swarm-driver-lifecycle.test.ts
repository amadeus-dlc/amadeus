// covers: module:amadeus-swarm-driver-lifecycle, requirement:FR-18, requirement:FR-20, requirement:FR-21
// size: large

import { describe, expect, test } from "bun:test";
import {
  applyTransition,
  buildFinalizeRequestBinding,
  buildRefereeFinalizeEnvelope,
  buildTransition,
  canonicalPreparedUnits,
  createProbingCheckpoint,
  digestValue,
  parseFinalizeRequestBinding,
  rejectSecretLikeFields,
  validateRefereeEnvelope,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";

const now = "2026-07-14T00:00:00.000Z";

function probing(origin: "initial" | "resumed" = "initial") {
  return createProbingCheckpoint({
    executionId: "exec-1",
    attemptId: origin === "initial" ? "attempt-1" : "attempt-2",
    batch: 1,
    origin,
    ...(origin === "resumed" ? { previousAttemptId: "attempt-1" } : {}),
    nonceHash: "nonce-hash",
    mutationId: "begin-1",
    lease: {
      leaseId: "lease-1",
      fencingToken: origin === "initial" ? 1 : 2,
      ownerId: "owner-1",
      heartbeatAt: now,
      expiresAt: "2026-07-14T00:00:30.000Z",
    },
    selectionInput: {
      requested: { source: "default", requested: "auto" },
      harness: "codex",
      batch: 1,
      expectedUnits: ["beta", "alpha"],
      topologySignals: [],
    },
    reusedConvergedUnits: origin === "resumed" ? ["alpha"] : [],
  });
}

describe("t227 swarm driver lifecycle", () => {
  test("builds a canonical pre-probe checkpoint without selected context", () => {
    const result = probing();
    expect(result.type).toBe("ok");
    if (result.type === "err") return;
    expect(result.value.state).toBe("probing");
    expect(result.value.selectionInput.expectedUnits).toEqual(["alpha", "beta"]);
    expect("selectedContext" in result.value).toBeFalse();
    expect(result.value.stateDigest).toHaveLength(64);
  });

  test("requires previousAttemptId only for resumed attempts", () => {
    const initial = probing();
    if (initial.type === "err") throw new Error("fixture failed");
    const invalid = createProbingCheckpoint({
      ...initial.value,
      origin: "initial",
      previousAttemptId: "old",
      mutationId: "begin-2",
      nonceHash: "nonce-2",
      selectionInput: {
        requested: { source: "default", requested: "auto" },
        harness: "codex",
        batch: 1,
        expectedUnits: ["a", "b"],
        topologySignals: [],
      },
    } as never);
    expect(invalid).toEqual({ type: "err", error: { code: "INVALID_ORIGIN", field: undefined } });
    const resumed = probing("resumed");
    expect(resumed.type).toBe("ok");
    if (resumed.type === "ok") expect(resumed.value.unitStates.alpha).toBe("referee-converged");
  });

  test("accepts only a closed probing-to-selected transition", () => {
    const initial = probing();
    expect(initial.type).toBe("ok");
    if (initial.type === "err") return;
    const post = {
      ...initial.value,
      state: "selected" as const,
      selectedContext: {
        selection: {
          kind: "floor-selection" as const,
          schemaVersion: 1 as const,
          source: "default" as const,
          requested: "auto" as const,
          selected: "codex-exec-floor" as const,
          executionMode: "floor" as const,
          harness: "codex" as const,
          topology: { topology: "unknown" as const, reason: "no-signal" as const, signals: [] },
          fallbackReason: "native-surface-unavailable" as const,
          capabilityDetails: ["NATIVE_SURFACE_UNAVAILABLE" as const],
        },
        probeDigest: "probe",
        planDigest: "plan",
      },
    };
    const transition = buildTransition(initial.value, {
      transitionId: "transition-1",
      edge: "probe-selected",
      executionId: "exec-1",
      attemptId: "attempt-1",
      leaseId: "lease-1",
      fencingToken: 1,
      post,
    });
    expect(transition.type).toBe("ok");
    if (transition.type === "err") return;
    const applied = applyTransition(initial.value, transition.value);
    expect(applied.type).toBe("ok");
    if (applied.type === "ok") expect(applied.value.state).toBe("selected");

    expect(buildTransition(initial.value, { ...transition.value, edge: "referee-succeeded", post })).toEqual({
      type: "err",
      error: { code: "INVALID_EDGE", field: undefined },
    });
  });

  test("rejects stale fencing and digest mismatches", () => {
    const initial = probing();
    if (initial.type === "err") throw new Error("fixture failed");
    const transition = buildTransition(initial.value, {
      transitionId: "transition-1",
      edge: "attempt-failed",
      executionId: "exec-1",
      attemptId: "attempt-1",
      leaseId: "lease-1",
      fencingToken: 1,
      post: {
        ...initial.value,
        state: "failed-resumable",
        failure: { code: "COORDINATOR_FAILED", affectedUnits: ["alpha"], failedFromState: "probing" },
      },
    });
    if (transition.type === "err") throw new Error("fixture failed");
    expect(applyTransition({ ...initial.value, stateDigest: "wrong" }, transition.value).type).toBe("err");
    expect(buildTransition(initial.value, { ...transition.value, fencingToken: 0 }).type).toBe("err");
  });

  test("canonicalizes and binds the complete finalize request", () => {
    const binding = buildFinalizeRequestBinding({
      executionId: "exec-1",
      attemptId: "attempt-1",
      finalizeInvocationId: "finalize-1",
      batch: 1,
      planDigest: "plan",
      worktreeManifestDigest: "manifest",
      expectedUnits: [
        { unit: "beta", worktreePathDigest: "b-path", baseCommit: "base", headCommit: "b-head" },
        { unit: "alpha", worktreePathDigest: "a-path", baseCommit: "base", headCommit: "a-head" },
      ],
      claimedUnits: ["alpha"],
      declinedUnits: [{ unit: "beta", reason: "unsatisfiable" }],
      checkCommandDigest: digestValue("bun test"),
      protectedSpec: { kind: "none" },
      repoIdentityDigest: "repo",
      mergeTargetBranch: "main",
      targetBeforeCommit: "target",
      mergeStrategy: "squash",
      mergeMessageDigest: digestValue("merge"),
    });
    expect(binding.type).toBe("ok");
    if (binding.type === "err") return;
    expect(binding.value.expectedUnits.map((unit) => unit.unit)).toEqual(["alpha", "beta"]);
    expect(binding.value.finalizeRequestDigest).toHaveLength(64);
  });

  test("rejects overlapping or incomplete claimed/declined partitions", () => {
    const base = {
      executionId: "exec-1",
      attemptId: "attempt-1",
      finalizeInvocationId: "finalize-1",
      batch: 1,
      planDigest: "plan",
      worktreeManifestDigest: "manifest",
      expectedUnits: [
        { unit: "alpha", worktreePathDigest: "a", baseCommit: "base", headCommit: "head" },
        { unit: "beta", worktreePathDigest: "b", baseCommit: "base", headCommit: "head" },
      ],
      claimedUnits: ["alpha"],
      declinedUnits: [] as const,
      checkCommandDigest: "check",
      protectedSpec: { kind: "none" as const },
      repoIdentityDigest: "repo",
      mergeTargetBranch: "main",
      targetBeforeCommit: "target",
      mergeStrategy: "squash" as const,
      mergeMessageDigest: "message",
    };
    expect(buildFinalizeRequestBinding(base).type).toBe("err");
    expect(
      buildFinalizeRequestBinding({
        ...base,
        declinedUnits: [{ unit: "alpha", reason: "unsatisfiable" }],
      }).type,
    ).toBe("err");
  });

  test("rejects incomplete PreparedUnit values and open finalize bindings", () => {
    expect(canonicalPreparedUnits([{ unit: "alpha" }, { unit: "beta" }] as never).type).toBe("err");
    expect(
      canonicalPreparedUnits([
        { unit: "alpha", worktreePath: "/a", branchName: "a", extra: true },
        { unit: "beta", worktreePath: "/b", branchName: "b" },
      ] as never).type,
    ).toBe("err");
    const valid = buildFinalizeRequestBinding({
      executionId: "exec",
      attemptId: "attempt",
      finalizeInvocationId: "finalize",
      batch: 1,
      planDigest: "plan",
      worktreeManifestDigest: "manifest",
      expectedUnits: [
        { unit: "alpha", worktreePathDigest: "a", baseCommit: "base", headCommit: "head-a" },
        { unit: "beta", worktreePathDigest: "b", baseCommit: "base", headCommit: "head-b" },
      ],
      claimedUnits: ["alpha", "beta"],
      declinedUnits: [],
      checkCommandDigest: "check",
      protectedSpec: { kind: "none" },
      repoIdentityDigest: "repo",
      mergeTargetBranch: "main",
      targetBeforeCommit: "base",
      mergeStrategy: "squash",
      mergeMessageDigest: "message",
    });
    if (valid.type === "err") throw new Error("fixture failed");
    expect(buildFinalizeRequestBinding({ ...valid.value, extra: true } as never).type).toBe("err");
    expect(
      buildFinalizeRequestBinding({
        ...valid.value,
        protectedSpec: { kind: "unknown" },
      } as never).type,
    ).toBe("err");
    expect(
      buildFinalizeRequestBinding({
        ...valid.value,
        expectedUnits: [{ ...valid.value.expectedUnits[0], baseCommit: "" }, valid.value.expectedUnits[1]],
      } as never).type,
    ).toBe("err");
    expect(parseFinalizeRequestBinding({ ...valid.value, finalizeRequestDigest: "tampered" }).type).toBe("err");
  });

  test("accepts only an exact request-bound referee envelope", () => {
    const binding = buildFinalizeRequestBinding({
      executionId: "exec-1",
      attemptId: "attempt-1",
      finalizeInvocationId: "finalize-1",
      batch: 1,
      planDigest: "plan",
      worktreeManifestDigest: "manifest",
      expectedUnits: [
        { unit: "alpha", worktreePathDigest: "a", baseCommit: "base", headCommit: "head-a" },
        { unit: "beta", worktreePathDigest: "b", baseCommit: "base", headCommit: "head-b" },
      ],
      claimedUnits: ["alpha", "beta"],
      declinedUnits: [],
      checkCommandDigest: "check",
      protectedSpec: { kind: "none" },
      repoIdentityDigest: "repo",
      mergeTargetBranch: "main",
      targetBeforeCommit: "target",
      mergeStrategy: "squash",
      mergeMessageDigest: "message",
    });
    if (binding.type === "err") throw new Error("fixture failed");
    const unit = (name: string) => ({
      unit: name,
      aidlcMerge: { stateMergeDigest: "state", auditMergeDigest: "audit", runtimeFragmentMergeDigest: "runtime" },
      codeMerge: {
        strategy: "squash" as const,
        targetBeforeCommit: "before",
        targetAfterCommit: `after-${name}`,
        resultTreeDigest: `tree-${name}`,
      },
      cleanup: "completed" as const,
      unitAuditDigest: `audit-${name}`,
    });
    const envelope = buildRefereeFinalizeEnvelope({
      executionId: "exec-1",
      attemptId: "attempt-1",
      finalizeInvocationId: "finalize-1",
      finalizeRequestDigest: binding.value.finalizeRequestDigest,
      batch: 1,
      units: [unit("beta"), unit("alpha")],
      failures: [],
      mergeCompleted: true,
    });
    if (envelope.type === "err") throw new Error("fixture failed");
    expect(validateRefereeEnvelope(binding.value, envelope.value).type).toBe("ok");
    expect(validateRefereeEnvelope(binding.value, { ...envelope.value, attemptId: "other" }).type).toBe("err");
    expect(
      buildRefereeFinalizeEnvelope({
        executionId: "exec-1",
        attemptId: "attempt-1",
        finalizeInvocationId: "finalize-1",
        finalizeRequestDigest: binding.value.finalizeRequestDigest,
        batch: 1,
        units: [{ ...unit("alpha"), cleanup: "pending" as never }],
        failures: [{ unit: "beta", code: "REFEREE_FINALIZE_FAILED" }],
        mergeCompleted: false,
      }).type,
    ).toBe("err");
  });

  test("rejects secret-like fields without echoing their values", () => {
    const result = rejectSecretLikeFields({ nested: { providerToken: "do-not-echo" } });
    expect(result).toEqual({
      type: "err",
      error: { code: "SCHEMA_SECRET_FIELD", field: "$.nested.providerToken" },
    });
    expect(JSON.stringify(result)).not.toContain("do-not-echo");
  });
});
