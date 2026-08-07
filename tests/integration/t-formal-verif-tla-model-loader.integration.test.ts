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
// Moved with the resolution axis revision published through updateModelMap
// (ruling Q2=A, 2026-08-05 — Issue #1946, FR-2f). The cfg bytes were untouched.
const EXPECTED_MODULE_IDENTITY = "e8cc39a918d6893dc3b8e2f31d8e81857e1885ac0f93dec6212ec2a0b11e7213";
const EXPECTED_CFG_IDENTITY = "92656a5c8cf2a83a0251bc35fef8c8260e9cb1baec459bef2d87a104474ed62b";
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
      "FormalElection",
      "MirrorLifecycle",
    ]);
    expect(loaded.value.models[1]?.auxIdentities).toHaveLength(1);
  });

  test("loads every registered model with migration identities under 250ms", () => {
    const fixture = createFixture();
    const startedAt = performance.now();
    const loaded = loadVerifiedTlaSourcesInternal(fixture.moduleUrl);
    const durationMs = performance.now() - startedAt;
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.models.map((model) => model.model.name)).toEqual(
      fixture.modelMap.models.map((model) => model.name),
    );
    // FR-6 invariance pin: the FormalElection identity values are unchanged
    // by the multi-model generalization.
    const formalElection = selectVerifiedModel(loaded.value, "FormalElection");
    expect(formalElection).toMatchObject({
      ok: true,
      value: {
        moduleIdentity: EXPECTED_MODULE_IDENTITY,
        cfgIdentity: EXPECTED_CFG_IDENTITY,
      },
    });
    expect(durationMs).toBeLessThan(250);
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
    expect(loaded.value.models.map((model) => model.model.name)).toEqual(["MirrorLifecycle"]);
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
