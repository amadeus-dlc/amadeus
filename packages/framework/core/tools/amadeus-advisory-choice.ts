import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
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
  ACTIVATION_WATCH_GLOBS,
  recordActivationVerdict,
  type Advisory,
  type AdvisoryCode,
} from "./amadeus-plugin-activation.ts";

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

export type AdvisoryChoiceReceipt = {
  schema: 1;
  identity: AdvisoryIdentity;
  choice: AdvisoryChoice;
  humanTurn: HumanTurnProvenance;
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
  schema: 1;
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
const CODES = new Set<string>(["not-ready", "changed", "never-run"]);

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
  if (!nonEmptyString(value.code) || !CODES.has(value.code)) {
    return { ok: false, reason: "identity.code is invalid" };
  }
  return { ok: true, value: value as unknown as AdvisoryIdentity };
}

export function parseAdvisoryChoiceReceipt(value: unknown): ParseResult<AdvisoryChoiceReceipt> {
  if (!isPlainObject(value) || value.schema !== 1) return { ok: false, reason: "receipt schema is invalid" };
  const identity = parseIdentity(value.identity);
  if (!identity.ok) return identity;
  if (!nonEmptyString(value.choice) || !CHOICES.has(value.choice)) {
    return { ok: false, reason: "receipt choice is invalid" };
  }
  if (!isPlainObject(value.humanTurn)) return { ok: false, reason: "humanTurn must be an object" };
  if (!nonEmptyString(value.humanTurn.timestamp) || Number.isNaN(Date.parse(value.humanTurn.timestamp))) {
    return { ok: false, reason: "humanTurn.timestamp is invalid" };
  }
  if (!nonEmptyString(value.humanTurn.shard)) return { ok: false, reason: "humanTurn.shard is invalid" };
  if (!nonEmptyString(value.humanTurn.eventIdentity)) {
    return { ok: false, reason: "humanTurn.eventIdentity is invalid" };
  }
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
      .filter((candidate) =>
        candidate.revokedAt === undefined
        && identityKey(candidate.identity) === identityKey(item.identity)
      )
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

function parseStore(value: unknown): ParseResult<AdvisoryChoiceStore> {
  if (!isPlainObject(value) || value.schema !== 1 || !Array.isArray(value.pending) || !Array.isArray(value.receipts)) {
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
  return { ok: true, value: { schema: 1, pending, receipts } };
}

function storePath(projectDir: string): string {
  return join(docsRoot(projectDir), STORE_FILE);
}

function readStore(projectDir: string): ParseResult<AdvisoryChoiceStore> {
  const path = storePath(projectDir);
  if (!existsSync(path)) return { ok: true, value: { schema: 1, pending: [], receipts: [] } };
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
    receipt.revokedAt === undefined
    && identityKey(receipt.identity) === identityKey(pending.identity)
    && receipt.choice === "run-now"
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
    const matching = receipts.filter((receipt) =>
      receipt.revokedAt === undefined
      && identityKey(receipt.identity) === identityKey(pending.identity)
    );
    if (matching.at(-1)?.choice !== "run-now") continue;
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

export function advisoryReportHoldReason(projectDir: string, stage: string): string | null {
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
    const failures = verdict.pending.flatMap((item) => {
      if (hasVerifiedModelCheckAttempt(projectDir, item, storeResult.value.receipts)) return [];
      const latest = verdict.receipts
        .filter((receipt) =>
          receipt.revokedAt === undefined
          && identityKey(receipt.identity) === identityKey(item.identity)
        )
        .at(-1);
      if (latest?.choice !== "run-now") return [];
      const attempt = storeResult.value.receipts.filter((receipt) =>
        receipt.revokedAt === undefined
        && identityKey(receipt.identity) === identityKey(item.identity)
        && receipt.choice === "run-now"
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
  const matching = receipts.filter((receipt) =>
    receipt.revokedAt === undefined
    && identityKey(receipt.identity) === identityKey(pending.identity)
  );
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

export function recordProtectedAdvisoryChoice(
  projectDir: string,
  prompt: string,
  humanTurn: HumanTurnProvenance,
  now: string = new Date().toISOString(),
): boolean {
  const choice = choiceFromExactPrompt(prompt);
  if (choice === null) return false;
  return withAuditLock(projectDir, () => {
    const storeResult = readStore(projectDir);
    if (!storeResult.ok) return false;
    const store = storeResult.value;
    if (humanTurn.shard !== auditShardName(projectDir)) return false;
    if (!isGroundedHumanTurn(projectDir, humanTurn)) return false;
    if (store.receipts.some((receipt) =>
      receipt.humanTurn.eventIdentity === humanTurn.eventIdentity
      && receipt.humanTurn.shard === humanTurn.shard
    )) return false;
    const open = store.pending.filter(
      (pending) =>
        pending.closedAt === undefined &&
        Math.floor(Date.parse(humanTurn.timestamp) / 1000) >= Math.floor(Date.parse(pending.createdAt) / 1000) &&
        acceptsFreshChoice(projectDir, pending, store.receipts),
    );
    if (open.length === 0) return false;
    if (!hasMatchingAdvisoryPresentation(projectDir, open, humanTurn)) return false;
    for (const pending of open) {
      store.receipts.push({
        schema: 1,
        identity: pending.identity,
        choice,
        humanTurn,
        recordedAt: now,
      });
    }
    writeStore(projectDir, store);
    return true;
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
    const pending = storeResult.value.pending.find((item) =>
      item.closedAt === undefined && item.identity.advisoryInstance === advisoryInstance
    );
    if (pending === undefined) return { ok: false, reason: "open advisory instance not found" };
    const matching = storeResult.value.receipts.filter((receipt) =>
      receipt.revokedAt === undefined
      && receipt.identity.advisoryInstance === advisoryInstance
    );
    const receipt = matching.at(-1);
    if (receipt === undefined || receipt.humanTurn.eventIdentity !== humanTurnIdentity) {
      return { ok: false, reason: "matching latest receipt not found" };
    }
    if (receipt.choice !== "run-now") return { ok: false, reason: "only run-now receipts can be corrected" };
    if (hasMatchingAdvisoryPresentation(projectDir, [pending], receipt.humanTurn)) {
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

function cliFlag(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  return index >= 0 && index + 1 < args.length ? args[index + 1]! : null;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args[0] !== "correct-misattributed") {
    console.error("Usage: amadeus-advisory-choice.ts correct-misattributed --advisory-instance <id> --human-turn <sha256> [--project-dir <path>]");
    process.exit(1);
  }
  const advisoryInstance = cliFlag(args, "--advisory-instance");
  const humanTurn = cliFlag(args, "--human-turn");
  const projectDir = resolve(cliFlag(args, "--project-dir") ?? process.cwd());
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
