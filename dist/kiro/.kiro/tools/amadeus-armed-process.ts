// Neutral identity-first, one-time-arm process protocol shared by driver and merge supervisors.

import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  digestValue,
  hasExactKeys,
  isRecord,
  nonEmptyString,
  rejectSecretLikeFields,
} from "./amadeus-swarm-canonical.ts";

export type ProcessIdentity = Readonly<{
  platform: "darwin" | "linux";
  pid: number;
  processGroupId: number;
  startTokenHash: string;
}>;

export type ProcessLivenessObservation =
  | Readonly<{ status: "live"; observedOwner: ProcessIdentity }>
  | Readonly<{ status: "dead" }>
  | Readonly<{ status: "unknown" }>;

type ProcessLivenessDependencies = Readonly<{
  signalProcess?: (pid: number) => void;
  observeIdentity?: typeof observeProcessIdentity;
}>;

export type PlannedRun = Readonly<{
  schemaVersion: 1;
  runId: string;
  identityPath: string;
  armPath: string;
  armDigest: string;
  armDeadline: string;
}>;

export type ArmedProcessProgress = Readonly<{
  schemaVersion: 1;
  runId: string;
  phase: "planned" | "identity-established" | "arm-approved" | "armed" | "terminal";
  plan: PlannedRun;
  identity?: ProcessIdentity;
  armReceiptDigest?: string;
  exitCode?: number;
  progressDigest: string;
}>;

export type RunIdentity = Readonly<{
  schemaVersion: 1;
  runId: string;
  armDigest: string;
  process: ProcessIdentity;
  status: "identity-established" | "armed" | "child-running" | "terminal";
}>;

export type ArmReceipt = Readonly<{
  schemaVersion: 1;
  runId: string;
  executionId: string;
  attemptId: string;
  planDigest: string;
  waveDigest: string;
  fencingToken: number;
  identityDigest: string;
}>;

export type SupervisorError = Readonly<{
  code:
    | "PLATFORM_UNSUPPORTED"
    | "PROCESS_NOT_FOUND"
    | "PROCESS_IDENTITY_MISMATCH"
    | "IDENTITY_INVALID"
    | "ARM_INVALID"
    | "ARM_ALREADY_CONSUMED"
    | "PATH_ESCAPE"
    | "ARM_DEADLINE_EXCEEDED"
    | "PROCESS_TIMEOUT"
    | "PROGRESS_PERSIST_FAILED";
}>;

export type SupervisorResult<T> =
  | Readonly<{ type: "ok"; value: T }>
  | Readonly<{ type: "err"; error: SupervisorError }>;

function ok<T>(value: T): SupervisorResult<T> {
  return Object.freeze({ type: "ok", value });
}

function err(code: SupervisorError["code"]): SupervisorResult<never> {
  return Object.freeze({ type: "err", error: Object.freeze({ code }) });
}

function armedProgress(
  value: Omit<ArmedProcessProgress, "schemaVersion" | "progressDigest">,
): ArmedProcessProgress {
  const semantic = Object.freeze({ schemaVersion: 1 as const, ...value });
  return Object.freeze({ ...semantic, progressDigest: digestValue(semantic) });
}

const ARMED_PROGRESS_PHASES = Object.freeze([
  "planned",
  "identity-established",
  "arm-approved",
  "armed",
  "terminal",
] as const);

type ArmedProgressPhase = (typeof ARMED_PROGRESS_PHASES)[number];

function armedProgressPhase(value: unknown): value is ArmedProgressPhase {
  return ARMED_PROGRESS_PHASES.includes(value as ArmedProgressPhase);
}

function progressHasExactShape(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !armedProgressPhase(value.phase)) return false;
  const phase = value.phase;
  return hasExactKeys(value, [
    "schemaVersion",
    "runId",
    "phase",
    "plan",
    ...(phase === "planned" ? [] : ["identity"]),
    ...(["arm-approved", "armed", "terminal"].includes(phase) ? ["armReceiptDigest"] : []),
    ...(phase === "terminal" ? ["exitCode"] : []),
    "progressDigest",
  ]);
}

