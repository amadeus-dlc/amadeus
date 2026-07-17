// covers: file:tools/amadeus-lib.ts, file:tools/amadeus-state.ts, file:tools/amadeus-utility.ts, file:tools/amadeus-audit.ts
//
// Standing delegation grants (Issue #1125). A leader session, grounded in a real
// HUMAN_TURN on its own ledger, may issue a TIME-BOXED standing grant that opens
// team-mode stage-gate approvals for its TTL without a per-gate human turn.
// Phase-boundary gates are EXCLUDED by default and require --include-phase-boundary;
// the walking-skeleton gate is never auto-covered. Grants are refused in solo
// mode, revoked by id, and lapse on expiry.
//
// This file is the "落ちる実証" for the security + coverage properties:
//   - a grant with no real issuer HUMAN_TURN on disk is NOT honoured
//   - an expired grant is NOT honoured
//   - a revoked grant is NOT honoured even before expiry
//   - the skeleton gate stays human-gated while Skeleton Stance is "on"
//   - a phase-boundary gate is covered ONLY when the grant opted in
//   - the CLI cannot mint GRANT_ISSUED / GRANT_REVOKED (presence-protected)
//   - issuance / revocation refuse in solo mode and on a type-invalid TTL
//
// Subject under test (the shipped distributable):
//   - dist/claude/.claude/tools/amadeus-lib.ts    : StandingGrant.parse,
//       findActiveStandingGrant, standingGrantSatisfiesGate, DEFAULT_STANDING_GRANT_TTL_MS
//   - dist/claude/.claude/tools/amadeus-utility.ts : standingGrantDoctorCheck
//   - dist/claude/.claude/tools/amadeus-audit.ts   : presenceMintRejection, handleAppend
//   - dist/claude/.claude/tools/amadeus-state.ts   : grant-standing-delegation /
//       revoke-standing-delegation / delegate-approval (spawned)
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendAuditEntry,
  handleAppend,
  presenceMintRejection,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  auditShardName,
  DEFAULT_STANDING_GRANT_TTL_MS,
  findActiveStandingGrant,
  firstInScopeStageOfPhase,
  loadStageGraph,
  SKELETON_ON_SCOPES,
  StandingGrant,
  standingGrantSatisfiesGate,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { standingGrantDoctorCheck } from "../../dist/claude/.claude/tools/amadeus-utility.ts";
import {
  handleApprove,
  handleDelegateApproval,
  handleGateStart,
  handleGrantStandingDelegation,
  handleRevokeStandingDelegation,
} from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  createTestProject,
  seededRecordDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STATE_TS = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-state.ts");
const BUN = process.execPath;
const GRAPH = loadStageGraph();

