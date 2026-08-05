import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  activeIntent,
  activeIntentUuid,
  auditBlockField,
  auditFilePath,
  auditShardName,
  docsRoot,
  findAllEvents,
  isPlainObject,
  splitAuditRecords,
  withAuditLock,
  writeFileAtomic,
} from "./amadeus-lib.ts";
import { renderAdvisoryChoiceQuestion } from "./amadeus-directive.ts";
import {
  advisoriesForHost,
  declaredFormalCheckArgv,
  isDeclaredAdvisoryCode,
  isKnownAdvisoryCode,
  resolveArgvTokens,
  type RunEvaluator,
} from "./amadeus-advisory-declaration.ts";
import {
  ACTIVATION_WATCH_GLOBS,
  recordActivationVerdict,
  type Advisory,
  type AdvisoryCode,
} from "./amadeus-plugin-activation.ts";
import type {
  AutoDecisionRecord,
  DecisionBasisKind,
  EffectClassification,
  createInteractionOccurrence as CreateInteractionOccurrence,
} from "./amadeus-intent-autonomy.ts";
import type {
  AutonomyDecisionResult,
  IntentAutonomyTransaction,
} from "./amadeus-intent-autonomy-runtime.ts";
import type { readIntentAutonomyTransactionsFromAudit as ReadAutonomyTransactions } from "./amadeus-intent-autonomy-replay.ts";
import type { commitProductionQuestionDecision as CommitQuestionDecision } from "./amadeus-intent-autonomy-production.ts";

// The autonomy stack is reached only on the unattended paths (C16's ruling and
// the auto arm of acceptance). The UserPromptSubmit mint hook imports THIS
// module on every human prompt and has a sub-300ms budget, so those modules are
// required at the call rather than at load: types above are erased, and the
// three bindings below cost nothing until an advisory is actually resolved.
function autonomyModule(): { createInteractionOccurrence: typeof CreateInteractionOccurrence } {
  return require("./amadeus-intent-autonomy.ts");
}

function autonomyReplayModule(): { readIntentAutonomyTransactionsFromAudit: typeof ReadAutonomyTransactions } {
  return require("./amadeus-intent-autonomy-replay.ts");
}

function autonomyProductionModule(): { commitProductionQuestionDecision: typeof CommitQuestionDecision } {
  return require("./amadeus-intent-autonomy-production.ts");
}

export const ADVISORY_CHOICE_OPTIONS = [
  { choice: "run-now", label: "今すぐ実行する" },
  { choice: "defer-with-risk", label: "リスクを承知して延期する" },
] as const;

export type AdvisoryChoice = (typeof ADVISORY_CHOICE_OPTIONS)[number]["choice"];

export type AdvisoryIdentity = {
  plugin: string;
  code: AdvisoryCode;
  checkpoint: string;
  target: string;
  specIdentity: string;
  intentRun: string;
  advisoryInstance: string;
};

export type PendingAdvisory = {
  schema: 1;
  identity: AdvisoryIdentity;
  message: string;
  createdAt: string;
  closedAt?: string;
};

export type HumanTurnProvenance = {
  timestamp: string;
  shard: string;
  eventIdentity: string;
};

// How a receipt earned the right to exist. ONE acceptance function reads this
// union (#2253 FR-ADV-3): there is no second implementation for the unattended
// route, only a second arm. Each arm carries exactly what its own three
// acceptance checks (grounding, single-spend, presentation) consume — nothing
// decorative.
//
// `phase` and `graphRevision` on the auto arm are NOT trusted assertions: both
// are digest inputs of the occurrence id, so a caller that misstates either one
// produces an occurrence id that cannot match the AUTO_DECIDED record the
// journal holds, and acceptance refuses. That is what binds a decision to THIS
// advisory instance rather than to any decision the ladder ever made.
export type AdvisoryChoiceProvenance =
  | {
      kind: "human-turn";
      timestamp: string;
      shard: string;
      eventIdentity: string;
    }
  | {
      kind: "auto-decision";
      decisionId: string;
      basisKind: DecisionBasisKind;
      basisFingerprint: string;
      projectionRevision: number;
      phase: string;
      graphRevision: string;
    };

