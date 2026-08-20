// The canonical identity function and the per-field rejection branches of the
// core model-map parser. The plugin copies of both are covered by
// t-formal-verif-canonical and t-formal-verif-model-map-v2; this file drives the
// canonical module under packages/framework/core so neither copy is untested.

import { describe, expect, test } from "bun:test";
import {
  canonicalIdentity,
  parseTlaModelMap,
} from "../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const bytes = (value: unknown) => encoder.encode(JSON.stringify(value));

const entry = (
  implPath = "packages/framework/core/tools/amadeus-election.ts",
  sha256 = SHA_A,
) => ({ implPath, sha256 });

const model = () => ({
  name: "FormalElection",
  model: { path: "amadeus/spaces/default/specs/tla/FormalElection.tla", identity: SHA_A },
  cfg: { path: "amadeus/spaces/default/specs/tla/FormalElection.cfg", identity: SHA_B },
  entries: [entry()],
});

const wrap = (overrides: Record<string, unknown>) => ({
  schemaVersion: 2,
  models: [{ ...model(), ...overrides }],
});

describe("canonical identity (core copy)", () => {
  test("sorts object keys at every depth and preserves array order", () => {
    expect(decoder.decode(canonicalIdentity({ z: { b: 2, a: 1 }, y: [3, 1] }).bytes)).toBe(
      '{"y":[3,1],"z":{"a":1,"b":2}}',
    );
    expect(canonicalIdentity([1, 2]).sha256).not.toBe(canonicalIdentity([2, 1]).sha256);
  });

  test("passes primitives through and emits a lowercase 64-hex digest", () => {
    expect(decoder.decode(canonicalIdentity({ s: "x", b: true, n: null, i: 7 }).bytes)).toBe(
      '{"b":true,"i":7,"n":null,"s":"x"}',
    );
    expect(canonicalIdentity({ x: 1 }).sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test("separates identities by domain", () => {
    expect(canonicalIdentity({}, "a").sha256).not.toBe(canonicalIdentity({}, "b").sha256);
  });

  test.each([Number.NaN, Infinity, -Infinity, undefined, Symbol("x"), () => 1])(
    "rejects the non-canonical value %p",
    (value) => expect(() => canonicalIdentity(value)).toThrow(TypeError),
  );

  test("serializes and hashes exactly once and accounts the encoded bytes", () => {
    const counters = { serializations: 0, hashes: 0, encodedBytes: 0 };
    const identity = canonicalIdentity({ x: 1 }, "test", counters);
    expect(counters).toEqual({
      serializations: 1,
      hashes: 1,
      encodedBytes: identity.bytes.byteLength,
    });
  });
});

describe("core model-map parser rejection branches", () => {
  test("rejects a model or cfg identity that is not exactly path and identity", () => {
    expect(parseTlaModelMap(bytes(wrap({ model: { path: "amadeus/spaces/default/specs/tla/FormalElection.tla" } }))))
      .toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  test("rejects an identity that is not a lowercase SHA-256 value", () => {
    expect(
      parseTlaModelMap(bytes(wrap({
        cfg: { path: "amadeus/spaces/default/specs/tla/FormalElection.cfg", identity: "A".repeat(64) },
      }))),
    ).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  test("rejects an empty entries array", () => {
    expect(parseTlaModelMap(bytes(wrap({ entries: [] })))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("rejects an entry that is not exactly implPath and sha256", () => {
    expect(parseTlaModelMap(bytes(wrap({ entries: [{ implPath: entry().implPath }] }))))
      .toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  test("rejects an implPath outside the canonical implementation boundary", () => {
    expect(parseTlaModelMap(bytes(wrap({ entries: [entry("scripts/amadeus-election.ts")] }))))
      .toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  // #2929 FR-BND-1: the boundary is the general plugin tool shape
  // `plugins/<kebab>/tools/<kebab>.ts`, not one hardcoded plugin directory.
  test.each([
    "plugins/github-pr-convergence/tools/pr-convergence-cli.ts",
    "plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts",
    "plugins/formal-model-check/tools/tla-model-loader-internal.ts",
  ])("accepts the governed plugin implementation path %p", (implPath) => {
    expect(parseTlaModelMap(bytes(wrap({ entries: [entry(implPath)] })))).toMatchObject({ ok: true });
  });

  // The boundary stays narrow in every other direction: a non-`tools`
  // directory, a non-kebab plugin or file segment, and a nested tools path all
  // stay outside it.
  test.each([
    "plugins/github-pr-convergence/lib/pr-convergence-cli.ts",
    "plugins/GitHubPrConvergence/tools/pr-convergence-cli.ts",
    "plugins/github-pr-convergence/tools/prConvergenceCli.ts",
    "plugins/github--pr-convergence/tools/pr-convergence-cli.ts",
    "plugins/github-pr-convergence/tools/nested/pr-convergence-cli.ts",
    "plugins/github-pr-convergence/tools/pr-convergence-cli.js",
  ])("rejects the near-miss plugin implementation path %p", (implPath) => {
    expect(parseTlaModelMap(bytes(wrap({ entries: [entry(implPath)] }))))
      .toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  test("still rejects a core tools path whose basename breaks the amadeus- prefix", () => {
    expect(parseTlaModelMap(bytes(wrap({ entries: [entry("packages/framework/core/tools/election.ts")] }))))
      .toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  test("rejects an entry sha256 that is not a lowercase SHA-256 value", () => {
    expect(parseTlaModelMap(bytes(wrap({ entries: [entry(undefined, "g".repeat(64))] }))))
      .toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  test("rejects entries that are unsorted or duplicated by implPath", () => {
    expect(
      parseTlaModelMap(bytes(wrap({
        entries: [
          entry("packages/framework/core/tools/amadeus-election.ts"),
          entry("packages/framework/core/tools/amadeus-bolt.ts", SHA_B),
        ],
      }))),
    ).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  test("rejects bytes that are not valid UTF-8 JSON", () => {
    for (const source of [Uint8Array.of(0xc3, 0x28), encoder.encode("{")]) {
      expect(parseTlaModelMap(source)).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID", relativePath: "amadeus/spaces/default/specs/tla/model-map.json" },
      });
    }
  });

  test("accepts the canonical shape", () => {
    expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model()] }))).toMatchObject({
      ok: true,
    });
  });
});
