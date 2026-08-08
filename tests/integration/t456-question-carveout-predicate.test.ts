// covers: file:packages/framework/core/hooks/amadeus-stop.ts
// size: medium
//
// t456 — the question carve-out predicate `isQuestionCarveoutIntent` (#2253,
// Unit stop-question-carveout, C11 / ADR-7).
//
// The stop hook used to answer ONE question — "is this Intent fully autonomous?"
// — and reused that single answer at all three carve-out call sites. Redefining
// `semi` splits that answer in two, because `semi` must open exactly one of the
// three: the tier-2 PENDING-QUESTION carve-out (amadeus-stop.ts:422). The
// compose carve-out (:457) and the tier-3 conversational carve-out (:716) stay
// `full`-only.
//
// This file pins the NEW predicate's decision table. The predicate is a
// TWO-STAGE judgment and the stages are ordered on purpose:
//
//   stage 1 — the Intent Autonomy Mode written in state. A mode outside
//             {semi, full} is answered WITHOUT reading the projection, so an
//             ordinary interactive Intent never pays for the read.
//   stage 2 — the production autonomy projection on disk:
//               semi → mode "semi" AND modeProvenance.kind === "human-command"
//               full → mode "full" AND currentGrant.state === "active"
//                      (the SAME judgment the existing full-only predicate
//                      makes — the carve-out never weakens `full`)
//
// `semi` deliberately requires the projection's provenance, not just the state
// string: a mode that arrived as a system default has no human behind it, and a
// carve-out is an authorization to keep running without asking. Anything
// unreadable or unparseable answers FALSE — refusing the carve-out is the
// conservative side of this boundary (the hook merely stops instead).
//
// PLACEMENT: the predicate's second stage reads the real projection off disk, so
// the decision table cannot be exercised without a filesystem. Under the size
// classifier that makes this file `medium`, and medium tests live in the
// integration tier even when they are driven IN-PROCESS (the in-process and
// tier axes are independent — cid:code-generation:fs-tests-integration-first
// and its E-SMF-ND addendum). Every case below calls the predicate directly:
// there is no spawn, so the lines stay measurable for coverage.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  intentsDirOf,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { isQuestionCarveoutIntent } from "../../packages/framework/core/hooks/amadeus-stop.ts";
import {
  applyProductionAutonomyMode,
  previewProductionAutonomyGrant,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";

// The clone id is pinned so the projection writer and this test agree on which
// per-clone audit shard carries the HUMAN_TURN the write path demands.
const PINNED_CLONE_ID = "testcloneid456";

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

function pinnedShardPath(proj: string): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return join(seededAuditDir(proj), `${host}-${PINNED_CLONE_ID}.jsonl`);
}

function humanTurnRow(seq: number): string {
  return JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: PINNED_CLONE_ID,
    intentId: DEFAULT_RECORD_DIR,
    timestamp: `2026-01-01T00:00:0${seq}.000Z`,
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  });
}

/** State content carrying (or omitting) the Intent Autonomy Mode field. */
function stateFor(mode: string | null): string {
  const modeLine = mode === null ? "" : `- **Intent Autonomy Mode**: ${mode}\n`;
  return (
    "## Current Status\n- **Workflow**: feature\n- **Scope**: feature\n- **Lifecycle Phase**: CONSTRUCTION\n" +
    `- **Current Stage**: code-generation\n- **Construction Autonomy Mode**: unset\n${modeLine}` +
    "\n## Stage Progress\n- [-] code-generation — EXECUTE\n"
  );
}

