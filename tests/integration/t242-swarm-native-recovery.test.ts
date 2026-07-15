// covers: module:amadeus-swarm-native-recovery, requirement:BR-29, requirement:BR-30
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { digestValue } from "../../packages/framework/core/tools/amadeus-swarm-canonical.ts";
import type { AttemptCheckpoint } from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";
import {
  createNativeAttemptRecovery,
  type NativeAttemptProcessRecoveryPort,
  type NativeAttemptResourceRecoveryPort,
} from "../../packages/framework/core/tools/amadeus-swarm-native-recovery.ts";
import type {
  NativeProcessRecoveryReceipt,
  NativeProcessRecoveryTarget,
} from "../../packages/framework/core/tools/amadeus-swarm-native-process.ts";
import { createNativeProcessPort } from "../../packages/framework/core/tools/amadeus-swarm-native-process.ts";
import type {
  NativeResourceCleanupReceipt,
  NativeResourceRecoveryTarget,
} from "../../packages/framework/core/tools/amadeus-swarm-native-resources.ts";
import { createNativeResourceSupervisor } from "../../packages/framework/core/tools/amadeus-swarm-native-resources.ts";

const roots: string[] = [];

function tempRoot(): string {
  const value = mkdtempSync(join(tmpdir(), "amadeus-native-recovery-"));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function dispatchedCheckpoint(): AttemptCheckpoint {
  const expectedUnits = Object.freeze(["U-01", "U-02"]);
  const waveDigest = digestValue({ index: 1, units: expectedUnits });
  const captureIdentityDigest = digestValue({
    executionId: "execution-1",
    attemptId: "attempt-1",
    attemptNonceHash: "nonce-1",
    planDigest: "plan-1",
    waveIndex: 1,
    waveDigest,
  });
  const dispatchPreparation = Object.freeze({
    kind: "native" as const,
    nativeRunId: "run-1",
    planDigest: "plan-1",
    fencingToken: 7,
    waveIndex: 1,
    waveDigest,
    resourcePreparationDigest: "resource-preparation-1",
    captureIdentityDigest,
    identityRelativePath: "native/run-1/identity.json",
    armRelativePath: "native/run-1/arm.json",
    armDigest: "arm-1",
    runEpochDigest: "epoch-1",
    recoveryJournalRelativePath: "native/run-1/recovery.json",
  });
  const preparedNativeRun = Object.freeze({
    kind: "native" as const,
    dispatchPreparationDigest: digestValue(dispatchPreparation),
    resourceReceiptDigest: "resource-receipt-1",
    executionPlanDigest: "execution-plan-1",
    capturePlanDigest: "capture-plan-1",
    transportKind: "stdio-json" as const,
    captureKind: "fixed-provider-path" as const,
  });
  return Object.freeze({
    schemaVersion: 1,
    state: "dispatched",
    executionId: "execution-1",
    attemptId: "attempt-1",
    batch: 1,
    origin: "initial",
    nonceHash: "nonce-1",
    lease: Object.freeze({
      leaseId: "recovery-lease",
      fencingToken: 8,
      ownerId: "recovery-owner",
      heartbeatAt: "2026-07-14T00:00:00.000Z",
      expiresAt: "2026-07-14T00:00:30.000Z",
    }),
    recoveryClaim: Object.freeze({
      claimId: "claim-1",
      previousLeaseId: "lease-1",
      previousFencingToken: 7,
      resourceFencingToken: 7,
      previousOwnerId: "owner-1",
      claimedAt: "2026-07-14T00:00:00.000Z",
    }),
    selectionInput: Object.freeze({
      requested: Object.freeze({ kind: "auto" as const }),
      harness: "codex" as const,
      batch: 1,
      expectedUnits,
      topologySignals: Object.freeze([]),
    }),
    selectedContext: Object.freeze({
      selection: Object.freeze({
        kind: "native-selection" as const,
        driver: "codex" as const,
        source: "requested" as const,
      }),
      probeDigest: "probe-1",
      planDigest: "plan-1",
    }),
    unitStates: Object.freeze({ "U-01": "dispatched" as const, "U-02": "dispatched" as const }),
    lastMutationId: "mutation-1",
    stateDigest: "state-1",
    preparedUnits: Object.freeze([]),
    worktreeManifestDigest: "manifest-1",
    runBinding: Object.freeze({}),
    dispatchPreparation,
    preparedNativeRun,
    dispatchDigest: "dispatch-1",
    dispatch: Object.freeze({
      kind: "native" as const,
      nativeRunId: "run-1",
      preparedNativeRunDigest: digestValue(preparedNativeRun),
      resourceReceiptDigest: "resource-receipt-1",
      processIdentityDigest: "process-1",
      armDigest: "arm-1",
      armDeadline: "2026-07-14T00:00:10.000Z",
      capture: Object.freeze({
        kind: "fixed-provider-path" as const,
        identityDigest: captureIdentityDigest,
        capturePlanDigest: "capture-plan-1",
        resourcesDigest: "resource-receipt-1",
        transport: "stdio-json" as const,
        binding: Object.freeze({
          kind: "fixed-provider-path" as const,
          nativeRunId: "run-1",
          sourceResourceIds: Object.freeze([]),
          exactPathDigest: "exact-path-1",
          sourcePlanDigest: "resource-preparation-1",
        }),
      }),
    }),
  }) as unknown as AttemptCheckpoint;
}

function processReceipt(
  target: NativeProcessRecoveryTarget,
  disposition: "unarmed" | "stopped" = "stopped",
): NativeProcessRecoveryReceipt {
  const processIdentityDigest = disposition === "unarmed"
    ? null
    : target.processIdentityDigest ?? "process-from-journal";
  const semantic = Object.freeze({
    kind: "native-process-recovery-receipt" as const,
    schemaVersion: 1 as const,
    targetDigest: digestValue(target),
    nativeRunId: target.nativeRunId,
    armDigest: target.armDigest,
    runEpochDigest: target.runEpochDigest,
    processIdentityDigest,
    disposition,
  });
  return Object.freeze({ ...semantic, receiptDigest: digestValue(semantic) });
}

function resourceReceipt(target: NativeResourceRecoveryTarget): NativeResourceCleanupReceipt {
  const semantic = Object.freeze({
    kind: "native-resource-cleanup-receipt" as const,
    schemaVersion: 1 as const,
    targetDigest: digestValue(target),
    nativeRunId: target.nativeRunId,
    resourceReceiptDigest: "resource-receipt-1",
    cleanupScopeDigest: "cleanup-scope-1",
    disposition: "cleaned" as const,
  });
  return Object.freeze({ ...semantic, receiptDigest: digestValue(semantic) });
}

function successfulPorts(order: string[]): Readonly<{
  process: NativeAttemptProcessRecoveryPort;
  resources: NativeAttemptResourceRecoveryPort;
}> {
  const process: NativeAttemptProcessRecoveryPort = Object.freeze({
    async recoverAttempt(target) {
      order.push("process");
      return Object.freeze({ status: "stopped" as const, receipt: processReceipt(target) });
    },
    async disposeRecoveredAttempt({ target, recoveryReceipt }) {
      order.push("disposal");
      const semantic = Object.freeze({
        kind: "native-process-disposal-receipt" as const,
        schemaVersion: 1 as const,
        disposalId: "disposal-1",
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
      order.push("resource");
      return Object.freeze({ status: "cleaned" as const, receipt: resourceReceipt(target) });
    },
  });
  return Object.freeze({ process, resources });
}

describe("t242 integrated native attempt recovery", () => {
  test("recovers process, exact resources, and disposal in strict order", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    let resourceTarget: NativeResourceRecoveryTarget | undefined;
    const recovery = createNativeAttemptRecovery({
      ...ports,
      resources: Object.freeze({
        async recoverAttempt(target) {
          order.push("resource");
          resourceTarget = target;
          return Object.freeze({ status: "cleaned" as const, receipt: resourceReceipt(target) });
        },
      }),
    });

    expect(await recovery.recover({ checkpoint: dispatchedCheckpoint(), observedOwner: null })).toBe("recovered");
    expect(order).toEqual(["process", "resource", "disposal"]);
    expect(resourceTarget).toMatchObject({
      executionId: "execution-1",
      attemptId: "attempt-1",
      attemptNonceHash: "nonce-1",
      planDigest: "plan-1",
      nativeRunId: "run-1",
      fencingToken: 7,
      processIdentityDigest: "process-1",
    });
  });

  test("returns active without touching recovery ports when an owner is observed", async () => {
    const order: string[] = [];
    const recovery = createNativeAttemptRecovery(successfulPorts(order));

    expect(await recovery.recover({
      checkpoint: dispatchedCheckpoint(),
      observedOwner: Object.freeze({ pid: 42 }) as never,
    })).toBe("active");
    expect(order).toEqual([]);
  });

  test("rejects a recovery claim that does not preserve the resource fencing token", async () => {
    const order: string[] = [];
    const checkpoint = dispatchedCheckpoint();
    const stale = Object.freeze({
      ...checkpoint,
      recoveryClaim: Object.freeze({ ...checkpoint.recoveryClaim!, resourceFencingToken: 6 }),
    }) as AttemptCheckpoint;

    expect(await createNativeAttemptRecovery(successfulPorts(order)).recover({
      checkpoint: stale,
      observedOwner: null,
    })).toBe("unknown");
    expect(order).toEqual([]);
  });

  test("does not clean resources when exact process recovery is unknown", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    const recovery = createNativeAttemptRecovery({
      ...ports,
      process: Object.freeze({
        ...ports.process,
        async recoverAttempt() {
          order.push("process");
          return Object.freeze({ status: "unknown" as const });
        },
      }),
    });

    expect(await recovery.recover({ checkpoint: dispatchedCheckpoint(), observedOwner: null })).toBe("unknown");
    expect(order).toEqual(["process"]);
  });

  test("fails closed when a recovery port throws", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    const recovery = createNativeAttemptRecovery({
      ...ports,
      process: Object.freeze({
        ...ports.process,
        async recoverAttempt() {
          order.push("process");
          throw new Error("injected recovery failure");
        },
      }),
    });

    expect(await recovery.recover({ checkpoint: dispatchedCheckpoint(), observedOwner: null })).toBe("unknown");
    expect(order).toEqual(["process"]);
  });

  test("does not dispose the process directory when resource recovery is unknown", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    const recovery = createNativeAttemptRecovery({
      ...ports,
      resources: Object.freeze({
        async recoverAttempt() {
          order.push("resource");
          return Object.freeze({ status: "unknown" as const });
        },
      }),
    });

    expect(await recovery.recover({ checkpoint: dispatchedCheckpoint(), observedOwner: null })).toBe("unknown");
    expect(order).toEqual(["process", "resource"]);
  });

  test("rejects a resource receipt from a different prepared run before disposal", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    const recovery = createNativeAttemptRecovery({
      ...ports,
      resources: Object.freeze({
        async recoverAttempt(target) {
          order.push("resource");
          const receipt = resourceReceipt(target);
          const semantic = Object.freeze({
            ...receipt,
            resourceReceiptDigest: "resource-receipt-other",
            receiptDigest: undefined,
          });
          const { receiptDigest: _ignored, ...withoutDigest } = semantic;
          return Object.freeze({
            status: "cleaned" as const,
            receipt: Object.freeze({ ...withoutDigest, receiptDigest: digestValue(withoutDigest) }),
          });
        },
      }),
    });

    expect(await recovery.recover({ checkpoint: dispatchedCheckpoint(), observedOwner: null })).toBe("unknown");
    expect(order).toEqual(["process", "resource"]);
  });

  test("returns unknown on a disposal failure and retries the complete durable chain", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    let disposalAttempts = 0;
    const process = Object.freeze({
      ...ports.process,
      async disposeRecoveredAttempt(input: Parameters<NativeAttemptProcessRecoveryPort["disposeRecoveredAttempt"]>[0]) {
        disposalAttempts += 1;
        if (disposalAttempts === 1) {
          order.push("disposal");
          return Object.freeze({ status: "unknown" as const });
        }
        return await ports.process.disposeRecoveredAttempt(input);
      },
    });
    const recovery = createNativeAttemptRecovery({ process, resources: ports.resources });
    const input = Object.freeze({ checkpoint: dispatchedCheckpoint(), observedOwner: null });

    expect(await recovery.recover(input)).toBe("unknown");
    expect(await recovery.recover(input)).toBe("recovered");
    expect(order).toEqual(["process", "resource", "disposal", "process", "resource", "disposal"]);
  });

  test("recovers a prepared checkpoint with no published process identity", async () => {
    const order: string[] = [];
    let processTarget: NativeProcessRecoveryTarget | undefined;
    const ports = successfulPorts(order);
    const process: NativeAttemptProcessRecoveryPort = Object.freeze({
      ...ports.process,
      async recoverAttempt(target) {
        order.push("process");
        processTarget = target;
        return Object.freeze({ status: "unarmed" as const, receipt: processReceipt(target, "unarmed") });
      },
    });
    const dispatched = dispatchedCheckpoint();
    const prepared = Object.freeze({
      ...dispatched,
      state: "prepared" as const,
      dispatch: undefined,
      dispatchDigest: undefined,
      preparedNativeRun: undefined,
    }) as unknown as AttemptCheckpoint;

    expect(await createNativeAttemptRecovery({ process, resources: ports.resources }).recover({
      checkpoint: prepared,
      observedOwner: null,
    })).toBe("recovered");
    expect(processTarget?.processIdentityDigest).toBeNull();
  });

  test("accepts absent resources only before a prepared native run was persisted", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    const dispatched = dispatchedCheckpoint();
    const prepared = Object.freeze({
      ...dispatched,
      state: "prepared" as const,
      dispatch: undefined,
      dispatchDigest: undefined,
      preparedNativeRun: undefined,
    }) as unknown as AttemptCheckpoint;
    const process: NativeAttemptProcessRecoveryPort = Object.freeze({
      ...ports.process,
      async recoverAttempt(target) {
        order.push("process");
        return Object.freeze({ status: "unarmed" as const, receipt: processReceipt(target, "unarmed") });
      },
    });
    const resources: NativeAttemptResourceRecoveryPort = Object.freeze({
      async recoverAttempt(target) {
        order.push("resource");
        expect(target.fencingToken).toBeNull();
        expect(target.processIdentityDigest).toBeNull();
        return Object.freeze({ status: "absent" as const });
      },
    });

    expect(await createNativeAttemptRecovery({ process, resources }).recover({
      checkpoint: prepared,
      observedOwner: null,
    })).toBe("recovered");
    expect(order).toEqual(["process", "resource", "disposal"]);
  });

  test("binds prepared resources to the process identity recovered before dispatch persistence", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    const dispatched = dispatchedCheckpoint();
    const prepared = Object.freeze({
      ...dispatched,
      state: "prepared" as const,
      dispatch: undefined,
      dispatchDigest: undefined,
    }) as unknown as AttemptCheckpoint;
    const process: NativeAttemptProcessRecoveryPort = Object.freeze({
      ...ports.process,
      async recoverAttempt(target) {
        order.push("process");
        expect(target.processIdentityDigest).toBeNull();
        return Object.freeze({ status: "stopped" as const, receipt: processReceipt(target, "stopped") });
      },
    });
    const resources: NativeAttemptResourceRecoveryPort = Object.freeze({
      async recoverAttempt(target) {
        order.push("resource");
        expect(target.fencingToken).toBe(7);
        expect(target.processIdentityDigest).toBe("process-from-journal");
        return Object.freeze({ status: "cleaned" as const, receipt: resourceReceipt(target) });
      },
    });

    expect(await createNativeAttemptRecovery({ process, resources }).recover({
      checkpoint: prepared,
      observedOwner: null,
    })).toBe("recovered");
    expect(order).toEqual(["process", "resource", "disposal"]);
  });

  test("rejects absent resources after their receipt was persisted", async () => {
    const order: string[] = [];
    const ports = successfulPorts(order);
    const resources: NativeAttemptResourceRecoveryPort = Object.freeze({
      async recoverAttempt() {
        order.push("resource");
        return Object.freeze({ status: "absent" as const });
      },
    });

    expect(await createNativeAttemptRecovery({ process: ports.process, resources }).recover({
      checkpoint: dispatchedCheckpoint(),
      observedOwner: null,
    })).toBe("unknown");
    expect(order).toEqual(["process", "resource"]);
  });

  test("recovers a ready payload captured before a prepared-to-dispatched persistence failure", async () => {
    const order: string[] = [];
    const dispatched = dispatchedCheckpoint();
    if (dispatched.state !== "dispatched") throw new Error("dispatched fixture expected");
    const failed = Object.freeze({
      schemaVersion: dispatched.schemaVersion,
      state: "failed-resumable" as const,
      executionId: dispatched.executionId,
      attemptId: dispatched.attemptId,
      batch: dispatched.batch,
      origin: dispatched.origin,
      nonceHash: dispatched.nonceHash,
      lease: dispatched.lease,
      recoveryClaim: dispatched.recoveryClaim,
      selectionInput: dispatched.selectionInput,
      unitStates: dispatched.unitStates,
      lastMutationId: dispatched.lastMutationId,
      stateDigest: "failed-state",
      failure: Object.freeze({
        code: "COORDINATOR_FAILED" as const,
        affectedUnits: dispatched.selectionInput.expectedUnits,
        failedFromState: "prepared" as const,
        recoveryContext: Object.freeze({
          dispatchPreparation: dispatched.dispatchPreparation!,
          preparedNativeRun: dispatched.preparedNativeRun!,
          dispatch: dispatched.dispatch,
        }),
      }),
    }) as unknown as AttemptCheckpoint;

    expect(await createNativeAttemptRecovery(successfulPorts(order)).recover({
      checkpoint: failed,
      observedOwner: null,
    })).toBe("recovered");
    expect(order).toEqual(["process", "resource", "disposal"]);
  });

  test("replays a real planned process, absent resource set, and disposal across restart", async () => {
    const root = tempRoot();
    const processPort = createNativeProcessPort({
      rootDir: root,
      output: Object.freeze({ publish: () => {}, close: () => {}, fail: () => {} }),
    });
    const base = dispatchedCheckpoint();
    if (base.state !== "dispatched") throw new Error("dispatched fixture expected");
    const waveDigest = base.dispatchPreparation!.waveDigest;
    const processPlan = processPort.plan({
      nativeRunId: "run-real-planned",
      evidenceDir: root,
      fencingToken: 7,
      context: Object.freeze({
        driver: "codex-ultra",
        executionId: base.executionId,
        attemptId: base.attemptId,
        attemptNonceHash: base.nonceHash,
        planDigest: base.dispatchPreparation!.planDigest,
        waveIndex: base.dispatchPreparation!.waveIndex,
        waveDigest,
        expectedUnits: base.selectionInput.expectedUnits,
      }),
    });
    const checkpoint = Object.freeze({
      ...base,
      state: "prepared" as const,
      dispatch: undefined,
      dispatchDigest: undefined,
      preparedNativeRun: undefined,
      dispatchPreparation: Object.freeze({
        ...base.dispatchPreparation!,
        nativeRunId: processPlan.nativeRunId,
        identityRelativePath: processPlan.identityRelativePath,
        armRelativePath: processPlan.armRelativePath,
        armDigest: processPlan.armDigest,
        runEpochDigest: processPlan.runEpochDigest,
        recoveryJournalRelativePath: processPlan.recoveryJournalRelativePath,
      }),
    }) as unknown as AttemptCheckpoint;
    const resourceRoot = join(root, "resource-journals");
    const recovery = createNativeAttemptRecovery({
      process: processPort,
      resources: createNativeResourceSupervisor({ journalRoot: resourceRoot }),
    });

    expect(await recovery.recover({ checkpoint, observedOwner: null })).toBe("recovered");
    expect(existsSync(join(root, dirname(processPlan.recoveryJournalRelativePath)))).toBeFalse();

    const restarted = createNativeAttemptRecovery({
      process: createNativeProcessPort({
        rootDir: root,
        output: Object.freeze({ publish: () => {}, close: () => {}, fail: () => {} }),
      }),
      resources: createNativeResourceSupervisor({ journalRoot: resourceRoot }),
    });
    expect(await restarted.recover({ checkpoint, observedOwner: null })).toBe("recovered");
  });
});
