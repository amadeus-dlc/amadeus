// t341 — projectSync ledger: codec validate/render round-trip over the closed
// key sets, and the reducer's upsert-project-entry transition.
// covers: packages/framework/core/tools/amadeus-mirror-state-codec.ts
// covers: packages/framework/core/tools/amadeus-mirror-state-reducer.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
  renderMirrorStateBlock,
  renderMirrorStateJson,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  projectLedgerPlanIsConverged,
  reduceProjectLedgerPlan,
  type MirrorProjectLedgerRowTransition,
} from "../../packages/framework/core/tools/amadeus-mirror-project-ledger-reducer.ts";
import type {
  MirrorProjectSyncEntry,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-07-27T00:00:00Z";

function entry(
  overrides: Partial<MirrorProjectSyncEntry> = {},
): MirrorProjectSyncEntry {
  return {
    project: "amadeus-dlc/5",
    projectId: "PVT_kwDOEcw2nM4BeiIO",
    itemId: "PVTI_item1",
    phaseField: "Intent Phase",
    lastAppliedStatus: "Ideation",
    state: "synced",
    updatedAt: NOW,
    ...overrides,
  };
}

function withLedger(entries: MirrorProjectSyncEntry[]): MirrorStateSnapshot {
  return { ...EMPTY_MIRROR_STATE, projectSync: { projects: entries } };
}

function reduceLedgerRow(
  ledger: MirrorStateSnapshot["projectSync"],
  row: MirrorProjectLedgerRowTransition,
) {
  const project =
    row.kind === "upsert-project-entry"
      ? row.entry.project
      : row.project;
  return reduceProjectLedgerPlan(ledger, {
    activeProjects: [project],
    rows: [row],
  });
}

function roundTrip(snapshot: MirrorStateSnapshot): MirrorStateSnapshot {
  const parsed = parseMirrorStateDocument(
    `# State\n\n${renderMirrorStateBlock(snapshot)}\n`,
  );
  if (parsed.kind !== "ok") {
    throw new Error(`unexpected invalid parse: ${parsed.issues.join("; ")}`);
  }
  return parsed.snapshot;
}

function parseJson(json: string) {
  return parseMirrorStateDocument(
    `# State\n\n<!-- amadeus:mirror-state:v1:start -->\n${json}\n<!-- amadeus:mirror-state:v1:end -->\n`,
  );
}

function blockJson(projectSync: string): string {
  return (
    '{"schema":1,"revision":0,"issueNumber":null,"provenance":null,' +
    '"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,' +
    `"auditOutbox":null,"projectSync":${projectSync}}`
  );
}

describe("t341 codec render", () => {
  test("an absent ledger renders as null", () => {
    expect(renderMirrorStateJson(EMPTY_MIRROR_STATE)).toContain(
      '"projectSync":null',
    );
  });

  test("an empty projects array also renders as null", () => {
    expect(renderMirrorStateJson(withLedger([]))).toContain('"projectSync":null');
  });

  test("a populated ledger renders every entry key in the fixed order", () => {
    expect(renderMirrorStateJson(withLedger([entry()]))).toContain(
      '"projectSync":{"projects":[{"project":"amadeus-dlc/5",' +
        '"projectId":"PVT_kwDOEcw2nM4BeiIO","itemId":"PVTI_item1",' +
        '"phaseField":"Intent Phase",' +
        `"lastAppliedStatus":"Ideation","state":"synced","updatedAt":"${NOW}"}]}`,
    );
  });

  test("nullable entry identity fields render as JSON null", () => {
    expect(
      renderMirrorStateJson(
        withLedger([
          entry({
            itemId: null,
            phaseField: null,
            lastAppliedStatus: null,
          }),
        ]),
      ),
    ).toContain(
      '"itemId":null,"phaseField":null,"lastAppliedStatus":null',
    );
  });
});

describe("t341 codec round-trip", () => {
  test("a populated ledger survives render then parse unchanged", () => {
    const snapshot = withLedger([entry(), entry({ project: "amadeus-dlc/6" })]);
    expect(roundTrip(snapshot).projectSync).toEqual({
      projects: [entry(), entry({ project: "amadeus-dlc/6" })],
    });
  });

  test("an empty ledger round-trips to null rather than an empty array", () => {
    expect(roundTrip(withLedger([])).projectSync).toBeNull();
  });

  test("re-rendering a parsed snapshot reproduces identical bytes", () => {
    const first = renderMirrorStateJson(withLedger([entry()]));
    expect(renderMirrorStateJson(roundTrip(withLedger([entry()])))).toBe(first);
  });

  test("a legacy entry without phaseField normalizes to null and re-renders the key", () => {
    const parsed = parseJson(
      blockJson(
        '{"projects":[{"project":"a/1","projectId":"p","itemId":null,' +
          `"lastAppliedStatus":"Done","state":"synced","updatedAt":"${NOW}"}]}`,
      ),
    );
    expect(parsed.kind).toBe("ok");
    if (parsed.kind === "ok") {
      expect(parsed.snapshot.projectSync?.projects[0].phaseField).toBeNull();
      expect(renderMirrorStateJson(parsed.snapshot)).toContain(
        '"itemId":null,"phaseField":null,"lastAppliedStatus":"Done"',
      );
    }
  });

  test.each(["synced", "pending", "safety-blocked"] as const)(
    "the codec accepts the %s state so U2 needs no codec change",
    (state) => {
      expect(roundTrip(withLedger([entry({ state })])).projectSync).toEqual({
        projects: [entry({ state })],
      });
    },
  );
});

describe("t341 codec rejects", () => {
  test("an unknown key inside projectSync is invalid", () => {
    const parsed = parseJson(blockJson('{"projects":[],"rogue":1}'));
    expect(parsed.kind).toBe("invalid");
    if (parsed.kind === "invalid") {
      expect(parsed.issues.join("; ")).toContain("unknown field 'rogue'");
    }
  });

  test("an unknown key inside an entry is invalid", () => {
    const parsed = parseJson(
      blockJson(
        '{"projects":[{"project":"a/1","projectId":"p","itemId":null,' +
          `"lastAppliedStatus":null,"state":"synced","updatedAt":"${NOW}","rogue":1}]}`,
      ),
    );
    expect(parsed.kind).toBe("invalid");
    if (parsed.kind === "invalid") {
      expect(parsed.issues.join("; ")).toContain("unknown field 'rogue'");
    }
  });

  test("an unknown state value is invalid", () => {
    const parsed = parseJson(
      blockJson(
        '{"projects":[{"project":"a/1","projectId":"p","itemId":null,' +
          `"lastAppliedStatus":null,"state":"drifted","updatedAt":"${NOW}"}]}`,
      ),
    );
    expect(parsed.kind).toBe("invalid");
    if (parsed.kind === "invalid") {
      expect(parsed.issues.join("; ")).toContain("unknown project sync state");
    }
  });

  test("a missing required entry key is invalid rather than defaulted", () => {
    const parsed = parseJson(
      blockJson(
        `{"projects":[{"project":"a/1","projectId":"p","state":"synced","updatedAt":"${NOW}"}]}`,
      ),
    );
    expect(parsed.kind).toBe("invalid");
    if (parsed.kind === "invalid") {
      expect(parsed.issues.join("; ")).toContain("itemId");
    }
  });

  test("a non-array projects value is invalid", () => {
    expect(parseJson(blockJson('{"projects":{}}')).kind).toBe("invalid");
  });

  test("two rows for one Project are invalid", () => {
    const row =
      '{"project":"a/1","projectId":"p","itemId":null,' +
      `"lastAppliedStatus":null,"state":"synced","updatedAt":"${NOW}"}`;
    const parsed = parseJson(blockJson(`{"projects":[${row},${row}]}`));
    expect(parsed.kind).toBe("invalid");
    if (parsed.kind === "invalid") {
      expect(parsed.issues.join("; ")).toContain("duplicate project");
    }
  });

  test("a non-timestamp updatedAt is invalid", () => {
    const parsed = parseJson(
      blockJson(
        '{"projects":[{"project":"a/1","projectId":"p","itemId":null,' +
          '"lastAppliedStatus":null,"state":"synced","updatedAt":"yesterday"}]}',
      ),
    );
    expect(parsed.kind).toBe("invalid");
  });
});

describe("t341 plan upsert", () => {
  test("the first entry creates the ledger", () => {
    const result = reduceLedgerRow(null, {
      kind: "upsert-project-entry",
      entry: entry(),
    });
    expect(result.kind).toBe("changed");
    if (result.kind === "changed") {
      expect(result.ledger).toEqual({ projects: [entry()] });
    }
  });

  test("re-applying an identical entry is unchanged, so a converged re-run writes nothing", () => {
    const result = reduceLedgerRow({ projects: [entry()] }, {
      kind: "upsert-project-entry",
      entry: entry(),
    });
    expect(result).toEqual({ kind: "unchanged" });
  });

  test("a changed field replaces the row in place without reordering", () => {
    const other = entry({ project: "amadeus-dlc/6" });
    const updated = entry({ lastAppliedStatus: "Construction" });
    const result = reduceProjectLedgerPlan(
      { projects: [entry(), other] },
      {
        activeProjects: [updated.project, other.project],
        rows: [
          { kind: "upsert-project-entry", entry: updated },
          { kind: "upsert-project-entry", entry: other },
        ],
      },
    );
    expect(result.kind).toBe("changed");
    if (result.kind === "changed") {
      expect(result.ledger).toEqual({ projects: [updated, other] });
    }
  });

  test("a changed phase field is not equal to the previous sync evidence", () => {
    const updated = entry({ phaseField: "Lifecycle" });
    const result = reduceLedgerRow({ projects: [entry()] }, {
      kind: "upsert-project-entry",
      entry: updated,
    });
    expect(result.kind).toBe("changed");
    if (result.kind === "changed") {
      expect(result.ledger).toEqual({ projects: [updated] });
    }
  });

  test("a different Project appends a new row", () => {
    const other = entry({ project: "amadeus-dlc/6" });
    const result = reduceProjectLedgerPlan(
      { projects: [entry()] },
      {
        activeProjects: [entry().project, other.project],
        rows: [
          { kind: "upsert-project-entry", entry: entry() },
          { kind: "upsert-project-entry", entry: other },
        ],
      },
    );
    expect(result.kind).toBe("changed");
    if (result.kind === "changed") {
      expect(result.ledger?.projects).toEqual([entry(), other]);
    }
  });

  test("the upsert does not mutate the input ledger", () => {
    const before = { projects: [entry()] };
    reduceLedgerRow(before, {
      kind: "upsert-project-entry",
      entry: entry({ lastAppliedStatus: "Done" }),
    });
    expect(before).toEqual({ projects: [entry()] });
  });

  test.each([
    ["an empty project key", entry({ project: "" })],
    ["an empty projectId", entry({ projectId: "" })],
    ["an empty phaseField", entry({ phaseField: "" })],
  ])("rejects %s", (_label, bad) => {
    const result = reduceLedgerRow(null, {
      kind: "upsert-project-entry",
      entry: bad,
    });
    expect(result.kind).toBe("invalid");
  });

  test("a reduced ledger survives a codec round-trip", () => {
    const result = reduceLedgerRow(null, {
      kind: "upsert-project-entry",
      entry: entry(),
    });
    if (result.kind !== "changed") throw new Error("expected a changed result");
    expect(
      roundTrip({
        ...EMPTY_MIRROR_STATE,
        projectSync: result.ledger,
      }).projectSync,
    ).toEqual({
      projects: [entry()],
    });
  });
});

describe("t341 immutable reconciliation plan", () => {
  test("prunes stale rows and applies every active Project verdict together", () => {
    const active = entry({ project: "amadeus-dlc/4" });
    const stale = entry({ project: "amadeus-dlc/stale" });
    const pending = {
      kind: "mark-project-pending",
      project: "amadeus-dlc/5",
      projectId: "PVT_5",
      itemId: "PVTI_5",
      updatedAt: NOW,
    } as const;
    const plan = {
      activeProjects: [active.project, pending.project],
      rows: [
        { kind: "upsert-project-entry", entry: active },
        pending,
      ],
    } as const;

    const result = reduceProjectLedgerPlan(
      { projects: [stale, entry({ project: pending.project })] },
      plan,
    );

    expect(result.kind).toBe("changed");
    if (result.kind !== "changed") throw new Error("expected changed");
    expect(result.ledger?.projects).toEqual([
      active,
      expect.objectContaining({
        project: pending.project,
        projectId: "PVT_5",
        itemId: "PVTI_5",
        state: "pending",
      }),
    ]);
    expect(projectLedgerPlanIsConverged(plan)).toBe(false);
  });

  test.each([
    [
      "empty scope",
      { activeProjects: [], rows: [] },
      "activeProjects must not be empty",
    ],
    [
      "duplicate scope",
      {
        activeProjects: ["amadeus-dlc/5", "amadeus-dlc/5"],
        rows: [
          { kind: "upsert-project-entry", entry: entry() },
          { kind: "upsert-project-entry", entry: entry() },
        ],
      },
      "activeProjects must not contain duplicates",
    ],
    [
      "missing row",
      { activeProjects: ["amadeus-dlc/5"], rows: [] },
      "one row per active Project",
    ],
    [
      "misordered row",
      {
        activeProjects: ["amadeus-dlc/5", "amadeus-dlc/6"],
        rows: [
          {
            kind: "upsert-project-entry",
            entry: entry({ project: "amadeus-dlc/6" }),
          },
          { kind: "upsert-project-entry", entry: entry() },
        ],
      },
      "row order must match activeProjects",
    ],
    [
      "non-synced upsert",
      {
        activeProjects: ["amadeus-dlc/5"],
        rows: [
          {
            kind: "upsert-project-entry",
            entry: entry({ state: "pending" }),
          },
        ],
      },
      "upsert rows must be synced",
    ],
  ] as const)("rejects a %s plan", (_name, plan, issue) => {
    const result = reduceProjectLedgerPlan(null, plan);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.issues.join("; ")).toContain(issue);
    }
  });

  test("an identical converged plan is unchanged and reports convergence", () => {
    const synced = entry();
    const plan = {
      activeProjects: [synced.project],
      rows: [{ kind: "upsert-project-entry", entry: synced }],
    } as const;

    expect(reduceProjectLedgerPlan({ projects: [synced] }, plan)).toEqual({
      kind: "unchanged",
    });
    expect(projectLedgerPlanIsConverged(plan)).toBe(true);
  });
});
