// amadeus-mirror-lifecycle.ts — awaitable production adapter for C7.
//
// Synchronous engine routing emits commands for this process. The process owns
// the async lifetime, resolves an explicit Space/Intent/repository, constructs
// a durable boundary identity, and awaits driveMirrorBoundary.

import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  activeIntent,
  activeSpace,
  getField,
  intentsDir,
  readIntentRegistry,
  recordDirMatches,
} from "./amadeus-lib.ts";
import { resolveMirrorConfig } from "./amadeus-mirror-config.ts";
import {
  driveMirrorBoundary,
  type MirrorBoundaryOutcome,
  type MirrorPromptAnswer,
} from "./amadeus-mirror-coordinator.ts";
import {
  createMirrorGitHubGateway,
  parseIssueNumber,
  parseRepositoryIdentity,
} from "./amadeus-mirror-gateway.ts";
import {
  expectedProjectStatus,
  selectProjectStatusOption,
} from "./amadeus-mirror-policy.ts";
import {
  parseMirrorMarker,
  renderMirrorMarker,
  verifyOwnership,
} from "./amadeus-mirror-provenance.ts";
import {
  MIRROR_USER_CONTRACT,
  renderMirrorIssueContent,
  renderMirrorLifecycleHelp,
} from "./amadeus-mirror-presentation.ts";
import {
  provenanceDigestV2,
  repairPlanDigest,
} from "./amadeus-mirror-repair.ts";
import { createMirrorProcessRunner } from "./amadeus-mirror-runner.ts";
import {
  createMirrorStateStorePorts,
  mutateMirrorStateAtomic,
  readMirrorState,
  type MirrorStateStorePorts,
} from "./amadeus-mirror-state-store.ts";
import type {
  MirrorBoundary,
  MirrorCreateIdentity,
  MirrorEventIdentity,
  MirrorFailureClass,
  MirrorGitHubGateway,
  MirrorOperation,
  MirrorOperationOutcome,
  MirrorProjectItem,
  MirrorProjectRef,
  MirrorProjectSyncEntry,
  MirrorProjectTarget,
  MirrorProvenanceV2,
  MirrorSnapshot,
  MirrorStateSnapshot,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";
import { observeSubprocess } from "./amadeus-observability.ts";

export type MirrorLifecycleRequest = Readonly<{
  projectDir: string;
  space?: string;
  intentDir?: string;
  repository?: RepositoryIdentity;
  boundary: MirrorBoundary;
  manualOperation?: MirrorOperation;
  invocationId?: string;
  answer?: MirrorPromptAnswer;
}>;

export type MirrorLifecycleRuntime = Readonly<{
  gateway?: MirrorGitHubGateway;
  ports?: MirrorStateStorePorts;
  now?: () => string;
  newOperationId?: () => string;
  newAnswerId?: () => string;
  newChallengeId?: () => string;
  confirmRepair?: (
    expectedPhrase: string,
    summary: string,
  ) => Promise<string>;
}>;

export type MirrorLifecycleAdapterOutcome =
  | { kind: "ok"; outcome: MirrorBoundaryOutcome }
  | { kind: "error"; message: string };

type MirrorLifecycleAnswerRequest = Readonly<{
  choice: "approve" | "skip";
  bindingId: string;
  projectDir: string;
  space?: string;
  intentDir?: string;
  repository?: RepositoryIdentity;
}>;

function repositoryFromOrigin(projectDir: string): RepositoryIdentity | null {
  const result = observeSubprocess(projectDir, "git", () =>
    spawnSync("git", ["remote", "get-url", "origin"], {
      cwd: projectDir,
      encoding: "utf-8",
      timeout: 5_000,
    }),
  );
  if (result.status !== 0 || typeof result.stdout !== "string") return null;
  const url = result.stdout.trim().replace(/\.git$/u, "");
  const match =
    /github\.com[/:]([^/]+)\/([^/]+)$/u.exec(url) ??
    /^([^/]+)\/([^/]+)$/u.exec(url);
  return match ? parseRepositoryIdentity(match[1], match[2]) : null;
}

function resolveRepository(
  request: Readonly<{
    projectDir: string;
    repository?: RepositoryIdentity;
  }>,
  recordedRepos: readonly string[],
): RepositoryIdentity | null {
  if (request.repository) return request.repository;
  if (recordedRepos.length === 1) {
    const parts = recordedRepos[0].split("/");
    if (parts.length === 2) {
      const parsed = parseRepositoryIdentity(parts[0], parts[1]);
      if (parsed) return parsed;
    }
  }
  return repositoryFromOrigin(request.projectDir);
}

type ResolvedLifecycleTarget =
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      space: string;
      intentDir: string;
      intentUuid: string;
      registryStatus: string;
      repository: RepositoryIdentity;
      statePath: string;
      stateContent: string;
      slug: string;
    };

export type MirrorRecordIdentity = Readonly<{
  space: string;
  intentDir: string;
  intentUuid: string;
  recordDir: string;
}>;

export function resolveMirrorRecordIdentity(
  projectDir: string,
  explicitSpace?: string,
  explicitIntent?: string,
): MirrorRecordIdentity | null {
  const space = explicitSpace ?? activeSpace(projectDir);
  const intentDir = activeIntent(projectDir, space, explicitIntent);
  if (!intentDir) return null;
  const entry = readIntentRegistry(projectDir, space).find((candidate) =>
    recordDirMatches(candidate, intentDir)
  );
  if (!entry) return null;
  return {
    space,
    intentDir,
    intentUuid: entry.uuid,
    recordDir: join(intentsDir(projectDir, space), intentDir),
  };
}

