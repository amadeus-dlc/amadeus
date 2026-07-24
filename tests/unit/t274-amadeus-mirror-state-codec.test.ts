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
  test("empty snapshot renders to the frozen 9-key wire form", () => {
    expect(renderMirrorStateJson(EMPTY_MIRROR_STATE)).toBe(
      '{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null}',
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
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{"${k}":${r},"${k}":${r}},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null}`;
    const parsed = parseMirrorStateDocument(wrap(json));
    expect(parsed.kind).toBe("invalid");
  });

  test("unknown root field is rejected", () => {
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null,"rogue":1}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("unknown receipt status is rejected", () => {
    const k = mirrorEventKey(ev("create"));
    const bad = JSON.stringify({ ...receipt(ev("create"), "prepared"), status: "bogus" });
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{"${k}":${bad}},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("two start sentinels are rejected", () => {
    const doc = `${MIRROR_STATE_SENTINEL_START}\n${renderMirrorStateJson(EMPTY_MIRROR_STATE)}\n${MIRROR_STATE_SENTINEL_END}\n${MIRROR_STATE_SENTINEL_START}\n`;
    expect(parseMirrorStateDocument(doc).kind).toBe("invalid");
  });

  test("nesting past depth 16 is rejected", () => {
    const deep = `${"[".repeat(20)}${"]".repeat(20)}`;
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{},"warnings":${deep},"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("map key that is not the canonical event key is rejected (SP-C05)", () => {
    const r = JSON.stringify(receipt(ev("create"), "prepared"));
    const json = `{"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{"wrong-key":${r}},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
  });

  test("issueNumber without provenance is rejected (SP-C06)", () => {
    const json = `{"schema":1,"revision":0,"issueNumber":7,"provenance":null,"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null}`;
    expect(parseMirrorStateDocument(wrap(json)).kind).toBe("invalid");
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