export type AdvisoryChoiceReceipt = {
  schema: 2;
  identity: AdvisoryIdentity;
  choice: AdvisoryChoice;
  provenance: AdvisoryChoiceProvenance;
  recordedAt: string;
  revokedAt?: string;
  revocationReason?: "misattributed-unpresented-choice";
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export type AdvisoryHoldVerdict =
  | { kind: "resolved"; receipts: AdvisoryChoiceReceipt[] }
  | { kind: "run-required"; pending: PendingAdvisory[]; receipts: AdvisoryChoiceReceipt[] }
  | { kind: "hold"; unresolved: PendingAdvisory[] };

export type AdvisoryChoiceStore = {
  schema: 2;
  pending: PendingAdvisory[];
  receipts: AdvisoryChoiceReceipt[];
};

export type AdvisoryChoiceDirectiveItem = {
  plugin: string;
  code: AdvisoryCode;
  message: string;
  checkpoint: string;
  target: string;
  spec_identity: string;
  intent_run: string;
  advisory_instance: string;
  result?: string;
};

export type AdvisoryFormalCheckRoute = {
  stage: "formal-model-check";
  command: string;
  output_dir: string;
  target: string;
  spec_identity: string;
  advisory_instance: string;
};

export type AdvisoryChoiceGuardResult =
  | { kind: "allow" }
  | {
      kind: "hold";
      stage: string;
      advisories: AdvisoryChoiceDirectiveItem[];
      runRequired: boolean;
      formalChecks: AdvisoryFormalCheckRoute[];
    };

const STORE_FILE = ".amadeus-advisory-choice.json";
const MODEL_CHECK_DIR = ".amadeus-advisory-check";
const CHOICES = new Set<string>(ADVISORY_CHOICE_OPTIONS.map((option) => option.choice));
// The three activation kinds plus any plugin-declared slug (ADR-6 revision).
// Validation lives in the declaration parser so both sides read one rule.

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

export function advisoryModelCheckOutputDir(
  projectDir: string,
  advisoryInstance: string,
  attempt = 1,
): string {
  const safeInstance = advisoryInstance.replace(/[^A-Za-z0-9._-]+/g, "-");
  const suffix = attempt <= 1 ? "" : `-retry-${attempt}`;
  return join(docsRoot(projectDir), MODEL_CHECK_DIR, `${safeInstance}${suffix}`);
}

export type AdvisoryModelCheckVerdict =
  | { kind: "not-run"; reason: string }
  | { kind: "verified-not-detected"; runId: string }
  | { kind: "detected"; runId: string; counterexampleIdentity: string }
  | { kind: "harness-error"; runId: string; code: string; detail: string }
  | { kind: "invalid"; reason: string };

function digestFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function safeProjectFile(projectDir: string, candidate: unknown): string | null {
  if (!nonEmptyString(candidate) || isAbsolute(candidate) || candidate.includes("\\")) return null;
  const path = resolve(projectDir, candidate);
  const rel = relative(resolve(projectDir), path);
  if (rel === "" || rel === ".." || rel.startsWith("../")) return null;
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink() ? path : null;
  } catch {
    return null;
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function artifactDirectory(projectDir: string, pending: PendingAdvisory, attempt: number): string | null {
  const requested = advisoryModelCheckOutputDir(projectDir, pending.identity.advisoryInstance, attempt);
  if (existsSync(join(requested, "manifest.json"))) return requested;
  const parent = join(docsRoot(projectDir), MODEL_CHECK_DIR);
  if (!existsSync(parent)) return null;
  const prefix = `${pending.identity.advisoryInstance}.failure-`;
  const failures = readdirSync(parent)
    .filter((name) => name.startsWith(prefix) && existsSync(join(parent, name, "manifest.json")))
    .sort();
  return failures.length === 0 ? null : join(parent, failures.at(-1)!);
}

function invalid(reason: string): AdvisoryModelCheckVerdict {
  return { kind: "invalid", reason };
}

function manifestEnvelopeProblem(manifest: Record<string, unknown>, pending: PendingAdvisory): string | null {
  if (manifest.schema !== "amadeus.model-check-manifest.v1") return "manifest schema is invalid";
  if (!nonEmptyString(manifest.runId)) return "manifest has no run ID";
  if (manifest.partial !== (manifest.outcome === "HARNESS_ERROR")) {
    return "manifest partial flag does not match its outcome";
  }
  const correlation = manifest.advisory;
  if (!isPlainObject(correlation)) return "manifest advisory correlation does not match the pending instance";
  if (correlation.target !== pending.identity.target) {
    return "manifest advisory correlation does not match the pending instance";
  }
  if (correlation.specIdentity !== pending.identity.specIdentity) {
    return "manifest advisory correlation does not match the pending instance";
  }
  if (correlation.instance !== pending.identity.advisoryInstance) {
    return "manifest advisory correlation does not match the pending instance";
  }
  return null;
}

function sourceProvenanceProblem(
  projectDir: string,
  pending: PendingAdvisory,
  manifest: Record<string, unknown>,
): string | null {
  const provenance = manifest.sourceProvenance;
  if (!isPlainObject(provenance)) return "source provenance is missing";
  const modelPath = safeProjectFile(projectDir, provenance.modelPath);
  const cfgPath = safeProjectFile(projectDir, provenance.cfgPath);
  if (modelPath === null || cfgPath === null) {
    return "source provenance does not match current model/config bytes";
  }
  if (!String(provenance.modelPath).startsWith(`${pending.identity.target}/`)) {
    return "source provenance does not match current model/config bytes";
  }
  if (!String(provenance.cfgPath).startsWith(`${pending.identity.target}/`)) {
    return "source provenance does not match current model/config bytes";
  }
  if (!nonEmptyString(provenance.moduleIdentity) || !nonEmptyString(provenance.cfgIdentity)) {
    return "source provenance does not match current model/config bytes";
  }
  if (provenance.moduleSha256 !== digestFile(modelPath)) {
    return "source provenance does not match current model/config bytes";
  }
  if (provenance.cfgSha256 !== digestFile(cfgPath)) {
    return "source provenance does not match current model/config bytes";
  }
  return null;
}

function artifactInventoryProblem(directory: string, manifest: Record<string, unknown>): string | null {
  if (!Array.isArray(manifest.expectedArtifacts) || !Array.isArray(manifest.artifacts)) {
    return "artifact inventory is missing";
  }
  for (const name of manifest.expectedArtifacts) {
    if (!nonEmptyString(name) || name.includes("/") || name.includes("\\")) {
      return "artifact path is unsafe";
    }
    const recorded = manifest.artifacts.find((item) => isPlainObject(item) && item.path === name);
    const path = join(directory, name);
    if (!isPlainObject(recorded) || !existsSync(path)) return `artifact evidence is invalid: ${name}`;
    if (recorded.bytes !== readFileSync(path).byteLength) return `artifact evidence is invalid: ${name}`;
    if (recorded.sha256 !== digestFile(path)) return `artifact evidence is invalid: ${name}`;
  }
  return null;
}

function verifyNotDetected(directory: string, manifest: Record<string, unknown>): AdvisoryModelCheckVerdict {
  if (manifest.exitCode !== 0 || !(manifest.expectedArtifacts as unknown[]).includes("completion-marker.json")) {
    return invalid("NOT_DETECTED manifest is incomplete");
  }
  const marker = readJson(join(directory, "completion-marker.json"));
  const receipt = readJson(join(directory, "env-receipt.json"));
  if (!isPlainObject(marker) || marker.complete !== true || marker.runId !== manifest.runId) {
    return invalid("completion marker is invalid");
  }
  if (!isPlainObject(receipt) || receipt.schema !== "amadeus.env-receipt.v1") {
    return invalid("environment provenance is invalid");
  }
  if (receipt.runId !== manifest.runId || !Array.isArray(receipt.inspections)) {
    return invalid("environment provenance is invalid");
  }
  if (receipt.inspections.some((item) =>
    !isPlainObject(item) || (item.status !== "passed" && item.status !== "not-applicable")
  )) return invalid("environment provenance is invalid");
  return { kind: "verified-not-detected", runId: manifest.runId as string };
}

function verifyDetected(directory: string, manifest: Record<string, unknown>): AdvisoryModelCheckVerdict {
  if (manifest.exitCode !== 1 || !(manifest.expectedArtifacts as unknown[]).includes("counterexample.json")) {
    return invalid("DETECTED manifest has no counterexample evidence");
  }
  const counterexample = readJson(join(directory, "counterexample.json"));
  if (!isPlainObject(counterexample) || counterexample.runId !== manifest.runId) {
    return invalid("counterexample evidence is invalid");
  }
  if (!nonEmptyString(counterexample.counterexampleIdentity)) {
    return invalid("counterexample evidence is invalid");
  }
  return {
    kind: "detected",
    runId: manifest.runId as string,
    counterexampleIdentity: counterexample.counterexampleIdentity,
  };
}

function verifyHarnessError(manifest: Record<string, unknown>): AdvisoryModelCheckVerdict {
  if (manifest.exitCode !== 2 || !nonEmptyString(manifest.errorCode)) {
    return invalid("HARNESS_ERROR evidence is invalid");
  }
  if (typeof manifest.errorDetail !== "string") return invalid("HARNESS_ERROR evidence is invalid");
  return {
    kind: "harness-error",
    runId: manifest.runId as string,
    code: manifest.errorCode,
    detail: manifest.errorDetail,
  };
}

export function verifyAdvisoryModelCheckOutcome(
  projectDir: string,
  pending: PendingAdvisory,
  attempt = 1,
): AdvisoryModelCheckVerdict {
  const directory = artifactDirectory(projectDir, pending, attempt);
  if (directory === null) return { kind: "not-run", reason: "formal model check artifacts are missing" };
  try {
    const manifest = readJson(join(directory, "manifest.json"));
    if (!isPlainObject(manifest)) return invalid("manifest schema is invalid");
    const envelopeProblem = manifestEnvelopeProblem(manifest, pending);
    if (envelopeProblem !== null) return invalid(envelopeProblem);
    const provenanceProblem = sourceProvenanceProblem(projectDir, pending, manifest);
    if (provenanceProblem !== null) return invalid(provenanceProblem);
    const inventoryProblem = artifactInventoryProblem(directory, manifest);
    if (inventoryProblem !== null) return invalid(inventoryProblem);
    if (manifest.outcome === "NOT_DETECTED") return verifyNotDetected(directory, manifest);
    if (manifest.outcome === "DETECTED") return verifyDetected(directory, manifest);
    if (manifest.outcome === "HARNESS_ERROR") return verifyHarnessError(manifest);
    return invalid("manifest outcome is invalid");
  } catch (error) {
    return invalid(`model check evidence is unreadable: ${String(error)}`);
  }
}

function parseIdentity(value: unknown): ParseResult<AdvisoryIdentity> {
  if (!isPlainObject(value)) return { ok: false, reason: "identity must be an object" };
  const required = [
    "plugin",
    "checkpoint",
    "target",
    "specIdentity",
    "intentRun",
    "advisoryInstance",
  ] as const;
  for (const key of required) {
    if (!nonEmptyString(value[key])) return { ok: false, reason: `identity.${key} must be a non-empty string` };
  }
  if (!nonEmptyString(value.code) || !isKnownAdvisoryCode(value.code)) {
    return { ok: false, reason: "identity.code is invalid" };
  }
  return { ok: true, value: value as unknown as AdvisoryIdentity };
}

function provenanceProblem(value: unknown): string | null {
  if (!isPlainObject(value)) return "provenance must be an object";
  if (value.kind === "human-turn") {
    if (!nonEmptyString(value.timestamp) || Number.isNaN(Date.parse(value.timestamp))) {
      return "provenance.timestamp is invalid";
    }
    if (!nonEmptyString(value.shard)) return "provenance.shard is invalid";
    return nonEmptyString(value.eventIdentity) ? null : "provenance.eventIdentity is invalid";
  }
  if (value.kind !== "auto-decision") return "provenance kind is invalid";
  if (!nonEmptyString(value.decisionId)) return "provenance.decisionId is invalid";
  if (!nonEmptyString(value.basisKind)) return "provenance.basisKind is invalid";
  if (!nonEmptyString(value.basisFingerprint)) return "provenance.basisFingerprint is invalid";
  if (typeof value.projectionRevision !== "number" || !Number.isInteger(value.projectionRevision)) {
    return "provenance.projectionRevision is invalid";
  }
  if (!nonEmptyString(value.phase)) return "provenance.phase is invalid";
  return nonEmptyString(value.graphRevision) ? null : "provenance.graphRevision is invalid";
}

export function parseAdvisoryChoiceReceipt(value: unknown): ParseResult<AdvisoryChoiceReceipt> {
  if (!isPlainObject(value) || value.schema !== 2) return { ok: false, reason: "receipt schema is invalid" };
  const identity = parseIdentity(value.identity);
  if (!identity.ok) return identity;
  if (!nonEmptyString(value.choice) || !CHOICES.has(value.choice)) {
    return { ok: false, reason: "receipt choice is invalid" };
  }
  const provenance = provenanceProblem(value.provenance);
  if (provenance !== null) return { ok: false, reason: provenance };
  if (!nonEmptyString(value.recordedAt) || Number.isNaN(Date.parse(value.recordedAt))) {
    return { ok: false, reason: "recordedAt is invalid" };
  }
  const revocationProblem = receiptRevocationProblem(value);
  if (revocationProblem !== null) return { ok: false, reason: revocationProblem };
  return { ok: true, value: value as unknown as AdvisoryChoiceReceipt };
}

function receiptRevocationProblem(value: Record<string, unknown>): string | null {
  if ((value.revokedAt === undefined) !== (value.revocationReason === undefined)) {
    return "receipt revocation fields must appear together";
  }
  if (value.revokedAt === undefined) return null;
  if (!nonEmptyString(value.revokedAt) || Number.isNaN(Date.parse(value.revokedAt))) {
    return "revokedAt is invalid";
  }
  return value.revocationReason === "misattributed-unpresented-choice"
    ? null
    : "revocationReason is invalid";
}

export function createPendingAdvisory(
  input: Omit<AdvisoryIdentity, "advisoryInstance"> & { message: string },
  instanceFactory: () => string = randomUUID,
  now: string = new Date().toISOString(),
): PendingAdvisory {
  const { message, ...identity } = input;
  return {
    schema: 1,
    identity: { ...identity, advisoryInstance: instanceFactory() },
    message,
    createdAt: now,
  };
}

// --- C16: the unattended resolution of an advisory choice (#2253) ---
//
// An advisory choice is mapped onto the EXISTING `question` interaction kind
// rather than a new one (ADR-6): the ladder, the audit codec, the review queue
// and the scope vocabulary all keep working unchanged. What makes two raises of
// the same advisory distinct is the advisory INSTANCE, carried in both the
// interaction id and the selector.

export function advisoryInteractionId(identity: AdvisoryIdentity): string {
  return `advisory-${identity.advisoryInstance}`;
}

export function advisorySelector(identity: AdvisoryIdentity): string {
  return `advisory:${identity.plugin}:${identity.code}:${identity.advisoryInstance}`;
}

// FR-ADV-4, PRIMARY mechanism: a run-required advisory offers ONE option, so
// `defer-with-risk` is not something the unattended route declines to pick — it
// is not in the space it picks from. The human route's two-option presentation
// (ADVISORY_CHOICE_OPTIONS) is untouched.
export function advisoryChoiceOptionIds(runRequired: boolean): readonly string[] {
  return runRequired ? ["run-now"] : ["run-now", "defer-with-risk"];
}

// FR-ADV-4, SECONDARY mechanism: deferring past a raised advisory waives a
// quality signal, and `quality-waiver` is a prohibited effect classification, so
// even a ladder that somehow selected it would be refused at effect
// authorization (amadeus-intent-autonomy.ts authorizeDecisionEffect /
// SemiAuthority.authorizeEffect, both of which admit `workflow-reversible`
// only). Two independent barriers, each with its own falsification.
export const ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS: Readonly<Record<AdvisoryChoice, EffectClassification>> = {
  "run-now": "workflow-reversible",
  "defer-with-risk": "quality-waiver",
};

// --- C17: the acceptance predicates the unattended provenance has to clear ---

// Grounding, part one: what the journal actually decided. A receipt's own claim
// about a decision id proves nothing; only an AUTO_DECIDED record committed to
// the audit trail does.
export function autoDecisionsFromTransactions(
  transactions: readonly IntentAutonomyTransaction[],
): readonly AutoDecisionRecord[] {
  return transactions.flatMap((transaction) =>
    transaction.events.flatMap((event) => (event.type === "AUTO_DECIDED" ? [event.decision] : []))
  );
}

// Presentation, unattended side. The human route asks "was this advisory shown
// to the human in this turn?"; the unattended route asks the same question of
// the ladder: is the decision the journal holds the decision for THIS advisory
// instance? The occurrence id is a digest over the interaction id — which
// carries the instance — and over the phase and graph revision, so a decision
// made about anything else cannot be pointed at this advisory by asserting it.
export function advisoryOccurrenceMatchesDecision(input: {
  readonly intentUuid: string;
  readonly identity: AdvisoryIdentity;
  readonly decision: AutoDecisionRecord;
  readonly phase: string;
  readonly graphRevision: string;
}): boolean {
  try {
    return autonomyModule().createInteractionOccurrence({
      intentUuid: input.intentUuid,
      kind: "question",
      stage: input.identity.checkpoint,
      phase: input.phase,
      bolt: null,
      interactionId: advisoryInteractionId(input.identity),
      selector: advisorySelector(input.identity),
      question: input.decision.question,
      optionIds: input.decision.optionIds,
      graphRevision: input.graphRevision,
    }).occurrenceId === input.decision.occurrenceId;
  } catch {
    return false;
  }
}

// Single spend, both provenance kinds through one key. A human turn is spent by
// its (shard, event) pair; a ladder decision by its decision id. The keys live
// in disjoint namespaces, so one kind can never consume the other's budget.
function provenanceSpendKey(provenance: AdvisoryChoiceProvenance): string {
  return provenance.kind === "human-turn"
    ? JSON.stringify(["human-turn", provenance.shard, provenance.eventIdentity])
    : JSON.stringify(["auto-decision", provenance.decisionId]);
}

export function advisoryProvenanceAlreadySpent(
  receipts: readonly AdvisoryChoiceReceipt[],
  provenance: AdvisoryChoiceProvenance,
): boolean {
  const key = provenanceSpendKey(provenance);
  return receipts.some((receipt) => provenanceSpendKey(receipt.provenance) === key);
}

export type AdvisoryAutoResolution =
  | {
      readonly kind: "resolved";
      readonly choice: AdvisoryChoice;
      readonly decision: AutoDecisionRecord;
      readonly projectionRevision: number;
    }
  | { readonly kind: "human-required"; readonly reason: string };

// FR-ADV-2, fail-closed: an allow-list of ONE shape. `decided` AND `run-now` is
// the only way out; everything else — a decided `defer-with-risk`, a park, a
// conflict, an abort, a reservation, an outcome kind that does not exist yet —
// falls to the human route without being enumerated. A new ladder outcome added
// tomorrow is human-required by construction, not by remembering to list it.
export function translateAdvisoryDecision(result: AutonomyDecisionResult): AdvisoryAutoResolution {
  if (result.kind !== "decided") return { kind: "human-required", reason: `ladder-outcome-${result.kind}` };
  if (result.decision.selectedOptionId !== "run-now") {
    return { kind: "human-required", reason: `unattended-choice-not-run-now:${result.decision.selectedOptionId}` };
  }
  return {
    kind: "resolved",
    choice: "run-now",
    decision: result.decision,
    projectionRevision: result.receipt.projectionRevision,
  };
}

function identityKey(identity: AdvisoryIdentity): string {
  return JSON.stringify([
    identity.plugin,
    identity.code,
    identity.checkpoint,
    identity.target,
    identity.specIdentity,
    identity.intentRun,
    identity.advisoryInstance,
  ]);
}

function activeReceiptMatches(
  receipt: AdvisoryChoiceReceipt,
  pending: PendingAdvisory,
): boolean {
  return receipt.revokedAt === undefined &&
    identityKey(receipt.identity) === identityKey(pending.identity);
}

function correlationKey(identity: Omit<AdvisoryIdentity, "advisoryInstance">): string {
  return JSON.stringify([
    identity.plugin,
    identity.code,
    identity.checkpoint,
    identity.target,
    identity.specIdentity,
    identity.intentRun,
  ]);
}

export function evaluateAdvisoryHold(
  pending: PendingAdvisory[],
  receipts: AdvisoryChoiceReceipt[],
): AdvisoryHoldVerdict {
  const matched: AdvisoryChoiceReceipt[] = [];
  const unresolved: PendingAdvisory[] = [];
  for (const item of pending) {
    const receipt = receipts
      .filter((candidate) => activeReceiptMatches(candidate, item))
      .at(-1);
    if (receipt === undefined) unresolved.push(item);
    else matched.push(receipt);
  }
  if (unresolved.length > 0) return { kind: "hold", unresolved };
  if (matched.some((receipt) => receipt.choice === "run-now")) {
    return { kind: "run-required", pending, receipts: matched };
  }
  return { kind: "resolved", receipts: matched };
}

function parsePending(value: unknown): ParseResult<PendingAdvisory> {
  if (!isPlainObject(value) || value.schema !== 1) return { ok: false, reason: "pending schema is invalid" };
  const identity = parseIdentity(value.identity);
  if (!identity.ok) return identity;
  if (!nonEmptyString(value.message) || !nonEmptyString(value.createdAt)) {
    return { ok: false, reason: "pending message/createdAt is invalid" };
  }
  if (value.closedAt !== undefined && !nonEmptyString(value.closedAt)) {
    return { ok: false, reason: "pending.closedAt is invalid" };
  }
  return { ok: true, value: value as unknown as PendingAdvisory };
}

// Schema 2 (#2253). A schema 1 store on disk is NOT translated: it fails to
// parse, and the caller's existing `!storeResult.ok` arm turns that into a
// fail-closed hold. Reading an old receipt shape would mean deciding what a
// `humanTurn`-only receipt means under a provenance union, and the safe answer
// to that question is to ask the human again — which the hold already does.
function parseStore(value: unknown): ParseResult<AdvisoryChoiceStore> {
  if (!isPlainObject(value) || value.schema !== 2 || !Array.isArray(value.pending) || !Array.isArray(value.receipts)) {
    return { ok: false, reason: "advisory choice store shape is invalid" };
  }
  const pending: PendingAdvisory[] = [];
  const receipts: AdvisoryChoiceReceipt[] = [];
  for (const item of value.pending) {
    const parsed = parsePending(item);
    if (!parsed.ok) return parsed;
    pending.push(parsed.value);
  }
  for (const item of value.receipts) {
    const parsed = parseAdvisoryChoiceReceipt(item);
    if (!parsed.ok) return parsed;
    receipts.push(parsed.value);
  }
  return { ok: true, value: { schema: 2, pending, receipts } };
}

function storePath(projectDir: string): string {
  return join(docsRoot(projectDir), STORE_FILE);
}

function readStore(projectDir: string): ParseResult<AdvisoryChoiceStore> {
  const path = storePath(projectDir);
  if (!existsSync(path)) return { ok: true, value: { schema: 2, pending: [], receipts: [] } };
  try {
    return parseStore(JSON.parse(readFileSync(path, "utf-8")));
  } catch (error) {
    return { ok: false, reason: `advisory choice store is unreadable: ${String(error)}` };
  }
}

function writeStore(projectDir: string, store: AdvisoryChoiceStore): void {
  const path = storePath(projectDir);
  mkdirSync(docsRoot(projectDir), { recursive: true });
  writeFileAtomic(path, `${JSON.stringify(store, null, 2)}\n`);
}

function intentRunIdentity(projectDir: string): string | null {
  return activeIntentUuid(projectDir) ?? activeIntent(projectDir);
}

function directiveItem(pending: PendingAdvisory): AdvisoryChoiceDirectiveItem {
  return {
    plugin: pending.identity.plugin,
    code: pending.identity.code,
    message: pending.message,
    checkpoint: pending.identity.checkpoint,
    target: pending.identity.target,
    spec_identity: pending.identity.specIdentity,
    intent_run: pending.identity.intentRun,
    advisory_instance: pending.identity.advisoryInstance,
  };
}

const ADVISORY_PRESENTATION_RATIONALE_PREFIX = "Advisory instances: ";

function advisoryPresentationRationale(pending: readonly PendingAdvisory[]): string {
  const question = renderAdvisoryChoiceQuestion(pending);
  return `${ADVISORY_PRESENTATION_RATIONALE_PREFIX}${pending.map((item) => item.identity.advisoryInstance).join(",")}; question-sha256:${createHash("sha256").update(question).digest("hex")}`;
}

export function advisoryChoicePresentationFields(
  projectDir: string,
  stage: string,
  advisoryInstances: readonly string[],
): ParseResult<Record<string, string>> {
  return withAuditLock(projectDir, () => {
    if (!nonEmptyString(stage) || advisoryInstances.length === 0 || advisoryInstances.some((item) => !nonEmptyString(item))) {
      return { ok: false, reason: "stage and advisory instances are required" };
    }
    const storeResult = readStore(projectDir);
    if (!storeResult.ok) return storeResult;
    const intentRun = intentRunIdentity(projectDir);
    if (intentRun === null) return { ok: false, reason: "active intent is unresolved" };
    const byInstance = new Map(
      storeResult.value.pending
        .filter((pending) =>
          pending.closedAt === undefined
          && pending.identity.checkpoint === stage
          && pending.identity.intentRun === intentRun
        )
        .map((pending) => [pending.identity.advisoryInstance, pending] as const),
    );
    const pending = advisoryInstances.map((instance) => byInstance.get(instance));
    if (pending.some((item) => item === undefined) || new Set(advisoryInstances).size !== advisoryInstances.length) {
      return { ok: false, reason: "advisory instances do not match the open checkpoint" };
    }
    return {
      ok: true,
      value: {
        Stage: stage,
        Decision: renderAdvisoryChoiceQuestion(pending as PendingAdvisory[]),
        Options: ADVISORY_CHOICE_OPTIONS.map((option) => option.label).join(","),
        Rationale: advisoryPresentationRationale(pending as PendingAdvisory[]),
      },
    };
  });
}

function hasMatchingAdvisoryPresentation(
  projectDir: string,
  pending: readonly PendingAdvisory[],
  humanTurn: HumanTurnProvenance,
): boolean {
  if (pending.length === 0) return false;
  let blocks: string[];
  try {
    blocks = splitAuditRecords(readFileSync(auditFilePath(projectDir), "utf-8"));
  } catch {
    return false;
  }
  const currentIndex = blocks.findIndex((block) =>
    auditBlockField(block, "Event") === "HUMAN_TURN"
    && auditBlockField(block, "Timestamp") === humanTurn.timestamp
    && createHash("sha256").update(block).digest("hex") === humanTurn.eventIdentity
  );
  if (currentIndex < 0) return false;
  let previousHumanIndex = -1;
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (auditBlockField(blocks[index]!, "Event") === "HUMAN_TURN") {
      previousHumanIndex = index;
      break;
    }
  }
  const expected = {
    Stage: pending[0]!.identity.checkpoint,
    Decision: renderAdvisoryChoiceQuestion(pending),
    Options: ADVISORY_CHOICE_OPTIONS.map((option) => option.label).join(","),
    Rationale: advisoryPresentationRationale(pending),
  };
  for (let index = currentIndex - 1; index > previousHumanIndex; index -= 1) {
    const block = blocks[index]!;
    if (auditBlockField(block, "Event") !== "DECISION_RECORDED") continue;
    return ["Stage", "Options", "Rationale"].every((field) =>
      auditBlockField(block, field) === expected[field as keyof typeof expected]
    );
  }
  return false;
}

export function guardAdvisoryChoices(
  projectDir: string,
  stage: string,
  advisories: readonly Advisory[],
  activationHostRoot?: string,
): AdvisoryChoiceGuardResult {
  if (advisories.length === 0) return { kind: "allow" };
  return withAuditLock(projectDir, () =>
    guardAdvisoryChoicesLocked(projectDir, stage, advisories, activationHostRoot)
  );
}

function fallbackAdvisoryHold(
  stage: string,
  advisories: readonly Advisory[],
  intentRun: string | null,
): AdvisoryChoiceGuardResult {
  const fallback = advisories.map((advisory) => createPendingAdvisory({
    plugin: advisory.plugin,
    code: advisory.code,
    checkpoint: stage,
    target: advisory.target ?? "unknown-target",
    specIdentity: advisory.specIdentity ?? "unknown-spec",
    intentRun: intentRun ?? "unresolved-intent",
    message: advisory.message,
  }));
  return {
    kind: "hold",
    stage,
    advisories: fallback.map(directiveItem),
    runRequired: false,
    formalChecks: [],
  };
}

function currentPendingAdvisories(
  store: AdvisoryChoiceStore,
  stage: string,
  advisories: readonly Advisory[],
  intentRun: string,
): PendingAdvisory[] {
  const current: PendingAdvisory[] = [];
  for (const advisory of advisories) {
    const base = {
      plugin: advisory.plugin,
      code: advisory.code,
      checkpoint: stage,
      target: advisory.target ?? "unknown-target",
      specIdentity: advisory.specIdentity ?? "unknown-spec",
      intentRun,
    };
    const key = correlationKey(base);
    let pending = store.pending.find((candidate) =>
      candidate.closedAt === undefined && correlationKey(candidate.identity) === key
    );
    if (pending === undefined) {
      pending = createPendingAdvisory({ ...base, message: advisory.message });
      store.pending.push(pending);
    }
    current.push(pending);
  }
  return current;
}

function modelCheckResultText(outcome: AdvisoryModelCheckVerdict): string {
  if (outcome.kind === "detected") return `DETECTED: counterexample ${outcome.counterexampleIdentity}`;
  if (outcome.kind === "harness-error") return `HARNESS_ERROR ${outcome.code}: ${outcome.detail}`;
  if (outcome.kind === "not-run" || outcome.kind === "invalid") return outcome.reason;
  throw new Error("verified outcome has no hold result");
}

function hasVerifiedModelCheckAttempt(
  projectDir: string,
  pending: PendingAdvisory,
  receipts: readonly AdvisoryChoiceReceipt[],
): boolean {
  const attempts = receipts.filter((receipt) =>
    activeReceiptMatches(receipt, pending) && receipt.choice === "run-now"
  ).length;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (verifyAdvisoryModelCheckOutcome(projectDir, pending, attempt).kind === "verified-not-detected") return true;
  }
  return false;
}

