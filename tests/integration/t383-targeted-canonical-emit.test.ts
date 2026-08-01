// covers: function:createMirrorStateStorePorts
// size: medium
//
// G1 (call-site migration) — the targeted emitters.
//
// These call sites name the ledger they write to (`intent`, `space`) rather
// than inheriting the active cursor's. The migration Adapter refuses that by
// design (E-U7CG-Q3A): it routes to whatever target registerLoggerProvider was
// given, so honouring a per-call intent would land the row in the wrong
// ledger. They therefore migrate onto `emitEvent(name, fields, target)`
// directly, where the target drives BOTH halves of the write — the shard the
// row lands in AND the intentId the row claims (E-U8PRE O-T1).
//
// WHY THE ASSERTION IS "LANDED IN THE OTHER INTENT". Dropping the target is
// not a loud failure: the emit succeeds and the row is silently misfiled under
// the active cursor. A test that only checked "a v2 row exists" would pass with
// the targeting removed, so each case here mints TWO intents, points the cursor
// at the wrong one, and asserts the row is in the target's shard and absent
// from the cursor's.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { createMirrorStateStorePorts } from "../../dist/claude/.claude/tools/amadeus-mirror-state-store.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

let proj: string;
let targetDir: string;
let targetRecord: string;
let cursorRecord: string;

beforeEach(() => {
  proj = createTestProject();
  resetOtelPerProject();
  // Two intents. `target` is the one the call site names; `cursor` is the one
  // an untargeted emit would fall back to.
  const target = birthIntent(proj, "mirror-target", "default", "feature");
  const cursor = birthIntent(proj, "mirror-cursor", "default", "feature");
  targetRecord = target.recordDir;
  cursorRecord = cursor.recordDir;
  targetDir = target.recordDir.split("/").pop() as string;
});

afterEach(() => {
  cleanupTestProject(proj);
  resetOtelPerProject();
});

type Row = { schemaVersion?: number; eventName?: string; intentId?: string; attributes?: Record<string, unknown> };

function rowsIn(recordDir: string): Row[] {
  const dir = join(recordDir, "audit");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".jsonl"))
    .flatMap((n) => readFileSync(join(dir, n), "utf-8").split("\n"))
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l) as Row);
}

describe("the mirror state store's ARTIFACT_UPDATED honours its target", () => {
  test("[migration-equivalence] the row lands in the named intent, not the active cursor", () => {
    const statePath = join(targetRecord, "mirror-state.json");
    writeFileSync(statePath, "{}\n", "utf-8");
    const ports = createMirrorStateStorePorts({
      projectDir: proj,
      intent: targetDir,
      space: "default",
      statePath,
    });

    expect(ports.acquireLock()).toBe(true);
    let result: { kind: string };
    try {
      result = ports.appendArtifactUpdated({
        transactionId: "tx-t383",
        digest: "deadbeef",
        fields: {
          Artifact: "mirror-state.json",
          TransactionId: "tx-t383",
          Revision: "1",
          TransitionKind: "sync",
          Digest: "deadbeef",
          TriggerBoundary: "stage-complete",
          Reconciliation: "none",
        },
      });
    } finally {
      ports.releaseLock();
    }
    expect(result.kind).toBe("appended");

    const landed = rowsIn(targetRecord).filter((r) => r.eventName === "amadeus.artifact.updated");
    expect(landed.length).toBe(1);
    // The row claims the target intent too — a shard-only target would leave
    // the row asserting the issuer's intent, the shape the Adapter fails over.
    expect(landed[0]?.intentId).toBe(targetDir);
    // Every field survived the default-deny redaction.
    expect(landed[0]?.attributes?.TransactionId).toBe("tx-t383");
    expect(landed[0]?.attributes?.Digest).toBe("deadbeef");
    expect(landed[0]?.attributes?.Reconciliation).toBe("none");
    // Nothing leaked into the cursor's ledger, and nothing took the v1 writer.
    expect(rowsIn(cursorRecord).filter((r) => r.eventName === "amadeus.artifact.updated").length).toBe(0);
    expect(rowsIn(targetRecord).filter((r) => r.schemaVersion !== 2).length).toBe(0);
  });

  test("the idempotency check still recognises a canonical row", () => {
    // The re-append guard reads TransactionId back through auditBlockField,
    // which decodes v2 — so a second append with the same id must no-op rather
    // than duplicate. This is what would break if the row's payload moved to
    // `attributes` and the guard only knew `fields`.
    const statePath = join(targetRecord, "mirror-state.json");
    writeFileSync(statePath, "{}\n", "utf-8");
    const ports = createMirrorStateStorePorts({
      projectDir: proj,
      intent: targetDir,
      space: "default",
      statePath,
    });
    const outbox = {
      transactionId: "tx-dup",
      digest: "cafe",
      fields: {
        Artifact: "mirror-state.json",
        TransactionId: "tx-dup",
        Revision: "1",
        TransitionKind: "sync",
        Digest: "cafe",
        TriggerBoundary: "stage-complete",
        Reconciliation: "none",
      },
    };
    expect(ports.acquireLock()).toBe(true);
    try {
      expect(ports.appendArtifactUpdated(outbox).kind).toBe("appended");
      expect(ports.appendArtifactUpdated(outbox).kind).toBe("already-present");
    } finally {
      ports.releaseLock();
    }
    expect(rowsIn(targetRecord).filter((r) => r.eventName === "amadeus.artifact.updated").length).toBe(1);
  });
});
