import { describe, expect, test } from "bun:test";
import {
  classifyDeadline,
  decideMaintenancePublication,
  decideSnapshotPublication,
  parseMaintenanceCandidate,
  parseSnapshotCandidate,
  runMaintenancePublisher,
  runSnapshotPublisher,
  verifyMaintenanceOwnership,
  verifySnapshotOwnership,
  type MaintenanceInventory,
  type MaintenancePublisherPort,
  type OperationReceipt,
  type SnapshotPublisherPort,
  type SnapshotInventory,
} from "../../scripts/metrics-publication-domain.ts";

const TARGET_SHA = "a".repeat(40);
const OTHER_SHA = `${"a".repeat(12)}${"b".repeat(28)}`;
const REPOSITORY = "amadeus-dlc/amadeus";
const BOT_LOGIN = "amadeus-metrics[bot]";
const SNAPSHOT_BRANCH = `metrics/snapshot-${TARGET_SHA}`;
const SNAPSHOT_PATH = `metrics/2026-07-30T00-00-00-000Z-${TARGET_SHA.slice(0, 12)}.json`;
const SNAPSHOT_MARKER = `<!-- amadeus:metrics-snapshot:v1 sha=${TARGET_SHA} -->`;
const MAINTENANCE_BRANCH = "metrics/maintenance";
const MAINTENANCE_MARKER = "<!-- amadeus:metrics-maintenance:v1 -->";

function validSnapshotText(sha = TARGET_SHA): string {
  return JSON.stringify({
    schema_version: 1,
    captured_at: "2026-07-30T00:00:00.000Z",
    commit: sha,
    collectors: {},
  });
}

function snapshotPr(overrides: Record<string, unknown> = {}) {
  return {
    number: 42,
    url: "https://github.com/amadeus-dlc/amadeus/pull/42",
    state: "OPEN",
    mergeStateStatus: "CLEAN",
    mergedAt: null,
    headRefName: SNAPSHOT_BRANCH,
    headRefOid: "b".repeat(40),
    headRepository: { nameWithOwner: REPOSITORY },
    author: { login: BOT_LOGIN },
    title: `[amadeus:metrics-snapshot:v1] ${TARGET_SHA}`,
    body: SNAPSHOT_MARKER,
    files: [{ path: SNAPSHOT_PATH, additions: 1, deletions: 0, text: validSnapshotText() }],
    ...overrides,
  };
}

function snapshotBranch(overrides: Record<string, unknown> = {}) {
  return {
    name: SNAPSHOT_BRANCH,
    oid: "b".repeat(40),
    tipAuthor: BOT_LOGIN,
    files: [{ path: SNAPSHOT_PATH, status: "A", text: validSnapshotText() }],
    ...overrides,
  };
}

function snapshotInventory(overrides: Partial<SnapshotInventory> = {}): SnapshotInventory {
  return {
    targetSha: TARGET_SHA,
    landed: [],
    pullRequests: [],
    branches: [],
    problems: [],
    ...overrides,
  };
}

function maintenancePr(overrides: Record<string, unknown> = {}) {
  return {
    number: 84,
    url: "https://github.com/amadeus-dlc/amadeus/pull/84",
    state: "OPEN",
    mergeStateStatus: "CLEAN",
    mergedAt: null,
    headRefName: MAINTENANCE_BRANCH,
    headRefOid: "c".repeat(40),
    headRepository: { nameWithOwner: REPOSITORY },
    author: { login: BOT_LOGIN },
    title: "[amadeus:metrics-maintenance:v1] Rebuild metrics index",
    body: MAINTENANCE_MARKER,
    files: [
      { path: "metrics/index.html", additions: 5, deletions: 2 },
      { path: "metrics/old.json", additions: 0, deletions: 10 },
    ],
    ...overrides,
  };
}