const tmpRoots: string[] = [];
afterAll(() => {
  for (const root of tmpRoots) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

// A workspace with one active intent whose audit shard is the issuer shard the
// in-process seams read (mirrors the on-disk layout after git sync).
function scaffold(activeIntent = "leader-intent-ef567890"): { root: string; intent: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-tsg-"));
  tmpRoots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  mkdirSync(join(intents, activeIntent), { recursive: true });
  writeFileSync(join(intents, activeIntent, "amadeus-state.md"), "# AI-DLC State\n", "utf-8");
  writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
  writeFileSync(join(intents, "active-intent"), `${activeIntent}\n`, "utf-8");
  return { root, intent: activeIntent };
}

// Seed a HUMAN_TURN in the intent shard and a GRANT_ISSUED grounded in it, using
// the trusted in-process writer (appendAuditEntry) — the same shard both blocks
// resolve to, so verifyDelegatedProvenance finds the grounding turn. Returns the
// grant id. `overrides` may replace/append any GRANT_ISSUED field.
function seedGrant(
  root: string,
  intent: string,
  opts: {
    grantId?: string;
    scope?: string;
    expiresAt?: string;
    includesPhaseBoundary?: boolean;
    groundHumanTurn?: boolean; // default true
  } = {},
): string {
  const grantId = opts.grantId ?? "aabbccdd";
  let humanTs = "2026-07-09T09:00:00.000Z";
  if (opts.groundHumanTurn !== false) {
    humanTs = appendAuditEntry("HUMAN_TURN", {}, root, intent).timestamp;
  }
  appendAuditEntry(
    "GRANT_ISSUED",
    {
      "Grant Id": grantId,
      Scope: opts.scope ?? "stage-gates",
      "Expires At": opts.expiresAt ?? new Date(Date.now() + DEFAULT_STANDING_GRANT_TTL_MS).toISOString(),
      "Includes Phase Boundary": opts.includesPhaseBoundary ? "true" : "false",
      "Issuer Space": "default",
      "Issuer Intent": intent,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": humanTs,
    },
    root,
    intent,
  );
  return grantId;
}

// A parsed StandingGrant with a chosen phase-boundary opt-in, built from a
// synthesized GRANT_ISSUED block (the only construction path).
function grantWith(includesPhaseBoundary: boolean): StandingGrant {
  const block =
    "## Standing Grant Issued\n" +
    "**Timestamp**: 2026-07-09T09:00:00.000Z\n" +
    "**Event**: GRANT_ISSUED\n" +
    "**Grant Id**: aabbccdd\n" +
    "**Scope**: stage-gates\n" +
    "**Expires At**: 2099-01-01T00:00:00.000Z\n" +
    `**Includes Phase Boundary**: ${includesPhaseBoundary ? "true" : "false"}\n` +
    "**Issuer Space**: default\n" +
    "**Issuer Intent**: leader-intent-ef567890\n" +
    "**Issuer Shard**: host-clone.md\n" +
    "**Issuer Human Ts**: 2026-07-09T09:00:00.000Z\n";
  const g = StandingGrant.parse(block);
  if (g === null) throw new Error("test fixture: grantWith failed to parse");
  return g;
}

// A minimal state file the classifier reads (Scope + optional Skeleton Stance).
function stateContent(scope: string, skeletonStance?: string): string {
  let s = `# AI-DLC State\n\n- **Scope**: ${scope}\n`;
  if (skeletonStance !== undefined) s += `- **Skeleton Stance**: ${skeletonStance}\n`;
  return s;
}

// Spawn amadeus-state.ts with an explicit env (so operating-mode is controlled
// per call). Returns { status, stderr, stdout }.
function runState(
  root: string,
  args: string[],
  env: Record<string, string>,
): { status: number; stderr: string; stdout: string } {
  // Start from a clean env WITHOUT AMADEUS_OPERATING_MODE or the human-presence
  // off-switch so a test controls BOTH explicitly (the CI suite exports
  // AMADEUS_SKIP_HUMAN_PRESENCE_GUARD=1 globally, which would otherwise bypass the
  // grounding gate the round-trip tests need active).
  const base = { ...process.env };
  delete base.AMADEUS_OPERATING_MODE;
  delete base.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  const r = spawnSync(BUN, [STATE_TS, ...args, "--project-dir", root], {
    encoding: "utf-8",
    env: { ...base, ...env },
  });
  return { status: r.status === null ? -1 : r.status, stderr: r.stderr ?? "", stdout: r.stdout ?? "" };
}

describe("StandingGrant.parse", () => {
  test("parses a well-formed GRANT_ISSUED block", () => {
    const g = grantWith(true);
    expect(g.grantId).toBe("aabbccdd");
    expect(g.scope).toBe("stage-gates");
    expect(g.includesPhaseBoundary).toBe(true);
    expect(g.isExpired(Date.parse("2098-01-01T00:00:00.000Z"))).toBe(false);
    expect(g.isExpired(Date.parse("2100-01-01T00:00:00.000Z"))).toBe(true);
  });

  test("returns null for a broken block (missing Expires At)", () => {
    const block =
      "## Standing Grant Issued\n**Event**: GRANT_ISSUED\n**Grant Id**: aabbccdd\n" +
      "**Scope**: stage-gates\n**Includes Phase Boundary**: false\n" +
      "**Issuer Space**: default\n**Issuer Intent**: x\n**Issuer Shard**: y.md\n" +
      "**Issuer Human Ts**: 2026-07-09T09:00:00.000Z\n";
    expect(StandingGrant.parse(block)).toBeNull();
  });

  test("returns null for a non-parseable Expires At", () => {
    const block =
      "**Event**: GRANT_ISSUED\n**Grant Id**: aabbccdd\n**Scope**: stage-gates\n" +
      "**Expires At**: not-a-date\n**Includes Phase Boundary**: false\n" +
      "**Issuer Space**: default\n**Issuer Intent**: x\n**Issuer Shard**: y.md\n" +
      "**Issuer Human Ts**: 2026-07-09T09:00:00.000Z\n";
    expect(StandingGrant.parse(block)).toBeNull();
  });

  test("returns null when scope is not stage-gates", () => {
    const block =
      "**Event**: GRANT_ISSUED\n**Grant Id**: aabbccdd\n**Scope**: everything\n" +
      "**Expires At**: 2099-01-01T00:00:00.000Z\n**Includes Phase Boundary**: false\n" +
      "**Issuer Space**: default\n**Issuer Intent**: x\n**Issuer Shard**: y.md\n" +
      "**Issuer Human Ts**: 2026-07-09T09:00:00.000Z\n";
    expect(StandingGrant.parse(block)).toBeNull();
  });
});

describe("standingGrantSatisfiesGate — gate classification", () => {
  const scope = "feature";
  // feature: first construction stage is functional-design; its next in-scope
  // stage (nfr-requirements) is also construction → NOT a phase boundary.
  const firstConstruction = "functional-design";

  test("RED: the walking-skeleton gate is NOT covered while Skeleton Stance is on", () => {
    const state = stateContent(scope, "on");
    expect(standingGrantSatisfiesGate(grantWith(true), firstConstruction, state, GRAPH)).toBe(false);
  });

  test("an opt-out grant does NOT cover a phase-boundary gate", () => {
    // delivery-planning (inception) → functional-design (construction): boundary.
    const state = stateContent(scope);
    expect(standingGrantSatisfiesGate(grantWith(false), "delivery-planning", state, GRAPH)).toBe(false);
  });

  test("WHITE: an opt-in grant covers a phase-boundary gate", () => {
    const state = stateContent(scope);
    expect(standingGrantSatisfiesGate(grantWith(true), "delivery-planning", state, GRAPH)).toBe(true);
  });

  test("WHITE: an ordinary same-phase gate is covered", () => {
    // requirements-analysis (inception) → user-stories (inception): not a boundary.
    const state = stateContent(scope);
    expect(standingGrantSatisfiesGate(grantWith(false), "requirements-analysis", state, GRAPH)).toBe(true);
  });

  test("the skeleton gate IS covered once Skeleton Stance is off", () => {
    const state = stateContent(scope, "off");
    expect(standingGrantSatisfiesGate(grantWith(false), firstConstruction, state, GRAPH)).toBe(true);
  });
});

describe("findActiveStandingGrant — corpus scan", () => {
  test("finds a valid grounded grant", () => {
    const { root, intent } = scaffold();
    seedGrant(root, intent, { grantId: "11112222" });
    const g = findActiveStandingGrant(root, Date.now());
    expect(g?.grantId).toBe("11112222");
  });

  test("RED: an expired grant is not returned", () => {
    const { root, intent } = scaffold();
    seedGrant(root, intent, { expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(findActiveStandingGrant(root, Date.now())).toBeNull();
  });

  test("TTL boundary: valid just before expiry, invalid just after", () => {
    const { root, intent } = scaffold();
    const expiresAt = "2026-07-09T12:00:00.000Z";
    seedGrant(root, intent, { expiresAt });
    const expMs = Date.parse(expiresAt);
    expect(findActiveStandingGrant(root, expMs - 1)?.grantId).toBe("aabbccdd");
    expect(findActiveStandingGrant(root, expMs)).toBeNull(); // now >= expiry → expired
  });

  test("RED: a revoked grant is not returned even before expiry", () => {
    const { root, intent } = scaffold();
    const id = seedGrant(root, intent, { grantId: "33334444" });
    appendAuditEntry(
      "GRANT_REVOKED",
      {
        "Grant Id": id,
        "Issuer Space": "default",
        "Issuer Intent": intent,
        "Issuer Shard": auditShardName(root),
        "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
      },
      root,
      intent,
    );
    expect(findActiveStandingGrant(root, Date.now())).toBeNull();
  });

  test("RED: a grant with no grounding HUMAN_TURN on disk is not honoured", () => {
    const { root, intent } = scaffold();
    seedGrant(root, intent, { groundHumanTurn: false }); // GRANT_ISSUED but no HUMAN_TURN
    expect(findActiveStandingGrant(root, Date.now())).toBeNull();
  });

  test("returns the latest-expiring grant when several are valid", () => {
    const { root, intent } = scaffold();
    seedGrant(root, intent, { grantId: "aaaa0001", expiresAt: "2099-01-01T00:00:00.000Z" });
    seedGrant(root, intent, { grantId: "aaaa0002", expiresAt: "2099-06-01T00:00:00.000Z" });
    expect(findActiveStandingGrant(root, Date.now())?.grantId).toBe("aaaa0002");
  });

  test("determinism: same corpus + same now yields the same result twice", () => {
    const { root, intent } = scaffold();
    seedGrant(root, intent, { grantId: "deadbeef" });
    const now = Date.now();
    expect(findActiveStandingGrant(root, now)?.grantId).toBe(findActiveStandingGrant(root, now)?.grantId);
  });

  test("no grant present → null", () => {
    const { root } = scaffold();
    expect(findActiveStandingGrant(root, Date.now())).toBeNull();
  });
});

describe("standingGrantDoctorCheck", () => {
  test("reports an active grant with scope / TTL / phase-boundary / issuer", () => {
    const { root, intent } = scaffold();
    seedGrant(root, intent, { includesPhaseBoundary: true });
    const now = Date.now();
    const check = standingGrantDoctorCheck(root, now);
    expect(check.pass).toBe(true);
    expect(check.label).toContain("stage-gates");
    expect(check.label).toContain("INCLUDED");
    expect(check.label).toContain(intent);
  });

  test("reports none when no grant is in force (still pass)", () => {
    const { root } = scaffold();
    const check = standingGrantDoctorCheck(root, Date.now());
    expect(check.pass).toBe(true);
    expect(check.label).toContain("none (per-gate approval required)");
  });
});

describe("R-8: the CLI cannot mint grant events (presence-protected)", () => {
  test("presenceMintRejection rejects GRANT_ISSUED and GRANT_REVOKED", () => {
    expect(presenceMintRejection("GRANT_ISSUED")).toContain("presence/provenance");
    expect(presenceMintRejection("GRANT_REVOKED")).toContain("presence/provenance");
  });

  test("handleAppend throws for GRANT_ISSUED and GRANT_REVOKED", () => {
    const { root } = scaffold();
    expect(() => handleAppend("GRANT_ISSUED", {}, root)).toThrow(/presence\/provenance/);
    expect(() => handleAppend("GRANT_REVOKED", {}, root)).toThrow(/presence\/provenance/);
  });
});

describe("verb refusals (spawned amadeus-state.ts)", () => {
  test("RED: grant-standing-delegation refuses in solo mode (env unset)", () => {
    const { root } = scaffold();
    const r = runState(root, ["grant-standing-delegation"], {
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1", // isolate the team-mode refusal
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("team-mode");
  });

  test("RED: --ttl-ms 'five' is a loud refusal (type-invalid, no fail-open)", () => {
    const { root } = scaffold();
    const r = runState(root, ["grant-standing-delegation", "--ttl-ms", "five"], {
      AMADEUS_OPERATING_MODE: "team",
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("finite positive number");
  });

  test("RED: revoke-standing-delegation refuses in solo mode (env unset)", () => {
    const { root } = scaffold();
    const r = runState(root, ["revoke-standing-delegation", "--grant-id", "aabbccdd"], {
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("team-mode");
  });

  test("RED: revoke-standing-delegation rejects a non-8-hex grant id", () => {
    const { root } = scaffold();
    const r = runState(root, ["revoke-standing-delegation", "--grant-id", "NOTHEX!"], {
      AMADEUS_OPERATING_MODE: "team",
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("8-hex");
  });
});

describe("issuance round-trip (spawned) — team mode honours, solo ignores", () => {
  // Build a full issuer shard by hand so the spawned subprocess (which computes
  // its own shard filename from the pinned clone-id) reads the SAME file. The
  // shard holds a HUMAN_TURN (grounds the grant), a GRANT_ISSUED (grounded in it),
  // and a GATE_APPROVED AFTER the turn (so humanActedSinceGate is false → the
  // delegate path evaluates the standing grant).
  const CLONE = "tsgcloneid00001";
  function shardName(): string {
    const host =
      hostname().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) ||
      "host";
    return `${host}-${CLONE}.md`;
  }
  function block(heading: string, event: string, fields: Record<string, string>): string {
    let b = `\n## ${heading}\n**Timestamp**: ${fields.__ts ?? "2026-07-09T09:00:00.000Z"}\n**Event**: ${event}\n`;
    for (const [k, v] of Object.entries(fields)) {
      if (k === "__ts") continue;
      b += `**${k}**: ${v}\n`;
    }
    return `${b}\n---\n`;
  }
  function seedDelegateScenario(): { root: string; issuer: string; target: string } {
    const root = mkdtempSync(join(tmpdir(), "amadeus-tsg-rt-"));
    tmpRoots.push(root);
    const intents = join(root, "amadeus", "spaces", "default", "intents");
    const issuer = "leader-intent-ef567890";
    const target = "conductor-intent-abcd1234";
    for (const rec of [issuer, target]) {
      mkdirSync(join(intents, rec), { recursive: true });
    }
    writeFileSync(join(intents, issuer, "amadeus-state.md"), "# AI-DLC State\n", "utf-8");
    // Target carries a Scope so the classifier can judge its gate.
    writeFileSync(join(intents, target, "amadeus-state.md"), stateContent("feature"), "utf-8");
    writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
    writeFileSync(join(intents, "active-intent"), `${issuer}\n`, "utf-8");
    writeFileSync(join(root, "amadeus", ".amadeus-clone-id"), `${CLONE}\n`, "utf-8");

    const shardDir = join(intents, issuer, "audit");
    mkdirSync(shardDir, { recursive: true });
    const humanTs = "2026-07-09T09:00:00.000Z";
    let content = "# AI-DLC Audit Log\n";
    content += block("Human Turn", "HUMAN_TURN", { __ts: humanTs });
    content += block("Standing Grant Issued", "GRANT_ISSUED", {
      __ts: "2026-07-09T09:01:00.000Z",
      "Grant Id": "55556666",
      Scope: "stage-gates",
      "Expires At": "2099-01-01T00:00:00.000Z",
      "Includes Phase Boundary": "false",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": shardName(),
      "Issuer Human Ts": humanTs,
    });
    // A resolution AFTER the turn so humanActedSinceGate() is false.
    content += block("Gate Approved", "GATE_APPROVED", {
      __ts: "2026-07-09T09:02:00.000Z",
      Stage: "requirements-analysis",
    });
    writeFileSync(join(shardDir, shardName()), content, "utf-8");
    return { root, issuer, target };
  }

  test("WHITE: team mode issues a grant-authorised delegation and stamps the Grant Id", () => {
    const { root, target } = seedDelegateScenario();
    const r = runState(
      root,
      ["delegate-approval", "requirements-analysis", "--to-intent", target],
      { AMADEUS_OPERATING_MODE: "team" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"delegated":true');
    const targetShard = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", target, "audit", shardName()),
      "utf-8",
    );
    expect(targetShard).toContain("**Event**: DELEGATED_APPROVAL");
    expect(targetShard).toContain("**Grant Id**: 55556666");
  });

  test("RED: solo mode ignores the grant and refuses the same delegation", () => {
    const { root, target } = seedDelegateScenario();
    const r = runState(
      root,
      ["delegate-approval", "requirements-analysis", "--to-intent", target],
      {}, // AMADEUS_OPERATING_MODE unset → solo
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("no real human turn");
  });
});

// --- In-process seam coverage (spawn-blindspot: drive the exported handlers
// directly so their lines are measured by LCOV; the spawned round-trip above
// proves end-to-end behaviour but subprocess execution is not instrumented). ---
describe("in-process handler seams (coverage)", () => {
  class ExitSignal extends Error {
    constructor(public readonly code: number) {
      super(`exit ${code}`);
    }
  }
  // Wrap a handler call: capture process.exit (error() path), console.error
  // (error message), console.log (stdout JSON), and process.stderr.write (the
  // human-readable grant summary), so the handler runs fully without killing the
  // test or leaking to the runner's streams.
  function captureIO(fn: () => void): { threw: boolean; code: number; stdout: string; stderr: string } {
    let stdout = "";
    let stderr = "";
    let code = -1;
    let threw = false;
    const origExit = process.exit.bind(process);
    const origErr = console.error;
    const origLog = console.log;
    const origWrite = process.stderr.write.bind(process.stderr);
    process.exit = ((c?: number) => {
      throw new ExitSignal(c ?? 0);
    }) as typeof process.exit;
    console.error = (...a: unknown[]) => {
      stderr += a.map(String).join(" ");
    };
    console.log = (...a: unknown[]) => {
      stdout += a.map(String).join(" ");
    };
    (process.stderr as unknown as { write: (c: string | Uint8Array) => boolean }).write = (
      c: string | Uint8Array,
    ) => {
      stderr += typeof c === "string" ? c : c.toString();
      return true;
    };
    try {
      fn();
    } catch (e) {
      if (e instanceof ExitSignal) {
        threw = true;
        code = e.code;
      } else {
        throw e;
      }
    } finally {
      process.exit = origExit;
      console.error = origErr;
      console.log = origLog;
      (process.stderr as unknown as { write: typeof origWrite }).write = origWrite;
    }
    return { threw, code, stdout, stderr };
  }

  // Env keys these seam tests mutate; saved once and restored after each test so
  // the suite-wide AMADEUS_SKIP_HUMAN_PRESENCE_GUARD is not leaked/clobbered.
  const ENV_KEYS = [
    "CLAUDE_PROJECT_DIR",
    "AMADEUS_OPERATING_MODE",
    "AMADEUS_SKIP_HUMAN_PRESENCE_GUARD",
    "AMADEUS_SKIP_ARTIFACT_GUARD",
  ];
  let savedEnv: Record<string, string | undefined> = {};
  function saveEnv(): void {
    savedEnv = {};
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  }
  function restoreEnv(): void {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  }

  // A project with a minimal state file (so the default record resolves as an
  // intent) and CLAUDE_PROJECT_DIR pointed at it.
  function seamProject(): string {
    const proj = createTestProject();
    mkdirSyncFsSafe(seededRecordDir(proj));
    writeFileSync(seededStateFile(proj), "# AI-DLC State\n\n- **Scope**: feature\n", "utf-8");
    process.env.CLAUDE_PROJECT_DIR = proj;
    return proj;
  }
  function mkdirSyncFsSafe(dir: string): void {
    mkdirSync(dir, { recursive: true });
  }
  // Seed a HUMAN_TURN (grounds grants + makes humanActedSinceGate true) into the
  // active intent shard. Returns its timestamp.
  function seedHumanTurn(proj: string): string {
    return appendAuditEntry("HUMAN_TURN", {}, proj).timestamp;
  }

  beforeEach(saveEnv);
  afterEach(restoreEnv);

  test("handleGrantStandingDelegation: happy path emits a grant and prints JSON", () => {
    const proj = seamProject();
    seedHumanTurn(proj);
    process.env.AMADEUS_OPERATING_MODE = "team";
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    const r = captureIO(() => handleGrantStandingDelegation(["--include-phase-boundary"]));
    expect(r.threw).toBe(false);
    expect(r.stdout).toContain('"scope":"stage-gates"');
    expect(r.stderr).toContain("INCLUDED");
    expect(findActiveStandingGrant(proj, Date.now())?.includesPhaseBoundary).toBe(true);
  });

  test("handleGrantStandingDelegation: refuses in solo mode", () => {
    const proj = seamProject();
    seedHumanTurn(proj);
    delete process.env.AMADEUS_OPERATING_MODE;
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    const r = captureIO(() => handleGrantStandingDelegation([]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("team-mode");
  });

  test("handleGrantStandingDelegation: refuses a bad --scope and a bad --ttl-ms", () => {
    const proj = seamProject();
    seedHumanTurn(proj);
    process.env.AMADEUS_OPERATING_MODE = "team";
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    expect(captureIO(() => handleGrantStandingDelegation(["--scope", "everything"])).stderr).toContain(
      "unsupported --scope",
    );
    expect(captureIO(() => handleGrantStandingDelegation(["--ttl-ms", "five"])).stderr).toContain(
      "finite positive number",
    );
    // A valid explicit TTL takes the happy branch.
    const r = captureIO(() => handleGrantStandingDelegation(["--ttl-ms", "60000"]));
    expect(r.threw).toBe(false);
    expect(r.stderr).toContain("EXCLUDED");
  });

  test("handleGrantStandingDelegation: refuses when no fresh human turn backs the call", () => {
    const proj = seamProject();
    // A resolution with no outstanding HUMAN_TURN after it → humanActedSinceGate
    // is false (not the empty-ledger fail-open) → the grounding gate fires.
    appendAuditEntry("GATE_APPROVED", { Stage: "x" }, proj);
    process.env.AMADEUS_OPERATING_MODE = "team";
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    const r = captureIO(() => handleGrantStandingDelegation([]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("since the last gate resolution");
  });

  test("handleGrantStandingDelegation: refuses when no active intent grounds the grant", () => {
    // A workspace shell with NO seeded state file → no valid record → activeIntent
    // resolves to null → collectIssuerProvenance refuses.
    const proj = createTestProject();
    process.env.CLAUDE_PROJECT_DIR = proj;
    process.env.AMADEUS_OPERATING_MODE = "team";
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1"; // skip grounding → reach collectIssuerProvenance
    const r = captureIO(() => handleGrantStandingDelegation([]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("no active intent");
  });

  test("handleGrantStandingDelegation: guard-disabled reaches the no-HUMAN_TURN issuer check", () => {
    seamProject(); // no HUMAN_TURN
    process.env.AMADEUS_OPERATING_MODE = "team";
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1"; // skip grounding → reach collectIssuerProvenance
    const r = captureIO(() => handleGrantStandingDelegation([]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("no HUMAN_TURN in this session");
  });

  test("handleRevokeStandingDelegation: happy path emits GRANT_REVOKED", () => {
    const proj = seamProject();
    seedHumanTurn(proj);
    process.env.AMADEUS_OPERATING_MODE = "team";
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    const r = captureIO(() => handleRevokeStandingDelegation(["--grant-id", "0badf00d"]));
    expect(r.threw).toBe(false);
    expect(r.stdout).toContain('"revoked_grant_id":"0badf00d"');
  });

  test("handleRevokeStandingDelegation: refuses solo, missing id, and bad id", () => {
    const proj = seamProject();
    seedHumanTurn(proj);
    delete process.env.AMADEUS_OPERATING_MODE;
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    expect(captureIO(() => handleRevokeStandingDelegation(["--grant-id", "aabbccdd"])).stderr).toContain(
      "team-mode",
    );
    process.env.AMADEUS_OPERATING_MODE = "team";
    expect(captureIO(() => handleRevokeStandingDelegation([])).stderr).toContain("requires --grant-id");
    expect(captureIO(() => handleRevokeStandingDelegation(["--grant-id", "NOTHEX!"])).stderr).toContain(
      "8-hex",
    );
  });

  test("handleDelegateApproval: a covering grant authorises the delegation in-process", () => {
    const proj = seamProject();
    const ht = seedHumanTurn(proj);
    // A resolution AFTER the turn → humanActedSinceGate is false → grant path.
    appendAuditEntry("GATE_APPROVED", { Stage: "x" }, proj);
    // Seed a covering grant grounded in the same HUMAN_TURN.
    appendAuditEntry(
      "GRANT_ISSUED",
      {
        "Grant Id": "cafe0001",
        Scope: "stage-gates",
        "Expires At": new Date(Date.now() + DEFAULT_STANDING_GRANT_TTL_MS).toISOString(),
        "Includes Phase Boundary": "false",
        "Issuer Space": "default",
        "Issuer Intent": seededRecordName(proj),
        "Issuer Shard": auditShardName(proj),
        "Issuer Human Ts": ht,
      },
      proj,
    );
    // A target record with a Scope the classifier can read.
    const target = "target-intent-00000001";
    const targetDir = join(seededRecordDir(proj), "..", target);
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, "amadeus-state.md"), "# AI-DLC State\n\n- **Scope**: feature\n", "utf-8");
    process.env.AMADEUS_OPERATING_MODE = "team";
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    const r = captureIO(() =>
      handleDelegateApproval(["requirements-analysis", "--to-intent", target]),
    );
    expect(r.threw).toBe(false);
    expect(r.stdout).toContain('"delegated":true');
  });

  test("handleDelegateApproval: refuses when no grant covers and no human turn (solo)", () => {
    const proj = seamProject();
    seedHumanTurn(proj);
    appendAuditEntry("GATE_APPROVED", { Stage: "x" }, proj);
    const target = "target-intent-00000002";
    const targetDir = join(seededRecordDir(proj), "..", target);
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, "amadeus-state.md"), "# AI-DLC State\n\n- **Scope**: feature\n", "utf-8");
    delete process.env.AMADEUS_OPERATING_MODE; // solo
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    const r = captureIO(() =>
      handleDelegateApproval(["requirements-analysis", "--to-intent", target]),
    );
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("no real human turn");
  });

  test("handleDelegateApproval: refuses when the target intent record is missing", () => {
    const proj = seamProject();
    seedHumanTurn(proj);
    appendAuditEntry("GATE_APPROVED", { Stage: "x" }, proj);
    process.env.AMADEUS_OPERATING_MODE = "team";
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    const r = captureIO(() =>
      handleDelegateApproval(["requirements-analysis", "--to-intent", "no-such-intent-00000000"]),
    );
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("target intent record not found");
  });

  test("handleRevokeStandingDelegation: refuses when no fresh human turn backs the call", () => {
    const proj = seamProject();
    appendAuditEntry("GATE_APPROVED", { Stage: "x" }, proj); // resolution, no outstanding turn
    process.env.AMADEUS_OPERATING_MODE = "team";
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    const r = captureIO(() => handleRevokeStandingDelegation(["--grant-id", "aabbccdd"]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("since the last gate resolution");
  });

  // Set up requirements-analysis at [?] with a resolution after a human turn, so
  // the approve presence gate is not fresh. opts control whether a grant exists
  // and its coverage. Returns the project dir.
  function setupApprovable(opts: { grant?: "opt-in" | "none"; team?: boolean } = {}): string {
    const proj = createTestProject();
    seedStateFile(proj, "state-mid-inception.md");
    process.env.CLAUDE_PROJECT_DIR = proj;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    if (opts.team) process.env.AMADEUS_OPERATING_MODE = "team";
    else delete process.env.AMADEUS_OPERATING_MODE;
    captureIO(() => handleGateStart(["requirements-analysis"]));
    const ht = seedHumanTurn(proj);
    appendAuditEntry("GATE_APPROVED", { Stage: "prior" }, proj); // resolution → gate not fresh
    const vdir = join(seededRecordDir(proj), "verification");
    mkdirSync(vdir, { recursive: true });
    writeFileSync(join(vdir, "phase-check-inception.md"), "# phase-check inception\n", "utf-8");
    if (opts.grant === "opt-in") {
      appendAuditEntry(
        "GRANT_ISSUED",
        {
          "Grant Id": "beef0002",
          Scope: "stage-gates",
          "Expires At": new Date(Date.now() + DEFAULT_STANDING_GRANT_TTL_MS).toISOString(),
          "Includes Phase Boundary": "true",
          "Issuer Space": "default",
          "Issuer Intent": seededRecordName(proj),
          "Issuer Shard": auditShardName(proj),
          "Issuer Human Ts": ht,
        },
        proj,
      );
    }
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD; // guard ACTIVE for the approve call
    return proj;
  }

  test("handleApprove: a covering opt-in grant opens the gate and stamps the Grant Id", () => {
    const proj = setupApprovable({ grant: "opt-in", team: true });
    const r = captureIO(() => handleApprove(["requirements-analysis"]));
    expect(r.threw).toBe(false);
    const audit = readFileSync(seededAuditShardPath(proj), "utf-8");
    expect(audit).toContain("**Event**: GATE_APPROVED");
    expect(audit).toContain("**Grant Id**: beef0002");
  });

  test("handleApprove: refuses when no grant covers and no fresh human turn", () => {
    setupApprovable({ grant: "none", team: true });
    const r = captureIO(() => handleApprove(["requirements-analysis"]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("a real human has not acted at this gate");
  });

  test("handleApprove: a fresh human turn opens the gate without a grant", () => {
    const proj = setupApprovable({ grant: "none", team: false });
    // A HUMAN_TURN AFTER the last resolution → humanActedSinceGate is true.
    seedHumanTurn(proj);
    const r = captureIO(() => handleApprove(["requirements-analysis"]));
    expect(r.threw).toBe(false);
  });

  test("handleApprove: autonomous mode skips the presence check", () => {
    const proj = setupApprovable({ grant: "none", team: false });
    // Mark the workflow autonomous so isAutonomousMode short-circuits the check.
    const sf = seededStateFile(proj);
    writeFileSync(sf, `${readFileSync(sf, "utf-8")}- **Construction Autonomy Mode**: autonomous\n`, "utf-8");
    const r = captureIO(() => handleApprove(["requirements-analysis"]));
    expect(r.threw).toBe(false);
  });

  // The seeded record's dir NAME (issuer intent for grant provenance).
  function seededRecordName(proj: string): string {
    const rec = seededRecordDir(proj);
    return rec.slice(rec.lastIndexOf("/") + 1);
  }
  // The active intent's audit shard path (single pinned clone in fixtures).
  function seededAuditShardPath(proj: string): string {
    return join(seededRecordDir(proj), "audit", auditShardName(proj));
  }
});

// RED (e3 PR #1147 Major-1): a raw "scope-dependent" stance on a greenfield
// scope must still exclude the walking-skeleton gate — the stance field is
// persisted un-normalized, so literal "on"-only matching would silently grant
// through the skeleton gate when the classify round-trip never landed "on".
describe("skeleton exclusion honours un-normalized stance (e3 Major-1)", () => {
  test("RED: scope-dependent stance + greenfield scope excludes the skeleton gate", () => {
    const state = stateContent("feature", "scope-dependent");
    expect(standingGrantSatisfiesGate(grantWith(true), "functional-design", state, GRAPH)).toBe(false);
  });

  test("RED: absent stance + greenfield scope excludes the skeleton gate", () => {
    const state = stateContent("feature");
    expect(standingGrantSatisfiesGate(grantWith(true), "functional-design", state, GRAPH)).toBe(false);
  });

  test("WHITE: explicit off stance clears the exclusion on the same gate", () => {
    const state = stateContent("feature", "off");
    expect(standingGrantSatisfiesGate(grantWith(true), "functional-design", state, GRAPH)).toBe(true);
  });

  test("WHITE: scope-dependent stance on an incremental scope stays covered", () => {
    expect(SKELETON_ON_SCOPES.has("bugfix")).toBe(false);
    const state = stateContent("bugfix", "scope-dependent");
    // bugfix first construction stage: resolve from the graph via the same
    // helper the implementation uses — covered because bugfix is skeleton-off.
    const first = firstInScopeStageOfPhase("construction", "bugfix");
    if (first !== null) {
      const verdict = standingGrantSatisfiesGate(grantWith(true), first.slug, state, GRAPH);
      // covered unless that slug happens to be a phase boundary for bugfix —
      // assert the skeleton path specifically by requiring non-skeleton denial:
      // with stance scope-dependent + non-greenfield scope, only the
      // phase-boundary rule may deny (and grantWith(true) opts in), so true.
      expect(verdict).toBe(true);
    }
  });
});
