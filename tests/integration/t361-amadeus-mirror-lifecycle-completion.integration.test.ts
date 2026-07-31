// t361 — completion-specific Project lifecycle behaviour over a real record on
// disk: the close gate that waits for every board and the prompt-mode face.
// covers: packages/framework/core/tools/amadeus-mirror-{coordinator,lifecycle}.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { runMirrorLifecycleBoundary } from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import type { MirrorStateStorePorts } from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type { MirrorStateSnapshot } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import { renderMirrorStateBlock } from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  BOARD_A,
  BOARD_B,
  canonical,
  createProjectFixture,
  drive,
  type FixtureOptions,
  fieldMutations,
  INTENT_DIR,
  INTENT_UUID,
  ISSUE,
  linkedState,
  markerBody,
  memberItem,
  NOW,
  ok,
  OPTIONS,
  ProjectGateway,
  REPO,
  rowFor,
} from "./t346-amadeus-mirror-lifecycle-projects.fixture.ts";

const roots: string[] = [];
const ROOT = join(import.meta.dir, "..", "..");
const STATE_TOOL = join(
  ROOT,
  "dist",
  "claude",
  ".claude",
  "tools",
  "amadeus-state.ts",
);
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(options: FixtureOptions = {}) {
  const result = createProjectFixture(options);
  roots.push(result.root);
  return result;
}

const TERMINAL_CRASH_POINTS = [
  "after-stage-completed-audit",
  "after-phase-completed-audit",
  "after-phase-verified-audit",
  "after-workflow-completed-audit",
  "after-state-completed",
  "after-registry-complete",
  "after-cursor-clear",
];

function terminalFixture() {
  const fx = fixture({
    lifecyclePhase: "CONSTRUCTION",
    registryStatus: "in-flight",
    completionInstance: "completion-terminal",
    state: linkedState(),
  });
  const fixtureState = readFileSync(
    join(ROOT, "tests", "fixtures", "state-fix-final-construction.md"),
    "utf-8",
  );
  writeFileSync(
    fx.statePath,
    `${fixtureState.replace(
      "## Runtime State",
      "## Runtime State\n" +
        "- **Workflow Completion Instance**: completion-terminal\n" +
        "- **Workflow Completion Stage**: build-and-test\n" +
        "- **Workflow Completion Status**: pending",
    )}\n${renderMirrorStateBlock(linkedState())}\n`,
  );
  const intents = join(
    fx.root,
    "amadeus",
    "spaces",
    fx.space,
    "intents",
  );
  writeFileSync(join(intents, "active-intent"), `${INTENT_DIR}\n`);
  return { fx, intents };
}

function runTerminal(
  fx: ReturnType<typeof fixture>,
  crashAt?: string,
) {
  return spawnSync(
    process.execPath,
    [
      STATE_TOOL,
      "complete-workflow",
      "build-and-test",
      "--completion-instance",
      "completion-terminal",
      "--intent",
      INTENT_DIR,
      "--space",
      fx.space,
      "--project-dir",
      fx.root,
    ],
    {
      encoding: "utf-8",
      env: {
        ...process.env,
        AMADEUS_SKIP_ARTIFACT_GUARD: "1",
        AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        ...(crashAt
          ? { AMADEUS_TEST_COMPLETE_WORKFLOW_CRASH_AT: crashAt }
          : {}),
      },
    },
  );
}

function terminalEventCounts(fx: ReturnType<typeof fixture>) {
  const auditDir = join(
    fx.root,
    "amadeus",
    "spaces",
    fx.space,
    "intents",
    INTENT_DIR,
    "audit",
  );
  const counts = new Map<string, number>();
  if (!existsSync(auditDir)) return counts;
  for (const name of readdirSync(auditDir)) {
    if (!name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(auditDir, name), "utf-8").split("\n")) {
      if (!line.startsWith("{")) continue;
      // Shards are mixed-schema: v1 rows carry `event`, canonical v2 rows
      // carry the audit event name in `attributes.Event`.
      const row = JSON.parse(line) as {
        event?: string;
        attributes?: { Event?: string };
      };
      const event = row.event ?? row.attributes?.Event;
      if (event) counts.set(event, (counts.get(event) ?? 0) + 1);
    }
  }
  return counts;
}

