import { describe, expect, test } from "bun:test";
import {
  TlaModelHarnessError,
  toTlaModelHarnessError,
} from "../../scripts/formal-verif/tla-arm.ts";
import type { ModelLoadErrorCode } from "../../scripts/formal-verif/tla-model-loader.ts";
import * as productionLoader from "../../scripts/formal-verif/tla-model-loader.ts";
import {
  diffModelMap,
  parseTlaModelMap,
} from "../../scripts/formal-verif/tla-model-map.ts";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const encoder = new TextEncoder();
const bytes = (value: unknown) => encoder.encode(JSON.stringify(value));
const entry = (implPath = "packages/framework/core/tools/amadeus-election.ts", sha256 = SHA_A) => ({
  implPath,
  sha256,
});
const canonicalMap = () => ({
  schemaVersion: 1 as const,
  model: { path: "specs/tla/FormalElection.tla", identity: SHA_A },
  cfg: { path: "specs/tla/FormalElection.cfg", identity: SHA_B },
  entries: [entry()],
});

describe("TLA model map parser", () => {
  test("parses the exact canonical schema", () => {
    expect(parseTlaModelMap(bytes(canonicalMap()))).toEqual({ ok: true, value: canonicalMap() });
  });

  test("rejects invalid UTF-8 and malformed JSON", () => {
    for (const source of [Uint8Array.of(0xc3, 0x28), encoder.encode("{")]) {
      expect(parseTlaModelMap(source)).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID", relativePath: "specs/tla/model-map.json" },
      });
    }
  });

  test("rejects missing and extra top-level fields", () => {
    const missing = canonicalMap() as Record<string, unknown>;
    delete missing.cfg;
    const extra = { ...canonicalMap(), updatedAt: "2026-07-24T00:00:00Z" };
    for (const candidate of [missing, extra]) {
      expect(parseTlaModelMap(bytes(candidate))).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
    }
  });

  test("rejects an unsupported schema version", () => {
    expect(parseTlaModelMap(bytes({ ...canonicalMap(), schemaVersion: 2 }))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("requires fixed model and cfg paths", () => {
    const wrongModel = { ...canonicalMap(), model: { path: "specs/tla/Other.tla", identity: SHA_A } };
    const wrongCfg = { ...canonicalMap(), cfg: { path: "FormalElection.cfg", identity: SHA_B } };
    for (const candidate of [wrongModel, wrongCfg]) {
      expect(parseTlaModelMap(bytes(candidate))).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
    }
  });

  test("requires model and cfg identities to have exactly path and identity", () => {
    const missingIdentity = { ...canonicalMap(), model: { path: "specs/tla/FormalElection.tla" } };
    const extraField = { ...canonicalMap(), cfg: { ...canonicalMap().cfg, bytes: 1 } };
    for (const candidate of [missingIdentity, extraField]) {
      expect(parseTlaModelMap(bytes(candidate))).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
    }
  });

  test("requires lowercase SHA-256 identities", () => {
    const candidates = [
      { ...canonicalMap(), model: { path: "specs/tla/FormalElection.tla", identity: "A".repeat(64) } },
      { ...canonicalMap(), cfg: { path: "specs/tla/FormalElection.cfg", identity: "a".repeat(63) } },
      { ...canonicalMap(), entries: [entry(undefined, "g".repeat(64))] },
    ];
    for (const candidate of candidates) {
      expect(parseTlaModelMap(bytes(candidate))).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
    }
  });

  test("rejects absolute, traversal, non-canonical, and wrong-boundary implementation paths", () => {
    const invalidPaths = [
      "/packages/framework/core/tools/amadeus-election.ts",
      "packages/framework/core/tools/../tools/amadeus-election.ts",
      "packages\\framework\\core\\tools\\amadeus-election.ts",
      "scripts/amadeus-election.ts",
      "packages/framework/core/tools/unrelated.ts",
    ];
    for (const implPath of invalidPaths) {
      expect(parseTlaModelMap(bytes({ ...canonicalMap(), entries: [entry(implPath)] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("rejects empty entries", () => {
    expect(parseTlaModelMap(bytes({ ...canonicalMap(), entries: [] }))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("requires each entry to have exactly implPath and sha256", () => {
    expect(parseTlaModelMap(bytes({ ...canonicalMap(), entries: [{ implPath: entry().implPath }] }))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("requires entries to be unique and sorted by implPath", () => {
    const modelEntry = entry("packages/framework/core/tools/amadeus-election-model.ts");
    const rootEntry = entry("packages/framework/core/tools/amadeus-election.ts");
    for (const entries of [[rootEntry, modelEntry], [modelEntry, modelEntry]]) {
      expect(parseTlaModelMap(bytes({ ...canonicalMap(), entries }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("reports missing and changed implementation identities without mutating the map", () => {
    const parsed = parseTlaModelMap(bytes(canonicalMap()));
    if (!parsed.ok) throw new Error(parsed.error.detail);
    expect(diffModelMap(parsed.value, [])).toEqual([
      {
        implPath: "packages/framework/core/tools/amadeus-election.ts",
        recorded: SHA_A,
        current: null,
      },
    ]);
    expect(diffModelMap(parsed.value, [entry(undefined, SHA_B)])).toEqual([
      {
        implPath: "packages/framework/core/tools/amadeus-election.ts",
        recorded: SHA_A,
        current: SHA_B,
      },
    ]);
    expect(diffModelMap(parsed.value, [entry()])).toEqual([]);
  });
});

describe("TLA model adapter error mapping", () => {
  test("exports one no-argument production loader and no injectable runtime seam", () => {
    expect(Object.keys(productionLoader)).toEqual(["loadVerifiedTlaSource"]);
    expect(productionLoader.loadVerifiedTlaSource.length).toBe(0);
  });

  test("maps every loader code to a loud HARNESS_ERROR with exit 2", () => {
    const codes: readonly ModelLoadErrorCode[] = [
      "MODEL_MISSING",
      "CFG_MISSING",
      "MODEL_EMPTY",
      "CFG_EMPTY",
      "MODEL_UNREADABLE",
      "CFG_UNREADABLE",
      "MODEL_MAP_MISSING",
      "MODEL_MAP_EMPTY",
      "MODEL_MAP_UNREADABLE",
      "MODEL_MAP_INVALID",
    ];
    for (const code of codes) {
      const mapped = toTlaModelHarnessError({
        kind: "MODEL_LOAD",
        code,
        relativePath: "specs/tla/model-map.json",
        detail: "test failure",
      });
      expect(mapped).toBeInstanceOf(TlaModelHarnessError);
      expect(mapped).toMatchObject({ verdict: "HARNESS_ERROR", exitCode: 2, pipelineError: { code } });
    }
  });

  test("maps SOURCE_DRIFT without exposing a Result to the generator", () => {
    const mapped = toTlaModelHarnessError({
      kind: "SOURCE_DRIFT",
      code: "SOURCE_DRIFT",
      relativePath: "specs/tla/FormalElection.tla",
      detail: "identity differs",
    });
    expect(mapped).toMatchObject({
      verdict: "HARNESS_ERROR",
      exitCode: 2,
      pipelineError: { kind: "SOURCE_DRIFT", code: "SOURCE_DRIFT" },
    });
  });

  test("fails loudly if a future pipeline error bypasses the exhaustive mapping", () => {
    expect(() => toTlaModelHarnessError({
      kind: "MODEL_LOAD",
      code: "FUTURE_CODE",
      relativePath: "specs/tla/model-map.json",
      detail: "unmapped",
    } as never)).toThrow("unhandled TLA model pipeline error");
  });
});
