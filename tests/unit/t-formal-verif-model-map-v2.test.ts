import { describe, expect, test } from "bun:test";
import * as canonicalModule from "../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts";
import * as pluginModule from "../../plugins/formal-model-check/tools/tla-model-map.ts";

// The plugin ships a byte-identical copy of the canonical parser (ADR-2); the
// whole table runs against both so neither copy can drift into being untested.
const modules = [
  ["canonical", canonicalModule],
  ["plugin", pluginModule],
] as const;
const { diffModelMap, findModelMapModel, parseTlaModelMap } = pluginModule;

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const SHA_D = "d".repeat(64);
const encoder = new TextEncoder();
const bytes = (value: unknown) => encoder.encode(JSON.stringify(value));

const electionEntry = (
  implPath = "packages/framework/core/tools/amadeus-election.ts",
  sha256 = SHA_A,
) => ({ implPath, sha256 });

const electionModel = () => ({
  name: "FormalElection",
  model: { path: "amadeus/spaces/default/specs/tla/FormalElection.tla", identity: SHA_A },
  cfg: { path: "amadeus/spaces/default/specs/tla/FormalElection.cfg", identity: SHA_B },
  entries: [electionEntry()],
});

const mirrorModel = () => ({
  name: "MirrorLifecycle",
  model: { path: "amadeus/spaces/default/specs/tla/MirrorLifecycle.tla", identity: SHA_C },
  cfg: { path: "amadeus/spaces/default/specs/tla/MirrorLifecycle.cfg", identity: SHA_D },
  entries: [electionEntry("packages/framework/core/tools/amadeus-mirror-types.ts", SHA_C)],
});

const canonicalMap = () => ({
  schemaVersion: 2 as const,
  models: [electionModel(), mirrorModel()],
});

const SHA_E = "e".repeat(64);

const auxEntry = (path = "amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla", identity = SHA_E) => ({
  path,
  identity,
});

const auxMirrorModel = () => ({
  ...mirrorModel(),
  auxiliaries: [auxEntry()],
});

const vocabulary = () => ({
  namedInvariants: ["TypeOK"],
  traceStateVariables: ["receipts"],
});

const vocabElectionModel = () => ({ ...electionModel(), vocabulary: vocabulary() });

const auxVocabMirrorModel = () => ({ ...auxMirrorModel(), vocabulary: vocabulary() });

