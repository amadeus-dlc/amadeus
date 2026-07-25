// Shared fixture for the solo standing-grant gate transaction suites. Every
// tests/integration/t-solo-gate-transaction*.test.ts file builds the same
// workspace — a seeded intent whose inception gate is open, an issued standing
// grant, and a routed carrier — so that construction lives here once and each
// suite stays a single responsibility.

import { expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendAuditEntry } from "../../packages/framework/core/tools/amadeus-audit.ts";
import {
  directiveSelfCheckExamples,
  type RunStageDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";
import {
  auditShardName,
  type StageEntry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  routeSoloStandingGrantDirective,
  validateSoloStandingGrantById,
} from "../../packages/framework/core/tools/amadeus-grant-authorization.ts";
import {
  createTestProject,
  DEFAULT_INTENT_UUID,
  seededRecordDir,
  seededStateFile,
  seedStateFile,
} from "./fixtures.ts";


export const REPO_ROOT = join(import.meta.dir, "..", "..");
export const STATE = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-state.ts",
);
export const MINT = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-mint-presence.ts",
);
export const GRAPH_PATH = join(REPO_ROOT, ".codex", "tools", "data", "stage-graph.json");
export const GRAPH = JSON.parse(readFileSync(GRAPH_PATH, "utf-8")) as StageEntry[];
export const STAGE = "requirements-analysis";
export const GRANT_ID = "cafe0001";
export const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";
export const SESSION_ID = "trusted-solo-session";
const roots: string[] = [];

export function cleanupSoloGateRoots(): void {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
}


export function stateEnv(root: string): Record<string, string> {
  return {
    ...process.env,
    CLAUDE_PROJECT_DIR: root,
    AMADEUS_OPERATING_MODE: "solo",
    AMADEUS_STAGE_GRAPH: GRAPH_PATH,
    AMADEUS_SKIP_ARTIFACT_GUARD: "1",
    AMADEUS_TRUSTED_SESSION_ID: SESSION_ID,
  };
}

export function runState(
  root: string,
  args: string[],
): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const result = spawnSync(
    process.execPath,
    [STATE, ...args, "--project-dir", root],
    { encoding: "utf-8", env: stateEnv(root) },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function captureStdout(fn: () => void): string {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...values: unknown[]) => lines.push(values.join(" "));
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines.join("\n");
}

export function appendGrant(
  root: string,
  expiresAt: string,
  grantId: string = GRANT_ID,
): string {
  const intent = seededRecordDir(root).split("/").at(-1)!;
  const human = appendAuditEntry("HUMAN_TURN", {}, root, intent);
  appendAuditEntry(
    "GRANT_ISSUED",
    {
      "Grant Id": grantId,
      Scope: "stage-gates",
      "Expires At": expiresAt,
      "Includes Phase Boundary": "true",
      "Issuer Space": "default",
      "Issuer Intent": intent,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": human.timestamp,
    },
    root,
    intent,
  );
  return human.timestamp;
}

// Scan-budget fixture sizes: E = every audit event registered in the space,
// E_owner = the receipt owner's own events.
export const SPACE_EVENT_BUDGET = 100;
export const OWNER_EVENT_BUDGET = 50;
export const SCAN_PASSES = [
  "candidate-selection",
  "receipt-lookup",
  "owner-revalidation",
] as const;

function auditEventCount(content: string): number {
  return content
    .split(/\n---\n/)
    .filter((block) => /^\*\*Event\*\*: /m.test(block)).length;
}

function fillerEvents(count: number): string {
  let blocks = "";
  for (let index = 0; index < count; index++) {
    blocks += `\n## FILLER\n**Timestamp**: 2026-07-25T00:00:00.000Z\n**Event**: FILLER\n**Index**: ${index}\n\n---\n`;
  }
  return blocks;
}

// Grow the workspace to the E / E_owner budget: pad the owner's shard up to
// E_owner and park the remaining space events in a second registered intent.
export function padAuditFixture(
  root: string,
  owner: string,
): { readonly spaceEvents: number; readonly ownerEvents: number } {
  const ownerShard = join(owner, "audit", auditShardName(root));
  const ownerContent = readFileSync(ownerShard, "utf-8");
  const ownerPad = OWNER_EVENT_BUDGET - auditEventCount(ownerContent);
  if (ownerPad < 0) throw new Error(`owner fixture already exceeds E_owner: ${-ownerPad}`);
  writeFileSync(ownerShard, ownerContent + fillerEvents(ownerPad));

  const intentsDir = join(root, "amadeus", "spaces", "default", "intents");
  const filler = "filler-intent-0000abcd";
  mkdirSync(join(intentsDir, filler, "audit"), { recursive: true });
  writeFileSync(
    join(intentsDir, filler, "amadeus-state.md"),
    readFileSync(join(owner, "amadeus-state.md"), "utf-8"),
  );
  writeFileSync(
    join(intentsDir, filler, "audit", "filler-clone.md"),
    `# AI-DLC Audit Log\n${fillerEvents(SPACE_EVENT_BUDGET - OWNER_EVENT_BUDGET)}`,
  );
  const registryPath = join(intentsDir, "intents.json");
  const registry: Array<Record<string, unknown>> = JSON.parse(readFileSync(registryPath, "utf-8"));
  writeFileSync(
    registryPath,
    `${JSON.stringify(
      [
        ...registry,
        {
          uuid: "33333333-3333-4333-8333-333333333333",
          slug: "filler-intent",
          dirName: filler,
          status: "in-flight",
        },
      ],
      null,
      2,
    )}\n`,
  );
  const ownerEvents = auditEventCount(readFileSync(ownerShard, "utf-8"));
  return { spaceEvents: ownerEvents + (SPACE_EVENT_BUDGET - OWNER_EVENT_BUDGET), ownerEvents };
}