function installLifecycleCrash(
  fx: ReturnType<typeof fixture>,
  point: "before-final-sync" | "after-project-done" | "before-close",
): () => boolean {
  const write = fx.ports.writeDocumentAtomic;
  let injected = false;
  fx.ports = {
    ...fx.ports,
    writeDocumentAtomic(text: string) {
      const syncPending =
        text.includes('"operation":"sync"') &&
        text.includes('"status":"prepared"');
      const closePrepared =
        text.includes('"operation":"close"') &&
        text.includes('"status":"prepared"');
      const closeAttempted =
        text.includes('"operation":"close"') &&
        text.includes('"status":"attempted"');
      const shouldFail =
        !injected &&
        ((point === "before-final-sync" && syncPending) ||
          (point === "after-project-done" && closePrepared) ||
          (point === "before-close" && closeAttempted));
      if (shouldFail) {
        injected = true;
        return {
          kind: "io-failure" as const,
          summary: `injected ${point} failure`,
        };
      }
      return write(text);
    },
  } satisfies MirrorStateStorePorts;
  return () => injected;
}

// A completion whose sync receipt already succeeded but whose ledger still owes
// a board: only the gate can withhold the close here, so this pair isolates it
// from the receipt hold that parks an unsettled sync.
function completedSyncState(
  row: Readonly<{
    state: "synced" | "pending";
    lastAppliedStatus: string | null;
  }>,
  options: Readonly<{ verified?: boolean; legacy?: boolean }> = {},
): MirrorStateSnapshot {
  const event = mirrorEventIdentity(
    INTENT_UUID,
    { kind: "workflow-completed", instance: "completion-gate" },
    "sync",
  );
  const key = mirrorEventKey(event);
  return linkedState({
    revision: 1,
    receipts: {
      [key]: {
        key,
        event,
        operationId: "op-sync",
        ...(options.legacy ? {} : { createdRevision: 1 }),
        status: "succeeded",
        preparedAt: NOW,
        attemptedAt: NOW,
        completedAt: NOW,
        ...(options.verified ? { projectSyncVerified: true as const } : {}),
        authorization: {
          kind: "auto",
          event,
          operation: "sync",
          boundaryInstance: event.boundary.instance,
          receiptRevision: 1,
          landing: {
            registryStatus: "complete",
            workflowStatus: "Completed",
          },
          resolvedMode: "auto",
        },
      },
    },
    projectSync: {
      projects: [
        {
          project: canonical(BOARD_A),
          projectId: `PVT_${BOARD_A.number}`,
          itemId: `PVTI_${BOARD_A.number}`,
          phaseField: "Intent Phase",
          lastAppliedStatus: row.lastAppliedStatus,
          state: row.state,
          updatedAt: NOW,
        },
      ],
    },
  });
}

