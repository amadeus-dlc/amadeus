// The composed-runtime driver for the U5 authoring E2E (t450).
//
// Everything that loads a module out of the COMPOSED host runs here, in a child
// process, and never in the test's own process. `bun --coverage` does not
// instrument what a child process loads, so the composed copies under the OS
// temp directory stay out of the LCOV source universe; loading them in-process
// put ~100 temp SF records into the report and diluted the project coverage
// percentage (E-TLA-U5COV, ruling A).
//
// The driver performs the run and prints ONE JSON line describing what it
// observed. Every judgement stays in the test: the driver reports values, the
// test asserts them, and the test reads the model map itself before and after
// so "the map is byte-identical" is never the driver's word for it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalIdentity } from "../../../plugins/formal-model-check/tools/canonical.ts";
import type {
  PlannedTlcOutcome,
  PreparedPlannedTlcRun,
} from "../../../plugins/formal-model-check/tools/fs-tlc-toolchain.ts";
import type {
  PlannedModelCheckToolchain,
  RunModelCheckDependencies,
  RunModelCheckResult,
} from "../../../plugins/formal-model-check/tools/run-model-check.ts";
import type { EnvReceipt } from "../../../plugins/formal-model-check/tools/run-model-check-domain.ts";
import type { VerifiedTlcArtifact } from "../../../plugins/formal-model-check/tools/tlc-toolchain.ts";

export const PLUGIN = "formal-model-check";
export const APPROVED_AT = "2026-08-05T00:00:00Z";
export const RUN_ID = "00000000-0000-4000-8000-000000000001";
export const SUBJECTS = ["FR-001", "FR-002", "AC-001"] as const;
export const INVARIANTS = ["ActiveWithinCapacity", "NoUnitLostOnSettle"] as const;
export const IMPL_PATH = "packages/framework/core/tools/amadeus-unit-pool.ts";

// The map records a domain-scoped canonical identity, not a bare file hash:
// tla-model-loader-internal.ts:93-94 pins the two domains and :231 computes
// `canonicalIdentity(source, domain).sha256` over the decoded text.
const TLA_MODULE_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const TLA_CFG_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";

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

// A registered model declares the invariants it checks and the state variables
// its traces carry; the receipt refuses a model with no declared vocabulary
// (tla-model-receipt.ts:97).
export const SEED_VOCABULARY = {
  vocabulary: { namedInvariants: ["SeedOK"], traceStateVariables: ["seeded"] },
};

const UNIT_POOL_VOCABULARY = {
  vocabulary: {
    namedInvariants: ["ActiveWithinCapacity", "NoUnitLostOnSettle"],
    traceStateVariables: ["queued", "active", "settled"],
  },
};

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

// TLC is not available in CI and the mutants are unregistered by construction,
// so the exploration is faked exactly as t447 fakes it: the baseline run
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

function digestOf(path: string, domain: string): string {
  return canonicalIdentity(readFileSync(path, "utf8"), domain).sha256;
}