function formalCheckRoute(
  projectDir: string,
  pending: PendingAdvisory,
  attempt: number,
): AdvisoryFormalCheckRoute {
  const output = advisoryModelCheckOutputDir(projectDir, pending.identity.advisoryInstance, attempt);
  mkdirSync(join(docsRoot(projectDir), MODEL_CHECK_DIR), { recursive: true });
  const args = [
    "bun", "plugins/formal-model-check/tools/run-model-check.ts",
    "--model", "specs/tla/FormalElection.tla",
    "--cfg", "specs/tla/FormalElection.cfg",
    "--out", output,
    "--advisory-target", pending.identity.target,
    "--advisory-spec-identity", pending.identity.specIdentity,
    "--advisory-instance", pending.identity.advisoryInstance,
  ];
  return {
    stage: "formal-model-check",
    command: args.map((arg) => JSON.stringify(arg)).join(" "),
    output_dir: output,
    target: pending.identity.target,
    spec_identity: pending.identity.specIdentity,
    advisory_instance: pending.identity.advisoryInstance,
  };
}

// Generalization point 2 of ADR-6 (revised): a declared advisory's run-now
// command comes from its own manifest, resolved through the reserved tokens.
// A declaration with no executable side (formalCheck: null) contributes no
// route — its release is the plugin's own evaluator saying no-hold on the next
// `next`, never a verification this engine invents on its behalf.
function declaredFormalCheckRoute(
  projectDir: string,
  activationHostRoot: string | undefined,
  pending: PendingAdvisory,
  attempt: number,
): AdvisoryFormalCheckRoute | null {
  if (activationHostRoot === undefined) return null;
  const argv = declaredFormalCheckArgv(
    dirname(activationHostRoot),
    pending.identity.plugin,
    pending.identity.code,
  );
  if (argv === null) return null;
  const output = advisoryModelCheckOutputDir(projectDir, pending.identity.advisoryInstance, attempt);
  const resolved = resolveArgvTokens([...argv], {
    out: output,
    "advisory-instance": pending.identity.advisoryInstance,
    target: pending.identity.target,
    "spec-identity": pending.identity.specIdentity,
  });
  if (resolved === null) return null;
  mkdirSync(join(docsRoot(projectDir), MODEL_CHECK_DIR), { recursive: true });
  return {
    stage: "formal-model-check",
    command: resolved.map((argument) => JSON.stringify(argument)).join(" "),
    output_dir: output,
    target: pending.identity.target,
    spec_identity: pending.identity.specIdentity,
    advisory_instance: pending.identity.advisoryInstance,
  };
}