describe("t346 completion gate", () => {
  test("a prepared in-flight completion reaches Done and close before registry seal", async () => {
    const fx = fixture({
      lifecyclePhase: "CONSTRUCTION",
      registryStatus: "in-flight",
      completionInstance: "completion-gate",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Construction")];

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Done");
    expect(gateway.issue.state).toBe("CLOSED");
    const syncKey = mirrorEventKey(
      mirrorEventIdentity(
        INTENT_UUID,
        { kind: "workflow-completed", instance: "completion-gate" },
        "sync",
      ),
    );
    expect(fx.state().receipts[syncKey]?.authorization?.landing).toEqual({
      registryStatus: "in-flight",
      workflowStatus: "Running",
      completionInstance: "completion-gate",
    });
  });

  test.each(TERMINAL_CRASH_POINTS)(
    "terminal commit resumes after %s without duplicate terminal audit",
    async (crashAt) => {
      const { fx, intents } = terminalFixture();
      const gateway = new ProjectGateway(markerBody());
      gateway.items = [memberItem(BOARD_A, "Construction")];
      await drive(
        fx,
        gateway,
        { kind: "workflow-completed", instance: "completion-terminal" },
      );
      expect(gateway.issue.state).toBe("CLOSED");
      expect(
        gateway.history.filter((entry) =>
          entry === `update:${canonical(BOARD_A)}`
        ),
      ).toHaveLength(1);
      expect(gateway.history.filter((entry) => entry === "edit")).toHaveLength(
        1,
      );
      expect(gateway.history.filter((entry) => entry === "close")).toHaveLength(
        1,
      );

      const crashed = runTerminal(fx, crashAt);
      expect(crashed.status).toBe(86);
      expect(crashed.stderr).toContain(crashAt);
      const recovered = runTerminal(fx);
      expect(recovered.status).toBe(0);
      const recoveredState = readFileSync(fx.statePath, "utf-8");

      expect(recoveredState).toContain(
        "- **Status**: Completed",
      );
      expect(recoveredState).toContain(
        "- **Workflow Completion Instance**: completion-terminal",
      );
      const registry = JSON.parse(
        readFileSync(join(intents, "intents.json"), "utf-8"),
      ) as Array<{ dirName: string; status: string }>;
      expect(
        registry.find((entry) => entry.dirName === INTENT_DIR)?.status,
      ).toBe("complete");
      expect(existsSync(join(intents, "active-intent"))).toBe(false);
      const counts = terminalEventCounts(fx);
      for (
        const event of [
          "STAGE_COMPLETED",
          "PHASE_COMPLETED",
          "PHASE_VERIFIED",
          "WORKFLOW_COMPLETED",
        ]
      ) {
        expect(counts.get(event)).toBe(1);
      }
      const replay = runTerminal(fx);
      expect(replay.status).toBe(0);
      expect(readFileSync(fx.statePath, "utf-8")).toBe(recoveredState);
      expect(terminalEventCounts(fx)).toEqual(counts);
    },
    120_000,
  );

  test.each([
    "before-final-sync",
    "after-project-done",
    "before-close",
  ] as const)(
    "the same completion boundary resumes after %s without repeating remote mutations",
    async (point) => {
      const { fx, intents } = terminalFixture();
      const gateway = new ProjectGateway(markerBody());
      const injected = installLifecycleCrash(fx, point);
      gateway.items = [memberItem(BOARD_A, "Construction")];
      const boundary = {
        kind: "workflow-completed" as const,
        instance: "completion-terminal",
      };

      await drive(fx, gateway, boundary);
      expect(injected()).toBe(true);
      expect(readFileSync(fx.statePath, "utf-8")).toContain(
        "- **Workflow Completion Instance**: completion-terminal",
      );
      const registryAfterFailure = JSON.parse(
        readFileSync(join(intents, "intents.json"), "utf-8"),
      ) as Array<{ dirName: string; status: string }>;
      expect(
        registryAfterFailure.find((entry) => entry.dirName === INTENT_DIR)
          ?.status,
      ).toBe("in-flight");
      expect(readFileSync(join(intents, "active-intent"), "utf-8").trim()).toBe(
        INTENT_DIR,
      );
      const failedSnapshot = fx.state();
      expect(failedSnapshot.auditOutbox ?? null).toBeNull();
      expect(failedSnapshot.expectedPrompt).toBeUndefined();
      expect(terminalEventCounts(fx).size).toBe(0);
      expect(gateway.issue.state).toBe("OPEN");
      const syncReceipt = Object.values(failedSnapshot.receipts).find(
        (receipt) =>
          receipt.event.boundary.kind === "workflow-completed" &&
          receipt.event.boundary.instance === "completion-terminal" &&
          receipt.event.operation === "sync",
      );
      const closeReceipt = Object.values(failedSnapshot.receipts).find(
        (receipt) =>
          receipt.event.boundary.kind === "workflow-completed" &&
          receipt.event.boundary.instance === "completion-terminal" &&
          receipt.event.operation === "close",
      );
      if (point === "before-final-sync") {
        expect(syncReceipt).toBeUndefined();
        expect(gateway.history).not.toContain("edit");
        expect(fieldMutations(gateway)).toEqual([]);
      } else {
        expect(syncReceipt).toBeDefined();
        expect(rowFor(failedSnapshot, BOARD_A)?.lastAppliedStatus).toBe("Done");
        expect(fieldMutations(gateway)).toHaveLength(1);
      }
      if (point === "before-close") {
        expect(syncReceipt?.status).toBe("succeeded");
        expect(closeReceipt?.status).toBe("prepared");
      } else if (point === "after-project-done") {
        expect(closeReceipt).toBeUndefined();
      }
      expect(gateway.history).not.toContain("close");

      await drive(fx, gateway, boundary);
      expect(gateway.issue.state).toBe("CLOSED");
      expect(
        gateway.history.filter((entry) => entry === "edit"),
      ).toHaveLength(1);
      expect(
        gateway.history.filter((entry) =>
          entry === `update:${canonical(BOARD_A)}`
        ),
      ).toHaveLength(1);
      expect(
        gateway.history.filter((entry) => entry === "close"),
      ).toHaveLength(1);
      expect(runTerminal(fx).status).toBe(0);
      expect(readFileSync(fx.statePath, "utf-8")).toContain(
        "- **Status**: Completed",
      );
    },
    120_000,
  );

  test("a moved cursor keeps the original Intent pinned through lifecycle and terminal commit", async () => {
    const { fx, intents } = terminalFixture();
    const otherIntent = "260727-other-d4c3b2a1";
    const otherPath = join(intents, otherIntent);
    mkdirSync(otherPath, { recursive: true });
    const otherState = "# Other Intent\n- **Status**: Running\n";
    writeFileSync(join(otherPath, "amadeus-state.md"), otherState);
    const registryPath = join(intents, "intents.json");
    const registry = JSON.parse(
      readFileSync(registryPath, "utf-8"),
    ) as Array<Record<string, unknown>>;
    registry.push({
      uuid: "00000000-0000-7000-8000-00000000f00d",
      slug: "other",
      dirName: otherIntent,
      scope: "fix",
      repos: [REPO.canonical],
      status: "in-flight",
    });
    writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    writeFileSync(join(intents, "active-intent"), `${otherIntent}\n`);
    const otherRegistryBefore = (
      JSON.parse(readFileSync(registryPath, "utf-8")) as Array<{
        dirName: string;
        status: string;
      }>
    ).find((entry) => entry.dirName === otherIntent);

    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Construction")];
    await drive(
      fx,
      gateway,
      { kind: "workflow-completed", instance: "completion-terminal" },
    );
    expect(gateway.issue.state).toBe("CLOSED");
    expect(readFileSync(join(otherPath, "amadeus-state.md"), "utf-8")).toBe(
      otherState,
    );
    expect(existsSync(join(otherPath, "audit"))).toBe(false);

    const terminal = runTerminal(fx);
    expect(terminal.status).toBe(0);
    expect(readFileSync(join(intents, "active-intent"), "utf-8").trim()).toBe(
      otherIntent,
    );
    expect(readFileSync(join(otherPath, "amadeus-state.md"), "utf-8")).toBe(
      otherState,
    );
    expect(existsSync(join(otherPath, "audit"))).toBe(false);
    const afterRegistry = JSON.parse(
      readFileSync(registryPath, "utf-8"),
    ) as Array<{ dirName: string; status: string }>;
    expect(
      afterRegistry.find((entry) => entry.dirName === otherIntent),
    ).toEqual(otherRegistryBefore);
    expect(
      afterRegistry.find((entry) => entry.dirName === INTENT_DIR)?.status,
    ).toBe("complete");
  });

  test("a pre-marker final sync is re-queried before close", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: completedSyncState({
        state: "synced",
        lastAppliedStatus: "Done",
      }),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Operation")];

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    const queriedAt = gateway.history.indexOf("list");
    const updatedAt = gateway.history.indexOf(`update:${canonical(BOARD_A)}`);
    const closedAt = gateway.history.indexOf("close");
    expect(queriedAt).toBeGreaterThanOrEqual(0);
    expect(updatedAt).toBeGreaterThan(queriedAt);
    expect(closedAt).toBeGreaterThan(updatedAt);
    expect(gateway.issue.state).toBe("CLOSED");
    const syncKey = mirrorEventKey(
      mirrorEventIdentity(
        INTENT_UUID,
        { kind: "workflow-completed", instance: "completion-gate" },
        "sync",
      ),
    );
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("a failed legacy requeue write blocks close and retries next time", async () => {
    const seeded = completedSyncState(
      {
        state: "synced",
        lastAppliedStatus: "Done",
      },
      { legacy: true },
    );
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: seeded,
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Operation")];
    const writeDocumentAtomic = fx.ports.writeDocumentAtomic;
    let failRequeue = true;
    fx.ports = {
      ...fx.ports,
      writeDocumentAtomic(text: string) {
        if (failRequeue && text.includes('"projectSyncHold"')) {
          failRequeue = false;
          return {
            kind: "io-failure" as const,
            summary: "injected legacy requeue failure",
          };
        }
        return writeDocumentAtomic(text);
      },
    } satisfies MirrorStateStorePorts;

    const first = await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    const syncKey = mirrorEventKey(
      mirrorEventIdentity(
        INTENT_UUID,
        { kind: "workflow-completed", instance: "completion-gate" },
        "sync",
      ),
    );
    expect(gateway.history).not.toContain("close");
    expect(gateway.history).not.toContain("list");
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
    });
    expect(fx.state().receipts[syncKey].projectSyncVerified).toBeUndefined();
    if (first.kind !== "ok" || first.outcome.kind !== "continued") {
      throw new Error("expected a continued boundary outcome");
    }
    expect(first.outcome.outcomes.at(-1)).toMatchObject({
      kind: "pending",
      operation: "sync",
      warning: {
        operation: "sync",
        operationId: "op-sync",
        classification: "state-write",
      },
    });

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    expect(gateway.history).toContain("list");
    expect(gateway.history).toContain("close");
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("once every board reached done the same boundary closes", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: completedSyncState(
        { state: "synced", lastAppliedStatus: "Done" },
        { verified: true },
      ),
    });
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    expect(gateway.history).toContain("close");
    expect(gateway.history).not.toContain("list");
    expect(gateway.issue.state).toBe("CLOSED");
  });

  test("removing every configured board retires stale ledger rows from the close gate", async () => {
    const seeded = completedSyncState({
      state: "synced",
      lastAppliedStatus: "Done",
    });
    const stale = {
      ...seeded,
      projectSync: {
        projects: (seeded.projectSync?.projects ?? []).map((entry) => ({
          ...entry,
          phaseField: "Lifecycle Phase",
        })),
      },
    };
    const fx = fixture({
      boards: [],
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: stale,
    });
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    expect(gateway.history).toContain("close");
    expect(gateway.history).not.toContain("list-project-items");
    expect(gateway.issue.state).toBe("CLOSED");
  });

  test("a verified sync is re-run when the configured phase field changes", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      phaseField: "Lifecycle",
      state: completedSyncState(
        { state: "synced", lastAppliedStatus: "Done" },
        { verified: true },
      ),
    });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    const queriedAt = gateway.history.indexOf("list");
    const closedAt = gateway.history.indexOf("close");
    expect(queriedAt).toBeGreaterThanOrEqual(0);
    expect(closedAt).toBeGreaterThan(queriedAt);
    expect(gateway.history).toContain("list");
    expect(gateway.issue.state).toBe("CLOSED");
    if (result.kind !== "ok" || result.outcome.kind !== "continued")
      throw new Error("expected a continued boundary outcome");
    const outcome = result.outcome.outcomes.at(-1);
    expect(outcome).toMatchObject({
      kind: "completed",
      operation: "close",
    });
    const syncKey = mirrorEventKey(
      mirrorEventIdentity(
        INTENT_UUID,
        { kind: "workflow-completed", instance: "completion-gate" },
        "sync",
      ),
    );
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
    expect(rowFor(fx.state(), BOARD_A)?.phaseField).toBe("Lifecycle");
  });

  test("a manual close re-syncs target, field, and status config drift before closing", async () => {
    const fx = fixture({
      boards: [BOARD_B],
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      phaseField: "Lifecycle",
      statusNames: { done: "Shipped" },
      state: completedSyncState(
        { state: "synced", lastAppliedStatus: "Done" },
        { verified: true },
      ),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [];
    gateway.resolveProjectFields = async (project) =>
      ok({
        projectId: `PVT_${project.number}`,
        lifecycle: {
          fieldId: `PVTSSF_${project.number}`,
          fieldName: "Lifecycle",
          options: [...OPTIONS, { id: "opt-shipped", name: "Shipped" }],
        },
        auxiliaryStatus: null,
      });

    await drive(
      fx,
      gateway,
      { kind: "manual", instance: "manual-close-drift" },
      { operation: "close", invocationId: "manual-close-drift" },
    );

    const queriedAt = gateway.history.indexOf("list");
    const addedAt = gateway.history.indexOf(`add:${canonical(BOARD_B)}`);
    const updatedAt = gateway.history.indexOf(`update:${canonical(BOARD_B)}`);
    const closedAt = gateway.history.indexOf("close");
    expect(queriedAt).toBeGreaterThanOrEqual(0);
    expect(addedAt).toBeGreaterThan(queriedAt);
    expect(updatedAt).toBeGreaterThan(addedAt);
    expect(closedAt).toBeGreaterThan(updatedAt);
    expect(rowFor(fx.state(), BOARD_B)).toMatchObject({
      phaseField: "Lifecycle",
      lastAppliedStatus: "Shipped",
      state: "synced",
    });
    expect(gateway.issue.state).toBe("CLOSED");
  });

  test("disabling Projects retires an existing sync hold and then closes", async () => {
    const seeded = completedSyncState({
      state: "pending",
      lastAppliedStatus: "Operation",
    });
    const syncKey = Object.keys(seeded.receipts)[0];
    const heldReceipt = {
      ...seeded.receipts[syncKey],
      status: "pending" as const,
      projectSyncHold: {
        reason: "project-sync-unsettled" as const,
        heldAt: NOW,
      },
    };
    const held = {
      ...seeded,
      revision: 1,
      receipts: { [syncKey]: heldReceipt },
    };
    const fx = fixture({
      boards: [],
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: held,
    });
    const gateway = new ProjectGateway(markerBody());
    const priorProvenance = fx.state().provenance;

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    expect(gateway.history).not.toContain("list");
    expect(fieldMutations(gateway)).toEqual([]);
    expect(gateway.history).toContain("close");
    expect(gateway.issue.state).toBe("CLOSED");
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
      completedAt: NOW,
    });
    expect(fx.state().receipts[syncKey].projectSyncHold).toBeUndefined();
    expect(fx.state().receipts[syncKey].projectSyncVerified).toBeUndefined();
    expect(fx.state().issueNumber).toBe(ISSUE);
    expect(fx.state().provenance).toEqual(priorProvenance);
  });

  test("an unsettled final sync parks the sync itself, so the close is never reached", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [
      memberItem(BOARD_A, null),
      memberItem(BOARD_B, null),
    ];
    gateway.updateFailures.set(BOARD_B.number, "rate-limit");

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-2",
    });

    expect(gateway.history).not.toContain("close");
    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Done");
    expect(rowFor(fx.state(), BOARD_B)?.state).toBe("pending");
  });

  test("the recovered board converges on a later boundary and the Issue closes", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [
      memberItem(BOARD_A, null),
      memberItem(BOARD_B, null),
    ];
    gateway.updateFailures.set(BOARD_B.number, "rate-limit");

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-3",
    });
    gateway.updateFailures.delete(BOARD_B.number);
    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-4",
    });

    expect(rowFor(fx.state(), BOARD_B)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Done",
    });
    expect(gateway.history).toContain("close");
  });

  test("a failed Project ledger write cannot close and the same sync retries after recovery", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: linkedState({
        projectSync: {
          projects: [
            {
              project: canonical(BOARD_A),
              projectId: `PVT_${BOARD_A.number}`,
              itemId: `PVTI_${BOARD_A.number}`,
              phaseField: "Intent Phase",
              lastAppliedStatus: "Done",
              state: "synced",
              updatedAt: NOW,
            },
          ],
        },
      }),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Operation")];
    gateway.updateFailures.set(BOARD_A.number, "network");
    const writeDocumentAtomic = fx.ports.writeDocumentAtomic;
    let remainingProjectWriteFailures = 2;
    fx.ports = {
      ...fx.ports,
      writeDocumentAtomic(text: string) {
        if (
          remainingProjectWriteFailures > 0 &&
          gateway.history.includes(`update:${canonical(BOARD_A)}`) &&
          (text.includes('"state":"pending"') ||
            text.includes('"projectSyncHold"'))
        ) {
          remainingProjectWriteFailures -= 1;
          return {
            kind: "io-failure" as const,
            summary: "injected Project bookkeeping failure",
          };
        }
        return writeDocumentAtomic(text);
      },
    } satisfies MirrorStateStorePorts;
    const boundary = {
      kind: "workflow-completed",
      instance: "completion-retry",
    } as const;

    await drive(fx, gateway, boundary);

    const syncKey = mirrorEventKey(
      mirrorEventIdentity(INTENT_UUID, boundary, "sync"),
    );
    expect(gateway.history).not.toContain("close");
    expect(gateway.issue.state).toBe("OPEN");
    // The old flow attempted a second, post-failure hold write. The barrier is
    // already durable now, so only the failed ledger write is reached.
    expect(remainingProjectWriteFailures).toBe(1);
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
    expect(rowFor(fx.state(), BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Done",
    });

    remainingProjectWriteFailures = 0;
    gateway.updateFailures.delete(BOARD_A.number);
    await drive(fx, gateway, boundary);

    expect(
      gateway.history.filter(
        (entry) => entry === `update:${canonical(BOARD_A)}`,
      ),
    ).toHaveLength(2);
    expect(fx.state().receipts[syncKey].status).toBe("succeeded");
    expect(rowFor(fx.state(), BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Done",
    });
    expect(gateway.history).toContain("close");
    expect(gateway.issue.state).toBe("CLOSED");
  });
});