describe("model map v2 schema", () => {
  test("parses a multi-model canonical map", () => {
    expect(parseTlaModelMap(bytes(canonicalMap()))).toEqual({
      ok: true,
      value: canonicalMap(),
    });
  });

  test("rejects the retired v1 single-model shape outright", () => {
    const v1 = {
      schemaVersion: 1,
      model: { path: "amadeus/spaces/default/specs/tla/FormalElection.tla", identity: SHA_A },
      cfg: { path: "amadeus/spaces/default/specs/tla/FormalElection.cfg", identity: SHA_B },
      entries: [electionEntry()],
    };
    expect(parseTlaModelMap(bytes(v1))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID", relativePath: "amadeus/spaces/default/specs/tla/model-map.json" },
    });
    // A v1 body carrying schemaVersion 2 is still rejected: no field-shape fallback.
    expect(parseTlaModelMap(bytes({ ...v1, schemaVersion: 2 }))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("rejects invalid UTF-8 and malformed JSON", () => {
    for (const source of [Uint8Array.of(0xc3, 0x28), encoder.encode("{")]) {
      expect(parseTlaModelMap(source)).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID", relativePath: "amadeus/spaces/default/specs/tla/model-map.json" },
      });
    }
  });

  test("requires model and cfg identities to have exactly path and identity", () => {
    const missingIdentity = {
      ...electionModel(),
      model: { path: "amadeus/spaces/default/specs/tla/FormalElection.tla" },
    };
    const extraField = {
      ...electionModel(),
      cfg: { ...electionModel().cfg, bytes: 1 },
    };
    for (const model of [missingIdentity, extraField]) {
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("requires lowercase SHA-256 identities", () => {
    const candidates = [
      { ...electionModel(), model: { path: "amadeus/spaces/default/specs/tla/FormalElection.tla", identity: "A".repeat(64) } },
      { ...electionModel(), cfg: { path: "amadeus/spaces/default/specs/tla/FormalElection.cfg", identity: "a".repeat(63) } },
      { ...electionModel(), entries: [electionEntry(undefined, "g".repeat(64))] },
    ];
    for (const model of candidates) {
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
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
      const model = { ...electionModel(), entries: [electionEntry(implPath)] };
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("requires each entry to have exactly implPath and sha256", () => {
    const model = { ...electionModel(), entries: [{ implPath: electionEntry().implPath }] };
    expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("rejects a correctly shaped map that declares a different schema version", () => {
    // Distinct from the v1 rejection above: the field shape is right, so the
    // version check itself is what must fail closed.
    expect(parseTlaModelMap(bytes({ schemaVersion: 3, models: [electionModel()] }))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("rejects missing and extra top-level fields", () => {
    const missing = { schemaVersion: 2 };
    const extra = { ...canonicalMap(), updatedAt: "2026-08-01T00:00:00Z" };
    for (const candidate of [missing, extra]) {
      expect(parseTlaModelMap(bytes(candidate))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("rejects an empty models array", () => {
    expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [] }))).toMatchObject({
      ok: false,
      error: { code: "MODEL_MAP_INVALID" },
    });
  });

  test("requires each model to have exactly name, model, cfg, and entries", () => {
    const withoutName = { ...electionModel() } as Record<string, unknown>;
    delete withoutName.name;
    const withExtra = { ...electionModel(), note: "x" };
    for (const model of [withoutName, withExtra]) {
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("binds model and cfg paths to the declared model name", () => {
    const wrongModelPath = {
      ...electionModel(),
      model: { path: "amadeus/spaces/default/specs/tla/Other.tla", identity: SHA_A },
    };
    const wrongCfgPath = {
      ...electionModel(),
      cfg: { path: "FormalElection.cfg", identity: SHA_B },
    };
    for (const model of [wrongModelPath, wrongCfgPath]) {
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("rejects model names outside the TLA module identifier grammar", () => {
    for (const name of ["", "1Mirror", "Mirror-Lifecycle", "../escape"]) {
      const model = {
        ...electionModel(),
        name,
        model: { path: `amadeus/spaces/default/specs/tla/${name}.tla`, identity: SHA_A },
        cfg: { path: `amadeus/spaces/default/specs/tla/${name}.cfg`, identity: SHA_B },
      };
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("requires models to be unique and sorted by name", () => {
    for (const models of [
      [mirrorModel(), electionModel()],
      [electionModel(), electionModel()],
    ]) {
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("keeps the per-model entry boundary and ordering rules", () => {
    const outOfBoundary = {
      ...electionModel(),
      entries: [electionEntry("scripts/amadeus-election.ts")],
    };
    const unsorted = {
      ...electionModel(),
      entries: [
        electionEntry("packages/framework/core/tools/amadeus-election.ts"),
        electionEntry("packages/framework/core/tools/amadeus-election-model.ts"),
      ],
    };
    const empty = { ...electionModel(), entries: [] };
    for (const model of [outOfBoundary, unsorted, empty]) {
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("admits the mirror implementation family inside the canonical tools boundary", () => {
    const model = {
      ...mirrorModel(),
      entries: [
        electionEntry("packages/framework/core/tools/amadeus-mirror-coordinator.ts", SHA_A),
        electionEntry("packages/framework/core/tools/amadeus-mirror-state-reducer.ts", SHA_B),
      ],
    };
    expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
      ok: true,
    });
  });

  test("parses models carrying auxiliaries, vocabulary, or both", () => {
    for (const model of [auxMirrorModel(), vocabElectionModel(), auxVocabMirrorModel()]) {
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toEqual({
        ok: true,
        value: { schemaVersion: 2, models: [model] },
      });
    }
  });

  test("rejects auxiliaries with unknown keys or an empty array", () => {
    const elementExtra = {
      ...mirrorModel(),
      auxiliaries: [{ ...auxEntry(), bytes: 1 }],
    };
    const modelExtraKey = { ...auxMirrorModel(), notes: "x" };
    const empty = { ...mirrorModel(), auxiliaries: [] };
    for (const model of [elementExtra, modelExtraKey, empty]) {
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("rejects auxiliary paths outside the canonical spec directory boundary", () => {
    const invalidPaths = [
      "amadeus/spaces/default/specs/tla/../x.tla",
      "/amadeus/spaces/default/specs/tla/X.tla",
      "plugins/x.tla",
      "specs/tla/MirrorLifecycleCore.tla", // pre-relocation legacy layout
      "amadeus/spaces/default/specs/tla/nested/X.tla",
      "amadeus/spaces/default/specs/tla/MirrorLifecycle.cfg",
      "amadeus/spaces/default/specs/tla/1Bad.tla",
      "amadeus/spaces/default/specs/tla/MirrorLifecycle.tla", // self-auxiliary
    ];
    for (const path of invalidPaths) {
      const model = { ...mirrorModel(), auxiliaries: [auxEntry(path)] };
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("rejects non-canonical auxiliary identities and unordered or duplicate paths", () => {
    const badIdentities = [
      [{ ...auxEntry(), identity: "A".repeat(64) }],
      [{ ...auxEntry(), identity: "a".repeat(63) }],
      [{ ...auxEntry(), identity: 1 }],
    ];
    const unsorted = [
      auxEntry("amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla"),
      auxEntry("amadeus/spaces/default/specs/tla/FormalElection.tla", SHA_A),
    ];
    const duplicated = [auxEntry(), auxEntry()];
    for (const auxiliaries of [...badIdentities, unsorted, duplicated]) {
      const model = { ...mirrorModel(), auxiliaries };
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });

  test("rejects malformed vocabulary shapes and members", () => {
    const candidates = [
      { ...vocabulary(), unknown: [] },
      { namedInvariants: [], traceStateVariables: ["receipts"] },
      { namedInvariants: ["not-an-inv"], traceStateVariables: ["receipts"] },
      { namedInvariants: ["TypeOK", "TypeOK"], traceStateVariables: ["receipts"] },
      { namedInvariants: ["TypeOK"], traceStateVariables: [] },
      { namedInvariants: ["TypeOK"], traceStateVariables: ["receipts", "receipts"] },
    ];
    for (const candidate of candidates) {
      const model = { ...electionModel(), vocabulary: candidate };
      expect(parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });
});

describe("model map v2 lookup and drift", () => {
  test("resolves a registered model by name and reports an unknown name as absent", () => {
    const parsed = parseTlaModelMap(bytes(canonicalMap()));
    if (!parsed.ok) throw new Error(parsed.error.detail);
    expect(findModelMapModel(parsed.value, "MirrorLifecycle")).toEqual(mirrorModel());
    expect(findModelMapModel(parsed.value, "Missing")).toBeUndefined();
  });

  test("diffs one model's entries against the current implementation hashes", () => {
    const parsed = parseTlaModelMap(bytes(canonicalMap()));
    if (!parsed.ok) throw new Error(parsed.error.detail);
    const mirror = findModelMapModel(parsed.value, "MirrorLifecycle");
    if (!mirror) throw new Error("MirrorLifecycle must be registered");
    expect(diffModelMap(mirror, [])).toEqual([
      {
        implPath: "packages/framework/core/tools/amadeus-mirror-types.ts",
        recorded: SHA_C,
        current: null,
      },
    ]);
    expect(diffModelMap(mirror, mirror.entries)).toEqual([]);
  });
});

describe.each(modules)("model map v2 parser copy: %s", (_name, module) => {
  test("accepts the canonical map and fails closed on shape, name, version, and ordering", () => {
    expect(module.parseTlaModelMap(bytes(canonicalMap()))).toEqual({
      ok: true,
      value: canonicalMap(),
    });
    const rejected = [
      { schemaVersion: 2, models: [] },
      { schemaVersion: 3, models: [electionModel()] },
      { schemaVersion: 2, models: [{ ...electionModel(), note: "x" }] },
      { schemaVersion: 2, models: [{ ...electionModel(), name: "1Bad" }] },
      { schemaVersion: 2, models: [mirrorModel(), electionModel()] },
      { schemaVersion: 2 },
      {
        schemaVersion: 1,
        model: electionModel().model,
        cfg: electionModel().cfg,
        entries: electionModel().entries,
      },
    ];
    for (const candidate of rejected) {
      expect(module.parseTlaModelMap(bytes(candidate))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
    // Auxiliaries / vocabulary widen the accepted shape on both copies at
    // once; the table fails if either copy drifts.
    expect(
      module.parseTlaModelMap(bytes({ schemaVersion: 2, models: [auxVocabMirrorModel()] })),
    ).toEqual({ ok: true, value: { schemaVersion: 2, models: [auxVocabMirrorModel()] } });
    expect(
      module.parseTlaModelMap(
        bytes({
          schemaVersion: 2,
          models: [{ ...mirrorModel(), auxiliaries: [auxEntry("plugins/x.tla")] }],
        }),
      ),
    ).toMatchObject({ ok: false, error: { code: "MODEL_MAP_INVALID" } });
    const parsed = module.parseTlaModelMap(bytes(canonicalMap()));
    if (!parsed.ok) throw new Error(parsed.error.detail);
    const mirror = module.findModelMapModel(parsed.value, "MirrorLifecycle");
    if (!mirror) throw new Error("MirrorLifecycle must be registered");
    expect(module.diffModelMap(mirror, mirror.entries)).toEqual([]);
    expect(module.findModelMapModel(parsed.value, "Missing")).toBeUndefined();
  });

  test("rejects every auxiliary and vocabulary validation class", () => {
    const invalidModels = [
      { ...mirrorModel(), auxiliaries: [] },
      { ...mirrorModel(), auxiliaries: [{ ...auxEntry(), extra: true }] },
      { ...mirrorModel(), auxiliaries: [{ ...auxEntry(), identity: "A".repeat(64) }] },
      { ...mirrorModel(), auxiliaries: [auxEntry(), auxEntry()] },
      { ...electionModel(), vocabulary: { ...vocabulary(), extra: [] } },
      { ...electionModel(), vocabulary: { ...vocabulary(), namedInvariants: [] } },
      { ...electionModel(), vocabulary: { ...vocabulary(), namedInvariants: ["not-valid"] } },
      { ...electionModel(), vocabulary: { ...vocabulary(), namedInvariants: ["TypeOK", "TypeOK"] } },
    ];
    for (const model of invalidModels) {
      expect(module.parseTlaModelMap(bytes({ schemaVersion: 2, models: [model] }))).toMatchObject({
        ok: false,
        error: { code: "MODEL_MAP_INVALID" },
      });
    }
  });
});
