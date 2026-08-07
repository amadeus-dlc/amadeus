import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import { loadVerifiedTlaSourcesInternal } from "../../plugins/formal-model-check/tools/tla-model-loader-internal.ts";
import {
  checkModelCompleteness,
  updateModelMap,
} from "../../packages/framework/core/tools/amadeus-sensor-model-completeness.ts";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const CFG_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";
const MODEL_PATH = "amadeus/spaces/default/specs/tla/MirrorLifecycle.tla";
const CORE_PATH = "amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla";
const CFG_PATH = "amadeus/spaces/default/specs/tla/MirrorLifecycle.cfg";
const ENTRY_PATH = "packages/framework/core/tools/amadeus-mirror-fixture.ts";
const temporaryRoots: string[] = [];

interface FixtureMap {
  readonly schemaVersion: 2;
  readonly models: readonly [{
    readonly name: "MirrorLifecycle";
    readonly model: { readonly path: string; readonly identity: string };
    readonly cfg: { readonly path: string; readonly identity: string };
    readonly auxiliaries?: readonly { readonly path: string; readonly identity: string }[];
    readonly entries: readonly { readonly implPath: string; readonly sha256: string }[];
    readonly vocabulary: {
      readonly namedInvariants: readonly string[];
      readonly traceStateVariables: readonly string[];
    };
  }];
}

interface Fixture {
  readonly root: string;
  readonly moduleUrl: string;
  readonly mapPath: string;
  readonly coreSource: string;
}

function sourceIdentity(source: string, domain = MODULE_DOMAIN): string {
  return canonicalIdentity(source, domain).sha256;
}

function fileHash(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}

function writeMap(fixture: Fixture, map: FixtureMap): void {
  writeFileSync(fixture.mapPath, `${JSON.stringify(map, null, 2)}\n`);
}

function readMap(fixture: Fixture): FixtureMap {
  return JSON.parse(readFileSync(fixture.mapPath, "utf8")) as FixtureMap;
}

