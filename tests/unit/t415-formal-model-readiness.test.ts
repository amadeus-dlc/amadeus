// covers: file:packages/framework/core/tools/amadeus-formal-verif-model-map.ts
// size: small

import { describe, expect, test } from "bun:test";
import { evaluateTlaModelReadiness } from "../../packages/framework/core/tools/amadeus-formal-verif-model-map.ts";
import { activationModelMap } from "../harness/formal-model-fixture.ts";

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe("t415 shared formal-model readiness seam", () => {
  test("a strict declaration with both assets is ready", () => {
    const present = new Set([
      "specs/tla/FormalElection.tla",
      "specs/tla/FormalElection.cfg",
    ]);
    const result = evaluateTlaModelReadiness(bytes(activationModelMap()), (path) => present.has(path));
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.models.map((model) => model.name)).toEqual(["FormalElection"]);
  });

  test("zero declarations and malformed maps share the strict parser failure", () => {
    const empty = evaluateTlaModelReadiness(
      bytes(JSON.stringify({ schemaVersion: 2, models: [] })),
      () => true,
    );
    expect(empty).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID", detail: "models must be a non-empty array" },
    });
    const malformed = evaluateTlaModelReadiness(bytes("{not-json"), () => true);
    expect(malformed).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
  });

  test("missing model and cfg use the explicit-loader error vocabulary", () => {
    const missingModel = evaluateTlaModelReadiness(bytes(activationModelMap()), () => false);
    expect(missingModel).toMatchObject({
      ok: false,
      error: { code: "MODEL_MISSING", relativePath: "specs/tla/FormalElection.tla" },
    });
    const missingCfg = evaluateTlaModelReadiness(
      bytes(activationModelMap()),
      (path) => path.endsWith(".tla"),
    );
    expect(missingCfg).toMatchObject({
      ok: false,
      error: { code: "CFG_MISSING", relativePath: "specs/tla/FormalElection.cfg" },
    });
  });
});
