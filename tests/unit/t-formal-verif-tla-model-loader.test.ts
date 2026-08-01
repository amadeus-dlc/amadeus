import { describe, expect, test } from "bun:test";
import {
  TlaModelHarnessError,
  toTlaModelHarnessError,
} from "../../plugins/formal-model-check/tools/tla-arm.ts";
import type { ModelLoadErrorCode } from "../../plugins/formal-model-check/tools/tla-model-loader.ts";
import * as productionLoader from "../../plugins/formal-model-check/tools/tla-model-loader.ts";

describe("TLA model adapter error mapping", () => {
  test("exports only no-argument production loaders and no injectable runtime seam", () => {
    // Shim period (BR-S4): the singular shim and the plural loader coexist,
    // both arity 0. u3 removes the shim and re-pins this list to
    // ["loadVerifiedTlaSources"].
    expect(Object.keys(productionLoader)).toEqual(["loadVerifiedTlaSource", "loadVerifiedTlaSources"]);
    expect(productionLoader.loadVerifiedTlaSource.length).toBe(0);
    expect(productionLoader.loadVerifiedTlaSources.length).toBe(0);
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
