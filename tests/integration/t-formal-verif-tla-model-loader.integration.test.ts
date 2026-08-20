import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
} from "../../plugins/formal-model-check/tools/tla-arm.ts";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import {
  loadVerifiedTlaSources,
} from "../../plugins/formal-model-check/tools/tla-model-loader.ts";
import {
  loadVerifiedTlaSourcesInternal,
  selectVerifiedModel,
} from "../../plugins/formal-model-check/tools/tla-model-loader-internal.ts";
import type { TlaFileSystem } from "../../plugins/formal-model-check/tools/tla-model-loader-internal.ts";
import type {
  ModelMap,
  ModelMapAssetIdentity,
  ModelMapModel,
} from "../../plugins/formal-model-check/tools/tla-model-map.ts";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// Multi-question execution-model identities are pinned at the real-filesystem
// boundary so source migration cannot silently fall back to embedded bytes.
const EXPECTED_MODULE_IDENTITY = "3ed4cf989d43982ac488d236cd138bca022078c7c3b1de7b47ba4faaf3406868";
const EXPECTED_CFG_IDENTITY = "ffb0617cb9599d707b549d34e0f6ddfac7c66aedbfa1cea03f6aed717c93aed5";
const temporaryRoots: string[] = [];

interface Fixture {
  readonly root: string;
  readonly moduleUrl: string;
  readonly modelPath: string;
  readonly cfgPath: string;
  readonly mapPath: string;
  readonly modelMap: ModelMap;
}

function executionEntries(modelMap: ModelMap) {
  const execution = modelMap.models.find((model) => model.name === "FormalElection");
  if (!execution) throw new Error("FormalElection must be registered");
  return execution.entries;
}

function registeredPaths(modelMap: ModelMap): readonly string[] {
  return modelMap.models.flatMap((model) => [
    model.model.path,
    model.cfg.path,
    ...model.entries.map((entry) => entry.implPath),
    ...(model.auxiliaries ?? []).map((aux) => aux.path),
  ]);
}

type MutableModel = { -readonly [K in keyof ModelMapModel]: ModelMapModel[K] };

// BR-D6: the real map carries no MirrorLifecycle auxiliaries declaration until
// u4 lands it, so the green-path fixture declares MirrorLifecycleCore with its
// measured canonical identity (same domain-tagged algorithm the loader uses).
function withMirrorAuxDeclaration(modelMap: ModelMap): ModelMap {
  const mutable = JSON.parse(JSON.stringify(modelMap)) as { schemaVersion: number; models: MutableModel[] };
  const mirror = mutable.models.find((model) => model.name === "MirrorLifecycle");
  if (!mirror) throw new Error("MirrorLifecycle must be registered");
  const coreSource = readFileSync(join(REPOSITORY_ROOT, "amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla"), "utf8");
  const auxiliaries: ModelMapAssetIdentity[] = [{
    path: "amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla",
    identity: canonicalIdentity(coreSource, "amadeus.formal-verif.tla.module.v1").sha256,
  }];
  mirror.auxiliaries = auxiliaries;
  return mutable as ModelMap;
}

function createFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-tla-loader-"));
  temporaryRoots.push(root);
  const modelPath = join(root, "amadeus/spaces/default/specs/tla/FormalElection.tla");
  const cfgPath = join(root, "amadeus/spaces/default/specs/tla/FormalElection.cfg");
  const mapPath = join(root, "amadeus/spaces/default/specs/tla/model-map.json");
  mkdirSync(join(root, "scripts/formal-verif"), { recursive: true });
  mkdirSync(join(root, "amadeus/spaces/default/specs/tla"), { recursive: true });
  mkdirSync(join(root, "packages/framework/core/tools"), { recursive: true });
  writeFileSync(join(root, ".git"), "gitdir: fixture\n");
  writeFileSync(join(root, "package.json"), "{}\n");
  const realMap = JSON.parse(
    readFileSync(join(REPOSITORY_ROOT, "amadeus/spaces/default/specs/tla/model-map.json"), "utf8"),
  ) as ModelMap;
  const modelMap = withMirrorAuxDeclaration(realMap);
  writeFileSync(mapPath, `${JSON.stringify(modelMap, null, 2)}\n`);
  for (const relativePath of registeredPaths(modelMap)) {
    const destination = join(root, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(REPOSITORY_ROOT, relativePath), destination);
  }
  return {
    root,
    moduleUrl: pathToFileURL(join(root, "scripts/formal-verif/probe.ts")).href,
    modelPath,
    cfgPath,
    mapPath,
    modelMap,
  };
}