function createFixture(declareCore = true): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t405-mirror-drift-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "amadeus/spaces/default/specs/tla"), { recursive: true });
  mkdirSync(join(root, "packages/framework/core/tools"), { recursive: true });
  writeFileSync(join(root, ".git"), "gitdir: fixture\n");
  writeFileSync(join(root, "package.json"), "{}\n");

  const modelSource = readFileSync(join(REPOSITORY_ROOT, MODEL_PATH), "utf8");
  const coreSource = readFileSync(join(REPOSITORY_ROOT, CORE_PATH), "utf8");
  const cfgSource = readFileSync(join(REPOSITORY_ROOT, CFG_PATH), "utf8");
  const entrySource = "// mirror fixture implementation\n";
  writeFileSync(join(root, MODEL_PATH), modelSource);
  writeFileSync(join(root, CORE_PATH), coreSource);
  writeFileSync(join(root, CFG_PATH), cfgSource);
  writeFileSync(join(root, ENTRY_PATH), entrySource);
  const fixture: Fixture = {
    root,
    moduleUrl: pathToFileURL(join(root, "probe.ts")).href,
    mapPath: join(root, "amadeus/spaces/default/specs/tla/model-map.json"),
    coreSource,
  };
  writeMap(fixture, {
    schemaVersion: 2,
    models: [{
      name: "MirrorLifecycle",
      model: { path: MODEL_PATH, identity: sourceIdentity(modelSource) },
      cfg: { path: CFG_PATH, identity: sourceIdentity(cfgSource, CFG_DOMAIN) },
      ...(declareCore
        ? { auxiliaries: [{ path: CORE_PATH, identity: sourceIdentity(coreSource) }] }
        : {}),
      entries: [{ implPath: ENTRY_PATH, sha256: fileHash(entrySource) }],
      vocabulary: {
        namedInvariants: ["TypeOK", "NoCloseWithoutLandedSync", "NoDuplicateCreate"],
        traceStateVariables: ["receipts", "issueNumber", "boundaryIdx"],
      },
    }],
  });
  return fixture;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("MirrorLifecycle auxiliary declaration drift", () => {
  test("accepts an unchanged model with a matching auxiliary declaration", async () => {
    const fixture = createFixture();
    expect(await checkModelCompleteness({ projectRoot: fixture.root })).toEqual({
      pass: true,
      findings_count: 0,
      findings: [],
    });
  });

  test("reports both semantic and comment-only Core edits at the sensor and loader seams", async () => {
    for (const mutation of [
      (source: string) => source.replace("issueNumber = Null", "issueNumber # Null"),
      (source: string) => source.replace("Shared core of the GitHub mirror lifecycle model.", "Shared drift probe."),
    ]) {
      const fixture = createFixture();
      const mutated = mutation(fixture.coreSource);
      expect(mutated).not.toBe(fixture.coreSource);
      writeFileSync(join(fixture.root, CORE_PATH), mutated);

      expect(await checkModelCompleteness({ projectRoot: fixture.root })).toMatchObject({
        pass: false,
        reason: "drift",
        findings: expect.arrayContaining([{ path: CORE_PATH, reason: "changed" }]),
      });
      expect(loadVerifiedTlaSourcesInternal(fixture.moduleUrl)).toMatchObject({
        ok: false,
        error: { kind: "SOURCE_DRIFT", relativePath: CORE_PATH },
      });
    }
  });

  test("reports missing and extra declarations in both directions", async () => {
    const missing = createFixture(false);
    expect(await checkModelCompleteness({ projectRoot: missing.root })).toMatchObject({
      pass: false,
      reason: "drift",
      findings: expect.arrayContaining([{ path: MODEL_PATH, reason: "declaration-drift" }]),
    });

    const extra = createFixture();
    const unusedPath = "amadeus/spaces/default/specs/tla/MirrorUnused.tla";
    const unusedSource = "---- MODULE MirrorUnused ----\nEXTENDS Naturals\n====\n";
    writeFileSync(join(extra.root, unusedPath), unusedSource);
    const map = readMap(extra);
    writeMap(extra, {
      ...map,
      models: [{
        ...map.models[0],
        auxiliaries: [
          ...(map.models[0].auxiliaries ?? []),
          { path: unusedPath, identity: sourceIdentity(unusedSource) },
        ],
      }],
    });
    expect(await checkModelCompleteness({ projectRoot: extra.root })).toMatchObject({
      pass: false,
      reason: "drift",
      findings: expect.arrayContaining([{ path: MODEL_PATH, reason: "declaration-drift" }]),
    });
  });

  test("repairs a missing declaration, agrees with the loader identity, and is idempotent", async () => {
    const fixture = createFixture(false);
    expect(await updateModelMap({ projectRoot: fixture.root })).toMatchObject({ ok: true });
    const repaired = readMap(fixture).models[0];
    expect(repaired.auxiliaries).toEqual([{ path: CORE_PATH, identity: sourceIdentity(fixture.coreSource) }]);
    expect(await checkModelCompleteness({ projectRoot: fixture.root })).toEqual({
      pass: true,
      findings_count: 0,
      findings: [],
    });
    const loaded = loadVerifiedTlaSourcesInternal(fixture.moduleUrl);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.models[0]?.auxIdentities[0]?.identity).toBe(sourceIdentity(fixture.coreSource));
    expect(await updateModelMap({ projectRoot: fixture.root })).toMatchObject({
      ok: false,
      code: "MODEL_UNCHANGED",
    });
  });

  test("fails closed when auxiliary resolution encounters a cycle", async () => {
    const fixture = createFixture();
    const cyclicCore = `${fixture.coreSource.replace(/\n====\s*$/, "")}\nBack == INSTANCE MirrorLifecycle\n====\n`;
    writeFileSync(join(fixture.root, CORE_PATH), cyclicCore);
    const map = readMap(fixture);
    writeMap(fixture, {
      ...map,
      models: [{
        ...map.models[0],
        auxiliaries: [{ path: CORE_PATH, identity: sourceIdentity(cyclicCore) }],
      }],
    });
    expect(await checkModelCompleteness({ projectRoot: fixture.root })).toMatchObject({
      pass: false,
      reason: "drift",
      findings: expect.arrayContaining([{ path: MODEL_PATH, reason: "declaration-unresolved" }]),
    });
  });

  test("fails closed when an undeclared referenced module cannot be read", async () => {
    const fixture = createFixture(false);
    rmSync(join(fixture.root, CORE_PATH));
    expect(await checkModelCompleteness({ projectRoot: fixture.root })).toMatchObject({
      pass: false,
      reason: "drift",
      findings: expect.arrayContaining([{ path: MODEL_PATH, reason: "declaration-unresolved" }]),
    });
  });
});
