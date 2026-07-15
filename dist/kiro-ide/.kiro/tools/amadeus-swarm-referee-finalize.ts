// Request-bound, single-writer finalize lifecycle for the swarm referee.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appendAuditEntryUnlocked } from "./amadeus-audit.ts";
import {
  canonicalJson,
  digestValue,
  hasExactKeys,
  isRecord,
  nonEmptyString,
} from "./amadeus-swarm-canonical.ts";
import {
  ATTEMPT_FAILURE_CODE_VALUES,
  buildFinalizeRequestBinding,
  buildRefereeFinalizeEnvelope,
  parseBoundFinalizeInvocation,
  parseFinalizeRequestBinding,
  parseRefereeFinalizeEnvelope,
  type AttemptFailureCode,
  type BoundFinalizeInvocation,
  type CodeMergeOutcome,
  type ExpectedUnitGitBinding,
  type FinalizeRequestBinding,
  type RefereeFinalizeEnvelope,
  type UnitMergeResult,
} from "./amadeus-swarm-finalize-contract.ts";
import { readAllAuditShards, recordDir, withAuditLock, writeFileAtomic } from "./amadeus-lib.ts";
import { finalizeOperationId } from "./amadeus-swarm-operation-claim.ts";
import {
  observeProcessIdentity,
  parseArmedProcessProgress,
  readRunIdentity,
  sameProcess,
  terminateExactProcessGroup,
  type ArmedProcessProgress,
} from "./amadeus-armed-process.ts";

export type { BoundFinalizeInvocation } from "./amadeus-swarm-finalize-contract.ts";

export type AidlcMergeResult = Readonly<{
  stateMergeDigest: string;
  auditMergeDigest: string;
  runtimeFragmentMergeDigest: string;
}>;

export type BoundFinalizePorts = Readonly<{
  validateRequest(
    binding: FinalizeRequestBinding,
    context: Readonly<{ completedUnits: readonly UnitMergeResult[] }>,
  ): Promise<AttemptFailureCode | null>;
  validateUnit(binding: ExpectedUnitGitBinding, request: FinalizeRequestBinding): Promise<AttemptFailureCode | null>;
  reverify(input: Readonly<{
    unit: string;
    checkCommand: string;
    protectedSpec?: string;
  }>): Promise<boolean>;
  mergeAidlc(input: Readonly<{
    unit: string;
    batch: number;
    operationId: string;
    finalizeRequestDigest: string;
    claimPath: string;
    fencingToken: number;
    onRunProgress(progress: ArmedProcessProgress): Promise<void>;
  }>): Promise<AidlcMergeResult>;
  mergeCode(input: Readonly<{
    unit: string;
    target: string;
    strategy: FinalizeRequestBinding["mergeStrategy"];
    message: string;
    operationId: string;
    claimPath: string;
    fencingToken: number;
    onRunProgress(progress: ArmedProcessProgress): Promise<void>;
  }>): Promise<CodeMergeOutcome>;
}>;

type UnitProgress = Readonly<
  | { state: "pending" }
  | { state: "verified" }
  | { state: "metadata-merging"; operationId: string; run?: ArmedProcessProgress }
  | { state: "metadata-merged"; operationId: string; aidlcMerge: AidlcMergeResult }
  | {
      state: "code-merging";
      aidlcOperationId: string;
      aidlcMerge: AidlcMergeResult;
      operationId: string;
      run?: ArmedProcessProgress;
    }
  | {
      state: "completed";
      result: UnitMergeResult;
    }
  | { state: "failed"; code: AttemptFailureCode }
>;

export type FinalizeProgress = Readonly<{
  schemaVersion: 1;
  finalizeInvocationId: string;
  finalizeRequestDigest: string;
  fencingToken: number;
  units: Readonly<Record<string, UnitProgress>>;
  progressDigest: string;
}>;

export type FinalizeClaim = Readonly<{
  schemaVersion: 1;
  finalizeInvocationId: string;
  finalizeRequestDigest: string;
  ownerPid: number;
  ownerStartTokenHash: string;
  fencingToken: number;
  expiresAt: string;
  status: "active" | "terminal";
  claimDigest: string;
}>;

export type AuditDirective = Readonly<{
  event: "SWARM_UNIT_CONVERGED" | "SWARM_UNIT_FAILED" | "SWARM_BATON_RETURNED" | "SWARM_COMPLETED";
  fields: Readonly<Record<string, string>>;
}>;

export type FinalizeAcquisition = Readonly<{
  claim: FinalizeClaim;
  progress: FinalizeProgress;
  claimPath: string;
  result: RefereeFinalizeEnvelope | null;
}>;

