// tla-referees.ts — U3 authoring-referees: trace coverage (C3) and the proof
// obligations (C5). Both are referees: they evaluate and return a verdict, and
// never author a model, register one, or persist evidence (BR-U3-01).
//
// Layering (nfr-design/logical-components.md): the pure layer below owns every
// judgement (set algebra, receipt admission, the five-obligation decision
// table) and touches neither the filesystem nor a child process. The handler
// layer at the bottom owns manifest reading and the mutation workshop, and
// reaches TLC only through the injected toolchain port, whose result vocabulary
// is the existing tlc-toolchain.ts contract, unchanged (ADR-5, BR-U3-03).

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import type { Result } from "./contract.ts";
import { IdentityDigest, parseAggregateDigest, type AggregateDigest, type StableId } from "./tla-evidence.ts";
import { resolveAuxiliaryModules, type ModuleDepsError } from "./tla-module-deps.ts";
import type { TlcExploration } from "./tlc-toolchain.ts";

// ---------------------------------------------------------------------------
// C3: trace coverage vocabulary
// ---------------------------------------------------------------------------

export type InvariantName = string & { readonly __brand: "InvariantName" };

/** The TLA+ identifier grammar, the same one a `.cfg` INVARIANT line accepts. */
const INVARIANT_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface InvariantNameFailure {
  readonly kind: "invalid-invariant-name";
  readonly tokens: readonly string[];
}

export interface TraceRow {
  readonly subject: StableId;
  readonly invariant: InvariantName;
  readonly rationale: string;
}

/** Only `evaluate` mints this, so holding one is proof coverage was total. */
export interface CoverageProof {
  readonly __brand: "CoverageProof";
  readonly subjectsDigest: string;
  readonly rowsDigest: string;
  readonly invariantsDigest: string;
}

export interface CoverageFailure {
  readonly kind: "coverage-failure";
  readonly uncoveredSubjects: readonly StableId[];
  readonly orphanInvariants: readonly InvariantName[];
  readonly duplicateSubjects: readonly StableId[];
  readonly unresolvedRows: readonly TraceRow[];
}

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

function sha256Of(text: string): string {
  return `sha256:${createHash("sha256").update(new TextEncoder().encode(text)).digest("hex")}`;
}

/** Order-independent digest of a set summary, so a reordered input proves equal. */
function setDigest(entries: readonly string[]): string {
  return sha256Of([...entries].sort().join("\n"));
}

function parseInvariantName(raw: string): Result<InvariantName, InvariantNameFailure> {
  return INVARIANT_NAME_RE.test(raw)
    ? ok(raw as InvariantName)
    : err<InvariantNameFailure>({ kind: "invalid-invariant-name", tokens: [raw] });
}

function repeatedValues<T extends string>(values: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  const repeated: T[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      if (!repeated.includes(value)) repeated.push(value);
    } else seen.add(value);
  }
  return repeated;
}

function rowDigestInput(row: TraceRow): string {
  return `${row.subject}\u0000${row.invariant}\u0000${row.rationale}`;
}

/**
 * FR-006 total traceability. The four defect classes are collected
 * independently and returned together — the first defect never short-circuits
 * the rest (BR-U3-10), and a single defect withholds the proof (BR-U3-11).
 */
function evaluateCoverage(
  subjects: readonly StableId[],
  rows: readonly TraceRow[],
  declaredInvariants: readonly InvariantName[],
): Result<CoverageProof, CoverageFailure> {
  const subjectSet = new Set<string>(subjects);
  const invariantSet = new Set<string>(declaredInvariants);

  const duplicateSubjects = repeatedValues(subjects);

  // A row is unresolvable when either end fails to resolve, or when it carries
  // no rationale: an unexplained pairing is not a trace (FR-006 auditability).
  const unresolvedRows = rows.filter(
    (row) => !subjectSet.has(row.subject) || !invariantSet.has(row.invariant) || row.rationale.trim() === "",
  );

  const unresolvedSet = new Set(unresolvedRows);
  const resolved = rows.filter((row) => !unresolvedSet.has(row));
  const boundSubjects = new Set<string>(resolved.map((row) => row.subject));
  const boundInvariants = new Set<string>(resolved.map((row) => row.invariant));

  const uncoveredSubjects = [...new Set(subjects)].filter((subject) => !boundSubjects.has(subject));
  const orphanInvariants = [...new Set(declaredInvariants)].filter((name) => !boundInvariants.has(name));

  if (
    uncoveredSubjects.length > 0 ||
    orphanInvariants.length > 0 ||
    duplicateSubjects.length > 0 ||
    unresolvedRows.length > 0
  ) {
    return err<CoverageFailure>({
      kind: "coverage-failure",
      uncoveredSubjects,
      orphanInvariants,
      duplicateSubjects,
      unresolvedRows,
    });
  }

  return ok({
    __brand: "CoverageProof",
    subjectsDigest: setDigest(subjects),
    rowsDigest: setDigest(rows.map(rowDigestInput)),
    invariantsDigest: setDigest(declaredInvariants),
  } as CoverageProof);
}

