// t269 — mirror contract/policy performance budgets and determinism.
// covers: packages/framework/core/tools/amadeus-mirror-config.ts, amadeus-mirror-policy.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolveMirrorConfig } from "../../packages/framework/core/tools/amadeus-mirror-config.ts";
import {
  decideMirrorAction,
  mirrorEventIdentity,
  mirrorEventKey,
  type MirrorPolicyInput,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import type {
  MirrorOperationReceipt,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const INTENT = "260719-mirror-productization";
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// Nearest-rank p95 over a non-empty sample, and the median of three run p95s.
function nearestRankP95(durations: readonly number[]): number {
  const sorted = [...durations].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(0.95 * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1] ?? Number.NaN;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? Number.NaN)
    : ((sorted[mid - 1] ?? Number.NaN) + (sorted[mid] ?? Number.NaN)) / 2;
}

// Fixed fixture: mode auto, a completion-style event with three receipts, one
// warning, and a pending receipt for the measured event.
const boundary = { kind: "phase-verified", phase: "construction", instance: "p-1" } as const;
const event = mirrorEventIdentity("intent-uuid", boundary, "sync");
const createEvent = mirrorEventIdentity("intent-uuid", boundary, "create");

function receipt(
  e: typeof event,
  status: MirrorOperationReceipt["status"],
  operationId: string,
): MirrorOperationReceipt {
  return { key: mirrorEventKey(e), event: e, operationId, status, preparedAt: "2026-01-01T00:00:00Z" };
}

const fixtureState: MirrorStateSnapshot = {
  revision: 3,
  issueNumber: 42,
  provenance: null,
  receipts: {
    [mirrorEventKey(createEvent)]: receipt(createEvent, "succeeded", "op-c"),
    [mirrorEventKey(event)]: receipt(event, "pending", "op-s"),
  },
  warnings: [
    {
      operationId: "op-s",
      operation: "sync",
      classification: "network",
      summary: "temporary github failure",
      occurredAt: "2026-01-01T00:00:00Z",
      retryable: true,
      effect: "no-effect-confirmed",
      source: "persisted-warning",
    },
  ],
  repairChallenges: {},
};

const fixtureInput: MirrorPolicyInput = {
  kind: "lifecycle",
  mode: "auto",
  event,
  state: fixtureState,
};

describe("t269 pure policy budget", () => {
  test("decideMirrorAction p95 is at most 1 ms (median of 3 runs)", () => {
    for (let i = 0; i < 1000; i++) decideMirrorAction(fixtureInput);
    const runP95: number[] = [];
    for (let run = 0; run < 3; run++) {
      const samples: number[] = [];
      for (let i = 0; i < 10000; i++) {
        const start = performance.now();
        decideMirrorAction(fixtureInput);
        samples.push(performance.now() - start);
      }
      runP95.push(nearestRankP95(samples));
    }
    const result = median(runP95);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(1);
  });

  test("repeated input yields byte-identical canonical decisions", () => {
    const first = JSON.stringify(decideMirrorAction(fixtureInput));
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(decideMirrorAction(fixtureInput))).toBe(first);
    }
  });
});

describe("t269 selector + read + policy budget", () => {
  function workspace(): string {
    const root = mkdtempSync(join(tmpdir(), "amadeus-mirror-t269-"));
    roots.push(root);
    const base = join(root, "amadeus");
    for (const path of [
      join(base, "config.json"),
      join(base, "spaces", "default", "config.json"),
      join(base, "spaces", "default", "intents", INTENT, "config.json"),
    ]) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify({ "auto-mirror": "auto" })}\n`, "utf-8");
    }
    return root;
  }

  function fileCount(root: string): number {
    const walk = (dir: string): number =>
      readdirSync(dir, { withFileTypes: true }).reduce(
        (count, entry) =>
          entry.isDirectory() ? count + walk(join(dir, entry.name)) : count + 1,
        0,
      );
    return walk(root);
  }

  test("selector + three reads + policy p95 is at most 50 ms (median of 3 runs)", () => {
    const root = workspace();
    for (let i = 0; i < 100; i++) resolveMirrorConfig(root, INTENT);
    const runP95: number[] = [];
    for (let run = 0; run < 3; run++) {
      const samples: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        const outcome = resolveMirrorConfig(root, INTENT);
        if (outcome.kind === "resolved") {
          decideMirrorAction({
            kind: "lifecycle",
            mode: outcome.config.autoMirror,
            event,
            state: fixtureState,
          });
        }
        samples.push(performance.now() - start);
      }
      runP95.push(nearestRankP95(samples));
    }
    const result = median(runP95);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(50);
  });

  test("resolution performs zero writes to the workspace", () => {
    const root = workspace();
    const before = fileCount(root);
    for (let i = 0; i < 100; i++) resolveMirrorConfig(root, INTENT);
    expect(fileCount(root)).toBe(before);
  });
});