function maintenanceBranch(overrides: Record<string, unknown> = {}) {
  return {
    name: MAINTENANCE_BRANCH,
    oid: "c".repeat(40),
    tipAuthor: BOT_LOGIN,
    files: [
      { path: "metrics/index.html", status: "M" },
      { path: "metrics/old.json", status: "D" },
    ],
    ...overrides,
  };
}

function maintenanceInventory(overrides: Partial<MaintenanceInventory> = {}): MaintenanceInventory {
  return {
    hasDiff: true,
    pullRequests: [],
    branches: [],
    problems: [],
    ...overrides,
  };
}

describe("t222 snapshot publication decision", () => {
  const ownedPr = parseSnapshotCandidate(snapshotPr());
  const ownedBranch = parseSnapshotCandidate(snapshotBranch());
  if (ownedPr.kind !== "pull-request" || ownedBranch.kind !== "branch") {
    throw new Error("test fixture did not parse");
  }

  const cases: Array<[string, SnapshotInventory, string, boolean]> = [
    ["landed only dispatches", snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }] }), "dispatch", false],
    ["empty inventory creates", snapshotInventory(), "create", false],
    ["one clean OPEN is reused", snapshotInventory({ pullRequests: [ownedPr], branches: [ownedBranch] }), "reuse", false],
    ["landed plus OPEN is recovered", snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }], pullRequests: [ownedPr], branches: [ownedBranch] }), "cleanup-landed", true],
    ["conflicting OPEN is replaced", snapshotInventory({ pullRequests: [{ ...ownedPr, mergeability: "conflicting" }], branches: [ownedBranch] }), "recover", true],
    ["closed unmerged is replaced", snapshotInventory({ pullRequests: [{ ...ownedPr, state: "closed" }], branches: [ownedBranch] }), "recover", true],
    ["branch-only is replaced", snapshotInventory({ branches: [ownedBranch] }), "recover", true],
    ["multiple OPEN candidates are replaced", snapshotInventory({ pullRequests: [ownedPr, { ...ownedPr, number: 43, url: "https://github.com/amadeus-dlc/amadeus/pull/43" }], branches: [ownedBranch] }), "recover", true],
    ["duplicate landed snapshots fail closed", snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }, { path: "metrics/duplicate.json", sha: TARGET_SHA }] }), "fail-closed", true],
    ["invalid JSON fails closed", snapshotInventory({ problems: ["metrics/bad.json: malformed JSON"] }), "fail-closed", true],
    ["unknown owner fails closed", snapshotInventory({ pullRequests: [{ ...ownedPr, ownership: { ok: false, missing: ["author"] } }] }), "fail-closed", true],
    ["same prefix different SHA is not landed", snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: OTHER_SHA }] }), "fail-closed", true],
  ];

  for (const [name, inventory, action, stickyFailure] of cases) {
    test(name, () => {
      expect(decideSnapshotPublication(inventory)).toMatchObject({ action, stickyFailure });
    });
  }
});

