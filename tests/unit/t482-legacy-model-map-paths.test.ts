// covers: file:packages/framework/core/tools/amadeus-formal-verif-model-map.ts
// size: small
//
// 260807-tla-specs-relocation — BR-13c: a model map whose path values still
// name the pre-relocation `specs/tla/...` layout is rejected fail-closed by
// the strict validator, on both byte-identical parser copies (ADR-2).

import { describe, expect, test } from "bun:test";
import * as canonicalModule from "../../packages/framework/core/tools/amadeus-formal-verif-model-map.ts";
import * as pluginModule from "../../plugins/formal-model-check/tools/tla-model-map.ts";

const modules = [
  ["canonical", canonicalModule],
  ["plugin", pluginModule],
] as const;

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const encoder = new TextEncoder();
const bytes = (value: unknown) => encoder.encode(JSON.stringify(value));

const SPEC_DIR = "amadeus/spaces/default/specs/tla";

const electionModel = () => ({
  name: "FormalElection",
  model: { path: `${SPEC_DIR}/FormalElection.tla`, identity: SHA_A },
  cfg: { path: `${SPEC_DIR}/FormalElection.cfg`, identity: SHA_B },
  entries: [{
    implPath: "packages/framework/core/tools/amadeus-election.ts",
    sha256: SHA_C,
  }],
});

describe.each(modules)("t482 legacy model-map path rejection (BR-13c), copy: %s", (_name, module) => {
  test("rejects a legacy model.path value and names the canonical form", () => {
    const legacy = {
      ...electionModel(),
      model: { path: "specs/tla/FormalElection.tla", identity: SHA_A },
    };
    const result = module.parseTlaModelMap(bytes({ schemaVersion: 2, models: [legacy] }));
    expect(result).toMatchObject({
      ok: false,
      error: {
        kind: "MODEL_LOAD",
        code: "MODEL_MAP_INVALID",
        relativePath: "amadeus/spaces/default/specs/tla/model-map.json",
      },
    });
    if (result.ok) return;
    expect(result.error.detail).toContain(
      "models[0].model.path must be the canonical amadeus/spaces/<space>/specs/tla/FormalElection.tla",
    );
  });

  test("rejects a legacy cfg.path value", () => {
    const legacy = {
      ...electionModel(),
      cfg: { path: "specs/tla/FormalElection.cfg", identity: SHA_B },
    };
    expect(module.parseTlaModelMap(bytes({ schemaVersion: 2, models: [legacy] }))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("rejects a legacy auxiliary path value", () => {
    const legacy = {
      ...electionModel(),
      auxiliaries: [{ path: "specs/tla/FormalElectionCore.tla", identity: SHA_C }],
    };
    const result = module.parseTlaModelMap(bytes({ schemaVersion: 2, models: [legacy] }));
    expect(result).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
    if (result.ok) return;
    expect(result.error.detail).toContain("auxiliaries[0].path must be a canonical");
  });

  test("accepts a non-default space's canonical paths (positive control)", () => {
    const model = electionModel();
    model.model = { path: "amadeus/spaces/feature-x/specs/tla/FormalElection.tla", identity: SHA_A };
    model.cfg = { path: "amadeus/spaces/feature-x/specs/tla/FormalElection.cfg", identity: SHA_B };
    expect(module.parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
      ok: true,
    });
  });
});
