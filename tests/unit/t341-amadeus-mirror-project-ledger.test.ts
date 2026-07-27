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
import { reduceMirrorState } from "../../packages/framework/core/tools/amadeus-mirror-state-reducer.ts";
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
    lastAppliedStatus: "Ideation",
    state: "synced",
    updatedAt: NOW,
    ...overrides,
  };
}

function withLedger(entries: MirrorProjectSyncEntry[]): MirrorStateSnapshot {
  return { ...EMPTY_MIRROR_STATE, projectSync: { projects: entries } };
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
        `"lastAppliedStatus":"Ideation","state":"synced","updatedAt":"${NOW}"}]}`,
    );
  });

  test("a null itemId and lastAppliedStatus render as JSON null", () => {
    expect(
      renderMirrorStateJson(
        withLedger([entry({ itemId: null, lastAppliedStatus: null })]),
      ),
    ).toContain('"itemId":null,"lastAppliedStatus":null');
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

describe("t341 reducer upsert", () => {
  test("the first entry creates the ledger", () => {
    const result = reduceMirrorState(
      EMPTY_MIRROR_STATE,
      { kind: "upsert-project-entry", entry: entry() },
      NOW,
    );
    expect(result.kind).toBe("changed");
    if (result.kind === "changed") {
      expect(result.snapshot.projectSync).toEqual({ projects: [entry()] });
    }
  });

  test("re-applying an identical entry is unchanged, so a converged re-run writes nothing", () => {
    const result = reduceMirrorState(
      withLedger([entry()]),
      { kind: "upsert-project-entry", entry: entry() },
      NOW,
    );
    expect(result).toEqual({ kind: "unchanged" });
  });

  test("a changed field replaces the row in place without reordering", () => {
    const other = entry({ project: "amadeus-dlc/6" });
    const updated = entry({ lastAppliedStatus: "Construction" });
    const result = reduceMirrorState(
      withLedger([entry(), other]),
      { kind: "upsert-project-entry", entry: updated },
      NOW,
    );
    expect(result.kind).toBe("changed");
    if (result.kind === "changed") {
      expect(result.snapshot.projectSync).toEqual({ projects: [updated, other] });
    }
  });

  test("a different Project appends a new row", () => {
    const other = entry({ project: "amadeus-dlc/6" });
    const result = reduceMirrorState(
      withLedger([entry()]),
      { kind: "upsert-project-entry", entry: other },
      NOW,
    );
    expect(result.kind).toBe("changed");
    if (result.kind === "changed") {
      expect(result.snapshot.projectSync?.projects).toEqual([entry(), other]);
    }
  });

  test("the upsert does not mutate the input snapshot", () => {
    const before = withLedger([entry()]);
    reduceMirrorState(
      before,
      {
        kind: "upsert-project-entry",
        entry: entry({ lastAppliedStatus: "Done" }),
      },
      NOW,
    );
    expect(before.projectSync).toEqual({ projects: [entry()] });
  });

  test.each([
    ["an empty project key", entry({ project: "" })],
    ["an empty projectId", entry({ projectId: "" })],
  ])("rejects %s", (_label, bad) => {
    const result = reduceMirrorState(
      EMPTY_MIRROR_STATE,
      { kind: "upsert-project-entry", entry: bad },
      NOW,
    );
    expect(result.kind).toBe("invalid");
  });

  test("a changed upsert clears any pending audit outbox, like every transition", () => {
    const result = reduceMirrorState(
      {
        ...EMPTY_MIRROR_STATE,
        auditOutbox: { transactionId: "t", digest: "d", fields: {} },
      },
      { kind: "upsert-project-entry", entry: entry() },
      NOW,
    );
    expect(result.kind).toBe("changed");
    if (result.kind === "changed") {
      expect(result.snapshot.auditOutbox).toBeNull();
    }
  });

  test("a reduced ledger survives a codec round-trip", () => {
    const result = reduceMirrorState(
      EMPTY_MIRROR_STATE,
      { kind: "upsert-project-entry", entry: entry() },
      NOW,
    );
    if (result.kind !== "changed") throw new Error("expected a changed result");
    expect(roundTrip(result.snapshot).projectSync).toEqual({
      projects: [entry()],
    });
  });
});
