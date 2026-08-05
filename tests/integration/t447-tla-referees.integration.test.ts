import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

function run(argv: readonly string[]): { exitCode: number; body: Record<string, unknown> } {
  const lines: string[] = [];
  const exitCode = runTlaAuthoring(argv, (line) => lines.push(line));
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
  test("an uncovered stable ID is refused with every defect enumerated", () => {
    const subjects = writeJson("subjects.json", ["FR-006", "FR-008"]);
    const rows = writeJson("rows.json", [
      { subject: "FR-006", invariant: "TypeOK", rationale: "typing keeps FR-006 honest" },
    ]);
    const invariants = writeJson("invariants.json", ["TypeOK", "NoDuplicateCreate"]);

    const { exitCode, body } = run([
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

  test("total coverage returns the proof digests on exit 0", () => {
    const subjects = writeJson("subjects.json", ["FR-006"]);
    const rows = writeJson("rows.json", [
      { subject: "FR-006", invariant: "TypeOK", rationale: "typing keeps FR-006 honest" },
    ]);
    const invariants = writeJson("invariants.json", ["TypeOK"]);

    const { exitCode, body } = run([
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

  test("a malformed invariant name is a typed failure, not a crash", () => {
    const subjects = writeJson("subjects.json", ["FR-006"]);
    const rows = writeJson("rows.json", [{ subject: "FR-006", invariant: "2Bad", rationale: "x" }]);
    const invariants = writeJson("invariants.json", ["2Bad"]);

    const { exitCode, body } = run([
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

  test("a missing input file is reported as an io-failure", () => {
    const rows = writeJson("rows.json", []);
    const invariants = writeJson("invariants.json", []);
    const { exitCode, body } = run([
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

  test("omitting a required flag is a usage error", () => {
    const { exitCode, body } = run(["trace", "--subjects", join(workspace, "subjects.json")]);
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
    const prepared = await MutationWorkshopFs.prepare(model, {
      kind: "falling",
      invariant: invariant("TypeOK"),
      mutation: { find: "Absent ==", replace: "x" },
    });
    expect(failure(prepared)).toMatchObject({ kind: "mutation-failure" });
  });

  test("the default dependencies read the manifest off disk", () => {
    const model = writeModel(IDENTITY);
    const manifest = unwrap(defaultProofDependencies().readManifest(model.reductionManifestPath));
    expect(manifest.declaredIdentity).toBe(IDENTITY);
    expect(Object.keys(manifest.injections)).toEqual(["TypeOK"]);
  });
});