function resolveLifecycleTarget(
  request: MirrorLifecycleRequest,
): ResolvedLifecycleTarget {
  const identity = resolveMirrorRecordIdentity(
    request.projectDir,
    request.space,
    request.intentDir,
  );
  if (!identity)
    return {
      kind: "error",
      message: "Mirror lifecycle could not resolve an Intent.",
    };
  const { space, intentDir } = identity;
  const entry = readIntentRegistry(request.projectDir, space).find((candidate) =>
    candidate.uuid === identity.intentUuid
  )!;
  const repository = resolveRepository(request, entry.repos ?? []);
  if (!repository)
    return {
      kind: "error",
      message:
        "Mirror lifecycle could not resolve one canonical GitHub repository; pass --repo owner/name.",
    };
  const statePath = join(
    intentsDir(request.projectDir, space),
    intentDir,
    "amadeus-state.md",
  );
  try {
    return {
      kind: "ok",
      space,
      intentDir,
      intentUuid: entry.uuid,
      registryStatus: entry.status,
      repository,
      statePath,
      stateContent: readFileSync(statePath, "utf-8"),
      slug: entry.slug,
    };
  } catch {
    return {
      kind: "error",
      message: `Mirror lifecycle state is unreadable for Intent "${intentDir}".`,
    };
  }
}

function lifecycleRuntime(
  request: MirrorLifecycleRequest,
  target: Extract<ResolvedLifecycleTarget, { kind: "ok" }>,
  runtime: MirrorLifecycleRuntime,
) {
  return {
    ports:
      runtime.ports ??
      createMirrorStateStorePorts({
        projectDir: request.projectDir,
        statePath: target.statePath,
        intent: target.intentDir,
        space: target.space,
      }),
    gateway:
      runtime.gateway ??
      createMirrorGitHubGateway(createMirrorProcessRunner()),
    now: runtime.now ?? (() => new Date().toISOString()),
    newOperationId: runtime.newOperationId ?? randomUUID,
  };
}

// The record fields a snapshot is derived from. Structural rather than tied to
// one resolution, so the repair path derives its snapshot through this single
// definition instead of restating the field mapping.
type SnapshotSource = Readonly<{
  intentUuid: string;
  intentDir: string;
  registryStatus: string;
  stateContent: string;
  slug: string;
}>;

function lifecycleSnapshot(
  target: SnapshotSource,
  now: () => string,
): MirrorSnapshot {
  return {
    intentUuid: target.intentUuid,
    intentDir: target.intentDir,
    projectSummary: getField(target.stateContent, "Project") ?? target.slug,
    lifecyclePhase: getField(target.stateContent, "Lifecycle Phase") ?? "?",
    currentStage: getField(target.stateContent, "Current Stage") ?? "?",
    status: getField(target.stateContent, "Status") ?? "?",
    registryStatus: target.registryStatus,
    updatedAt: getField(target.stateContent, "Last Updated") ?? now(),
  };
}

// The read-only record view the `status` verb diagnoses against. It reuses the
// same resolution (resolveLifecycleTarget), the same v1 state read
// (readMirrorState), the same record snapshot (lifecycleSnapshot), and the same
// body renderers (renderMirrorIssueContent + renderMirrorMarker) that a real
// sync uses, so the status comparison and the sync writer share ONE body
// definition instead of a parallel one. `issueNumber` is the authoritative
// "mirror recorded?" signal from the v1 block.
export type MirrorStatusRecordView =
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      intentDir: string;
      issueNumber: number | null;
      currentStatus: string;
      expectedBody: string;
    };

export type MirrorStatusRecordRequest = Readonly<{
  projectDir: string;
  space?: string;
  intentDir?: string;
  repository?: RepositoryIdentity;
}>;

export function buildMirrorStatusRecordView(
  request: MirrorStatusRecordRequest,
  runtime: MirrorLifecycleRuntime = {},
): MirrorStatusRecordView {
  const fullRequest: MirrorLifecycleRequest = {
    ...request,
    boundary: { kind: "manual", instance: "status-view" },
  };
  const target = resolveLifecycleTarget(fullRequest);
  if (target.kind === "error") return { kind: "error", message: target.message };
  const resolved = lifecycleRuntime(fullRequest, target, runtime);
  const read = readMirrorState(resolved.ports);
  if (read.kind === "io-failure") return { kind: "error", message: read.summary };
  if (read.kind === "invalid")
    return { kind: "error", message: `Mirror state is invalid: ${read.issues.join("; ")}` };
  const state = read.snapshot;
  const snapshot = lifecycleSnapshot(target, resolved.now);
  const identity = markerCreateIdentity(state, target, snapshot.updatedAt);
  const expectedBody = renderMirrorIssueContent({
    snapshot,
    marker: renderMirrorMarker(identity),
  }).body;
  return {
    kind: "ok",
    intentDir: target.intentDir,
    issueNumber: state.issueNumber,
    currentStatus: snapshot.status,
    expectedBody,
  };
}

// The marker create identity, mirroring coordinator.markerFor: provenance's
// identity, else a receipt's, else a synthetic identity for a linkless record.
function markerCreateIdentity(
  state: MirrorStateSnapshot,
  target: Extract<ResolvedLifecycleTarget, { kind: "ok" }>,
  preparedAt: string,
): MirrorCreateIdentity {
  return (
    state.provenance?.createIdentity ??
    Object.values(state.receipts).find((receipt) => receipt.createIdentity)
      ?.createIdentity ?? {
      schema: 1,
      intentUuid: target.intentUuid,
      intentDir: target.intentDir,
      repository: target.repository,
      operationId: "-",
      preparedAt,
    }
  );
}

