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
} from "../../scripts/formal-verif/tla-arm.ts";
import {
  loadVerifiedTlaSource,
} from "../../scripts/formal-verif/tla-model-loader.ts";
import {
  loadVerifiedTlaSourceInternal,
} from "../../scripts/formal-verif/tla-model-loader-internal.ts";
import type { TlaFileSystem } from "../../scripts/formal-verif/tla-model-loader-internal.ts";
import type { ModelMap } from "../../scripts/formal-verif/tla-model-map.ts";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const EXPECTED_MODULE_IDENTITY = "ca86668dcf1c39b4a72e2ca334959923184fc7874ceb7197c389840d793c3769";
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

function createFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-tla-loader-"));
  temporaryRoots.push(root);
  const modelPath = join(root, "specs/tla/FormalElection.tla");
  const cfgPath = join(root, "specs/tla/FormalElection.cfg");
  const mapPath = join(root, "specs/tla/model-map.json");
  mkdirSync(join(root, "scripts/formal-verif"), { recursive: true });
  mkdirSync(join(root, "specs/tla"), { recursive: true });
  mkdirSync(join(root, "packages/framework/core/tools"), { recursive: true });
  writeFileSync(join(root, ".git"), "gitdir: fixture\n");
  writeFileSync(join(root, "package.json"), "{}\n");
  copyFileSync(join(REPOSITORY_ROOT, "specs/tla/FormalElection.tla"), modelPath);
  copyFileSync(join(REPOSITORY_ROOT, "specs/tla/FormalElection.cfg"), cfgPath);
  copyFileSync(join(REPOSITORY_ROOT, "specs/tla/model-map.json"), mapPath);
  const modelMap = JSON.parse(readFileSync(mapPath, "utf8")) as ModelMap;
  for (const entry of modelMap.entries) {
    const destination = join(root, entry.implPath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(REPOSITORY_ROOT, entry.implPath), destination);
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
  test("loads the repository-owned assets once with migration identities under 250ms", () => {
    const startedAt = performance.now();
    const loaded = loadVerifiedTlaSource();
    const durationMs = performance.now() - startedAt;
    expect(loaded).toMatchObject({
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
      expect(loadVerifiedTlaSourceInternal(fixture.moduleUrl)).toMatchObject({
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
      expect(loadVerifiedTlaSourceInternal(fixture.moduleUrl)).toMatchObject({
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
      expect(loadVerifiedTlaSourceInternal(fixture.moduleUrl)).toMatchObject({
        ok: false,
        error: { kind: "MODEL_LOAD", code },
      });
    }
  });

  test("fails closed when the repository root is absent or cannot be canonicalized", () => {
    const markerlessRoot = mkdtempSync(join(tmpdir(), "amadeus-tla-no-root-"));
    temporaryRoots.push(markerlessRoot);
    const markerlessUrl = pathToFileURL(join(markerlessRoot, "probe.ts")).href;
    expect(loadVerifiedTlaSourceInternal(markerlessUrl)).toMatchObject({
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
    expect(loadVerifiedTlaSourceInternal(fixture.moduleUrl, fs)).toMatchObject({
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
    expect(loadVerifiedTlaSourceInternal(verificationFixture.moduleUrl, verificationFs)).toMatchObject({
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
    expect(loadVerifiedTlaSourceInternal(containmentFixture.moduleUrl, containmentFs)).toMatchObject({
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
    expect(loadVerifiedTlaSourceInternal(readFixture.moduleUrl, readFs)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_UNREADABLE" },
    });
  });

  test("rejects symlinks even when their target remains inside specs/tla", () => {
    const fixture = createFixture();
    const target = join(dirname(fixture.modelPath), "model-target.tla");
    copyFileSync(fixture.modelPath, target);
    rmSync(fixture.modelPath);
    symlinkSync(target, fixture.modelPath);
    expect(lstatSync(fixture.modelPath).isSymbolicLink()).toBe(true);
    expect(loadVerifiedTlaSourceInternal(fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_UNREADABLE" },
    });
  });

  test("fails closed when model bytes differ from the recorded identity", () => {
    const fixture = createFixture();
    writeFileSync(fixture.modelPath, `${readFileSync(fixture.modelPath, "utf8")}\\* drift\n`);
    expect(loadVerifiedTlaSourceInternal(fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: {
        kind: "SOURCE_DRIFT",
        code: "SOURCE_DRIFT",
        relativePath: "specs/tla/FormalElection.tla",
      },
    });
  });

  test("rejects invalid UTF-8 model bytes and cfg identity drift", () => {
    const utf8Fixture = createFixture();
    writeFileSync(utf8Fixture.modelPath, Uint8Array.of(0xc3, 0x28));
    expect(loadVerifiedTlaSourceInternal(utf8Fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: "specs/tla/FormalElection.tla" },
    });

    const cfgFixture = createFixture();
    writeFileSync(cfgFixture.cfgPath, `${readFileSync(cfgFixture.cfgPath, "utf8")}\\* drift\n`);
    expect(loadVerifiedTlaSourceInternal(cfgFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: "specs/tla/FormalElection.cfg" },
    });
  });

  test("rejects implementation symlinks and implementation hash drift", () => {
    const symlinkFixture = createFixture();
    const firstEntry = symlinkFixture.modelMap.entries[0]!;
    const firstPath = join(symlinkFixture.root, firstEntry.implPath);
    const target = `${firstPath}.target`;
    copyFileSync(firstPath, target);
    rmSync(firstPath);
    symlinkSync(target, firstPath);
    expect(loadVerifiedTlaSourceInternal(symlinkFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: firstEntry.implPath },
    });

    const driftFixture = createFixture();
    const driftEntry = driftFixture.modelMap.entries[0]!;
    writeFileSync(join(driftFixture.root, driftEntry.implPath), "// drift\n", { flag: "a" });
    expect(loadVerifiedTlaSourceInternal(driftFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: driftEntry.implPath },
    });
  });

  test("fails closed on implementation metadata and read races", () => {
    const metadataFixture = createFixture();
    const metadataEntry = metadataFixture.modelMap.entries[0]!;
    rmSync(join(metadataFixture.root, metadataEntry.implPath));
    expect(loadVerifiedTlaSourceInternal(metadataFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: metadataEntry.implPath },
    });

    const readFixture = createFixture();
    const readEntry = readFixture.modelMap.entries[0]!;
    const implementationPath = realpathSync(join(readFixture.root, readEntry.implPath));
    const readFs = realFileSystem({
      readFile: (path) => {
        if (path === implementationPath) throw new Error("implementation read failure");
        return readFileSync(path);
      },
    });
    expect(loadVerifiedTlaSourceInternal(readFixture.moduleUrl, readFs)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: readEntry.implPath },
    });
  });

  test("keeps model-map implementation hashes bound to every real file", () => {
    const modelMap = JSON.parse(
      readFileSync(join(REPOSITORY_ROOT, "specs/tla/model-map.json"), "utf8"),
    ) as ModelMap;
    expect(modelMap.entries.map((entry) => entry.implPath)).toEqual(
      [...modelMap.entries].map((entry) => entry.implPath).sort(),
    );
    for (const entry of modelMap.entries) {
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
    const adapterSource = readFileSync(join(REPOSITORY_ROOT, "scripts/formal-verif/tla-arm.ts"), "utf8");
    expect(adapterSource).not.toContain("const MODEL_SOURCE");
    expect(adapterSource).not.toContain("const CFG_SOURCE");
    expect(adapterSource).not.toContain("---- MODULE FormalElection ----");
    expect(adapterSource).toContain("loadVerifiedTlaSource()");
  });
});