export type BoundFinalizeStore = Readonly<{
  acquire(binding: FinalizeRequestBinding): FinalizeAcquisition;
  heartbeat(claim: FinalizeClaim): FinalizeClaim;
  update(claim: FinalizeClaim, progress: FinalizeProgress, audit?: readonly AuditDirective[]): void;
  complete(
    claim: FinalizeClaim,
    progress: FinalizeProgress,
    result: RefereeFinalizeEnvelope,
    audit: readonly AuditDirective[],
  ): void;
}>;

export type BoundFinalizeError = Readonly<{
  code:
    | "FINALIZE_BINDING_INVALID"
    | "REFEREE_CLAIM_ACTIVE"
    | "PERSISTENCE_FAILED";
}>;

export type BoundFinalizeResult =
  | Readonly<{ type: "ok"; value: RefereeFinalizeEnvelope }>
  | Readonly<{ type: "err"; error: BoundFinalizeError }>;

function ok(value: RefereeFinalizeEnvelope): BoundFinalizeResult {
  return Object.freeze({ type: "ok", value });
}

function err(code: BoundFinalizeError["code"]): BoundFinalizeResult {
  return Object.freeze({ type: "err", error: Object.freeze({ code }) });
}

function currentStartTokenHash(pid = process.pid): string {
  if (process.platform === "linux") {
    try {
      const token = readFileSync(`/proc/${pid}/stat`, "utf-8").trim().split(" ")[21];
      return token ? digestValue(token) : "";
    } catch {
      return "";
    }
  }
  if (process.platform === "darwin") {
    const result = spawnSync("ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    return result.status === 0 && result.stdout.trim() ? digestValue(result.stdout.trim()) : "";
  }
  return "";
}

function ownerIsLive(claim: FinalizeClaim): boolean {
  const observed = currentStartTokenHash(claim.ownerPid);
  return observed.length > 0 && observed === claim.ownerStartTokenHash;
}

function parseJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function freezeClaim(value: Omit<FinalizeClaim, "claimDigest">): FinalizeClaim {
  return Object.freeze({ ...value, claimDigest: digestValue(value) });
}

function parseFinalizeClaim(
  value: unknown,
  binding: Pick<FinalizeRequestBinding, "finalizeInvocationId" | "finalizeRequestDigest">,
): FinalizeClaim {
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "finalizeInvocationId",
      "finalizeRequestDigest",
      "ownerPid",
      "ownerStartTokenHash",
      "fencingToken",
      "expiresAt",
      "status",
      "claimDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    value.finalizeInvocationId !== binding.finalizeInvocationId ||
    value.finalizeRequestDigest !== binding.finalizeRequestDigest ||
    !Number.isInteger(value.ownerPid) ||
    Number(value.ownerPid) < 1 ||
    !nonEmptyString(value.ownerStartTokenHash) ||
    !Number.isInteger(value.fencingToken) ||
    Number(value.fencingToken) < 1 ||
    Number.isNaN(Date.parse(String(value.expiresAt))) ||
    (value.status !== "active" && value.status !== "terminal") ||
    !nonEmptyString(value.claimDigest)
  ) {
    throw new Error("claim conflict");
  }
  const { claimDigest, ...semantic } = value;
  if (digestValue(semantic) !== claimDigest) throw new Error("claim conflict");
  return Object.freeze(value) as FinalizeClaim;
}

function aidlcMergeIsValid(value: unknown): value is AidlcMergeResult {
  return (
    hasExactKeys(value, ["stateMergeDigest", "auditMergeDigest", "runtimeFragmentMergeDigest"]) &&
    [value.stateMergeDigest, value.auditMergeDigest, value.runtimeFragmentMergeDigest].every(nonEmptyString)
  );
}

function unitResultIsValid(value: unknown): value is UnitMergeResult {
  if (!isRecord(value)) return false;
  return (
    buildRefereeFinalizeEnvelope({
      executionId: "stored-progress",
      attemptId: "stored-progress",
      finalizeInvocationId: "stored-progress",
      finalizeRequestDigest: "stored-progress",
      batch: 1,
      units: [value as UnitMergeResult],
      failures: [],
      mergeCompleted: false,
    }).type === "ok"
  );
}

function metadataMergingProgressIsValid(value: Record<string, unknown>): boolean {
  return (
    hasExactKeys(value, ["state", "operationId", ...(value.run === undefined ? [] : ["run"])]) &&
    nonEmptyString(value.operationId) &&
    (value.run === undefined || parseArmedProcessProgress(value.run).type === "ok")
  );
}

function metadataMergedProgressIsValid(value: Record<string, unknown>): boolean {
  return (
    hasExactKeys(value, ["state", "operationId", "aidlcMerge"]) &&
    nonEmptyString(value.operationId) &&
    aidlcMergeIsValid(value.aidlcMerge)
  );
}

