// covers: function:swarmEvidenceVerdict
//
// The corpus sweep (FR-6) for the approve-side reconciliation, kept in its own
// file: it reads the repository's committed intent records, while its sibling
// t402-approve-reconciliation.integration.test.ts drives the engine and spawns
// the state tool. Sharing one file made the spawn-bound tests contend with these
// reads and time out (cid:code-generation:fanout-load-settle-before-integration).
//
// Read-only throughout — nothing here writes to a record, an audit shard, or
// state (BR-U3-15).

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  auditBlockField,
  findAllEvents,
  parseBoltDag,
  type SwarmEvidence,
  swarmEvidenceVerdict,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

// The corpus sweep (FR-6). Read-only over the COMMITTED records in this repo —
// not copies into a fixture, because a copy stops tracking the records #1892
// measured and the #1893 correction that followed.
//
// The expectations are NOT recomputed here. The five refusals are the plan
// drift #1892 found (four intents) plus the #1893 record whose edge block was
// corrected; the six passes are records that are serial by plan, or that
// declare a wide batch AND carry its SWARM rows. Both sides matter: a predicate
// that only ever goes red, or only ever green, passes a one-sided sweep
// (cid:code-generation:corpus-sweep-for-new-guards).
const CORPUS: { record: string; expected: "satisfied" | number[] }[] = [
  // Refusals — declared parallel, no fan-out on record.
  { record: "260722-election-core-promotion", expected: [1, 3] },
  { record: "260724-mirror-auto-modes", expected: [2] },
  { record: "260717-test-pyramid-rebuild", expected: [2] },
  // Partial evidence: batches 2-5 ran as swarm, the width-6 batch 1 did not.
  { record: "260720-upstream-sync-230", expected: [1] },
  // #1893: unreadable edge block until the record was corrected; the corrected
  // record declares a width-2 batch 1 with no evidence behind it.
  { record: "260712-metrics-observation", expected: [1] },
  // Passes — serial by plan (no width ≥2 level to have broken).
  { record: "260717-swarm-dispatch-enum", expected: "satisfied" },
  { record: "260708-installer-distribution", expected: "satisfied" },
  { record: "260723-archived-status-guard", expected: "satisfied" },
  // Passes — a wide batch that DID fan out, which is the arm a red-only
  // predicate would never reach.
  { record: "260715-opencode-cursor-harness", expected: "satisfied" },
  { record: "260717-state-mirror-fixes", expected: "satisfied" },
  { record: "260726-plugin-host-delivery", expected: "satisfied" },
];

const INTENTS_ROOT = join(import.meta.dir, "..", "..", "amadeus", "spaces", "default", "intents");

/** Declared batches from the committed artefact — runtime-graph.json is gitignored. */
function declaredBatchesOf(record: string): string[][] {
  const path = join(INTENTS_ROOT, record, "inception", "units-generation", "unit-of-work-dependency.md");
  const parsed = parseBoltDag(readFileSync(path, "utf-8"));
  if (!parsed.ok) throw new Error(`${record}: unit-of-work-dependency.md did not parse (${parsed.reason})`);
  return parsed.batches;
}

/** The SWARM evidence a committed record's shards carry (#2354: unit-keyed). */
function evidenceOf(record: string): SwarmEvidence {
  const auditDir = join(INTENTS_ROOT, record, "audit");
  let audit = "";
  for (const file of readdirSync(auditDir)) {
    if (file.endsWith(".jsonl")) audit += `${readFileSync(join(auditDir, file), "utf-8")}\n`;
  }
  const namesOf = (block: string, field: string) =>
    (auditBlockField(block, field) ?? "").split(",").map((name) => name.trim()).filter(Boolean);
  const completed = new Set(
    findAllEvents(audit, "SWARM_COMPLETED")
      .map((found) => Number(auditBlockField(found.block, "Batch number")))
      .filter((value) => Number.isFinite(value)),
  );
  const fannedOutUnitSets = findAllEvents(audit, "SWARM_STARTED")
    .map((found) => new Set(namesOf(found.block, "Unit names")))
    .filter((units) => units.size > 0);
  const convergedByBatch = new Map<number, Set<string>>();
  for (const found of findAllEvents(audit, "SWARM_UNIT_CONVERGED")) {
    const number = Number(auditBlockField(found.block, "Batch number"));
    if (!Number.isFinite(number) || !completed.has(number)) continue;
    const units = convergedByBatch.get(number) ?? new Set<string>();
    for (const unit of namesOf(found.block, "Unit name")) units.add(unit);
    convergedByBatch.set(number, units);
  }
  return { fannedOutUnitSets, settledUnitSets: [...convergedByBatch.values()] };
}

describe("t402 corpus sweep over committed records (FR-6)", () => {
  for (const { record, expected } of CORPUS) {
    test(`${record} reconciles as expected`, () => {
      const verdict = swarmEvidenceVerdict(declaredBatchesOf(record), evidenceOf(record));
      if (expected === "satisfied") {
        expect(verdict.kind).toBe("satisfied");
        return;
      }
      expect(verdict.kind).toBe("missing");
      const numbers = verdict.kind === "missing" ? verdict.batches.map((batch) => batch.number) : [];
      expect(numbers).toEqual(expected);
    });
  }

  // Both arms are actually exercised — a table that drifted to all-green or
  // all-red would still pass every case above.
  test("the table exercises both verdict arms", () => {
    expect(CORPUS.some((row) => row.expected === "satisfied")).toBe(true);
    expect(CORPUS.some((row) => row.expected !== "satisfied")).toBe(true);
  });
});