describe("t222 snapshot ownership is an AND contract", () => {
  const valid = snapshotPr();
  const mutations: Array<[string, Record<string, unknown>]> = [
    ["repository", { headRepository: { nameWithOwner: "someone/fork" } }],
    ["author", { author: { login: "human" } }],
    ["branch", { headRefName: "feature/human" }],
    ["marker", { title: "snapshot", body: "no marker" }],
    ["JSON-only diff", { files: [{ path: "metrics/index.html", additions: 1, deletions: 0 }] }],
    ["full SHA in JSON", { files: [{ path: SNAPSHOT_PATH, additions: 1, deletions: 0, text: validSnapshotText(OTHER_SHA) }] }],
  ];

  test("all evidence owns the candidate", () => {
    expect(verifySnapshotOwnership(valid, { repository: REPOSITORY, botLogin: BOT_LOGIN, targetSha: TARGET_SHA })).toEqual({ ok: true });
  });

  for (const [evidence, mutation] of mutations) {
    test(`missing ${evidence} evidence rejects ownership`, () => {
      const result = verifySnapshotOwnership({ ...valid, ...mutation }, { repository: REPOSITORY, botLogin: BOT_LOGIN, targetSha: TARGET_SHA });
      expect(result.ok).toBe(false);
    });
  }

  test("evidence captured_at owns the candidate when backfill pins it", () => {
    const context = { repository: REPOSITORY, botLogin: BOT_LOGIN, targetSha: TARGET_SHA, capturedAt: "2026-07-30T00:00:00.000Z" };
    expect(verifySnapshotOwnership(valid, context)).toEqual({ ok: true });
  });

  test("mismatched captured_at rejects ownership under backfill", () => {
    const context = { repository: REPOSITORY, botLogin: BOT_LOGIN, targetSha: TARGET_SHA, capturedAt: "2026-07-31T00:00:00.000Z" };
    const result = verifySnapshotOwnership(valid, context);
    expect(result).toEqual({ ok: false, missing: ["evidence captured_at"] });
  });

  test("matching captured_at with a wrong path rejects ownership under backfill", () => {
    const context = { repository: REPOSITORY, botLogin: BOT_LOGIN, targetSha: TARGET_SHA, capturedAt: "2026-07-30T00:00:00.000Z" };
    const misplaced = snapshotPr({
      files: [{ path: `metrics/2026-07-31T00-00-00-000Z-${TARGET_SHA.slice(0, 12)}.json`, additions: 1, deletions: 0, text: validSnapshotText() }],
    });
    expect(verifySnapshotOwnership(misplaced, context)).toMatchObject({ ok: false });
  });

  test("unreadable snapshot text rejects ownership under backfill", () => {
    const context = { repository: REPOSITORY, botLogin: BOT_LOGIN, targetSha: TARGET_SHA, capturedAt: "2026-07-30T00:00:00.000Z" };
    const unreadable = snapshotPr({ files: [{ path: SNAPSHOT_PATH, additions: 1, deletions: 0 }] });
    expect(verifySnapshotOwnership(unreadable, context)).toMatchObject({ ok: false });
  });

  test("incomplete API fields are parse failures, not absent candidates", () => {
    expect(() => parseSnapshotCandidate({ ...valid, author: undefined })).toThrow("author is missing");
  });

  test("malformed scalar fields fail closed", () => {
    expect(() => parseSnapshotCandidate({ ...valid, title: "" })).toThrow("title is missing or is not a string");
    expect(() => parseSnapshotCandidate({ ...valid, number: 42.5 })).toThrow("number is missing or is not an integer");
    expect(() =>
      parseSnapshotCandidate({
        ...valid,
        files: [{ path: SNAPSHOT_PATH, additions: 0.5, deletions: 0, text: validSnapshotText() }],
      }),
    ).toThrow("files[0].additions is missing or is not an integer");
  });

  test("closed pull request timestamps are validated", () => {
    expect(parseSnapshotCandidate({ ...valid, state: "CLOSED", mergedAt: "2026-07-30T00:00:00Z" })).toMatchObject({
      state: "closed",
      mergedAt: "2026-07-30T00:00:00Z",
    });
  });

  test("terminal and unsupported OPEN merge states are distinguished", () => {
    expect(parseSnapshotCandidate({ ...valid, mergeStateStatus: "DIRTY" })).toMatchObject({
      mergeability: "conflicting",
    });
    expect(() => parseSnapshotCandidate({ ...valid, mergeStateStatus: "FUTURE_STATE" })).toThrow(
      'mergeStateStatus "FUTURE_STATE" is unsupported',
    );
  });

  test("a closed unmerged PR does not require a live mergeability verdict", () => {
    const parsed = parseSnapshotCandidate({
      ...valid,
      state: "CLOSED",
      mergeStateStatus: "UNKNOWN",
      mergedAt: null,
    });
    expect(parsed).toMatchObject({
      kind: "pull-request",
      state: "closed",
      mergeability: "not-applicable",
      ownership: { ok: true },
    });
  });

  test("transient OPEN merge states remain pollable", () => {
    const branch = parseSnapshotCandidate(snapshotBranch());
    for (const mergeStateStatus of ["UNKNOWN", "BEHIND", "BLOCKED"]) {
      const parsed = parseSnapshotCandidate({ ...valid, mergeStateStatus });
      expect(parsed).toMatchObject({
        kind: "pull-request",
        state: "open",
        mergeability: "pending",
        ownership: { ok: true },
      });
      if (parsed.kind !== "pull-request" || branch.kind !== "branch") throw new Error("fixture");
      expect(decideSnapshotPublication(snapshotInventory({ pullRequests: [parsed], branches: [branch] }))).toMatchObject({
        action: "reuse",
        stickyFailure: false,
      });
    }
  });
});

