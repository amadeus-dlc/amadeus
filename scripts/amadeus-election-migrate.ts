// Explicit, plan-bound migration of one legacy Election directory.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { basename, join } from "node:path";
import { canonicalContractValueDigest } from "../packages/framework/core/tools/amadeus-autonomy-review.ts";
import type { CanonicalTally } from "../packages/framework/core/tools/amadeus-election-codec.ts";
import type { ElectionState } from "../packages/framework/core/tools/amadeus-election-model.ts";
import {
  electionsRegistryPath,
  electionsRoot,
  mintElectionDirName,
  readElectionsRegistry,
  type ElectionRegistryEntry,
  writeStoreFile,
} from "../packages/framework/core/tools/amadeus-election-store.ts";
import {
  ElectionV2Store,
  type ElectionV2Snapshot,
} from "../packages/framework/core/tools/amadeus-election-v2-store.ts";

export type MigrationStep = "move-directory" | "write-registry" | "verify-fidelity";

export interface MigrationFilePrecondition {
  readonly path: string;
  readonly byteLength: number;
  readonly digest: string;
}

export interface MigrationOperation {
  readonly order: number;
  readonly kind: MigrationStep;
  readonly sourcePath: string;
  readonly targetPath: string;
}

export interface MigrationPlan {
  readonly operationId: string;
  readonly electionId: string;
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly registryBefore: readonly ElectionRegistryEntry[] | null;
  readonly registryAfter: readonly ElectionRegistryEntry[];
  readonly operations: readonly MigrationOperation[];
  readonly preconditions: {
    readonly sourceTreeDigest: string;
    readonly registryDigest: string;
    readonly targetMustBeAbsent: true;
    readonly directories: readonly string[];
    readonly files: readonly MigrationFilePrecondition[];
  };
  readonly beforeDigest: string;
  readonly planDigest: string;
}

export interface MigrationApproval {
  readonly approved: true;
  readonly planDigest: string;
}

export interface MigrationReceipt {
  readonly operationId: string;
  readonly electionId: string;
  readonly planDigest: string;
  readonly status: "planned" | "applied" | "verified" | "failed";
  readonly completedSteps: readonly MigrationStep[];
  readonly afterDigest: string | null;
  readonly failureDetail: string | null;
  readonly recoveryDetails: readonly string[];
}

export interface FidelityResult {
  readonly beforeDigest: string;
  readonly afterDigest: string;
  readonly canonicalQuestionIds: readonly string[];
  readonly resultCount: number;
  readonly runCount: number;
  readonly match: boolean;
  readonly findings: readonly string[];
}

export interface CreateMigrationPlanInput {
  readonly operationId: string;
  readonly electionId: string;
  readonly createdAt: string;
}

const RECEIPTS_DIR = ".migration-receipts";
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export function sha256(bytes: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function safeSegment(value: string, label: string): void {
  if (value.length === 0 || value === "." || value === ".." || /[\\/\0]/.test(value)) {
    throw new Error(`invalid ${label}`);
  }
}

function canonicalDigest(schema: string, value: unknown): string {
  const digest = canonicalContractValueDigest(schema, value);
  if (!digest.ok) throw new Error(`${schema} digest failed: ${digest.error.code}`);
  return digest.value;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function registryValue(root: string): readonly ElectionRegistryEntry[] | null {
  const registry = readElectionsRegistry(root);
  if (registry.kind === "corrupt") throw new Error(`registry conflict: ${registry.detail}`);
  return registry.kind === "absent" ? null : registry.entries;
}

function registryDigest(entries: readonly ElectionRegistryEntry[] | null): string {
  return canonicalDigest("election-migration-registry", entries);
}

function readCanonicalSnapshot(root: string, electionId: string): ElectionV2Snapshot {
  const snapshot = ElectionV2Store.readSnapshot(root, electionId);
  if (!snapshot.ok) throw new Error(`strict Election read failed: ${snapshot.error}`);
  if (snapshot.value.definition.electionId !== electionId) {
    throw new Error("strict Election read failed: identity mismatch");
  }
  return snapshot.value;
}

function snapshotDigest(snapshot: ElectionV2Snapshot): string {
  return canonicalDigest("election-migration-canonical-snapshot", {
    definition: snapshot.definition,
    state: snapshot.state,
    pending: snapshot.pending,
    ledger: snapshot.ledger,
    materialized: snapshot.materialized,
    currentTally: snapshot.currentTally,
    history: snapshot.history,
    timeline: snapshot.timeline,
  });
}

function collectFiles(dir: string, relativeDir = ""): MigrationFilePrecondition[] {
  const current = join(dir, relativeDir);
  const result: MigrationFilePrecondition[] = [];
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name))) {
    const relativePath = relativeDir === "" ? entry.name : join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(dir, relativePath));
      continue;
    }
    if (!entry.isFile()) throw new Error(`dirty source: unsupported entry ${relativePath}`);
    const bytes = readFileSync(join(dir, relativePath));
    result.push({ path: relativePath, byteLength: bytes.byteLength, digest: sha256(bytes) });
  }
  return result;
}