export async function runMirrorLifecycleBoundary(
  request: MirrorLifecycleRequest,
  runtime: MirrorLifecycleRuntime = {},
): Promise<MirrorLifecycleAdapterOutcome> {
  if (
    request.boundary.kind === "manual" &&
    (!request.manualOperation || !request.invocationId)
  ) {
    return {
      kind: "error",
      message: "Manual Mirror lifecycle requires an operation and invocation ID.",
    };
  }
  const target = resolveLifecycleTarget(request);
  if (target.kind === "error") return target;
  const resolvedRuntime = lifecycleRuntime(request, target, runtime);
  const outcome = await driveMirrorBoundary({
    context: {
      projectDir: request.projectDir,
      space: target.space,
      statePath: target.statePath,
      intentUuid: target.intentUuid,
      intentDir: target.intentDir,
      repository: target.repository,
      boundary: request.boundary,
      snapshot: lifecycleSnapshot(target, resolvedRuntime.now),
    },
    ports: resolvedRuntime.ports,
    gateway: resolvedRuntime.gateway,
    now: resolvedRuntime.now,
    newOperationId: resolvedRuntime.newOperationId,
    manualOperation: request.manualOperation,
    invocationId: request.invocationId,
    answer: request.answer,
  });
  return { kind: "ok", outcome };
}

type CliArgs =
  | {
      kind: "request";
      request: MirrorLifecycleRequest;
    }
  | {
      kind: "answer";
      request: MirrorLifecycleAnswerRequest;
    }
  | {
      kind: "repair";
      request: MirrorRepairRequest;
    }
  | { kind: "usage"; message: string };

const USAGE = renderMirrorLifecycleHelp();

export type MirrorRepairCommand =
  | { kind: "status" }
  | { kind: "relink"; issueNumber: number }
  | { kind: "abandon"; operationId: string };

export type MirrorRepairRequest = Readonly<{
  projectDir: string;
  space?: string;
  intentDir?: string;
  repository?: RepositoryIdentity;
  command: MirrorRepairCommand;
}>;

// One read-only observation about one Project board. `expectedStatus` is the
// column `expectedProjectStatus` names — the same definition the sync applies,
// never a second derivation — and is null when the boundary expects no column
// at all (a parked Intent), in which case `drift` is false by construction.
// `resolution` closes over the reachability of that column, and
// `availableOptions` is present only for `option-missing`, where the board's own
// vocabulary is what the reader needs to see.
//
// `summary` is the sentence a human acts on: what this row means and, when the
// column is unreachable, which move fixes it. It is built from a fixed template
// over names this tool already holds — a Project reference, a column name, a
// scope name — so no credential and no raw API response can reach it.
export type MirrorRepairProjectDiagnostic = Readonly<{
  project: string;
  membership: "member" | "not-member";
  currentStatus: string | null;
  expectedStatus: string | null;
  drift: boolean;
  resolution: "resolved" | "field-missing" | "option-missing" | "permission-denied";
  availableOptions?: readonly string[];
  summary: string;
}>;

export type MirrorRepairOutcome =
  | {
      kind: "status";
      intentDir: string;
      repository: string;
      revision: number;
      issueNumber: number | null;
      provenance: "unlinked" | "verified" | "unverified";
      pendingOperations: readonly string[];
      projectDiagnostics: readonly MirrorRepairProjectDiagnostic[];
    }
  | MirrorOperationOutcome
  | { kind: "error"; message: string };

function flagValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseOptionPairs(
  args: readonly string[],
  start: number,
  allowedFlags: ReadonlySet<string>,
): Map<string, string> | null {
  const values = new Map<string, string>();
  for (let index = start; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (
      !allowedFlags.has(flag) ||
      value === undefined ||
      value.startsWith("--") ||
      values.has(flag)
    ) return null;
    values.set(flag, value);
  }
  return values;
}

function parseRepositoryOption(
  value: string | undefined,
): RepositoryIdentity | null | "invalid" {
  if (value === undefined) return null;
  const parts = value.split("/");
  if (parts.length !== 2) return "invalid";
  return parseRepositoryIdentity(parts[0], parts[1]) ?? "invalid";
}

function parseRepairCommand(
  command: string | undefined,
  values: ReadonlyMap<string, string>,
): MirrorRepairCommand | null {
  if (command === "status")
    return values.has("--issue") || values.has("--operation")
      ? null
      : { kind: "status" };
  if (command === "relink") {
    const raw = values.get("--issue");
    if (values.has("--operation") || !raw || !/^[1-9]\d*$/u.test(raw))
      return null;
    const issueNumber = parseIssueNumber(Number(raw));
    return issueNumber === null ? null : { kind: "relink", issueNumber };
  }
  if (command === "abandon") {
    const operationId = values.get("--operation");
    return values.has("--issue") || !operationId
      ? null
      : { kind: "abandon", operationId };
  }
  return null;
}

function parseRepairArgs(args: string[]): CliArgs {
  const values = parseOptionPairs(args, 2, new Set([
    "--issue",
    "--operation",
    "--repo",
    "--space",
    "--intent",
    "--project-dir",
  ]));
  if (!values) return { kind: "usage", message: USAGE };
  const repository = parseRepositoryOption(values.get("--repo"));
  const repairCommand = parseRepairCommand(args[1], values);
  if (repository === "invalid" || !repairCommand)
    return { kind: "usage", message: USAGE };
  return {
    kind: "repair",
    request: {
      projectDir: values.get("--project-dir") ?? process.cwd(),
      space: values.get("--space"),
      intentDir: values.get("--intent"),
      ...(repository ? { repository } : {}),
      command: repairCommand,
    },
  };
}

function parseLifecycleCommon(args: readonly string[]) {
  const projectDir = flagValue(args, "--project-dir") ?? process.cwd();
  const space = flagValue(args, "--space");
  const intentDir = flagValue(args, "--intent");
  const instance = flagValue(args, "--instance");
  const repository = parseRepositoryOption(flagValue(args, "--repo"));
  if (!instance || repository === "invalid") return null;
  return {
    instance,
    projectDir,
    space,
    intentDir,
    ...(repository ? { repository } : {}),
  };
}

