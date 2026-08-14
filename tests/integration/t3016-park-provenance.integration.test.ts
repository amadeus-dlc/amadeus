// covers: subcommand:amadeus-state:park, subcommand:amadeus-state:unpark, file:packages/framework/core/tools/amadeus-orchestrate.ts
// size: medium
//
// Issue #3016 — `amadeus-state.ts park` refused EVERY park under
// `Construction Autonomy Mode: autonomous`, including the one the Stop hook's
// own continuation reason tells the human to run. The guard's real subject is
// an UNATTENDED run, so the refusal is now fail-closed on human presence: an
// unconsumed `HUMAN_TURN` in the active record's ledger accepts the park and
// the accepted park consumes it (`WORKFLOW_PARKED` is a presence resolution).
//
// t17 pins the state-tool contract at the CLI boundary with a hand-seeded
// ledger. This file pins the two surfaces t17 cannot reach:
//   - the PRODUCTION autonomy path: the mode is declared through
//     `applyProductionAutonomyMode` off a real minted `HUMAN_TURN`, so what the
//     guard reads back is what production writes, and the Intent grant is shown
//     to survive the park/resume round trip (FR-4 — a park is not a revocation);
//   - the ENGINE layer: `amadeus-orchestrate.ts park` had NO test anywhere
//     (`git grep -ln "Cannot park the workflow" -- tests plugins` was empty), so
//     its accept (`kind:"parked"`) and refuse (`kind:"error"`) pass-throughs
//     were unpinned. Both run as real spawns — the engine's park delegates to a
//     spawned `amadeus-state.ts`, so only a process boundary exercises it.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyProductionAutonomyMode,
  previewProductionAutonomyGrant,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { mintHumanPresence } from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedAuditFile,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STATE_TOOL = join(REPO_ROOT, "packages/framework/core/tools/amadeus-state.ts");
const ORCHESTRATE_TOOL = join(REPO_ROOT, "packages/framework/core/tools/amadeus-orchestrate.ts");
// The autonomy declaration projects `Construction Autonomy Mode` back through
// the strict field writer, which refuses to INSERT a field the file does not
// already carry — so the fixture must be one that declares it.
const CONSTRUCTION = join(FIXTURES_DIR, "state-construction.md");
const STOCK_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");

let proj = "";

beforeEach(() => {
  // dist/ is a gitignored build output, so a fresh worktree has no stock graph
  // and the `next --resume` re-entry would die on an ENOENT that names a path
  // rather than the missing build. Fail on the precondition instead.
  if (!existsSync(STOCK_GRAPH)) {
    throw new Error(
      `stock stage graph missing at ${STOCK_GRAPH} — run \`bun run build\` to generate dist/ before this test`,
    );
  }
  resetAidlcEnv();
  proj = "";
});

afterEach(() => {
  cleanupTestProject(proj);
  resetAidlcEnv();
});

// Each spawn names its tool path at the call site (rather than taking it as a
// parameter) so the mechanism classifier can resolve argv[0] statically and
// credit this file as a `cli` driver of both tools.
function runState(args: string[]) {
  return spawnSync(process.execPath, [STATE_TOOL, ...args, "--project-dir", proj], {
    encoding: "utf-8",
    // The park guard deliberately does NOT honour
    // AMADEUS_SKIP_HUMAN_PRESENCE_GUARD (it would hand every scripted run the
    // bypass the guard exists to deny), but the suite runner injects it into
    // every test env — strip it so the spawned tools see a production env.
    env: stripPresenceBypass(process.env),
  });
}

function runEngine(args: string[]) {
  return spawnSync(process.execPath, [ORCHESTRATE_TOOL, ...args, "--project-dir", proj], {
    encoding: "utf-8",
    // The canonical module resolves its stage graph relative to its own
    // directory, which carries no compiled data file; point it at the shipped
    // stock graph (the same seam t528 uses to drive the handlers).
    env: { ...stripPresenceBypass(process.env), AMADEUS_STAGE_GRAPH: STOCK_GRAPH },
  });
}

function stripPresenceBypass(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const copy = { ...env };
  delete copy.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  return copy;
}

