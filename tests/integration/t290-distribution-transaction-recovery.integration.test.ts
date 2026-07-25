// t290 — real-filesystem distribution journal recovery.
// covers: scripts/distribution-transaction.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DISTRIBUTION_RUNTIME_DIR,
  DistributionRecoveryError,
  DistributionTransactionCoordinator,
  type DistributionCheckpoint,
  type DistributionJournal,
  type DistributionPorts,
} from "../../scripts/distribution-transaction.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "distribution-recovery-"));
  roots.push(root);
  writeFileSync(join(root, "managed.txt"), "old");
  writeFileSync(join(root, "unmanaged.txt"), "keep");
  return root;
}

function deterministicPorts(
  failure?: Readonly<{
    checkpoint: DistributionCheckpoint;
    error?: Error;
  }>,
): Partial<DistributionPorts> {
  let sequence = 0;
  let elapsed = 0;
  return {
    now: () => "2026-07-25T00:00:00.000Z",
    token: () => `token-${++sequence}`,
    host: () => "test-host",
    pid: () => 42,
    processStart: () => "test-process",
    monotonicMs: () => elapsed,
    wait: (ms) => {
      elapsed += ms;
    },
    ownerState: () => "stale",
    checkpoint: (checkpoint) => {
      if (failure?.checkpoint === checkpoint)
        throw failure.error ?? new Error(`injected:${checkpoint}`);
    },
  };
}

function journalPath(root: string): string {
  const journalRoot = join(root, DISTRIBUTION_RUNTIME_DIR, "journals");
  const names = readdirSync(journalRoot).filter((name) =>
    name.endsWith(".json"),
  );
  expect(names).toHaveLength(1);
  return join(journalRoot, names[0]);
}

function readJournal(root: string): DistributionJournal {
  return JSON.parse(readFileSync(journalPath(root), "utf-8"));
}

function interrupt(
  root: string,
  checkpoint: DistributionCheckpoint,
  bytes: Buffer | null = Buffer.from("new"),
  error?: Error,
): DistributionJournal {
  const coordinator = new DistributionTransactionCoordinator(
    root,
    deterministicPorts({ checkpoint, error }),
  );
  expect(() =>
    coordinator.apply(
      [{ path: "managed.txt", bytes }],
      "registry-digest-v2",
    ),
  ).toThrow();
  return readJournal(root);
}

