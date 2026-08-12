// Drives the referee against the real TLC toolchain, the boundary the fake
// toolchain in tla-authoring-e2e-driver.ts cannot stand in for: the production
// FsTlcToolchain validates the receipt and re-reads the bytes off disk before
// it will prepare a run (issue #2913, FR-1/3/5/6/7).
//
// It lives outside the four CI tiers on purpose — it needs JAVA_HOME on the
// pinned OpenJDK and network access for the first jar fetch:
//
//   mise x java@temurin-26.0.1+8 -- bun test tests/formal-verif/tla-referee-real-toolchain.test.ts

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultModelCheckToolchain } from "../../plugins/formal-model-check/tools/run-model-check.ts";
import {
  createRefereeTlaModelReceipt,
  createRefereeToolchain,
  RefereeToolchainInternals,
} from "../../plugins/formal-model-check/tools/tla-referee-toolchain.ts";
import {
  InvariantNameCodec,
  ProofObligations,
  type InvariantName,
  type ModelArtifacts,
} from "../../plugins/formal-model-check/tools/tla-referees.ts";
import { IdentityDigest } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import {
  FIXED_DOCKER_IMAGE,
  NodePlannerEnvironmentPort,
  selectTlcSpawnPlanner,
} from "../../plugins/formal-model-check/tools/tlc-spawn-planner.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPEC_DIR = join(REPO_ROOT, "amadeus", "spaces", "default", "specs", "tla");
const CACHE_ROOT = process.env.AMADEUS_TLA_CACHE_ROOT ?? join(tmpdir(), "amadeus-tla-referee-cache");
const DEADLINE_MS = 240_000;

if (!process.env.JAVA_HOME) throw new Error("JAVA_HOME is required and must point to OpenJDK 26.0.1");

// Two variables, declared alphabetically. TLC prints a single-variable state
// without the leading conjunction and always prints variables in alphabetical
// order, and the trace parser matches the declared order positionally.
const MODULE = [
  "---- MODULE Counter ----",
  "EXTENDS Naturals",
  "VARIABLES seen, ticks",
  "TypeOK == ticks \\in 0..3 /\\ seen \\in 0..3",
  "Init == seen = 0 /\\ ticks = 0",
  "Next == ticks' = (IF ticks < 3 THEN ticks + 1 ELSE ticks) /\\ seen' = ticks",
  "Spec == Init /\\ [][Next]_<<seen, ticks>>",
  "====",
  "",
].join("\n");

const CONFIG = ["SPECIFICATION Spec", "INVARIANT TypeOK", ""].join("\n");

const FALLING_MUTATION = {
  find: "TypeOK == ticks \\in 0..3 /\\ seen \\in 0..3",
  replace: "TypeOK == ticks \\in 0..2 /\\ seen \\in 0..3",
};

const HELPER = ["---- MODULE Helper ----", "EXTENDS Naturals", "Limit == 3", "====", ""].join("\n");
const EXTENDING_MODULE = MODULE
  .replace("EXTENDS Naturals", "EXTENDS Naturals, Helper")
  .replace("ticks \\in 0..3", "ticks \\in 0..Limit")
  .replace("IF ticks < 3", "IF ticks < Limit");

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

const roots: string[] = [];

