// In-process coverage seam for unit s13-zero (intent 260815-rfc-autonomy-modes,
// ADR-6): confirmZeroCandidates mints a digest-bound ZeroReceipt so a §13
// zero-candidate confirmation has a machine-checkable basis instead of the
// conductor's self-report, and addConductorCandidate is the additive-only,
// disk-evidence-gated way the conductor grows the candidate set BEFORE the
// zero check runs. Both are exercised in-process (handleSurface/handlePersist
// precedent — CLI integration tests spawn the shipped dist and cannot
// register bun coverage).
//
// covers: business-rules.md R-1..R-6, domain-entities.md types, FD Iteration 1
// FOLLOW-UP (explicit audit payload type).

import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { normalizeAuditRecord } from "../harness/audit-records.ts";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { _resetCloneIdForTests } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  addConductorCandidate,
  confirmZeroCandidates,
  handleAddCandidate,
  handleConfirmZero,
  handleSurface,
} from "../../dist/claude/.claude/tools/amadeus-learnings.ts";
import { createTestProject, seededAuditShard, seededRecordDir, seededStateFile } from "../harness/fixtures.ts";

// A real stage slug (t212-learnings-surface-selfheal-seam precedent) — the
// runtime-graph self-heal cross-references the compiled stage graph, so a
// made-up slug fails even with a matching audit trail.
const SLUG = "user-stories";

const projects: string[] = [];
afterAll(() => {
  for (const p of projects) rmSync(p, { recursive: true, force: true });
});

beforeEach(() => {
  _resetCloneIdForTests();
  resetOtelPerProject();
});

// Minimal audit shard giving compile()'s self-heal a real header + one
// STAGE_STARTED/COMPLETED row for SLUG (t212-learnings-surface-selfheal-seam
// precedent) — handleSurface resolves memory_path off runtime-graph.json,
// which self-heals from this audit trail when absent.
function auditFor(slug: string): string {
  const rec = (seq: number, timestamp: string, heading: string, event: string, fields: Record<string, string>) =>
    `${JSON.stringify({
      schemaVersion: 1,
      seq,
      cloneId: "fixturecloneid01",
      intentId: "t-s13-zero-fixture",
      timestamp,
      heading,
      event,
      fields,
    })}\n`;
  return (
    rec(1, "2026-08-16T08:00:00Z", "Workflow Started", "WORKFLOW_STARTED", {
      "Workflow ID": "t-s13-zero-fixture",
      Scope: "feature",
    }) +
    rec(2, "2026-08-16T08:01:00Z", "Stage Started", "STAGE_STARTED", { Stage: slug, Agent: "amadeus-architect-agent" }) +
    rec(3, "2026-08-16T08:02:00Z", "Stage Completed", "STAGE_COMPLETED", { Stage: slug })
  );
}

// Build a fixture project with Current Stage = SLUG, an audit trail that lets
// compile() self-heal runtime-graph.json, and memory.md seeded with the given
// body (empty string -> zero candidates surfaced).
function mkproj(memoryBody: string): string {
  const pd = createTestProject();
  projects.push(pd);
  resetOtelPerProject();
  writeFileSync(seededStateFile(pd), `# AI-DLC State Tracking\n- **Current Stage**: ${SLUG}\n- **Scope**: feature\n`);
  const shard = seededAuditShard(pd);
  mkdirSync(dirname(shard), { recursive: true });
  writeFileSync(shard, auditFor(SLUG), "utf-8");
  const mem = join(seededRecordDir(pd), "inception", SLUG, "memory.md");
  mkdirSync(dirname(mem), { recursive: true });
  writeFileSync(mem, memoryBody, "utf-8");
  return pd;
}

const ZERO_CANDIDATE_MEMORY = "## Interpretations\n\n## Deviations\n\n## Tradeoffs\n\n## Open questions\n";
const ONE_CANDIDATE_MEMORY =
  "## Interpretations\n\n- 2026-08-16T08:01:30Z — a surfaced interpretation\n\n## Deviations\n\n## Tradeoffs\n\n## Open questions\n";

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

