import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  chmodSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import { loadRunModelCheckSource } from "../../plugins/formal-model-check/tools/run-model-check-source.ts";
import {
  generateFrozenTlaModel,
  tlaInvariantSourceMap,
  validateFrozenTlaModelReceipt,
} from "../../plugins/formal-model-check/tools/tla-arm.ts";
import { loadVerifiedTlaSources } from "../../plugins/formal-model-check/tools/tla-model-loader.ts";
import {
  createVerifiedTlaModelReceipt,
  validateModelCheckReceipt,
  validateVerifiedTlaModelReceipt,
} from "../../plugins/formal-model-check/tools/tla-model-receipt.ts";

describe("run-model-check source adapter", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function copyCanonicalSource(): { root: string; model: string; cfg: string } {
    const root = mkdtempSync(join(tmpdir(), "run-model-check-source-"));
    roots.push(root);
    const model = join(root, "FormalElection.tla");
    const cfg = join(root, "FormalElection.cfg");
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.tla", model);
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.cfg", cfg);
    return { root, model, cfg };
  }

  test("loads variable canonical paths through the U1 source identity", () => {
    const paths = copyCanonicalSource();
    const result = loadRunModelCheckSource(paths.model, paths.cfg);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workspaceRoot).toBe(realpathSync(paths.root));
    expect(result.value.moduleName).toBe("FormalElection");
    expect(result.value.modelReceipt.moduleBytesIdentity).toBe(result.value.source.moduleIdentity);
    expect(result.value.modelReceipt.cfgBytesIdentity).toBe(result.value.source.cfgIdentity);
    expect("schema" in result.value.modelReceipt).toBe(false);
    expect(validateFrozenTlaModelReceipt(result.value.modelReceipt).ok).toBe(true);
    expect(createVerifiedTlaModelReceipt(result.value.source).ok).toBe(false);
    expect(validateModelCheckReceipt(null).ok).toBe(false);
    // The trace vocabulary rides the verified source: map-declared values,
    // moduleName from the model name (never a map-side duplicate).
    expect(result.value.vocabulary).toEqual({
      moduleName: "FormalElection",
      namedInvariants: [
        "ChoiceWinner",
        "UnknownChoiceRejected",
        "ReceivedAtAxis",
        "InvalidTimestampRejected",
        "AmendSubmission",
        "UnknownRefRejected",
        "PerVoterResolution",
      ],
      traceStateVariables: [
        "initialBudget",
        "amendBudget",
        "accepted",
        "holdMarkers",
        "holdBudget",
        "tally",
        "reexamRequired",
      ],
    });
  });

  test("rejects a request for a model with no verified source binding", () => {
    // A fabricated module name is an explicit MODEL_LOAD failure — the
    // byte-pin binds by requested model name, never by position.
    const paths = copyCanonicalSource();
    const unknown = join(paths.root, "NoSuch.tla");
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.tla", unknown);
    expect(loadRunModelCheckSource(unknown, paths.cfg)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
  });

  test("preserves canonical loader failures at the source adapter boundary", () => {
    const moduleFailure = loadRunModelCheckSource("unused.tla", "unused.cfg", {
      readBytes: () => new Uint8Array(),
      loadVerifiedSources: () => ({
        ok: false,
        error: {
          kind: "MODULE_DEPS",
          code: "MODULE_DEP_UNRESOLVED",
          relativePath: "amadeus/spaces/default/specs/tla/Missing.tla",
          detail: "injected dependency failure",
        },
      }),
    });
    expect(moduleFailure).toEqual({
      ok: false,
      error: {
        kind: "SOURCE_DRIFT",
        code: "SOURCE_DRIFT",
        relativePath: "amadeus/spaces/default/specs/tla/Missing.tla",
        detail: expect.stringContaining("MODULE_DEP_UNRESOLVED"),
      },
    });

    const modelFailure = {
      kind: "MODEL_LOAD" as const,
      code: "MODEL_MAP_INVALID" as const,
      relativePath: "amadeus/spaces/default/specs/tla/model-map.json",
      detail: "injected model-map failure",
    };
    expect(loadRunModelCheckSource("unused.tla", "unused.cfg", {
      readBytes: () => new Uint8Array(),
      loadVerifiedSources: () => ({ ok: false, error: modelFailure }),
    })).toEqual({ ok: false, error: modelFailure });
  });

  test("returns source drift when the selected frozen source cannot produce a receipt", () => {
    const paths = copyCanonicalSource();
    const loaded = loadVerifiedTlaSources();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const sourcesWithoutVocabulary = {
      ...loaded.value,
      models: loaded.value.models.map((source) => source.model.name === "FormalElection"
        ? { ...source, model: { ...source.model, vocabulary: undefined } }
        : source),
    };

    expect(loadRunModelCheckSource(paths.model, paths.cfg, {
      readBytes: (path) => new Uint8Array(readFileSync(path)),
      loadVerifiedSources: () => ({ ok: true, value: sourcesWithoutVocabulary }),
    })).toMatchObject({
      ok: false,
      error: {
        kind: "SOURCE_DRIFT",
        code: "SOURCE_DRIFT",
        detail: expect.stringContaining("does not declare a vocabulary"),
      },
    });
  });

  test("returns source drift when a verified receipt names a missing invariant", () => {
    const root = mkdtempSync(join(tmpdir(), "run-model-check-source-mirror-invalid-"));
    roots.push(root);
    const model = join(root, "MirrorLifecycle.tla");
    const cfg = join(root, "MirrorLifecycle.cfg");
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycle.tla", model);
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycle.cfg", cfg);
    const loaded = loadVerifiedTlaSources();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const sourcesWithMissingInvariant = {
      ...loaded.value,
      models: loaded.value.models.map((source) => source.model.name === "MirrorLifecycle"
        ? {
          ...source,
          model: {
            ...source.model,
            vocabulary: {
              ...source.model.vocabulary,
              namedInvariants: [...(source.model.vocabulary?.namedInvariants ?? []), "MissingInvariant"],
              traceStateVariables: source.model.vocabulary?.traceStateVariables ?? [],
            },
          },
        }
        : source),
    };

    expect(loadRunModelCheckSource(model, cfg, {
      readBytes: (path) => new Uint8Array(readFileSync(path)),
      loadVerifiedSources: () => ({ ok: true, value: sourcesWithMissingInvariant }),
    })).toMatchObject({
      ok: false,
      error: {
        kind: "SOURCE_DRIFT",
        code: "SOURCE_DRIFT",
        detail: expect.stringContaining("missing invariant formula MissingInvariant"),
      },
    });
  });

  test("locates invariant declarations with spaces or tabs by one shared rule", () => {
    expect(tlaInvariantSourceMap(
      "---- MODULE Example ----\nFirst   == TRUE\nSecond\t== TRUE\n====\n",
      ["First", "Second"],
    )).toEqual({
      ok: true,
      value: {
        First: { line: 2, column: 1 },
        Second: { line: 3, column: 1 },
      },
    });

    const loaded = loadVerifiedTlaSources();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const source = loaded.value.models.find(({ model }) => model.name === "FormalElection");
    expect(source).toBeDefined();
    if (source === undefined) return;
    const spacedSource = {
      ...source,
      moduleSource: source.moduleSource.replace("ChoiceWinner ==", "ChoiceWinner\t=="),
    };
    // The line follows the module: the resolution axis revision (ruling Q2=A,
    // 2026-08-05 — Issue #1946, FR-2f) shifted the invariant block by one. What
    // this case pins is the shared locate rule across space and tab, not the
    // number itself.
    expect(generateFrozenTlaModel(
      { publicContractIdentity: "a".repeat(64) },
      spacedSource,
    ).invariantSourceMap.ChoiceWinner).toEqual({ line: 270, column: 1 });
  });

  test("loads the registered MirrorLifecycle source with its map-supplied vocabulary", () => {
    const mirror = mkdtempSync(join(tmpdir(), "run-model-check-source-mirror-"));
    roots.push(mirror);
    const mirrorModel = join(mirror, "MirrorLifecycle.tla");
    const mirrorCfg = join(mirror, "MirrorLifecycle.cfg");
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycle.tla", mirrorModel);
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycle.cfg", mirrorCfg);
    const result = loadRunModelCheckSource(mirrorModel, mirrorCfg);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source.model.name).toBe("MirrorLifecycle");
    expect(result.value.vocabulary).toEqual({
      moduleName: "MirrorLifecycle",
      namedInvariants: ["TypeOK", "NoCloseWithoutLandedSync", "NoDuplicateCreate"],
      traceStateVariables: ["receipts", "issueNumber", "boundaryIdx"],
    });
    expect(result.value.modelReceipt.moduleBytesIdentity).toBe(result.value.source.moduleIdentity);
    expect(result.value.modelReceipt.cfgBytesIdentity).toBe(result.value.source.cfgIdentity);
    const receipt = createVerifiedTlaModelReceipt(result.value.source);
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) return;
    const reordered = Object.fromEntries(Object.entries(receipt.value).reverse());
    expect(validateModelCheckReceipt(reordered).ok).toBe(true);
    const tamperedInput = {
      ...receipt.value,
      cfgBytesIdentity: "0".repeat(64),
    };
    const { modelIdentity: _modelIdentity, ...tamperedIdentityInput } = tamperedInput;
    const tampered = {
      ...tamperedInput,
      modelIdentity: canonicalIdentity(
        tamperedIdentityInput,
        "amadeus.formal-verif.tla.verified-model.v1",
      ).sha256,
    };
    expect(validateModelCheckReceipt(tampered).ok).toBe(false);
    expect(validateVerifiedTlaModelReceipt({ ...receipt.value, unexpected: true })).toMatchObject({
      ok: false,
      error: { message: "receipt must have the exact verified-source model shape" },
    });
    expect(validateVerifiedTlaModelReceipt({ ...receipt.value, modelName: 1 })).toMatchObject({
      ok: false,
      error: { message: "receipt schema or model name is invalid" },
    });
    expect(validateVerifiedTlaModelReceipt({
      ...receipt.value,
      vocabulary: {
        ...receipt.value.vocabulary,
        namedInvariants: [1n],
      },
    })).toMatchObject({
      ok: false,
      error: { message: "receipt differs from the selected verified model" },
    });
    expect(createVerifiedTlaModelReceipt({
      ...result.value.source,
      model: { ...result.value.source.model, vocabulary: undefined },
    })).toMatchObject({
      ok: false,
      error: { message: "model MirrorLifecycle has no declared vocabulary" },
    });
    const electionPaths = copyCanonicalSource();
    const election = loadRunModelCheckSource(electionPaths.model, electionPaths.cfg);
    expect(election.ok).toBe(true);
    if (!election.ok) return;
    expect(result.value.modelReceipt).not.toEqual(election.value.modelReceipt);
  });

  test("rejects source drift and symlink inputs", () => {
    const drifted = copyCanonicalSource();
    writeFileSync(drifted.model, "---- MODULE FormalElection ----\n====\n");
    expect(loadRunModelCheckSource(drifted.model, drifted.cfg)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", code: "SOURCE_DRIFT" },
    });

    const linked = copyCanonicalSource();
    const link = join(linked.root, "Linked.tla");
    symlinkSync(linked.model, link);
    expect(loadRunModelCheckSource(link, linked.cfg)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_UNREADABLE" },
    });

    expect(loadRunModelCheckSource(`${linked.model}.txt`, linked.cfg)).toMatchObject({
      ok: false,
      error: { code: "MODEL_UNREADABLE" },
    });
    expect(loadRunModelCheckSource(join(linked.root, "missing.tla"), linked.cfg)).toMatchObject({
      ok: false,
      error: { code: "MODEL_UNREADABLE" },
    });
  });

  test("rejects a cfg outside the model workspace and cfg drift", () => {
    const left = copyCanonicalSource();
    const right = copyCanonicalSource();
    expect(loadRunModelCheckSource(left.model, right.cfg)).toMatchObject({
      ok: false,
      error: { code: "CFG_UNREADABLE" },
    });
    writeFileSync(left.cfg, "SPECIFICATION Missing\n");
    expect(loadRunModelCheckSource(left.model, left.cfg)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: left.cfg },
    });

    const unreadable = copyCanonicalSource();
    chmodSync(unreadable.model, 0o000);
    try {
      expect(loadRunModelCheckSource(unreadable.model, unreadable.cfg)).toMatchObject({
        ok: false,
        error: { code: "MODEL_UNREADABLE" },
      });
    } finally {
      chmodSync(unreadable.model, 0o600);
    }

    const raced = copyCanonicalSource();
    expect(loadRunModelCheckSource(raced.model, raced.cfg, {
      readBytes: () => {
        throw new Error("file disappeared after path verification");
      },
    })).toMatchObject({
      ok: false,
      error: {
        code: "MODEL_UNREADABLE",
        cause: expect.any(Error),
      },
    });
  });

  test("keeps no code-level vocabulary defaults in the supply path (BR-V1 grep guard)", () => {
    // Same shape as the loader adapter source check: the vocabulary has no
    // code-level duplicate after the move to model-map.json (t404 pins values;
    // this pins the ABSENCE of the removed constants).
    const arm = readFileSync("plugins/formal-model-check/tools/tla-arm.ts", "utf8");
    const toolchain = readFileSync("plugins/formal-model-check/tools/tlc-toolchain.ts", "utf8");
    expect(arm).not.toContain("TLA_NAMED_INVARIANTS");
    expect(arm).not.toContain("TlaNamedInvariant");
    expect(toolchain).not.toContain("TRACE_STATE_VARIABLES");
  });
});