function scratch(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

const subject = unwrap(IdentityDigest.normalizeStableId("FR-008"));
const identity = IdentityDigest.aggregateDigest([
  [subject, IdentityDigest.contentDigest(subject, "bounded counter")],
]);

function unregisteredModel(): ModelArtifacts {
  const workspaceRoot = join(scratch("amadeus-referee-real-"), "workspace");
  mkdirSync(workspaceRoot, { recursive: true });
  const modulePath = join(workspaceRoot, "Counter.tla");
  const configPath = join(workspaceRoot, "Counter.cfg");
  const reductionManifestPath = join(workspaceRoot, "Counter.reduction.json");
  writeFileSync(modulePath, MODULE, "utf8");
  writeFileSync(configPath, CONFIG, "utf8");
  writeFileSync(
    reductionManifestPath,
    JSON.stringify({
      declaredIdentity: identity,
      items: [
        {
          reductionItem: "ticks \\in 0..3",
          preservedMeaning: "unbounded tick growth is represented by four states",
          sourceSubjects: [subject],
        },
      ],
      injections: {
        TypeOK: { witness: "ticks > 0", fallingMutation: FALLING_MUTATION },
      },
    }),
    "utf8",
  );
  return { modulePath, configPath, reductionManifestPath };
}

/** Copies the registered MirrorLifecycle model and its auxiliary out of the repo. */
function registeredModel(): { modulePath: string; configPath: string } {
  const root = scratch("amadeus-referee-registered-");
  for (const name of ["MirrorLifecycle.tla", "MirrorLifecycle.cfg", "MirrorLifecycleCore.tla"]) {
    copyFileSync(join(SPEC_DIR, name), join(root, name));
  }
  return { modulePath: join(root, "MirrorLifecycle.tla"), configPath: join(root, "MirrorLifecycle.cfg") };
}

const toolchain = createRefereeToolchain({ cacheRoot: CACHE_ROOT, deadlineMs: DEADLINE_MS });

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe("the referee proves an unregistered model with real TLC", () => {
  let outcome: Awaited<ReturnType<typeof ProofObligations.evaluate>>;

  beforeAll(async () => {
    const invariants: InvariantName[] = [unwrap(InvariantNameCodec.parse("TypeOK"))];
    outcome = await ProofObligations.evaluate(unregisteredModel(), invariants, identity, toolchain);
  }, DEADLINE_MS * 3);

  test("baseline, falling mutation and vacuity witness all reach TLC", () => {
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    expect(outcome.value.tlcExploration.outcome).toBe("not-detected");
    expect(outcome.value.tlcExploration.stateStatistics.distinctStates).toBeGreaterThan(0);
    expect(outcome.value.fallingProofs.length).toBe(1);
    expect(outcome.value.vacuityProof).not.toBeUndefined();
  });

  test("no run stopped at the model receipt", () => {
    const detail = outcome.ok ? "" : JSON.stringify(outcome.error);
    expect(detail).not.toContain("MODEL_RECEIPT");
    expect(detail).not.toContain("SOURCE_IDENTITY");
  });
});

describe("the referee path also prepares a registered model", () => {
  test("MirrorLifecycle is not rejected as a receipt or source mismatch", async () => {
    const { modulePath, configPath } = registeredModel();
    let detail = "";
    try {
      await toolchain.run({ kind: "baseline", modulePath, configPath, invariant: null, mutationRef: null });
    } catch (cause) {
      detail = cause instanceof Error ? cause.message : String(cause);
    }
    expect(detail).not.toContain("MODEL_RECEIPT");
    expect(detail).not.toContain("SOURCE_IDENTITY");
  }, DEADLINE_MS * 2);
});

describe("the referee receipt stays fail-closed at preparation", () => {
  // Mirrors the referee's own plumbing so the receipt and the paths handed to
  // preparePlanned can disagree — inside run() they never can, because the
  // receipt is derived from the very files it then hands over.
  async function prepare(
    workspaceRoot: string,
    receiptPaths: { modulePath: string; configPath: string },
    runPaths: { modulePath: string; configPath: string },
    tamper: () => void = () => {},
  ): Promise<{ code: string; message: string }> {
    const described = unwrap(RefereeToolchainInternals.describeMutant(receiptPaths.modulePath, receiptPaths.configPath));
    const receipt = unwrap(createRefereeTlaModelReceipt(described.source));
    const inner = createDefaultModelCheckToolchain(join(CACHE_ROOT), workspaceRoot);
    const artifact = unwrap(await inner.acquire());
    const planner = unwrap(selectTlcSpawnPlanner(
      "auto",
      { imageRef: FIXED_DOCKER_IMAGE, jarPath: artifact.cachePath, jarSha256: artifact.actualSha256 },
      new NodePlannerEnvironmentPort(),
    ));
    tamper();
    const scratchRoot = scratch("amadeus-referee-failclosed-run-");
    const prepared = await inner.preparePlanned({
      artifact,
      modelReceipt: receipt,
      vocabulary: described.vocabulary,
      modulePath: runPaths.modulePath,
      cfgPath: runPaths.configPath,
      subjectAlias: "tla-referee-failclosed",
      deadlineMs: DEADLINE_MS,
      runId: randomUUID(),
      scratchRoot,
      planner,
    });
    if (prepared.ok) return { code: "", message: "" };
    const { error } = prepared;
    return { code: "code" in error ? error.code : error.kind, message: error.message };
  }

  function counterWorkspace(module = MODULE): { root: string; modulePath: string; configPath: string } {
    const root = scratch("amadeus-referee-failclosed-");
    const modulePath = join(root, "Counter.tla");
    const configPath = join(root, "Counter.cfg");
    writeFileSync(modulePath, module, "utf8");
    writeFileSync(configPath, CONFIG, "utf8");
    return { root, modulePath, configPath };
  }

  test("module bytes rewritten after the receipt was taken are refused", async () => {
    const { root, modulePath, configPath } = counterWorkspace();
    const failure = await prepare(root, { modulePath, configPath }, { modulePath, configPath }, () => {
      writeFileSync(modulePath, MODULE.replace("ticks \\in 0..3", "ticks \\in 0..9"), "utf8");
    });
    expect(failure.code).toBe("SOURCE_IDENTITY");
  }, DEADLINE_MS);

  test("config bytes rewritten after the receipt was taken are refused", async () => {
    const { root, modulePath, configPath } = counterWorkspace();
    const failure = await prepare(root, { modulePath, configPath }, { modulePath, configPath }, () => {
      writeFileSync(configPath, `${CONFIG}CHECK_DEADLOCK FALSE\n`, "utf8");
    });
    expect(failure.code).toBe("SOURCE_IDENTITY");
  }, DEADLINE_MS);

  test("auxiliary bytes rewritten after the receipt was taken are refused", async () => {
    const root = scratch("amadeus-referee-failclosed-aux-");
    const modulePath = join(root, "Counter.tla");
    const configPath = join(root, "Counter.cfg");
    const helperPath = join(root, "Helper.tla");
    writeFileSync(modulePath, EXTENDING_MODULE, "utf8");
    writeFileSync(configPath, CONFIG, "utf8");
    writeFileSync(helperPath, HELPER, "utf8");
    const failure = await prepare(root, { modulePath, configPath }, { modulePath, configPath }, () => {
      writeFileSync(helperPath, HELPER.replace("Limit == 3", "Limit == 9"), "utf8");
    });
    expect(failure.code).toBe("SOURCE_IDENTITY");
  }, DEADLINE_MS);

  test("a substituted path whose model name differs is refused", async () => {
    const { root, modulePath, configPath } = counterWorkspace();
    const otherPath = join(root, "Other.tla");
    copyFileSync(modulePath, otherPath);
    const failure = await prepare(root, { modulePath, configPath }, { modulePath: otherPath, configPath });
    expect(failure.code).toBe("MODEL_RECEIPT");
    expect(failure.message).toContain("model name");
  }, DEADLINE_MS);
});