function treeDigest(files: readonly MigrationFilePrecondition[]): string {
  return canonicalDigest("election-migration-source-tree", files);
}

function collectDirectories(dir: string, relativeDir = ""): string[] {
  const directories: string[] = [];
  for (const entry of readdirSync(join(dir, relativeDir), { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const relativePath = relativeDir === "" ? entry.name : join(relativeDir, entry.name);
    directories.push(relativePath, ...collectDirectories(dir, relativePath));
  }
  return directories;
}

function sameValue(left: unknown, right: unknown): boolean {
  return canonicalDigest("election-migration-equality", left) ===
    canonicalDigest("election-migration-equality", right);
}

function assertExactFiles(dir: string, plan: MigrationPlan): void {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error("planned directory is missing");
  const actual = collectFiles(dir);
  if (!sameValue(collectDirectories(dir), plan.preconditions.directories)) {
    throw new Error("dirty or unexpected directories conflict with the approved plan");
  }
  if (!sameValue(actual, plan.preconditions.files)) {
    throw new Error("dirty or unexpected files conflict with the approved plan");
  }
  if (treeDigest(actual) !== plan.preconditions.sourceTreeDigest) {
    throw new Error("source tree digest conflict");
  }
}

function digestPlan(plan: Omit<MigrationPlan, "planDigest">): string {
  return canonicalDigest("election-legacy-migration-plan", plan);
}

function asElectionState(state: ElectionV2Snapshot["state"]): ElectionState {
  return state;
}

export function createMigrationPlan(
  root: string,
  input: CreateMigrationPlanInput,
): MigrationPlan {
  safeSegment(input.operationId, "operationId");
  safeSegment(input.electionId, "electionId");
  if (!UTC_SECONDS.test(input.createdAt) || Number.isNaN(new Date(input.createdAt).getTime())) {
    throw new Error("invalid createdAt");
  }
  const sourcePath = input.electionId;
  const sourceDir = join(root, sourcePath);
  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
    throw new Error(`explicit legacy Election source is missing: ${input.electionId}`);
  }
  const beforeRegistry = registryValue(root);
  if (beforeRegistry?.some((entry) => entry.electionId === input.electionId)) {
    throw new Error(`registry conflict: Election is already registered: ${input.electionId}`);
  }
  const snapshot = readCanonicalSnapshot(root, input.electionId);
  const allocated = new Set(beforeRegistry?.map((entry) => entry.dirName) ?? []);
  const targetPath = mintElectionDirName(input.electionId, input.createdAt, allocated);
  safeSegment(targetPath, "targetPath");
  if (targetPath === sourcePath || existsSync(join(root, targetPath))) {
    throw new Error(`target collision: ${targetPath}`);
  }
  const files = collectFiles(sourceDir);
  const registryAfter = [
    ...(beforeRegistry ?? []),
    {
      electionId: input.electionId,
      dirName: targetPath,
      createdAt: input.createdAt,
      status: asElectionState(snapshot.state),
    },
  ];
  const operations: MigrationOperation[] = [
    { order: 1, kind: "move-directory", sourcePath, targetPath },
    {
      order: 2,
      kind: "write-registry",
      sourcePath: basename(electionsRegistryPath(root)),
      targetPath: basename(electionsRegistryPath(root)),
    },
    { order: 3, kind: "verify-fidelity", sourcePath: targetPath, targetPath },
  ];
  const body: Omit<MigrationPlan, "planDigest"> = {
    operationId: input.operationId,
    electionId: input.electionId,
    sourcePath,
    targetPath,
    registryBefore: beforeRegistry,
    registryAfter,
    operations,
    preconditions: {
      sourceTreeDigest: treeDigest(files),
      registryDigest: registryDigest(beforeRegistry),
      targetMustBeAbsent: true,
      directories: collectDirectories(sourceDir),
      files,
    },
    beforeDigest: snapshotDigest(snapshot),
  };
  return deepFreeze({ ...body, planDigest: digestPlan(body) });
}

function assertPlanIntegrity(plan: MigrationPlan): void {
  safeSegment(plan.operationId, "operationId");
  safeSegment(plan.electionId, "electionId");
  safeSegment(plan.sourcePath, "sourcePath");
  safeSegment(plan.targetPath, "targetPath");
  if (plan.sourcePath !== plan.electionId) throw new Error("plan integrity conflict: source identity");
  if (!SHA256.test(plan.planDigest) || !SHA256.test(plan.beforeDigest)) {
    throw new Error("plan integrity conflict: malformed digest");
  }
  const { planDigest, ...body } = plan;
  if (digestPlan(body) !== planDigest) throw new Error("plan integrity conflict: digest mismatch");
  if (plan.preconditions.registryDigest !== registryDigest(plan.registryBefore)) {
    throw new Error("plan integrity conflict: registry precondition");
  }
  if (plan.preconditions.sourceTreeDigest !== treeDigest(plan.preconditions.files)) {
    throw new Error("plan integrity conflict: source precondition");
  }
  if (!sameValue(plan.operations.map((operation) => operation.kind), [
    "move-directory",
    "write-registry",
    "verify-fidelity",
  ])) {
    throw new Error("plan integrity conflict: operation order");
  }
}

function receiptPath(root: string, operationId: string): string {
  safeSegment(operationId, "operationId");
  return join(root, RECEIPTS_DIR, `${operationId}.json`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReceipt(value: unknown): value is MigrationReceipt {
  if (!isRecord(value)) return false;
  return typeof value.operationId === "string" &&
    typeof value.electionId === "string" &&
    typeof value.planDigest === "string" &&
    (value.status === "planned" ||
      value.status === "applied" ||
      value.status === "verified" ||
      value.status === "failed") &&
    Array.isArray(value.completedSteps) &&
    (value.afterDigest === null || typeof value.afterDigest === "string") &&
    (value.failureDetail === null || typeof value.failureDetail === "string") &&
    Array.isArray(value.recoveryDetails);
}

function isMigrationPlan(value: unknown): value is MigrationPlan {
  if (!isRecord(value) || !isRecord(value.preconditions)) return false;
  return typeof value.operationId === "string" &&
    typeof value.electionId === "string" &&
    typeof value.sourcePath === "string" &&
    typeof value.targetPath === "string" &&
    typeof value.beforeDigest === "string" &&
    typeof value.planDigest === "string" &&
    Array.isArray(value.operations);
}

function isMigrationApproval(value: unknown): value is MigrationApproval {
  return isRecord(value) && value.approved === true && typeof value.planDigest === "string";
}

export function readMigrationReceipt(
  root: string,
  operationId: string,
): MigrationReceipt | null {
  const path = receiptPath(root, operationId);
  if (!existsSync(path)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    throw new Error("migration receipt is corrupt");
  }
  if (!isReceipt(parsed)) throw new Error("migration receipt is corrupt");
  return parsed;
}

function writeReceipt(root: string, receipt: MigrationReceipt): MigrationReceipt {
  mkdirSync(join(root, RECEIPTS_DIR), { recursive: true });
  const written = writeStoreFile(receiptPath(root, receipt.operationId), `${JSON.stringify(receipt, null, 2)}\n`);
  if (!written.ok) throw new Error("migration receipt write failed");
  return deepFreeze(receipt);
}

function makeReceipt(
  plan: MigrationPlan,
  status: MigrationReceipt["status"],
  completedSteps: readonly MigrationStep[],
  recoveryDetails: readonly string[],
  afterDigest: string | null = null,
  failureDetail: string | null = null,
): MigrationReceipt {
  return {
    operationId: plan.operationId,
    electionId: plan.electionId,
    planDigest: plan.planDigest,
    status,
    completedSteps: [...completedSteps],
    afterDigest,
    failureDetail,
    recoveryDetails: [...recoveryDetails],
  };
}

function currentRegistryMatches(root: string, expected: readonly ElectionRegistryEntry[] | null): boolean {
  return sameValue(registryValue(root), expected);
}

function writeRegistry(root: string, entries: readonly ElectionRegistryEntry[]): void {
  const result = writeStoreFile(electionsRegistryPath(root), JSON.stringify(entries, null, 2));
  if (!result.ok) throw new Error("registry atomic update failed");
}

function tallySet(snapshot: ElectionV2Snapshot): readonly CanonicalTally[] {
  if (snapshot.history.length > 0) return snapshot.history;
  return snapshot.currentTally === null ? [] : [snapshot.currentTally];
}

function migrationLayoutFindings(root: string, plan: MigrationPlan): string[] {
  const findings: string[] = [];
  const sourceExists = existsSync(join(root, plan.sourcePath));
  const targetDir = join(root, plan.targetPath);
  const targetExists = existsSync(targetDir);
  if (sourceExists) findings.push("legacy source still exists");
  if (!targetExists) findings.push("planned target is missing");
  if (!currentRegistryMatches(root, plan.registryAfter)) findings.push("registry does not match plan");
  if (!targetExists) return findings;
  try {
    assertExactFiles(targetDir, plan);
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
    return findings;
  }
  return findings;
}

function verifyCanonicalSnapshot(
  root: string,
  plan: MigrationPlan,
  findings: string[],
): { snapshot: ElectionV2Snapshot | null; afterDigest: string } {
  if (findings.length > 0) {
    return {
      snapshot: null,
      afterDigest: canonicalDigest("election-migration-unavailable", findings),
    };
  }
  try {
    const snapshot = readCanonicalSnapshot(root, plan.electionId);
    const afterDigest = snapshotDigest(snapshot);
    if (afterDigest !== plan.beforeDigest) findings.push("canonical digest mismatch");
    return { snapshot, afterDigest };
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
    return {
      snapshot: null,
      afterDigest: canonicalDigest("election-migration-unavailable", findings),
    };
  }
}

export function verifyMigrationPlan(root: string, plan: MigrationPlan): FidelityResult {
  assertPlanIntegrity(plan);
  const findings = migrationLayoutFindings(root, plan);
  const { snapshot, afterDigest } = verifyCanonicalSnapshot(root, plan, findings);
  const tallies = snapshot === null ? [] : tallySet(snapshot);
  return deepFreeze({
    beforeDigest: plan.beforeDigest,
    afterDigest,
    canonicalQuestionIds: snapshot?.definition.questions.map((question) => question.questionId) ?? [],
    resultCount: tallies.reduce((count, tally) => count + tally.results.length, 0),
    runCount: tallies.length,
    match: findings.length === 0 && afterDigest === plan.beforeDigest,
    findings,
  });
}

interface ApplyProgress {
  readonly completed: MigrationStep[];
  readonly recoveryDetails: string[];
}

function addRecovery(progress: ApplyProgress, detail: string): void {
  if (progress.recoveryDetails.includes(detail)) return;
  progress.recoveryDetails.push(detail);
}

function prepareMove(
  root: string,
  plan: MigrationPlan,
  prior: MigrationReceipt | null,
  progress: ApplyProgress,
): void {
  const sourceDir = join(root, plan.sourcePath);
  const targetDir = join(root, plan.targetPath);
  const sourceExists = existsSync(sourceDir);
  const targetExists = existsSync(targetDir);
  if (sourceExists && targetExists) throw new Error("target collision: source and target both exist");
  if (!sourceExists && !targetExists) throw new Error("migration conflict: source and target are missing");
  if (!sourceExists) {
    if (prior === null) throw new Error("different plan cannot claim an existing target");
    assertExactFiles(targetDir, plan);
    progress.completed.push("move-directory");
    addRecovery(progress, "repaired completed move from source-absent target-present evidence");
    writeReceipt(root, makeReceipt(plan, "applied", progress.completed, progress.recoveryDetails));
    return;
  }
  if (!currentRegistryMatches(root, plan.registryBefore)) throw new Error("registry conflict before move");
  assertExactFiles(sourceDir, plan);
  if (snapshotDigest(readCanonicalSnapshot(root, plan.electionId)) !== plan.beforeDigest) {
    throw new Error("dirty canonical source digest conflict");
  }
  writeReceipt(root, makeReceipt(plan, "planned", progress.completed, progress.recoveryDetails));
  renameSync(sourceDir, targetDir);
  progress.completed.push("move-directory");
  writeReceipt(root, makeReceipt(plan, "applied", progress.completed, progress.recoveryDetails));
}

function commitRegistry(root: string, plan: MigrationPlan, progress: ApplyProgress): void {
  if (currentRegistryMatches(root, plan.registryBefore)) {
    writeRegistry(root, plan.registryAfter);
  } else if (currentRegistryMatches(root, plan.registryAfter)) {
    addRecovery(progress, "repaired completed registry update from exact registry evidence");
  } else {
    throw new Error("registry conflict after move");
  }
  progress.completed.push("write-registry");
  writeReceipt(root, makeReceipt(plan, "applied", progress.completed, progress.recoveryDetails));
}

export function applyMigrationPlan(
  root: string,
  plan: MigrationPlan,
  approval: MigrationApproval,
): MigrationReceipt {
  assertPlanIntegrity(plan);
  if (approval.approved !== true || approval.planDigest !== plan.planDigest) {
    throw new Error("approval does not match the plan digest");
  }
  const prior = readMigrationReceipt(root, plan.operationId);
  if (prior !== null && prior.planDigest !== plan.planDigest) {
    throw new Error("different plan conflicts with the durable migration receipt");
  }
  if (prior?.status === "verified") {
    const fidelity = verifyMigrationPlan(root, plan);
    if (fidelity.match && prior.afterDigest === fidelity.afterDigest) return prior;
  }

  const progress: ApplyProgress = {
    completed: [],
    recoveryDetails: [...(prior?.recoveryDetails ?? [])],
  };
  if (prior?.failureDetail !== null && prior?.failureDetail !== undefined) {
    addRecovery(progress, `previous failure: ${prior.failureDetail}`);
  }
  if (prior?.status === "verified") {
    addRecovery(progress, `previous verified digest: ${prior.afterDigest ?? "missing"}`);
  }
  const fail = (error: unknown): never => {
    const detail = error instanceof Error ? error.message : String(error);
    writeReceipt(
      root,
      makeReceipt(plan, "failed", progress.completed, progress.recoveryDetails, null, detail),
    );
    throw new Error(detail);
  };

  try {
    prepareMove(root, plan, prior, progress);
    commitRegistry(root, plan, progress);
    const fidelity = verifyMigrationPlan(root, plan);
    if (!fidelity.match) throw new Error(`fidelity verification failed: ${fidelity.findings.join("; ")}`);
    progress.completed.push("verify-fidelity");
    return writeReceipt(
      root,
      makeReceipt(
        plan,
        "verified",
        progress.completed,
        progress.recoveryDetails,
        fidelity.afterDigest,
      ),
    );
  } catch (error) {
    return fail(error);
  }
}

interface CliOptions {
  readonly projectDir: string;
  readonly space: string;
  readonly electionId: string | null;
  readonly operationId: string | null;
  readonly createdAt: string | null;
  readonly planPath: string | null;
  readonly approvalPath: string | null;
  readonly mode: "plan" | "apply" | "verify";
}

function parseArgs(args: readonly string[]): CliOptions {
  const options = {
    projectDir: process.cwd(),
    space: "default",
    electionId: null as string | null,
    operationId: null as string | null,
    createdAt: null as string | null,
    planPath: null as string | null,
    approvalPath: null as string | null,
  };
  let mode: CliOptions["mode"] = "plan";
  const valueFlags: Readonly<Record<string, keyof typeof options>> = {
    "--project-dir": "projectDir",
    "--space": "space",
    "--election": "electionId",
    "--operation-id": "operationId",
    "--created-at": "createdAt",
    "--plan": "planPath",
    "--approval": "approvalPath",
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--apply" || arg === "--verify") {
      mode = arg.slice(2) as CliOptions["mode"];
      continue;
    }
    const key = valueFlags[arg];
    if (key === undefined) throw new Error(`unknown argument: ${arg}`);
    const value = args[index + 1];
    if (value === undefined) throw new Error(`missing value for ${arg}`);
    index++;
    Object.assign(options, { [key]: value });
  }
  return { ...options, mode };
}

function readJsonUnknown(path: string | null, label: string): unknown {
  if (path === null) throw new Error(`${label} path is required`);
  return JSON.parse(readFileSync(path, "utf8"));
}

export function main(args = process.argv.slice(2)): number {
  const options = parseArgs(args);
  const root = electionsRoot(options.projectDir, options.space);
  if (options.mode === "plan") {
    if (options.electionId === null || options.operationId === null || options.createdAt === null) {
      throw new Error("plan requires --election, --operation-id, and --created-at");
    }
    const plan = createMigrationPlan(root, {
      electionId: options.electionId,
      operationId: options.operationId,
      createdAt: options.createdAt,
    });
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return 0;
  }
  const planRaw = readJsonUnknown(options.planPath, "plan");
  if (!isMigrationPlan(planRaw)) throw new Error("plan is corrupt");
  const plan = planRaw;
  if (options.mode === "verify") {
    const fidelity = verifyMigrationPlan(root, plan);
    process.stdout.write(`${JSON.stringify(fidelity, null, 2)}\n`);
    return fidelity.match ? 0 : 1;
  }
  const approvalRaw = readJsonUnknown(options.approvalPath, "approval");
  if (!isMigrationApproval(approvalRaw)) throw new Error("approval is corrupt");
  const approval = approvalRaw;
  const receipt = applyMigrationPlan(root, plan, approval);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  return receipt.status === "verified" ? 0 : 1;
}

if (import.meta.main) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