function codeMergingProgressIsValid(value: Record<string, unknown>): boolean {
  return (
    hasExactKeys(value, [
      "state",
      "aidlcOperationId",
      "aidlcMerge",
      "operationId",
      ...(value.run === undefined ? [] : ["run"]),
    ]) &&
    nonEmptyString(value.aidlcOperationId) &&
    nonEmptyString(value.operationId) &&
    aidlcMergeIsValid(value.aidlcMerge) &&
    (value.run === undefined || parseArmedProcessProgress(value.run).type === "ok")
  );
}

function failedProgressIsValid(value: Record<string, unknown>): boolean {
  return (
    hasExactKeys(value, ["state", "code"]) &&
    ATTEMPT_FAILURE_CODE_VALUES.includes(value.code as AttemptFailureCode)
  );
}

function unitProgressIsValid(value: unknown): value is UnitProgress {
  if (!isRecord(value) || !nonEmptyString(value.state)) return false;
  if (value.state === "pending" || value.state === "verified") return hasExactKeys(value, ["state"]);
  if (value.state === "metadata-merging") return metadataMergingProgressIsValid(value);
  if (value.state === "metadata-merged") return metadataMergedProgressIsValid(value);
  if (value.state === "code-merging") return codeMergingProgressIsValid(value);
  if (value.state === "completed") return hasExactKeys(value, ["state", "result"]) && unitResultIsValid(value.result);
  return value.state === "failed" && failedProgressIsValid(value);
}

function freezeProgress(value: Omit<FinalizeProgress, "progressDigest">): FinalizeProgress {
  return Object.freeze({ ...value, progressDigest: digestValue(value) });
}

export function parseFinalizeProgress(
  value: unknown,
  binding: FinalizeRequestBinding,
): FinalizeProgress {
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "finalizeInvocationId",
      "finalizeRequestDigest",
      "fencingToken",
      "units",
      "progressDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    value.finalizeInvocationId !== binding.finalizeInvocationId ||
    value.finalizeRequestDigest !== binding.finalizeRequestDigest ||
    !Number.isInteger(value.fencingToken) ||
    Number(value.fencingToken) < 1 ||
    !isRecord(value.units) ||
    Object.keys(value.units).sort().join("\0") !== binding.expectedUnits.map(({ unit }) => unit).sort().join("\0") ||
    Object.values(value.units).some((unit) => !unitProgressIsValid(unit)) ||
    !nonEmptyString(value.progressDigest)
  ) {
    throw new Error("progress conflict");
  }
  const { progressDigest, ...semantic } = value;
  if (digestValue(semantic) !== progressDigest) throw new Error("progress conflict");
  return Object.freeze(value) as FinalizeProgress;
}

type FileFinalizeStoreInput = Readonly<{
  projectDir: string;
  intent?: string;
  space?: string;
  now?: () => Date;
}>;

type FinalizePaths = Readonly<{
  request: string;
  claim: string;
  progress: string;
  result: string;
}>;

function ensureFinalizeRequest(path: string, binding: FinalizeRequestBinding): void {
  if (!existsSync(path)) {
    writeFileAtomic(path, `${canonicalJson(binding)}\n`);
    return;
  }
  const parsed = parseFinalizeRequestBinding(parseJson<unknown>(path));
  if (parsed.type === "err" || parsed.value.finalizeRequestDigest !== binding.finalizeRequestDigest) {
    throw new Error("request conflict");
  }
}

function sameClaimOwner(claim: FinalizeClaim | null, ownerStartTokenHash: string): boolean {
  return claim?.ownerPid === process.pid && claim.ownerStartTokenHash === ownerStartTokenHash;
}

function competingClaimIsActive(
  claim: FinalizeClaim | null,
  instant: Date,
  ownerStartTokenHash: string,
): boolean {
  if (claim?.status !== "active" || sameClaimOwner(claim, ownerStartTokenHash)) return false;
  return Date.parse(claim.expiresAt) > instant.getTime() || ownerIsLive(claim);
}

function nextFinalizeClaim(
  binding: FinalizeRequestBinding,
  previous: FinalizeClaim | null,
  terminal: RefereeFinalizeEnvelope | null,
  ownerStartTokenHash: string,
  instant: Date,
): FinalizeClaim {
  const sameOwner = sameClaimOwner(previous, ownerStartTokenHash);
  return freezeClaim({
    schemaVersion: 1,
    finalizeInvocationId: binding.finalizeInvocationId,
    finalizeRequestDigest: binding.finalizeRequestDigest,
    ownerPid: process.pid,
    ownerStartTokenHash,
    fencingToken: previous ? previous.fencingToken + (sameOwner ? 0 : 1) : 1,
    expiresAt: new Date(instant.getTime() + 30_000).toISOString(),
    status: terminal ? "terminal" : "active",
  });
}