export const InvariantNameCodec = {
  parse: parseInvariantName,
} as const;

export const TraceCoverage = {
  evaluate: evaluateCoverage,
} as const;

// ---------------------------------------------------------------------------
// C5: proof obligations vocabulary
// ---------------------------------------------------------------------------

export interface ModelArtifacts {
  readonly modulePath: string;
  readonly configPath: string;
  readonly reductionManifestPath: string;
}

export interface ReductionItem {
  readonly reductionItem: string;
  readonly preservedMeaning: string;
  readonly sourceSubjects: readonly StableId[];
}

/** A textual substitution the model author declares to break one invariant. */
export interface FallingMutationSpec {
  readonly find: string;
  readonly replace: string;
}

/** Per-invariant injection descriptors the reduction manifest declares. */
export interface InvariantInjection {
  readonly witness: string;
  readonly fallingMutation: FallingMutationSpec;
}

export interface ReductionManifest {
  readonly declaredIdentity: string;
  readonly items: readonly ReductionItem[];
  readonly injections: Readonly<Record<string, InvariantInjection>>;
}

export interface ManifestFailure {
  readonly kind: "manifest-failure";
  readonly detail: string;
}

export interface TlcRunReceipt {
  readonly outcome: "not-detected";
  readonly completionMarker: string;
  readonly stateStatistics: {
    readonly statesGenerated: number;
    readonly distinctStates: number;
  };
  readonly toolchainVersionLine: string;
}

export interface FallingProofReceipt {
  readonly invariant: InvariantName;
  readonly mutationRef: string;
  readonly detectedOutcome: "detected";
  readonly counterexampleIdentity: string;
}

export interface VacuityObligation {
  readonly invariant: InvariantName;
  readonly witness: string;
  readonly detectedOutcome: "witness-reachable";
  readonly counterexampleIdentity: string;
}

export interface VacuityProofReceipt {
  readonly obligations: readonly VacuityObligation[];
}

export interface ReductionEvidenceReceipt {
  readonly items: readonly ReductionItem[];
}

export interface ProofEvidence {
  readonly tlcExploration: TlcRunReceipt;
  readonly fallingProofs: readonly FallingProofReceipt[];
  readonly vacuityProof: VacuityProofReceipt;
  readonly reductionEvidence: ReductionEvidenceReceipt;
  readonly boundIdentity: AggregateDigest;
}

export type ProofObligationKind =
  | "tlc-exploration"
  | "falling-proof"
  | "vacuity-proof"
  | "reduction-evidence"
  | "identity-binding";

export interface ProofFailure {
  readonly missing: readonly ProofObligationKind[];
  readonly failedFallingInvariants: readonly InvariantName[];
  readonly failedVacuityInvariants: readonly InvariantName[];
  readonly detail: string;
}

/** The injected TLC seam. Its result vocabulary is tlc-toolchain.ts, unchanged. */
export interface TlcRunRequest {
  readonly kind: "baseline" | "falling" | "vacuity";
  readonly modulePath: string;
  readonly configPath: string;
  readonly invariant: InvariantName | null;
  readonly mutationRef: string | null;
}

export interface TlcToolchain {
  readonly versionLine: string;
  readonly run: (request: TlcRunRequest) => Promise<TlcExploration>;
}

export type MutationSpec =
  | { readonly kind: "falling"; readonly invariant: InvariantName; readonly mutation: FallingMutationSpec }
  | { readonly kind: "vacuity"; readonly invariant: InvariantName; readonly witness: string };

export interface MutationPlan {
  readonly modulePath: string;
  readonly configPath: string;
  readonly mutationRef: string;
}

