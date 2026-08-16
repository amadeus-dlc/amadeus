// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts(applyProductionAutonomyMode), file:packages/framework/core/tools/amadeus-bolt.ts(handleSetAutonomy), subcommand:amadeus-bolt:set-autonomy
// size: medium
//
// FR-2c / FR-2d (u1-autonomy-core). Before this unit, the audit transaction and
// the three state fields were written by DIFFERENT code: the transaction by
// applyProductionAutonomyMode, the fields by the set-autonomy verb around it.
// Any other entrance to the same transaction — the `--autonomy` launch flag —
// therefore committed a mode that the state file never showed, and the six
// readers below all read the state file. These tests pin the write to one place
// and then read it back through every one of those readers.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, chmodSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { resetFatalLatchForTests } from "../../packages/framework/core/otel/fatal-latch.ts";
import {
  applyProductionAutonomyMode,
  previewProductionAutonomyGrant,
  readProductionAutonomyProjection,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import {
  autonomySegment,
  getField,
  isAutonomousMode,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { readAutonomyMode } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  stopBudgetMode,
  stopContinuationDefaultCap,
} from "../../packages/framework/core/hooks/amadeus-stop.ts";

const BUN = process.execPath;

function recordDir(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  const active = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return join(intents, active);
}

function statePath(projectDir: string): string {
  return join(recordDir(projectDir), "amadeus-state.md");
}

function state(projectDir: string): string {
  return readFileSync(statePath(projectDir), "utf8");
}

function appendHumanTurn(projectDir: string): void {
  const auditDir = join(recordDir(projectDir), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "canonical-state-write-test.jsonl");
  const seq = existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1 : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "canonical-state-write-test",
    intentId: "canonical-state-write-test",
    timestamp: new Date().toISOString(),
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  })}\n`);
}

function bornProject(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const result = spawnSync(
    BUN,
    [
      join(projectDir, ".claude", "tools", "amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "feature",
      "--project-dir",
      projectDir,
    ],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  expect(result.status ?? -1).toBe(0);
  return projectDir;
}

function autonomyFields(projectDir: string): Record<string, string | null> {
  const content = state(projectDir);
  return {
    mode: getField(content, "Intent Autonomy Mode")?.trim() ?? null,
    grant: getField(content, "Intent Grant")?.trim() ?? null,
    scheduling: getField(content, "Construction Autonomy Mode")?.trim() ?? null,
  };
}

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

describe("the mode transaction owns the state projection (FR-2c)", () => {
  test("applying semi writes all three fields without the set-autonomy verb", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);

    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "semi",
    })).toMatchObject({ ok: true, projection: { mode: "semi" } });

    expect(autonomyFields(projectDir)).toEqual({
      mode: "semi",
      grant: "none",
      // RFC-0001 FR-6: semi projects to autonomous.
      scheduling: "autonomous",
    });
  });

  test("applying full records the issued grant and the autonomous scheduling projection", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    const preview = previewProductionAutonomyGrant({ projectDir, stateContent: state(projectDir) });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    const applied = applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "full",
      confirmedDisplayDigest: preview.preview.displayDigest,
    });
    expect(applied).toMatchObject({ ok: true, projection: { mode: "full" } });
    if (!applied.ok) return;

    const fields = autonomyFields(projectDir);
    expect(fields.mode).toBe("full");
    expect(fields.scheduling).toBe("autonomous");
    expect(fields.grant).toBe(applied.projection.currentGrant?.grantId ?? "none");
    expect(fields.grant).not.toBe("none");
  });

  test("the set-autonomy verb keeps its stdout contract while owning no write", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);

    const result = spawnSync(
      BUN,
      [
        join(projectDir, ".claude", "tools", "amadeus-bolt.ts"),
        "set-autonomy",
        "--mode",
        "semi",
        "--project-dir",
        projectDir,
      ],
      { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
    );
    expect(result.status ?? -1).toBe(0);
    const lines = (result.stdout ?? "").split("\n").filter(Boolean);
    expect(lines.length).toBe(1);
    expect(JSON.parse(lines[0] as string)).toEqual({
      emitted: "INTENT_AUTONOMY_TRANSACTION_COMMITTED",
      mode: "semi",
      grant_id: null,
      state_updated: true,
    });
    expect(autonomyFields(projectDir)).toEqual({ mode: "semi", grant: "none", scheduling: "autonomous" });
  });
});

describe("failure modes around the audit-first ordering (FR-2c)", () => {
  test("a validation failure before the transaction leaves the state bytes untouched", () => {
    projectDir = bornProject();
    // No HUMAN_TURN: provenance fails closed before anything commits.
    const before = state(projectDir);

    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: before,
      mode: "semi",
    })).toEqual({ ok: false, error: "PROVENANCE_REQUIRED" });

    expect(state(projectDir)).toBe(before);
    expect(readProductionAutonomyProjection(projectDir)?.mode).toBe("none");
  });

  test("a state write failure is loud, and re-running converges without a second transaction", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    const stateContent = state(projectDir);

    // A read-only state file is the write barrier writeStateFile already
    // honours (the t47/t77/t137 precedent). The file stays PRESENT, so intent
    // resolution still succeeds and the failure lands where this test aims it:
    // after the transaction commits, on the state write.
    chmodSync(statePath(projectDir), 0o444);

    const failed = applyProductionAutonomyMode({ projectDir, stateContent, mode: "semi" });
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.error).toContain("state projection write failed");

    // The audit half DID commit: the projection already reads semi.
    const projection = readProductionAutonomyProjection(projectDir);
    expect(projection?.mode).toBe("semi");
    const revisionAfterFailure = projection?.projectionRevision;

    // Lift the barrier and re-run the same declaration.
    chmodSync(statePath(projectDir), 0o644);

    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent,
      mode: "semi",
    })).toMatchObject({ ok: true, projection: { mode: "semi" } });

    // Converged, and the revision did not move — no duplicate transaction.
    expect(autonomyFields(projectDir)).toEqual({ mode: "semi", grant: "none", scheduling: "autonomous" });
    expect(readProductionAutonomyProjection(projectDir)?.projectionRevision).toBe(revisionAfterFailure);
  });

  test("an audit commit failure is fail-closed: no state write, and a re-run issues a fresh commit", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    const stateContent = state(projectDir);
    const before = state(projectDir);
    const auditDir = join(recordDir(projectDir), "audit");
    const shardFiles = readdirSync(auditDir).filter((name) => name.endsWith(".jsonl"));
    expect(shardFiles.length).toBeGreaterThan(0);

    // Block the commit itself: every existing shard goes read-only and the
    // directory refuses new files, so applyHumanCommand cannot land its rows.
    // The commit failure surfaces as a thrown EACCES — loud, fail-closed.
    for (const name of shardFiles) chmodSync(join(auditDir, name), 0o444);
    chmodSync(auditDir, 0o555);
    try {
      expect(() => applyProductionAutonomyMode({ projectDir, stateContent, mode: "semi" })).toThrow();
    } finally {
      chmodSync(auditDir, 0o755);
      for (const name of shardFiles) chmodSync(join(auditDir, name), 0o644);
    }

    // Fail-closed: neither half moved — the state bytes and the projection.
    // The failed write also latched this process (FR-EVT-4), which a real run
    // clears by exiting; the test stands in for that fresh process explicitly.
    expect(state(projectDir)).toBe(before);
    expect(readProductionAutonomyProjection(projectDir)?.mode).toBe("none");
    resetFatalLatchForTests();

    // With the barrier lifted the same declaration lands as a fresh commit.
    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent,
      mode: "semi",
    })).toMatchObject({ ok: true, projection: { mode: "semi" } });
    expect(autonomyFields(projectDir)).toEqual({ mode: "semi", grant: "none", scheduling: "autonomous" });
  });
});

describe("the canonical write point is unique (BR-U1-1)", () => {
  test("only applyProductionAutonomyMode's projection writer touches the three autonomy fields", () => {
    // BR-U1-1: grep-pin the writer. A dedicated write is a field-setter call
    // naming one of the three fields on the same line; the birth template's
    // literal and generic CLI field verbs are not dedicated writers.
    const coreRoot = join(import.meta.dir, "..", "..", "packages", "framework", "core");
    const offenders: string[] = [];
    for (const entry of readdirSync(coreRoot, { recursive: true }) as string[]) {
      if (!entry.endsWith(".ts")) continue;
      const source = readFileSync(join(coreRoot, entry), "utf8");
      // A field is "named" by its literal or by the exported constant that holds
      // it — the projection writer uses the constant for the derived field.
      const tokensFor: Readonly<Record<string, readonly string[]>> = {
        "Intent Autonomy Mode": ['"Intent Autonomy Mode"'],
        "Intent Grant": ['"Intent Grant"'],
        "Construction Autonomy Mode": ['"Construction Autonomy Mode"', "CONSTRUCTION_AUTONOMY_MODE_FIELD"],
      };
      for (const field of ["Intent Autonomy Mode", "Intent Grant", "Construction Autonomy Mode"]) {
        for (const line of source.split("\n")) {
          if (!tokensFor[field].some((token) => line.includes(token))) continue;
          if (!/setOrInsertField|setFieldStrict/.test(line)) continue;
          if (/^\s*(\/\/|\*)/.test(line)) continue;
          offenders.push(`${entry} :: ${field}`);
        }
      }
    }
    expect(offenders).toEqual([
      "tools/amadeus-intent-autonomy-production.ts :: Intent Autonomy Mode",
      "tools/amadeus-intent-autonomy-production.ts :: Intent Grant",
      "tools/amadeus-intent-autonomy-production.ts :: Construction Autonomy Mode",
    ]);
  });
});

describe("every reader of the mode sees the same declaration (FR-2d)", () => {
  // The Stop hook's question carve-out is deliberately absent from this list:
  // ADR-5 took the mode out of that decision entirely (it now reads session
  // interactivity and the ruling terminal), so it is no longer a reader of the
  // declaration. t561 pins its inputs.
  test("the six state-file readers agree after one canonical write", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "semi",
    })).toMatchObject({ ok: true, projection: { mode: "semi" } });

    const content = state(projectDir);

    // 1. the state file itself
    expect(getField(content, "Intent Autonomy Mode")?.trim()).toBe("semi");
    // 2. the statusline segment (amadeus-lib.ts)
    expect(autonomySegment(content)).toBe("semi");
    // 3. the swarm scheduling reader (amadeus-orchestrate.ts)
    expect(readAutonomyMode(content)).toBe("autonomous");
    // 4. the Stop hook's continuation budget (amadeus-stop.ts)
    expect(stopContinuationDefaultCap(content)).toBe(8);
    // 5. the Stop hook's budget mode (amadeus-stop.ts)
    expect(stopBudgetMode(content)).not.toBe("interactive");
    // 6. the Construction-projection predicate (amadeus-lib.ts). It follows the
    // projection, so semi now reads autonomous. The answer path no longer keys
    // its human-presence carve-out off it — amadeus-log.ts reads the DECLARED
    // Intent mode, so semi's answers stay under the presence guard (FR-12).
    expect(isAutonomousMode(content)).toBe(true);
  });

  test("a full declaration moves the scheduling readers too", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    const preview = previewProductionAutonomyGrant({ projectDir, stateContent: state(projectDir) });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "full",
      confirmedDisplayDigest: preview.preview.displayDigest,
    })).toMatchObject({ ok: true, projection: { mode: "full" } });

    const content = state(projectDir);
    expect(autonomySegment(content)).toBe("full");
    expect(readAutonomyMode(content)).toBe("autonomous");
    expect(stopContinuationDefaultCap(content)).toBe(8);
    expect(stopBudgetMode(content)).toBe("autonomous");
    expect(isAutonomousMode(content)).toBe(true);
  });
});
