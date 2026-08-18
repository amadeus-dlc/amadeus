import { parseSnapshot } from "./metrics-timeseries.ts";

export const SNAPSHOT_MARKER_PREFIX = "<!-- amadeus:metrics-snapshot:v1 sha=";
export const MAINTENANCE_MARKER = "<!-- amadeus:metrics-maintenance:v1 -->";
export const MAINTENANCE_BRANCH = "metrics/maintenance";

type JsonRecord = Record<string, unknown>;
export type Ownership = { ok: true } | { ok: false; missing: string[] };
export type PublicationDecision<Action extends string> = {
  action: Action;
  stickyFailure: boolean;
  reasons: string[];
};
export type ChangedFile = {
  path: string;
  additions?: number;
  deletions?: number;
  status?: "A" | "M" | "D";
  text?: string;
};
export type PublicationPullRequest = {
  kind: "pull-request";
  number: number;
  url: string;
  state: "open" | "closed";
  mergeability: "mergeable" | "pending" | "conflicting" | "not-applicable";
  mergedAt: string | null;
  branch: string;
  headOid: string;
  repository: string;
  author: string;
  title: string;
  body: string;
  files: ChangedFile[];
  ownership: Ownership;
};
export type PublicationBranch = {
  kind: "branch";
  name: string;
  oid: string;
  tipAuthor: string;
  files: ChangedFile[];
  ownership: Ownership;
};
export type PublicationCandidate = PublicationPullRequest | PublicationBranch;
export type LandedSnapshot = { path: string; sha: string };

export type SnapshotInventory = {
  targetSha: string;
  landed: LandedSnapshot[];
  pullRequests: PublicationPullRequest[];
  branches: PublicationBranch[];
  problems: string[];
};

export type MaintenanceInventory = {
  hasDiff: boolean;
  pullRequests: PublicationPullRequest[];
  branches: PublicationBranch[];
  problems: string[];
};

export type OwnershipContext = {
  repository: string;
  botLogin: string;
  targetSha?: string;
  capturedAt?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): JsonRecord {
  if (!isRecord(value)) throw new Error(`${field} is missing or is not an object`);
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} is missing or is not a string`);
  }
  return value;
}

function requireNullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requireString(value, field);
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${field} is missing or is not an integer`);
  }
  return value;
}

function requireFiles(value: unknown): ChangedFile[] {
  if (!Array.isArray(value)) throw new Error("files is missing or is not an array");
  return value.map((entry, index) => {
    const file = requireRecord(entry, `files[${index}]`);
    const changed: ChangedFile = { path: requireString(file.path, `files[${index}].path`) };
    if (file.additions !== undefined) changed.additions = requireNumber(file.additions, `files[${index}].additions`);
    if (file.deletions !== undefined) changed.deletions = requireNumber(file.deletions, `files[${index}].deletions`);
    if (file.status !== undefined) {
      const status = requireString(file.status, `files[${index}].status`);
      if (!["A", "M", "D"].includes(status)) throw new Error(`files[${index}].status is unsupported`);
      changed.status = status as ChangedFile["status"];
    }
    if (file.text !== undefined) changed.text = requireString(file.text, `files[${index}].text`);
    return changed;
  });
}

export function isFullSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function parseSnapshotText(file: ChangedFile): { sha: string; capturedAt: string } | null {
  if (file.text === undefined) return null;
  const parsed = parseSnapshot(file.text, file.path);
  if (parsed.kind === "error" || !isFullSha(parsed.snapshot.commit)) return null;
  if (!file.path.includes(parsed.snapshot.commit.slice(0, 12))) return null;
  return { sha: parsed.snapshot.commit, capturedAt: parsed.snapshot.captured_at };
}

function snapshotBranchTarget(branch: string): string | null {
  const current = /^metrics\/snapshot-([0-9a-f]{40})$/.exec(branch);
  if (current) return current[1];
  const legacy = /^metrics\/snapshot-([0-9a-f]{12})-[1-9][0-9]*$/.exec(branch);
  return legacy?.[1] ?? null;
}