/** A per-intent workspace shell with the clone id pinned (mirrors t121's seedShell). */
function makeProject(mode: string | null): string {
  const proj = mkdtempSync(join(tmpdir(), "amadeus-t456-"));
  tempDirs.push(proj);
  const intentsDir = intentsDirOf(proj, DEFAULT_SPACE);
  mkdirSync(join(proj, "amadeus", "spaces", DEFAULT_SPACE, "memory"), { recursive: true });
  mkdirSync(seededRecordDir(proj), { recursive: true });
  mkdirSync(seededAuditDir(proj), { recursive: true });
  writeFileSync(join(proj, "amadeus", "active-space"), `${DEFAULT_SPACE}\n`, "utf-8");
  writeFileSync(join(intentsDir, "active-intent"), `${DEFAULT_RECORD_DIR}\n`, "utf-8");
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(
      [
        {
          uuid: "00000000-0000-7000-8000-000000000001",
          slug: DEFAULT_RECORD_DIR.replace(/-[0-9a-f]+$/, ""),
          status: "in-flight",
        },
      ],
      null,
      2,
    )}\n`,
    "utf-8",
  );
  writeFileSync(join(proj, "amadeus", ".amadeus-clone-id"), `${PINNED_CLONE_ID}\n`, "utf-8");
  writeFileSync(pinnedShardPath(proj), `${humanTurnRow(1)}\n`, "utf-8");
  writeFileSync(seededStateFile(proj), stateFor(mode), "utf-8");
  return proj;
}

/** Drive the ONE human-command write path so the projection carries real provenance. */
function declareMode(proj: string, mode: "semi" | "full"): void {
  resetOtelPerProject();
  writeFileSync(
    pinnedShardPath(proj),
    `${readFileSync(pinnedShardPath(proj), "utf-8")}${humanTurnRow(2)}\n`,
    "utf-8",
  );
  const stateContent = readFileSync(seededStateFile(proj), "utf-8");
  let confirmedDisplayDigest: string | undefined;
  if (mode === "full") {
    const preview = previewProductionAutonomyGrant({ projectDir: proj, stateContent });
    if (!preview.ok) throw new Error(preview.error);
    confirmedDisplayDigest = preview.preview.displayDigest;
  }
  const applied = applyProductionAutonomyMode({
    projectDir: proj,
    stateContent,
    mode,
    ...(confirmedDisplayDigest === undefined ? {} : { confirmedDisplayDigest }),
  });
  if (!applied.ok) throw new Error(applied.error);
}

/** Read back the state the project was seeded with. */
function stateOf(proj: string): string {
  return readFileSync(seededStateFile(proj), "utf-8");
}

describe("isQuestionCarveoutIntent — the semi + full decision table (C11)", () => {
  test("1. semi declared by a human command CARVES OUT (the one thing #2253 opens)", () => {
    const proj = makeProject("semi");
    declareMode(proj, "semi");
    expect(isQuestionCarveoutIntent(stateOf(proj), proj)).toBe(true);
  });

  test("2. semi in state with NO human-command projection does NOT carve out", () => {
    // The state string alone is not authorization: without the projection the
    // provenance is a system default, and stage 2 refuses.
    const proj = makeProject("semi");
    expect(isQuestionCarveoutIntent(stateOf(proj), proj)).toBe(false);
  });

  test("3. full with an ACTIVE grant carves out (unchanged full behaviour)", () => {
    const proj = makeProject("full");
    declareMode(proj, "full");
    expect(isQuestionCarveoutIntent(stateOf(proj), proj)).toBe(true);
  });

  test("4. full with NO grant does NOT carve out (the grant is the authorization)", () => {
    const proj = makeProject("full");
    expect(isQuestionCarveoutIntent(stateOf(proj), proj)).toBe(false);
  });

  test("5. none does NOT carve out", () => {
    const proj = makeProject("none");
    expect(isQuestionCarveoutIntent(stateOf(proj), proj)).toBe(false);
  });

  test("6. an unrecognised mode / unreadable project answers FALSE (conservative side)", () => {
    // Two ways to reach the same conservative answer: a mode value outside the
    // three, and a project directory that does not exist at all (the projection
    // read throws or yields nothing and the predicate refuses the carve-out).
    const proj = makeProject("SEMI-ish");
    expect(isQuestionCarveoutIntent(stateOf(proj), proj)).toBe(false);
    expect(isQuestionCarveoutIntent(stateFor("semi"), join(proj, "no-such-dir"))).toBe(false);
  });
});