function initialFinalizeProgress(binding: FinalizeRequestBinding, fencingToken: number): FinalizeProgress {
  return freezeProgress({
    schemaVersion: 1,
    finalizeInvocationId: binding.finalizeInvocationId,
    finalizeRequestDigest: binding.finalizeRequestDigest,
    fencingToken,
    units: Object.freeze(
      Object.fromEntries(binding.expectedUnits.map(({ unit }) => [unit, Object.freeze({ state: "pending" })])),
    ),
  });
}

function loadFinalizeProgress(
  path: string,
  binding: FinalizeRequestBinding,
  claim: FinalizeClaim,
): FinalizeProgress {
  const stored = existsSync(path)
    ? parseFinalizeProgress(parseJson<unknown>(path), binding)
    : initialFinalizeProgress(binding, claim.fencingToken);
  if (
    stored.finalizeRequestDigest !== binding.finalizeRequestDigest ||
    stored.finalizeInvocationId !== binding.finalizeInvocationId
  ) {
    throw new Error("progress conflict");
  }
  if (stored.fencingToken === claim.fencingToken) return stored;
  const { progressDigest: _progressDigest, ...semantic } = stored;
  const progress = freezeProgress({ ...semantic, fencingToken: claim.fencingToken });
  writeFileAtomic(path, `${canonicalJson(progress)}\n`);
  return progress;
}

function recoverExactRun(run: ArmedProcessProgress, instant: Date): void {
  if (run.phase === "terminal") return;
  let identity = run.identity;
  if (!identity) {
    const materialized = readRunIdentity(run.plan);
    if (materialized.type === "ok") identity = materialized.value.process;
  }
  if (!identity) {
    if (instant.getTime() <= Date.parse(run.plan.armDeadline)) throw new Error("claim active");
    return;
  }
  const terminated = terminateExactProcessGroup(identity);
  if (
    terminated.type === "err" &&
    terminated.error.code !== "PROCESS_NOT_FOUND" &&
    terminated.error.code !== "PROCESS_IDENTITY_MISMATCH"
  ) {
    throw new Error("claim active");
  }
  const waitArray = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const status = spawnSync("ps", ["-o", "stat=", "-p", String(identity.pid)], {
      encoding: "utf-8",
      timeout: 1_000,
    });
    if (status.status !== 0 || status.stdout.trim().startsWith("Z")) return;
    const observed = observeProcessIdentity(identity.pid, identity.platform);
    if (observed.type === "err" || !sameProcess(identity, observed.value)) return;
    Atomics.wait(waitArray, 0, 0, 20);
  }
  throw new Error("claim active");
}

function recoverStaleRuns(progress: FinalizeProgress, instant: Date): void {
  for (const unit of Object.values(progress.units)) {
    if ((unit.state === "metadata-merging" || unit.state === "code-merging") && unit.run) {
      recoverExactRun(unit.run, instant);
    }
  }
}

function acquireFinalizeLocked(
  dir: string,
  paths: FinalizePaths,
  binding: FinalizeRequestBinding,
  ownerStartTokenHash: string,
  now: () => Date,
): FinalizeAcquisition {
  mkdirSync(dir, { recursive: true });
  ensureFinalizeRequest(paths.request, binding);
  let terminal: RefereeFinalizeEnvelope | null = null;
  if (existsSync(paths.result)) {
    const parsed = parseRefereeFinalizeEnvelope(parseJson<unknown>(paths.result));
    if (parsed.type === "err") throw new Error("result conflict");
    terminal = parsed.value;
  }
  const previous = existsSync(paths.claim)
    ? parseFinalizeClaim(parseJson<unknown>(paths.claim), binding)
    : null;
  const instant = now();
  if (competingClaimIsActive(previous, instant, ownerStartTokenHash)) throw new Error("claim active");
  if (
    previous?.status === "active" &&
    !sameClaimOwner(previous, ownerStartTokenHash) &&
    existsSync(paths.progress)
  ) {
    recoverStaleRuns(parseFinalizeProgress(parseJson<unknown>(paths.progress), binding), instant);
  }
  const claim = nextFinalizeClaim(binding, previous, terminal, ownerStartTokenHash, instant);
  writeFileAtomic(paths.claim, `${canonicalJson(claim)}\n`);
  const progress = loadFinalizeProgress(paths.progress, binding, claim);
  return Object.freeze({ claim, progress, claimPath: paths.claim, result: terminal });
}

