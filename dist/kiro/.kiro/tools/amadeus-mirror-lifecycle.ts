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
import { parseMirrorMarker, verifyOwnership } from "./amadeus-mirror-provenance.ts";
import {
  MIRROR_USER_CONTRACT,
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
  MirrorEventIdentity,
  MirrorGitHubGateway,
  MirrorOperation,
  MirrorOperationOutcome,
  MirrorProvenanceV2,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";

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
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: projectDir,
    encoding: "utf-8",
    timeout: 5_000,
  });
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

function lifecycleSnapshot(
  target: Extract<ResolvedLifecycleTarget, { kind: "ok" }>,
  now: () => string,
) {
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

export type MirrorRepairOutcome =
  | {
      kind: "status";
      intentDir: string;
      repository: string;
      revision: number;
      issueNumber: number | null;
      provenance: "unlinked" | "verified" | "unverified";
      pendingOperations: readonly string[];
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
      intentDir: string;
      intentUuid: string;
      repository: RepositoryIdentity;
      ports: MirrorStateStorePorts;
      gateway: MirrorGitHubGateway;
    }
  | { kind: "error"; message: string };

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
    intentDir,
    intentUuid: entry.uuid,
    repository,
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
  return runMirrorLifecycleBoundary(
    {
      projectDir: request.projectDir,
      space: identity.space,
      intentDir: identity.intentDir,
      ...(request.repository ? { repository: request.repository } : {}),
      boundary: expected.event.boundary,
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
