// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts, file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: medium

// RFC-0001 FR-10 / ADR-10 (#3116). A `walking-skeleton` occurrence is what makes
// the first Construction stage a human milestone under semi. The ceremony itself
// only applies where the Skeleton Stance says so, so on a degrade scope
// (self-fix — not in SKELETON_ON_SCOPES) the first Construction stage must NOT
// become a walking-skeleton occurrence.
//
// MECHANISM. Two independent call sites assemble the `walkingSkeleton` flag —
// amadeus-state.ts's gate approval and amadeus-orchestrate.ts's directive
// decoration — and both funnel through interactionKind(). The stance gate lives
// there, which is why both paths are driven here: an implementation that gates
// only one supply point passes one of these two describes and fails the other.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  applyProductionAutonomyMode,
  commitProductionStageGateDecision,
  productionStageAutonomy,
  skeletonGateFiresFor,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { firesWalkingSkeletonGate } from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const BUN = process.execPath;
const GRAPH_REVISION = `sha256:${"b".repeat(64)}`;

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

function intentsDir(proj: string): string {
  return join(proj, "amadeus", "spaces", "default", "intents");
}

function recordDir(proj: string): string {
  return join(intentsDir(proj), readFileSync(join(intentsDir(proj), "active-intent"), "utf8").trim());
}

function statePath(proj: string): string {
  return join(recordDir(proj), "amadeus-state.md");
}

function state(proj: string): string {
  return readFileSync(statePath(proj), "utf8");
}

function appendHumanTurn(proj: string): void {
  const auditDir = join(recordDir(proj), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "walking-skeleton-stance-test.jsonl");
  const seq = existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1 : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "walking-skeleton-stance-test",
    intentId: "walking-skeleton-stance-test",
    timestamp: new Date().toISOString(),
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  })}\n`);
}

/** A born project under `scope`, declared semi, ready to reach a gate. */
function semiProject(scope: string): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const birth = spawnSync(
    BUN,
    [join(proj, ".claude", "tools", "amadeus-utility.ts"), "intent-birth", "--scope", scope, "--project-dir", proj],
    { cwd: proj, encoding: "utf8", env: { ...process.env } },
  );
  expect(birth.status ?? -1).toBe(0);
  appendHumanTurn(proj);
  expect(applyProductionAutonomyMode({ projectDir: proj, stateContent: state(proj), mode: "semi" }))
    .toMatchObject({ ok: true, projection: { mode: "semi" } });
  return proj;
}

function setStance(proj: string, stance: string): void {
  writeFileSync(
    statePath(proj),
    state(proj).replace("- **Status**: Running", `- **Status**: Running\n- **Skeleton Stance**: ${stance}`),
  );
}

/** The engine path: amadeus-orchestrate.ts decorates a directive through this. */
function enginePath(proj: string, stage: string): ReturnType<typeof productionStageAutonomy> {
  return productionStageAutonomy({
    projectDir: proj,
    stage,
    phase: "construction",
    graphRevision: GRAPH_REVISION,
    walkingSkeleton: true,
  });
}

/** The state path: amadeus-state.ts commits a gate approval through this. */
function statePathDecision(proj: string, stage: string): ReturnType<typeof commitProductionStageGateDecision> {
  return commitProductionStageGateDecision({
    projectDir: proj,
    stateContent: state(proj),
    stage,
    phase: "construction",
    graphRevision: GRAPH_REVISION,
    walkingSkeleton: true,
  });
}

describe("R-17: the WS ceremony is subordinate to the Skeleton Stance", () => {
  test("engine path: a degrade scope's first Construction stage is decidable by semi", () => {
    projectDir = semiProject("self-fix");
    const autonomy = enginePath(projectDir, "code-generation");
    expect(autonomy.mode).toBe("semi");
    expect(autonomy.authorizationReason).toBe("semi-authority");
    expect(autonomy.autoApprove).toBe(true);
  });

  test("state path: the same stage commits a gate decision instead of refusing", () => {
    projectDir = semiProject("self-fix");
    expect(statePathDecision(projectDir, "code-generation").kind).toBe("decided");
  });
});

describe("R-19: greenfield keeps its walking-skeleton gate on both paths", () => {
  test("engine path: semi still stops at the skeleton milestone", () => {
    projectDir = semiProject("self-feature");
    const autonomy = enginePath(projectDir, "code-generation");
    expect(autonomy.autoApprove).toBe(false);
    expect(autonomy.authorizationReason).toBe("SCOPE_OUT");
  });

  test("state path: semi refuses the gate decision", () => {
    projectDir = semiProject("self-feature");
    expect(statePathDecision(projectDir, "code-generation")).toEqual({
      kind: "not-authorized",
      reason: "SCOPE_OUT",
    });
  });
});

describe("R-18 / R-20: how the stance resolves", () => {
  // One project per test: the OTel bootstrap is one-workspace-per-process.
  test("an explicit on overrides a degrade scope's mapping", () => {
    projectDir = semiProject("self-fix");
    setStance(projectDir, "on");
    expect(skeletonGateFiresFor(state(projectDir))).toBe(true);
    expect(enginePath(projectDir, "code-generation").autoApprove).toBe(false);
  });

  test("an explicit off overrides a greenfield scope's mapping", () => {
    projectDir = semiProject("self-feature");
    setStance(projectDir, "off");
    expect(skeletonGateFiresFor(state(projectDir))).toBe(false);
    expect(enginePath(projectDir, "code-generation").autoApprove).toBe(true);
  });

  test("scope-dependent fires on a greenfield scope", () => {
    projectDir = semiProject("self-feature");
    setStance(projectDir, "scope-dependent");
    expect(skeletonGateFiresFor(state(projectDir))).toBe(true);
  });

  test("scope-dependent does not fire on a degrade scope", () => {
    projectDir = semiProject("self-fix");
    setStance(projectDir, "scope-dependent");
    expect(skeletonGateFiresFor(state(projectDir))).toBe(false);
  });

  test("an unreadable stance falls to the side that keeps the human", () => {
    // No state to resolve from, and a record with no Scope row: both leave the
    // ceremony to the human rather than silently unattending an acceptance point.
    expect(skeletonGateFiresFor(null)).toBe(true);
    expect(skeletonGateFiresFor("## Current Status\n\n- **Status**: Running\n")).toBe(true);
  });

  test("the pure predicate keeps the gate for anything that is not an explicit off", () => {
    expect(firesWalkingSkeletonGate("on")).toBe(true);
    expect(firesWalkingSkeletonGate("off")).toBe(false);
    expect(firesWalkingSkeletonGate("scope-dependent")).toBe(true);
  });
});