describe("t346 prompt Project face", () => {
  test.each([
    ["successful retirement", "none", null],
    ["verification requeue write failure", "prepare", "sync"],
    ["stale prompt consumption write failure", "consume", "close"],
  ] as const)("%s keeps close safe", async (_name, failure, blockedOperation) => {
    const boundary = {
      kind: "workflow-completed",
      instance: "completion-gate",
    } as const;
    const fx = fixture({
      mode: "prompt",
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: completedSyncState(
        { state: "synced", lastAppliedStatus: "Done" },
        { verified: true },
      ),
    });
    const gateway = new ProjectGateway(markerBody());
    const asked = await drive(fx, gateway, boundary);
    if (
      asked.kind !== "ok" ||
      asked.outcome.kind !== "ask" ||
      asked.outcome.operation !== "close"
    ) {
      throw new Error("expected a close prompt");
    }
    writeFileSync(
      join(fx.root, "amadeus", "config.json"),
      JSON.stringify({
        "auto-mirror": "prompt",
        "mirror-projects": [
          { project: canonical(BOARD_A), "phase-field": "Lifecycle" },
        ],
      }),
    );
    if (failure !== "none") {
      const writeDocumentAtomic = fx.ports.writeDocumentAtomic;
      fx.ports = {
        ...fx.ports,
        writeDocumentAtomic(text: string) {
          const consumingPrompt = text.includes('"expectedPrompt":null');
          const selected =
            failure === (consumingPrompt ? "consume" : "prepare");
          if (selected && text.includes('"projectSyncHold"')) {
            return {
              kind: "io-failure" as const,
              summary: `injected ${failure} state failure`,
            };
          }
          return writeDocumentAtomic(text);
        },
      } satisfies MirrorStateStorePorts;
    }

    const answered = await runMirrorLifecycleBoundary(
      {
        projectDir: fx.root,
        space: fx.space,
        intentDir: INTENT_DIR,
        repository: REPO,
        boundary,
        answer: {
          choice: "approve",
          bindingId: asked.outcome.bindingId,
          answerId: "answer-stale-close",
          event: asked.outcome.event,
          operation: asked.outcome.operation,
        },
      },
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
      },
    );

    expect(gateway.history).not.toContain("close");
    if (blockedOperation !== null) {
      if (
        answered.kind !== "ok" ||
        answered.outcome.kind !== "continued"
      ) {
        throw new Error("expected a pending state-write outcome");
      }
      expect(answered.outcome.outcomes.at(-1)).toMatchObject({
        kind: "pending",
        operation: blockedOperation,
        warning: {
          operation: blockedOperation,
          classification: "state-write",
          retryable: true,
        },
      });
      return;
    }
    if (answered.kind !== "ok" || answered.outcome.kind !== "ask") {
      throw new Error("expected a replacement sync prompt");
    }
    expect(answered.outcome.operation).toBe("sync");
    const syncKey = mirrorEventKey(
      mirrorEventIdentity(INTENT_UUID, boundary, "sync"),
    );
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
    expect(fx.state().receipts[syncKey].projectSyncVerified).toBeUndefined();
    expect(fx.state().expectedPrompt?.operation).toBe("sync");
  });

  test("the ask names the boards and the column the approval would write", async () => {
    const fx = fixture({ mode: "prompt", state: linkedState() });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "phase-verified",
      phase: "ideation",
      instance: "prompt-1",
    });

    if (result.kind !== "ok" || result.outcome.kind !== "ask")
      throw new Error("expected an ask outcome");
    expect(result.outcome.question).toContain(
      'Projects: 1 board(s); Status: "Ideation"',
    );
    // The Project face rides inside the existing per-operation binding.
    expect(result.outcome.operation).toBe("sync");
  });

  test("a create ask says the boards would be joined", async () => {
    const fx = fixture({ mode: "prompt" });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "intent-capture-approved",
      instance: "prompt-2",
    });

    if (result.kind !== "ok" || result.outcome.kind !== "ask")
      throw new Error("expected an ask outcome");
    expect(result.outcome.question).toContain(
      'Projects: 1 board(s) to join; Status: "Ideation"',
    );
  });

  test("a parked ask says the column is left unchanged", async () => {
    const fx = fixture({ mode: "prompt", state: linkedState() });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "parked",
      stage: "scope-definition",
      instance: "prompt-3",
    });

    if (result.kind !== "ok" || result.outcome.kind !== "ask")
      throw new Error("expected an ask outcome");
    expect(result.outcome.question).toContain(
      "Projects: 1 board(s); Status: left unchanged",
    );
  });

  test("with no board configured the ask says nothing about Projects", async () => {
    const fx = fixture({
      mode: "prompt",
      boards: [],
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "phase-verified",
      phase: "ideation",
      instance: "prompt-4",
    });

    if (result.kind !== "ok" || result.outcome.kind !== "ask")
      throw new Error("expected an ask outcome");
    expect(result.outcome.question).not.toContain("Projects:");
  });
});