// A declared advisory with no executable side (formalCheck: null) has nothing
// this engine can run and verify on the plugin's behalf, so a run-now choice
// releases nothing: the hold stands until the plugin's own evaluator stops
// raising it (BR-U2-05). The human's explicit defer-with-risk remains the
// checkpoint's own escape hatch and is untouched by this rule.
const DECLARED_RELEASE_RULE =
  "declared advisory: release requires the plugin's own evaluator to return no-hold";

// The report-side mirror of that judgment: ask the declaring plugins what they
// raise right now. `null` means the host could not be resolved, in which case
// the caller keeps the hold closed rather than guessing a release.
function raisedDeclaredCodes(
  activationHostRoot: string | undefined,
  stage: string,
  runEvaluator?: RunEvaluator,
): Set<string> | null {
  if (activationHostRoot === undefined) return null;
  const raised = advisoriesForHost(activationHostRoot, stage, undefined, runEvaluator);
  return new Set(raised.map((advisory) => `${advisory.plugin}/${String(advisory.code)}`));
}

function resolveRunRequiredHold(
  projectDir: string,
  stage: string,
  pendingItems: readonly PendingAdvisory[],
  receipts: readonly AdvisoryChoiceReceipt[],
  activationHostRoot?: string,
): AdvisoryChoiceGuardResult {
  const directiveItems: AdvisoryChoiceDirectiveItem[] = [];
  const formalChecks: AdvisoryFormalCheckRoute[] = [];
  for (const pending of pendingItems) {
    const matching = receipts.filter((receipt) => activeReceiptMatches(receipt, pending));
    if (matching.at(-1)?.choice !== "run-now") continue;
    if (isDeclaredAdvisoryCode(pending.identity.code)) {
      const attempts = matching.filter((receipt) => receipt.choice === "run-now").length;
      const route = declaredFormalCheckRoute(projectDir, activationHostRoot, pending, attempts);
      if (route === null) {
        directiveItems.push({ ...directiveItem(pending), result: DECLARED_RELEASE_RULE });
        continue;
      }
      directiveItems.push(directiveItem(pending));
      formalChecks.push(route);
      continue;
    }
    if (hasVerifiedModelCheckAttempt(projectDir, pending, matching)) continue;
    const attempt = matching.filter((receipt) => receipt.choice === "run-now").length;
    const outcome = verifyAdvisoryModelCheckOutcome(projectDir, pending, attempt);
    if (outcome.kind === "verified-not-detected") continue;
    directiveItems.push({ ...directiveItem(pending), result: modelCheckResultText(outcome) });
    if (outcome.kind === "not-run") formalChecks.push(formalCheckRoute(projectDir, pending, attempt));
  }
  if (directiveItems.length === 0) {
    if (activationHostRoot !== undefined) recordActivationVerdict(activationHostRoot, ACTIVATION_WATCH_GLOBS);
    return { kind: "allow" };
  }
  return {
    kind: "hold",
    stage,
    advisories: directiveItems,
    runRequired: formalChecks.length > 0,
    formalChecks,
  };
}