function plannedRunIsValid(value: unknown): value is PlannedRun {
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "runId",
      "identityPath",
      "armPath",
      "armDigest",
      "armDeadline",
    ])
  ) {
    return false;
  }
  return (
    value.schemaVersion === 1 &&
    [value.runId, value.identityPath, value.armPath, value.armDigest].every(nonEmptyString) &&
    !Number.isNaN(Date.parse(String(value.armDeadline)))
  );
}

function processIdentityIsValid(value: unknown): value is ProcessIdentity {
  if (!hasExactKeys(value, ["platform", "pid", "processGroupId", "startTokenHash"])) return false;
  return (
    (value.platform === "darwin" || value.platform === "linux") &&
    Number.isInteger(value.pid) &&
    Number(value.pid) > 0 &&
    Number.isInteger(value.processGroupId) &&
    Number(value.processGroupId) > 0 &&
    nonEmptyString(value.startTokenHash)
  );
}

function phasePayloadIsValid(value: Record<string, unknown>, phase: ArmedProgressPhase): boolean {
  if (phase === "planned") return true;
  if (!processIdentityIsValid(value.identity)) return false;
  if (phase === "identity-established") return true;
  if (!nonEmptyString(value.armReceiptDigest)) return false;
  return phase !== "terminal" || Number.isInteger(value.exitCode);
}

export function parseArmedProcessProgress(value: unknown): SupervisorResult<ArmedProcessProgress> {
  if (!progressHasExactShape(value)) return err("IDENTITY_INVALID");
  if (value.schemaVersion !== 1 || !nonEmptyString(value.runId)) return err("IDENTITY_INVALID");
  if (!plannedRunIsValid(value.plan) || !nonEmptyString(value.progressDigest)) return err("IDENTITY_INVALID");
  const progress = value as unknown as ArmedProcessProgress;
  const { progressDigest, ...semantic } = progress;
  if (digestValue(semantic) !== progressDigest) return err("IDENTITY_INVALID");
  if (progress.runId !== progress.plan.runId) return err("IDENTITY_INVALID");
  if (!phasePayloadIsValid(value, progress.phase)) return err("IDENTITY_INVALID");
  return ok(Object.freeze(progress));
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  writeFileSync(temp, `${JSON.stringify(value)}\n`, { encoding: "utf-8", flag: "wx" });
  renameSync(temp, path);
}

function confined(root: string, path: string): boolean {
  const normalizedRoot = `${resolve(root)}/`;
  return resolve(path).startsWith(normalizedRoot);
}

// Extract starttime (field 22 per proc(5)) from /proc/<pid>/stat. The comm
// field (2) is an arbitrary process name that may contain spaces and
// parentheses, so a naive whitespace split misindexes every later field;
// fields are only positionally stable after the LAST ")". starttime is the
// 20th field of that remainder (22 - the 2 fields before comm).
export function linuxProcStatStartTime(stat: string): string | null {
  const commEnd = stat.lastIndexOf(")");
  if (commEnd === -1) return null;
  const fields = stat.slice(commEnd + 1).trim().split(" ");
  return fields[19] || null;
}