describe("t222 maintenance publication decision", () => {
  const ownedPr = parseMaintenanceCandidate(maintenancePr(), { repository: REPOSITORY, botLogin: BOT_LOGIN });
  const ownedBranch = parseMaintenanceCandidate(maintenanceBranch(), { repository: REPOSITORY, botLogin: BOT_LOGIN });
  if (ownedPr.kind !== "pull-request" || ownedBranch.kind !== "branch") {
    throw new Error("test fixture did not parse");
  }

  const cases: Array<[string, MaintenanceInventory, string, boolean]> = [
    ["diff without candidate creates stable PR", maintenanceInventory(), "create", false],
    ["diff with clean OPEN updates it", maintenanceInventory({ pullRequests: [ownedPr], branches: [ownedBranch] }), "update", false],
    ["conflicting OPEN is regenerated in place", maintenanceInventory({ pullRequests: [{ ...ownedPr, mergeability: "conflicting" }], branches: [ownedBranch] }), "update", true],
    ["closed PR is recovered", maintenanceInventory({ pullRequests: [{ ...ownedPr, state: "closed" }], branches: [ownedBranch] }), "recover", true],
    ["branch-only is recovered", maintenanceInventory({ branches: [ownedBranch] }), "recover", true],
    ["multiple PRs are recovered", maintenanceInventory({ pullRequests: [ownedPr, { ...ownedPr, number: 85, url: "https://github.com/amadeus-dlc/amadeus/pull/85" }], branches: [ownedBranch] }), "recover", true],
    ["no diff without candidate is no-op", maintenanceInventory({ hasDiff: false }), "no-op", false],
    ["no diff with OPEN cleans up", maintenanceInventory({ hasDiff: false, pullRequests: [ownedPr], branches: [ownedBranch] }), "cleanup-no-diff", true],
    ["unknown owner fails closed", maintenanceInventory({ pullRequests: [{ ...ownedPr, ownership: { ok: false, missing: ["author"] } }] }), "fail-closed", true],
    ["API problem fails closed", maintenanceInventory({ problems: ["headRefOid is missing"] }), "fail-closed", true],
    ["multiple branches are recovered", maintenanceInventory({ branches: [ownedBranch, { ...ownedBranch, oid: "d".repeat(40) }] }), "recover", true],
  ];

  for (const [name, inventory, action, stickyFailure] of cases) {
    test(name, () => {
      expect(decideMaintenancePublication(inventory)).toMatchObject({ action, stickyFailure });
    });
  }
});