describe("t290 transaction recovery", () => {
  test("records durable backups, candidates, digests, order, and registry identity before public mutation", () => {
    const root = fixture();
    const journal = interrupt(root, "journal-committing");
    const file = journal.files[0];

    expect(journal).toMatchObject({
      schema: 2,
      registryDigest: "registry-digest-v2",
      state: "committing",
    });
    expect(file).toMatchObject({
      path: "managed.txt",
      order: 0,
      oldDigest: expect.any(String),
      newDigest: expect.any(String),
      oldAbsent: false,
      applied: false,
    });
    expect(file.oldDigest).not.toBe(file.newDigest);
    expect(readFileSync(join(root, file.backupPath as string), "utf-8")).toBe(
      "old",
    );
    expect(
      readFileSync(join(root, file.candidatePath as string), "utf-8"),
    ).toBe("new");
    expect(readFileSync(join(root, "managed.txt"), "utf-8")).toBe("old");
  });

  test.each([
    "candidate-published",
    "journal-prepared",
    "journal-committing",
    "target-candidate-fsynced",
    "target-renamed",
    "parent-fsynced",
    "journal-applied",
  ] as const)(
    "rolls back deterministically after failure at %s",
    (checkpoint) => {
      const root = fixture();
      const journal = interrupt(root, checkpoint);

      expect(
        new DistributionTransactionCoordinator(
          root,
          deterministicPorts(),
        ).recover(),
      ).toBe("recovered");
      expect(readFileSync(join(root, "managed.txt"), "utf-8")).toBe("old");
      expect(readFileSync(join(root, "unmanaged.txt"), "utf-8")).toBe("keep");
      expect(
        existsSync(
          join(root, DISTRIBUTION_RUNTIME_DIR, "transactions", journal.id),
        ),
      ).toBe(false);
      expect(
        existsSync(`${join(root, "managed.txt")}.candidate.${journal.id}`),
      ).toBe(false);
      expect(
        new DistributionTransactionCoordinator(root).pendingJournalCount(),
      ).toBe(0);
    },
  );

  test("rolls forward a committed journal and removes deletion tombstones", () => {
    const updateRoot = fixture();
    interrupt(updateRoot, "journal-committed");
    expect(
      new DistributionTransactionCoordinator(
        updateRoot,
        deterministicPorts(),
      ).recover(),
    ).toBe("recovered");
    expect(readFileSync(join(updateRoot, "managed.txt"), "utf-8")).toBe("new");

    const deleteRoot = fixture();
    const journal = interrupt(deleteRoot, "journal-committed", null);
    expect(
      new DistributionTransactionCoordinator(
        deleteRoot,
        deterministicPorts(),
      ).recover(),
    ).toBe("recovered");
    expect(existsSync(join(deleteRoot, "managed.txt"))).toBe(false);
    expect(
      existsSync(
        join(
          deleteRoot,
          journal.files[0].deleteTombstonePath as string,
        ),
      ),
    ).toBe(false);
    expect(readFileSync(join(deleteRoot, "unmanaged.txt"), "utf-8")).toBe(
      "keep",
    );
  });

  test("uses recorded bytes instead of trusting an applied marker or current digest", () => {
    const root = fixture();
    interrupt(root, "journal-applied");
    writeFileSync(join(root, "managed.txt"), "tampered-after-crash");

    new DistributionTransactionCoordinator(
      root,
      deterministicPorts(),
    ).recover();
    expect(readFileSync(join(root, "managed.txt"), "utf-8")).toBe("old");
  });

  test("runs pending recovery as the mandatory preflight for the next mutation", () => {
    const root = fixture();
    interrupt(root, "target-renamed");

    new DistributionTransactionCoordinator(
      root,
      deterministicPorts(),
    ).apply([{ path: "managed.txt", bytes: Buffer.from("next") }]);
    expect(readFileSync(join(root, "managed.txt"), "utf-8")).toBe("next");
    expect(readFileSync(join(root, "unmanaged.txt"), "utf-8")).toBe("keep");
  });

  test("retains journal, transaction data, and recovery ownership when rollback fails", () => {
    const root = fixture();
    const journal = interrupt(root, "target-renamed");
    const recovery = new DistributionTransactionCoordinator(
      root,
      deterministicPorts({
        checkpoint: "recovery-restore",
        error: Object.assign(new Error("disk full"), { code: "ENOSPC" }),
      }),
    );

    expect(() => recovery.recover()).toThrow(DistributionRecoveryError);
    expect(existsSync(journalPath(root))).toBe(true);
    expect(
      existsSync(
        join(root, DISTRIBUTION_RUNTIME_DIR, "transactions", journal.id),
      ),
    ).toBe(true);
    expect(
      existsSync(join(root, DISTRIBUTION_RUNTIME_DIR, "recovery", "owner.json")),
    ).toBe(true);
  });

  test("retains committed evidence and recovery ownership when roll-forward fails", () => {
    const root = fixture();
    const journal = interrupt(root, "journal-committed");
    const recovery = new DistributionTransactionCoordinator(
      root,
      deterministicPorts({
        checkpoint: "recovery-restore",
        error: new Error("injected forward failure"),
      }),
    );

    expect(() => recovery.recover()).toThrow(DistributionRecoveryError);
    expect(readFileSync(join(root, "managed.txt"), "utf-8")).toBe("new");
    expect(readJournal(root).state).toBe("committed");
    expect(
      existsSync(
        join(root, DISTRIBUTION_RUNTIME_DIR, "transactions", journal.id),
      ),
    ).toBe(true);
    expect(
      existsSync(join(root, DISTRIBUTION_RUNTIME_DIR, "recovery", "owner.json")),
    ).toBe(true);
  });

  test("treats a failure after cleanup as a committed operation with no recovery residue", () => {
    const root = fixture();
    const coordinator = new DistributionTransactionCoordinator(
      root,
      deterministicPorts({ checkpoint: "journal-cleaned" }),
    );

    expect(() =>
      coordinator.apply([
        { path: "managed.txt", bytes: Buffer.from("new") },
      ]),
    ).toThrow("injected:journal-cleaned");
    expect(readFileSync(join(root, "managed.txt"), "utf-8")).toBe("new");
    expect(coordinator.pendingJournalCount()).toBe(0);
  });
});