/** A model-map entry whose declared identities are the bytes actually on disk. */
export function entryFor(root: string, name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
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

export function mapText(models: readonly Record<string, unknown>[]): string {
  return `${JSON.stringify({ schemaVersion: 2, models }, null, 2)}\n`;
}

/**
 * Make the composed host look like the repository the model loader resolves:
 * it walks up from the tool's own module URL for .git + package.json +
 * specs/tla, so the registered map has to live where a real workspace keeps it.
 */
export function repoLikeHost(host: string): void {
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

// ---------------------------------------------------------------------------
// Child-process side: everything below loads the COMPOSED tree
// ---------------------------------------------------------------------------

type Emitted = { exitCode: number; body: Record<string, unknown> };
type AuthoringModule = {
  runTlaAuthoring: (
    argv: readonly string[],
    emit: (line: string) => void,
    dependencies?: { readonly toolchain: unknown },
  ) => Promise<number>;
};

interface Paths {
  readonly host: string;
  readonly work: string;
  readonly store: string;
  readonly map: string;
  readonly fixture: string;
}

function composedTools(host: string): string {
  return join(host, "plugins", PLUGIN, "tools");
}

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

const REVIEW = {
  reviewer: "amadeus-architecture-reviewer-agent",
  modelAuthor: "builder-u5",
  verdict: "READY",
  reviewedAt: APPROVED_AT,
  artifactDigests: [],
};

const STUB_COVERAGE = {
  __brand: "CoverageProof",
  subjectsDigest: "s",
  rowsDigest: "r",
  invariantsDigest: "i",
};

/**
 * The existing formal-model-check, run from the COMPOSED tree over the model the
 * authoring path just registered. Only TLC itself is faked — the same seam the
 * proof referee uses — so the source loader, the map lookup, the byte pin and
 * the artifact publishing are all the real thing (FR-012, AC-007).
 */
async function runComposedModelCheck(host: string, argv: readonly string[]): Promise<RunModelCheckResult> {
  const tools = composedTools(host);
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

/** One authoring session over the composed CLI, in this child process. */
class Session {
  private constructor(
    private readonly authoring: AuthoringModule,
    private readonly paths: Paths,
  ) {}

  static async open(paths: Paths): Promise<Session> {
    // The composed copy is the module under test: an import the manifest failed
    // to declare fails here, where the canonical tree would still resolve it.
    const authoring = (await import(join(composedTools(paths.host), "tla-authoring.ts"))) as AuthoringModule;
    return new Session(authoring, paths);
  }

  write(name: string, value: unknown): string {
    const path = join(this.paths.work, name);
    writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value), "utf8");
    return path;
  }

  async run(argv: readonly string[], toolchain?: unknown): Promise<Emitted> {
    const lines: string[] = [];
    const dependencies = toolchain === undefined ? undefined : { toolchain };
    const exitCode = await this.authoring.runTlaAuthoring(argv, (line) => lines.push(line), dependencies);
    if (lines.length !== 1) throw new Error(`expected one JSON line, got ${lines.length}`);
    return { exitCode, body: JSON.parse(lines[0] as string) as Record<string, unknown> };
  }

  async ok(argv: readonly string[], toolchain?: unknown): Promise<Record<string, unknown>> {
    const emitted = await this.run(argv, toolchain);
    if (emitted.exitCode !== 0) {
      throw new Error(`${argv.join(" ")} failed: ${JSON.stringify(emitted.body)}`);
    }
    return emitted.body;
  }

  /** The model deliverables the stage document's step 2 names. */
  authorModel(): { modulePath: string; configPath: string } {
    const specs = join(this.paths.host, "specs", "tla");
    const modulePath = join(specs, "UnitPool.tla");
    const configPath = join(specs, "UnitPool.cfg");
    writeFileSync(modulePath, MODULE, "utf8");
    writeFileSync(configPath, CONFIG, "utf8");
    return { modulePath, configPath };
  }

  /** A real, verified bundle for `identity`, with the given approval part. */
  async verifiedBundle(identity: string, approval: unknown): Promise<string> {
    const receipt = { recorded: true };
    const parts = this.write("refusal-parts.json", {
      kind: "authoring-bundle",
      parts: {
        applicability: { route: "author-new", subjectIdentity: identity },
        trace: receipt,
        proof: receipt,
        review: receipt,
        approval: approval ?? receipt,
      },
    });
    const built = await this.ok([
      "bundle", "build",
      "--parts", parts,
      "--predecessor", "root",
      "--identity", identity,
      "--store", this.paths.store,
      "--generated-at", APPROVED_AT,
    ]);
    const digest = built.digest as string;
    await this.ok(["bundle", "verify", "--ref", digest, "--identity", identity, "--store", this.paths.store]);
    return digest;
  }

  async commit(draft: string, digest: string, preconditions: string): Promise<Emitted> {
    return this.run([
      "commit",
      "--draft", draft,
      "--bundle", digest,
      "--preconditions", preconditions,
      "--model-map", this.paths.map,
      "--store", this.paths.store,
    ]);
  }
}

async function scenarioMain(paths: Paths): Promise<Record<string, unknown>> {
  const session = await Session.open(paths);

  // 1. Requirements: the heading-driven grammar reads the unknown subject.
  const extracted = await session.ok([
    "identity", "extract", "--doc", paths.fixture, "--doc-kind", "requirements",
  ]);
  const sections = extracted.sections as ReadonlyArray<{ id: string }>;
  const identity = extracted.aggregateDigest as string;

  // 2. Applicability: an unregistered subject routes to author-new.
  const declaration = session.write("declaration.json", {
    subjects: [...SUBJECTS],
    kind: "new-subject",
    rationale: "the fixed Unit pool lifecycle has no registered model",
  });
  const receiptBody = await session.ok([
    "applicability", "receipt",
    "--declaration", declaration,
    "--identity", identity,
    "--approval", "none",
    "--model-map", paths.map,
    "--store", paths.store,
    "--audit-dir", paths.work,
    "--generated-at", APPROVED_AT,
  ]);
  const applicability = receiptBody.receipt as Record<string, unknown>;

  // 3. Authoring.
  const { modulePath, configPath } = session.authorModel();
  const reductionPath = session.write("UnitPool.reduction.json", manifest(identity, {}));
  const invariantsPath = session.write("invariants.json", [...INVARIANTS]);
  const subjectsPath = session.write("subjects.json", [...SUBJECTS]);
  const rowsPath = session.write("trace-rows.json", [
    { subject: "FR-001", invariant: "ActiveWithinCapacity", rationale: "capacity bound on the active set" },
    { subject: "FR-002", invariant: "NoUnitLostOnSettle", rationale: "settle moves a Unit exactly once" },
    { subject: "AC-001", invariant: "NoUnitLostOnSettle", rationale: "reconciliation conserves every Unit" },
  ]);

  // 4. Referees: real trace coverage, real proof obligations over a faked TLC.
  const traced = await session.ok([
    "trace", "--subjects", subjectsPath, "--rows", rowsPath, "--invariants", invariantsPath,
  ]);
  const coverage = traced.coverage as Record<string, unknown>;
  const proven = await session.ok(
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

  // 5. Independent review, then the human gate. The reviewer is stubbed here;
  //    the provenance boundary a stub cannot write is owned by the negative
  //    fixtures of U2 (BR-U2-24) and U4 (BR-U4-15), which prove the forged
  //    approval red — this run relies on those, it does not replace them
  //    (BR-U5-11).
  const approval = approvalIn(paths.work);

  // 6. Freshness, bundle build, bundle verify, commit.
  const compared = await session.ok(["identity", "compare", "--recorded", identity, "--current", identity]);
  const freshness = compared.comparison as Record<string, unknown>;
  const parts = session.write("parts.json", {
    kind: "authoring-bundle",
    parts: { applicability, trace: coverage, proof, review: REVIEW, approval },
  });
  const built = await session.ok([
    "bundle", "build",
    "--parts", parts,
    "--predecessor", "root",
    "--identity", identity,
    "--store", paths.store,
    "--generated-at", APPROVED_AT,
  ]);
  const digest = built.digest as string;
  await session.ok(["bundle", "verify", "--ref", digest, "--identity", identity, "--store", paths.store]);

  const draft = session.write(
    "draft.json",
    entryFor(paths.host, "UnitPool", { ...UNIT_POOL_VOCABULARY, evidenceBundle: { digest } }),
  );
  const preconditions = session.write("preconditions.json", {
    applicability,
    coverage,
    freshness,
    proof,
    review: REVIEW,
    humanApproval: approval,
  });
  const committed = await session.commit(draft, digest, preconditions);
  if (committed.exitCode !== 0) throw new Error(`commit failed: ${JSON.stringify(committed.body)}`);

  // 7. The existing formal-model-check runs the model that was just registered,
  //    reading it through the same map the commit wrote.
  const checked = await runComposedModelCheck(paths.host, [
    "--model", modulePath,
    "--cfg", configPath,
    "--out", join(paths.host, "model-check-out"),
  ]);

  // 8. The correlated verdict: the hold evaluator releases the subject.
  const series = await session.ok(["applicability", "series", "--subjects", SUBJECTS.join(",")]);
  const held = await session.ok([
    "hold",
    "--identity", identity,
    "--series", series.series as string,
    "--model-map", paths.map,
    "--store", paths.store,
  ]);

  return {
    subjects: sections.map((section) => section.id),
    route: applicability.route,
    coverageBrand: coverage.__brand,
    proofBoundIdentity: proof.boundIdentity,
    boundIdentityMatchesSubject: proof.boundIdentity === identity,
    freshnessKind: freshness.kind,
    receiptEntryName: (committed.body.receipt as Record<string, unknown>).entryName,
    modelCheck: { outcome: checked.outcome, exitCode: checked.exitCode },
    holdKind: (held.verdict as Record<string, unknown>).kind,
  };
}

async function scenarioRefereeHalt(paths: Paths): Promise<Record<string, unknown>> {
  const session = await Session.open(paths);
  const { modulePath, configPath } = session.authorModel();
  const identity = `sha256:${"1".repeat(64)}`;
  const reductionPath = session.write(
    "UnitPool.reduction.json",
    manifest(identity, { ActiveWithinCapacity: "   " }),
  );
  const invariantsPath = session.write("invariants.json", [...INVARIANTS]);

  const refused = await session.run(
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

  // Pushing past the halt is refused rather than ignored: with no proof
  // evidence to carry, the registration gate itself rejects the run.
  const digest = await session.verifiedBundle(identity, approvalIn(paths.work));
  const draft = session.write(
    "draft.json",
    entryFor(paths.host, "UnitPool", { ...UNIT_POOL_VOCABULARY, evidenceBundle: { digest } }),
  );
  const preconditions = session.write("halted-preconditions.json", {
    applicability: { route: "author-new", subjectIdentity: identity },
    coverage: STUB_COVERAGE,
    freshness: { kind: "current" },
    review: REVIEW,
    humanApproval: approvalIn(paths.work),
  });
  const committed = await session.commit(draft, digest, preconditions);

  return {
    proof: { exitCode: refused.exitCode, ok: refused.body.ok, failure: refused.body.failure },
    commit: { exitCode: committed.exitCode, failure: committed.body.failure },
  };
}

async function scenarioApprovalMissing(paths: Paths): Promise<Record<string, unknown>> {
  const session = await Session.open(paths);
  session.authorModel();
  const identity = `sha256:${"1".repeat(64)}`;
  const digest = await session.verifiedBundle(identity, null);
  const draft = session.write(
    "draft.json",
    entryFor(paths.host, "UnitPool", { ...UNIT_POOL_VOCABULARY, evidenceBundle: { digest } }),
  );
  const preconditions = session.write("preconditions.json", {
    applicability: { route: "author-new", subjectIdentity: identity },
    coverage: STUB_COVERAGE,
    freshness: { kind: "current" },
    proof: {
      tlcExploration: COMPLETE,
      fallingProofs: [],
      vacuityProof: { obligations: [] },
      reductionEvidence: { items: [] },
      boundIdentity: identity,
    },
    review: REVIEW,
  });
  const refused = await session.commit(draft, digest, preconditions);
  return { commit: { exitCode: refused.exitCode, failure: refused.body.failure } };
}

const SCENARIOS: Readonly<Record<string, (paths: Paths) => Promise<Record<string, unknown>>>> = {
  main: scenarioMain,
  "referee-halt": scenarioRefereeHalt,
  "approval-missing": scenarioApprovalMissing,
};

function flagsOf(argv: readonly string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index] as string;
    if (key.startsWith("--")) flags[key.slice(2)] = (argv[index + 1] ?? "") as string;
  }
  return flags;
}

export async function runDriver(argv: readonly string[]): Promise<string> {
  const flags = flagsOf(argv);
  const scenario = SCENARIOS[flags.scenario ?? ""];
  if (scenario === undefined) throw new Error(`unknown scenario ${flags.scenario}`);
  const paths: Paths = {
    host: flags.host as string,
    work: flags.work as string,
    store: flags.store as string,
    map: flags.map as string,
    fixture: flags.fixture as string,
  };
  return JSON.stringify(await scenario(paths));
}

if (import.meta.main) {
  process.stdout.write(`${await runDriver(process.argv.slice(2))}\n`);
}