function ownership(missing: string[]): Ownership {
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

function isPullRequest(raw: JsonRecord): boolean {
  return raw.number !== undefined;
}

function isSnapshotOnly(files: ChangedFile[], targetSha: string): boolean {
  if (files.length !== 1) return false;
  const file = files[0];
  if (!file.path.startsWith("metrics/") || !file.path.endsWith(".json")) return false;
  if (file.status !== undefined && file.status !== "A") return false;
  if (file.additions !== undefined && file.additions < 1) return false;
  if ((file.deletions ?? 0) !== 0) return false;
  return parseSnapshotText(file)?.sha === targetSha;
}

function isMaintenanceOnly(files: ChangedFile[]): boolean {
  if (files.length === 0) return false;
  return files.every((file) => {
    if (file.path === "metrics/index.html") {
      return file.status === undefined || file.status === "M";
    }
    if (!file.path.startsWith("metrics/") || !file.path.endsWith(".json")) return false;
    if (file.status !== undefined) return file.status === "D";
    return (file.additions ?? 0) === 0 && (file.deletions ?? 0) > 0;
  });
}

function missingEvidence(entries: Array<[isPresent: boolean, label: string]>): string[] {
  return entries.filter(([isPresent]) => !isPresent).map(([, label]) => label);
}

// gh renders a GitHub App author as `app/<slug>`, while the git identity, the REST login and the
// `--bot-login` argument all name that same account as `<slug>[bot]`. Comparing the raw strings
// never matches, so the publisher stops recognising its own pull request and fails closed forever.
// Folding the gh surface form onto the canonical bot login compares accounts instead of spellings.
// A bare `<slug>` is deliberately left alone: it names a human in the same namespace, and folding
// it in would widen the very accept set this evidence exists to keep closed.
const APP_AUTHOR_PREFIX = "app/";

function canonicalAuthorLogin(login: string): string {
  return login.startsWith(APP_AUTHOR_PREFIX) ? `${login.slice(APP_AUTHOR_PREFIX.length)}[bot]` : login;
}

function isPublishingBot(author: string, botLogin: string): boolean {
  return canonicalAuthorLogin(author) === canonicalAuthorLogin(botLogin);
}

function snapshotPullRequestEvidence(raw: JsonRecord, context: OwnershipContext, targetSha: string): string[] {
  const repository = requireString(requireRecord(raw.headRepository, "headRepository").nameWithOwner, "headRepository.nameWithOwner");
  const author = requireString(requireRecord(raw.author, "author").login, "author.login");
  const branch = requireString(raw.headRefName, "headRefName");
  const title = requireString(raw.title, "title");
  const body = typeof raw.body === "string" ? raw.body : "";
  const branchTarget = snapshotBranchTarget(branch);
  const currentMarker = `${title}\n${body}`.includes(`${SNAPSHOT_MARKER_PREFIX}${targetSha} -->`);
  const legacyMarker = branchTarget?.length === 12 && title.startsWith("メトリクススナップショットを記録する");
  return missingEvidence([
    [repository === context.repository, "head repository"],
    [isPublishingBot(author, context.botLogin), "author"],
    [branchTarget !== null && targetSha.startsWith(branchTarget), "branch"],
    [currentMarker || legacyMarker, "machine marker"],
  ]);
}

function snapshotBranchEvidence(raw: JsonRecord, context: OwnershipContext, targetSha: string): string[] {
  const branchTarget = snapshotBranchTarget(requireString(raw.name, "name"));
  return missingEvidence([
    [requireString(raw.tipAuthor, "tipAuthor") === context.botLogin, "tip author"],
    [branchTarget !== null && targetSha.startsWith(branchTarget), "branch"],
  ]);
}

// Backfill pins captured_at to the source evidence time: a candidate whose snapshot carries any
// other captured_at (or path) must not be reusable, otherwise a leftover open PR for the same
// commit would auto-merge the wrong timestamp instead of failing closed.
function matchesEvidenceCapture(files: ChangedFile[], capturedAt: string, targetSha: string): boolean {
  if (files.length !== 1) return false;
  const file = files[0];
  const expectedPath = `metrics/${capturedAt.replace(/[:.]/g, "-")}-${targetSha.slice(0, 12)}.json`;
  return file.path === expectedPath && parseSnapshotText(file)?.capturedAt === capturedAt;
}

export function verifySnapshotOwnership(rawValue: unknown, context: OwnershipContext): Ownership {
  const raw = requireRecord(rawValue, "candidate");
  const files = requireFiles(raw.files);
  const targetSha = context.targetSha ?? "";
  const candidateEvidence = isPullRequest(raw)
    ? snapshotPullRequestEvidence(raw, context, targetSha)
    : snapshotBranchEvidence(raw, context, targetSha);
  const captureEvidence: Array<[boolean, string]> =
    context.capturedAt === undefined
      ? []
      : [[matchesEvidenceCapture(files, context.capturedAt, targetSha), "evidence captured_at"]];
  return ownership([
    ...missingEvidence([
      [isFullSha(targetSha), "target full SHA"],
      [isSnapshotOnly(files, targetSha), "JSON-only full-SHA diff"],
      ...captureEvidence,
    ]),
    ...candidateEvidence,
  ]);
}

function maintenancePullRequestEvidence(raw: JsonRecord, context: OwnershipContext): string[] {
  const repository = requireString(requireRecord(raw.headRepository, "headRepository").nameWithOwner, "headRepository.nameWithOwner");
  const author = requireString(requireRecord(raw.author, "author").login, "author.login");
  const title = requireString(raw.title, "title");
  const body = typeof raw.body === "string" ? raw.body : "";
  return missingEvidence([
    [repository === context.repository, "head repository"],
    [isPublishingBot(author, context.botLogin), "author"],
    [requireString(raw.headRefName, "headRefName") === MAINTENANCE_BRANCH, "stable branch"],
    [`${title}\n${body}`.includes(MAINTENANCE_MARKER), "machine marker"],
  ]);
}

function maintenanceBranchEvidence(raw: JsonRecord, context: OwnershipContext): string[] {
  return missingEvidence([
    [requireString(raw.name, "name") === MAINTENANCE_BRANCH, "stable branch"],
    [requireString(raw.tipAuthor, "tipAuthor") === context.botLogin, "tip author"],
  ]);
}

export function verifyMaintenanceOwnership(rawValue: unknown, context: OwnershipContext): Ownership {
  const raw = requireRecord(rawValue, "candidate");
  const files = requireFiles(raw.files);
  const candidateEvidence = isPullRequest(raw)
    ? maintenancePullRequestEvidence(raw, context)
    : maintenanceBranchEvidence(raw, context);
  return ownership([
    ...candidateEvidence,
    ...missingEvidence([[isMaintenanceOnly(files), "index-and-retention-only diff"]]),
  ]);
}

function parseMergeability(value: unknown): "mergeable" | "pending" | "conflicting" {
  const status = requireString(value, "mergeStateStatus").toUpperCase();
  if (["CLEAN", "HAS_HOOKS", "MERGEABLE", "UNSTABLE"].includes(status)) return "mergeable";
  if (["BEHIND", "BLOCKED", "DRAFT", "UNKNOWN"].includes(status)) return "pending";
  if (["CONFLICTING", "DIRTY"].includes(status)) return "conflicting";
  throw new Error(`mergeStateStatus ${JSON.stringify(status)} is unsupported`);
}

function parsePullRequest(raw: JsonRecord, verifier: (raw: JsonRecord) => Ownership): PublicationPullRequest {
  const state = requireString(raw.state, "state").toLowerCase();
  if (state !== "open" && state !== "closed") throw new Error(`state ${JSON.stringify(state)} is unsupported`);
  return {
    kind: "pull-request",
    number: requireNumber(raw.number, "number"),
    url: requireString(raw.url, "url"),
    state,
    mergeability: state === "closed" ? "not-applicable" : parseMergeability(raw.mergeStateStatus),
    mergedAt: requireNullableString(raw.mergedAt, "mergedAt"),
    branch: requireString(raw.headRefName, "headRefName"),
    headOid: requireString(raw.headRefOid, "headRefOid"),
    repository: requireString(requireRecord(raw.headRepository, "headRepository").nameWithOwner, "headRepository.nameWithOwner"),
    author: requireString(requireRecord(raw.author, "author").login, "author.login"),
    title: requireString(raw.title, "title"),
    body: typeof raw.body === "string" ? raw.body : "",
    files: requireFiles(raw.files),
    ownership: verifier(raw),
  };
}

function parseBranch(raw: JsonRecord, verifier: (raw: JsonRecord) => Ownership): PublicationBranch {
  return {
    kind: "branch",
    name: requireString(raw.name, "name"),
    oid: requireString(raw.oid, "oid"),
    tipAuthor: requireString(raw.tipAuthor, "tipAuthor"),
    files: requireFiles(raw.files),
    ownership: verifier(raw),
  };
}

export function parseSnapshotCandidate(rawValue: unknown, suppliedContext?: OwnershipContext): PublicationCandidate {
  const raw = requireRecord(rawValue, "candidate");
  const branch = requireString(isPullRequest(raw) ? raw.headRefName : raw.name, isPullRequest(raw) ? "headRefName" : "name");
  const branchTarget = snapshotBranchTarget(branch);
  const context: OwnershipContext = suppliedContext ?? {
    repository: isPullRequest(raw)
      ? requireString(requireRecord(raw.headRepository, "headRepository").nameWithOwner, "headRepository.nameWithOwner")
      : "",
    botLogin: isPullRequest(raw)
      ? requireString(requireRecord(raw.author, "author").login, "author.login")
      : requireString(raw.tipAuthor, "tipAuthor"),
    targetSha: branchTarget?.length === 40 ? branchTarget : parseSnapshotText(requireFiles(raw.files)[0])?.sha,
  };
  return isPullRequest(raw)
    ? parsePullRequest(raw, (candidate) => verifySnapshotOwnership(candidate, context))
    : parseBranch(raw, (candidate) => verifySnapshotOwnership(candidate, context));
}

export function parseMaintenanceCandidate(rawValue: unknown, context: OwnershipContext): PublicationCandidate {
  const raw = requireRecord(rawValue, "candidate");
  return isPullRequest(raw)
    ? parsePullRequest(raw, (candidate) => verifyMaintenanceOwnership(candidate, context))
    : parseBranch(raw, (candidate) => verifyMaintenanceOwnership(candidate, context));
}

function ownershipProblems(candidates: PublicationCandidate[]): string[] {
  return candidates.flatMap((candidate) =>
    candidate.ownership.ok
      ? []
      : [`${candidate.kind === "pull-request" ? candidate.url : candidate.name}: ${candidate.ownership.missing.join(", ")}`],
  );
}

export function decideSnapshotPublication(
  inventory: SnapshotInventory,
): PublicationDecision<"fail-closed" | "dispatch" | "cleanup-landed" | "reuse" | "create" | "recover"> {
  const candidates: PublicationCandidate[] = [...inventory.pullRequests, ...inventory.branches];
  const problems = [
    ...inventory.problems,
    ...ownershipProblems(candidates),
    ...inventory.landed
      .filter((entry) => entry.sha !== inventory.targetSha)
      .map((entry) => `${entry.path}: commit does not match target SHA`),
  ];
  if (!isFullSha(inventory.targetSha)) problems.push("target SHA is not 40 lowercase hexadecimal characters");
  if (inventory.landed.length > 1) problems.push("multiple landed snapshots match the target SHA");
  if (problems.length > 0) return { action: "fail-closed", stickyFailure: true, reasons: problems };
  if (inventory.landed.length === 1) {
    return candidates.length === 0
      ? { action: "dispatch", stickyFailure: false, reasons: [] }
      : { action: "cleanup-landed", stickyFailure: true, reasons: ["landed snapshot has stale candidates"] };
  }
  if (candidates.length === 0) return { action: "create", stickyFailure: false, reasons: [] };
  const isSingleReusable =
    inventory.pullRequests.length === 1 &&
    inventory.branches.length === 1 &&
    inventory.pullRequests[0].state === "open" &&
    inventory.pullRequests[0].mergeability !== "conflicting" &&
    inventory.pullRequests[0].branch === inventory.branches[0].name &&
    inventory.pullRequests[0].headOid === inventory.branches[0].oid;
  return isSingleReusable
    ? { action: "reuse", stickyFailure: false, reasons: [] }
    : { action: "recover", stickyFailure: true, reasons: ["snapshot candidates are not a single reusable OPEN PR"] };
}

export function decideMaintenancePublication(
  inventory: MaintenanceInventory,
): PublicationDecision<"fail-closed" | "no-op" | "cleanup-no-diff" | "create" | "update" | "recover"> {
  const candidates: PublicationCandidate[] = [...inventory.pullRequests, ...inventory.branches];
  const problems = [...inventory.problems, ...ownershipProblems(candidates)];
  if (problems.length > 0) return { action: "fail-closed", stickyFailure: true, reasons: problems };
  if (!inventory.hasDiff) {
    return candidates.length === 0
      ? { action: "no-op", stickyFailure: false, reasons: [] }
      : { action: "cleanup-no-diff", stickyFailure: true, reasons: ["no-diff state has stale candidates"] };
  }
  if (candidates.length === 0) return { action: "create", stickyFailure: false, reasons: [] };
  const isSinglePair =
    inventory.pullRequests.length === 1 &&
    inventory.branches.length === 1 &&
    inventory.pullRequests[0].branch === inventory.branches[0].name &&
    inventory.pullRequests[0].headOid === inventory.branches[0].oid;
  if (isSinglePair && inventory.pullRequests[0].state === "open") {
    return {
      action: "update",
      stickyFailure: inventory.pullRequests[0].mergeability === "conflicting",
      reasons: inventory.pullRequests[0].mergeability === "conflicting" ? ["OPEN maintenance PR is conflicting"] : [],
    };
  }
  return { action: "recover", stickyFailure: true, reasons: ["maintenance candidates are inconsistent"] };
}

export function classifyDeadline(input: {
  nowMs: number;
  deadlineMs: number;
  isReady: boolean;
}): "ready" | "pending" | "timeout" {
  if (input.isReady) return "ready";
  return input.nowMs >= input.deadlineMs ? "timeout" : "pending";
}

export type OperationReceipt = {
  operation: string;
  target: string;
  status: "accepted" | "rejected";
  detail?: string;
};

export type SnapshotPublisherPort = {
  inventory(): Promise<SnapshotInventory>;
  cleanup(inventory: SnapshotInventory): Promise<OperationReceipt[]>;
  create(): Promise<{ url: string; receipts: OperationReceipt[] }>;
  enableAutoMerge(url: string): Promise<OperationReceipt>;
  dispatchMaintenance(): Promise<OperationReceipt>;
  nowMs(): number;
  sleep(milliseconds: number): Promise<void>;
};

export type PublisherRunResult = {
  code: 0 | 1;
  finalState: string;
  stickyFailure: boolean;
  receipts: OperationReceipt[];
  problems: string[];
};

function snapshotPostconditionProblems(inventory: SnapshotInventory): string[] {
  const problems = [...inventory.problems];
  if (inventory.landed.length !== 1) problems.push(`expected 1 landed snapshot, found ${inventory.landed.length}`);
  if (inventory.landed.some((entry) => entry.sha !== inventory.targetSha)) {
    problems.push("landed snapshot SHA does not match target");
  }
  if (inventory.pullRequests.length !== 0) problems.push(`expected 0 related pull requests, found ${inventory.pullRequests.length}`);
  if (inventory.branches.length !== 0) problems.push(`expected 0 related branches, found ${inventory.branches.length}`);
  problems.push(...ownershipProblems([...inventory.pullRequests, ...inventory.branches]));
  return problems;
}

function failedRun(
  finalState: string,
  stickyFailure: boolean,
  receipts: OperationReceipt[],
  problems: string[],
): PublisherRunResult {
  return { code: 1, finalState, stickyFailure, receipts, problems };
}

function successfulRun(
  stickyFailure: boolean,
  receipts: OperationReceipt[],
  problems: string[],
): PublisherRunResult {
  return {
    code: stickyFailure ? 1 : 0,
    finalState: stickyFailure ? "converged-with-recovery" : "converged",
    stickyFailure,
    receipts,
    problems,
  };
}

function rejectedReceiptProblems(receipts: OperationReceipt[]): string[] {
  return receipts
    .filter((receipt) => receipt.status === "rejected")
    .map((receipt) => receipt.detail ?? receipt.target);
}

async function waitForSnapshotPostcondition(
  port: SnapshotPublisherPort,
  options: { deadlineMs: number; pollIntervalMs: number },
  stickyFailure: boolean,
  receipts: OperationReceipt[],
): Promise<SnapshotInventory | PublisherRunResult> {
  while (true) {
    const inventory = await port.inventory();
    const problems = snapshotPostconditionProblems(inventory);
    if (problems.length === 0) return inventory;
    const hasTerminalPullRequest = inventory.pullRequests.some(
      (candidate) => candidate.state === "closed" || candidate.mergeability === "conflicting",
    );
    if (hasTerminalPullRequest || inventory.problems.length > 0) {
      return failedRun("publication-not-converged", stickyFailure, receipts, problems);
    }
    if (port.nowMs() >= options.deadlineMs) return failedRun("timeout", stickyFailure, receipts, problems);
    await port.sleep(options.pollIntervalMs);
  }
}

async function dispatchSnapshotMaintenance(
  port: SnapshotPublisherPort,
  stickyFailure: boolean,
  receipts: OperationReceipt[],
  decisionReasons: string[],
): Promise<PublisherRunResult> {
  const dispatchReceipt = await port.dispatchMaintenance();
  receipts.push(dispatchReceipt);
  if (dispatchReceipt.status === "rejected") {
    return failedRun("dispatch-rejected", stickyFailure, receipts, [dispatchReceipt.detail ?? "dispatch rejected"]);
  }
  const finalProblems = snapshotPostconditionProblems(await port.inventory());
  return finalProblems.length === 0
    ? successfulRun(stickyFailure, receipts, decisionReasons)
    : failedRun("postcondition-failed", stickyFailure, receipts, finalProblems);
}

function requiresSnapshotCleanup(action: string): boolean {
  return action === "cleanup-landed" || action === "recover";
}

function requiresSnapshotCreation(action: string): boolean {
  return action === "create" || action === "recover";
}

function validateCleanedLandedSnapshot(
  action: string,
  inventory: SnapshotInventory,
  receipts: OperationReceipt[],
): PublisherRunResult | null {
  if (action !== "cleanup-landed") return null;
  const problems = snapshotPostconditionProblems(inventory);
  return problems.length === 0 ? null : failedRun("cleanup-not-converged", true, receipts, problems);
}

export async function runSnapshotPublisher(
  port: SnapshotPublisherPort,
  options: { deadlineMs: number; pollIntervalMs: number },
): Promise<PublisherRunResult> {
  const receipts: OperationReceipt[] = [];
  let inventory = await port.inventory();
  const decision = decideSnapshotPublication(inventory);
  if (decision.action === "fail-closed") {
    return failedRun("fail-closed", decision.stickyFailure, receipts, decision.reasons);
  }

  if (requiresSnapshotCleanup(decision.action)) {
    const cleanupReceipts = await port.cleanup(inventory);
    receipts.push(...cleanupReceipts);
    const cleanupProblems = rejectedReceiptProblems(cleanupReceipts);
    if (cleanupProblems.length > 0) return failedRun("cleanup-rejected", true, receipts, cleanupProblems);
    inventory = await port.inventory();
  }
  let pullRequestUrl: string | null = null;
  if (requiresSnapshotCreation(decision.action)) {
    const created = await port.create();
    receipts.push(...created.receipts);
    pullRequestUrl = created.url;
  } else if (decision.action === "reuse") {
    pullRequestUrl = inventory.pullRequests[0]?.url ?? null;
  }

  if (pullRequestUrl !== null) {
    const mergeReceipt = await port.enableAutoMerge(pullRequestUrl);
    receipts.push(mergeReceipt);
    if (mergeReceipt.status === "rejected") {
      return failedRun("auto-merge-rejected", decision.stickyFailure, receipts, [mergeReceipt.detail ?? pullRequestUrl]);
    }
    const waited = await waitForSnapshotPostcondition(port, options, decision.stickyFailure, receipts);
    if ("code" in waited) return waited;
  }
  const cleanupFailure = validateCleanedLandedSnapshot(decision.action, inventory, receipts);
  if (cleanupFailure !== null) return cleanupFailure;
  return dispatchSnapshotMaintenance(port, decision.stickyFailure, receipts, decision.reasons);
}

export type MaintenancePreparation = {
  cutoffSha: string;
  inventory: MaintenanceInventory;
};

export type MaintenancePublishResult =
  | { kind: "published"; url: string; receipts: OperationReceipt[] }
  | { kind: "retry"; receipts: OperationReceipt[] }
  | { kind: "rejected"; receipts: OperationReceipt[]; problem: string };

export type MaintenancePublisherPort = {
  prepare(): Promise<MaintenancePreparation>;
  currentMainSha(): Promise<string>;
  cleanup(inventory: MaintenanceInventory): Promise<OperationReceipt[]>;
  publish(preparation: MaintenancePreparation): Promise<MaintenancePublishResult>;
  enableAutoMerge(url: string): Promise<OperationReceipt>;
  reconcile(cutoffSha: string): Promise<{ mainSha: string; inventory: MaintenanceInventory }>;
  nowMs(): number;
  sleep(milliseconds: number): Promise<void>;
};

function maintenancePostconditionProblems(inventory: MaintenanceInventory): string[] {
  const problems = [...inventory.problems];
  if (inventory.hasDiff) problems.push("maintenance diff remains");
  if (inventory.pullRequests.length !== 0) problems.push(`expected 0 OPEN maintenance PRs, found ${inventory.pullRequests.length}`);
  if (inventory.branches.length !== 0) problems.push(`expected 0 maintenance branches, found ${inventory.branches.length}`);
  problems.push(...ownershipProblems([...inventory.pullRequests, ...inventory.branches]));
  return problems;
}

async function waitForMaintenancePostcondition(
  port: MaintenancePublisherPort,
  cutoffSha: string,
  options: { deadlineMs: number; pollIntervalMs: number },
  stickyFailure: boolean,
  receipts: OperationReceipt[],
  decisionReasons: string[],
): Promise<PublisherRunResult> {
  while (true) {
    const observation = await port.reconcile(cutoffSha);
    const problems = maintenancePostconditionProblems(observation.inventory);
    if (problems.length === 0) return successfulRun(stickyFailure, receipts, decisionReasons);
    const hasTerminalPullRequest = observation.inventory.pullRequests.some(
      (candidate) => candidate.state === "closed" || candidate.mergeability === "conflicting",
    );
    if (hasTerminalPullRequest || observation.inventory.problems.length > 0) {
      return failedRun("publication-not-converged", stickyFailure, receipts, problems);
    }
    if (port.nowMs() >= options.deadlineMs) return failedRun("timeout", stickyFailure, receipts, problems);
    await port.sleep(options.pollIntervalMs);
  }
}

type MaintenanceAttempt =
  | { kind: "retry" }
  | { kind: "complete"; result: PublisherRunResult };

async function attemptMaintenancePublish(
  port: MaintenancePublisherPort,
  preparation: MaintenancePreparation,
  options: { deadlineMs: number; pollIntervalMs: number },
  stickyFailure: boolean,
  receipts: OperationReceipt[],
  decisionReasons: string[],
): Promise<MaintenanceAttempt> {
  const currentMainSha = await port.currentMainSha();
  if (currentMainSha !== preparation.cutoffSha) {
    const result =
      port.nowMs() >= options.deadlineMs
        ? failedRun("timeout", stickyFailure, receipts, ["main advanced while preparing maintenance output"])
        : null;
    return result === null ? { kind: "retry" } : { kind: "complete", result };
  }
  const published = await port.publish(preparation);
  receipts.push(...published.receipts);
  if (published.kind === "retry") {
    const result =
      port.nowMs() >= options.deadlineMs
        ? failedRun("timeout", stickyFailure, receipts, ["maintenance branch lease did not converge"])
        : null;
    return result === null ? { kind: "retry" } : { kind: "complete", result };
  }
  if (published.kind === "rejected") {
    return {
      kind: "complete",
      result: failedRun("publish-rejected", stickyFailure, receipts, [published.problem]),
    };
  }
  const mergeReceipt = await port.enableAutoMerge(published.url);
  receipts.push(mergeReceipt);
  if (mergeReceipt.status === "rejected") {
    return {
      kind: "complete",
      result: failedRun("auto-merge-rejected", stickyFailure, receipts, [mergeReceipt.detail ?? published.url]),
    };
  }
  return {
    kind: "complete",
    result: await waitForMaintenancePostcondition(
      port,
      preparation.cutoffSha,
      options,
      stickyFailure,
      receipts,
      decisionReasons,
    ),
  };
}

function requiresMaintenanceCleanup(action: string): boolean {
  return action === "cleanup-no-diff" || action === "recover";
}

export async function runMaintenancePublisher(
  port: MaintenancePublisherPort,
  options: { deadlineMs: number; pollIntervalMs: number },
): Promise<PublisherRunResult> {
  const receipts: OperationReceipt[] = [];
  let stickyFailure = false;
  let preparation = await port.prepare();

  while (port.nowMs() < options.deadlineMs) {
    const decision = decideMaintenancePublication(preparation.inventory);
    stickyFailure ||= decision.stickyFailure;
    if (decision.action === "fail-closed") {
      return failedRun("fail-closed", stickyFailure, receipts, decision.reasons);
    }
    if (requiresMaintenanceCleanup(decision.action)) {
      const cleanupReceipts = await port.cleanup(preparation.inventory);
      receipts.push(...cleanupReceipts);
      const cleanupProblems = rejectedReceiptProblems(cleanupReceipts);
      if (cleanupProblems.length > 0) return failedRun("cleanup-rejected", true, receipts, cleanupProblems);
      await port.sleep(options.pollIntervalMs);
      preparation = await port.prepare();
      continue;
    }
    if (decision.action === "no-op") {
      const problems = maintenancePostconditionProblems(preparation.inventory);
      if (problems.length > 0) return failedRun("postcondition-failed", stickyFailure, receipts, problems);
      return successfulRun(stickyFailure, receipts, decision.reasons);
    }
    const attempt = await attemptMaintenancePublish(
      port,
      preparation,
      options,
      stickyFailure,
      receipts,
      decision.reasons,
    );
    if (attempt.kind === "retry") {
      await port.sleep(options.pollIntervalMs);
      preparation = await port.prepare();
      continue;
    }
    return attempt.result;
  }
  return failedRun("timeout", stickyFailure, receipts, ["maintenance publication did not converge before deadline"]);
}
