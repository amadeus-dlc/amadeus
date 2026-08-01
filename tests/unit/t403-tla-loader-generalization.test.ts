import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import {
  loadVerifiedTlaSourceInternal,
  loadVerifiedTlaSourcesInternal,
  selectVerifiedModel,
} from "../../plugins/formal-model-check/tools/tla-model-loader-internal.ts";

const TLA_MODULE_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const TLA_CFG_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";

const moduleIdentity = (source: string) => canonicalIdentity(source, TLA_MODULE_DOMAIN).sha256;
const cfgIdentity = (source: string) => canonicalIdentity(source, TLA_CFG_DOMAIN).sha256;
const sha256 = (bytes: string) => createHash("sha256").update(bytes).digest("hex");

interface FixtureModel {
  readonly name: string;
  readonly moduleSource: string;
  readonly cfgSource: string;
  readonly auxiliaries?: readonly { name: string; source: string; identity?: string }[];
}

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// A self-contained synthetic workspace: two registered models (Alpha, Beta)
// whose declarations the loader can check without touching the real map.
function createWorkspace(models: readonly FixtureModel[]): { root: string; moduleUrl: string } {
  const root = mkdtempSync(join(tmpdir(), "t403-tla-loader-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "specs/tla"), { recursive: true });
  mkdirSync(join(root, "packages/framework/core/tools"), { recursive: true });
  writeFileSync(join(root, ".git"), "gitdir: fixture\n");
  writeFileSync(join(root, "package.json"), "{}\n");

  const entries = models.map((model) => {
    const implPath = `packages/framework/core/tools/amadeus-${model.name.toLowerCase()}-impl.ts`;
    writeFileSync(join(root, implPath), `// impl for ${model.name}\n`);
    return { implPath, sha256: sha256(`// impl for ${model.name}\n`) };
  });

  const mapModels = models.map((model, index) => {
    writeFileSync(join(root, `specs/tla/${model.name}.tla`), model.moduleSource);
    writeFileSync(join(root, `specs/tla/${model.name}.cfg`), model.cfgSource);
    const auxiliaries = model.auxiliaries?.map((aux) => {
      writeFileSync(join(root, `specs/tla/${aux.name}.tla`), aux.source);
      return {
        path: `specs/tla/${aux.name}.tla`,
        identity: aux.identity ?? moduleIdentity(aux.source),
      };
    });
    return {
      name: model.name,
      model: { path: `specs/tla/${model.name}.tla`, identity: moduleIdentity(model.moduleSource) },
      cfg: { path: `specs/tla/${model.name}.cfg`, identity: cfgIdentity(model.cfgSource) },
      entries: [entries[index]!],
      ...(auxiliaries && auxiliaries.length > 0 ? { auxiliaries } : {}),
    };
  });
  writeFileSync(
    join(root, "specs/tla/model-map.json"),
    `${JSON.stringify({ schemaVersion: 2, models: mapModels }, null, 2)}\n`,
  );
  return { root, moduleUrl: pathToFileURL(join(root, "probe.ts")).href };
}

const ALPHA: FixtureModel = {
  name: "Alpha",
  moduleSource: "---- MODULE Alpha ----\nEXTENDS Naturals\n====\n",
  cfgSource: "SPECIFICATION Spec\n",
};

const betaWithInstance: FixtureModel = {
  name: "Beta",
  moduleSource: "---- MODULE Beta ----\nEXTENDS Naturals\nCore == INSTANCE BetaCore\n====\n",
  cfgSource: "SPECIFICATION Spec\n",
  auxiliaries: [{ name: "BetaCore", source: "---- MODULE BetaCore ----\nEXTENDS Naturals\n====\n" }],
};

describe("t403 loader generalization", () => {
  test("returns every registered model in declaration order with verified identities", () => {
    const { moduleUrl } = createWorkspace([ALPHA, betaWithInstance]);
    const loaded = loadVerifiedTlaSourcesInternal(moduleUrl);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    // No execution-model skip and no TLA_EXECUTION_MODEL_NAME derivation: a
    // map without FormalElection verifies every model it registers.
    expect(loaded.value.models.map((model) => model.model.name)).toEqual(["Alpha", "Beta"]);
    const [alpha, beta] = loaded.value.models;
    expect(alpha!.moduleIdentity).toBe(moduleIdentity(ALPHA.moduleSource));
    expect(alpha!.cfgIdentity).toBe(cfgIdentity(ALPHA.cfgSource));
    expect(alpha!.moduleSource).toBe(ALPHA.moduleSource);
    expect(alpha!.auxIdentities).toEqual([]);
    expect(beta!.moduleIdentity).toBe(moduleIdentity(betaWithInstance.moduleSource));
    expect(beta!.auxIdentities).toEqual([
      { path: "specs/tla/BetaCore.tla", identity: moduleIdentity("---- MODULE BetaCore ----\nEXTENDS Naturals\n====\n") },
    ]);
  });

  test("fails SOURCE_DRIFT when a resolved auxiliary is not declared (missing)", () => {
    const { root, moduleUrl } = createWorkspace([
      ALPHA,
      {
        name: "Beta",
        moduleSource: "---- MODULE Beta ----\nCore == INSTANCE BetaCore\n====\n",
        cfgSource: "SPECIFICATION Spec\n",
      },
    ]);
    // BetaCore.tla exists inside specs/tla so the resolver can read it on the
    // fly; only the declaration is absent.
    writeFileSync(join(root, "specs/tla/BetaCore.tla"), "---- MODULE BetaCore ----\nEXTENDS Naturals\n====\n");
    const loaded = loadVerifiedTlaSourcesInternal(moduleUrl);
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.error).toMatchObject({ kind: "SOURCE_DRIFT", relativePath: "specs/tla/Beta.tla" });
    expect((loaded.error as { detail: string }).detail).toContain("missing=[BetaCore]");
  });

  test("fails SOURCE_DRIFT when a declared auxiliary is never resolved (extra)", () => {
    const { moduleUrl } = createWorkspace([
      ALPHA,
      {
        name: "Beta",
        moduleSource: "---- MODULE Beta ----\nEXTENDS Naturals\n====\n",
        cfgSource: "SPECIFICATION Spec\n",
        auxiliaries: [{ name: "BetaCore", source: "---- MODULE BetaCore ----\nEXTENDS Naturals\n====\n" }],
      },
    ]);
    const loaded = loadVerifiedTlaSourcesInternal(moduleUrl);
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.error).toMatchObject({ kind: "SOURCE_DRIFT", relativePath: "specs/tla/Beta.tla" });
    const detail = (loaded.error as { detail: string }).detail;
    expect(detail).toContain("extra=[BetaCore]");
    expect(detail).toContain("missing=[]");
  });

  test("fails SOURCE_DRIFT when a declared aux identity differs from the file", () => {
    const { moduleUrl } = createWorkspace([
      ALPHA,
      {
        ...betaWithInstance,
        auxiliaries: [{ name: "BetaCore", source: "---- MODULE BetaCore ----\nEXTENDS Naturals\n====\n", identity: "0".repeat(64) }],
      },
    ]);
    expect(loadVerifiedTlaSourcesInternal(moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: "specs/tla/BetaCore.tla" },
    });
  });

  test("propagates resolver failure as ModuleDepsError, never as SOURCE_DRIFT", () => {
    const { moduleUrl } = createWorkspace([
      ALPHA,
      {
        name: "Beta",
        moduleSource: "---- MODULE Beta ----\nCore == INSTANCE BetaCore\n====\n",
        cfgSource: "SPECIFICATION Spec\n",
        auxiliaries: [{
          name: "BetaCore",
          source: "---- MODULE BetaCore ----\nBack == INSTANCE Beta\n====\n",
        }],
      },
    ]);
    const loaded = loadVerifiedTlaSourcesInternal(moduleUrl);
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.error).toMatchObject({ kind: "MODULE_DEPS", code: "MODULE_DEP_CYCLE" });
  });

  test("selectVerifiedModel returns the named model and rejects unknown names", () => {
    const { moduleUrl } = createWorkspace([ALPHA, betaWithInstance]);
    const loaded = loadVerifiedTlaSourcesInternal(moduleUrl);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const selected = selectVerifiedModel(loaded.value, "Beta");
    expect(selected.ok).toBe(true);
    if (selected.ok) expect(selected.value.model.name).toBe("Beta");
    expect(selectVerifiedModel(loaded.value, "Gamma")).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
  });

  test("verifies the first registered model through the same all-model loop", () => {
    // Drift in Alpha (the first model, the position the removed execution-model
    // skip used to exempt from verifyRegisteredAssets) is caught by the same
    // registered-asset path as any other model.
    const { root, moduleUrl } = createWorkspace([ALPHA, betaWithInstance]);
    writeFileSync(join(root, "specs/tla/Alpha.cfg"), "SPECIFICATION Drifted\n");
    expect(loadVerifiedTlaSourcesInternal(moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "SOURCE_DRIFT", relativePath: "specs/tla/Alpha.cfg" },
    });
  });

  test("reports an unreferenced module file as MODULE_DEP_UNRESOLVED", () => {
    const { moduleUrl } = createWorkspace([
      ALPHA,
      {
        name: "Beta",
        moduleSource: "---- MODULE Beta ----\nCore == INSTANCE Missing\n====\n",
        cfgSource: "SPECIFICATION Spec\n",
      },
    ]);
    expect(loadVerifiedTlaSourcesInternal(moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODULE_DEPS", code: "MODULE_DEP_UNRESOLVED" },
    });
  });

  test("reports an unreadable or non-UTF-8 resolved module as MODULE_DEP_UNRESOLVED", () => {
    const emptyFixture = createWorkspace([
      ALPHA,
      {
        name: "Beta",
        moduleSource: "---- MODULE Beta ----\nCore == INSTANCE BetaCore\n====\n",
        cfgSource: "SPECIFICATION Spec\n",
      },
    ]);
    writeFileSync(join(emptyFixture.root, "specs/tla/BetaCore.tla"), new Uint8Array());
    expect(loadVerifiedTlaSourcesInternal(emptyFixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODULE_DEPS", code: "MODULE_DEP_UNRESOLVED" },
    });

    const utf8Fixture = createWorkspace([
      ALPHA,
      {
        name: "Beta",
        moduleSource: "---- MODULE Beta ----\nCore == INSTANCE BetaCore\n====\n",
        cfgSource: "SPECIFICATION Spec\n",
      },
    ]);
    writeFileSync(join(utf8Fixture.root, "specs/tla/BetaCore.tla"), Uint8Array.of(0xc3, 0x28));
    expect(loadVerifiedTlaSourcesInternal(utf8Fixture.moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODULE_DEPS", code: "MODULE_DEP_UNRESOLVED" },
    });
  });
});