// fail() ends the CLI via process.exit; convert to a throwable so the test can
// assert the exit code and stderr (handleSurface/handlePersist precedent).
function captureExit<T>(run: () => T): { status: number; stderr: string; stdout: string; result?: T } {
  let stderr = "";
  let stdout = "";
  const origErrWrite = process.stderr.write.bind(process.stderr);
  const origLog = console.log;
  const origExit = process.exit.bind(process);
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
    return true;
  }) as typeof process.stderr.write;
  console.log = ((...args: unknown[]) => {
    stdout += args.map(String).join(" ") + "\n";
  }) as typeof console.log;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  let status = 0;
  let result: T | undefined;
  try {
    result = run();
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.stderr.write = origErrWrite;
    console.log = origLog;
    process.exit = origExit;
  }
  return { status, stderr, stdout, result };
}

function surfaceOutputFor(pd: string): Record<string, unknown> {
  const { stdout } = captureExit(() => handleSurface(["--slug", SLUG], pd));
  return JSON.parse(stdout) as Record<string, unknown>;
}

const readIf = (p: string): string | null => (existsSync(p) ? readFileSync(p, "utf-8") : null);

function auditRows(pd: string, eventType: string): number {
  return (readIf(seededAuditShard(pd)) ?? "")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => normalizeAuditRecord(JSON.parse(l)) as { event: string | null })
    .filter((r) => r.event === eventType).length;
}

describe("s13-zero: surfaceDigest on SurfaceOutput", () => {
  test("surface attaches a non-empty, content-deterministic surfaceDigest", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const out1 = surfaceOutputFor(pd);
    const out2 = surfaceOutputFor(pd);
    expect(typeof out1.surfaceDigest).toBe("string");
    expect((out1.surfaceDigest as string).length).toBeGreaterThan(0);
    // Same memory.md snapshot, re-run surface -> identical digest (R-2's
    // "同一 memory.md 断面からの再実行は同一 digest を返す" invariant).
    expect(out2.surfaceDigest).toBe(out1.surfaceDigest);
  });

  test("digest changes when the underlying memory.md content changes", () => {
    // Interleave create+surface per project — ensureOtelBootstrap enforces
    // ONE workspace per process, so a stale bootstrap from a previously
    // created (but not yet surfaced) fixture project breaks the second call.
    const pdZero = mkproj(ZERO_CANDIDATE_MEMORY);
    const zeroOut = surfaceOutputFor(pdZero);
    const pdOne = mkproj(ONE_CANDIDATE_MEMORY);
    const oneOut = surfaceOutputFor(pdOne);
    expect(zeroOut.surfaceDigest).not.toBe(oneOut.surfaceDigest);
  });
});

describe("s13-zero: confirmZeroCandidates (R-1/R-2/R-6)", () => {
  test("zero candidates + matching digest -> ZeroReceipt", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const surface = surfaceOutputFor(pd);
    expect((surface.candidates as unknown[]).length).toBe(0);
    const receipt = confirmZeroCandidates(surface as never);
    expect(receipt.kind).toBe("zero");
    if (receipt.kind === "zero") {
      expect(receipt.surfaceDigest).toBe(surface.surfaceDigest as string);
      expect(typeof receipt.confirmedAt).toBe("string");
    }
  });

  test("zero candidates + tampered digest -> refused (not a ZeroReceipt)", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const surface = surfaceOutputFor(pd);
    const tampered = { ...surface, surfaceDigest: `${surface.surfaceDigest}-tampered` };
    const result = confirmZeroCandidates(tampered as never);
    // A tampered/stale digest must never mint a ZeroReceipt — self-report
    // without a valid digest basis is exactly what ADR-6 forbids (R-1).
    expect(result.kind).not.toBe("zero");
  });

  test("non-zero candidates -> NotZero(candidateCount)", () => {
    const pd = mkproj(ONE_CANDIDATE_MEMORY);
    const surface = surfaceOutputFor(pd);
    expect((surface.candidates as unknown[]).length).toBe(1);
    const result = confirmZeroCandidates(surface as never);
    expect(result.kind).toBe("not-zero");
    if (result.kind === "not-zero") {
      expect(result.candidateCount).toBe(1);
    }
  });
});