function realFileSystem(overrides: Partial<TlaFileSystem> = {}): TlaFileSystem {
  return {
    exists: existsSync,
    lstat: lstatSync,
    readFile: (path) => readFileSync(path),
    realpath: realpathSync,
    stat: statSync,
    ...overrides,
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("TLA model loader real-filesystem boundary", () => {
  test("loads the real map after u4 closes the MirrorLifecycle declaration gap", () => {
    // BR-D6's transitional red expectation ends when u4 declares the shared
    // Core. The public loader must now verify both registered models.
    const loaded = loadVerifiedTlaSources();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.models.map((model) => model.model.name)).toEqual([
      "BoltPrAttestationGate",
      "FormalElection",
      "MirrorLifecycle",
      "PrConvergenceGate",
    ]);
    expect(
      loaded.value.models.find((model) => model.model.name === "MirrorLifecycle")?.auxIdentities,
    ).toHaveLength(1);
  });

  test("loads every registered model with migration identities", () => {
    const fixture = createFixture();
    const loaded = loadVerifiedTlaSourcesInternal(fixture.moduleUrl);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.models.map((model) => model.model.name)).toEqual(
      fixture.modelMap.models.map((model) => model.name),
    );
    // The selected execution model stays byte-bound after multi-model loading.
    const formalElection = selectVerifiedModel(loaded.value, "FormalElection");
    expect(formalElection).toMatchObject({
      ok: true,
      value: {
        moduleIdentity: EXPECTED_MODULE_IDENTITY,
        cfgIdentity: EXPECTED_CFG_IDENTITY,
      },
    });
  });

  test("classifies missing model, cfg, and model-map assets", () => {
    const cases = [
      ["modelPath", "MODEL_MISSING"],
      ["cfgPath", "CFG_MISSING"],
      ["mapPath", "MODEL_MAP_MISSING"],
    ] as const;
    for (const [pathKey, code] of cases) {
      const fixture = createFixture();
      rmSync(fixture[pathKey]);
      expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
        ok: false,
        error: { kind: "MODEL_LOAD", code },
      });
    }
  });

  test("classifies empty model, cfg, and model-map assets", () => {
    const cases = [
      ["modelPath", "MODEL_EMPTY"],
      ["cfgPath", "CFG_EMPTY"],
      ["mapPath", "MODEL_MAP_EMPTY"],
    ] as const;
    for (const [pathKey, code] of cases) {
      const fixture = createFixture();
      writeFileSync(fixture[pathKey], new Uint8Array());
      expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
        ok: false,
        error: { kind: "MODEL_LOAD", code },
      });
    }
  });

  test("classifies non-regular model, cfg, and model-map assets as unreadable", () => {
    const cases = [
      ["modelPath", "MODEL_UNREADABLE"],
      ["cfgPath", "CFG_UNREADABLE"],
      ["mapPath", "MODEL_MAP_UNREADABLE"],
    ] as const;
    for (const [pathKey, code] of cases) {
      const fixture = createFixture();
      rmSync(fixture[pathKey]);
      mkdirSync(fixture[pathKey]);
      expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
        ok: false,
        error: { kind: "MODEL_LOAD", code },
      });
    }
  });

  test("fails closed when the repository root is absent or cannot be canonicalized", () => {
    const markerlessRoot = mkdtempSync(join(tmpdir(), "amadeus-tla-no-root-"));
    temporaryRoots.push(markerlessRoot);
    const markerlessUrl = pathToFileURL(join(markerlessRoot, "probe.ts")).href;
    expect(loadVerifiedTlaSourcesInternal(markerlessUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });

    const fixture = createFixture();
    const fs = realFileSystem({
      realpath: (path) => {
        if (path === fixture.root) throw new Error("root realpath failure");
        return realpathSync(path);
      },
    });
    expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl, fs)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
  });

  test("fails closed on asset verification, containment, and read races", () => {
    const verificationFixture = createFixture();
    const verificationModelPath = realpathSync(verificationFixture.modelPath);
    const verificationFs = realFileSystem({
      realpath: (path) => {
        if (path === verificationModelPath) throw new Error("asset realpath failure");
        return realpathSync(path);
      },
    });
    expect(loadVerifiedTlaSourcesInternal(verificationFixture.moduleUrl, verificationFs)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_UNREADABLE" },
    });

    const containmentFixture = createFixture();
    const outsidePath = join(containmentFixture.root, "outside-model.tla");
    copyFileSync(containmentFixture.modelPath, outsidePath);
    const containmentModelPath = realpathSync(containmentFixture.modelPath);
    const containmentFs = realFileSystem({
      realpath: (path) => path === containmentModelPath ? outsidePath : realpathSync(path),
    });
    expect(loadVerifiedTlaSourcesInternal(containmentFixture.moduleUrl, containmentFs)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_UNREADABLE" },
    });

    const readFixture = createFixture();
    const readModelPath = realpathSync(readFixture.modelPath);
    const readFs = realFileSystem({
      readFile: (path) => {
        if (path === readModelPath) throw new Error("asset read failure");
        return readFileSync(path);
      },
    });
    expect(loadVerifiedTlaSourcesInternal(readFixture.moduleUrl, readFs)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_UNREADABLE" },
    });
  });

  test("rejects symlinks even when their target remains inside amadeus/spaces/default/specs/tla", () => {
    const fixture = createFixture();
    const target = join(dirname(fixture.modelPath), "model-target.tla");
    copyFileSync(fixture.modelPath, target);
    rmSync(fixture.modelPath);
    symlinkSync(target, fixture.modelPath);
    expect(lstatSync(fixture.modelPath).isSymbolicLink()).toBe(true);
    expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_UNREADABLE" },
    });
  });

  test("contains assets reached through a symlinked intermediate spec component", () => {
    const fixture = createFixture();
    // The canonical spec dir is realpath'd before containment, so a symlinked
    // `amadeus/` intermediate no longer misjudges legitimate assets.
    const movedAmadeus = join(fixture.root, "real-amadeus");
    renameSync(join(fixture.root, "amadeus"), movedAmadeus);
    symlinkSync(movedAmadeus, join(fixture.root, "amadeus"));
    expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({ ok: true });
  });

  test("still rejects an asset symlink escaping the realpath'd spec directory", () => {
    const fixture = createFixture();
    const escaped = join(fixture.root, "escaped.cfg");
    copyFileSync(fixture.cfgPath, escaped);
    rmSync(fixture.cfgPath);
    symlinkSync(escaped, fixture.cfgPath);
    expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "CFG_UNREADABLE" },
    });
  });

  test("falls back to the literal spec dir path when the spec dir does not exist", () => {
    const fixture = createFixture();
    rmSync(join(fixture.root, "amadeus"), { recursive: true, force: true });
    expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_MISSING" },
    });
  });

  test("rejects a map declaring every asset in a space other than its own location", () => {
    const fixture = createFixture();
    // The map sits in the default space but re-points every declared asset to
    // another space: the loader reads it from the default location, so the
    // location match fails closed before any asset is trusted.
    const relocated = readFileSync(fixture.mapPath, "utf8").split("amadeus/spaces/default/specs/tla/").join("amadeus/spaces/other/specs/tla/");
    writeFileSync(fixture.mapPath, relocated);
    const loaded = loadVerifiedTlaSourcesInternal(fixture.moduleUrl);
    expect(loaded).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
    if (loaded.ok) return;
    expect(loaded.error.detail).toContain(
      "declares its assets in a different space than its own location amadeus/spaces/default/specs/tla",
    );
  });

  test("fails closed when model bytes differ from the recorded identity", () => {
    const fixture = createFixture();
    writeFileSync(fixture.modelPath, `${readFileSync(fixture.modelPath, "utf8")}\\* drift\n`);
    expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: {
        kind: "SOURCE_DRIFT",
        code: "SOURCE_DRIFT",
        relativePath: "amadeus/spaces/default/specs/tla/FormalElection.tla",
      },
    });
  });

  test("rejects invalid UTF-8 model bytes and cfg identity drift", () => {
    const utf8Fixture = createFixture();
    writeFileSync(utf8Fixture.modelPath, Uint8Array.of(0xc3, 0x28));
    expect(loadVerifiedTlaSourcesInternal(utf8Fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: "amadeus/spaces/default/specs/tla/FormalElection.tla" },
    });

    const cfgFixture = createFixture();
    writeFileSync(cfgFixture.cfgPath, `${readFileSync(cfgFixture.cfgPath, "utf8")}\\* drift\n`);
    expect(loadVerifiedTlaSourcesInternal(cfgFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: "amadeus/spaces/default/specs/tla/FormalElection.cfg" },
    });
  });

  test("rejects implementation symlinks and implementation hash drift", () => {
    const symlinkFixture = createFixture();
    const firstEntry = executionEntries(symlinkFixture.modelMap)[0]!;
    const firstPath = join(symlinkFixture.root, firstEntry.implPath);
    const target = `${firstPath}.target`;
    copyFileSync(firstPath, target);
    rmSync(firstPath);
    symlinkSync(target, firstPath);
    expect(loadVerifiedTlaSourcesInternal(symlinkFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: firstEntry.implPath },
    });

    const driftFixture = createFixture();
    const driftEntry = executionEntries(driftFixture.modelMap)[0]!;
    writeFileSync(join(driftFixture.root, driftEntry.implPath), "// drift\n", { flag: "a" });
    expect(loadVerifiedTlaSourcesInternal(driftFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: driftEntry.implPath },
    });
  });

  test("implementation hash drift names the --impl-only recovery step", () => {
    const fixture = createFixture();
    const entry = executionEntries(fixture.modelMap)[0]!;
    writeFileSync(join(fixture.root, entry.implPath), "// drift\n", { flag: "a" });
    const result = loadVerifiedTlaSourcesInternal(fixture.moduleUrl);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected SOURCE_DRIFT");
    expect(result.error.detail).toContain("--impl-only");
  });

  test("fails closed on implementation metadata and read races", () => {
    const metadataFixture = createFixture();
    const metadataEntry = executionEntries(metadataFixture.modelMap)[0]!;
    rmSync(join(metadataFixture.root, metadataEntry.implPath));
    expect(loadVerifiedTlaSourcesInternal(metadataFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: metadataEntry.implPath },
    });

    const readFixture = createFixture();
    const readEntry = executionEntries(readFixture.modelMap)[0]!;
    const implementationPath = realpathSync(join(readFixture.root, readEntry.implPath));
    const readFs = realFileSystem({
      readFile: (path) => {
        if (path === implementationPath) throw new Error("implementation read failure");
        return readFileSync(path);
      },
    });
    expect(loadVerifiedTlaSourcesInternal(readFixture.moduleUrl, readFs)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: readEntry.implPath },
    });
  });

  // #2929 FR-BND-2/5: the loader used to carry its own boundary — a
  // `packages/framework/core/tools` root hardcoded beside the validator's
  // definition — so a governed plugin entry parsed fine and was then rejected
  // at read time. These tests pin the single shared predicate on the loader
  // side: in-boundary plugin entries load, everything else still fails closed.
  const PLUGIN_ENTRY = "plugins/github-pr-convergence/tools/pr-convergence-cli.ts";

  function fixtureWithPluginEntry(sha256Override?: string): Fixture {
    const fixture = createFixture();
    const source = readFileSync(join(REPOSITORY_ROOT, PLUGIN_ENTRY));
    const destination = join(fixture.root, PLUGIN_ENTRY);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, source);
    const map = JSON.parse(readFileSync(fixture.mapPath, "utf8")) as {
      schemaVersion: number;
      models: MutableModel[];
    };
    const target = map.models.find((model) => model.name === "FormalElection");
    if (!target) throw new Error("FormalElection must be registered");
    // `packages/...` < `plugins/...`, so appending keeps the sorted-unique
    // entries invariant the validator enforces per model.
    target.entries = [...target.entries, {
      implPath: PLUGIN_ENTRY,
      sha256: sha256Override ?? createHash("sha256").update(source).digest("hex"),
    }];
    writeFileSync(fixture.mapPath, `${JSON.stringify(map, null, 2)}\n`);
    return { ...fixture, modelMap: map as unknown as ModelMap };
  }

  test("verifies a governed plugin implementation entry inside the shared boundary", () => {
    const fixture = fixtureWithPluginEntry();
    expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({ ok: true });
  });

  test("still rejects a plugin entry whose real path escapes the implementation boundary", () => {
    // In-repository but outside the boundary: only the shared predicate — not
    // a bare repository-root containment check — catches this one.
    const insideRepoFixture = fixtureWithPluginEntry();
    const strayPath = join(insideRepoFixture.root, "stray-impl.ts");
    copyFileSync(join(insideRepoFixture.root, PLUGIN_ENTRY), strayPath);
    const pluginReal = realpathSync(join(insideRepoFixture.root, PLUGIN_ENTRY));
    const insideRepoFs = realFileSystem({
      realpath: (path) => path === pluginReal ? strayPath : realpathSync(path),
    });
    const insideRepo = loadVerifiedTlaSourcesInternal(insideRepoFixture.moduleUrl, insideRepoFs);
    expect(insideRepo).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: PLUGIN_ENTRY },
    });
    if (insideRepo.ok) throw new Error("expected SOURCE_DRIFT");
    expect(insideRepo.error.detail).toContain("implementation entry is not a regular in-boundary file");

    // Fully outside the repository root: the relative path escapes with `..`
    // and the shared predicate rejects it structurally.
    const outsideRepoFixture = fixtureWithPluginEntry();
    const outsideRoot = mkdtempSync(join(tmpdir(), "amadeus-tla-outside-"));
    temporaryRoots.push(outsideRoot);
    const outsidePath = join(outsideRoot, "pr-convergence-cli.ts");
    copyFileSync(join(outsideRepoFixture.root, PLUGIN_ENTRY), outsidePath);
    const outsidePluginReal = realpathSync(join(outsideRepoFixture.root, PLUGIN_ENTRY));
    const outsideRepoFs = realFileSystem({
      realpath: (path) => path === outsidePluginReal ? realpathSync(outsidePath) : realpathSync(path),
    });
    expect(loadVerifiedTlaSourcesInternal(outsideRepoFixture.moduleUrl, outsideRepoFs)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: PLUGIN_ENTRY },
    });
  });

  test("reports hash drift on a governed plugin entry with the --impl-only recovery step", () => {
    const fixture = fixtureWithPluginEntry();
    writeFileSync(join(fixture.root, PLUGIN_ENTRY), "// drift\n", { flag: "a" });
    const result = loadVerifiedTlaSourcesInternal(fixture.moduleUrl);
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", code: "SOURCE_DRIFT", relativePath: PLUGIN_ENTRY },
    });
    if (result.ok) throw new Error("expected SOURCE_DRIFT");
    expect(result.error.detail).toContain("hash differs");
    expect(result.error.detail).toContain("--impl-only");
  });

  test("reports hash drift when the recorded plugin sha256 does not match the bytes", () => {
    const fixture = fixtureWithPluginEntry("c".repeat(64));
    const result = loadVerifiedTlaSourcesInternal(fixture.moduleUrl);
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: PLUGIN_ENTRY },
    });
    if (result.ok) throw new Error("expected SOURCE_DRIFT");
    expect(result.error.detail).toContain("hash differs");
  });

  test("reports drift in a registered model that is not the execution model", () => {
    const fixture = createFixture();
    const watched = fixture.modelMap.models.find((model) => model.name !== "FormalElection");
    if (!watched) throw new Error("a second registered model is required");
    writeFileSync(join(fixture.root, watched.model.path), "\\* drift\n", { flag: "a" });
    expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: watched.model.path },
    });

    const cfgFixture = createFixture();
    writeFileSync(join(cfgFixture.root, watched.cfg.path), "\\* drift\n", { flag: "a" });
    expect(loadVerifiedTlaSourcesInternal(cfgFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: watched.cfg.path },
    });
  });

  test("loads the remaining models when the map drops one registration", () => {
    // The execution-model concept is gone: an unregistered model no longer
    // fails the load, but selecting it by name fails explicitly (BR-S3).
    const fixture = createFixture();
    const withoutExecution = {
      schemaVersion: 2,
      models: fixture.modelMap.models.filter((model) => model.name !== "FormalElection"),
    };
    writeFileSync(fixture.mapPath, `${JSON.stringify(withoutExecution, null, 2)}\n`);
    const loaded = loadVerifiedTlaSourcesInternal(fixture.moduleUrl);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.models.map((model) => model.model.name)).toEqual([
      "BoltPrAttestationGate",
      "MirrorLifecycle",
      "PrConvergenceGate",
    ]);
    expect(selectVerifiedModel(loaded.value, "FormalElection")).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
  });

  test("keeps model-map implementation hashes bound to every real file", () => {
    const modelMap = JSON.parse(
      readFileSync(join(REPOSITORY_ROOT, "amadeus/spaces/default/specs/tla/model-map.json"), "utf8"),
    ) as ModelMap;
    for (const model of modelMap.models) {
      expect(model.entries.map((entry) => entry.implPath)).toEqual(
        [...model.entries].map((entry) => entry.implPath).sort(),
      );
    }
    for (const entry of modelMap.models.flatMap((model) => model.entries)) {
      const actual = createHash("sha256")
        .update(readFileSync(join(REPOSITORY_ROOT, entry.implPath)))
        .digest("hex");
      expect(actual).toBe(entry.sha256);
    }
  });

  test("preserves generator and receipt contracts over external bytes", () => {
    const bundle = generateFrozenTlaModel({ publicContractIdentity: "a".repeat(64) });
    const receipt = createFrozenTlaModelReceipt(bundle);
    expect(bundle).toMatchObject({
      moduleBytesIdentity: EXPECTED_MODULE_IDENTITY,
      cfgBytesIdentity: EXPECTED_CFG_IDENTITY,
    });
    expect(receipt).not.toHaveProperty("moduleBytes");
    expect(receipt).not.toHaveProperty("cfgBytes");
    expect(receipt.modelIdentity).toBe(bundle.modelIdentity);
  });

  test("contains no embedded source fallback after migration", () => {
    const adapterSource = readFileSync(join(REPOSITORY_ROOT, "plugins/formal-model-check/tools/tla-arm.ts"), "utf8");
    expect(adapterSource).not.toContain("const MODEL_SOURCE");
    expect(adapterSource).not.toContain("const CFG_SOURCE");
    expect(adapterSource).not.toContain("---- MODULE FormalElection ----");
    expect(adapterSource).toContain("loadVerifiedTlaSource()");
  });
});