describe("t403 singular compatibility shim (BR-S4, removed by u3)", () => {
  const formalElectionModel: FixtureModel = {
    name: "FormalElection",
    moduleSource: "---- MODULE FormalElection ----\nEXTENDS Naturals\n====\n",
    cfgSource: "SPECIFICATION Spec\n",
  };

  test("projects the selected FormalElection onto the singular shape", () => {
    const { moduleUrl } = createWorkspace([formalElectionModel, betaWithInstance].toSorted(
      (left, right) => left.name.localeCompare(right.name),
    ));
    const loaded = loadVerifiedTlaSourceInternal(moduleUrl);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.moduleIdentity).toBe(moduleIdentity(formalElectionModel.moduleSource));
    expect(loaded.value.cfgIdentity).toBe(cfgIdentity(formalElectionModel.cfgSource));
    expect(loaded.value.moduleSource).toBe(formalElectionModel.moduleSource);
    expect(loaded.value.executionModel.name).toBe("FormalElection");
    expect(loaded.value.modelMap.models.map((model) => model.name)).toEqual(["Beta", "FormalElection"]);
  });

  test("fails explicitly when FormalElection is not registered", () => {
    const { moduleUrl } = createWorkspace([ALPHA, betaWithInstance]);
    expect(loadVerifiedTlaSourceInternal(moduleUrl)).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
  });

  test("narrows resolver failure onto SOURCE_DRIFT for the old error contract", () => {
    const { moduleUrl } = createWorkspace([
      {
        name: "FormalElection",
        moduleSource: "---- MODULE FormalElection ----\nCore == INSTANCE BetaCore\n====\n",
        cfgSource: "SPECIFICATION Spec\n",
        auxiliaries: [{
          name: "BetaCore",
          source: "---- MODULE BetaCore ----\nBack == INSTANCE FormalElection\n====\n",
        }],
      },
    ]);
    const loaded = loadVerifiedTlaSourceInternal(moduleUrl);
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.error).toMatchObject({ kind: "SOURCE_DRIFT", code: "SOURCE_DRIFT" });
    expect((loaded.error as { detail: string }).detail).toContain("MODULE_DEP_CYCLE");
  });
});
