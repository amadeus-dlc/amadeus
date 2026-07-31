// covers: otel:relay
// size: medium
//
// The FR-RLY-2 proof: the Relay generates NO Span from the Journal.
//
// This is the evidence condition (e) of the legacy-writer deletion gate reads
// (tests/deletion-gate.ts § RELAY_PROOF_MARKER, FR-MIG-4(e)). The old
// projector reconstructed spans out of audit records; the claim under proof is
// that its replacement cannot, and the two halves of the proof are deliberately
// different in kind:
//
//   - STRUCTURAL — the shipped module reaches no journal reader at all, so
//     there is no code path to audit by inspection;
//   - BEHAVIOURAL — given a fully populated Journal and an empty Span Store,
//     a flush produces nothing, and given N store records it produces exactly
//     N spans. A Relay that inferred anything from the Journal would fail both
//     (BR-1/BR-2/BR-14).
//
// MEDIUM tier: real temp workspaces with real journal shards. Imports come
// from the shipped dist tree (t369 precedent).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { flushSignals } from "../../dist/claude/.claude/otel/relay.ts";
import { DEFAULT_RECORD_DIR, cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// The SHIPPED module, not the staged source: what the gate judges is what is
// distributed.
const SHIPPED_RELAY = join(REPO_ROOT, "dist", "claude", ".claude", "otel", "relay.ts");

let proj: string;

beforeEach(() => {
  proj = createTestProject();
  birthIntent(proj, "otel-u11-relay-proof", "default", "feature");
});

afterEach(() => {
  cleanupTestProject(proj);
});

function storeDir(): string {
  const dir = join(docsRoot(proj), ".amadeus-otel");
  mkdirSync(dir, { recursive: true });
  return dir;
}

// A journal with the event shapes the old projector turned into spans:
// workflow/phase/stage start and completion, which it parented by time
// containment. Nothing here may reach the Collector.
function seedJournal(): void {
  // The ACTIVE intent's shard directory — where every journal reader in the
  // framework looks (amadeus-lib.ts auditShards). Seeding anywhere else would
  // make the behavioural half of this proof vacuous.
  const shard = join(docsRoot(proj), "audit", "proofclone01.jsonl");
  mkdirSync(dirname(shard), { recursive: true });
  const events = [
    ["WORKFLOW_STARTED", "2026-07-30T00:00:00.000Z"],
    ["PHASE_STARTED", "2026-07-30T00:00:01.000Z"],
    ["STAGE_STARTED", "2026-07-30T00:00:02.000Z"],
    ["STAGE_COMPLETED", "2026-07-30T00:00:03.000Z"],
    ["PHASE_COMPLETED", "2026-07-30T00:00:04.000Z"],
    ["WORKFLOW_COMPLETED", "2026-07-30T00:00:05.000Z"],
  ];
  const lines = events.map(
    ([event, timestamp], index) =>
      `## ${event}\n\n- Seq: ${index + 1}\n- Timestamp: ${timestamp}\n- Clone: proofclone01\n- Intent: ${DEFAULT_RECORD_DIR}\n- Stage: code-generation\n- Phase: construction\n`
  );
  writeFileSync(shard, `${lines.join("\n---\n")}\n`, "utf-8");
}

function collector() {
  const posted: { url: string; body: unknown }[] = [];
  return {
    posted,
    post: async (url: string, body: unknown) => {
      posted.push({ url, body });
      return { ok: true, detail: "" };
    },
  };
}

function postedSpans(body: unknown): Record<string, unknown>[] {
  const traces = body as { resourceSpans?: { scopeSpans: { spans: Record<string, unknown>[] }[] }[] };
  return traces.resourceSpans?.[0]?.scopeSpans[0]?.spans ?? [];
}

describe("FR-RLY-2 — structural: the Relay reaches no journal reader", () => {
  const source = () => readFileSync(SHIPPED_RELAY, "utf-8");

  test("imports neither the journal module nor the audit module", () => {
    const imports = [...source().matchAll(/^import[\s\S]*?from\s+"([^"]+)";/gm)].map((match) => match[1] as string);
    expect(imports.length).toBeGreaterThan(0);
    for (const specifier of imports) {
      expect(specifier).not.toContain("amadeus-journal");
      expect(specifier).not.toContain("amadeus-audit");
    }
  });

  test("names no journal reader, shard accessor or audit path", () => {
    const forbidden = [
      "readJournalRecords",
      "parseJournalLine",
      "journalSpanInput",
      "auditShards",
      "splitAuditRecords",
      "auditBlockField",
      "findAllEvents",
      "audit/",
    ];
    for (const token of forbidden) {
      expect(source()).not.toContain(token);
    }
  });
});

describe("FR-RLY-2 — behavioural: a populated Journal produces no Span", () => {
  test("a flush over a full Journal and an empty Span Store sends nothing", async () => {
    seedJournal();
    storeDir();
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });

    expect(result.sent).toBe(0);
    expect(sink.posted).toHaveLength(0);
  });

  test("sends exactly the Span Store's records, adding none of the Journal's events", async () => {
    seedJournal();
    const record = (spanId: string) => ({
      traceId: "0123456789abcdef0123456789abcdef",
      spanId,
      parentSpanId: null,
      name: "recorded span",
      kind: "INTERNAL",
      startMs: Date.now(),
      endMs: Date.now(),
      status: { code: "OK" },
      attributes: {},
      events: [],
      links: [],
      resource: {},
      instrumentationScope: { name: "amadeus" },
    });
    writeFileSync(
      join(storeDir(), "spans-proofclone01.jsonl"),
      `${[record("aaaaaaaaaaaaaaaa"), record("bbbbbbbbbbbbbbbb")].map((r) => JSON.stringify(r)).join("\n")}\n`,
      "utf-8"
    );

    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });

    // Two stored spans in, two spans out: no intent root, no phase span, no
    // stage span, no synthesised timing event — all of which the old projector
    // would have derived from the journal above.
    expect(result.sent).toBe(2);
    const spans = postedSpans(sink.posted[0]?.body);
    expect(spans).toHaveLength(2);
    expect(spans.map((span) => span.spanId).sort()).toEqual(["aaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbb"]);
    for (const span of spans) {
      expect(span.name).toBe("recorded span");
      expect(span.events).toEqual([]);
    }
  });
});