function guardAdvisoryChoicesLocked(
  projectDir: string,
  stage: string,
  advisories: readonly Advisory[],
  activationHostRoot?: string,
): AdvisoryChoiceGuardResult {
  const intentRun = intentRunIdentity(projectDir);
  const storeResult = readStore(projectDir);
  if (intentRun === null || !storeResult.ok) return fallbackAdvisoryHold(stage, advisories, intentRun);
  const store = storeResult.value;
  const current = currentPendingAdvisories(store, stage, advisories, intentRun);
  writeStore(projectDir, store);
  const verdict = evaluateAdvisoryHold(current, store.receipts);
  if (verdict.kind === "resolved") return { kind: "allow" };
  if (verdict.kind === "run-required") {
    return resolveRunRequiredHold(projectDir, stage, verdict.pending, store.receipts, activationHostRoot);
  }
  return {
    kind: "hold",
    stage,
    advisories: verdict.unresolved.map(directiveItem),
    runRequired: false,
    formalChecks: [],
  };
}

export function closeAdvisoryInstancesForStage(
  projectDir: string,
  stage: string,
  now: string = new Date().toISOString(),
): void {
  withAuditLock(projectDir, () => {
    const storeResult = readStore(projectDir);
    if (!storeResult.ok) return;
    const intentRun = intentRunIdentity(projectDir);
    if (intentRun === null) return;
    let changed = false;
    for (const pending of storeResult.value.pending) {
      if (
        pending.identity.checkpoint === stage
        && pending.identity.intentRun === intentRun
        && pending.closedAt === undefined
      ) {
        pending.closedAt = now;
        changed = true;
      }
    }
    if (changed) writeStore(projectDir, storeResult.value);
  });
}

