// covers: subcommand:amadeus-state:declare-docs-only, audit:GUARD_EXEMPTED, function:handleDeclareDocsOnly, function:verifyDocsOnlyEvidence, function:verifyStageArtifacts, function:setIntentDocsOnly, function:docsOnlyDeclaration
//
// t215 - docs-only workspace_requires exemption (Issue #499 / #848).
//
// Re-grounds the B002 (#499) contract that was lost from the source tree (RE
// found declare-docs-only / GUARD_EXEMPTED / docsOnly at 0 hits): a docs-only
// Intent can be declared once (with evidence referencing a REAL human-approval
// audit event), after which a workspace_requires stage (code-generation) may
// complete WITHOUT source work outside amadeus/, and the exemption is recorded
// as a GUARD_EXEMPTED audit event.
//
// Mechanism: cli. verifyStageArtifacts runs BEFORE any state mutation on the
// completion paths (approve here) and terminates with process.exit on a guard
// failure, so this crosses the PROCESS boundary by spawning the real dist tool.
//
// CRITICAL harness note (same as t185): run-tests.ts sets
// AMADEUS_SKIP_ARTIFACT_GUARD=1 suite-wide. The exemption must NOT depend on
// that bypass, so every guard-exercising spawn here DELETES the var from the
// child env - otherwise it would be testing the bypass, not the declaration.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seededAuditShard,
  seededRecordDir,
  seedStateFile,
} from "../harness/fixtures.ts";

// Standalone hermeticity: default the guard bypasses so a bare `bun test <file>`
// matches the suite runner. Guard-enforcement spawns re-enable the artifact
// guard by deleting its var in their own env (guarded()), so this default does
// not mask enforcement coverage.
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";

const BUN = process.execPath;
const STATE = join(AMADEUS_SRC, "tools", "amadeus-state.ts");
const MID_IDEATION = "state-mid-ideation.md";
const UNIT = "user-auth";