function auditAlreadyExists(
  audit: string,
  directive: AuditDirective,
  invocationId: string,
): boolean {
  const blocks = audit.replace(/\r\n/g, "\n").split(/\n---\n/);
  return blocks.some((block) => {
    if (!block.includes(`**Event**: ${directive.event}`)) return false;
    if (!block.includes(`**Finalize invocation ID**: ${invocationId}`)) return false;
    const unit = directive.fields["Unit name"];
    return unit === undefined || block.includes(`**Unit name**: ${unit}`);
  });
}

function appendDirectives(
  projectDir: string,
  invocationId: string,
  directives: readonly AuditDirective[],
  intent?: string,
  space?: string,
): void {
  const audit = readAllAuditShards(projectDir, intent, space);
  for (const directive of directives) {
    if (auditAlreadyExists(audit, directive, invocationId)) continue;
    appendAuditEntryUnlocked(directive.event, { ...directive.fields }, projectDir, intent, space);
  }
}

export function createFileBoundFinalizeStore(input: FileFinalizeStoreInput): BoundFinalizeStore {
  const now = input.now ?? (() => new Date());
  const invocationDir = (finalizeInvocationId: string): string => {
    const record = recordDir(input.projectDir, input.intent, input.space);
    if (!record) throw new Error("record unavailable");
    return join(record, ".amadeus-swarm-referee", `finalize-${finalizeInvocationId}`);
  };

  return Object.freeze({
    acquire(binding): FinalizeAcquisition {
      const dir = invocationDir(binding.finalizeInvocationId);
      const requestPath = join(dir, "request.json");
      const claimPath = join(dir, "claim.json");
      const progressPath = join(dir, "progress.json");
      const resultPath = join(dir, "result.json");
      const ownerStartTokenHash = currentStartTokenHash();
      if (!ownerStartTokenHash) throw new Error("unsupported process identity");
      const paths = Object.freeze({ request: requestPath, claim: claimPath, progress: progressPath, result: resultPath });
      return withAuditLock(
        input.projectDir,
        () => acquireFinalizeLocked(dir, paths, binding, ownerStartTokenHash, now),
        input.intent,
        input.space,
      );
    },

    heartbeat(claim): FinalizeClaim {
      return withAuditLock(input.projectDir, () => {
        const claimPath = join(invocationDir(claim.finalizeInvocationId), "claim.json");
        const current = parseFinalizeClaim(parseJson<unknown>(claimPath), claim);
        if (
          current.fencingToken !== claim.fencingToken ||
          current.ownerPid !== claim.ownerPid ||
          current.ownerStartTokenHash !== claim.ownerStartTokenHash ||
          current.status !== "active"
        ) {
          throw new Error("stale claim");
        }
        const { claimDigest: _claimDigest, ...semantic } = current;
        const next = freezeClaim({
          ...semantic,
          expiresAt: new Date(now().getTime() + 30_000).toISOString(),
        });
        writeFileAtomic(claimPath, `${canonicalJson(next)}\n`);
        return next;
      }, input.intent, input.space);
    },

    update(claim, progress, audit = []): void {
      withAuditLock(input.projectDir, () => {
        const dir = invocationDir(claim.finalizeInvocationId);
        const current = parseFinalizeClaim(parseJson<unknown>(join(dir, "claim.json")), claim);
        const request = parseFinalizeRequestBinding(parseJson<unknown>(join(dir, "request.json")));
        if (
          request.type === "err" ||
          current.fencingToken !== claim.fencingToken ||
          current.status !== "active" ||
          progress.fencingToken !== claim.fencingToken ||
          parseFinalizeProgress(progress, request.value).fencingToken !== claim.fencingToken
        ) {
          throw new Error("stale claim");
        }
        appendDirectives(input.projectDir, claim.finalizeInvocationId, audit, input.intent, input.space);
        writeFileAtomic(join(dir, "progress.json"), `${canonicalJson(progress)}\n`);
      }, input.intent, input.space);
    },

    complete(claim, progress, result, audit): void {
      withAuditLock(input.projectDir, () => {
        const dir = invocationDir(claim.finalizeInvocationId);
        const claimPath = join(dir, "claim.json");
        const current = parseFinalizeClaim(parseJson<unknown>(claimPath), claim);
        const request = parseFinalizeRequestBinding(parseJson<unknown>(join(dir, "request.json")));
        const parsedResult = parseRefereeFinalizeEnvelope(result);
        if (
          request.type === "err" ||
          parsedResult.type === "err" ||
          current.fencingToken !== claim.fencingToken ||
          current.status !== "active" ||
          progress.fencingToken !== claim.fencingToken ||
          parseFinalizeProgress(progress, request.value).fencingToken !== claim.fencingToken
        ) {
          throw new Error("stale claim");
        }
        appendDirectives(input.projectDir, claim.finalizeInvocationId, audit, input.intent, input.space);
        writeFileAtomic(join(dir, "progress.json"), `${canonicalJson(progress)}\n`);
        writeFileAtomic(join(dir, "result.json"), `${canonicalJson(result)}\n`);
        const { claimDigest: _claimDigest, ...claimSemantic } = current;
        writeFileAtomic(claimPath, `${canonicalJson(freezeClaim({ ...claimSemantic, status: "terminal" }))}\n`);
      }, input.intent, input.space);
    },
  });
}