describe("t222 maintenance ownership, lease, cutoff and deadline", () => {
  test("maintenance ownership accepts index changes and snapshot deletions", () => {
    expect(verifyMaintenanceOwnership(maintenancePr(), { repository: REPOSITORY, botLogin: BOT_LOGIN })).toEqual({ ok: true });
  });

  test("snapshot additions are never maintenance-owned", () => {
    const candidate = maintenancePr({ files: [{ path: "metrics/new.json", additions: 3, deletions: 0 }] });
    expect(verifyMaintenanceOwnership(candidate, { repository: REPOSITORY, botLogin: BOT_LOGIN }).ok).toBe(false);
  });

  test("repository, author, stable branch and marker are all required", () => {
    for (const candidate of [
      maintenancePr({ headRepository: { nameWithOwner: "someone/fork" } }),
      maintenancePr({ author: { login: "human" } }),
      maintenancePr({ headRefName: "metrics/maintenance-2" }),
      maintenancePr({ title: "maintenance", body: "missing marker" }),
    ]) {
      expect(verifyMaintenanceOwnership(candidate, { repository: REPOSITORY, botLogin: BOT_LOGIN }).ok).toBe(false);
    }
  });

  test("deadline distinguishes ready, pending and timeout without wall-clock sleep", () => {
    expect(classifyDeadline({ nowMs: 100, deadlineMs: 200, isReady: true })).toBe("ready");
    expect(classifyDeadline({ nowMs: 100, deadlineMs: 200, isReady: false })).toBe("pending");
    expect(classifyDeadline({ nowMs: 200, deadlineMs: 200, isReady: false })).toBe("timeout");
  });
});