function parseManualArgs(
  args: readonly string[],
  common: NonNullable<ReturnType<typeof parseLifecycleCommon>>,
): CliArgs {
  const operation = args[1] as MirrorOperation;
  if (!MIRROR_USER_CONTRACT.operations.includes(operation))
    return { kind: "usage", message: USAGE };
  return {
    kind: "request",
    request: {
      ...common,
      boundary: { kind: "manual", instance: common.instance },
      manualOperation: operation,
      invocationId: common.instance,
    },
  };
}

function parseBoundaryArgs(
  args: readonly string[],
  common: NonNullable<ReturnType<typeof parseLifecycleCommon>>,
): CliArgs {
  const boundaryKind = args[1];
  let boundary: MirrorBoundary | null = null;
  if (boundaryKind === "intent-capture")
    boundary = { kind: "intent-capture-approved", instance: common.instance };
  if (boundaryKind === "phase") {
    const phase = flagValue(args, "--phase");
    if (phase)
      boundary = { kind: "phase-verified", phase, instance: common.instance };
  }
  if (boundaryKind === "park") {
    const stage = flagValue(args, "--stage");
    if (stage) boundary = { kind: "parked", stage, instance: common.instance };
  }
  if (boundaryKind === "completion")
    boundary = { kind: "workflow-completed", instance: common.instance };
  if (!boundary) return { kind: "usage", message: USAGE };
  const { instance: _, ...requestCommon } = common;
  return { kind: "request", request: { ...requestCommon, boundary } };
}

function matchesContractCommand(
  args: readonly string[],
  commands: readonly Readonly<{
    path: readonly string[];
    requiredOptions: readonly string[];
    optionalOptions: readonly string[];
  }>[],
): boolean {
  const command = commands.find((candidate) =>
    candidate.path.every((part, index) => args[index] === part)
  );
  if (!command) return false;
  const allowed = new Set([
    ...command.requiredOptions,
    ...command.optionalOptions,
  ]);
  const values = parseOptionPairs(args, command.path.length, allowed);
  return values !== null &&
    command.requiredOptions.every((option) => values.has(option));
}

function parseAnswerArgs(args: readonly string[]): CliArgs {
  if (!matchesContractCommand(args, MIRROR_USER_CONTRACT.answerCommands))
    return { kind: "usage", message: USAGE };
  const values = parseOptionPairs(
    args,
    2,
    new Set(["--binding-id", "--repo", "--space", "--intent", "--project-dir"]),
  );
  if (!values) return { kind: "usage", message: USAGE };
  const bindingId = values.get("--binding-id");
  const repository = parseRepositoryOption(values.get("--repo"));
  const choice = args[1];
  if (
    !bindingId ||
    repository === "invalid" ||
    (choice !== "approve" && choice !== "skip")
  ) {
    return { kind: "usage", message: USAGE };
  }
  return {
    kind: "answer",
    request: {
      choice,
      bindingId,
      projectDir: values.get("--project-dir") ?? process.cwd(),
      space: values.get("--space"),
      intentDir: values.get("--intent"),
      ...(repository ? { repository } : {}),
    },
  };
}

export function parseMirrorLifecycleArgs(args: string[]): CliArgs {
  if (args[0] === "repair") {
    if (!matchesContractCommand(args, MIRROR_USER_CONTRACT.repairCommands))
      return { kind: "usage", message: USAGE };
    return parseRepairArgs(args);
  }
  if (args[0] === "answer") {
    return parseAnswerArgs(args);
  }
  const commands = args[0] === "manual"
    ? MIRROR_USER_CONTRACT.manualCommands
    : MIRROR_USER_CONTRACT.boundaryCommands;
  if (!matchesContractCommand(args, commands))
    return { kind: "usage", message: USAGE };
  const common = parseLifecycleCommon(args);
  if (!common) return { kind: "usage", message: USAGE };
  if (args[0] === "manual") {
    const { instance: _, ...requestCommon } = common;
    return {
      ...parseManualArgs(args, { ...requestCommon, instance: common.instance }),
    };
  }
  if (args[0] !== "boundary") return { kind: "usage", message: USAGE };
  return parseBoundaryArgs(args, common);
}

type RepairTarget =
  | {
      kind: "ok";
      projectDir: string;
      space: string;
      intentDir: string;
      intentUuid: string;
      repository: RepositoryIdentity;
      ports: MirrorStateStorePorts;
      gateway: MirrorGitHubGateway;
      // The workflow snapshot the Project diagnostics derive their expected
      // column from. Null when the record could not be read: diagnostics are
      // then reported as unavailable rather than guessed.
      snapshot: MirrorSnapshot | null;
    }
  | { kind: "error"; message: string };

// The record view the Project diagnostics derive their expected column from.
// An unreadable record yields null rather than a guessed snapshot: repair's
// other verbs do not need it, so a missing record must not fail the command.
// Module-scope aliases: inline parameter object types are runtime-erased but
// stamped DA:0 by Bun inside the function region.
type RepairRegistryEntry = Readonly<{
  uuid: string;
  intentDir: string;
  status: string;
  slug: string;
}>;

function repairSnapshot(
  statePath: string,
  entry: RepairRegistryEntry,
  runtime: MirrorLifecycleRuntime,
): MirrorSnapshot | null {
  let stateContent: string;
  try {
    stateContent = readFileSync(statePath, "utf-8");
  } catch {
    return null;
  }
  return lifecycleSnapshot(
    {
      intentUuid: entry.uuid,
      intentDir: entry.intentDir,
      registryStatus: entry.status,
      stateContent,
      slug: entry.slug,
    },
    runtime.now ?? (() => new Date().toISOString()),
  );
}