function withUnit(progress: FinalizeProgress, unit: string, state: UnitProgress): FinalizeProgress {
  const { progressDigest: _progressDigest, ...semantic } = progress;
  return freezeProgress({
    ...semantic,
    units: Object.freeze({ ...progress.units, [unit]: Object.freeze(state) }),
  });
}

function unitAudit(
  binding: FinalizeRequestBinding,
  unit: string,
  failure?: AttemptFailureCode,
): readonly AuditDirective[] {
  const common = {
    "Batch number": String(binding.batch),
    "Unit name": unit,
    "Execution ID": binding.executionId,
    "Attempt ID": binding.attemptId,
    "Finalize invocation ID": binding.finalizeInvocationId,
  };
  if (!failure) return Object.freeze([{ event: "SWARM_UNIT_CONVERGED", fields: common }]);
  return Object.freeze([
    { event: "SWARM_UNIT_FAILED", fields: { ...common, Reason: failure } },
    { event: "SWARM_BATON_RETURNED", fields: { ...common, Reason: failure } },
  ]);
}

function batchAudit(binding: FinalizeRequestBinding, converged: number, failed: number): readonly AuditDirective[] {
  return Object.freeze([
    {
      event: "SWARM_COMPLETED",
      fields: {
        "Batch number": String(binding.batch),
        "Converged count": String(converged),
        "Failed count": String(failed),
        "Execution ID": binding.executionId,
        "Attempt ID": binding.attemptId,
        "Finalize invocation ID": binding.finalizeInvocationId,
      },
    },
  ]);
}

function validatedBinding(binding: FinalizeRequestBinding, invocation: BoundFinalizeInvocation): boolean {
  const parsedInvocation = parseBoundFinalizeInvocation(invocation);
  if (parsedInvocation.type === "err") return false;
  const closedInvocation = parsedInvocation.value;
  const { schemaVersion: _schemaVersion, finalizeRequestDigest, ...semantic } = binding;
  const rebuilt = buildFinalizeRequestBinding(semantic);
  return (
    closedInvocation.finalizeInvocationId === binding.finalizeInvocationId &&
    digestValue(closedInvocation.checkCommand) === binding.checkCommandDigest &&
    digestValue(closedInvocation.mergeMessage) === binding.mergeMessageDigest &&
    rebuilt.type === "ok" &&
    rebuilt.value.finalizeRequestDigest === finalizeRequestDigest
  );
}

async function markFailed(
  store: BoundFinalizeStore,
  claim: FinalizeClaim,
  progress: FinalizeProgress,
  binding: FinalizeRequestBinding,
  unit: string,
  code: AttemptFailureCode,
): Promise<FinalizeProgress> {
  const next = withUnit(progress, unit, { state: "failed", code });
  store.update(claim, next, unitAudit(binding, unit, code));
  return next;
}

type BoundFinalizeExecutionInput = Readonly<{
  binding: FinalizeRequestBinding;
  invocation: BoundFinalizeInvocation;
  store: BoundFinalizeStore;
  ports: BoundFinalizePorts;
}>;

type FinalizeStep = Readonly<{ claim: FinalizeClaim; progress: FinalizeProgress }>;

// Fails every expected unit that has not reached a terminal state (completed
// or failed). Crash-resumed progress can hold units in intermediate merge
// states (metadata-merging/metadata-merged/code-merging); sweeping them keeps
// the terminal envelope covering every expected unit, which
// validateRefereeEnvelope enforces on the consumer side.
async function failUnsettledUnits(
  input: BoundFinalizeExecutionInput,
  claim: FinalizeClaim,
  progress: FinalizeProgress,
  code: AttemptFailureCode,
): Promise<FinalizeProgress> {
  let next = progress;
  for (const { unit } of input.binding.expectedUnits) {
    const state = next.units[unit].state;
    if (state !== "completed" && state !== "failed") {
      next = await markFailed(input.store, claim, next, input.binding, unit, code);
    }
  }
  return next;
}