/** The last JSON object the engine printed on stdout. */
function directiveOf(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (line?.startsWith("{")) return JSON.parse(line) as Record<string, unknown>;
  }
  throw new Error(`no directive JSON on stdout:\n${stdout}`);
}

function stateText(): string {
  return readFileSync(seededStateFile(proj), "utf-8");
}

function field(name: string): string {
  const match = stateText().match(new RegExp(`^- \\*\\*${name}\\*\\*: (.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

/** Mint one real HUMAN_TURN into the active record's presence ledger. */
function mintTurn(): void {
  // The OTel bootstrap pins one workspace per process; each fixture project is
  // a new workspace, so release the previous pin before minting into this one.
  resetOtelPerProject();
  mintHumanPresence({
    projectDir: proj,
    capability: { kind: "unavailable", reason: "in-process test driver" },
  });
}

/**
 * A project whose Intent runs under `full` autonomy, declared through the
 * production human-command path so `Construction Autonomy Mode: autonomous`,
 * `Intent Autonomy Mode` and `Intent Grant` are whatever production writes.
 * The declaration's own HUMAN_TURN is left unconsumed: no gate resolution and
 * no park follows it, so the caller starts with exactly one turn in hand.
 */
function fullAutonomyProject(): void {
  proj = createTestProject();
  seedStateFile(proj, CONSTRUCTION);
  seedAuditFile(proj);
  mintTurn();
  const stateContent = readFileSync(seededStateFile(proj), "utf-8");
  // A `full` grant is confirmation-bound: the declaration only commits against
  // the digest of the preview the human was shown.
  const preview = previewProductionAutonomyGrant({ projectDir: proj, stateContent });
  if (!preview.ok) throw new Error(`grant preview failed: ${preview.error}`);
  const applied = applyProductionAutonomyMode({
    projectDir: proj,
    stateContent,
    mode: "full",
    confirmedDisplayDigest: preview.preview.displayDigest,
  });
  if (!applied.ok) throw new Error(`full declaration failed: ${applied.error}`);
  expect(field("Construction Autonomy Mode")).toBe("autonomous");
}

/**
 * Drive the engine's `--resume` re-entry (Branch 2.6) over a parked workflow
 * and return the print directive it emitted.
 *
 * Branch 2.6 does NOT mutate: clearing the marker is a mutation, so `next`
 * NAMES the unpark move and the conductor runs it. Driving the real path
 * therefore means asserting the named move, running it, and re-entering — which
 * is what this helper does, so the round trip under test is the engine's, not a
 * bare `amadeus-state unpark` standing in for it.
 */
function resumeThroughEngine(): Record<string, unknown> {
  const parked = runEngine(["next", "--resume"]);
  expect(parked.status).toBe(0);
  const directive = directiveOf(parked.stdout);
  // Branch 2.6's print names the unpark move and leaves the marker in place.
  expect(directive.kind).toBe("print");
  expect(String(directive.message)).toContain("This workflow is parked");
  expect(String(directive.message)).toContain("amadeus-state.ts unpark");
  expect(stateText()).toContain("- **Parked**:");
  // Run the move the engine named, then re-enter as its message instructs.
  expect(runState(["unpark"]).status).toBe(0);
  expect(stateText()).not.toContain("- **Parked**:");
  const reentered = runEngine(["next", "--resume"]);
  expect(reentered.status).toBe(0);
  const after = directiveOf(reentered.stdout);
  // The re-entry is past the park: Branch 2.6 no longer fires.
  expect(after.kind).not.toBe("parked");
  return after;
}

describe("t3016 park under production `full` autonomy", () => {
  test("an unconsumed HUMAN_TURN parks the run and leaves the grant intact", () => {
    fullAutonomyProject();
    const grantBefore = field("Intent Grant");
    const modeBefore = field("Intent Autonomy Mode");
    expect(modeBefore).toBe("full");
    expect(grantBefore.length).toBeGreaterThan(0);
    expect(grantBefore).not.toBe("none");

    const park = runState(["park"]);
    expect(park.stderr).toBe("");
    expect(park.status).toBe(0);
    expect(stateText()).toContain("- **Parked**:");

    // FR-4: a park is a pause, not a revocation. The Intent's autonomy mode and
    // its grant are unchanged across the park and across the resume that
    // clears the marker (`--resume`'s Branch 2.6 names exactly this unpark).
    expect(field("Intent Autonomy Mode")).toBe(modeBefore);
    expect(field("Intent Grant")).toBe(grantBefore);
    const unpark = runState(["unpark"]);
    expect(unpark.status).toBe(0);
    expect(stateText()).not.toContain("- **Parked**:");
    expect(field("Intent Autonomy Mode")).toBe(modeBefore);
    expect(field("Intent Grant")).toBe(grantBefore);
    expect(field("Construction Autonomy Mode")).toBe("autonomous");
  });

  // FR-3's "resume" step runs through the engine's `--resume` ladder, the same
  // route FR-4 names — not a bare unpark that would leave the real re-entry
  // path unexercised.
  test("the park consumes the turn - the same turn cannot park twice", () => {
    fullAutonomyProject();
    expect(runState(["park"]).status).toBe(0);
    resumeThroughEngine();
    const second = runState(["park"]);
    expect(second.status).not.toBe(0);
    expect(second.stderr.toLowerCase()).toContain("human_turn");
    expect(stateText()).not.toContain("- **Parked**:");

    // A NEW human turn re-opens it: the guard tracks presence, not a one-shot
    // permission the record burns for good.
    mintTurn();
    expect(runState(["park"]).status).toBe(0);
    expect(stateText()).toContain("- **Parked**:");
  });
});

describe("t3016 the engine passes the park verdict through", () => {
  test("engine park emits `parked` when a human turn is outstanding", () => {
    fullAutonomyProject();
    const res = runEngine(["park"]);
    expect(res.status).toBe(0);
    const directive = directiveOf(res.stdout);
    expect(directive.kind).toBe("parked");
    expect(String(directive.reason)).toContain("/amadeus --resume");
    expect(stateText()).toContain("- **Parked**:");
  });

  // FR-4 driven end to end on the route the requirement names: the engine's
  // `park` verb in, the engine's `--resume` re-entry (Branch 2.6) out. The
  // Intent's autonomy mode and its grant are read at every step, so a park that
  // silently revoked or downgraded the grant would fail here rather than only
  // in a state-tool round trip.
  test("engine park -> engine --resume preserves the Intent mode and grant", () => {
    fullAutonomyProject();
    const modeBefore = field("Intent Autonomy Mode");
    const grantBefore = field("Intent Grant");
    expect(modeBefore).toBe("full");
    expect(grantBefore).not.toBe("none");
    expect(grantBefore.length).toBeGreaterThan(0);

    expect(directiveOf(runEngine(["park"]).stdout).kind).toBe("parked");
    expect(stateText()).toContain("- **Parked**:");
    // Parked, but still granted.
    expect(field("Intent Autonomy Mode")).toBe(modeBefore);
    expect(field("Intent Grant")).toBe(grantBefore);
    expect(field("Construction Autonomy Mode")).toBe("autonomous");

    resumeThroughEngine();

    // Resumed, still the same grant: a park is a pause, not a revocation.
    expect(field("Intent Autonomy Mode")).toBe(modeBefore);
    expect(field("Intent Grant")).toBe(grantBefore);
    expect(field("Construction Autonomy Mode")).toBe("autonomous");
  });

  test("engine park emits `error` naming the refusal when the run is unattended", () => {
    fullAutonomyProject();
    // Spend the declaration's turn, then resume: the record is back to a
    // running autonomous workflow with nobody at the keyboard.
    expect(runState(["park"]).status).toBe(0);
    resumeThroughEngine();

    const res = runEngine(["park"]);
    expect(res.status).toBe(0); // the engine reports refusals as a directive
    const directive = directiveOf(res.stdout);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("Cannot park the workflow");
    expect(String(directive.message)).toContain("HUMAN_TURN");
    expect(stateText()).not.toContain("- **Parked**:");
  });
});