function startToken(pid: number, platform: NodeJS.Platform = process.platform): SupervisorResult<string> {
  if (platform === "linux") {
    try {
      const token = linuxProcStatStartTime(readFileSync(`/proc/${pid}/stat`, "utf-8"));
      return token ? ok(token) : err("PROCESS_NOT_FOUND");
    } catch {
      return err("PROCESS_NOT_FOUND");
    }
  }
  if (platform === "darwin") {
    const result = spawnSync("ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    const token = result.status === 0 ? result.stdout.trim() : "";
    return token ? ok(token) : err("PROCESS_NOT_FOUND");
  }
  return err("PLATFORM_UNSUPPORTED");
}

function processGroupId(pid: number, platform: NodeJS.Platform = process.platform): SupervisorResult<number> {
  if (platform !== "darwin" && platform !== "linux") return err("PLATFORM_UNSUPPORTED");
  const result = spawnSync("ps", ["-o", "pgid=", "-p", String(pid)], {
    encoding: "utf-8",
    timeout: 5_000,
  });
  const pgid = Number(result.stdout.trim());
  return result.status === 0 && Number.isInteger(pgid) && pgid > 0 ? ok(pgid) : err("PROCESS_NOT_FOUND");
}

export function observeProcessIdentity(
  pid: number,
  platform: NodeJS.Platform = process.platform,
): SupervisorResult<ProcessIdentity> {
  if (!Number.isInteger(pid) || pid < 1) return err("PROCESS_NOT_FOUND");
  const token = startToken(pid, platform);
  if (token.type === "err") return token;
  const pgid = processGroupId(pid, platform);
  if (pgid.type === "err") return pgid;
  return ok(
    Object.freeze({
      platform: platform as "darwin" | "linux",
      pid,
      processGroupId: pgid.value,
      startTokenHash: digestValue(token.value),
    }),
  );
}

export function sameProcess(expected: ProcessIdentity, observed: ProcessIdentity): boolean {
  return (
    expected.platform === observed.platform &&
    expected.pid === observed.pid &&
    expected.processGroupId === observed.processGroupId &&
    expected.startTokenHash === observed.startTokenHash
  );
}

function processExistence(
  pid: number,
  signalProcess: (pid: number) => void,
): "exists" | "dead" | "unknown" {
  try {
    signalProcess(pid);
    return "exists";
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH" ? "dead" : "unknown";
  }
}

export function observeExactProcessLiveness(
  expected: ProcessIdentity,
  injected: ProcessLivenessDependencies = {},
): ProcessLivenessObservation {
  const existence = processExistence(expected.pid, injected.signalProcess ?? ((pid) => process.kill(pid, 0)));
  if (existence === "dead") return Object.freeze({ status: "dead" });
  if (existence === "unknown") return Object.freeze({ status: "unknown" });
  const observed = (injected.observeIdentity ?? observeProcessIdentity)(expected.pid, expected.platform);
  if (observed.type === "err") return Object.freeze({ status: "unknown" });
  return sameProcess(expected, observed.value)
    ? Object.freeze({ status: "live", observedOwner: observed.value })
    : Object.freeze({ status: "dead" });
}

export function createPlannedRun(input: Readonly<{
  rootDir: string;
  runId: string;
  identityPath: string;
  armPath: string;
  armDeadline: string;
  armCoordinates: unknown;
}>): SupervisorResult<PlannedRun> {
  if (!confined(input.rootDir, input.identityPath) || !confined(input.rootDir, input.armPath)) {
    return err("PATH_ESCAPE");
  }
  if (!input.runId || Number.isNaN(Date.parse(input.armDeadline))) return err("IDENTITY_INVALID");
  const secretCheck = rejectSecretLikeFields(input.armCoordinates);
  if (secretCheck.type === "err") return err("ARM_INVALID");
  return ok(
    Object.freeze({
      schemaVersion: 1,
      runId: input.runId,
      identityPath: resolve(input.identityPath),
      armPath: resolve(input.armPath),
      armDigest: digestValue(input.armCoordinates),
      armDeadline: input.armDeadline,
    }),
  );
}

export function writeRunIdentity(plan: PlannedRun, processIdentity: ProcessIdentity): RunIdentity {
  const identity = Object.freeze({
    schemaVersion: 1 as const,
    runId: plan.runId,
    armDigest: plan.armDigest,
    process: Object.freeze({ ...processIdentity }),
    status: "identity-established" as const,
  });
  atomicJson(plan.identityPath, identity);
  return identity;
}

export function readRunIdentity(plan: PlannedRun): SupervisorResult<RunIdentity> {
  if (!existsSync(plan.identityPath)) return err("IDENTITY_INVALID");
  try {
    const value = JSON.parse(readFileSync(plan.identityPath, "utf-8")) as RunIdentity;
    if (
      value.schemaVersion !== 1 ||
      value.runId !== plan.runId ||
      value.armDigest !== plan.armDigest ||
      !value.process ||
      !["identity-established", "armed", "child-running", "terminal"].includes(value.status)
    ) {
      return err("IDENTITY_INVALID");
    }
    return ok(Object.freeze(value));
  } catch {
    return err("IDENTITY_INVALID");
  }
}

export function armRun(plan: PlannedRun, identity: RunIdentity, receipt: ArmReceipt): SupervisorResult<string> {
  if (
    identity.runId !== plan.runId ||
    identity.armDigest !== plan.armDigest ||
    receipt.schemaVersion !== 1 ||
    receipt.runId !== plan.runId ||
    receipt.identityDigest !== digestValue(identity) ||
    digestValue({
      executionId: receipt.executionId,
      attemptId: receipt.attemptId,
      planDigest: receipt.planDigest,
      waveDigest: receipt.waveDigest,
      fencingToken: receipt.fencingToken,
    }) !== plan.armDigest
  ) {
    return err("ARM_INVALID");
  }
  if (existsSync(plan.armPath)) return err("ARM_ALREADY_CONSUMED");
  atomicJson(plan.armPath, receipt);
  return ok(digestValue(receipt));
}

export function consumeArm(plan: PlannedRun, identity: RunIdentity): SupervisorResult<ArmReceipt> {
  const consumedPath = `${plan.armPath}.consumed`;
  if (existsSync(consumedPath)) return err("ARM_ALREADY_CONSUMED");
  if (!existsSync(plan.armPath)) return err("ARM_INVALID");
  try {
    const receipt = JSON.parse(readFileSync(plan.armPath, "utf-8")) as ArmReceipt;
    if (
      receipt.schemaVersion !== 1 ||
      receipt.runId !== plan.runId ||
      receipt.identityDigest !== digestValue(identity) ||
      digestValue({
        executionId: receipt.executionId,
        attemptId: receipt.attemptId,
        planDigest: receipt.planDigest,
        waveDigest: receipt.waveDigest,
        fencingToken: receipt.fencingToken,
      }) !== plan.armDigest
    ) {
      return err("ARM_INVALID");
    }
    renameSync(plan.armPath, consumedPath);
    return ok(Object.freeze(receipt));
  } catch {
    return err("ARM_INVALID");
  }
}

export function terminateExactProcessGroup(expected: ProcessIdentity): SupervisorResult<undefined> {
  const observed = observeProcessIdentity(expected.pid, expected.platform);
  if (observed.type === "err") return observed;
  if (!sameProcess(expected, observed.value)) return err("PROCESS_IDENTITY_MISMATCH");
  try {
    process.kill(-expected.processGroupId, "SIGTERM");
    return ok(undefined);
  } catch {
    return err("PROCESS_NOT_FOUND");
  }
}

export function removeRunFiles(plan: PlannedRun): void {
  rmSync(plan.identityPath, { force: true });
  rmSync(plan.armPath, { force: true });
  rmSync(`${plan.armPath}.consumed`, { force: true });
}

export type ArmedProcessResult = SupervisorResult<
  Readonly<{
    exitCode: number;
    stdout: string;
    stderr: string;
    identity: ProcessIdentity;
  }>
>;

type WrapperPayload = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  stdin: Readonly<{ kind: "closed" } | { kind: "bytes"; base64: string }>;
}>;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function terminateProcessGroup(processGroupId: number): void {
  try {
    process.kill(-processGroupId, "SIGTERM");
  } catch {
    // The wrapper may have exited between the failed observation and cleanup.
  }
}

