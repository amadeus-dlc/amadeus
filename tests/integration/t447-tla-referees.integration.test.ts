import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTlaAuthoring } from "../../plugins/formal-model-check/tools/tla-authoring.ts";
import {
  InvariantNameCodec,
  MutationWorkshopFs,
  ProofObligations,
  defaultProofDependencies,
} from "../../plugins/formal-model-check/tools/tla-referees.ts";
import { IdentityDigest } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import type { AggregateDigest, StableId } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import type { TlcExploration } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";
import type {
  InvariantName,
  ModelArtifacts,
  TlcRunRequest,
  TlcToolchain,
} from "../../plugins/formal-model-check/tools/tla-referees.ts";

// U3 handler pin (nfr-design/logical-components.md § 層構成): the mutation
// workshop and the manifest reader touch the real filesystem, so they live in
// the integration tier (cid:code-generation:fs-tests-integration-first). TLC
// itself stays behind the injected port — no tla2tools jar is available here,
// and mutants are unregistered by construction, so the child process is faked
// while every filesystem effect is real.

let workspace = "";

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function failure<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error(`expected failure, got ${JSON.stringify(result.value)}`);
  return result.error;
}

function subject(raw: string): StableId {
  return unwrap(IdentityDigest.normalizeStableId(raw));
}

function invariant(raw: string): InvariantName {
  return unwrap(InvariantNameCodec.parse(raw));
}

const MODULE = [
  "---- MODULE Sample ----",
  "EXTENDS Naturals, Helper",
  "VARIABLE receipts",
  "TypeOK == receipts \\in Nat",
  "Spec == receipts = 0 /\\ [][receipts' = receipts + 1]_receipts",
  "====",
  "",
].join("\n");

const HELPER_MODULE = ["---- MODULE Helper ----", "Bound == 3", "====", ""].join("\n");

const CONFIG = ["CONSTANTS", "MaxReceipts = 3", "SPECIFICATION Spec", "INVARIANT TypeOK", ""].join("\n");

const IDENTITY: AggregateDigest = IdentityDigest.aggregateDigest([
  [subject("FR-008"), IdentityDigest.contentDigest(subject("FR-008"), "body")],
]);

function writeJson(name: string, value: unknown): string {
  const path = join(workspace, name);
  writeFileSync(path, JSON.stringify(value), "utf8");
  return path;
}

function writeModel(declaredIdentity: string): ModelArtifacts {
  writeFileSync(join(workspace, "Sample.tla"), MODULE, "utf8");
  writeFileSync(join(workspace, "Helper.tla"), HELPER_MODULE, "utf8");
  writeFileSync(join(workspace, "Sample.cfg"), CONFIG, "utf8");
  const manifestPath = writeJson("Sample.reduction.json", {
    declaredIdentity,
    items: [
      {
        reductionItem: "MaxReceipts=3",
        preservedMeaning: "unbounded receipt growth is represented by three slots",
        sourceSubjects: ["FR-008"],
      },
    ],
    injections: {
      TypeOK: {
        witness: "receipts > 0",
        fallingMutation: { find: "TypeOK == receipts", replace: "TypeOK == FALSE /\\ receipts" },
      },
    },
  });
  return {
    modulePath: join(workspace, "Sample.tla"),
    configPath: join(workspace, "Sample.cfg"),
    reductionManifestPath: manifestPath,
  };
}

const COMPLETE: TlcExploration = {
  kind: "COMPLETE",
  generatedStates: 9,
  distinctStates: 4,
  statesLeftOnQueue: 0,
  searchDepth: 3,
  completionMarker: "Model checking completed. No error has been found.",
  terminationReason: "EXHAUSTED",
};

function counterexample(name: string): TlcExploration {
  return {
    kind: "COUNTEREXAMPLE",
    invariant: name,
    sourceLocation: { line: 4, column: 1 },
    trace: [],
    counterexampleIdentity: `ce-${name}`,
    generatedStates: 2,
    distinctStates: 1,
    statesLeftOnQueue: 0,
    searchDepth: 1,
  };
}

