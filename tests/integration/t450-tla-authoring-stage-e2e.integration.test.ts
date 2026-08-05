// covers: file:plugins/formal-model-check/stages/tla-authoring.md, file:plugins/formal-model-check/tools/tla-authoring.ts
//
// U5 authoring-stage-e2e (intent 260804-tla-authoring). Two things live here:
//
//   (a) the C7 stage document contract — the shipped stage file carries the six
//       procedure sections of functional-design/domain-entities.md § AuthoringStageDoc
//       and lands in a composed host (BR-U5-07, BR-U5-13)
//   (b) the FR-012 end-to-end path on an unknown subject (the swarm unit-pool
//       lifecycle): requirements -> applicability -> authoring -> referees ->
//       independent review -> human gate -> bundle -> registration -> the
//       existing formal-model-check over the model just registered -> the
//       correlated hold release, plus the two fail-closed arms of BR-U5-14
//
// The composed host is made repository-like (.git + package.json + specs/tla)
// because the model loader resolves its workspace by walking up from its own
// module URL: the map the authoring path registers into is therefore the same
// map the checker reads.
//
// Every path runs against the COMPOSED runtime — the plugin is composed into a
// throwaway host from the shipped neutral bundle and driven from there, so a
// module the manifest fails to declare surfaces as a real import failure rather
// than passing on the canonical tree (BR-U5-09). Real FS + a real compose, so
// this is an integration test (cid:code-generation:fs-tests-integration-first).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import {
  applyPluginPlan,
  createNodeBackend,
  createNodeLock,
  discoverPlugins,
  type HostSnapshot,
  inspectPlugin,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { parseStageFrontmatter } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import type {
  PlannedTlcOutcome,
  PreparedPlannedTlcRun,
} from "../../plugins/formal-model-check/tools/fs-tlc-toolchain.ts";
import type {
  PlannedModelCheckToolchain,
  RunModelCheckDependencies,
  RunModelCheckResult,
} from "../../plugins/formal-model-check/tools/run-model-check.ts";
import type { EnvReceipt } from "../../plugins/formal-model-check/tools/run-model-check-domain.ts";
import type { VerifiedTlcArtifact } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const BUNDLE_ROOT = join(REPO_ROOT, "dist", "plugins");
const PLUGIN = "formal-model-check";
const STAGE_SLUG = "tla-authoring";
const STAGE_LANDING = `plugins/${PLUGIN}/stages/${STAGE_SLUG}.md`;

const tempDirs: string[] = [];

function freshDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// The composed-area read model the compose engine inspects. Mirrors the helper
// in t-formal-verif-plugin-lifecycle: the plugin owns its whole subtree, so the
// snapshot walks it rather than probing one known path.
function hostSnapshot(root: string, backend: WorkspaceBackend): HostSnapshot {
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  const walk = (dir: string): void => {
    for (const name of [...readdirSync(dir)].sort()) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else {
        const rel = relative(root, abs).split(sep).join("/");
        paths.add(rel);
        files.set(rel, readFileSync(abs));
      }
    }
  };
  const composed = join(root, "plugins");
  if (existsSync(composed)) walk(composed);
  return { stages: new Map(), paths, files, composition: backend.readComposition() };
}

function transaction(root: string, backend: WorkspaceBackend): WorkspaceTransaction {
  let counter = 0;
  return {
    backend,
    verify: () => ({ ok: true }),
    lock: createNodeLock(root),
    newTxnId: () => `txn-${++counter}`,
  };
}

/** Compose the shipped neutral bundle into a throwaway host and return its root. */
function composedHost(): string {
  const host = freshDir("tla-authoring-host-");
  const backend = createNodeBackend(host);
  const descriptor = discoverPlugins(BUNDLE_ROOT).find((plugin) => plugin.name === PLUGIN);
  expect(descriptor, `${PLUGIN} must be discoverable in dist/plugins`).toBeDefined();
  const inspected = inspectPlugin(descriptor as NonNullable<typeof descriptor>, hostSnapshot(host, backend));
  expect(inspected.kind, JSON.stringify(inspected)).toBe("ready");
  if (inspected.kind !== "ready") throw new Error("plugin is not ready to compose");
  expect(applyPluginPlan(inspected.plan, transaction(host, backend)).kind).toBe("committed");
  return host;
}