async function waitForIdentity(plan: PlannedRun): Promise<SupervisorResult<RunIdentity>> {
  while (Date.now() < Date.parse(plan.armDeadline)) {
    const identity = readRunIdentity(plan);
    if (identity.type === "ok") return identity;
    await delay(10);
  }
  return err("ARM_DEADLINE_EXCEEDED");
}

async function establishAndArm(
  plan: PlannedRun,
  wrapper: ChildProcessWithoutNullStreams,
  armCoordinates: Omit<ArmReceipt, "schemaVersion" | "runId" | "identityDigest">,
  onProgress: (progress: ArmedProcessProgress) => Promise<void>,
): Promise<SupervisorResult<Readonly<{ identity: ProcessIdentity; armReceiptDigest: string }>>> {
  const identity = await waitForIdentity(plan);
  if (identity.type === "err") {
    if (wrapper.pid) terminateProcessGroup(wrapper.pid);
    return identity;
  }
  const observed = wrapper.pid ? observeProcessIdentity(wrapper.pid) : err("PROCESS_NOT_FOUND");
  if (observed.type === "err" || !sameProcess(identity.value.process, observed.value)) {
    if (wrapper.pid) terminateProcessGroup(wrapper.pid);
    return err("PROCESS_IDENTITY_MISMATCH");
  }
  try {
    await onProgress(
      armedProgress({
        runId: plan.runId,
        phase: "identity-established",
        plan,
        identity: observed.value,
      }),
    );
  } catch {
    terminateExactProcessGroup(observed.value);
    return err("PROGRESS_PERSIST_FAILED");
  }
  const receipt = Object.freeze({
    schemaVersion: 1,
    runId: plan.runId,
    ...armCoordinates,
    identityDigest: digestValue(identity.value),
  });
  const armReceiptDigest = digestValue(receipt);
  try {
    await onProgress(
      armedProgress({
        runId: plan.runId,
        phase: "arm-approved",
        plan,
        identity: observed.value,
        armReceiptDigest,
      }),
    );
  } catch {
    terminateExactProcessGroup(observed.value);
    return err("PROGRESS_PERSIST_FAILED");
  }
  const armed = armRun(plan, identity.value, receipt);
  if (armed.type === "err") {
    terminateProcessGroup(observed.value.processGroupId);
    return armed;
  }
  try {
    await onProgress(
      armedProgress({
        runId: plan.runId,
        phase: "armed",
        plan,
        identity: observed.value,
        armReceiptDigest,
      }),
    );
  } catch {
    terminateExactProcessGroup(observed.value);
    return err("PROGRESS_PERSIST_FAILED");
  }
  return ok(Object.freeze({ identity: observed.value, armReceiptDigest }));
}

