// Shared fixture for targeted-human solo gate approval tests.

import { resetOtelPerProject } from "./otel-reset.ts";
import { expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { StageEntry } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  armPresenceReservation,
  hostSessionCapability,
  mintHumanPresence,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import {
  createTestProject,
  DEFAULT_INTENT_UUID,
  seededRecordDir,
  seedStateFile,
} from "./fixtures.ts";
import { useRealScopeData } from "./real-scope-data.ts";

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
export const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";
export const SESSION_ID = "trusted-solo-session";

useRealScopeData();

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

export function setup(..._retiredGrantArguments: unknown[]): { readonly root: string; readonly owner: string } {
  const root = createTestProject();
  roots.push(root);
  resetOtelPerProject();
  seedStateFile(root, "state-mid-inception.md");
  const registryPath = join(
    root,
    "amadeus",
    "spaces",
    "default",
    "intents",
    "intents.json",
  );
  const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as Array<Record<string, unknown>>;
  registry[0].dirName = seededRecordDir(root).split("/").at(-1)!;
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  const phaseCheck = join(seededRecordDir(root), "verification");
  mkdirSync(phaseCheck, { recursive: true });
  writeFileSync(join(phaseCheck, "phase-check-inception.md"), "# Inception phase check\n");
  expect(runState(root, ["gate-start", STAGE]).status).toBe(0);
  return { root, owner: seededRecordDir(root) };
}

export function armAndMintTargetedApproval(
  root: string,
): { readonly targetIntentId: string; readonly reservationId: string } {
  const marker = armPresenceReservation({
    projectDir: root,
    sessionId: SESSION_ID,
    space: "default",
    targetIntentId: DEFAULT_INTENT_UUID,
    stage: STAGE,
    routeId: ROUTE_ID,
  });
  mintHumanPresence({
    projectDir: root,
    capability: hostSessionCapability(SESSION_ID),
  });
  return {
    targetIntentId: marker.targetIntentId,
    reservationId: marker.reservationId,
  };
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