describe("t222 snapshot publisher orchestration", () => {
  function port(inventories: SnapshotInventory[], overrides: Partial<SnapshotPublisherPort> = {}) {
    let nowMs = 0;
    const receipts: OperationReceipt[] = [];
    let index = 0;
    const implementation: SnapshotPublisherPort = {
      inventory: async () => inventories[Math.min(index++, inventories.length - 1)],
      cleanup: async () => {
        const receipt = { operation: "cleanup", target: TARGET_SHA, status: "accepted" } as const;
        receipts.push(receipt);
        return [receipt];
      },
      create: async () => {
        const receipt = { operation: "create", target: SNAPSHOT_BRANCH, status: "accepted" } as const;
        receipts.push(receipt);
        return { url: "https://github.com/amadeus-dlc/amadeus/pull/42", receipts: [receipt] };
      },
      enableAutoMerge: async (url) => {
        const receipt = { operation: "auto-merge", target: url, status: "accepted" } as const;
        receipts.push(receipt);
        return receipt;
      },
      dispatchMaintenance: async () => {
        const receipt = { operation: "dispatch", target: "metrics-maintenance", status: "accepted" } as const;
        receipts.push(receipt);
        return receipt;
      },
      nowMs: () => nowMs,
      sleep: async (milliseconds) => {
        nowMs += milliseconds;
      },
      ...overrides,
    };
    return { implementation, receipts };
  }

  test("creates one PR, waits for landed state, then dispatches maintenance", async () => {
    const initial = snapshotInventory();
    const pending = snapshotInventory({
      pullRequests: [
        {
          kind: "pull-request",
          number: 42,
          url: "https://github.com/amadeus-dlc/amadeus/pull/42",
          state: "open",
          mergeability: "mergeable",
          mergedAt: null,
          branch: SNAPSHOT_BRANCH,
          headOid: "b".repeat(40),
          repository: REPOSITORY,
          author: BOT_LOGIN,
          title: "snapshot",
          body: SNAPSHOT_MARKER,
          files: [],
          ownership: { ok: true },
        },
      ],
      branches: [
        {
          kind: "branch",
          name: SNAPSHOT_BRANCH,
          oid: "b".repeat(40),
          tipAuthor: BOT_LOGIN,
          files: [],
          ownership: { ok: true },
        },
      ],
    });
    const landed = snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }] });
    const { implementation, receipts } = port([initial, pending, landed, landed]);
    const result = await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 });
    expect(result).toMatchObject({ code: 0, finalState: "converged", stickyFailure: false });
    expect(receipts.map((receipt) => receipt.operation)).toEqual(["create", "auto-merge", "dispatch"]);
  });

  test("landed rerun only resends the explicit dispatch", async () => {
    const landed = snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }] });
    const { implementation, receipts } = port([landed, landed]);
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({ code: 0 });
    expect(receipts.map((receipt) => receipt.operation)).toEqual(["dispatch"]);
  });

  test("recovery remains failed after reaching the postcondition", async () => {
    const owned = parseSnapshotCandidate(snapshotPr());
    const branch = parseSnapshotCandidate(snapshotBranch());
    if (owned.kind !== "pull-request" || branch.kind !== "branch") throw new Error("fixture");
    const abnormal = snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }], pullRequests: [owned], branches: [branch] });
    const landed = snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }] });
    const { implementation } = port([abnormal, landed, landed]);
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "converged-with-recovery",
      stickyFailure: true,
    });
  });

  test("pending auto-merge reaches a classified timeout", async () => {
    const owned = parseSnapshotCandidate(snapshotPr());
    const branch = parseSnapshotCandidate(snapshotBranch());
    if (owned.kind !== "pull-request" || branch.kind !== "branch") throw new Error("fixture");
    const pending = snapshotInventory({ pullRequests: [owned], branches: [branch] });
    const { implementation } = port([pending]);
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 20, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "timeout",
    });
  });

  test("dispatch rejection fails an otherwise landed run", async () => {
    const landed = snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }] });
    const { implementation } = port([landed, landed], {
      dispatchMaintenance: async () => ({ operation: "dispatch", target: "metrics-maintenance", status: "rejected", detail: "HTTP 500" }),
    });
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "dispatch-rejected",
    });
  });

  test("a terminal pull request fails without polling", async () => {
    const owned = parseSnapshotCandidate(snapshotPr({ mergeStateStatus: "DIRTY" }));
    const branch = parseSnapshotCandidate(snapshotBranch());
    if (owned.kind !== "pull-request" || branch.kind !== "branch") throw new Error("fixture");
    const pending = snapshotInventory({ pullRequests: [owned], branches: [branch] });
    const { implementation } = port([snapshotInventory(), pending]);
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "publication-not-converged",
    });
  });

  test("an ownership evidence problem stays terminal while waiting for the postcondition", async () => {
    const abnormal = snapshotInventory({ problems: [`${SNAPSHOT_BRANCH}: tip author is not the publishing bot`] });
    const { implementation } = port([snapshotInventory(), abnormal]);
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "publication-not-converged",
      problems: expect.arrayContaining([`${SNAPSHOT_BRANCH}: tip author is not the publishing bot`]),
    });
  });

  test("a landed snapshot with the wrong SHA never satisfies the postcondition", async () => {
    const wrong = snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: OTHER_SHA }] });
    const { implementation } = port([snapshotInventory(), wrong], { nowMs: () => 100 });
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "timeout",
      problems: expect.arrayContaining(["landed snapshot SHA does not match target"]),
    });
  });

  test("dispatch verifies the final postcondition", async () => {
    const landed = snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: TARGET_SHA }] });
    const wrong = snapshotInventory({ landed: [{ path: SNAPSHOT_PATH, sha: OTHER_SHA }] });
    const { implementation } = port([landed, wrong]);
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "postcondition-failed",
    });
  });

  test("auto-merge rejection fails immediately", async () => {
    const { implementation } = port([snapshotInventory()], {
      enableAutoMerge: async (url) => ({
        operation: "auto-merge",
        target: url,
        status: "rejected",
        detail: "merge disabled",
      }),
    });
    expect(await runSnapshotPublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "auto-merge-rejected",
    });
  });
});