export interface MutationFailure {
  readonly kind: "mutation-failure";
  readonly detail: string;
}

/** Builds and destroys the mutated model an obligation is measured against. */
export interface MutationWorkshop {
  readonly prepare: (
    model: ModelArtifacts,
    spec: MutationSpec,
  ) => Promise<Result<MutationPlan, MutationFailure>>;
  readonly discard: (plan: MutationPlan) => void;
}

export interface ProofDependencies {
  readonly workshop: MutationWorkshop;
  readonly readManifest: (path: string) => Result<ReductionManifest, ManifestFailure>;
}

// ---------------------------------------------------------------------------
// C5 pure layer: receipt admission and the mutation sources
// ---------------------------------------------------------------------------

const MODULE_TERMINATOR_RE = /^={4,}\s*$/;
const CONFIG_INVARIANT_RE = /^\s*(INVARIANT|INVARIANTS|PROPERTY|PROPERTIES)\b/;

function isFiniteCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * BR-U3-12: only a run that reached the fixed point of its declared finite
 * domain, with its completion marker and state statistics both present, is a
 * receipt. Everything else falls through to ProofFailure.
 */
function tlcRunReceiptOf(exploration: TlcExploration, versionLine: string): TlcRunReceipt | null {
  if (exploration.kind !== "COMPLETE") return null;
  // Widened to string: the port hands us whatever the toolchain reported, so a
  // hollow marker has to be rejected at runtime even though the declared type
  // narrows it to the literal completion line.
  const marker: string = exploration.completionMarker;
  if (marker === "") return null;
  if (!isFiniteCount(exploration.generatedStates) || !isFiniteCount(exploration.distinctStates)) return null;
  return {
    outcome: "not-detected",
    completionMarker: exploration.completionMarker,
    stateStatistics: {
      statesGenerated: exploration.generatedStates,
      distinctStates: exploration.distinctStates,
    },
    toolchainVersionLine: versionLine,
  };
}

/** BR-U3-13/14: the mutant has to go red, and the counterexample has to be identified. */
function fallingReceiptOf(
  invariant: InvariantName,
  mutationRef: string,
  exploration: TlcExploration,
): FallingProofReceipt | null {
  if (exploration.kind !== "COUNTEREXAMPLE" || exploration.counterexampleIdentity === "") return null;
  return { invariant, mutationRef, detectedOutcome: "detected", counterexampleIdentity: exploration.counterexampleIdentity };
}

/** BR-U3-14a: the witness is non-vacuous only when ¬witness is actually violated. */
function vacuityObligationOf(
  invariant: InvariantName,
  witness: string,
  exploration: TlcExploration,
): VacuityObligation | null {
  if (exploration.kind !== "COUNTEREXAMPLE" || exploration.counterexampleIdentity === "") return null;
  return {
    invariant,
    witness,
    detectedOutcome: "witness-reachable",
    counterexampleIdentity: exploration.counterexampleIdentity,
  };
}

/** BR-U3-15: every reduction item carries its preserved meaning and its sources, or none do. */
function reductionEvidenceOf(manifest: ReductionManifest): ReductionEvidenceReceipt | null {
  if (manifest.items.length === 0) return null;
  const complete = manifest.items.every(
    (item) => item.preservedMeaning.trim() !== "" && item.sourceSubjects.length > 0,
  );
  return complete ? { items: manifest.items } : null;
}

/** BR-U3-15a: the manifest must declare the identity it was authored against, and it must be current. */
function identityBindingOf(declaredIdentity: string, current: AggregateDigest): AggregateDigest | null {
  const declared = parseAggregateDigest(declaredIdentity);
  if (!declared.ok) return null;
  return IdentityDigest.compareIdentity(declared.value, current).kind === "current" ? current : null;
}

function vacuityProbeName(invariant: InvariantName): InvariantName {
  return `AmadeusNotWitness_${invariant}` as InvariantName;
}

