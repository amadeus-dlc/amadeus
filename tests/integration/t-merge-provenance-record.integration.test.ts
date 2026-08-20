// covers: audit:DELEGATED_MERGE_RECORDED file:tools/amadeus-audit.ts file:otel/event-registry.ts file:knowledge/amadeus-shared/audit-format.md
//
// Unit merge-provenance (intent 260815-rfc-autonomy-modes, C11/FR-9).
//
// recordDelegatedMerge is a RECORD-ONLY API (R-2/R-3): the caller has already
// verified team.md's standing merge-approval delegation condition (required
// CI green AND pr-convergence converged:true) and already performed the PR
// merge on GitHub. This function's only job is to append a
// DELEGATED_MERGE_RECORDED audit row proving that provenance — it never
// decides whether the delegation condition held and never touches git/GitHub
// (business-logic-model.md, business-rules.md R-1..R-7).
//
// Falling proof (business-rules.md "落ちる実証" section): before this unit landed,
// `grep -rn "recordDelegatedMerge|DELEGATED_MERGE" packages/framework/core`
// returned 0 matches (exit 1) against the pre-change tree (measured via
// `git stash -u` / re-grep / `git stash pop`) — recorded in
// scratchpad/builder-notes-merge-provenance.md. This file pins the Green
// side: the API exists, succeeds with an AuditReceipt on complete evidence,
// and refuses (fail-closed) on any missing/blank evidence field.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type DelegatedMergeEvidence,
  recordDelegatedMerge,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { auditFilePath } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { canonicalAuditEvents } from "../../dist/claude/.claude/otel/event-registry.ts";
import { auditRowsFrom, countAuditEvent } from "../harness/audit-records.ts";
import { cleanupTestProject, createTestProject, DEFAULT_RECORD_DIR, seedStateFile } from "../harness/fixtures.ts";

let proj: string | undefined;
let priorProjectDir: string | undefined;

// Same per-process OTel reset discipline as t219 — the canonical emit path
// registers a Logger Provider for ONE workspace per process.
function resetOtel(): void {
  resetLoggerProviderForTests();
  resetOtelBootstrapForTests();
  resetFatalLatchForTests();
}

beforeEach(() => {
  priorProjectDir = process.env.CLAUDE_PROJECT_DIR;
  resetOtel();
});

