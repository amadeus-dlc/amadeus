// covers: function:recoverBoltDag, function:recoverGateRevision
// @test-size small

import { describe, expect, test } from "bun:test";
import {
  parseBoltDag,
  recoverBoltDag,
  recoverGateRevision,
  type RevisionEvidenceEvent,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const DAG = `# Unit dependencies

\`\`\`yaml
units:
  - name: api
    depends_on: [db]
  - name: db
    depends_on: []
  - name: ui
    depends_on: [api]
\`\`\`
`;

describe("t247 recoverBoltDag", () => {
  test("absent canonical artifact is the only single-iteration degrade", () => {
    expect(recoverBoltDag({ batches: [["stale"]] }, { kind: "absent", path: "missing" })).toEqual({ kind: "none" });
  });

  test("equal well-formed cache is retained", () => {
    expect(recoverBoltDag({ batches: [["db"], ["api"], ["ui"]] }, { kind: "content", path: "deps.md", body: DAG })).toMatchObject({
      kind: "ok",
      healed: false,
      source: "cache",
      healingReason: null,
      batches: [["db"], ["api"], ["ui"]],
    });
  });

  test("missing, empty, malformed, and stale cache heal from canonical", () => {
    const cases = [
      [undefined, "missing"],
      [{ batches: [] }, "empty"],
      [{ batches: "bad" }, "malformed"],
      [{ batches: [["api"], ["db"], ["ui"]] }, "mismatch"],
    ] as const;
    for (const [cache, healingReason] of cases) {
      expect(recoverBoltDag(cache, { kind: "content", path: "deps.md", body: DAG })).toMatchObject({
        kind: "ok",
        healed: true,
        source: "canonical",
        healingReason,
        batches: [["db"], ["api"], ["ui"]],
      });
    }
  });

  test("existing unreadable or malformed canonical source fails loud", () => {
    expect(recoverBoltDag(undefined, { kind: "unreadable", path: "deps.md", detail: "EACCES" })).toEqual({
      kind: "malformed",
      reason: "unreadable",
      detail: "EACCES",
    });
    expect(recoverBoltDag(undefined, { kind: "content", path: "deps.md", body: "broken" })).toMatchObject({
      kind: "malformed",
      reason: "missing-block",
    });
  });

  test("duplicate dependency edges are malformed canonical input", () => {
    const duplicateEdge = `# Unit dependencies

\`\`\`yaml
units:
  - name: api
    depends_on: [db, db]
  - name: db
    depends_on: []
\`\`\`
`;
    expect(parseBoltDag(duplicateEdge)).toEqual({
      ok: false,
      reason: "malformed",
      detail: 'unit "api" has duplicate dependency "db"',
    });
  });

  test("cyclic canonical dependencies fail closed", () => {
    const cyclic = `# Unit dependencies

\`\`\`yaml
units:
  - name: api
    depends_on: [db]
  - name: db
    depends_on: [api]
\`\`\`
`;
    expect(parseBoltDag(cyclic)).toEqual({
      ok: false,
      reason: "cyclic",
      detail: "dependency cycle detected",
    });
  });
});

function event(
  kind: RevisionEvidenceEvent["kind"],
  timestamp: string,
  bufferPosition: number,
  fields: Partial<RevisionEvidenceEvent> = {},
): RevisionEvidenceEvent {
  return { kind, timestamp, bufferPosition, stage: "code-generation", file: null, recovered: false, ...fields };
}

const PRODUCES = ["construction/example/code-generation/code-summary.md"];

describe("t247 recoverGateRevision", () => {
  test("organic gate, first human pivot, and later declared write recover exactly once", () => {
    const events = [
      event("ARTIFACT_CREATED", "2026-01-01T00:00:00Z", 5, { file: PRODUCES[0] }),
      event("STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:01Z", 8),
      event("HUMAN_TURN", "2026-01-01T00:00:02Z", 9, { stage: null }),
      event("ARTIFACT_UPDATED", "2026-01-01T00:00:03Z", 10, { file: PRODUCES[0] }),
    ];
    expect(recoverGateRevision(events, { stage: "code-generation", produces: PRODUCES, revisionCount: 2 })).toMatchObject({
      kind: "recovered",
      nextRevisionCount: 3,
      transactionId: expect.any(String),
    });
  });

  test("timestamp then buffer position, not input order, defines chronology", () => {
    const events = [
      event("ARTIFACT_UPDATED", "2026-01-01T00:00:02Z", 4, { file: PRODUCES[0] }),
      event("HUMAN_TURN", "2026-01-01T00:00:02Z", 3, { stage: null }),
      event("STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:01Z", 50),
    ];
    expect(recoverGateRevision(events, { stage: "code-generation", produces: PRODUCES, revisionCount: 0 }).kind).toBe("recovered");
  });

  test("reject, non-produces write, missing evidence, autonomous, and disabled never recover", () => {
    const base = [
      event("STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:01Z", 1),
      event("HUMAN_TURN", "2026-01-01T00:00:02Z", 2, { stage: null }),
    ];
    expect(recoverGateRevision([...base, event("GATE_REJECTED", "2026-01-01T00:00:03Z", 3)], { stage: "code-generation", produces: PRODUCES, revisionCount: 0 }).kind).toBe("not-needed");
    expect(recoverGateRevision([...base, event("ARTIFACT_UPDATED", "2026-01-01T00:00:03Z", 3, { file: "memory.md" })], { stage: "code-generation", produces: PRODUCES, revisionCount: 0 }).kind).toBe("not-needed");
    expect(recoverGateRevision(base, { stage: "code-generation", produces: PRODUCES, revisionCount: 0 }).kind).toBe("not-needed");
    expect(recoverGateRevision(base, { stage: "code-generation", produces: PRODUCES, revisionCount: 0, autonomous: true }).kind).toBe("not-needed");
    expect(recoverGateRevision(base, { stage: "code-generation", produces: PRODUCES, revisionCount: 0, disabled: true }).kind).toBe("not-needed");
  });

  test("stage-start fallback requires a declared write before and after the human pivot", () => {
    const good = [
      event("STAGE_STARTED", "2026-01-01T00:00:01Z", 1),
      event("ARTIFACT_CREATED", "2026-01-01T00:00:02Z", 2, { file: PRODUCES[0] }),
      event("HUMAN_TURN", "2026-01-01T00:00:03Z", 3, { stage: null }),
      event("ARTIFACT_UPDATED", "2026-01-01T00:00:04Z", 4, { file: PRODUCES[0] }),
    ];
    expect(recoverGateRevision(good, { stage: "code-generation", produces: PRODUCES, revisionCount: 0 }).kind).toBe("recovered");
    expect(recoverGateRevision(good.filter((e) => e.bufferPosition !== 2), { stage: "code-generation", produces: PRODUCES, revisionCount: 0 }).kind).toBe("not-needed");
  });

  test("stage-wide per-Unit gates accept every declared Unit and reject undeclared Units", () => {
    const unitA = "/record/construction/unit-a/code-generation/code-summary.md";
    const unitB = "/record/construction/unit-b/code-generation/code-summary.md";
    const events = [
      event("ARTIFACT_CREATED", "2026-01-01T00:00:00Z", 1, {
        file: unitA,
      }),
      event("STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:01Z", 2),
      event("HUMAN_TURN", "2026-01-01T00:00:02Z", 3, { stage: null }),
      event("ARTIFACT_UPDATED", "2026-01-01T00:00:03Z", 4, {
        file: unitB,
      }),
    ];
    expect(
      recoverGateRevision(events, {
        stage: "code-generation",
        produces: [unitA, unitB],
        revisionCount: 0,
      }),
    ).toMatchObject({ kind: "recovered", nextRevisionCount: 1 });
    expect(
      recoverGateRevision(events, {
        stage: "code-generation",
        produces: [unitA],
        revisionCount: 0,
      }),
    ).toEqual({ kind: "not-needed", reason: "revision-write-missing" });
  });

  test("Windows absolute paths match their forward-slash audit projection", () => {
    const windowsPath = "C:\\workspace\\record\\construction\\unit-a\\code-generation\\code-summary.md";
    const events = [
      event("STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:01Z", 1),
      event("HUMAN_TURN", "2026-01-01T00:00:02Z", 2, { stage: null }),
      event("ARTIFACT_UPDATED", "2026-01-01T00:00:03Z", 3, {
        file: windowsPath.replace(/\\/g, "/"),
      }),
    ];
    expect(
      recoverGateRevision(events, {
        stage: "code-generation",
        produces: [windowsPath],
        revisionCount: 0,
      }),
    ).toMatchObject({ kind: "recovered", nextRevisionCount: 1 });
  });

  test("record-relative suffixes survive a worktree path change", () => {
    const suffix = "amadeus/spaces/default/intents/example-12345678/construction/unit-a/code-generation/code-summary.md";
    const events = [
      event("STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:01Z", 1),
      event("HUMAN_TURN", "2026-01-01T00:00:02Z", 2, { stage: null }),
      event("ARTIFACT_UPDATED", "2026-01-01T00:00:03Z", 3, {
        file: `/old/worktree/${suffix}`,
      }),
    ];
    expect(
      recoverGateRevision(events, {
        stage: "code-generation",
        produces: [`/new/worktree/${suffix}`],
        revisionCount: 0,
      }),
    ).toMatchObject({ kind: "recovered", nextRevisionCount: 1 });
    expect(
      recoverGateRevision(
        events.map((item) => item.file === null ? item : { ...item, file: `/old/worktree/prefix${suffix}` }),
        {
          stage: "code-generation",
          produces: [`/new/worktree/${suffix}`],
          revisionCount: 0,
        },
      ),
    ).toEqual({ kind: "not-needed", reason: "revision-write-missing" });
  });
});