/** Appends the negated-witness operator ahead of the module terminator. */
function vacuityModule(
  source: string,
  invariant: InvariantName,
  witness: string,
): Result<{ source: string; probeInvariant: InvariantName }, MutationFailure> {
  if (witness.trim() === "") {
    return err<MutationFailure>({ kind: "mutation-failure", detail: `no witness declared for ${invariant}` });
  }
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const terminator = lines.findIndex((line) => MODULE_TERMINATOR_RE.test(line));
  if (terminator < 0) {
    return err<MutationFailure>({ kind: "mutation-failure", detail: "module has no ==== terminator" });
  }
  const probeInvariant = vacuityProbeName(invariant);
  const injected = [
    ...lines.slice(0, terminator),
    `${probeInvariant} == ~(${witness})`,
    ...lines.slice(terminator),
  ];
  return ok({ source: injected.join("\n"), probeInvariant });
}

/**
 * Keeps the run's setup lines and narrows the checked invariants to one. A
 * folded declaration keeps its list on indented continuation lines, so those
 * fall with the keyword line (the adapter's extraction reads them the same
 * way) instead of surviving as orphan tokens TLC would trip over.
 */
function singleInvariantConfig(config: string, invariant: InvariantName): string {
  const kept: string[] = [];
  let dropping = false;
  for (const line of config.replace(/\r\n?/g, "\n").split("\n")) {
    if (CONFIG_INVARIANT_RE.test(line)) {
      dropping = true;
      continue;
    }
    if (dropping && /^[ \t]+\S/.test(line)) continue;
    dropping = false;
    kept.push(line);
  }
  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();
  return [...kept, `INVARIANT ${invariant}`, ""].join("\n");
}

/** The anchor must occur exactly once, so a mis-aimed mutation fails loudly instead of no-op. */
function fallingModule(source: string, mutation: FallingMutationSpec): Result<string, MutationFailure> {
  if (mutation.find === "") {
    return err<MutationFailure>({ kind: "mutation-failure", detail: "falling mutation has an empty anchor" });
  }
  const occurrences = source.split(mutation.find).length - 1;
  if (occurrences !== 1) {
    return err<MutationFailure>({
      kind: "mutation-failure",
      detail: `falling mutation anchor occurs ${occurrences} times, expected exactly 1`,
    });
  }
  return ok(source.replace(mutation.find, mutation.replace));
}

export const MutationSource = {
  vacuityModule,
  singleInvariantConfig,
  fallingModule,
  probeNameFor: vacuityProbeName,
} as const;

export const ProofReceipts = {
  tlcRunReceiptOf,
  fallingReceiptOf,
  vacuityObligationOf,
  reductionEvidenceOf,
  identityBindingOf,
} as const;

// ---------------------------------------------------------------------------
// C5 evaluation: the five-obligation decision table
// ---------------------------------------------------------------------------

interface ObligationTally {
  readonly missing: ProofObligationKind[];
  readonly failedFalling: InvariantName[];
  readonly failedVacuity: InvariantName[];
  readonly details: string[];
}

function explorationDetail(exploration: TlcExploration): string {
  if (exploration.kind === "HARNESS_ERROR") return `${exploration.kind}:${exploration.reason} ${exploration.detail}`;
  if (exploration.kind === "COUNTEREXAMPLE") return `${exploration.kind}:${exploration.invariant}`;
  return exploration.kind;
}