describe("the authoring stage document (BR-U5-07, BR-U5-13)", () => {
  let stageText = "";

  beforeEach(() => {
    stageText = readFileSync(join(REPO_ROOT, STAGE_LANDING), "utf8");
  });

  test("the plugin manifest declares the stage at the path the compose walk reads", () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "plugins", PLUGIN, "plugin.json"), "utf8")) as {
      stages: ReadonlyArray<{ slug: string; path: string }>;
    };
    expect(manifest.stages).toContainEqual({ slug: STAGE_SLUG, path: `stages/${STAGE_SLUG}.md` });
  });

  test("the frontmatter keeps the opt-in plugin shape", () => {
    const frontmatter = parseStageFrontmatter(stageText) as Record<string, unknown>;
    expect(frontmatter.slug).toBe(STAGE_SLUG);
    expect(frontmatter.phase).toBe("construction");
    expect(frontmatter.scopes ?? []).toEqual([]);
    expect(frontmatter.execution).toBe("CONDITIONAL");
    expect(frontmatter.mode).toBe("inline");
  });

  test("the six procedure sections stand 1:1 with the functional design's contract table", () => {
    const headings = stageText
      .split("\n")
      .filter((line) => line.startsWith("### "))
      .map((line) => line.replace(/^###\s+/, ""));
    expect(headings).toEqual([
      "1. Receive the route",
      "2. Author or revise the model",
      "3. Run the referees",
      "4. Independent review",
      "5. Human gate",
      "6. Register",
    ]);
  });

  test("the registration section spells out build -> verify -> commit", () => {
    const registration = stageText.slice(stageText.indexOf("### 6. Register"));
    const invocations = ["bundle build", "bundle verify", "commit"].map((verb) => `tla-authoring.ts ${verb}`);
    const order = invocations.map((verb) => registration.indexOf(verb));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(registration).toContain("VerifiedBundle");
  });

  test("the terminal-route refusal is declared as the functional design's own addition", () => {
    const receiving = stageText.slice(stageText.indexOf("### 1. Receive the route"));
    expect(receiving).toContain("ADR-7");
    expect(receiving).toContain("impl-only");
    expect(receiving).toContain("non-target");
  });

  test("each step states how it fails closed", () => {
    expect(stageText).toContain("halt");
    expect(stageText).toContain("NOT-READY");
    expect(stageText).toContain("read-only");
    expect(stageText).toContain("modelAuthor");
    expect(stageText).toContain("vacuity witness");
    expect(stageText).toContain("declaredIdentity");
  });

  test("the composed host lands the stage where the compile's plugin walk looks", () => {
    const host = composedHost();
    expect(existsSync(join(host, STAGE_LANDING))).toBe(true);
    expect(readFileSync(join(host, STAGE_LANDING), "utf8")).toEqual(stageText);
  });
});

// ---------------------------------------------------------------------------
// FR-012: the whole authoring path on an unknown subject, composed runtime only
// ---------------------------------------------------------------------------

const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "tla-authoring-unit-pool", "requirements.md");
const APPROVED_AT = "2026-08-05T00:00:00Z";
const RUN_ID = "00000000-0000-4000-8000-000000000001";
const SUBJECTS = ["FR-001", "FR-002", "AC-001"] as const;
const INVARIANTS = ["ActiveWithinCapacity", "NoUnitLostOnSettle"] as const;

type Emitted = { exitCode: number; body: Record<string, unknown> };
type AuthoringModule = {
  runTlaAuthoring: (
    argv: readonly string[],
    emit: (line: string) => void,
    dependencies?: { readonly toolchain: unknown },
  ) => Promise<number>;
};

// TLC is not available in CI and the mutants are unregistered by construction,
// so the child process is faked exactly as t447 fakes it: the baseline run
// explores completely, every probe run reports the counterexample the mutation
// was authored to produce. Every filesystem effect around it is real.
const COMPLETE = {
  kind: "COMPLETE",
  generatedStates: 12,
  distinctStates: 6,
  statesLeftOnQueue: 0,
  searchDepth: 4,
  completionMarker: "Model checking completed. No error has been found.",
  terminationReason: "EXHAUSTED",
};