async function validateExpectedUnits(
  input: BoundFinalizeExecutionInput,
  initialClaim: FinalizeClaim,
  initialProgress: FinalizeProgress,
): Promise<FinalizeStep & Readonly<{ mergeBlocked: boolean }>> {
  const declined = new Set(input.binding.declinedUnits.map(({ unit }) => unit));
  let claim = initialClaim;
  let progress = initialProgress;
  let mergeBlocked = false;
  for (const expected of input.binding.expectedUnits) {
    const current = progress.units[expected.unit];
    if (current.state === "completed") continue;
    if (current.state === "failed") {
      if (!declined.has(expected.unit)) mergeBlocked = true;
      continue;
    }
    claim = input.store.heartbeat(claim);
    if (declined.has(expected.unit)) {
      progress = await markFailed(input.store, claim, progress, input.binding, expected.unit, "REFEREE_CHECK_FAILED");
      continue;
    }
    const bindingFailure = await input.ports.validateUnit(expected, input.binding);
    if (bindingFailure) {
      progress = await markFailed(input.store, claim, progress, input.binding, expected.unit, bindingFailure);
      mergeBlocked = true;
      continue;
    }
    if (current.state !== "pending") continue;
    const verified = await input.ports.reverify({
      unit: expected.unit,
      checkCommand: input.invocation.checkCommand,
      ...(input.binding.protectedSpec.kind === "file"
        ? { protectedSpec: input.binding.protectedSpec.confinedRelativePath }
        : {}),
    });
    if (!verified) {
      progress = await markFailed(input.store, claim, progress, input.binding, expected.unit, "LYING_CONDUCTOR");
      mergeBlocked = true;
      continue;
    }
    progress = withUnit(progress, expected.unit, { state: "verified" });
    input.store.update(claim, progress);
  }
  return Object.freeze({ claim, progress, mergeBlocked });
}

async function mergeUnit(
  input: BoundFinalizeExecutionInput,
  claimPath: string,
  initialClaim: FinalizeClaim,
  initialProgress: FinalizeProgress,
  expected: ExpectedUnitGitBinding,
): Promise<FinalizeStep> {
  let claim = initialClaim;
  let progress = initialProgress;
  let unitProgress = progress.units[expected.unit];
  if (unitProgress.state === "verified") {
    const operationId = finalizeOperationId(input.binding.finalizeInvocationId, expected.unit, "metadata-merge");
    progress = withUnit(progress, expected.unit, { state: "metadata-merging", operationId });
    input.store.update(claim, progress);
    unitProgress = progress.units[expected.unit];
  }
  if (unitProgress.state === "metadata-merging") {
    let aidlcMerge: AidlcMergeResult;
    try {
      const operationId = unitProgress.operationId;
      aidlcMerge = await input.ports.mergeAidlc({
        unit: expected.unit,
        batch: input.binding.batch,
        operationId,
        finalizeRequestDigest: input.binding.finalizeRequestDigest,
        claimPath,
        fencingToken: claim.fencingToken,
        onRunProgress: async (run) => {
          const current = progress.units[expected.unit];
          if (current.state !== "metadata-merging" || current.operationId !== operationId) {
            throw new Error("operation progress conflict");
          }
          progress = withUnit(progress, expected.unit, { ...current, run });
          input.store.update(claim, progress);
        },
      });
    } catch {
      progress = await markFailed(
        input.store,
        claim,
        progress,
        input.binding,
        expected.unit,
        "METADATA_MERGE_FAILED",
      );
      return Object.freeze({ claim, progress });
    }
    progress = withUnit(progress, expected.unit, {
      state: "metadata-merged",
      operationId: unitProgress.operationId,
      aidlcMerge,
    });
    input.store.update(claim, progress);
    unitProgress = progress.units[expected.unit];
  }
  if (unitProgress.state === "metadata-merged") {
    const operationId = finalizeOperationId(input.binding.finalizeInvocationId, expected.unit, "code-merge");
    progress = withUnit(progress, expected.unit, {
      state: "code-merging",
      aidlcOperationId: unitProgress.operationId,
      aidlcMerge: unitProgress.aidlcMerge,
      operationId,
    });
    input.store.update(claim, progress);
    unitProgress = progress.units[expected.unit];
  }
  if (unitProgress.state !== "code-merging") {
    progress = await markFailed(input.store, claim, progress, input.binding, expected.unit, "SCHEMA_INVALID");
    return Object.freeze({ claim, progress });
  }
  claim = input.store.heartbeat(claim);
  let codeMerge: CodeMergeOutcome;
  try {
    const operationId = unitProgress.operationId;
    codeMerge = await input.ports.mergeCode({
      unit: expected.unit,
      target: input.binding.mergeTargetBranch,
      strategy: input.binding.mergeStrategy,
      message: input.invocation.mergeMessage,
      operationId,
      claimPath,
      fencingToken: claim.fencingToken,
      onRunProgress: async (run) => {
        const current = progress.units[expected.unit];
        if (current.state !== "code-merging" || current.operationId !== operationId) {
          throw new Error("operation progress conflict");
        }
        progress = withUnit(progress, expected.unit, { ...current, run });
        input.store.update(claim, progress);
      },
    });
  } catch {
    progress = await markFailed(input.store, claim, progress, input.binding, expected.unit, "CODE_MERGE_FAILED");
    return Object.freeze({ claim, progress });
  }
  const result: UnitMergeResult = Object.freeze({
    unit: expected.unit,
    aidlcMerge: unitProgress.aidlcMerge,
    codeMerge,
    cleanup: "completed",
    unitAuditDigest: digestValue({
      finalizeInvocationId: input.binding.finalizeInvocationId,
      unit: expected.unit,
      aidlcMerge: unitProgress.aidlcMerge,
      codeMerge,
    }),
  });
  progress = withUnit(progress, expected.unit, { state: "completed", result });
  input.store.update(claim, progress, unitAudit(input.binding, expected.unit));
  return Object.freeze({ claim, progress });
}