async function waitForArmedExit(
  wrapper: ChildProcessWithoutNullStreams,
  identity: ProcessIdentity,
  timeoutMs: number,
): Promise<number | null> {
  const exit = new Promise<number>((resolveExit) => {
    wrapper.once("close", (code) => resolveExit(code ?? 1));
  });
  const exitCode = await Promise.race([exit, delay(timeoutMs).then(() => null)]);
  if (exitCode !== null) return exitCode;
  terminateExactProcessGroup(identity);
  const stopped = await Promise.race([exit.then(() => true), delay(1_000).then(() => false)]);
  if (stopped) return null;
  const current = observeProcessIdentity(identity.pid, identity.platform);
  if (current.type === "ok" && sameProcess(identity, current.value)) {
    try {
      process.kill(-identity.processGroupId, "SIGKILL");
    } catch {
      // An exact-identity recheck immediately preceded the signal.
    }
  }
  await Promise.race([exit, delay(1_000)]);
  return null;
}

export async function executeArmedProcess(input: Readonly<{
  rootDir: string;
  runId: string;
  executionId: string;
  attemptId: string;
  planDigest: string;
  waveDigest: string;
  fencingToken: number;
  executable: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  stdin: "closed" | Uint8Array;
  timeoutMs: number;
  onProgress?: (progress: ArmedProcessProgress) => Promise<void> | void;
}>): Promise<ArmedProcessResult> {
  const runDir = resolve(input.rootDir, input.runId);
  const armCoordinates = {
    executionId: input.executionId,
    attemptId: input.attemptId,
    planDigest: input.planDigest,
    waveDigest: input.waveDigest,
    fencingToken: input.fencingToken,
  };
  const planResult = createPlannedRun({
    rootDir: input.rootDir,
    runId: input.runId,
    identityPath: resolve(runDir, "identity.json"),
    armPath: resolve(runDir, "arm.json"),
    armDeadline: new Date(Date.now() + 5_000).toISOString(),
    armCoordinates,
  });
  if (planResult.type === "err") return planResult;
  const plan = planResult.value;
  mkdirSync(runDir, { recursive: true });
  const onProgress = async (progress: ArmedProcessProgress): Promise<void> => {
    await input.onProgress?.(progress);
  };
  try {
    await onProgress(armedProgress({ runId: plan.runId, phase: "planned", plan }));
  } catch {
    removeRunFiles(plan);
    return err("PROGRESS_PERSIST_FAILED");
  }
  const encodedPlan = Buffer.from(JSON.stringify(plan), "utf-8").toString("base64");
  const wrapper = spawn(process.execPath, [fileURLToPath(import.meta.url), "armed-wrapper", encodedPlan], {
    cwd: input.cwd,
    detached: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const payload: WrapperPayload = Object.freeze({
    executable: input.executable,
    args: Object.freeze([...input.args]),
    cwd: input.cwd,
    env: input.env,
    stdin:
      input.stdin === "closed"
        ? Object.freeze({ kind: "closed" as const })
        : Object.freeze({ kind: "bytes" as const, base64: Buffer.from(input.stdin).toString("base64") }),
  });
  wrapper.stdin.end(JSON.stringify(payload));
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  wrapper.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
  wrapper.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

  const observed = await establishAndArm(plan, wrapper, armCoordinates, onProgress);
  if (observed.type === "err") {
    removeRunFiles(plan);
    return observed;
  }
  const exitCode = await waitForArmedExit(wrapper, observed.value.identity, input.timeoutMs);
  if (exitCode !== null) {
    try {
      await onProgress(
        armedProgress({
          runId: plan.runId,
          phase: "terminal",
          plan,
          identity: observed.value.identity,
          armReceiptDigest: observed.value.armReceiptDigest,
          exitCode,
        }),
      );
    } catch {
      terminateExactProcessGroup(observed.value.identity);
      removeRunFiles(plan);
      return err("PROGRESS_PERSIST_FAILED");
    }
  }
  removeRunFiles(plan);
  if (exitCode === null) return err("PROCESS_TIMEOUT");
  return ok(
    Object.freeze({
      exitCode,
      stdout: Buffer.concat(stdout).toString("utf-8"),
      stderr: Buffer.concat(stderr).toString("utf-8"),
      identity: observed.value.identity,
    }),
  );
}

async function armedWrapperMain(encodedPlan: string): Promise<void> {
  const plan = JSON.parse(Buffer.from(encodedPlan, "base64").toString("utf-8")) as PlannedRun;
  const payload = JSON.parse(await Bun.stdin.text()) as WrapperPayload;
  const observed = observeProcessIdentity(process.pid);
  if (observed.type === "err") process.exit(125);
  const identity = writeRunIdentity(plan, observed.value);
  while (!existsSync(plan.armPath) && Date.now() < Date.parse(plan.armDeadline)) await delay(10);
  if (consumeArm(plan, identity).type === "err") process.exit(126);
  const child = spawn(payload.executable, [...payload.args], {
    cwd: payload.cwd,
    env: payload.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (payload.stdin.kind === "closed") child.stdin.end();
  else child.stdin.end(Buffer.from(payload.stdin.base64, "base64"));
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  const code = await new Promise<number>((resolveExit) => child.once("close", (value) => resolveExit(value ?? 1)));
  process.exit(code);
}

if (import.meta.main && process.argv[2] === "armed-wrapper") {
  await armedWrapperMain(process.argv[3] ?? "");
}