export function advisoryReportHoldReason(
  projectDir: string,
  stage: string,
  activationHostRoot?: string,
  runEvaluator?: RunEvaluator,
): string | null {
  return withAuditLock(projectDir, () => {
    const path = storePath(projectDir);
    if (!existsSync(path)) return null;
    const storeResult = readStore(projectDir);
    if (!storeResult.ok) return `advisory choice evidence is invalid: ${storeResult.reason}`;
    const intentRun = intentRunIdentity(projectDir);
    const pending = storeResult.value.pending.filter((item) =>
      item.closedAt === undefined
      && item.identity.checkpoint === stage
      && item.identity.intentRun === intentRun
    );
    if (pending.length === 0) return null;
    const verdict = evaluateAdvisoryHold(pending, storeResult.value.receipts);
    if (verdict.kind === "hold") {
      return `unresolved advisory choice: ${verdict.unresolved.map((item) =>
        `${item.identity.plugin}/${item.identity.code}/${item.identity.advisoryInstance}`
      ).join(", ")}`;
    }
    if (verdict.kind === "resolved") return null;
    let declaredRaised: Set<string> | null | undefined;
    const failures = verdict.pending.flatMap((item) => {
      const latestChoice = verdict.receipts
        .filter((receipt) => activeReceiptMatches(receipt, item))
        .at(-1);
      const label = `${item.identity.plugin}/${item.identity.code}/${item.identity.advisoryInstance}`;
      if (isDeclaredAdvisoryCode(item.identity.code)) {
        if (latestChoice?.choice !== "run-now") return [];
        if (declaredRaised === undefined) {
          declaredRaised = raisedDeclaredCodes(activationHostRoot, stage, runEvaluator);
        }
        const key = `${item.identity.plugin}/${item.identity.code}`;
        if (declaredRaised !== null && !declaredRaised.has(key)) return [];
        return [`${label}: ${DECLARED_RELEASE_RULE}`];
      }
      if (hasVerifiedModelCheckAttempt(projectDir, item, storeResult.value.receipts)) return [];
      const latest = latestChoice;
      if (latest?.choice !== "run-now") return [];
      const attempt = storeResult.value.receipts.filter((receipt) =>
        activeReceiptMatches(receipt, item) && receipt.choice === "run-now"
      ).length;
      const outcome = verifyAdvisoryModelCheckOutcome(projectDir, item, attempt);
      if (outcome.kind === "verified-not-detected") return [];
      if (outcome.kind === "detected") {
        return [`${item.identity.plugin}/${item.identity.code}/${item.identity.advisoryInstance}: DETECTED ${outcome.counterexampleIdentity}`];
      }
      if (outcome.kind === "harness-error") {
        return [`${item.identity.plugin}/${item.identity.code}/${item.identity.advisoryInstance}: HARNESS_ERROR ${outcome.code}`];
      }
      return [`${item.identity.plugin}/${item.identity.code}/${item.identity.advisoryInstance}: ${outcome.reason}`];
    });
    return failures.length === 0 ? null : `advisory hold remains: ${failures.join(", ")}`;
  });
}

export function choiceFromExactPrompt(prompt: string): AdvisoryChoice | null {
  const trimmed = prompt.trim();
  if (trimmed === "1" || trimmed === "今すぐ実行する" || trimmed === "run-now") return "run-now";
  if (trimmed === "2" || trimmed === "リスクを承知して延期する" || trimmed === "defer-with-risk") {
    return "defer-with-risk";
  }
  return null;
}

function acceptsFreshChoice(
  projectDir: string,
  pending: PendingAdvisory,
  receipts: readonly AdvisoryChoiceReceipt[],
): boolean {
  const matching = receipts.filter((receipt) => activeReceiptMatches(receipt, pending));
  const latest = matching.at(-1);
  if (latest === undefined) return true;
  if (latest.choice === "defer-with-risk") return false;
  const attempt = matching.filter((receipt) => receipt.choice === "run-now").length;
  const outcome = verifyAdvisoryModelCheckOutcome(projectDir, pending, attempt);
  return outcome.kind === "detected" || outcome.kind === "harness-error" || outcome.kind === "invalid";
}

function isGroundedHumanTurn(projectDir: string, humanTurn: HumanTurnProvenance): boolean {
  try {
    return findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN")
      .some((event) =>
        event.timestamp === humanTurn.timestamp
        && createHash("sha256").update(event.block).digest("hex") === humanTurn.eventIdentity
      );
  } catch {
    return false;
  }
}

// Grounding for the unattended arm: the decision id has to name an AUTO_DECIDED
// record the journal holds, AND that record has to be the one this advisory
// instance produces. Both halves are needed — the first stops an invented
// decision id, the second stops a real decision about something else from being
// re-pointed at an advisory.
function groundedAutoDecision(
  projectDir: string,
  provenance: Extract<AdvisoryChoiceProvenance, { kind: "auto-decision" }>,
  open: readonly PendingAdvisory[],
): boolean {
  const intentUuid = activeIntentUuid(projectDir);
  if (intentUuid === null) return false;
  let decisions: readonly AutoDecisionRecord[];
  try {
    decisions = autoDecisionsFromTransactions(autonomyReplayModule().readIntentAutonomyTransactionsFromAudit(projectDir));
  } catch {
    return false;
  }
  const decision = decisions.find((candidate) => candidate.decisionId === provenance.decisionId);
  if (decision === undefined) return false;
  return open.some((pending) =>
    advisoryOccurrenceMatchesDecision({
      intentUuid,
      identity: pending.identity,
      decision,
      phase: provenance.phase,
      graphRevision: provenance.graphRevision,
    })
  );
}