describe("t222 maintenance publisher orchestration", () => {
  function port(
    preparations: Array<{ cutoffSha: string; inventory: MaintenanceInventory }>,
    reconciliations: MaintenanceInventory[],
    overrides: Partial<MaintenancePublisherPort> = {},
  ) {
    let nowMs = 0;
    let preparationIndex = 0;
    let reconciliationIndex = 0;
    const receipts: OperationReceipt[] = [];
    const implementation: MaintenancePublisherPort = {
      prepare: async () => preparations[Math.min(preparationIndex++, preparations.length - 1)],
      currentMainSha: async () => preparations[Math.min(preparationIndex - 1, preparations.length - 1)].cutoffSha,
      cleanup: async () => {
        const receipt = { operation: "cleanup", target: MAINTENANCE_BRANCH, status: "accepted" } as const;
        receipts.push(receipt);
        return [receipt];
      },
      publish: async () => {
        const receipt = { operation: "publish", target: MAINTENANCE_BRANCH, status: "accepted" } as const;
        receipts.push(receipt);
        return { kind: "published", url: "https://github.com/amadeus-dlc/amadeus/pull/84", receipts: [receipt] };
      },
      enableAutoMerge: async (url) => {
        const receipt = { operation: "auto-merge", target: url, status: "accepted" } as const;
        receipts.push(receipt);
        return receipt;
      },
      reconcile: async () => ({
        mainSha: preparations[Math.min(preparationIndex - 1, preparations.length - 1)].cutoffSha,
        inventory: reconciliations[Math.min(reconciliationIndex++, reconciliations.length - 1)],
      }),
      nowMs: () => nowMs,
      sleep: async (milliseconds) => {
        nowMs += milliseconds;
      },
      ...overrides,
    };
    return { implementation, receipts };
  }

  test("creates one stable maintenance PR and waits for no diff", async () => {
    const hasDiff = maintenanceInventory();
    const noDiff = maintenanceInventory({ hasDiff: false });
    const { implementation, receipts } = port([{ cutoffSha: TARGET_SHA, inventory: hasDiff }], [hasDiff, noDiff]);
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 0,
      finalState: "converged",
    });
    expect(receipts.map((receipt) => receipt.operation)).toEqual(["publish", "auto-merge"]);
  });

  test("no-diff state succeeds without publishing", async () => {
    const noDiff = maintenanceInventory({ hasDiff: false });
    const { implementation, receipts } = port([{ cutoffSha: TARGET_SHA, inventory: noDiff }], [noDiff]);
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({ code: 0 });
    expect(receipts).toEqual([]);
  });

  test("cutoff advance discards output and recomputes", async () => {
    const nextSha = "d".repeat(40);
    const hasDiff = maintenanceInventory();
    const noDiff = maintenanceInventory({ hasDiff: false });
    const { implementation, receipts } = port(
      [
        { cutoffSha: TARGET_SHA, inventory: hasDiff },
        { cutoffSha: nextSha, inventory: hasDiff },
      ],
      [noDiff],
      {
        currentMainSha: async () => nextSha,
      },
    );
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({ code: 0 });
    expect(receipts.filter((receipt) => receipt.operation === "publish")).toHaveLength(1);
  });

  test("lease mismatch recomputes instead of overwriting", async () => {
    const hasDiff = maintenanceInventory();
    const noDiff = maintenanceInventory({ hasDiff: false });
    let publishCalls = 0;
    const { implementation } = port(
      [
        { cutoffSha: TARGET_SHA, inventory: hasDiff },
        { cutoffSha: TARGET_SHA, inventory: hasDiff },
      ],
      [noDiff],
      {
        publish: async () =>
          publishCalls++ === 0
            ? { kind: "retry", receipts: [{ operation: "push", target: MAINTENANCE_BRANCH, status: "rejected", detail: "lease mismatch" }] }
            : { kind: "published", url: "https://github.com/amadeus-dlc/amadeus/pull/84", receipts: [] },
      },
    );
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({ code: 0 });
    expect(publishCalls).toBe(2);
  });

  test("repeated cleanup stops at the publisher deadline", async () => {
    const pr = parseMaintenanceCandidate(maintenancePr(), { repository: REPOSITORY, botLogin: BOT_LOGIN });
    const branch = parseMaintenanceCandidate(maintenanceBranch(), { repository: REPOSITORY, botLogin: BOT_LOGIN });
    if (pr.kind !== "pull-request" || branch.kind !== "branch") throw new Error("fixture");
    const abnormal = maintenanceInventory({ hasDiff: false, pullRequests: [pr], branches: [branch] });
    let preparations = 0;
    const { implementation } = port(
      [{ cutoffSha: TARGET_SHA, inventory: abnormal }],
      [],
      {
        prepare: async () => {
          preparations += 1;
          if (preparations > 3) throw new Error("deadline was ignored");
          return { cutoffSha: TARGET_SHA, inventory: abnormal };
        },
        nowMs: () => preparations * 10,
      },
    );
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 20, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "timeout",
    });
  });

  test("repeated publish retries stop at the publisher deadline", async () => {
    const hasDiff = maintenanceInventory();
    let preparations = 0;
    const { implementation } = port(
      [{ cutoffSha: TARGET_SHA, inventory: hasDiff }],
      [],
      {
        prepare: async () => {
          preparations += 1;
          if (preparations > 3) throw new Error("deadline was ignored");
          return { cutoffSha: TARGET_SHA, inventory: hasDiff };
        },
        publish: async () => ({ kind: "retry", receipts: [] }),
        currentMainSha: async () => TARGET_SHA,
        nowMs: () => preparations * 10,
      },
    );
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 20, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "timeout",
    });
  });

  test("recovered no-diff plus OPEN remains sticky failure", async () => {
    const pr = parseMaintenanceCandidate(maintenancePr(), { repository: REPOSITORY, botLogin: BOT_LOGIN });
    const branch = parseMaintenanceCandidate(maintenanceBranch(), { repository: REPOSITORY, botLogin: BOT_LOGIN });
    if (pr.kind !== "pull-request" || branch.kind !== "branch") throw new Error("fixture");
    const abnormal = maintenanceInventory({ hasDiff: false, pullRequests: [pr], branches: [branch] });
    const noDiff = maintenanceInventory({ hasDiff: false });
    const { implementation } = port(
      [
        { cutoffSha: TARGET_SHA, inventory: abnormal },
        { cutoffSha: TARGET_SHA, inventory: noDiff },
      ],
      [noDiff],
    );
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "converged-with-recovery",
      stickyFailure: true,
    });
  });

  test("invalid inventory fails closed before mutation", async () => {
    const invalid = maintenanceInventory({ problems: ["invalid candidate"] });
    const { implementation } = port([{ cutoffSha: TARGET_SHA, inventory: invalid }], []);
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "fail-closed",
    });
  });

  test("publish rejection is terminal", async () => {
    const hasDiff = maintenanceInventory();
    const { implementation } = port([{ cutoffSha: TARGET_SHA, inventory: hasDiff }], [], {
      publish: async () => ({ kind: "rejected", receipts: [], problem: "no owned diff" }),
    });
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "publish-rejected",
    });
  });

  test("auto-merge rejection is terminal", async () => {
    const hasDiff = maintenanceInventory();
    const { implementation } = port([{ cutoffSha: TARGET_SHA, inventory: hasDiff }], [], {
      enableAutoMerge: async (url) => ({
        operation: "auto-merge",
        target: url,
        status: "rejected",
        detail: "merge disabled",
      }),
    });
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "auto-merge-rejected",
    });
  });

  test("terminal maintenance pull request fails without polling", async () => {
    const pr = parseMaintenanceCandidate(maintenancePr({ mergeStateStatus: "DIRTY" }), {
      repository: REPOSITORY,
      botLogin: BOT_LOGIN,
    });
    const branch = parseMaintenanceCandidate(maintenanceBranch(), { repository: REPOSITORY, botLogin: BOT_LOGIN });
    if (pr.kind !== "pull-request" || branch.kind !== "branch") throw new Error("fixture");
    const terminal = maintenanceInventory({ pullRequests: [pr], branches: [branch] });
    const { implementation } = port([{ cutoffSha: TARGET_SHA, inventory: maintenanceInventory() }], [terminal]);
    expect(await runMaintenancePublisher(implementation, { deadlineMs: 100, pollIntervalMs: 10 })).toMatchObject({
      code: 1,
      finalState: "publication-not-converged",
    });
  });
});