// Run a state subcommand with the artifact guard ENABLED (clear the suite's
// bypass var), proving the declaration path - not the env bypass - is in force.
function guarded(proj: string, args: string[]): { rc: number; out: string } {
  const env = { ...process.env };
  delete env.AMADEUS_SKIP_ARTIFACT_GUARD;
  const r = spawnSync(BUN, [STATE, ...args, "--project-dir", proj], {
    encoding: "utf-8",
    env,
  });
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

// declare-docs-only never runs the artifact guard; drive it with the ambient env.
function state(proj: string, args: string[]): { rc: number; out: string } {
  const r = spawnSync(BUN, [STATE, ...args, "--project-dir", proj], {
    encoding: "utf-8",
    env: { ...process.env },
  });
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function field(proj: string, name: string): string {
  return guarded(proj, ["get", name]).out.trim();
}

function writeRecordDoc(proj: string, rel: string): void {
  const full = join(seededRecordDir(proj), rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, "# stub\n\n## A\n\n## B\n");
}

// Append a human-approval audit event to the intent's DETERMINISTIC per-clone
// shard - the same file the spawned tool reads (readAllAuditShards) and appends
// to. Format mirrors appendAuditEntry so findAllEvents/auditField parse it.
function seedApprovalEvent(proj: string, eventType: string, stage: string): void {
  const shard = seededAuditShard(proj);
  mkdirSync(dirname(shard), { recursive: true });
  const block =
    `\n## Approval\n` +
    `**Timestamp**: 2026-07-11T10:00:00Z\n` +
    `**Event**: ${eventType}\n` +
    `**Stage**: ${stage}\n` +
    `**Detail**: docs-only approval reference\n` +
    `\n---\n`;
  writeFileSync(shard, (existsSync(shard) ? readFileSync(shard, "utf-8") : "") + block);
}

// Move the pointer to code-generation, in-progress, and write its two per-unit
// produces[] docs (satisfies the produces-existence layer) but NO source code.
function stageCodeGenDocsOnly(proj: string): void {
  guarded(proj, ["set", "Current Stage=code-generation"]);
  guarded(proj, ["checkbox", "code-generation=in-progress"]);
  writeRecordDoc(proj, `construction/${UNIT}/code-generation/code-generation-plan.md`);
  writeRecordDoc(proj, `construction/${UNIT}/code-generation/code-summary.md`);
}

function approveCodeGen(proj: string): { rc: number; out: string } {
  guarded(proj, ["gate-start", "code-generation"]);
  return guarded(proj, ["approve", "code-generation", "--user-input", "ok"]);
}

let proj: string;

describe("t215: docs-only workspace_requires exemption (#499/#848)", () => {
  beforeEach(() => {
    resetAidlcEnv();
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
  });

  afterEach(() => cleanupTestProject(proj));

  // (a) Baseline preserved: no declaration + no source work -> REFUSE (#366).
  test("REFUSES code-generation with docs but no source when NOT declared docs-only", () => {
    stageCodeGenDocsOnly(proj);
    const r = approveCodeGen(proj);
    expect(r.rc).not.toBe(0);
    expect(r.out).toContain("workspace_requires");
    // State untouched: the stage is NOT marked completed.
    expect(field(proj, "Current Stage")).toBe("code-generation");
  });

  // (b) Declared docs-only -> the SAME conditions PASS, and a GUARD_EXEMPTED row
  // is written to the audit trail. (This also proves (d): the guard is ENABLED
  // for this spawn - only the declaration lets it through, and the env-bypass
  // path would NOT emit GUARD_EXEMPTED.)
  test("PASSES + emits GUARD_EXEMPTED once declared docs-only (guard enabled)", () => {
    seedApprovalEvent(proj, "DECISION_RECORDED", "requirements-analysis");
    const decl = state(proj, [
      "declare-docs-only",
      "--evidence",
      "DECISION_RECORDED requirements-analysis 2026-07-11T10:00:00Z",
    ]);
    expect(decl.rc).toBe(0);
    expect(decl.out).toContain('"declared":true');

    stageCodeGenDocsOnly(proj);
    const r = approveCodeGen(proj);
    expect(r.rc).toBe(0);
    // Auto-advanced off code-generation.
    expect(field(proj, "Current Stage")).not.toBe("code-generation");

    const shard = readFileSync(seededAuditShard(proj), "utf-8");
    expect(shard).toContain("**Event**: GUARD_EXEMPTED");
    expect(shard).toMatch(/\*\*Event\*\*: GUARD_EXEMPTED[\s\S]*?\*\*Stage\*\*: code-generation/);
  });

  // (c) Invalid declarations are refused BEFORE any registry write.
  test("REFUSES declare-docs-only with malformed evidence (not an approval event)", () => {
    const r = state(proj, ["declare-docs-only", "--evidence", "garbage text here"]);
    expect(r.rc).not.toBe(0);
    expect(r.out).toContain("human-approval audit event");
  });

  test("REFUSES declare-docs-only when the referenced approval event is absent", () => {
    // No audit event seeded -> the reference resolves to nothing.
    const r = state(proj, [
      "declare-docs-only",
      "--evidence",
      "DECISION_RECORDED requirements-analysis",
    ]);
    expect(r.rc).not.toBe(0);
    expect(r.out).toContain("no DECISION_RECORDED event for stage");
  });

  test("REFUSES declare-docs-only with empty evidence", () => {
    const r = state(proj, ["declare-docs-only", "--evidence", ""]);
    expect(r.rc).not.toBe(0);
    expect(r.out).toContain("must be non-empty");
  });

  // A malformed declaration must NOT exempt the guard: an absent-event evidence
  // is rejected at declare time, so the registry stays undeclared and the guard
  // still refuses (FR-2.3/2.5 - #366's gap detection intact).
  test("a rejected declaration leaves the guard refusing", () => {
    state(proj, ["declare-docs-only", "--evidence", "DECISION_RECORDED nope"]);
    stageCodeGenDocsOnly(proj);
    const r = approveCodeGen(proj);
    expect(r.rc).not.toBe(0);
    expect(r.out).toContain("workspace_requires");
  });
});