/** Records what each mutant run actually saw on disk. */
function recordingToolchain(): { toolchain: TlcToolchain; seen: Array<{ request: TlcRunRequest; module: string; config: string; helper: boolean }> } {
  const seen: Array<{ request: TlcRunRequest; module: string; config: string; helper: boolean }> = [];
  const toolchain: TlcToolchain = {
    versionLine: "TLC2 Version 2.19 (fake port)",
    run: (request) => {
      seen.push({
        request,
        module: readFileSync(request.modulePath, "utf8"),
        config: readFileSync(request.configPath, "utf8"),
        helper: existsSync(join(request.modulePath, "..", "Helper.tla")),
      });
      return Promise.resolve(request.kind === "baseline" ? COMPLETE : counterexample("probe"));
    },
  };
  return { toolchain, seen };
}

async function runAsync(
  argv: readonly string[],
  dependencies?: { readonly toolchain: TlcToolchain },
): Promise<{ exitCode: number; body: Record<string, unknown> }> {
  const lines: string[] = [];
  const exitCode = await runTlaAuthoring(argv, (line) => lines.push(line), dependencies);
  expect(lines).toHaveLength(1);
  return { exitCode, body: JSON.parse(lines[0] as string) as Record<string, unknown> };
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "tla-referees-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("tla-authoring trace (AC-005 demo)", () => {
  test("an uncovered stable ID is refused with every defect enumerated", async () => {
    const subjects = writeJson("subjects.json", ["FR-006", "FR-008"]);
    const rows = writeJson("rows.json", [
      { subject: "FR-006", invariant: "TypeOK", rationale: "typing keeps FR-006 honest" },
    ]);
    const invariants = writeJson("invariants.json", ["TypeOK", "NoDuplicateCreate"]);

    const { exitCode, body } = await runAsync([
      "trace",
      "--subjects",
      subjects,
      "--rows",
      rows,
      "--invariants",
      invariants,
    ]);

    expect(exitCode).toBe(1);
    expect(body.ok).toBe(false);
    expect(body.failure).toEqual({
      kind: "coverage-failure",
      uncoveredSubjects: ["FR-008"],
      orphanInvariants: ["NoDuplicateCreate"],
      duplicateSubjects: [],
      unresolvedRows: [],
    });
  });

  test("a non-array subjects document is a typed invariant-name failure", async () => {
    const subjects = writeJson("subjects-bad.json", { not: "an array" });
    const rows = writeJson("rows-empty.json", []);
    const invariants = writeJson("invariants-one.json", ["TypeOK"]);
    const { exitCode, body } = await runAsync([
      "trace", "--subjects", subjects, "--rows", rows, "--invariants", invariants,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("invalid-grammar");
  });

  test("a non-array rows document is a typed trace-row failure", async () => {
    const subjects = writeJson("subjects-one.json", ["FR-006"]);
    const rows = writeJson("rows-bad.json", { not: "an array" });
    const invariants = writeJson("invariants-one.json", ["TypeOK"]);
    const { exitCode, body } = await runAsync([
      "trace", "--subjects", subjects, "--rows", rows, "--invariants", invariants,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("invalid-trace-row");
  });

  test("a row missing its rationale is a typed trace-row failure naming the row", async () => {
    const subjects = writeJson("subjects-one.json", ["FR-006"]);
    const rows = writeJson("rows-broken.json", [{ subject: "FR-006", invariant: "TypeOK" }]);
    const invariants = writeJson("invariants-one.json", ["TypeOK"]);
    const { exitCode, body } = await runAsync([
      "trace", "--subjects", subjects, "--rows", rows, "--invariants", invariants,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("invalid-trace-row");
    expect(String((body.failure as { detail: string }).detail)).toContain("FR-006");
  });

  test("a non-array invariants document is a typed invariant-name failure", async () => {
    const subjects = writeJson("subjects-one.json", ["FR-006"]);
    const rows = writeJson("rows-empty2.json", []);
    const invariants = writeJson("invariants-bad.json", { not: "an array" });
    const { exitCode, body } = await runAsync([
      "trace", "--subjects", subjects, "--rows", rows, "--invariants", invariants,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("invalid-invariant-name");
  });

  test("total coverage returns the proof digests on exit 0", async () => {
    const subjects = writeJson("subjects.json", ["FR-006"]);
    const rows = writeJson("rows.json", [
      { subject: "FR-006", invariant: "TypeOK", rationale: "typing keeps FR-006 honest" },
    ]);
    const invariants = writeJson("invariants.json", ["TypeOK"]);

    const { exitCode, body } = await runAsync([
      "trace",
      "--subjects",
      subjects,
      "--rows",
      rows,
      "--invariants",
      invariants,
    ]);

    expect(exitCode).toBe(0);
    expect(body.ok).toBe(true);
    expect(body.coverage).toMatchObject({ subjectsDigest: expect.stringMatching(/^sha256:/) });
  });

  test("a malformed invariant name is a typed failure, not a crash", async () => {
    const subjects = writeJson("subjects.json", ["FR-006"]);
    const rows = writeJson("rows.json", [{ subject: "FR-006", invariant: "2Bad", rationale: "x" }]);
    const invariants = writeJson("invariants.json", ["2Bad"]);

    const { exitCode, body } = await runAsync([
      "trace",
      "--subjects",
      subjects,
      "--rows",
      rows,
      "--invariants",
      invariants,
    ]);

    expect(exitCode).toBe(1);
    expect(body.failure).toMatchObject({ kind: "invalid-invariant-name" });
  });

  test("a missing input file is reported as an io-failure", async () => {
    const rows = writeJson("rows.json", []);
    const invariants = writeJson("invariants.json", []);
    const { exitCode, body } = await runAsync([
      "trace",
      "--subjects",
      join(workspace, "absent.json"),
      "--rows",
      rows,
      "--invariants",
      invariants,
    ]);
    expect(exitCode).toBe(1);
    expect(body.failure).toMatchObject({ kind: "io-failure" });
  });

  test("omitting a required flag is a usage error", async () => {
    const { exitCode, body } = await runAsync(["trace", "--subjects", join(workspace, "subjects.json")]);
    expect(exitCode).toBe(2);
    expect(body.ok).toBe(false);
  });
});

describe("the filesystem mutation workshop", () => {
  test("mutants are built beside their dependency closure and removed after the run", async () => {
    const model = writeModel(IDENTITY);
    const { toolchain, seen } = recordingToolchain();

    const evidence = unwrap(
      await ProofObligations.evaluate(model, [invariant("TypeOK")], IDENTITY, toolchain),
    );

    expect(seen.map((entry) => entry.request.kind)).toEqual(["baseline", "falling", "vacuity"]);

    const falling = seen[1] as (typeof seen)[number];
    expect(falling.module).toContain("TypeOK == FALSE /\\ receipts");
    expect(falling.config).toContain("INVARIANT TypeOK");
    expect(falling.config).toContain("SPECIFICATION Spec");
    expect(falling.helper).toBe(true);

    const vacuity = seen[2] as (typeof seen)[number];
    expect(vacuity.module).toContain("AmadeusNotWitness_TypeOK == ~(receipts > 0)");
    expect(vacuity.config).toContain("INVARIANT AmadeusNotWitness_TypeOK");
    expect(vacuity.config).not.toContain("INVARIANT TypeOK\n");

    // Every temporary run directory is gone once the obligation is measured.
    for (const entry of seen.slice(1)) expect(existsSync(entry.request.modulePath)).toBe(false);

    expect(evidence.boundIdentity).toBe(IDENTITY);
    expect(evidence.fallingProofs).toHaveLength(1);
    expect(evidence.vacuityProof.obligations).toHaveLength(1);
    expect(evidence.reductionEvidence.items).toHaveLength(1);
    expect(evidence.tlcExploration.toolchainVersionLine).toBe("TLC2 Version 2.19 (fake port)");
  });

  test("a stale declared identity is refused against a real manifest", async () => {
    const stale = IdentityDigest.aggregateDigest([
      [subject("FR-006"), IdentityDigest.contentDigest(subject("FR-006"), "old")],
    ]);
    const model = writeModel(stale);
    const { toolchain } = recordingToolchain();

    const failed = failure(
      await ProofObligations.evaluate(model, [invariant("TypeOK")], IDENTITY, toolchain),
    );
    expect(failed.missing).toEqual(["identity-binding"]);
    expect(failed.detail).toContain("stale declaration");
  });

  test("an absent manifest reaches the decision table as a typed failure", async () => {
    const model = writeModel(IDENTITY);
    rmSync(model.reductionManifestPath);
    const { toolchain } = recordingToolchain();

    const failed = failure(
      await ProofObligations.evaluate(model, [invariant("TypeOK")], IDENTITY, toolchain),
    );
    expect(failed.missing).toContain("reduction-evidence");
    expect(failed.detail).toContain("manifest:");
  });

  test("a falling mutation whose anchor is absent leaves no temporary directory behind", async () => {
    const model = writeModel(IDENTITY);
    const before = readdirSync(tmpdir()).filter((name) => name.startsWith("amadeus-tla-mutant-")).length;
    const prepared = await MutationWorkshopFs.prepare(model, {
      kind: "falling",
      invariant: invariant("TypeOK"),
      mutation: { find: "Absent ==", replace: "x" },
    });
    expect(failure(prepared)).toMatchObject({ kind: "mutation-failure" });
    const after = readdirSync(tmpdir()).filter((name) => name.startsWith("amadeus-tla-mutant-")).length;
    expect(after).toBe(before);
  });

  test("a vacuity injection with an empty witness is a mutation failure", async () => {
    const model = writeModel(IDENTITY);
    const prepared = await MutationWorkshopFs.prepare(model, {
      kind: "vacuity",
      invariant: invariant("TypeOK"),
      witness: "   ",
    });
    expect(failure(prepared)).toMatchObject({ kind: "mutation-failure" });
    expect(String((failure(prepared) as { detail: string }).detail)).toContain("no witness declared");
  });

  test("a module without a ==== terminator refuses the vacuity probe", async () => {
    const model = writeModel(IDENTITY);
    writeFileSync(model.modulePath, "---- MODULE Sample ----\nTypeOK == receipts >= 0\n", "utf8");
    const prepared = await MutationWorkshopFs.prepare(model, {
      kind: "vacuity",
      invariant: invariant("TypeOK"),
      witness: "receipts > 0",
    });
    expect(String((failure(prepared) as { detail: string }).detail)).toContain("==== terminator");
  });

  test("a falling mutation with an empty anchor fails loudly", async () => {
    const model = writeModel(IDENTITY);
    const prepared = await MutationWorkshopFs.prepare(model, {
      kind: "falling",
      invariant: invariant("TypeOK"),
      mutation: { find: "", replace: "x" },
    });
    expect(String((failure(prepared) as { detail: string }).detail)).toContain("empty anchor");
  });

  test("an unreadable source module folds into a typed mutation failure", async () => {
    const model = writeModel(IDENTITY);
    const prepared = await MutationWorkshopFs.prepare(
      { ...model, modulePath: join(workspace, "Absent.tla") },
      { kind: "falling", invariant: invariant("TypeOK"), mutation: { find: "x", replace: "y" } },
    );
    expect(failure(prepared)).toMatchObject({ kind: "mutation-failure" });
  });

  test("an auxiliary module that vanishes for the copy is a typed failure and leaves no run dir", async () => {
    const model = writeModel(IDENTITY);
    writeFileSync(
      model.modulePath,
      "---- MODULE Sample ----\nEXTENDS Vanishing\nTypeOK == receipts >= 0\n====\n",
      "utf8",
    );
    const prepared = await MutationWorkshopFs.prepare(model, {
      kind: "falling",
      invariant: invariant("TypeOK"),
      mutation: { find: "TypeOK == receipts", replace: "TypeOK == FALSE" },
    });
    expect(failure(prepared)).toMatchObject({ kind: "mutation-failure" });
  });

  test("a manifest with a malformed item or injection is a typed manifest failure", () => {
    const badItem = writeJson("bad-item.reduction.json", { declaredIdentity: IDENTITY, items: [42] });
    expect(failure(defaultProofDependencies().readManifest(badItem)))
      .toMatchObject({ kind: "manifest-failure", detail: "a reduction item is malformed" });

    const badInjection = writeJson("bad-injection.reduction.json", {
      declaredIdentity: IDENTITY,
      items: [],
      injections: { TypeOK: 42 },
    });
    expect(String((failure(defaultProofDependencies().readManifest(badInjection)) as { detail: string }).detail))
      .toContain("injection TypeOK is malformed");
  });

  test("an absent or unparseable manifest file is a typed manifest failure", () => {
    expect(failure(defaultProofDependencies().readManifest(join(workspace, "absent.reduction.json"))))
      .toMatchObject({ kind: "manifest-failure" });
    const broken = join(workspace, "broken.reduction.json");
    writeFileSync(broken, "{ not json", "utf8");
    expect(failure(defaultProofDependencies().readManifest(broken)))
      .toMatchObject({ kind: "manifest-failure" });
  });

  test("the default dependencies read the manifest off disk", () => {
    const model = writeModel(IDENTITY);
    const manifest = unwrap(defaultProofDependencies().readManifest(model.reductionManifestPath));
    expect(manifest.declaredIdentity).toBe(IDENTITY);
    expect(Object.keys(manifest.injections)).toEqual(["TypeOK"]);
  });
});

describe("tla-authoring proof", () => {
  test("a satisfied set of obligations returns the evidence summary on exit 0", async () => {
    const model = writeModel(IDENTITY);
    const invariants = writeJson("proof-invariants.json", ["TypeOK"]);

    const { exitCode, body } = await runAsync([
      "proof",
      "--model",
      model.modulePath,
      "--cfg",
      model.configPath,
      "--reduction",
      model.reductionManifestPath,
      "--invariants",
      invariants,
      "--identity",
      IDENTITY,
    ], { toolchain: recordingToolchain().toolchain });

    expect(exitCode).toBe(0);
    expect(body.ok).toBe(true);
    expect(body.proof).toMatchObject({
      boundIdentity: IDENTITY,
      tlcExploration: { outcome: "not-detected" },
    });
  });

  test("a stale manifest identity is refused with the missing obligation enumerated", async () => {
    const stale = IdentityDigest.aggregateDigest([
      [subject("FR-006"), IdentityDigest.contentDigest(subject("FR-006"), "old")],
    ]);
    const model = writeModel(stale);
    const invariants = writeJson("proof-invariants.json", ["TypeOK"]);

    const { exitCode, body } = await runAsync([
      "proof",
      "--model",
      model.modulePath,
      "--cfg",
      model.configPath,
      "--reduction",
      model.reductionManifestPath,
      "--invariants",
      invariants,
      "--identity",
      IDENTITY,
    ], { toolchain: recordingToolchain().toolchain });

    expect(exitCode).toBe(1);
    expect(body.failure).toMatchObject({ missing: ["identity-binding"] });
  });

  test("a malformed identity flag is a usage error", async () => {
    const model = writeModel(IDENTITY);
    const invariants = writeJson("proof-invariants.json", ["TypeOK"]);
    const { exitCode } = await runAsync([
      "proof",
      "--model",
      model.modulePath,
      "--cfg",
      model.configPath,
      "--reduction",
      model.reductionManifestPath,
      "--invariants",
      invariants,
      "--identity",
      "not-a-digest",
    ], { toolchain: recordingToolchain().toolchain });
    expect(exitCode).toBe(2);
  });

  test("omitting a required flag is a usage error", async () => {
    const { exitCode } = await runAsync(["proof", "--model", join(workspace, "Sample.tla")], {
      toolchain: recordingToolchain().toolchain,
    });
    expect(exitCode).toBe(2);
  });

  test("a toolchain that cannot run is a typed failure, not a rejected promise", async () => {
    const model = writeModel(IDENTITY);
    const invariants = writeJson("proof-invariants.json", ["TypeOK"]);
    const exploding: TlcToolchain = {
      versionLine: "unavailable",
      run: () => Promise.reject(new Error("tla2tools.jar could not be acquired")),
    };

    const { exitCode, body } = await runAsync([
      "proof",
      "--model",
      model.modulePath,
      "--cfg",
      model.configPath,
      "--reduction",
      model.reductionManifestPath,
      "--invariants",
      invariants,
      "--identity",
      IDENTITY,
    ], { toolchain: exploding });

    expect(exitCode).toBe(1);
    expect(body.failure).toMatchObject({ missing: ["tlc-exploration", "falling-proof", "vacuity-proof"] });
    expect(JSON.stringify(body.failure)).toContain("could not be acquired");
  });
});

import {
  RefereeToolchainInternals,
  createRefereeToolchain,
  refereeToolchainVersionLine,
} from "../../plugins/formal-model-check/tools/tla-referee-toolchain.ts";

describe("the production referee toolchain adapter (CI-safe surface)", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "tla-referee-adapter-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeModel(name: string, source: string, cfg: string): { modulePath: string; configPath: string } {
    const modulePath = join(dir, `${name}.tla`);
    const configPath = join(dir, `${name}.cfg`);
    writeFileSync(modulePath, source, "utf8");
    writeFileSync(configPath, cfg, "utf8");
    return { modulePath, configPath };
  }

  test("describeMutant derives the receipt vocabulary from the bytes on disk", () => {
    const { modulePath, configPath } = writeModel(
      "Counter",
      "---- MODULE Counter ----\nVARIABLES x, y\nInit == x = 0 /\\ y = 0\n====\n",
      "INIT Init\nINVARIANT TypeOK\n",
    );
    const described = RefereeToolchainInternals.describeMutant(modulePath, configPath);
    if (!described.ok) throw new Error(JSON.stringify(described.error));
    expect(described.value.model.name).toBe("Counter");
    expect(described.value.vocabulary.namedInvariants).toEqual(["TypeOK"]);
    expect(described.value.vocabulary.traceStateVariables).toEqual(["x", "y"]);
    expect(described.value.source.moduleIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(described.value.model.auxiliaries).toEqual([]);
  });

  test("describeMutant resolves an auxiliary module and records its identity", () => {
    writeFileSync(join(dir, "Helper.tla"), "---- MODULE Helper ----\n====\n", "utf8");
    const { modulePath, configPath } = writeModel(
      "Main",
      "---- MODULE Main ----\nEXTENDS Helper\nVARIABLE z\n====\n",
      "INIT Init\nINVARIANT Safe\n",
    );
    const described = RefereeToolchainInternals.describeMutant(modulePath, configPath);
    if (!described.ok) throw new Error(JSON.stringify(described.error));
    expect((described.value.model.auxiliaries ?? []).map((aux) => aux.path)).toEqual([join(dir, "Helper.tla")]);
  });

  test("an unresolved auxiliary module is a typed MODULE_DEPS failure, not a throw", () => {
    const { modulePath, configPath } = writeModel(
      "Broken",
      "---- MODULE Broken ----\nEXTENDS Missing\nVARIABLE z\n====\n",
      "INIT Init\n",
    );
    const described = RefereeToolchainInternals.describeMutant(modulePath, configPath);
    expect(described.ok).toBe(false);
    if (described.ok) return;
    expect(described.error.code).toBe("MODULE_DEP_UNRESOLVED");
  });

  test("run() folds a broken mutant into a loud referee-toolchain error before any TLC work", async () => {
    const { modulePath, configPath } = writeModel(
      "Orphan",
      "---- MODULE Orphan ----\nEXTENDS Nowhere\nVARIABLE q\n====\n",
      "INIT Init\n",
    );
    const toolchain = createRefereeToolchain({ cacheRoot: join(dir, "cache") });
    await expect(toolchain.run({ kind: "baseline", modulePath, configPath, invariant: null, mutationRef: null }))
      .rejects.toThrow(/referee toolchain:/);
  });

  test("the adapter's version line names the pinned jar and the pinned JDK", () => {
    const toolchain = createRefereeToolchain();
    expect(toolchain.versionLine).toBe(refereeToolchainVersionLine());
    expect(toolchain.versionLine).toContain("tla2tools");
  });

  test("multi-invariant and VARIABLES declarations parse into the vocabulary", () => {
    expect(RefereeToolchainInternals.declaredInvariantsOf("INVARIANTS TypeOK, Safe\nINVARIANT Live\n"))
      .toEqual(["TypeOK", "Safe", "Live"]);
    expect(RefereeToolchainInternals.traceStateVariablesOf("VARIABLES a, b\n")).toEqual(["a", "b"]);
    expect(RefereeToolchainInternals.traceStateVariablesOf("no declarations here")).toEqual([]);
  });

  test("folded declaration lists keep their continuation lines and stop at the next statement", () => {
    expect(RefereeToolchainInternals.traceStateVariablesOf("VARIABLES receipts,\n          pending\nInit == TRUE\n"))
      .toEqual(["receipts", "pending"]);
    expect(RefereeToolchainInternals.declaredInvariantsOf("INVARIANT TypeOK,\n  Safe\nSPECIFICATION Spec\n"))
      .toEqual(["TypeOK", "Safe"]);
  });
});
