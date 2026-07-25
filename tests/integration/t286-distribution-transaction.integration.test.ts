// t286 — distribution lock/read-session/transaction semantics.
// covers: scripts/distribution-transaction.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DISTRIBUTION_LOCK_TIMEOUT_MS,
  DISTRIBUTION_RUNTIME_DIR,
  DistributionLockTimeoutError,
  DistributionTransactionCoordinator,
  type DistributionCheckpoint,
  type DistributionPorts,
} from "../../scripts/distribution-transaction.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "distribution-transaction-"));
  roots.push(root);
  mkdirSync(join(root, "public"), { recursive: true });
  writeFileSync(join(root, "public", "a.txt"), "old");
  return root;
}

function fastPorts(
  overrides: Partial<DistributionPorts> = {},
): Partial<DistributionPorts> {
  let elapsed = 0;
  let token = 0;
  return {
    token: () => `token-${++token}`,
    monotonicMs: () => elapsed,
    wait: (ms) => {
      elapsed += ms;
    },
    ...overrides,
  };
}

describe("t286 shared/exclusive lock protocol", () => {
  test("publishes complete owners, fences tokens, and reports typed 5s timeout", () => {
    const root = fixture();
    const coordinator = new DistributionTransactionCoordinator(
      root,
      fastPorts(),
    );
    const writer = coordinator.acquireWriter();
    expect(() => coordinator.openReadSession("blocked")).toThrow(
      DistributionLockTimeoutError,
    );
    try {
      coordinator.openReadSession("blocked");
    } catch (error) {
      expect(error).toMatchObject({
        kind: "distribution-lock-timeout",
        lockKind: "reader",
        timeoutMs: DISTRIBUTION_LOCK_TIMEOUT_MS,
      });
    }
    coordinator.releaseWriter(writer);
    const session = coordinator.openReadSession("digest");
    expect(session.purpose).toBe("digest");
    expect(session.generation).toBeGreaterThan(writer.generation);
    session.close();
    expect(() => session.readFile("public/a.txt")).toThrow(
      "distribution lock ownership changed",
    );
  });

  test("reader snapshot prevents a writer from publishing partial files", () => {
    const root = fixture();
    const coordinator = new DistributionTransactionCoordinator(
      root,
      fastPorts(),
    );
    const reader = coordinator.openReadSession("snapshot");
    expect(reader.readFile("public/a.txt").toString()).toBe("old");
    expect(() =>
      coordinator.apply([{ path: "public/a.txt", bytes: Buffer.from("new") }]),
    ).toThrow(DistributionLockTimeoutError);
    expect(reader.readFile("public/a.txt").toString()).toBe("old");
    reader.close();
    coordinator.apply([{ path: "public/a.txt", bytes: Buffer.from("new") }]);
    const after = coordinator.openReadSession("after");
    expect(after.readFile("public/a.txt").toString()).toBe("new");
    after.close();
  });

  test("listPublicRoot is token-fenced and rejects traversal and symlinks", () => {
    const root = fixture();
    writeFileSync(join(root, "public", "extra.txt"), "extra");
    symlinkSync(join(root, "public", "a.txt"), join(root, "public", "link"));
    const coordinator = new DistributionTransactionCoordinator(
      root,
      fastPorts(),
    );
    const session = coordinator.openReadSession();
    expect(() => session.listPublicRoot("public")).toThrow(
      "public projection contains a symlink",
    );
    expect(() => session.readFile("../outside")).toThrow(
      "outside the repository",
    );
    session.close();
  });
});

describe("t286 stale/ambiguous recovery fencing", () => {
  test("stale takeover publishes one recovery owner before quarantining writer", () => {
    const root = fixture();
    const writerCoordinator = new DistributionTransactionCoordinator(
      root,
      fastPorts({
        token: () => "stale-writer",
        ownerState: () => "alive",
      }),
    );
    writerCoordinator.acquireWriter("journal-1");
    const checkpoints: DistributionCheckpoint[] = [];
    const recoveryCoordinator = new DistributionTransactionCoordinator(
      root,
      fastPorts({
        token: () => "recovery-owner",
        ownerState: () => "stale",
        checkpoint: (checkpoint) => checkpoints.push(checkpoint),
      }),
    );
    const recovery = recoveryCoordinator.takeoverStaleWriter();
    expect(recovery.journalId).toBe("journal-1");
    expect(checkpoints).toEqual([
      "recovery-published",
      "writer-quarantined",
    ]);
    expect(
      existsSync(
        join(
          root,
          DISTRIBUTION_RUNTIME_DIR,
          "quarantine",
          "1-stale-writer",
        ),
      ),
    ).toBe(true);
    recoveryCoordinator.releaseRecovery(recovery);
  });

  test.each(["alive", "ambiguous"] as const)(
    "%s owner is never quarantined",
    (ownerState) => {
      const root = fixture();
      const writer = new DistributionTransactionCoordinator(
        root,
        fastPorts({ token: () => "writer" }),
      );
      writer.acquireWriter("journal");
      const contender = new DistributionTransactionCoordinator(
        root,
        fastPorts({ ownerState: () => ownerState }),
      );
      expect(() => contender.takeoverStaleWriter()).toThrow(
        ownerState === "alive" ? "writer is alive" : "lock is ambiguous",
      );
      expect(
        readFileSync(
          join(root, DISTRIBUTION_RUNTIME_DIR, "writer", "owner.json"),
          "utf-8",
        ),
      ).toContain('"token":"writer"');
    },
  );
});

describe("t286 journal preconditions", () => {
  test.each([
    "/absolute",
    "../escape",
    "public/\0bad",
    "C:\\Users\\escape",
  ])("rejects invalid managed path %s before public mutation", (path) => {
    const root = fixture();
    const coordinator = new DistributionTransactionCoordinator(
      root,
      fastPorts(),
    );
    expect(() =>
      coordinator.apply([{ path, bytes: Buffer.from("new") }]),
    ).toThrow();
    expect(readFileSync(join(root, "public", "a.txt"), "utf-8")).toBe("old");
  });

  test("rejects duplicate targets and a symlink target before journaling", () => {
    const root = fixture();
    const coordinator = new DistributionTransactionCoordinator(
      root,
      fastPorts(),
    );
    expect(() =>
      coordinator.apply([
        { path: "public/a.txt", bytes: Buffer.from("one") },
        { path: "public/a.txt", bytes: Buffer.from("two") },
      ]),
    ).toThrow("duplicate distribution target");
    symlinkSync(join(root, "public", "a.txt"), join(root, "public", "sym"));
    expect(() =>
      coordinator.apply([
        { path: "public/sym", bytes: Buffer.from("new") },
      ]),
    ).toThrow("not a regular file");
  });

  test("rejects 2 MiB/file and 64 MiB/transaction capacity excess before writing", () => {
    const root = fixture();
    const coordinator = new DistributionTransactionCoordinator(
      root,
      fastPorts(),
    );
    expect(() =>
      coordinator.apply([{
        path: "oversize.bin",
        bytes: Buffer.alloc(2 * 1024 * 1024 + 1),
      }])
    ).toThrow("exceeds 2 MiB");
    expect(existsSync(join(root, "oversize.bin"))).toBe(false);

    expect(() =>
      coordinator.apply(
        Array.from({ length: 65 }, (_, index) => ({
          path: `total/${index}.bin`,
          bytes: Buffer.alloc(1024 * 1024),
        })),
      )
    ).toThrow("exceeds 64 MiB");
    expect(existsSync(join(root, "total"))).toBe(false);
  });
});