function resolveRepairTarget(
  request: MirrorRepairRequest,
  runtime: MirrorLifecycleRuntime,
): RepairTarget {
  const space = request.space ?? activeSpace(request.projectDir);
  const intentDir = activeIntent(request.projectDir, space, request.intentDir);
  if (!intentDir)
    return { kind: "error", message: "Repair could not resolve an Intent." };
  const entry = readIntentRegistry(request.projectDir, space).find((candidate) =>
    recordDirMatches(candidate, intentDir)
  );
  if (!entry)
    return {
      kind: "error",
      message: `Repair Intent "${intentDir}" is absent from intents.json.`,
    };
  const repository = resolveRepository(request, entry.repos ?? []);
  if (!repository)
    return {
      kind: "error",
      message:
        "Repair could not resolve one canonical GitHub repository; pass --repo owner/name.",
    };
  const statePath = join(intentsDir(request.projectDir, space), intentDir, "amadeus-state.md");
  return {
    kind: "ok",
    projectDir: request.projectDir,
    space,
    intentDir,
    intentUuid: entry.uuid,
    repository,
    snapshot: repairSnapshot(statePath, { ...entry, intentDir }, runtime),
    ports:
      runtime.ports ??
      createMirrorStateStorePorts({
        projectDir: request.projectDir,
        statePath,
        intent: intentDir,
        space,
      }),
    gateway:
      runtime.gateway ??
      createMirrorGitHubGateway(createMirrorProcessRunner()),
  };
}

function repairEvent(
  target: Extract<RepairTarget, { kind: "ok" }>,
  operation: MirrorOperation,
  instance: string,
): MirrorEventIdentity {
  return {
    intentUuid: target.intentUuid,
    boundary: { kind: "manual", instance },
    operation,
  };
}

function writeRepairTransition(
  target: Extract<RepairTarget, { kind: "ok" }>,
  transition: Parameters<typeof mutateMirrorStateAtomic>[1]["transition"],
  expectedRevision: number,
  event: MirrorEventIdentity,
  operationId: string,
  now: string,
) {
  return mutateMirrorStateAtomic(target.ports, {
    transition,
    expectedRevision,
    auditContext: {
      triggerEvent: event,
      operationEvent: event,
      operationId,
      reconciliation: true,
    },
    now,
    intentUuid: target.intentUuid,
  });
}

async function defaultRepairConfirmation(
  expectedPhrase: string,
  summary: string,
): Promise<string> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.error(summary);
    return await terminal.question(`Type exactly "${expectedPhrase}" to continue: `);
  } finally {
    terminal.close();
  }
}

async function issueAndConfirmRepair(input: {
  target: Extract<RepairTarget, { kind: "ok" }>;
  runtime: MirrorLifecycleRuntime;
  operation: MirrorOperation;
  operationId: string;
  planDigest: string;
  expectedPhrase: string;
  summary: string;
}): Promise<
  | {
      kind: "confirmed";
      challengeId: string;
      revision: number;
      confirmation: string;
      now: string;
      event: MirrorEventIdentity;
    }
  | { kind: "error"; message: string }
> {
  const before = readMirrorState(input.target.ports);
  if (before.kind !== "ok")
    return {
      kind: "error",
      message:
        before.kind === "invalid"
          ? `Mirror state invalid: ${before.issues.join("; ")}`
          : before.summary,
    };
  const challengeId = (input.runtime.newChallengeId ?? randomUUID)();
  const issuedAt = (input.runtime.now ?? (() => new Date().toISOString()))();
  const event = repairEvent(
    input.target,
    input.operation,
    `repair:${challengeId}`,
  );
  const issued = writeRepairTransition(
    input.target,
    {
      kind: "issue-repair-challenge",
      challenge: {
        challengeId,
        intentUuid: input.target.intentUuid,
        repository: input.target.repository,
        operationId: input.operationId,
        planDigest: input.planDigest,
        expectedPhrase: input.expectedPhrase,
        issuedAt,
      },
      now: issuedAt,
    },
    before.snapshot.revision,
    event,
    input.operationId,
    issuedAt,
  );
  if (issued.kind !== "written")
    return {
      kind: "error",
      message: `Repair challenge was not persisted (${issued.kind}).`,
    };
  const confirm = input.runtime.confirmRepair ?? defaultRepairConfirmation;
  const confirmation = await confirm(input.expectedPhrase, input.summary);
  if (confirmation !== input.expectedPhrase)
    return { kind: "error", message: "Repair confirmation did not match exactly." };
  const current = readMirrorState(input.target.ports);
  if (current.kind !== "ok")
    return { kind: "error", message: "Repair state could not be re-read." };
  return {
    kind: "confirmed",
    challengeId,
    revision: current.snapshot.revision,
    confirmation,
    now: (input.runtime.now ?? (() => new Date().toISOString()))(),
    event,
  };
}

// --- Project diagnostics (read-only) -----------------------------------------
//
// `repair status` observes the Project boards this Intent syncs to and never
// touches them: it calls only the two read methods of the gateway, and the
// mutation methods (addProjectItem / updateProjectItemStatus) are unreachable
// from this path. The ledger is an input, never an output — a diagnosis of a
// board that has drifted does not record that diagnosis anywhere.
//
// The expected column comes from `expectedProjectStatus`, the same definition
// the sync applies, so a diagnosis can never disagree with what a sync would do.

function canonicalProjectRef(project: MirrorProjectRef): string {
  return `${project.owner}/${project.number}`;
}

