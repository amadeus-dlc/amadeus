import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import {
  findModelMapModel,
  parseTlaModelMap,
  type ModelMap,
} from "../../plugins/formal-model-check/tools/tla-model-map.ts";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// ADR-4 (2026-07-31 revision): the mirror lifecycle model watches the reducer,
// the shared types, the project reconciliation reducer, and the coordinator.
const MIRROR_IMPLEMENTATION = [
  "packages/framework/core/tools/amadeus-mirror-coordinator.ts",
  "packages/framework/core/tools/amadeus-mirror-project-reconciliation-reducer.ts",
  "packages/framework/core/tools/amadeus-mirror-state-reducer.ts",
  "packages/framework/core/tools/amadeus-mirror-types.ts",
];

function repositoryModelMap(): ModelMap {
  const bytes = readFileSync(join(REPOSITORY_ROOT, "amadeus/spaces/default/specs/tla/model-map.json"));
  const parsed = parseTlaModelMap(new Uint8Array(bytes));
  if (!parsed.ok) throw new Error(parsed.error.detail);
  return parsed.value;
}

function fileSha(relativePath: string): string {
  return createHash("sha256").update(readFileSync(join(REPOSITORY_ROOT, relativePath))).digest("hex");
}

describe("MirrorLifecycle model registration", () => {
  test("registers MirrorLifecycle alongside the execution model", () => {
    const map = repositoryModelMap();
    expect(map.models.map((model) => model.name)).toEqual([
      "BoltPrAttestationGate",
      "FormalElection",
      "MirrorLifecycle",
      "PrConvergenceGate",
    ]);
  });

  test("pins exactly the four ADR-4 implementation files", () => {
    const mirror = findModelMapModel(repositoryModelMap(), "MirrorLifecycle");
    if (!mirror) throw new Error("MirrorLifecycle must be registered");
    expect(mirror.entries.map((entry) => entry.implPath)).toEqual(MIRROR_IMPLEMENTATION);
  });

  test("detects drift in every one of the four pinned implementation files", () => {
    const mirror = findModelMapModel(repositoryModelMap(), "MirrorLifecycle");
    if (!mirror) throw new Error("MirrorLifecycle must be registered");
    // A byte change in any pinned file moves its hash away from the recorded
    // pin, which is exactly what the loader reports as SOURCE_DRIFT.
    for (const entry of mirror.entries) {
      expect(entry.sha256).toBe(fileSha(entry.implPath));
      const mutated = createHash("sha256")
        .update(readFileSync(join(REPOSITORY_ROOT, entry.implPath)))
        .update("// drift\n")
        .digest("hex");
      expect(mutated).not.toBe(entry.sha256);
    }
  });

  test("binds the MirrorLifecycle model and cfg identities to the AsIntended variant", () => {
    const mirror = findModelMapModel(repositoryModelMap(), "MirrorLifecycle");
    if (!mirror) throw new Error("MirrorLifecycle must be registered");
    expect(mirror.model.path).toBe("amadeus/spaces/default/specs/tla/MirrorLifecycle.tla");
    expect(mirror.cfg.path).toBe("amadeus/spaces/default/specs/tla/MirrorLifecycle.cfg");
    for (const [asset, domain] of [
      [mirror.model, "amadeus.formal-verif.tla.module.v1"],
      [mirror.cfg, "amadeus.formal-verif.tla.cfg.v1"],
    ] as const) {
      const source = readFileSync(join(REPOSITORY_ROOT, asset.path), "utf-8");
      expect(canonicalIdentity(source, domain).sha256).toBe(asset.identity);
    }
  });

  test("pins the shared Core module and detects auxiliary byte drift", () => {
    const mirror = findModelMapModel(repositoryModelMap(), "MirrorLifecycle");
    if (!mirror) throw new Error("MirrorLifecycle must be registered");
    expect(mirror.auxiliaries).toHaveLength(1);
    const core = mirror.auxiliaries?.[0];
    if (!core) throw new Error("MirrorLifecycleCore must be declared");
    expect(core.path).toBe("amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla");
    const source = readFileSync(join(REPOSITORY_ROOT, core.path), "utf8");
    expect(core.identity).toBe(
      canonicalIdentity(source, "amadeus.formal-verif.tla.module.v1").sha256,
    );
    expect(canonicalIdentity(`${source}\n\\* drift`, "amadeus.formal-verif.tla.module.v1").sha256)
      .not.toBe(core.identity);
  });

  test("registers the MirrorLifecycle invariant and trace vocabulary", () => {
    const mirror = findModelMapModel(repositoryModelMap(), "MirrorLifecycle");
    if (!mirror) throw new Error("MirrorLifecycle must be registered");
    expect(mirror.vocabulary).toEqual({
      namedInvariants: ["TypeOK", "NoCloseWithoutLandedSync", "NoDuplicateCreate"],
      traceStateVariables: ["receipts", "issueNumber", "boundaryIdx"],
    });
  });

  test("leaves the AsImplemented falsification variant unregistered", () => {
    // The AsImplemented variant exists to produce a counterexample once; a
    // standing registration would make the drift gate permanently red.
    expect(findModelMapModel(repositoryModelMap(), "MirrorLifecycleAsImplemented")).toBeUndefined();
  });
});