function fakeToolchain(): { versionLine: string; run: (request: { kind: string }) => Promise<unknown> } {
  return {
    versionLine: "TLC2 Version 2.19 (fake port)",
    run: (request) =>
      Promise.resolve(
        request.kind === "baseline"
          ? COMPLETE
          : {
              kind: "COUNTEREXAMPLE",
              invariant: "probe",
              sourceLocation: { line: 5, column: 1 },
              trace: [],
              counterexampleIdentity: "ce-probe",
              generatedStates: 3,
              distinctStates: 2,
              statesLeftOnQueue: 0,
              searchDepth: 1,
            },
      ),
  };
}

// The map a registration lands in is never empty — the validator refuses an
// empty model list — so the fixture starts from one already-registered model,
// with real bytes on disk, and the run must leave it untouched.
const SEED_MODULE = [
  "---- MODULE Seed ----",
  "EXTENDS Naturals",
  "VARIABLE seeded",
  "SeedOK == seeded \\in Nat",
  "Spec == seeded = 0 /\\ [][seeded' = seeded]_seeded",
  "====",
  "",
].join("\n");

const SEED_CONFIG = ["SPECIFICATION Spec", "INVARIANT SeedOK", ""].join("\n");

const IMPL_PATH = "packages/framework/core/tools/amadeus-unit-pool.ts";

// A registered model declares the invariants it checks and the state variables
// its traces carry; the receipt refuses a model with no declared vocabulary
// (tla-model-receipt.ts:97).
const SEED_VOCABULARY = {
  vocabulary: { namedInvariants: ["SeedOK"], traceStateVariables: ["seeded"] },
};
const UNIT_POOL_VOCABULARY = {
  vocabulary: {
    namedInvariants: ["ActiveWithinCapacity", "NoUnitLostOnSettle"],
    traceStateVariables: ["queued", "active", "settled"],
  },
};

// The map records a domain-scoped canonical identity, not a bare file hash:
// tla-model-loader-internal.ts:93-94 pins the two domains and :231 computes
// `canonicalIdentity(source, domain).sha256` over the decoded text.
const TLA_MODULE_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const TLA_CFG_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";

function digestOf(path: string, domain: string): string {
  return canonicalIdentity(readFileSync(path, "utf8"), domain).sha256;
}

/** A model-map entry whose declared identities are the bytes actually on disk. */
function entryFor(root: string, name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name,
    model: {
      path: `specs/tla/${name}.tla`,
      identity: digestOf(join(root, "specs", "tla", `${name}.tla`), TLA_MODULE_DOMAIN),
    },
    cfg: {
      path: `specs/tla/${name}.cfg`,
      identity: digestOf(join(root, "specs", "tla", `${name}.cfg`), TLA_CFG_DOMAIN),
    },
    entries: [
      {
        implPath: IMPL_PATH,
        sha256: Bun.CryptoHasher.hash("sha256", readFileSync(join(root, IMPL_PATH)), "hex"),
      },
    ],
    ...extra,
  };
}

function mapText(models: readonly Record<string, unknown>[]): string {
  return `${JSON.stringify({ schemaVersion: 2, models }, null, 2)}\n`;
}

/**
 * Make the composed host look like the repository the model loader resolves:
 * it walks up from the tool's own module URL for .git + package.json +
 * specs/tla, so the registered map has to live where a real workspace keeps it.
 */
function repoLikeHost(host: string): void {
  mkdirSync(join(host, ".git"), { recursive: true });
  writeFileSync(join(host, "package.json"), '{"name":"e2e-host"}\n');
  // Every model-map entry names an implementation the loader hashes, and the
  // loader confines those paths to packages/framework/core/tools.
  mkdirSync(join(host, "packages", "framework", "core", "tools"), { recursive: true });
  writeFileSync(join(host, IMPL_PATH), "export const unitPool = 'fixture';\n");
  mkdirSync(join(host, "specs", "tla"), { recursive: true });
  writeFileSync(join(host, "specs", "tla", "Seed.tla"), SEED_MODULE);
  writeFileSync(join(host, "specs", "tla", "Seed.cfg"), SEED_CONFIG);
}