// The Projects worth diagnosing: everything configuration targets, everything
// the ledger already knows about (a board the Issue has since been removed from
// still deserves a row), and everything the Issue currently belongs to.
function diagnosticTargets(
  configured: readonly MirrorProjectTarget[],
  ledger: readonly MirrorProjectSyncEntry[],
  items: readonly MirrorProjectItem[],
): MirrorProjectTarget[] {
  const byProject = new Map<string, MirrorProjectTarget>();
  for (const target of configured) {
    byProject.set(canonicalProjectRef(target.project), target);
  }
  const addBare = (project: MirrorProjectRef): void => {
    const key = canonicalProjectRef(project);
    // A configured target carries its own status vocabulary; a board known only
    // from the ledger or from membership takes the defaults.
    if (!byProject.has(key)) byProject.set(key, { project, statusNames: {} });
  };
  for (const entry of ledger) {
    const parts = entry.project.split("/");
    const number = Number(parts[1]);
    if (parts.length === 2 && Number.isSafeInteger(number)) {
      addBare({ owner: parts[0], number });
    }
  }
  for (const item of items) {
    addBare({ owner: item.projectOwner, number: item.projectNumber });
  }
  return [...byProject.values()].sort((a, b) =>
    canonicalProjectRef(a.project).localeCompare(canonicalProjectRef(b.project)),
  );
}

// A read that did not produce an Intent Phase field leaves the column unreachable. The
// two reasons a human can act on are distinguished: a credential that lacks the
// `project` scope, and everything else (an absent field, an unresolved Project,
// a failed query) reported as the field being unavailable.
function unreachableResolution(
  classification: MirrorFailureClass,
): "field-missing" | "permission-denied" {
  return classification === "permission" || classification === "unauthenticated"
    ? "permission-denied"
    : "field-missing";
}

// The GitHub token scope every Project read needs. Named once here so the
// permission diagnostic and any future consumer say the same word.
const PROJECT_SCOPE = "project";

// The sentence for a board whose expected column is reachable. It reports the
// observation only: `repair status` proposes nothing and changes nothing.
type RepairSummaryRow = Readonly<{
  membership: "member" | "not-member";
  currentStatus: string | null;
  expectedStatus: string | null;
  drift: boolean;
}>;

function resolvedSummary(row: RepairSummaryRow): string {
  if (row.expectedStatus === null) {
    return "no column is expected right now, so this board is left exactly as it is.";
  }
  if (row.membership === "not-member") {
    return `the Issue is not on this board; the column it would take is "${row.expectedStatus}".`;
  }
  if (!row.drift) return `this board is already in "${row.expectedStatus}".`;
  return `this board is in ${
    row.currentStatus === null ? "no column" : `"${row.currentStatus}"`
  } but the workflow expects "${row.expectedStatus}".`;
}

// The two moves that resolve a column the board does not declare (BR-U4-6): put
// the option on the board, or map the phase onto an option the board already
// has. The board's own option names travel in `availableOptions`.
function optionMissingSummary(project: string, expected: string): string {
  return (
    `${project} declares no Intent Phase option named exactly "${expected}" ` +
    "(the match is exact — case and spacing included). Either add that option to " +
    "the board, or map this phase onto one of the options it already has with a " +
    "`status-names` override for this Project in `mirror-projects`."
  );
}

// A permission diagnostic names the board and the scope it needs, and nothing
// else (BR-U4-7): no token, no response body, and no attempt to change the
// credential — re-authorizing is a human's move, made outside this tool.
function permissionDeniedSummary(project: string): string {
  return (
    `the GitHub credential in use cannot read the Intent Phase field of ${project}; ` +
    `reading and setting a Project column requires the \`${PROJECT_SCOPE}\` scope. ` +
    "Grant that scope to the credential and run `repair status` again."
  );
}

function fieldMissingSummary(project: string): string {
  return (
    `the Intent Phase field of ${project} could not be resolved, so no column can be ` +
    "compared or applied. Confirm the Project exists and carries a single-select " +
    'field named "Intent Phase".'
  );
}

async function diagnoseProject(
  target: Extract<RepairTarget, { kind: "ok" }>,
  snapshot: MirrorSnapshot,
  project: MirrorProjectTarget,
  items: readonly MirrorProjectItem[],
): Promise<MirrorRepairProjectDiagnostic> {
  const canonical = canonicalProjectRef(project.project);
  const item = items.find(
    (each) =>
      each.projectOwner === project.project.owner &&
      each.projectNumber === project.project.number,
  );
  const currentStatus = item?.currentStatus ?? null;
  const expected = expectedProjectStatus(snapshot, "manual", project.statusNames);
  const expectedStatus = expected.kind === "status" ? expected.name : null;
  const membership: MirrorRepairProjectDiagnostic["membership"] =
    item === undefined ? "not-member" : "member";
  const base = {
    project: canonical,
    membership,
    currentStatus,
    expectedStatus,
    // No expected column means nothing to drift from.
    drift: expectedStatus !== null && currentStatus !== expectedStatus,
  };

  const field = await target.gateway.resolveProjectStatusField(project.project);
  if (field.kind === "failure") {
    const resolution = unreachableResolution(field.classification);
    return {
      ...base,
      resolution,
      summary:
        resolution === "permission-denied"
          ? permissionDeniedSummary(canonical)
          : fieldMissingSummary(canonical),
    };
  }
  if (
    expected.kind === "status" &&
    selectProjectStatusOption(field.value, expected.name) === null
  ) {
    return {
      ...base,
      resolution: "option-missing",
      availableOptions: field.value.options.map((option) => option.name),
      summary: optionMissingSummary(canonical, expected.name),
    };
  }
  return { ...base, resolution: "resolved", summary: resolvedSummary(base) };
}