async function mergeExpectedUnits(
  input: BoundFinalizeExecutionInput,
  claimPath: string,
  initialClaim: FinalizeClaim,
  initialProgress: FinalizeProgress,
): Promise<FinalizeStep> {
  let claim = initialClaim;
  let progress = initialProgress;
  for (const expected of input.binding.expectedUnits) {
    const current = progress.units[expected.unit];
    if (current.state === "completed" || current.state === "failed") continue;
    claim = input.store.heartbeat(claim);
    ({ claim, progress } = await mergeUnit(input, claimPath, claim, progress, expected));
  }
  return Object.freeze({ claim, progress });
}

function completeFinalize(
  input: BoundFinalizeExecutionInput,
  claim: FinalizeClaim,
  progress: FinalizeProgress,
): BoundFinalizeResult {
  const units = Object.values(progress.units)
    .filter((entry): entry is Extract<UnitProgress, { state: "completed" }> => entry.state === "completed")
    .map((entry) => entry.result);
  const failures = Object.entries(progress.units)
    .filter((entry): entry is [string, Extract<UnitProgress, { state: "failed" }>] => entry[1].state === "failed")
    .map(([unit, entry]) => Object.freeze({ unit, code: entry.code }));
  const envelope = buildRefereeFinalizeEnvelope({
    executionId: input.binding.executionId,
    attemptId: input.binding.attemptId,
    finalizeInvocationId: input.binding.finalizeInvocationId,
    finalizeRequestDigest: input.binding.finalizeRequestDigest,
    batch: input.binding.batch,
    units,
    failures,
    mergeCompleted: failures.length === 0 && units.length === input.binding.expectedUnits.length,
  });
  if (envelope.type === "err") return err("FINALIZE_BINDING_INVALID");
  input.store.complete(claim, progress, envelope.value, batchAudit(input.binding, units.length, failures.length));
  return ok(envelope.value);
}

export async function executeBoundFinalize(input: BoundFinalizeExecutionInput): Promise<BoundFinalizeResult> {
  if (!validatedBinding(input.binding, input.invocation)) return err("FINALIZE_BINDING_INVALID");
  let acquisition: FinalizeAcquisition;
  try {
    acquisition = input.store.acquire(input.binding);
  } catch (error) {
    return err(error instanceof Error && error.message === "claim active" ? "REFEREE_CLAIM_ACTIVE" : "PERSISTENCE_FAILED");
  }
  if (acquisition.result) return ok(acquisition.result);
  let { claim, progress } = acquisition;

  try {
    const completedUnits = Object.values(progress.units)
      .filter((unit): unit is Extract<UnitProgress, { state: "completed" }> => unit.state === "completed")
      .map(({ result }) => result)
      .sort((a, b) => a.unit.localeCompare(b.unit));
    const requestFailure = await input.ports.validateRequest(input.binding, { completedUnits });
    if (requestFailure) {
      progress = await failUnsettledUnits(input, claim, progress, requestFailure);
    } else {
      const validated = await validateExpectedUnits(input, claim, progress);
      claim = validated.claim;
      progress = validated.progress;
      if (validated.mergeBlocked) {
        progress = await failUnsettledUnits(input, claim, progress, "REFEREE_FINALIZE_FAILED");
      } else {
        ({ claim, progress } = await mergeExpectedUnits(input, acquisition.claimPath, claim, progress));
      }
    }
    return completeFinalize(input, claim, progress);
  } catch {
    return err("PERSISTENCE_FAILED");
  }
}