// The ONE acceptance function (#2253 FR-ADV-3). Both provenance kinds clear the
// same three checks at the same depth; only what counts as evidence differs.
// There is no second function for the unattended route, so there is no way for
// one route's guarantees to drift away from the other's.
export function recordAdvisoryChoice(
  projectDir: string,
  choice: AdvisoryChoice,
  provenance: AdvisoryChoiceProvenance,
  now: string = new Date().toISOString(),
): boolean {
  return withAuditLock(projectDir, () => {
    const storeResult = readStore(projectDir);
    if (!storeResult.ok) return false;
    const store = storeResult.value;
    if (provenance.kind === "human-turn" && provenance.shard !== auditShardName(projectDir)) return false;
    // Single spend, hoisted ahead of the kind-specific checks so it holds across
    // provenance kinds (FR-ADV-3): one decision, or one turn, backs one receipt.
    if (advisoryProvenanceAlreadySpent(store.receipts, provenance)) return false;
    // The instance-level gate, also ahead of the kind-specific checks: an
    // advisory already answered does not accept a second answer from EITHER
    // route until its own evidence says the answer did not settle it.
    const open = store.pending.filter(
      (pending) =>
        pending.closedAt === undefined &&
        (provenance.kind === "auto-decision" ||
          Math.floor(Date.parse(provenance.timestamp) / 1000) >= Math.floor(Date.parse(pending.createdAt) / 1000)) &&
        acceptsFreshChoice(projectDir, pending, store.receipts),
    );
    if (open.length === 0) return false;
    if (provenance.kind === "human-turn") {
      if (!isGroundedHumanTurn(projectDir, provenance)) return false;
      if (!hasMatchingAdvisoryPresentation(projectDir, open, provenance)) return false;
    } else if (!groundedAutoDecision(projectDir, provenance, open)) return false;
    for (const pending of open) {
      store.receipts.push({
        schema: 2,
        identity: pending.identity,
        choice,
        provenance,
        recordedAt: now,
      });
    }
    writeStore(projectDir, store);
    return true;
  });
}

// The `record` route's presentation check (#2232). The prompt route requires
// the DECISION_RECORDED presentation to sit BETWEEN the previous human turn and
// this one (hasMatchingAdvisoryPresentation), because there the human's message
// is the only evidence of what they were answering. `record` carries the
// advisory instance explicitly, so adjacency proves nothing extra — and it is
// precisely what a detour, a follow-up question, or a multi-turn AskUserQuestion
// exchange destroys, silently dropping a legitimate choice. So this asks the
// weaker, sufficient question: was this pending advisory ever actually presented
// to the human? An unpresented instance is still refused.
function hasRecordedAdvisoryPresentation(
  projectDir: string,
  pending: readonly PendingAdvisory[],
): boolean {
  if (pending.length === 0) return false;
  let blocks: string[];
  try {
    blocks = splitAuditRecords(readFileSync(auditFilePath(projectDir), "utf-8"));
  } catch {
    return false;
  }
  const expected = {
    Stage: pending[0]!.identity.checkpoint,
    Options: ADVISORY_CHOICE_OPTIONS.map((option) => option.label).join(","),
    Rationale: advisoryPresentationRationale(pending),
  };
  return blocks.some((block) =>
    auditBlockField(block, "Event") === "DECISION_RECORDED"
    && (Object.keys(expected) as Array<keyof typeof expected>).every((field) =>
      auditBlockField(block, field) === expected[field]
    )
  );
}

// The most recent real HUMAN_TURN in this clone's audit shard, in the same
// provenance shape the prompt route binds. Null when the trail holds none —
// which is a refusal, never a synthesized turn.
function latestHumanTurn(projectDir: string): HumanTurnProvenance | null {
  let event: { timestamp: string; block: string } | undefined;
  try {
    event = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN").at(-1);
  } catch {
    return null;
  }
  if (event === undefined) return null;
  return {
    timestamp: event.timestamp,
    shard: auditShardName(projectDir),
    eventIdentity: createHash("sha256").update(event.block).digest("hex"),
  };
}

// The live receipt already covering one of these pending advisories, if any.
// Revoked receipts do not count — a corrected misattribution leaves the
// instance open to a fresh, properly grounded choice.
function activeReceiptFor(
  store: AdvisoryChoiceStore,
  open: readonly PendingAdvisory[],
): AdvisoryChoiceReceipt | undefined {
  return store.receipts
    .filter((receipt) =>
      receipt.revokedAt === undefined
      && open.some((pending) => identityKey(receipt.identity) === identityKey(pending.identity))
    )
    .at(-1);
}

// Every condition a FIRST record of an instance has to clear, in one place.
// Returns the refusal reason, or null when the choice may be written. The
// provenance checks (shard, grounding, single-spend) are the same ones the
// prompt route applies in recordAdvisoryChoice; only the presentation
// check is relaxed from adjacency to existence.
function freshRecordRefusal(
  projectDir: string,
  store: AdvisoryChoiceStore,
  open: readonly PendingAdvisory[],
  humanTurn: HumanTurnProvenance,
): string | null {
  if (humanTurn.shard !== auditShardName(projectDir)) {
    return "the latest human turn belongs to another audit shard";
  }
  if (!isGroundedHumanTurn(projectDir, humanTurn)) {
    return "the latest human turn is not grounded in the audit trail";
  }
  if (advisoryProvenanceAlreadySpent(store.receipts, { kind: "human-turn", ...humanTurn })) {
    return "the latest human turn is already consumed by another advisory receipt";
  }
  if (!hasRecordedAdvisoryPresentation(projectDir, open)) {
    const instance = open[0]?.identity.advisoryInstance ?? "this instance";
    return `no advisory presentation is recorded for ${instance}; present it before recording the choice`;
  }
  if (!open.every((pending) => acceptsFreshChoice(projectDir, pending, store.receipts))) {
    return "this advisory instance does not accept a fresh choice";
  }
  return null;
}

// Argument validation plus the store read, resolved together because none of
// them can say anything useful without the others.
function resolveRecordTarget(
  projectDir: string,
  advisoryInstance: string,
  choice: string,
): ParseResult<{ store: AdvisoryChoiceStore; open: PendingAdvisory[] }> {
  if (!nonEmptyString(advisoryInstance)) {
    return { ok: false, reason: "advisory instance is required" };
  }
  if (!CHOICES.has(choice)) {
    return { ok: false, reason: `unknown choice: ${choice} (expected one of ${[...CHOICES].join(", ")})` };
  }
  const storeResult = readStore(projectDir);
  if (!storeResult.ok) return storeResult;
  const open = storeResult.value.pending.filter(
    (pending) => pending.closedAt === undefined
      && pending.identity.advisoryInstance === advisoryInstance,
  );
  if (open.length === 0) {
    return { ok: false, reason: `open advisory instance not found: ${advisoryInstance}` };
  }
  return { ok: true, value: { store: storeResult.value, open } };
}

export type AdvisoryChoiceRecordResult =
  | { ok: true; value: { recorded: true; idempotent: boolean; receipt: AdvisoryChoiceReceipt } }
  | { ok: false; reason: string };

