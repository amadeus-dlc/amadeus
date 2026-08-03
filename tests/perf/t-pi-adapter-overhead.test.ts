// covers: file:packages/framework/harness/pi/extensions/amadeus-pi-extension.ts, file:packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts
// size: large

import { describe, expect, test } from "bun:test";
import { performance } from "node:perf_hooks";
import { normalizePayload } from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";
import { parsePi083Event } from "../../packages/framework/harness/pi/extensions/amadeus-pi-extension.ts";

const WARM_UP_RUNS = 10;
const MEASURED_RUNS = 100;

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const upper = ordered[middle] ?? 0;
  const lower = ordered[Math.max(0, middle - 1)] ?? upper;
  return ordered.length % 2 === 0 ? (lower + upper) / 2 : upper;
}

function elapsed(operation: () => unknown): number {
  const started = performance.now();
  expect(operation()).not.toBeNull();
  return performance.now() - started;
}

describe("Pi adapter overhead against the fixed Kimi baseline", () => {
  test("uses 10 warm-ups and 100 alternating pure input-normalization samples", () => {
    const piFixture = { type: "input", text: "approve", source: "interactive" } as const;
    const kimiFixture = {
      hook_event_name: "UserPromptSubmit",
      prompt: "approve",
      session_id: "benchmark-session",
    };

    for (let index = 0; index < WARM_UP_RUNS; index += 1) {
      expect(normalizePayload("mint", kimiFixture)).not.toBeNull();
      expect(parsePi083Event("input", piFixture)).not.toBeNull();
    }

    const kimiMs: number[] = [];
    const piMs: number[] = [];
    for (let index = 0; index < MEASURED_RUNS; index += 1) {
      kimiMs.push(elapsed(() => normalizePayload("mint", kimiFixture)));
      piMs.push(elapsed(() => parsePi083Event("input", piFixture)));
    }

    const kimiMedianMs = median(kimiMs);
    const piMedianMs = median(piMs);
    const limitMs = Math.max(kimiMedianMs * 2, kimiMedianMs + 100);
    expect(piMedianMs).toBeLessThanOrEqual(limitMs);
    console.log(JSON.stringify({
      warmUpRuns: WARM_UP_RUNS,
      measuredRuns: MEASURED_RUNS,
      kimiMedianMs,
      piMedianMs,
      limitMs,
    }));
  });
});