const MODULE = [
  "---- MODULE UnitPool ----",
  "EXTENDS Naturals",
  "CONSTANT Capacity",
  "VARIABLES queued, active, settled",
  "ActiveWithinCapacity == active =< Capacity",
  "NoUnitLostOnSettle == queued + active + settled = 3",
  "Init == queued = 3 /\\ active = 0 /\\ settled = 0",
  "Acquire == active < Capacity /\\ queued > 0",
  "Settle == active > 0",
  "Next == Acquire \\/ Settle",
  "Spec == Init /\\ [][Next]_<<queued, active, settled>>",
  "====",
  "",
].join("\n");

const CONFIG = [
  "CONSTANTS Capacity = 2",
  "SPECIFICATION Spec",
  "INVARIANT ActiveWithinCapacity",
  "INVARIANT NoUnitLostOnSettle",
  "",
].join("\n");

/** The reduction manifest step 2 of the stage document requires. */
function manifest(identity: string, witnesses: Record<string, string>): Record<string, unknown> {
  return {
    declaredIdentity: identity,
    items: [
      {
        reductionItem: "Capacity=2",
        preservedMeaning: "an unbounded concurrency limit is represented by two slots",
        sourceSubjects: ["FR-001"],
      },
    ],
    injections: {
      ActiveWithinCapacity: {
        witness: witnesses.ActiveWithinCapacity ?? "active > 0",
        fallingMutation: {
          find: "ActiveWithinCapacity == active",
          replace: "ActiveWithinCapacity == FALSE /\\ active",
        },
      },
      NoUnitLostOnSettle: {
        witness: witnesses.NoUnitLostOnSettle ?? "settled > 0",
        fallingMutation: {
          find: "NoUnitLostOnSettle == queued",
          replace: "NoUnitLostOnSettle == FALSE /\\ queued",
        },
      },
    },
  };
}

/** A real audit shard line the human-gate provenance check can resolve. */
function approvalIn(root: string): Record<string, unknown> {
  const line = JSON.stringify({
    timestamp: APPROVED_AT,
    eventName: "amadeus.human.turn",
    attributes: { Event: "HUMAN_TURN" },
  });
  const shard = join(root, "shard.jsonl");
  writeFileSync(shard, `${line}\n`);
  return { shard, timestamp: APPROVED_AT, eventIdentity: Bun.CryptoHasher.hash("sha256", line, "hex") };
}

/**
 * The existing formal-model-check, run from the COMPOSED tree over the model the
 * authoring path just registered. Only TLC itself is faked — the same seam the
 * proof referee uses above — so the source loader, the map lookup, the byte pin
 * and the artifact publishing are all the real thing (FR-012, AC-007).
 */