describe("s13-zero: addConductorCandidate (R-3/R-4)", () => {
  const candidate = {
    id: "conductor-1",
    source_heading: "Interpretations" as const,
    ts: "2026-08-16T00:00:00Z",
    summary: "conductor-observed interpretation",
    context: "seen during the §13 conversation",
    default_scope: "project" as const,
  };

  test("missing disk evidence path is refused (fail-closed)", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const missingPath = join(pd, "does-not-exist.md");
    const result = addConductorCandidate(candidate, missingPath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("evidence-path-missing");
      expect(result.error.path).toBe(missingPath);
    }
  });

  test("disk evidence that does not correspond to the candidate is refused", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const evidencePath = join(pd, "unrelated-evidence.md");
    writeFileSync(evidencePath, "this file talks about something else entirely");
    const result = addConductorCandidate(candidate, evidencePath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("evidence-mismatch");
    }
  });

  test("corresponding disk evidence is accepted and re-derivable (additive-only)", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const evidencePath = join(pd, "matching-evidence.md");
    writeFileSync(evidencePath, `## Interpretations\n- ${candidate.summary} (ts ${candidate.ts})\n`);
    const result = addConductorCandidate(candidate, evidencePath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.candidates).toEqual([candidate]);
      expect(result.value.addedFrom).toEqual([evidencePath]);
    }
  });
});

describe("s13-zero: CLI handlers record R-5 audit rows", () => {
  test("handleConfirmZero on a zero surface emits LEARNING_ZERO_CONFIRMED and prints the receipt", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const surface = surfaceOutputFor(pd);
    const surfacePath = join(pd, "surface.json");
    writeFileSync(surfacePath, JSON.stringify(surface));

    const r = captureExit(() => handleConfirmZero(["--surface-json", surfacePath], pd));
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.kind).toBe("zero");
    expect(auditRows(pd, "LEARNING_ZERO_CONFIRMED")).toBe(1);
  });

  test("handleConfirmZero on a non-zero surface prints NotZero and emits nothing", () => {
    const pd = mkproj(ONE_CANDIDATE_MEMORY);
    const surface = surfaceOutputFor(pd);
    const surfacePath = join(pd, "surface-nonzero.json");
    writeFileSync(surfacePath, JSON.stringify(surface));

    const r = captureExit(() => handleConfirmZero(["--surface-json", surfacePath], pd));
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.kind).toBe("not-zero");
    expect(auditRows(pd, "LEARNING_ZERO_CONFIRMED")).toBe(0);
  });

  test("handleAddCandidate on success emits LEARNING_CANDIDATE_ADDED with the surface digest", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const surface = surfaceOutputFor(pd);
    const evidencePath = join(pd, "cli-evidence.md");
    const candidatePath = join(pd, "candidate.json");
    const c = {
      id: "conductor-2",
      source_heading: "Deviations",
      ts: "2026-08-16T00:00:00Z",
      summary: "cli-added candidate",
      context: "ctx",
      default_scope: "project",
    };
    writeFileSync(evidencePath, `- ${c.summary}\n`);
    writeFileSync(candidatePath, JSON.stringify(c));

    const r = captureExit(() =>
      handleAddCandidate(
        [
          "--slug",
          SLUG,
          "--candidate-json",
          candidatePath,
          "--evidence-path",
          evidencePath,
          "--surface-digest",
          String(surface.surfaceDigest),
        ],
        pd,
      ),
    );
    expect(r.status).toBe(0);
    expect(auditRows(pd, "LEARNING_CANDIDATE_ADDED")).toBe(1);
  });

  test("handleAddCandidate refuses missing evidence loudly and emits nothing", () => {
    const pd = mkproj(ZERO_CANDIDATE_MEMORY);
    const candidatePath = join(pd, "candidate-refuse.json");
    writeFileSync(
      candidatePath,
      JSON.stringify({
        id: "conductor-3",
        source_heading: "Tradeoffs",
        ts: "2026-08-16T00:00:00Z",
        summary: "refused candidate",
        context: "ctx",
        default_scope: "project",
      }),
    );
    const r = captureExit(() =>
      handleAddCandidate(
        [
          "--slug",
          SLUG,
          "--candidate-json",
          candidatePath,
          "--evidence-path",
          join(pd, "nope.md"),
          "--surface-digest",
          "irrelevant",
        ],
        pd,
      ),
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("evidence-path-missing");
    expect(auditRows(pd, "LEARNING_CANDIDATE_ADDED")).toBe(0);
  });
});