afterEach(() => {
  if (priorProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = priorProjectDir;
  cleanupTestProject(proj);
  proj = undefined;
  resetOtel();
});

function seedProject(): string {
  const p = createTestProject();
  seedStateFile(p, "state-init-active.md");
  process.env.CLAUDE_PROJECT_DIR = p;
  return p;
}

// A refused call never reaches ensureAuditFile — the shard may not exist yet,
// which is itself proof of "no audit side effect" (a fabricated receipt would
// otherwise be indistinguishable from a genuinely absent shard).
function auditEventCount(p: string, event: string): number {
  const path = auditFilePath(p);
  if (!existsSync(path)) return 0;
  return countAuditEvent(readFileSync(path, "utf-8"), event);
}

const VALID_EVIDENCE: DelegatedMergeEvidence = {
  standingRulingRef: "cid:ci-pipeline:standing-merge-approval-ci-green",
  ciConclusion: "success",
  convergedDigest: "sha256:abc123",
};

describe("recordDelegatedMerge (C11/FR-9)", () => {
  test("complete evidence -> ok:true with an AuditReceipt, and a DELEGATED_MERGE_RECORDED row lands append-only", () => {
    proj = seedProject();

    const result = recordDelegatedMerge(VALID_EVIDENCE, proj);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.receipt.eventId).toBe("string");
    expect(result.receipt.eventId.length).toBeGreaterThan(0);
    expect(() => new Date(result.receipt.committedAt).toISOString()).not.toThrow();

    const body = readFileSync(auditFilePath(proj), "utf-8");
    expect(countAuditEvent(body, "DELEGATED_MERGE_RECORDED")).toBe(1);
    const row = auditRowsFrom(body).find((r) => r.event === "DELEGATED_MERGE_RECORDED");
    expect(row?.fields["Standing Ruling Ref"]).toBe(VALID_EVIDENCE.standingRulingRef);
    expect(row?.fields["CI Conclusion"]).toBe(VALID_EVIDENCE.ciConclusion);
    expect(row?.fields["Converged Digest"]).toBe(VALID_EVIDENCE.convergedDigest);
  });

  test("two consecutive calls append TWO rows (append-only, no overwrite)", () => {
    proj = seedProject();

    recordDelegatedMerge(VALID_EVIDENCE, proj);
    recordDelegatedMerge(VALID_EVIDENCE, proj);

    const body = readFileSync(auditFilePath(proj), "utf-8");
    expect(countAuditEvent(body, "DELEGATED_MERGE_RECORDED")).toBe(2);
  });

  test.each([
    ["standingRulingRef", { ...VALID_EVIDENCE, standingRulingRef: "" }],
    ["ciConclusion", { ...VALID_EVIDENCE, ciConclusion: "" }],
    ["convergedDigest", { ...VALID_EVIDENCE, convergedDigest: "" }],
  ] as const)("fail-closed: empty %s is refused with evidence-incomplete, no audit side effect", (missingField, evidence) => {
    proj = seedProject();

    const result = recordDelegatedMerge(evidence, proj);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "evidence-incomplete", missingField });

    expect(auditEventCount(proj, "DELEGATED_MERGE_RECORDED")).toBe(0);
  });

  test("fail-closed: whitespace-only field is treated as blank, not a value", () => {
    proj = seedProject();

    const result = recordDelegatedMerge({ ...VALID_EVIDENCE, ciConclusion: "   " }, proj);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "evidence-incomplete", missingField: "ciConclusion" });
    // A refusal must leave no audit side-effect behind it — not even the
    // shard file (nothing was ever appended).
    const shard = auditFilePath(proj);
    const body = existsSync(shard) ? readFileSync(shard, "utf-8") : "";
    expect(countAuditEvent(body, "DELEGATED_MERGE_RECORDED")).toBe(0);
  });

  test("no-retrigger of the human-approval flow: an unrelated event's registration is unaffected", () => {
    // Non-regression proof for R-6: this unit does not touch the condition-
    // decision path (GATE_APPROVED stays registered and requires "Stage" as
    // before — recordDelegatedMerge adds a new event, it does not alter any
    // existing one).
    proj = seedProject();
    const before = recordDelegatedMerge(VALID_EVIDENCE, proj);
    expect(before.ok).toBe(true);
    const body = readFileSync(auditFilePath(proj), "utf-8");
    expect(countAuditEvent(body, "GATE_APPROVED")).toBe(0);
    // Direct registration check: GATE_APPROVED must still be a canonical event
    // type in the Event Registry — a deletion would silently satisfy the
    // count-zero assertion above.
    expect(canonicalAuditEvents()).toContain("GATE_APPROVED");
  });

  test("the generic audit CLI cannot mint DELEGATED_MERGE_RECORDED (validation bypass closed)", () => {
    // recordDelegatedMerge refuses blank evidence — a generic `append` would
    // bypass that refusal entirely, so the CLI minting guard must cover the
    // event just like the presence trust anchors.
    proj = seedProject();
    const audit = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-audit.ts");
    const r = spawnSync(process.execPath, [audit, "append", "DELEGATED_MERGE_RECORDED", "--project-dir", proj], {
      encoding: "utf-8",
    });
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toContain("presence/provenance");
    const shard = auditFilePath(proj);
    const body = existsSync(shard) ? readFileSync(shard, "utf-8") : "";
    expect(countAuditEvent(body, "DELEGATED_MERGE_RECORDED")).toBe(0);
  });
});

describe("recordDelegatedMerge emit-drop arm (fail-closed)", () => {
  test("an intent-complete drop throws instead of minting a receipt for a dropped row", async () => {
    // "intent-complete" is the drop reason that reaches the post-emit arm:
    // the fatal latch is already refused by the pre-emit assertMutationAllowed.
    const proj2 = seedProject();
    const { withLockedIntentRegistry, transitionIntentStatusLocked } = await import(
      "../../dist/claude/.claude/tools/amadeus-lib.ts"
    );
    try {
      withLockedIntentRegistry(proj2, (context) =>
        transitionIntentStatusLocked(context, DEFAULT_RECORD_DIR, "complete")
      );
      expect(() => recordDelegatedMerge(VALID_EVIDENCE, proj2)).toThrow(/emit dropped/);
    } finally {
      cleanupTestProject(proj2);
    }
  });
});