export function revokeGrant(root: string, humanTs: string, grantId: string): void {
  const intent = seededRecordDir(root).split("/").at(-1)!;
  appendAuditEntry(
    "GRANT_REVOKED",
    {
      "Grant Id": grantId,
      "Issuer Space": "default",
      "Issuer Intent": intent,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": humanTs,
    },
    root,
    intent,
  );
}

// Rewrite the issued grant's Issuer Intent so the owner-lock revalidation sees
// an issuer that is not the receipt owner (TR-23), without touching any other
// audit field.
export function breakGrantIssuerIntent(root: string): void {
  const shard = join(seededRecordDir(root), "audit", auditShardName(root));
  const content = readFileSync(shard, "utf-8");
  const intent = seededRecordDir(root).split("/").at(-1)!;
  writeFileSync(
    shard,
    content.replace(
      `**Issuer Intent**: ${intent}`,
      "**Issuer Intent**: some-other-intent-00000001",
    ),
  );
}

export function setup(expiresAt: string, routeNow: number): {
  readonly root: string;
  readonly owner: string;
  readonly humanTs: string;
} {
  const root = createTestProject();
  roots.push(root);
  seedStateFile(root, "state-mid-inception.md");
  const registryPath = join(
    root,
    "amadeus",
    "spaces",
    "default",
    "intents",
    "intents.json",
  );
  const registry: Array<Record<string, unknown>> = JSON.parse(readFileSync(registryPath, "utf-8"));
  registry[0].dirName = seededRecordDir(root).split("/").at(-1)!;
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  const phaseCheck = join(seededRecordDir(root), "verification");
  mkdirSync(phaseCheck, { recursive: true });
  writeFileSync(
    join(phaseCheck, "phase-check-inception.md"),
    "# Inception phase check\n",
  );
  expect(runState(root, ["gate-start", STAGE]).status).toBe(0);
  const humanTs = appendGrant(root, expiresAt);
  const state = readFileSync(seededStateFile(root), "utf-8");
  const ownerIntent = seededRecordDir(root).split("/").at(-1)!;
  const validation = validateSoloStandingGrantById(
    root,
    ownerIntent,
    GRANT_ID,
    STAGE,
    state,
    GRAPH,
    routeNow,
  );
  if (validation.kind !== "valid") throw new Error(`fixture grant is invalid: ${validation.reason}`);
  const example = directiveSelfCheckExamples.find(
    (candidate) => candidate.kind === "run-stage" && candidate.gate === true,
  );
  if (example === undefined || example.kind !== "run-stage") throw new Error("run-stage fixture is unavailable");
  const routedInput: RunStageDirective = {
    ...example,
    stage: STAGE,
    phase: "inception",
    gate: true,
  };
  const directive = routeSoloStandingGrantDirective({
    directive: routedInput,
    projectDir: root,
    stateContent: state,
    graph: GRAPH,
    operatingMode: "solo",
    nowMs: routeNow,
    routeIdFactory: () => ROUTE_ID,
  });
  expect(directive.standing_grant_id).toBe(GRANT_ID);
  expect(directive.standing_grant_route_id).toBe(ROUTE_ID);
  return { root, owner: seededRecordDir(root), humanTs };
}

export function switchCursorToNonOwner(root: string): string {
  const uuid = "00000000-0000-7000-8000-000000000002";
  const dir = "non-owner-8000000000000002";
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  mkdirSync(join(intents, dir, "audit"), { recursive: true });
  writeFileSync(join(intents, dir, "amadeus-state.md"), "# Non-owner state\n");
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      {
        uuid: DEFAULT_INTENT_UUID,
        slug: "fixture",
        dirName: seededRecordDir(root).split("/").at(-1)!,
        status: "in-flight",
      },
      { uuid, slug: "non-owner", dirName: dir, status: "in-flight" },
    ], null, 2)}\n`,
  );
  writeFileSync(join(intents, "active-intent"), `${dir}\n`);
  return join(intents, dir);
}

export const SOLO_ENV_KEYS = [
  "CLAUDE_PROJECT_DIR",
  "AMADEUS_OPERATING_MODE",
  "AMADEUS_STAGE_GRAPH",
  "AMADEUS_SKIP_ARTIFACT_GUARD",
  "AMADEUS_TRUSTED_SESSION_ID",
] as const;

let savedEnv: Record<string, string | undefined> = {};

// Point the in-process handlers at a fixture workspace, remembering the ambient
// values so restoreSoloEnv can put them back.
export function useSoloEnv(root: string): void {
  savedEnv = {};
  for (const key of SOLO_ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.CLAUDE_PROJECT_DIR = root;
  process.env.AMADEUS_OPERATING_MODE = "solo";
  process.env.AMADEUS_STAGE_GRAPH = GRAPH_PATH;
  process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  process.env.AMADEUS_TRUSTED_SESSION_ID = SESSION_ID;
}

export function restoreSoloEnv(): void {
  for (const key of SOLO_ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}
