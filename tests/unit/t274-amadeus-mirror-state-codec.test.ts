// t274 — S1 Mirror state document codec: sentinel, duplicate-aware tokenizer,
// entity validation, canonical render, byte-preserving splice.
// covers: packages/framework/core/tools/amadeus-mirror-state-codec.ts
// size: small

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import type {
  MirrorEventIdentity,
  MirrorOperationReceipt,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import { mirrorEventKey } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  EMPTY_MIRROR_STATE,
  MIRROR_STATE_SENTINEL_END,
  MIRROR_STATE_SENTINEL_START,
  parseMirrorStateDocument,
  renderMirrorStateBlock,
  renderMirrorStateJson,
  writeMirrorStateDocument,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import { validMirrorSnapshotArb } from "../helpers/arbitraries/mirror-snapshot.ts";

const TS = "2026-07-24T00:00:00Z";

function ev(op: "create" | "sync" | "close", instance = "i1"): MirrorEventIdentity {
  return { intentUuid: "uuid-1", boundary: { kind: "manual", instance }, operation: op };
}

function receipt(
  event: MirrorEventIdentity,
  status: MirrorOperationReceipt["status"],
  extra: Partial<MirrorOperationReceipt> = {},
): MirrorOperationReceipt {
  const key = mirrorEventKey(event);
  return { key, event, operationId: "op-1", status, preparedAt: TS, ...extra };
}

function wrap(json: string, prefix = "# state\n\n", suffix = "\n\n# end\n"): string {
  return `${prefix}${MIRROR_STATE_SENTINEL_START}\n${json}\n${MIRROR_STATE_SENTINEL_END}${suffix}`;
}

describe("codec golden + empty", () => {
  test("empty snapshot renders to the frozen 10-key wire form", () => {
    expect(renderMirrorStateJson(EMPTY_MIRROR_STATE)).toBe(
      '{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null,"projectSync":null}',
    );
  });

  test("document without a block reads as revision-0 empty snapshot", () => {
    const parsed = parseMirrorStateDocument("# just a state file\n");
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(parsed.snapshot.revision).toBe(0);
    expect(parsed.block).toBeNull();
  });

  test("round-trip: render -> parse -> equal snapshot", () => {
    const snapshot: MirrorStateSnapshot = {
      ...EMPTY_MIRROR_STATE,
      revision: 3,
      receipts: { [mirrorEventKey(ev("create"))]: receipt(ev("create"), "prepared") },
    };
    const doc = wrap(renderMirrorStateJson(snapshot));
    const parsed = parseMirrorStateDocument(doc);
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(renderMirrorStateJson(parsed.snapshot)).toBe(renderMirrorStateJson(snapshot));
  });
});

describe("codec rejection", () => {
  test("duplicate JSON key in receipts is rejected (not silently overwritten)", () => {
    const k = mirrorEventKey(ev("create"));
    const r = JSON.stringify(receipt(ev("create"), "prepared"));
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{"${k}":${r},"${k}":${r}},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null,"projectSync":null}`;
    const parsed = parseMirrorStateDocument(wrap(json));
    expect(parsed.kind).toBe("invalid");
  });

  test("unknown root field is rejected", () => {
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null,"projectSync":null,"rogue":1}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("unknown receipt status is rejected", () => {
    const k = mirrorEventKey(ev("create"));
    const bad = JSON.stringify({ ...receipt(ev("create"), "prepared"), status: "bogus" });
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{"${k}":${bad}},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null,"projectSync":null}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("createdRevision must be a positive safe integer when present", () => {
    const event = ev("sync");
    const snapshot = {
      ...EMPTY_MIRROR_STATE,
      revision: 1,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "prepared", {
          createdRevision: 0,
        }),
      },
    };

    expect(
      parseMirrorStateDocument(wrap(renderMirrorStateJson(snapshot))).kind,
    ).toBe("invalid");
  });

  test("createdRevision cannot exceed the snapshot revision", () => {
    const event = ev("sync");
    const snapshot: MirrorStateSnapshot = {
      ...EMPTY_MIRROR_STATE,
      revision: 2,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "prepared", {
          createdRevision: 3,
        }),
      },
    };

    expect(
      parseMirrorStateDocument(wrap(renderMirrorStateJson(snapshot))).kind,
    ).toBe("invalid");
  });

  test("createdRevision must match its authorization binding", () => {
    const event = ev("sync");
    const snapshot: MirrorStateSnapshot = {
      ...EMPTY_MIRROR_STATE,
      revision: 3,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "prepared", {
          createdRevision: 2,
          authorization: {
            kind: "manual",
            event,
            operation: "sync",
            boundaryInstance: event.boundary.instance,
            receiptRevision: 3,
            invocationId: "manual-sync",
          },
        }),
      },
    };

    expect(
      parseMirrorStateDocument(wrap(renderMirrorStateJson(snapshot))).kind,
    ).toBe("invalid");
  });

  test("projectSyncRevision must be a positive safe integer when present", () => {
    const event = ev("sync");
    const snapshot = {
      ...EMPTY_MIRROR_STATE,
      revision: 1,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "prepared", {
          projectSyncRevision: 0,
        }),
      },
    };

    expect(
      parseMirrorStateDocument(wrap(renderMirrorStateJson(snapshot))).kind,
    ).toBe("invalid");
  });

  test("projectSyncRevision cannot exceed the snapshot revision", () => {
    const event = ev("sync");
    const snapshot: MirrorStateSnapshot = {
      ...EMPTY_MIRROR_STATE,
      revision: 2,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "prepared", {
          createdRevision: 1,
          projectSyncRevision: 3,
        }),
      },
    };

    expect(
      parseMirrorStateDocument(wrap(renderMirrorStateJson(snapshot))).kind,
    ).toBe("invalid");
  });

  test("projectSyncRevision cannot precede createdRevision", () => {
    const event = ev("sync");
    const snapshot: MirrorStateSnapshot = {
      ...EMPTY_MIRROR_STATE,
      revision: 3,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "prepared", {
          createdRevision: 2,
          projectSyncRevision: 1,
        }),
      },
    };

    expect(
      parseMirrorStateDocument(wrap(renderMirrorStateJson(snapshot))).kind,
    ).toBe("invalid");
  });

  test("authorization receiptRevision cannot exceed the snapshot revision", () => {
    const event = ev("sync");
    const snapshot: MirrorStateSnapshot = {
      ...EMPTY_MIRROR_STATE,
      revision: 2,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "prepared", {
          authorization: {
            kind: "manual",
            event,
            operation: "sync",
            boundaryInstance: event.boundary.instance,
            receiptRevision: 3,
            invocationId: "manual-sync",
          },
        }),
      },
    };

    expect(
      parseMirrorStateDocument(wrap(renderMirrorStateJson(snapshot))).kind,
    ).toBe("invalid");
  });

  test("Project verification cannot be attached to a close receipt", () => {
    const event = ev("close");
    const snapshot: MirrorStateSnapshot = {
      ...EMPTY_MIRROR_STATE,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "succeeded", {
          attemptedAt: TS,
          completedAt: TS,
          projectSyncVerified: true,
        }),
      },
    };
    expect(
      parseMirrorStateDocument(
        wrap(renderMirrorStateJson(snapshot)),
      ).kind,
    ).toBe("invalid");
  });

  test("two start sentinels are rejected", () => {
    const doc = `${MIRROR_STATE_SENTINEL_START}\n${renderMirrorStateJson(EMPTY_MIRROR_STATE)}\n${MIRROR_STATE_SENTINEL_END}\n${MIRROR_STATE_SENTINEL_START}\n`;
    expect(parseMirrorStateDocument(doc).kind).toBe("invalid");
  });

  test("nesting past depth 16 is rejected", () => {
    const deep = `${"[".repeat(20)}${"]".repeat(20)}`;
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{},"warnings":${deep},"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null,"projectSync":null}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("map key that is not the canonical event key is rejected (SP-C05)", () => {
    const r = JSON.stringify(receipt(ev("create"), "prepared"));
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{"wrong-key":${r}},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null,"projectSync":null}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("issueNumber without provenance is rejected (SP-C06)", () => {
    const json = `{"schema":1,"revision":0,"issueNumber":7,"provenance":null,"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null,"projectSync":null}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("rejects every unescaped C0 control character inside a JSON string", () => {
    const event = ev("create");
    const snapshot: MirrorStateSnapshot = {
      ...EMPTY_MIRROR_STATE,
      receipts: {
        [mirrorEventKey(event)]: receipt(event, "prepared"),
      },
    };
    const canonical = renderMirrorStateJson(snapshot);
    for (let codePoint = 0; codePoint <= 0x1f; codePoint++) {
      const malformed = canonical.replace(
        '"operationId":"op-1"',
        `"operationId":"op${String.fromCharCode(codePoint)}1"`,
      );
      expect(
        parseMirrorStateDocument(wrap(malformed)).kind,
        `U+${codePoint.toString(16).padStart(4, "0")}`,
      ).toBe("invalid");
    }
  });

  test("accepts valid escaped C0 control characters", () => {
    const event = ev("create");
    for (const escapedValue of ["op\t1", "op\n1", "op\u00001"]) {
      const snapshot: MirrorStateSnapshot = {
        ...EMPTY_MIRROR_STATE,
        receipts: {
          [mirrorEventKey(event)]: receipt(event, "prepared", {
            operationId: escapedValue,
          }),
        },
      };
      const parsed = parseMirrorStateDocument(
        wrap(renderMirrorStateJson(snapshot)),
      );
      expect(parsed.kind).toBe("ok");
      if (parsed.kind === "ok") {
        expect(Object.values(parsed.snapshot.receipts)[0]?.operationId).toBe(
          escapedValue,
        );
      }
    }
  });
});

describe("byte preservation", () => {
  test("non-Mirror prefix/suffix bytes are preserved across a splice", () => {
    const prefix = "# Amadeus State\n\n- **Field**: value\n\n";
    const suffix = "\n\n## Trailer\nkeep me exactly\n";
    const before: MirrorStateSnapshot = { ...EMPTY_MIRROR_STATE, revision: 1 };
    const doc0 = wrap(renderMirrorStateJson(before), prefix, suffix);
    const parsed = parseMirrorStateDocument(doc0);
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    const next: MirrorStateSnapshot = { ...before, revision: 2 };
    const doc1 = writeMirrorStateDocument(doc0, parsed.block, next);
    expect(doc1.startsWith(prefix)).toBe(true);
    expect(doc1.endsWith(suffix)).toBe(true);
    const reparsed = parseMirrorStateDocument(doc1);
    expect(reparsed.kind === "ok" && reparsed.snapshot.revision).toBe(2);
  });

  test("append into a block-less document keeps original bytes as a prefix", () => {
    const doc0 = "# existing content\nline2\n";
    const out = writeMirrorStateDocument(doc0, null, { ...EMPTY_MIRROR_STATE, revision: 1 });
    expect(out.startsWith(doc0)).toBe(true);
    expect(out).toContain(MIRROR_STATE_SENTINEL_START);
    expect(parseMirrorStateDocument(out).kind).toBe("ok");
  });
});

describe("property: arbitrary surrounding bytes round-trip", () => {
  test("prefix/suffix are preserved for any non-marker text", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9 \n#.-]*$/),
        fc.stringMatching(/^[a-zA-Z0-9 \n#.-]*$/),
        fc.integer({ min: 0, max: 50 }),
        (prefix, suffix, rev) => {
          const block = renderMirrorStateBlock({ ...EMPTY_MIRROR_STATE, revision: rev });
          const doc = `${prefix}${block}${suffix}`;
          const parsed = parseMirrorStateDocument(doc);
          if (parsed.kind !== "ok") return true; // marker collision in random text: skip
          const rewritten = writeMirrorStateDocument(doc, parsed.block, {
            ...EMPTY_MIRROR_STATE,
            revision: rev + 1,
          });
          return rewritten.startsWith(prefix) && rewritten.endsWith(suffix);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ── PBT CONVENTIONS (FR-4c) ─────────────────────────────────────────────────
// Mirrors tests/unit/t204-audit-escape.pbt.test.ts:16-28 (the canonical
// definition); scoped to the property below, since this file is not a
// PBT-only file.
// 1. DETERMINISTIC PR CI. Fixed seed (MIRROR_PBT_SEED) + fast-check's default
//    numRuns (100), so a red build replays the same counterexample.
// 2. FAILURE OUTPUT. fast-check prints seed, replay path, and the shrunk
//    counterexample — no extra wiring.
// 3. PINNING SHRUNK COUNTEREXAMPLES. A caught bug is copied into an
//    example-based test above as the permanent regression pin.
// 4. DEEP RUNS (opt-in, no new CI job). AMADEUS_PBT_DEEP=1 raises numRuns.
// ────────────────────────────────────────────────────────────────────────────
const MIRROR_PBT_SEED = 0x27_4d17;
const MIRROR_PBT_DEEP =
  process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
const MIRROR_PBT_OPTS = MIRROR_PBT_DEEP
  ? { seed: MIRROR_PBT_SEED, numRuns: 50_000 }
  : { seed: MIRROR_PBT_SEED };

// P-MR1 generalizes the example at :58 over the whole valid-snapshot space.
// The equation is `render . parse . render = render` (equality of the CANONICAL
// FORM), not `parse . render = id`: MirrorStateSnapshot is optional-with-null
// (amadeus-mirror-types.ts:208/:212/:216), so an absent key and an explicit null
// are the same state and a structural comparison would report a false red.
// Surrounding bytes are deliberately NOT varied here — that axis belongs to the
// property at :341, which in turn keeps its snapshot space near-fixed.
describe("property: valid snapshot round-trip", () => {
  test("render -> parse -> render is stable for any valid snapshot", () => {
    fc.assert(
      fc.property(validMirrorSnapshotArb, (snapshot: MirrorStateSnapshot) => {
        const canonical = renderMirrorStateJson(snapshot);
        const parsed = parseMirrorStateDocument(renderMirrorStateBlock(snapshot));
        expect(parsed.kind, canonical).toBe("ok");
        if (parsed.kind !== "ok") return;
        expect(renderMirrorStateJson(parsed.snapshot)).toBe(canonical);
      }),
      MIRROR_PBT_OPTS,
    );
  });
});