// Deterministic acceptance for an advisory choice the conductor collected
// through its own question UI (#2232). Every provenance guarantee the prompt
// route makes is kept: the receipt binds a grounded HUMAN_TURN from this shard,
// one turn is never spent twice, and an unpresented instance is refused. What
// is dropped is the adjacency requirement — see hasRecordedAdvisoryPresentation.
//
// A repeat call with the SAME choice returns the stored receipt untouched
// (idempotent), so a conductor retry after a tool error or a re-run of `next`
// never asks the human again. A repeat with a DIFFERENT choice is a conflict
// and is refused rather than silently resolved in favour of either one.
export function recordAdvisoryChoiceDecision(
  projectDir: string,
  advisoryInstance: string,
  choice: string,
  now: string = new Date().toISOString(),
): AdvisoryChoiceRecordResult {
  return withAuditLock(projectDir, () => {
    const target = resolveRecordTarget(projectDir, advisoryInstance, choice);
    if (!target.ok) return { ok: false as const, reason: target.reason };
    const { store, open } = target.value;

    const existing = activeReceiptFor(store, open);
    if (existing !== undefined) {
      if (existing.choice !== choice) {
        return {
          ok: false as const,
          reason: `advisory instance ${advisoryInstance} is already recorded with a different choice (${existing.choice})`,
        };
      }
      return { ok: true as const, value: { recorded: true as const, idempotent: true, receipt: existing } };
    }

    const humanTurn = latestHumanTurn(projectDir);
    if (humanTurn === null) {
      return { ok: false as const, reason: "no real human turn is recorded in the audit trail" };
    }
    const refusal = freshRecordRefusal(projectDir, store, open, humanTurn);
    if (refusal !== null) return { ok: false as const, reason: refusal };

    const receipt: AdvisoryChoiceReceipt = {
      schema: 2,
      identity: open[0]!.identity,
      choice: choice as AdvisoryChoice,
      provenance: { kind: "human-turn", ...humanTurn },
      recordedAt: now,
    };
    store.receipts.push(receipt);
    writeStore(projectDir, store);
    return { ok: true as const, value: { recorded: true as const, idempotent: false, receipt } };
  });
}

export function revokeMisattributedAdvisoryChoice(
  projectDir: string,
  advisoryInstance: string,
  humanTurnIdentity: string,
  now: string = new Date().toISOString(),
): { ok: true } | { ok: false; reason: string } {
  return withAuditLock(projectDir, () => {
    const storeResult = readStore(projectDir);
    if (!storeResult.ok) return { ok: false, reason: storeResult.reason };
    const open = storeResult.value.pending.filter((item) =>
      item.closedAt === undefined && item.identity.advisoryInstance === advisoryInstance
    );
    if (open.length === 0) return { ok: false, reason: "open advisory instance not found" };
    // Correction covers the human route only: an unattended receipt has no
    // human turn to have been misattributed to.
    const matching = storeResult.value.receipts.filter((receipt) =>
      receipt.revokedAt === undefined
      && receipt.provenance.kind === "human-turn"
      && receipt.provenance.eventIdentity === humanTurnIdentity
      && open.some((pending) => identityKey(receipt.identity) === identityKey(pending.identity))
    );
    const receipt = matching.at(-1);
    if (receipt === undefined) {
      return { ok: false, reason: "matching latest receipt not found" };
    }
    const pending = open.find((item) => identityKey(item.identity) === identityKey(receipt.identity));
    if (pending === undefined) return { ok: false, reason: "open advisory identity not found" };
    if (receipt.choice !== "run-now") return { ok: false, reason: "only run-now receipts can be corrected" };
    if (receipt.provenance.kind !== "human-turn") return { ok: false, reason: "matching latest receipt not found" };
    if (hasMatchingAdvisoryPresentation(projectDir, [pending], receipt.provenance)) {
      return { ok: false, reason: "receipt is grounded in a matching advisory presentation" };
    }
    const attempt = matching.filter((item) => item.choice === "run-now").length;
    if (verifyAdvisoryModelCheckOutcome(projectDir, pending, attempt).kind !== "not-run") {
      return { ok: false, reason: "model-check evidence exists for this receipt" };
    }
    receipt.revokedAt = now;
    receipt.revocationReason = "misattributed-unpresented-choice";
    writeStore(projectDir, storeResult.value);
    return { ok: true };
  });
}

// C16 (#2253 FR-ADV-1). A hold reaches here only after guardAdvisoryChoices has
// already released its lock, so the ladder and the acceptance below run in their
// own sections rather than nested inside the guard's.
//
// Every advisory in the hold is put to the ladder separately, and ALL of them
// must come back `run-now`: one advisory the ladder will not decide keeps the
// whole checkpoint with the human, which is the same thing the human route does
// (one answer covers the whole presented set, or none of it does).
//
// The ruling itself is NOT re-implemented here — commitProductionQuestionDecision
// is the one path a question travels, so semi and full reach the ladder through
// the same authorization they always did.
export function resolveAdvisoryChoiceAutonomously(input: {
  readonly projectDir: string;
  readonly hold: Extract<AdvisoryChoiceGuardResult, { kind: "hold" }>;
  readonly phase: string;
  readonly graphRevision: string;
}): AdvisoryAutoResolution {
  if (input.hold.advisories.length === 0) return { kind: "human-required", reason: "empty-advisory-hold" };
  const optionIds = advisoryChoiceOptionIds(input.hold.runRequired);
  let first: Extract<AdvisoryAutoResolution, { kind: "resolved" }> | null = null;
  for (const item of input.hold.advisories) {
    const identity: AdvisoryIdentity = {
      plugin: item.plugin,
      code: item.code,
      checkpoint: item.checkpoint,
      target: item.target,
      specIdentity: item.spec_identity,
      intentRun: item.intent_run,
      advisoryInstance: item.advisory_instance,
    };
    let outcome: AutonomyDecisionResult;
    try {
      outcome = autonomyProductionModule().commitProductionQuestionDecision({
        projectDir: input.projectDir,
        stage: item.checkpoint,
        phase: input.phase,
        graphRevision: input.graphRevision,
        questionId: advisoryInteractionId(identity),
        selector: advisorySelector(identity),
        question: item.message,
        optionIds,
        recommendedOptionId: "run-now",
        effectClassifications: ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS,
      });
    } catch (error) {
      return { kind: "human-required", reason: `advisory-decision-failed:${String(error)}` };
    }
    const translated = translateAdvisoryDecision(outcome);
    if (translated.kind !== "resolved") return translated;
    first ??= translated;
  }
  return first ?? { kind: "human-required", reason: "empty-advisory-hold" };
}

function cliFlag(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  return index >= 0 && index + 1 < args.length ? args[index + 1]! : null;
}

const USAGE = [
  "Usage:",
  "  amadeus-advisory-choice.ts record --advisory-instance <id> --choice <run-now|defer-with-risk> [--project-dir <path>]",
  "  amadeus-advisory-choice.ts correct-misattributed --advisory-instance <id> --human-turn <sha256> [--project-dir <path>]",
].join("\n");

if (import.meta.main) {
  const args = process.argv.slice(2);
  const subcommand = args[0];
  if (subcommand !== "correct-misattributed" && subcommand !== "record") {
    console.error(USAGE);
    process.exit(1);
  }
  const advisoryInstance = cliFlag(args, "--advisory-instance");
  const projectDir = resolve(cliFlag(args, "--project-dir") ?? process.cwd());

  if (subcommand === "record") {
    const choice = cliFlag(args, "--choice");
    if (advisoryInstance === null || choice === null) {
      console.error(`Missing --advisory-instance or --choice\n${USAGE}`);
      process.exit(1);
    }
    const recorded = recordAdvisoryChoiceDecision(projectDir, advisoryInstance, choice);
    if (!recorded.ok) {
      console.error(recorded.reason);
      process.exit(1);
    }
    const bound = recorded.value.receipt.provenance;
    console.log(JSON.stringify({
      recorded: true,
      idempotent: recorded.value.idempotent,
      advisory_instance: advisoryInstance,
      choice: recorded.value.receipt.choice,
      human_turn: bound.kind === "human-turn"
        ? { shard: bound.shard, event_identity: bound.eventIdentity, timestamp: bound.timestamp }
        : null,
    }));
    process.exit(0);
  }

  const humanTurn = cliFlag(args, "--human-turn");
  if (advisoryInstance === null || humanTurn === null) {
    console.error("Missing --advisory-instance or --human-turn");
    process.exit(1);
  }
  const result = revokeMisattributedAdvisoryChoice(projectDir, advisoryInstance, humanTurn);
  if (!result.ok) {
    console.error(result.reason);
    process.exit(1);
  }
  console.log(JSON.stringify({ corrected: true, advisory_instance: advisoryInstance }));
}
