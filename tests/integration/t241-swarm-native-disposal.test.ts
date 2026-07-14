// covers: module:amadeus-swarm-native-disposal, requirement:BR-29, requirement:BR-30
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createNativeProcessDisposal,
  nativeProcessDisposalTestSeam,
  type NativeRunDirectoryOwnership,
} from "../../packages/framework/core/tools/amadeus-swarm-native-disposal.ts";
import {
  digestValue,
} from "../../packages/framework/core/tools/amadeus-swarm-canonical.ts";
import type {
  NativeProcessRecoveryReceipt,
  NativeProcessRecoveryTarget,
} from "../../packages/framework/core/tools/amadeus-swarm-native-process.ts";

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "amadeus-native-disposal-"));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) rmSync(value, { recursive: true, force: true });
});

function recoveryTarget(nativeRunId: string, runEpochDigest: string): NativeProcessRecoveryTarget {
  return Object.freeze({
    kind: "native-process-recovery",
    schemaVersion: 1,
    nativeRunId,
    armDigest: `arm-${nativeRunId}`,
    runEpochDigest,
    processIdentityDigest: `process-${nativeRunId}`,
  });
}

function recoveryReceipt(target: NativeProcessRecoveryTarget): NativeProcessRecoveryReceipt {
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

function ownedRunDirectory(
  dir: string,
  target: NativeProcessRecoveryTarget,
): Readonly<{
  path: string;
  ownership: NativeRunDirectoryOwnership;
  recoveryJournalDigest: string;
}> {
  const { nativeRunId } = target;
  const path = join(
    dir,
    ".amadeus-swarm-driver",
    "native",
    digestValue(nativeRunId).slice(0, 24),
  );
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const marker = Object.freeze({ schemaVersion: 1 as const, nativeRunId, token: "owner-token" });
  writeFileSync(join(path, "owner.json"), `${JSON.stringify(marker)}\n`, { mode: 0o600 });
  const stat = lstatSync(path, { bigint: true });
  const ownership = Object.freeze({
    device: stat.dev.toString(),
    inode: stat.ino.toString(),
    userId: stat.uid.toString(),
    markerDigest: digestValue(marker),
  });
  const recoveryJournal = Object.freeze({
    schemaVersion: 1 as const,
    nativeRunId,
    armDigest: target.armDigest,
    runEpochDigest: target.runEpochDigest,
    processIdentityDigest: target.processIdentityDigest,
    owner: ownership,
    state: "terminal",
  });
  writeFileSync(join(path, "recovery.json"), `${JSON.stringify(recoveryJournal)}\n`, { mode: 0o600 });
  return Object.freeze({
    path,
    ownership,
    recoveryJournalDigest: digestValue(recoveryJournal),
  });
}

function quarantinePath(dir: string, target: NativeProcessRecoveryTarget): string {
  const disposalId = digestValue({
    nativeRunId: target.nativeRunId,
    runEpochDigest: target.runEpochDigest,
  });
  return join(dir, ".amadeus-swarm-driver", "native", `.disposed-${disposalId}`);
}

function walDirectory(dir: string, target: NativeProcessRecoveryTarget): string {
  const disposalId = digestValue({
    nativeRunId: target.nativeRunId,
    runEpochDigest: target.runEpochDigest,
  });
  return join(dir, ".amadeus-swarm-driver", "native", "disposals", disposalId);
}

describe("t241 native process run-directory disposal", () => {
  test("durably disposes one exact recovered run and resumes the completed result", () => {
    const dir = root();
    const nativeRunId = "run-normal";
    const target = recoveryTarget(nativeRunId, "epoch-normal");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const disposal = createNativeProcessDisposal({ rootDir: dir });

    const started = disposal.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    });

    expect(started.status).toBe("disposed");
    if (started.status !== "disposed") throw new Error("expected disposal receipt");
    expect(started.recoveryReceipt).toEqual(recovered);
    expect(started.receipt.nativeRunId).toBe(nativeRunId);
    expect(existsSync(owned.path)).toBe(false);
    expect(disposal.resume(target)).toEqual(started);

    const disposalId = digestValue({ nativeRunId, runEpochDigest: target.runEpochDigest });
    const walDir = join(
      dir,
      ".amadeus-swarm-driver",
      "native",
      "disposals",
      disposalId,
    );
    expect(["intent", "moved", "deleting", "completed"].every((phase) =>
      existsSync(join(walDir, `${phase}.json`))
    )).toBe(true);
    expect(readFileSync(join(walDir, "intent.json"), "utf-8")).not.toContain(dir);
  });

  test("resumes after a crash immediately after the durable intent", () => {
    const dir = root();
    const nativeRunId = "run-crash-intent";
    const target = recoveryTarget(nativeRunId, "epoch-crash-intent");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "intent",
    });

    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    expect(existsSync(owned.path)).toBe(true);

    const resumed = createNativeProcessDisposal({ rootDir: dir }).resume(target);
    expect(resumed.status).toBe("disposed");
    expect(existsSync(owned.path)).toBe(false);
  });

  test("resumes after the owned directory was renamed but moved was not recorded", () => {
    const dir = root();
    const nativeRunId = "run-crash-rename";
    const target = recoveryTarget(nativeRunId, "epoch-crash-rename");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "rename",
    });

    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    expect(existsSync(owned.path)).toBe(false);

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("disposed");
  });

  test("resumes after the durable moved phase", () => {
    const dir = root();
    const nativeRunId = "run-crash-moved";
    const target = recoveryTarget(nativeRunId, "epoch-crash-moved");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "moved",
    });

    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("disposed");
  });

  test("resumes recursive deletion after the durable deleting phase", () => {
    const dir = root();
    const nativeRunId = "run-crash-deleting";
    const target = recoveryTarget(nativeRunId, "epoch-crash-deleting");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    writeFileSync(join(owned.path, "payload"), "owned", { mode: 0o600 });
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "deleting",
    });

    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("disposed");
  });

  test("writes the tombstone after a crash following recursive deletion", () => {
    const dir = root();
    const nativeRunId = "run-crash-removed";
    const target = recoveryTarget(nativeRunId, "epoch-crash-removed");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "removed",
    });

    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");

    const resumed = createNativeProcessDisposal({ rootDir: dir }).resume(target);
    expect(resumed.status).toBe("disposed");
    expect(resumed.status === "disposed" && resumed.recoveryReceipt).toEqual(recovered);
  });

  test("resumes a partial recursive removal while the quarantined owner inode remains exact", () => {
    const dir = root();
    const nativeRunId = "run-partial-remove";
    const target = recoveryTarget(nativeRunId, "epoch-partial-remove");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    writeFileSync(join(owned.path, "payload"), "owned", { mode: 0o600 });
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "deleting",
    });
    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    const quarantine = quarantinePath(dir, target);
    rmSync(join(quarantine, "owner.json"));
    rmSync(join(quarantine, "recovery.json"));

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("disposed");
    expect(existsSync(quarantine)).toBe(false);
  });

  test("rejects a recovery journal whose exact digest belongs to another target", () => {
    const dir = root();
    const nativeRunId = "run-journal-mismatch";
    const target = recoveryTarget(nativeRunId, "epoch-journal-mismatch");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const foreignJournal = Object.freeze({
      schemaVersion: 1 as const,
      nativeRunId: "foreign-run",
      state: "terminal",
    });
    writeFileSync(
      join(owned.path, "recovery.json"),
      `${JSON.stringify(foreignJournal)}\n`,
      { mode: 0o600 },
    );

    const result = createNativeProcessDisposal({ rootDir: dir }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: digestValue(foreignJournal),
      }),
    });

    expect(result.status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("rejects a recovery journal from another run epoch", () => {
    const dir = root();
    const nativeRunId = "run-journal-epoch-mismatch";
    const target = recoveryTarget(nativeRunId, "epoch-journal-current");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const foreignJournal = Object.freeze({
      schemaVersion: 1 as const,
      nativeRunId,
      runEpochDigest: "epoch-journal-stale",
      state: "terminal",
    });
    writeFileSync(
      join(owned.path, "recovery.json"),
      `${JSON.stringify(foreignJournal)}\n`,
      { mode: 0o600 },
    );

    const result = createNativeProcessDisposal({ rootDir: dir }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: digestValue(foreignJournal),
      }),
    });

    expect(result.status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("rejects a recovery journal bound to another arm", () => {
    const dir = root();
    const nativeRunId = "run-journal-arm-mismatch";
    const target = recoveryTarget(nativeRunId, "epoch-journal-arm");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const foreignJournal = Object.freeze({
      schemaVersion: 1 as const,
      nativeRunId,
      armDigest: "arm-stale",
      runEpochDigest: target.runEpochDigest,
      processIdentityDigest: target.processIdentityDigest,
      state: "terminal",
    });
    writeFileSync(
      join(owned.path, "recovery.json"),
      `${JSON.stringify(foreignJournal)}\n`,
      { mode: 0o600 },
    );

    const result = createNativeProcessDisposal({ rootDir: dir }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: digestValue(foreignJournal),
      }),
    });

    expect(result.status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("rejects a recovery journal bound to another process identity", () => {
    const dir = root();
    const nativeRunId = "run-journal-process-mismatch";
    const target = recoveryTarget(nativeRunId, "epoch-journal-process");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const foreignJournal = Object.freeze({
      schemaVersion: 1 as const,
      nativeRunId,
      armDigest: target.armDigest,
      runEpochDigest: target.runEpochDigest,
      processIdentityDigest: "process-stale",
      state: "terminal",
    });
    writeFileSync(
      join(owned.path, "recovery.json"),
      `${JSON.stringify(foreignJournal)}\n`,
      { mode: 0o600 },
    );

    const result = createNativeProcessDisposal({ rootDir: dir }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: digestValue(foreignJournal),
      }),
    });

    expect(result.status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("rejects a recovery journal bound to another run-directory owner", () => {
    const dir = root();
    const nativeRunId = "run-journal-owner-mismatch";
    const target = recoveryTarget(nativeRunId, "epoch-journal-owner");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const foreignJournal = Object.freeze({
      schemaVersion: 1 as const,
      nativeRunId,
      armDigest: target.armDigest,
      runEpochDigest: target.runEpochDigest,
      processIdentityDigest: target.processIdentityDigest,
      owner: Object.freeze({ ...owned.ownership, inode: `${BigInt(owned.ownership.inode) + 1n}` }),
      state: "terminal",
    });
    writeFileSync(
      join(owned.path, "recovery.json"),
      `${JSON.stringify(foreignJournal)}\n`,
      { mode: 0o600 },
    );

    const result = createNativeProcessDisposal({ rootDir: dir }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: digestValue(foreignJournal),
      }),
    });

    expect(result.status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("a completed tombstone rejects a stale start without touching the new canonical epoch", () => {
    const dir = root();
    const nativeRunId = "run-tombstone-new-epoch";
    const target = recoveryTarget(nativeRunId, "epoch-tombstone-old");
    const recovered = recoveryReceipt(target);
    const oldOwned = ownedRunDirectory(dir, target);
    const disposal = createNativeProcessDisposal({ rootDir: dir });
    expect(disposal.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: oldOwned.ownership,
        recoveryJournalDigest: oldOwned.recoveryJournalDigest,
      }),
    }).status).toBe("disposed");

    const replacementTarget = recoveryTarget(nativeRunId, "epoch-tombstone-new");
    const newOwned = ownedRunDirectory(dir, replacementTarget);
    writeFileSync(join(newOwned.path, "new-epoch"), "preserve", { mode: 0o600 });
    const staleStart = disposal.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: newOwned.ownership,
        recoveryJournalDigest: newOwned.recoveryJournalDigest,
      }),
    });

    expect(staleStart.status).toBe("unknown");
    expect(readFileSync(join(newOwned.path, "new-epoch"), "utf-8")).toBe("preserve");
    expect(disposal.resume(target).status).toBe("disposed");
    expect(readFileSync(join(newOwned.path, "new-epoch"), "utf-8")).toBe("preserve");
  });

  test("a new canonical epoch does not block disposal of the exact quarantined epoch", () => {
    const dir = root();
    const nativeRunId = "run-new-epoch-during-disposal";
    const target = recoveryTarget(nativeRunId, "epoch-old-during-disposal");
    const recovered = recoveryReceipt(target);
    const oldOwned = ownedRunDirectory(dir, target);
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "moved",
    });
    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: oldOwned.ownership,
        recoveryJournalDigest: oldOwned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    const replacementTarget = recoveryTarget(nativeRunId, "epoch-new-during-disposal");
    const replacement = ownedRunDirectory(dir, replacementTarget);
    writeFileSync(join(replacement.path, "new-epoch"), "preserve", { mode: 0o600 });

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("disposed");
    expect(readFileSync(join(replacement.path, "new-epoch"), "utf-8")).toBe("preserve");
    expect(existsSync(quarantinePath(dir, target))).toBe(false);
  });

  test("a completed tombstone fails closed when its quarantine path reappears", () => {
    const dir = root();
    const nativeRunId = "run-completed-foreign-quarantine";
    const target = recoveryTarget(nativeRunId, "epoch-completed-foreign-quarantine");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const disposal = createNativeProcessDisposal({ rootDir: dir });
    expect(disposal.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    }).status).toBe("disposed");
    const quarantine = quarantinePath(dir, target);
    mkdirSync(quarantine, { mode: 0o700 });
    writeFileSync(join(quarantine, "foreign"), "preserve", { mode: 0o600 });

    expect(disposal.resume(target).status).toBe("unknown");
    expect(readFileSync(join(quarantine, "foreign"), "utf-8")).toBe("preserve");
  });

  test("a malformed append-only phase fails closed without moving the owned directory", () => {
    const dir = root();
    const nativeRunId = "run-malformed-intent";
    const target = recoveryTarget(nativeRunId, "epoch-malformed-intent");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "intent",
    });
    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    const intentPath = join(walDirectory(dir, target), "intent.json");
    const intent = JSON.parse(readFileSync(intentPath, "utf-8")) as Record<string, unknown>;
    writeFileSync(intentPath, `${JSON.stringify({ ...intent, unexpected: true })}\n`, { mode: 0o600 });

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("a foreign quarantine blocks roll-forward without mutating either directory", () => {
    const dir = root();
    const nativeRunId = "run-foreign-quarantine";
    const target = recoveryTarget(nativeRunId, "epoch-foreign-quarantine");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "intent",
    });
    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    const quarantine = quarantinePath(dir, target);
    mkdirSync(quarantine, { mode: 0o700 });
    writeFileSync(join(quarantine, "foreign"), "preserve", { mode: 0o600 });

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
    expect(readFileSync(join(quarantine, "foreign"), "utf-8")).toBe("preserve");
  });

  test("a symlink at the canonical run path is rejected without following it", () => {
    const dir = root();
    const nativeRunId = "run-symlink-canonical";
    const target = recoveryTarget(nativeRunId, "epoch-symlink-canonical");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const saved = `${owned.path}-saved`;
    renameSync(owned.path, saved);
    writeFileSync(join(saved, "preserve"), "foreign", { mode: 0o600 });
    symlinkSync(saved, owned.path, "dir");

    const result = createNativeProcessDisposal({ rootDir: dir }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    });

    expect(result.status).toBe("unknown");
    expect(lstatSync(owned.path).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(saved, "preserve"), "utf-8")).toBe("foreign");
    expect(existsSync(walDirectory(dir, target))).toBe(false);
  });

  test("a foreign inode replacing a deleting quarantine is retained", () => {
    const dir = root();
    const nativeRunId = "run-foreign-deleting";
    const target = recoveryTarget(nativeRunId, "epoch-foreign-deleting");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const crashing = nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "deleting",
    });
    expect(() => crashing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    const quarantine = quarantinePath(dir, target);
    const saved = `${quarantine}-owned`;
    renameSync(quarantine, saved);
    mkdirSync(quarantine, { mode: 0o700 });
    writeFileSync(join(quarantine, "foreign"), "preserve", { mode: 0o600 });

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("unknown");
    expect(readFileSync(join(quarantine, "foreign"), "utf-8")).toBe("preserve");
    expect(existsSync(saved)).toBe(true);
  });

  test("a mismatched recovery receipt is rejected before any WAL side effect", () => {
    const dir = root();
    const nativeRunId = "run-receipt-mismatch";
    const target = recoveryTarget(nativeRunId, "epoch-receipt-mismatch");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const mismatched = Object.freeze({ ...recovered, receiptDigest: "0".repeat(64) });

    const result = createNativeProcessDisposal({ rootDir: dir }).start({
      target,
      recoveryReceipt: mismatched,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    });

    expect(result.status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
    expect(existsSync(walDirectory(dir, target))).toBe(false);
  });

  test("same-owner competing starts converge on one deterministic tombstone", () => {
    const dir = root();
    const nativeRunId = "run-concurrent-same-owner";
    const target = recoveryTarget(nativeRunId, "epoch-concurrent-same-owner");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const input = Object.freeze({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    });
    expect(() => nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "intent",
    }).start(input)).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");

    const contender = createNativeProcessDisposal({ rootDir: dir });
    const winner = contender.start(input);
    const retry = contender.start(input);
    expect(winner.status).toBe("disposed");
    expect(retry).toEqual(winner);
  });

  test("a crash after fsyncing a phase temp cannot publish a partial intent", () => {
    const dir = root();
    const nativeRunId = "run-atomic-intent";
    const target = recoveryTarget(nativeRunId, "epoch-atomic-intent");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const input = Object.freeze({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    });

    expect(() => nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "intent-temp",
    }).start(input)).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    expect(existsSync(join(walDirectory(dir, target), "intent.json"))).toBe(false);
    expect(existsSync(owned.path)).toBe(true);

    expect(createNativeProcessDisposal({ rootDir: dir }).start(input).status).toBe("disposed");
  });

  for (const crashAfter of [
    "moved-temp",
    "deleting-temp",
    "completed-temp",
    "before-rename",
    "before-remove",
    "completed",
  ] as const) {
    test(`reconciles a crash at ${crashAfter}`, () => {
      const dir = root();
      const nativeRunId = `run-crash-${crashAfter}`;
      const target = recoveryTarget(nativeRunId, `epoch-crash-${crashAfter}`);
      const recovered = recoveryReceipt(target);
      const owned = ownedRunDirectory(dir, target);
      const input = Object.freeze({
        target,
        recoveryReceipt: recovered,
        runDirectory: Object.freeze({
          owner: owned.ownership,
          recoveryJournalDigest: owned.recoveryJournalDigest,
        }),
      });

      expect(() => nativeProcessDisposalTestSeam.createCrashInjected({
        rootDir: dir,
        crashAfter,
      }).start(input)).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
      if (crashAfter.endsWith("-temp")) {
        expect(existsSync(join(walDirectory(dir, target), `${crashAfter.slice(0, -5)}.json`))).toBe(false);
      }
      expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("disposed");
    });
  }

  test("a symlink replacing the WAL directory fails closed before disposal", () => {
    const dir = root();
    const nativeRunId = "run-wal-dir-symlink";
    const target = recoveryTarget(nativeRunId, "epoch-wal-dir-symlink");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    expect(() => nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "intent",
    }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    const wal = walDirectory(dir, target);
    const saved = `${wal}-saved`;
    renameSync(wal, saved);
    symlinkSync(saved, wal, "dir");

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("a WAL directory swapped after phase publication is re-read before rename", () => {
    const dir = root();
    const nativeRunId = "run-wal-readback-swap";
    const target = recoveryTarget(nativeRunId, "epoch-wal-readback-swap");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const disposal = nativeProcessDisposalTestSeam.createIntercepted({
      rootDir: dir,
      afterStep(point) {
        if (point !== "intent") return;
        const wal = walDirectory(dir, target);
        const saved = `${wal}-saved`;
        renameSync(wal, saved);
        symlinkSync(saved, wal, "dir");
      },
    });

    expect(disposal.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    }).status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("a symlink replacing a phase file fails closed before disposal", () => {
    const dir = root();
    const nativeRunId = "run-phase-symlink";
    const target = recoveryTarget(nativeRunId, "epoch-phase-symlink");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    expect(() => nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "intent",
    }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    const intent = join(walDirectory(dir, target), "intent.json");
    const saved = `${intent}-saved`;
    renameSync(intent, saved);
    symlinkSync(saved, intent);

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("an over-permissive phase file fails closed before disposal", () => {
    const dir = root();
    const nativeRunId = "run-phase-mode";
    const target = recoveryTarget(nativeRunId, "epoch-phase-mode");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    expect(() => nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "intent",
    }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    chmodSync(join(walDirectory(dir, target), "intent.json"), 0o644);

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
  });

  test("a missing predecessor in the phase chain fails closed", () => {
    const dir = root();
    const nativeRunId = "run-chain-gap";
    const target = recoveryTarget(nativeRunId, "epoch-chain-gap");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    expect(() => nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "moved",
    }).start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    })).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    rmSync(join(walDirectory(dir, target), "intent.json"));

    expect(createNativeProcessDisposal({ rootDir: dir }).resume(target).status).toBe("unknown");
    expect(existsSync(quarantinePath(dir, target))).toBe(true);
  });

  test("a cross-process rename winner is re-read after ENOENT and converges", () => {
    const dir = root();
    const nativeRunId = "run-rename-race";
    const target = recoveryTarget(nativeRunId, "epoch-rename-race");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const input = Object.freeze({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    });
    const contender = createNativeProcessDisposal({ rootDir: dir });
    const racing = nativeProcessDisposalTestSeam.createIntercepted({
      rootDir: dir,
      afterStep(point) {
        if (point === "before-rename") expect(contender.start(input).status).toBe("disposed");
      },
    });

    expect(racing.start(input).status).toBe("disposed");
    expect(contender.resume(target).status).toBe("disposed");
  });

  test("a cross-process removal winner is re-read after ENOENT and converges", () => {
    const dir = root();
    const nativeRunId = "run-remove-race";
    const target = recoveryTarget(nativeRunId, "epoch-remove-race");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const input = Object.freeze({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    });
    expect(() => nativeProcessDisposalTestSeam.createCrashInjected({
      rootDir: dir,
      crashAfter: "deleting",
    }).start(input)).toThrow("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    const contender = createNativeProcessDisposal({ rootDir: dir });
    let raced = false;
    const racing = nativeProcessDisposalTestSeam.createIntercepted({
      rootDir: dir,
      afterStep(point) {
        if (point === "before-remove") {
          raced = true;
          expect(contender.resume(target).status).toBe("disposed");
        }
      },
    });

    expect(racing.resume(target).status).toBe("disposed");
    expect(raced).toBe(true);
    expect(contender.resume(target).status).toBe("disposed");
  });

  test("an atomic phase publish never follows a competing symlink", () => {
    const dir = root();
    const nativeRunId = "run-publish-symlink-race";
    const target = recoveryTarget(nativeRunId, "epoch-publish-symlink-race");
    const recovered = recoveryReceipt(target);
    const owned = ownedRunDirectory(dir, target);
    const foreign = join(dir, "foreign-phase.json");
    writeFileSync(foreign, "{}\n", { mode: 0o600 });
    const racing = nativeProcessDisposalTestSeam.createIntercepted({
      rootDir: dir,
      afterStep(point) {
        if (point === "intent-temp") {
          symlinkSync(foreign, join(walDirectory(dir, target), "intent.json"));
        }
      },
    });

    const result = racing.start({
      target,
      recoveryReceipt: recovered,
      runDirectory: Object.freeze({
        owner: owned.ownership,
        recoveryJournalDigest: owned.recoveryJournalDigest,
      }),
    });

    expect(result.status).toBe("unknown");
    expect(existsSync(owned.path)).toBe(true);
    expect(readFileSync(foreign, "utf-8")).toBe("{}\n");
  });
});