function causeDetail(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * The port reaches a child process, so an unavailable toolchain rejects rather
 * than returning a verdict. Failing to run is not a TLC outcome: it is folded
 * into the obligation's own failure instead of being dressed as one.
 */
async function runToolchain(
  toolchain: TlcToolchain,
  request: TlcRunRequest,
): Promise<Result<TlcExploration, MutationFailure>> {
  try {
    return ok(await toolchain.run(request));
  } catch (cause) {
    return err<MutationFailure>({ kind: "mutation-failure", detail: causeDetail(cause) });
  }
}

/** Runs one mutant end to end: build, measure, discard (BR-U3-05). */
async function measureMutant(
  model: ModelArtifacts,
  spec: MutationSpec,
  deps: ProofDependencies,
  toolchain: TlcToolchain,
): Promise<Result<{ exploration: TlcExploration; mutationRef: string }, MutationFailure>> {
  const prepared = await deps.workshop.prepare(model, spec);
  if (!prepared.ok) return prepared;
  const plan = prepared.value;
  try {
    const exploration = await runToolchain(toolchain, {
      kind: spec.kind,
      modulePath: plan.modulePath,
      configPath: plan.configPath,
      invariant: spec.invariant,
      mutationRef: plan.mutationRef,
    });
    return exploration.ok ? ok({ exploration: exploration.value, mutationRef: plan.mutationRef }) : exploration;
  } finally {
    deps.workshop.discard(plan);
  }
}

async function collectFallingProofs(
  model: ModelArtifacts,
  invariants: readonly InvariantName[],
  manifest: ReductionManifest | null,
  deps: ProofDependencies,
  toolchain: TlcToolchain,
  tally: ObligationTally,
): Promise<FallingProofReceipt[]> {
  const receipts: FallingProofReceipt[] = [];
  // Sequential by design: one temporary run directory at a time, and no TLC
  // runs piled on top of each other (nfr-design/logical-components.md).
  for (const invariant of invariants) {
    const injection = manifest === null ? undefined : injectionFor(manifest, invariant);
    if (injection === undefined) {
      tally.failedFalling.push(invariant);
      tally.details.push(`${invariant}: no falling mutation declared`);
      continue;
    }
    const measured = await measureMutant(
      model,
      { kind: "falling", invariant, mutation: injection.fallingMutation },
      deps,
      toolchain,
    );
    if (!measured.ok) {
      tally.failedFalling.push(invariant);
      tally.details.push(`${invariant}: ${measured.error.detail}`);
      continue;
    }
    const receipt = fallingReceiptOf(invariant, measured.value.mutationRef, measured.value.exploration);
    if (receipt === null) {
      tally.failedFalling.push(invariant);
      tally.details.push(`${invariant}: mutant did not go red (${explorationDetail(measured.value.exploration)})`);
      continue;
    }
    receipts.push(receipt);
  }
  return receipts;
}

async function collectVacuityObligations(
  model: ModelArtifacts,
  invariants: readonly InvariantName[],
  manifest: ReductionManifest | null,
  deps: ProofDependencies,
  toolchain: TlcToolchain,
  tally: ObligationTally,
): Promise<VacuityObligation[]> {
  const obligations: VacuityObligation[] = [];
  for (const invariant of invariants) {
    const injection = manifest === null ? undefined : injectionFor(manifest, invariant);
    if (injection === undefined || injection.witness.trim() === "") {
      tally.failedVacuity.push(invariant);
      tally.details.push(`${invariant}: no witness declared`);
      continue;
    }
    const measured = await measureMutant(
      model,
      { kind: "vacuity", invariant, witness: injection.witness },
      deps,
      toolchain,
    );
    if (!measured.ok) {
      tally.failedVacuity.push(invariant);
      tally.details.push(`${invariant}: ${measured.error.detail}`);
      continue;
    }
    const obligation = vacuityObligationOf(invariant, injection.witness, measured.value.exploration);
    if (obligation === null) {
      tally.failedVacuity.push(invariant);
      tally.details.push(
        `${invariant}: witness unreachable (${explorationDetail(measured.value.exploration)})`,
      );
      continue;
    }
    obligations.push(obligation);
  }
  return obligations;
}

// Own-property lookup keeps an invariant named "constructor" from resolving
// through the prototype chain of the manifest's injection record.
function injectionFor(manifest: ReductionManifest, invariant: InvariantName): InvariantInjection | undefined {
  return Object.hasOwn(manifest.injections, invariant) ? manifest.injections[invariant] : undefined;
}

/** Obligation 4: every reduction item carries its meaning, or the receipt is withheld. */
function takeReductionEvidence(
  manifest: ReductionManifest | null,
  tally: ObligationTally,
): ReductionEvidenceReceipt | null {
  const receipt = manifest === null ? null : reductionEvidenceOf(manifest);
  if (receipt !== null) return receipt;
  tally.missing.push("reduction-evidence");
  if (manifest !== null) tally.details.push("reduction: an item lacks preserved meaning or source subjects");
  return null;
}

/** Obligation 5: the manifest's declared identity has to match the current one. */
function takeIdentityBinding(
  manifest: ReductionManifest | null,
  identity: AggregateDigest,
  tally: ObligationTally,
): AggregateDigest | null {
  const bound = manifest === null ? null : identityBindingOf(manifest.declaredIdentity, identity);
  if (bound !== null) return bound;
  tally.missing.push("identity-binding");
  if (manifest !== null) {
    tally.details.push(
      manifest.declaredIdentity === ""
        ? "identity: the manifest declares no identity"
        : `identity: stale declaration ${manifest.declaredIdentity}`,
    );
  }
  return null;
}

/**
 * FR-008. The five obligations are independent: a failure in one never skips
 * the others, so the caller sees every missing obligation at once (BR-U3-16).
 */
async function evaluateProofObligations(
  model: ModelArtifacts,
  invariants: readonly InvariantName[],
  identity: AggregateDigest,
  toolchain: TlcToolchain,
  dependencies?: ProofDependencies,
): Promise<Result<ProofEvidence, ProofFailure>> {
  const deps = dependencies ?? defaultProofDependencies();
  const tally: ObligationTally = { missing: [], failedFalling: [], failedVacuity: [], details: [] };

  const manifestRead = deps.readManifest(model.reductionManifestPath);
  const manifest = manifestRead.ok ? manifestRead.value : null;
  if (!manifestRead.ok) tally.details.push(`manifest: ${manifestRead.error.detail}`);

  const baseline = await runToolchain(toolchain, {
    kind: "baseline",
    modulePath: model.modulePath,
    configPath: model.configPath,
    invariant: null,
    mutationRef: null,
  });
  const exploration = baseline.ok ? tlcRunReceiptOf(baseline.value, toolchain.versionLine) : null;
  if (exploration === null) {
    tally.missing.push("tlc-exploration");
    tally.details.push(
      baseline.ok ? `baseline: ${explorationDetail(baseline.value)}` : `baseline: ${baseline.error.detail}`,
    );
  }

  const fallingProofs = await collectFallingProofs(model, invariants, manifest, deps, toolchain, tally);
  if (tally.failedFalling.length > 0) tally.missing.push("falling-proof");

  const vacuityObligations = await collectVacuityObligations(model, invariants, manifest, deps, toolchain, tally);
  if (tally.failedVacuity.length > 0) tally.missing.push("vacuity-proof");

  const reductionEvidence = takeReductionEvidence(manifest, tally);
  const boundIdentity = takeIdentityBinding(manifest, identity, tally);

  if (exploration === null || reductionEvidence === null || boundIdentity === null || tally.missing.length > 0) {
    return err<ProofFailure>({
      missing: tally.missing,
      failedFallingInvariants: tally.failedFalling,
      failedVacuityInvariants: tally.failedVacuity,
      detail: tally.details.join("; "),
    });
  }

  return ok({
    tlcExploration: exploration,
    fallingProofs,
    vacuityProof: { obligations: vacuityObligations },
    reductionEvidence,
    boundIdentity,
  });
}

// ---------------------------------------------------------------------------
// C5 handler layer: manifest reading and the filesystem mutation workshop
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReductionItem(value: unknown): ReductionItem | null {
  if (!isRecord(value)) return null;
  const { reductionItem, preservedMeaning, sourceSubjects } = value;
  if (typeof reductionItem !== "string" || typeof preservedMeaning !== "string") return null;
  if (!Array.isArray(sourceSubjects) || sourceSubjects.some((id) => typeof id !== "string")) return null;
  return { reductionItem, preservedMeaning, sourceSubjects: sourceSubjects as StableId[] };
}

function parseInjection(value: unknown): InvariantInjection | null {
  if (!isRecord(value)) return null;
  const mutation = value.fallingMutation;
  if (typeof value.witness !== "string" || !isRecord(mutation)) return null;
  if (typeof mutation.find !== "string" || typeof mutation.replace !== "string") return null;
  return { witness: value.witness, fallingMutation: { find: mutation.find, replace: mutation.replace } };
}

/** Parse the manifest into the shape the decision table consumes, or fail loudly. */
function parseReductionManifest(raw: unknown): Result<ReductionManifest, ManifestFailure> {
  if (!isRecord(raw)) return err<ManifestFailure>({ kind: "manifest-failure", detail: "manifest is not an object" });
  const declaredIdentity = typeof raw.declaredIdentity === "string" ? raw.declaredIdentity : "";
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems.map(parseReductionItem);
  if (items.some((item) => item === null)) {
    return err<ManifestFailure>({ kind: "manifest-failure", detail: "a reduction item is malformed" });
  }
  const injections: Record<string, InvariantInjection> = Object.create(null);
  if (isRecord(raw.injections)) {
    for (const [name, value] of Object.entries(raw.injections)) {
      const injection = parseInjection(value);
      if (injection === null) {
        return err<ManifestFailure>({ kind: "manifest-failure", detail: `injection ${name} is malformed` });
      }
      injections[name] = injection;
    }
  }
  return ok({ declaredIdentity, items: items as ReductionItem[], injections });
}

function readReductionManifest(path: string): Result<ReductionManifest, ManifestFailure> {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return err<ManifestFailure>({ kind: "manifest-failure", detail });
  }
  try {
    return parseReductionManifest(JSON.parse(text) as unknown);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return err<ManifestFailure>({ kind: "manifest-failure", detail });
  }
}