async function projectDiagnostics(
  target: Extract<RepairTarget, { kind: "ok" }>,
  state: MirrorStateSnapshot,
): Promise<readonly MirrorRepairProjectDiagnostic[]> {
  const config = resolveMirrorConfig(
    target.projectDir,
    target.intentDir,
    target.space,
  );
  // An invalid layer contributes no target: the same resolution the sync uses
  // decides here, so a rejected configuration is never diagnosed against.
  const configured = config.kind === "resolved" ? config.config.projects : [];
  const ledger = state.projectSync?.projects ?? [];
  if (configured.length === 0 && ledger.length === 0) return [];
  // Membership is a property of the mirror Issue: with no Issue there is no
  // board relationship to observe, and no query worth spending.
  if (state.issueNumber === null || target.snapshot === null) return [];

  const view = await target.gateway.listProjectItems({
    repository: target.repository,
    number: state.issueNumber,
  });
  const items = view.kind === "ok" ? view.value.items : [];
  if (view.kind === "failure") {
    // Membership could not be read, so every row's membership is unknown rather
    // than absent. Reporting the read failure per Project keeps the diagnosis
    // loud without stopping the command.
    const resolution = unreachableResolution(view.classification);
    return diagnosticTargets(configured, ledger, []).map((project) => {
      const canonical = canonicalProjectRef(project.project);
      return {
        project: canonical,
        membership: "not-member" as const,
        currentStatus: null,
        expectedStatus: null,
        drift: false,
        resolution,
        summary:
          resolution === "permission-denied"
            ? permissionDeniedSummary(canonical)
            : `the Issue's Project memberships could not be read, so nothing about ${canonical} could be observed.`,
      };
    });
  }

  const rows: MirrorRepairProjectDiagnostic[] = [];
  for (const project of diagnosticTargets(configured, ledger, items)) {
    rows.push(await diagnoseProject(target, target.snapshot, project, items));
  }
  return rows;
}

async function runRepairStatus(
  target: Extract<RepairTarget, { kind: "ok" }>,
): Promise<MirrorRepairOutcome> {
  const read = readMirrorState(target.ports);
  if (read.kind !== "ok")
    return {
      kind: "error",
      message: read.kind === "invalid" ? read.issues.join("; ") : read.summary,
    };
  let provenance: "unlinked" | "verified" | "unverified" =
    read.snapshot.provenance ? "unverified" : "unlinked";
  if (read.snapshot.provenance && read.snapshot.issueNumber !== null) {
    const viewed = await target.gateway.viewIssue(
      target.repository,
      read.snapshot.issueNumber,
    );
    if (
      viewed.kind === "ok" &&
      verifyOwnership({
        remoteIssue: viewed.value,
        localProvenance: read.snapshot.provenance,
      }).kind === "verified"
    ) {
      provenance = "verified";
    }
  }
  return {
    kind: "status",
    intentDir: target.intentDir,
    repository: target.repository.canonical,
    revision: read.snapshot.revision,
    issueNumber: read.snapshot.issueNumber,
    provenance,
    projectDiagnostics: await projectDiagnostics(target, read.snapshot),
    pendingOperations: Object.values(read.snapshot.receipts)
      .filter((receipt) =>
        ["prepared", "attempted", "pending", "safety-blocked"].includes(receipt.status)
      )
      .map((receipt) => `${receipt.operationId}:${receipt.status}`)
      .sort(),
  };
}

async function runRepairRelink(
  target: Extract<RepairTarget, { kind: "ok" }>,
  issueNumber: number,
  runtime: MirrorLifecycleRuntime,
): Promise<MirrorRepairOutcome> {
  const inspectedAt = (runtime.now ?? (() => new Date().toISOString()))();
  const viewed = await target.gateway.viewIssue(target.repository, issueNumber);
  if (viewed.kind !== "ok")
    return { kind: "error", message: "Repair relink could not inspect the Issue." };
  const marker = parseMirrorMarker(viewed.value.body);
  if (marker.kind !== "parsed")
    return {
      kind: "error",
      message: "Repair relink requires one valid ownership marker.",
    };
  const identity = marker.identity;
  if (
    viewed.value.repository.canonical !== target.repository.canonical ||
    identity.repository.canonical !== target.repository.canonical ||
    identity.intentUuid !== target.intentUuid ||
    identity.intentDir !== target.intentDir
  ) {
    return {
      kind: "error",
      message: "Repair relink refused an Issue not owned by this Intent.",
    };
  }
  const provenance: MirrorProvenanceV2 = {
    schema: 2,
    createIdentity: identity,
    issueNumber,
    createdAt: inspectedAt,
  };
  const plan = repairPlanDigest({
    kind: "relink",
    intentUuid: target.intentUuid,
    repository: target.repository.canonical,
    operationId: identity.operationId,
    issueNumber,
    provenanceDigest: provenanceDigestV2(provenance),
  });
  if (plan.kind !== "ok")
    return { kind: "error", message: plan.issues.join("; ") };
  const phrase = `RELINK ${target.intentDir} ${target.repository.canonical} #${issueNumber}`;
  const confirmation = await issueAndConfirmRepair({
    target,
    runtime,
    operation: "create",
    operationId: identity.operationId,
    planDigest: plan.digest,
    expectedPhrase: phrase,
    summary: `Relink ${target.intentDir} to ${target.repository.canonical}#${issueNumber}.`,
  });
  if (confirmation.kind === "error") return confirmation;
  const applied = writeRepairTransition(
    target,
    {
      kind: "repair-link",
      issueNumber,
      provenance,
      consume: {
        challengeId: confirmation.challengeId,
        intentUuid: target.intentUuid,
        repository: target.repository,
        operationId: identity.operationId,
        planDigest: plan.digest,
        confirmationPhrase: confirmation.confirmation,
      },
    },
    confirmation.revision,
    confirmation.event,
    identity.operationId,
    confirmation.now,
  );
  return applied.kind === "written"
    ? { kind: "repaired", action: "relink", issueNumber }
    : { kind: "error", message: `Repair relink failed (${applied.kind}).` };
}