async function runComposedModelCheck(host: string, argv: readonly string[]): Promise<RunModelCheckResult> {
  const tools = join(host, "plugins", PLUGIN, "tools");
  const load = async (name: string): Promise<Record<string, unknown>> =>
    (await import(join(tools, name))) as Record<string, unknown>;
  const check = await load("run-model-check.ts");
  const paths = await load("run-model-check-paths.ts");
  const execution = await load("run-model-check-execution.ts");
  const artifacts = await load("run-model-check-artifacts.ts");
  const reporter = await load("run-model-check-reporter.ts");
  const tlc = await load("tlc-toolchain.ts");

  const artifact = {
    kind: "VerifiedTlcArtifact",
    descriptorIdentity: tlc.FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    actualSha256: (tlc.FIXED_TLC_ARTIFACT_DESCRIPTOR as { sha256: string }).sha256,
    byteLength: 1,
    cachePath: join(host, ".fixture-cache", "tla2tools.jar"),
    receiptIdentity: "c".repeat(64),
  } as unknown as VerifiedTlcArtifact;
  const receipt: EnvReceipt = {
    schema: "amadeus.env-receipt.v1",
    runId: RUN_ID,
    planner: "e2e-fixture",
    inspections: [
      { id: "image-digest", status: "passed", expected: "image", observed: "image", reason: "" },
      { id: "jar-sha256", status: "passed", expected: "jar", observed: "jar", reason: "" },
      { id: "network-deny", status: "passed", expected: "none", observed: "none", reason: "" },
      { id: "jdk-snapshot", status: "not-applicable", expected: null, observed: null, reason: "fixture" },
      { id: "sandbox-profile", status: "not-applicable", expected: null, observed: null, reason: "fixture" },
    ],
  };
  const outcome: PlannedTlcOutcome = {
    exploration: COMPLETE as PlannedTlcOutcome["exploration"],
    environmentReceipt: receipt,
    raw: {
      exitCode: 0,
      signal: null,
      stdoutChunks: [new TextEncoder().encode("fixture-tlc")],
      stderrChunks: [],
      stdoutIdentity: "a".repeat(64),
      stderrIdentity: "b".repeat(64),
      startedAtMs: 0,
      finishedAtMs: 1,
      timedOut: false,
      outputLimitExceeded: false,
    },
  };
  const toolchain: PlannedModelCheckToolchain = {
    acquire: () => Promise.resolve({ ok: true, value: artifact }),
    preparePlanned: (input) =>
      Promise.resolve({
        ok: true,
        value: {
          ...input,
          cwd: host,
          standardModuleDirectory: join(input.scratchRoot, ".tlc-stdlib"),
          manifestArgv: [],
          environmentSnapshot: {
            kind: "DOCKER",
            plannerIdentity: "fixture",
            imageRef: "image",
            jarSha256: artifact.actualSha256,
          },
          environment: { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", TZ: "UTC" },
        } as PreparedPlannedTlcRun,
      }),
    runPlanned: () => Promise.resolve({ ok: true, value: outcome }),
  };
  let second = 0;
  const dependencies = {
    randomUuid: () => RUN_ID,
    utcNow: () => `2026-08-05T00:00:0${second++}.000Z`,
    platform: process.platform,
    environment: {
      inspectDarwin: () => Promise.reject(new Error("not used")),
      inspectDocker: () => Promise.reject(new Error("not used")),
    },
    filesystem: paths.NODE_RUN_MODEL_CHECK_FILESYSTEM,
    publisher: execution.DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER,
    reserveArtifacts: artifacts.beginModelCheckArtifacts,
    createToolchain: () => toolchain,
    reporter: new (reporter.StderrModelCheckReporter as new (emit: (line: string) => void) => unknown)(() => {}),
  } as unknown as RunModelCheckDependencies;

  const run = check.runModelCheck as (
    argv: readonly string[],
    dependencies: RunModelCheckDependencies,
  ) => Promise<RunModelCheckResult>;
  return run(argv, dependencies);
}

describe("the authoring path end to end on an unknown subject (FR-012, BR-U5-08/09)", () => {
  let host = "";
  let work = "";
  let store = "";
  let mapPath = "";
  let authoring: AuthoringModule;

  function write(name: string, value: unknown): string {
    const path = join(work, name);
    writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value), "utf8");
    return path;
  }

  async function run(argv: readonly string[], toolchain?: unknown): Promise<Emitted> {
    const lines: string[] = [];
    const dependencies = toolchain === undefined ? undefined : { toolchain };
    const exitCode = await authoring.runTlaAuthoring(argv, (line) => lines.push(line), dependencies);
    expect(lines).toHaveLength(1);
    return { exitCode, body: JSON.parse(lines[0] as string) as Record<string, unknown> };
  }

  async function ok(argv: readonly string[], toolchain?: unknown): Promise<Record<string, unknown>> {
    const emitted = await run(argv, toolchain);
    expect(emitted.exitCode, JSON.stringify(emitted.body)).toBe(0);
    return emitted.body;
  }

  // A real, verified bundle for `identity`. The refusal arms need one so the
  // run reaches the precondition gate instead of stopping at bundle verification.
  async function verifiedBundle(identity: string, approval: unknown): Promise<string> {
    const receipt = { recorded: true };
    const parts = write("refusal-parts.json", {
      kind: "authoring-bundle",
      parts: {
        applicability: { route: "author-new", subjectIdentity: identity },
        trace: receipt,
        proof: receipt,
        review: receipt,
        approval: approval ?? receipt,
      },
    });
    const built = await ok([
      "bundle", "build",
      "--parts", parts,
      "--predecessor", "root",
      "--identity", identity,
      "--store", store,
      "--generated-at", APPROVED_AT,
    ]);
    const digest = built.digest as string;
    await ok(["bundle", "verify", "--ref", digest, "--identity", identity, "--store", store]);
    return digest;
  }

  beforeEach(async () => {
    host = composedHost();
    repoLikeHost(host);
    work = freshDir("tla-authoring-work-");
    store = join(work, "evidence");
    mapPath = join(host, "specs", "tla", "model-map.json");
    writeFileSync(mapPath, mapText([entryFor(host, "Seed", SEED_VOCABULARY)]), "utf8");
    // The composed copy is the module under test: an import the manifest failed
    // to declare fails here, where the canonical tree would still resolve it.
    authoring = (await import(join(host, "plugins", PLUGIN, "tools", "tla-authoring.ts"))) as AuthoringModule;
  });

  test("requirements -> registration -> hold release, every step on the composed runtime", async () => {
    // 1. Requirements: the heading-driven grammar reads the unknown subject.
    const extracted = await ok(["identity", "extract", "--doc", FIXTURE, "--doc-kind", "requirements"]);
    const sections = extracted.sections as ReadonlyArray<{ id: string }>;
    expect(sections.map((section) => section.id)).toEqual([...SUBJECTS]);
    const identity = extracted.aggregateDigest as string;

    // 2. Applicability: an unregistered subject routes to author-new.
    const declaration = write("declaration.json", {
      subjects: [...SUBJECTS],
      kind: "new-subject",
      rationale: "the fixed Unit pool lifecycle has no registered model",
    });
    const receiptBody = await ok([
      "applicability", "receipt",
      "--declaration", declaration,
      "--identity", identity,
      "--approval", "none",
      "--model-map", mapPath,
      "--store", store,
      "--audit-dir", work,
      "--generated-at", APPROVED_AT,
    ]);
    const applicability = receiptBody.receipt as Record<string, unknown>;
    expect(applicability.route).toBe("author-new");

    // 3. Authoring: the deliverables the stage document's step 2 names.
    const specs = join(host, "specs", "tla");
    const modulePath = join(specs, "UnitPool.tla");
    const configPath = join(specs, "UnitPool.cfg");
    writeFileSync(modulePath, MODULE, "utf8");
    writeFileSync(configPath, CONFIG, "utf8");
    const reductionPath = write("UnitPool.reduction.json", manifest(identity, {}));
    const invariantsPath = write("invariants.json", [...INVARIANTS]);
    const subjectsPath = write("subjects.json", [...SUBJECTS]);
    const rowsPath = write("trace-rows.json", [
      { subject: "FR-001", invariant: "ActiveWithinCapacity", rationale: "capacity bound on the active set" },
      { subject: "FR-002", invariant: "NoUnitLostOnSettle", rationale: "settle moves a Unit exactly once" },
      { subject: "AC-001", invariant: "NoUnitLostOnSettle", rationale: "reconciliation conserves every Unit" },
    ]);

    // 4. Referees: real trace coverage, real proof obligations over a faked TLC.
    const traced = await ok(["trace", "--subjects", subjectsPath, "--rows", rowsPath, "--invariants", invariantsPath]);
    const coverage = traced.coverage as Record<string, unknown>;
    expect(coverage.__brand).toBe("CoverageProof");

    const proven = await ok(
      [
        "proof",
        "--model", modulePath,
        "--cfg", configPath,
        "--reduction", reductionPath,
        "--invariants", invariantsPath,
        "--identity", identity,
      ],
      fakeToolchain(),
    );
    const proof = proven.proof as Record<string, unknown>;
    expect(proof.boundIdentity).toBe(identity);

    // 5. Independent review, then the human gate. The reviewer is stubbed here;
    //    the provenance boundary a stub cannot write is owned by the negative
    //    fixtures of U2 (BR-U2-24) and U4 (BR-U4-15), which prove the forged
    //    approval red — this test relies on those, it does not replace them
    //    (BR-U5-11).
    const review = {
      reviewer: "amadeus-architecture-reviewer-agent",
      modelAuthor: "builder-u5",
      verdict: "READY",
      reviewedAt: APPROVED_AT,
      artifactDigests: [],
    };
    const approval = approvalIn(work);

    // 6. Freshness, bundle build, bundle verify, commit.
    const compared = await ok(["identity", "compare", "--recorded", identity, "--current", identity]);
    const freshness = compared.comparison as Record<string, unknown>;
    expect(freshness.kind).toBe("current");

    const parts = write("parts.json", {
      kind: "authoring-bundle",
      parts: { applicability, trace: coverage, proof, review, approval },
    });
    const built = await ok([
      "bundle", "build",
      "--parts", parts,
      "--predecessor", "root",
      "--identity", identity,
      "--store", store,
      "--generated-at", APPROVED_AT,
    ]);
    const digest = built.digest as string;
    await ok(["bundle", "verify", "--ref", digest, "--identity", identity, "--store", store]);

    const draft = write("draft.json", entryFor(host, "UnitPool", { ...UNIT_POOL_VOCABULARY, evidenceBundle: { digest } }));
    const preconditions = write("preconditions.json", {
      applicability,
      coverage,
      freshness,
      proof,
      review,
      humanApproval: approval,
    });
    const committed = await ok([
      "commit",
      "--draft", draft,
      "--bundle", digest,
      "--preconditions", preconditions,
      "--model-map", mapPath,
      "--store", store,
    ]);
    expect((committed.receipt as Record<string, unknown>).entryName).toBe("UnitPool");

    // 7. The registered model is checked by the existing formal-model-check,
    //    and the correlated verdict follows: the hold evaluator releases the
    //    subject the run started from.
    const registered = JSON.parse(readFileSync(mapPath, "utf8")) as { models: ReadonlyArray<{ name: string }> };
    expect(registered.models.map((model) => model.name)).toEqual(["Seed", "UnitPool"]);

    // The existing formal-model-check runs the model that was just registered,
    // reading it through the same map the commit wrote.
    const checked = await runComposedModelCheck(host, [
      "--model", modulePath,
      "--cfg", configPath,
      "--out", join(host, "model-check-out"),
    ]);
    expect(checked.outcome, JSON.stringify(checked.outcome)).toMatchObject({ kind: "NOT_DETECTED" });
    expect(checked.exitCode).toBe(0);

    const series = await ok(["applicability", "series", "--subjects", SUBJECTS.join(",")]);
    const held = await ok([
      "hold",
      "--identity", identity,
      "--series", series.series as string,
      "--model-map", mapPath,
      "--store", store,
    ]);
    expect((held.verdict as Record<string, unknown>).kind).toBe("no-hold");
  });

  test("the composed CLI resolves its whole import closure as a real process", () => {
    const cli = join(host, "plugins", PLUGIN, "tools", "tla-authoring.ts");
    const spawned = spawnSync(process.execPath, [cli, "identity", "extract", "--doc", FIXTURE, "--doc-kind", "requirements"], {
      encoding: "utf8",
    });
    expect(spawned.stderr).not.toContain("Cannot find module");
    expect(spawned.status).toBe(0);
    const body = JSON.parse(spawned.stdout.trim()) as { sections: ReadonlyArray<{ id: string }> };
    expect(body.sections.map((section) => section.id)).toEqual([...SUBJECTS]);
  });

  test("a manifest with no vacuity witness halts at the referee, before any registration", async () => {
    const specs = join(host, "specs", "tla");
    const modulePath = join(specs, "UnitPool.tla");
    const configPath = join(specs, "UnitPool.cfg");
    writeFileSync(modulePath, MODULE, "utf8");
    writeFileSync(configPath, CONFIG, "utf8");
    const identity = `sha256:${"1".repeat(64)}`;
    const reductionPath = write(
      "UnitPool.reduction.json",
      manifest(identity, { ActiveWithinCapacity: "   " }),
    );
    const invariantsPath = write("invariants.json", [...INVARIANTS]);
    const before = readFileSync(mapPath, "utf8");

    const refused = await run(
      [
        "proof",
        "--model", modulePath,
        "--cfg", configPath,
        "--reduction", reductionPath,
        "--invariants", invariantsPath,
        "--identity", identity,
      ],
      fakeToolchain(),
    );

    expect(refused.exitCode).toBe(1);
    expect(refused.body.ok).toBe(false);
    // The halt names the missing witness, not just "something failed".
    expect(JSON.stringify(refused.body.failure)).toContain("no witness declared");

    // Pushing past the halt is refused rather than ignored: with no proof
    // evidence to carry, the registration gate itself rejects the run. This is
    // the active check — "the map is unchanged" alone holds trivially for a
    // path that never calls commit.
    const digest = await verifiedBundle(identity, approvalIn(work));
    const draft = write("draft.json", entryFor(host, "UnitPool", { ...UNIT_POOL_VOCABULARY, evidenceBundle: { digest } }));
    const preconditions = write("halted-preconditions.json", {
      applicability: { route: "author-new", subjectIdentity: identity },
      coverage: { __brand: "CoverageProof", subjectsDigest: "s", rowsDigest: "r", invariantsDigest: "i" },
      freshness: { kind: "current" },
      review: {
        reviewer: "amadeus-architecture-reviewer-agent",
        modelAuthor: "builder-u5",
        verdict: "READY",
        reviewedAt: APPROVED_AT,
        artifactDigests: [],
      },
      humanApproval: approvalIn(work),
    });
    const committed = await run([
      "commit",
      "--draft", draft,
      "--bundle", digest,
      "--preconditions", preconditions,
      "--model-map", mapPath,
      "--store", store,
    ]);

    expect(committed.exitCode).toBe(1);
    const failure = committed.body.failure as { kind: string; failures: ReadonlyArray<Record<string, string>> };
    expect(failure.kind).toBe("preconditions-failed");
    expect(failure.failures).toContainEqual({ kind: "precondition-missing", precondition: "proof" });
    expect(readFileSync(mapPath, "utf8")).toEqual(before);
  });

  test("a run with no human approval is refused at registration and leaves the map intact", async () => {
    const before = readFileSync(mapPath, "utf8");
    const identity = `sha256:${"1".repeat(64)}`;
    const digest = await verifiedBundle(identity, null);
    writeFileSync(join(host, "specs", "tla", "UnitPool.tla"), MODULE, "utf8");
    writeFileSync(join(host, "specs", "tla", "UnitPool.cfg"), CONFIG, "utf8");
    const draft = write("draft.json", entryFor(host, "UnitPool", { ...UNIT_POOL_VOCABULARY, evidenceBundle: { digest } }));
    const preconditions = write("preconditions.json", {
      applicability: { route: "author-new", subjectIdentity: identity },
      coverage: { __brand: "CoverageProof", subjectsDigest: "s", rowsDigest: "r", invariantsDigest: "i" },
      freshness: { kind: "current" },
      proof: {
        tlcExploration: COMPLETE,
        fallingProofs: [],
        vacuityProof: { obligations: [] },
        reductionEvidence: { items: [] },
        boundIdentity: identity,
      },
      review: {
        reviewer: "amadeus-architecture-reviewer-agent",
        modelAuthor: "builder-u5",
        verdict: "READY",
        reviewedAt: APPROVED_AT,
        artifactDigests: [],
      },
    });

    const refused = await run([
      "commit",
      "--draft", draft,
      "--bundle", digest,
      "--preconditions", preconditions,
      "--model-map", mapPath,
      "--store", store,
    ]);

    expect(refused.exitCode).toBe(1);
    const error = refused.body.failure as { kind: string; failures: ReadonlyArray<{ kind: string }> };
    expect(error.kind).toBe("preconditions-failed");
    expect(error.failures.map((failure) => failure.kind)).toContain("approval-provenance-invalid");
    expect(readFileSync(mapPath, "utf8")).toEqual(before);
  });
});