function moduleNameOf(modulePath: string): string {
  return basename(modulePath).replace(/\.tla$/, "");
}

function mutationFailure(detail: string): Result<never, MutationFailure> {
  return err<MutationFailure>({ kind: "mutation-failure", detail });
}

/** Copies the module's dependency closure so the mutant compiles in isolation. */
function copyAuxiliaryModules(sourceDir: string, runDir: string, moduleName: string): MutationFailure | null {
  const readModule = (name: string): Result<string, ModuleDepsError> => {
    const path = join(sourceDir, `${name}.tla`);
    try {
      return { ok: true, value: readFileSync(path, "utf8") };
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: "MODULE_DEPS",
          code: "MODULE_DEP_UNRESOLVED",
          relativePath: path,
          detail: cause instanceof Error ? cause.message : String(cause),
        },
      };
    }
  };
  const resolved = resolveAuxiliaryModules(moduleName, readModule);
  if (!resolved.ok) return { kind: "mutation-failure", detail: resolved.error.detail };
  for (const name of resolved.value) {
    cpSync(join(sourceDir, `${name}.tla`), join(runDir, `${name}.tla`));
  }
  return null;
}

function prepareMutation(model: ModelArtifacts, spec: MutationSpec): Result<MutationPlan, MutationFailure> {
  let source: string;
  let config: string;
  try {
    source = readFileSync(model.modulePath, "utf8");
    config = readFileSync(model.configPath, "utf8");
  } catch (cause) {
    return mutationFailure(cause instanceof Error ? cause.message : String(cause));
  }

  const moduleName = moduleNameOf(model.modulePath);
  const built =
    spec.kind === "falling"
      ? (() => {
          const mutated = fallingModule(source, spec.mutation);
          return mutated.ok
            ? ok({ source: mutated.value, checked: spec.invariant })
            : err<MutationFailure>(mutated.error);
        })()
      : (() => {
          const probe = vacuityModule(source, spec.invariant, spec.witness);
          return probe.ok
            ? ok({ source: probe.value.source, checked: probe.value.probeInvariant })
            : err<MutationFailure>(probe.error);
        })();
  if (!built.ok) return built;

  // The run directory lives outside the repository, so a crashed run can never
  // leave a mutant beside the canonical spec (security-design.md § 攻撃面).
  const runDir = mkdtempSync(join(tmpdir(), "amadeus-tla-mutant-"));
  const modulePath = join(runDir, `${moduleName}.tla`);
  const configPath = join(runDir, `${moduleName}.cfg`);
  try {
    writeFileSync(modulePath, built.value.source, "utf8");
    writeFileSync(configPath, singleInvariantConfig(config, built.value.checked), "utf8");
    const copyFailure = copyAuxiliaryModules(dirname(model.modulePath), runDir, moduleName);
    if (copyFailure !== null) {
      rmSync(runDir, { recursive: true, force: true });
      return err<MutationFailure>(copyFailure);
    }
  } catch (cause) {
    rmSync(runDir, { recursive: true, force: true });
    return mutationFailure(cause instanceof Error ? cause.message : String(cause));
  }

  return ok({
    modulePath,
    configPath,
    mutationRef: `${spec.kind}:${spec.invariant}:${sha256Of(built.value.source)}`,
  });
}

function discardMutation(plan: MutationPlan): void {
  const runDir = dirname(plan.modulePath);
  if (existsSync(runDir)) rmSync(runDir, { recursive: true, force: true });
}

export const MutationWorkshopFs: MutationWorkshop = {
  prepare: (model, spec) => Promise.resolve(prepareMutation(model, spec)),
  discard: discardMutation,
};

export function defaultProofDependencies(): ProofDependencies {
  return { workshop: MutationWorkshopFs, readManifest: readReductionManifest };
}

export const ProofObligations = {
  evaluate: evaluateProofObligations,
  parseManifest: parseReductionManifest,
} as const;