async function runRepairAbandon(
  target: Extract<RepairTarget, { kind: "ok" }>,
  operationId: string,
  runtime: MirrorLifecycleRuntime,
): Promise<MirrorRepairOutcome> {
  const read = readMirrorState(target.ports);
  if (read.kind !== "ok")
    return { kind: "error", message: "Repair abandon could not read state." };
  const matches = Object.values(read.snapshot.receipts).filter(
    (receipt) => receipt.operationId === operationId,
  );
  if (matches.length !== 1)
    return {
      kind: "error",
      message: "Repair abandon requires one exact local operation.",
    };
  const receipt = matches[0];
  if (receipt.status === "abandoned")
    return { kind: "repaired", action: "abandon", issueNumber: null };
  const plan = repairPlanDigest({
    kind: "abandon",
    intentUuid: target.intentUuid,
    repository: target.repository.canonical,
    operationId,
  });
  if (plan.kind !== "ok")
    return { kind: "error", message: plan.issues.join("; ") };
  const phrase = `ABANDON ${target.intentDir} ${operationId}`;
  const confirmation = await issueAndConfirmRepair({
    target,
    runtime,
    operation: receipt.event.operation,
    operationId,
    planDigest: plan.digest,
    expectedPhrase: phrase,
    summary: `Abandon ${operationId}; duplicate-risk acknowledgement is required.`,
  });
  if (confirmation.kind === "error") return confirmation;
  const applied = writeRepairTransition(
    target,
    {
      kind: "abandon-attempt",
      event: receipt.event,
      completedAt: confirmation.now,
      consume: {
        challengeId: confirmation.challengeId,
        intentUuid: target.intentUuid,
        repository: target.repository,
        operationId,
        planDigest: plan.digest,
        confirmationPhrase: confirmation.confirmation,
      },
    },
    confirmation.revision,
    confirmation.event,
    operationId,
    confirmation.now,
  );
  return applied.kind === "written"
    ? { kind: "repaired", action: "abandon", issueNumber: null }
    : { kind: "error", message: `Repair abandon failed (${applied.kind}).` };
}

export async function runMirrorRepairCommand(
  request: MirrorRepairRequest,
  runtime: MirrorLifecycleRuntime = {},
): Promise<MirrorRepairOutcome> {
  const target = resolveRepairTarget(request, runtime);
  if (target.kind === "error") return target;
  if (request.command.kind === "status") return runRepairStatus(target);
  if (request.command.kind === "relink")
    return runRepairRelink(target, request.command.issueNumber, runtime);
  return runRepairAbandon(target, request.command.operationId, runtime);
}

export async function runMirrorLifecycleAnswer(
  request: MirrorLifecycleAnswerRequest,
  runtime: MirrorLifecycleRuntime = {},
): Promise<MirrorLifecycleAdapterOutcome> {
  const identity = resolveMirrorRecordIdentity(
    request.projectDir,
    request.space,
    request.intentDir,
  );
  if (!identity) {
    return {
      kind: "error",
      message: "Mirror answer could not resolve an Intent.",
    };
  }
  const ports =
    runtime.ports ??
    createMirrorStateStorePorts({
      projectDir: request.projectDir,
      statePath: join(identity.recordDir, "amadeus-state.md"),
      intent: identity.intentDir,
      space: identity.space,
    });
  const current = readMirrorState(ports);
  if (current.kind !== "ok") {
    return {
      kind: "error",
      message:
        current.kind === "invalid"
          ? `Mirror answer state is invalid: ${current.issues.join("; ")}`
          : current.summary,
    };
  }
  const expected = current.snapshot.expectedPrompt;
  if (!expected || expected.bindingId !== request.bindingId) {
    return {
      kind: "error",
      message: "Mirror answer binding does not match the current expected prompt.",
    };
  }
  const manualBinding =
    expected.event.boundary.kind === "manual"
      ? {
          manualOperation: expected.operation,
          invocationId: expected.event.boundary.instance,
        }
      : {};
  return runMirrorLifecycleBoundary(
    {
      projectDir: request.projectDir,
      space: identity.space,
      intentDir: identity.intentDir,
      ...(request.repository ? { repository: request.repository } : {}),
      boundary: expected.event.boundary,
      ...manualBinding,
      answer: {
        choice: request.choice,
        bindingId: request.bindingId,
        answerId: (runtime.newAnswerId ?? randomUUID)(),
        event: expected.event,
        operation: expected.operation,
      },
    },
    { ...runtime, ports },
  );
}

export async function runMirrorLifecycleMain(
  args: string[],
  runtime: MirrorLifecycleRuntime = {},
): Promise<number> {
  const parsed = parseMirrorLifecycleArgs(args);
  if (parsed.kind === "usage") {
    console.error(parsed.message);
    return 2;
  }
  if (parsed.kind === "repair") {
    const result = await runMirrorRepairCommand(parsed.request, runtime);
    if (result.kind === "error") {
      console.error(`amadeus-mirror-lifecycle: ${result.message}`);
      return 1;
    }
    console.log(JSON.stringify(result));
    return 0;
  }
  const result =
    parsed.kind === "answer"
      ? await runMirrorLifecycleAnswer(parsed.request, runtime)
      : await runMirrorLifecycleBoundary(parsed.request, runtime);
  if (result.kind === "error") {
    console.error(`amadeus-mirror-lifecycle: ${result.message}`);
    return 1;
  }
  console.log(JSON.stringify(result.outcome));
  if (
    result.outcome.kind === "continued" &&
    result.outcome.outcomes.length > 0 &&
    result.outcome.outcomes.every((outcome) => outcome.kind === "completed")
  ) {
    return 0;
  }
  return 1;
}

if (import.meta.main) {
  process.exit(await runMirrorLifecycleMain(process.argv.slice(2)));
}
