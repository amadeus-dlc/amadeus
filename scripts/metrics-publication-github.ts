import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  MAINTENANCE_BRANCH,
  MAINTENANCE_MARKER,
  SNAPSHOT_MARKER_PREFIX,
  type ChangedFile,
  type LandedSnapshot,
  type MaintenanceInventory,
  type MaintenancePreparation,
  type MaintenancePublisherPort,
  type MaintenancePublishResult,
  type OperationReceipt,
  type PublicationBranch,
  type PublicationPullRequest,
  type SnapshotInventory,
  type SnapshotPublisherPort,
  isFullSha,
  parseMaintenanceCandidate,
  parseSnapshotCandidate,
} from "./metrics-publication-domain.ts";
import { parseSnapshot } from "./metrics-timeseries.ts";

type JsonRecord = Record<string, unknown>;

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

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${field} is missing or is not an integer`);
  }
  return value;
}

function snapshotBranchTarget(branch: string): string | null {
  const current = /^metrics\/snapshot-([0-9a-f]{40})$/.exec(branch);
  if (current) return current[1];
  return /^metrics\/snapshot-([0-9a-f]{12})-[1-9][0-9]*$/.exec(branch)?.[1] ?? null;
}

export type CommandOutput = { stdout: string; stderr: string };
export type CommandRunner = {
  run(command: string[], options?: { cwd?: string }): CommandOutput;
};

export const systemCommandRunner: CommandRunner = {
  run(command, options = {}) {
    const result = spawnSync(command[0], command.slice(1), {
      cwd: options.cwd,
      encoding: "utf8",
      env: process.env,
    });
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || `${command[0]} exited ${result.status}`).trim();
      throw new Error(`${command.join(" ")}: ${detail}`);
    }
    return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  },
};

type SnapshotCliContext = {
  repoRoot: string;
  repository: string;
  botLogin: string;
  targetSha: string;
  runner: CommandRunner;
};

function parseJsonOutput(output: string, source: string): unknown {
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`${source} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function command(context: SnapshotCliContext, args: string[]): string {
  return context.runner.run(args, { cwd: context.repoRoot }).stdout;
}

function readGitFile(context: SnapshotCliContext, revision: string, path: string): string {
  return command(context, ["git", "show", `${revision}:${path}`]);
}

function parseNameStatus(output: string): ChangedFile[] {
  if (output.trim() === "") return [];
  return output.split("\n").map((line) => {
    const [status, path] = line.split("\t");
    if (!path || !["A", "M", "D"].includes(status)) throw new Error(`unsupported git diff entry: ${line}`);
    return { path, status: status as ChangedFile["status"] };
  });
}

function listRemoteBranches(context: SnapshotCliContext, pattern: string): Array<{ name: string; oid: string }> {
  const output = command(context, ["git", "ls-remote", "--heads", "origin", `refs/heads/${pattern}`]);
  if (output === "") return [];
  return output.split("\n").map((line) => {
    const [oid, ref] = line.split(/\s+/);
    if (!isFullSha(oid) || !ref?.startsWith("refs/heads/")) throw new Error(`invalid ls-remote entry: ${line}`);
    return { name: ref.slice("refs/heads/".length), oid };
  });
}

function loadRemoteBranch(
  context: SnapshotCliContext,
  remote: { name: string; oid: string },
  mode: "snapshot" | "maintenance",
): JsonRecord {
  command(context, [
    "git",
    "fetch",
    "--no-tags",
    "origin",
    `+refs/heads/${remote.name}:refs/remotes/origin/${remote.name}`,
  ]);
  const files = parseNameStatus(
    command(context, ["git", "diff", "--no-renames", "--name-status", "origin/main", remote.oid, "--", "metrics/"]),
  ).map((file) => ({
    ...file,
    text: mode === "snapshot" && file.status !== "D" ? readGitFile(context, remote.oid, file.path) : undefined,
  }));
  return {
    name: remote.name,
    oid: remote.oid,
    tipAuthor: command(context, ["git", "show", "-s", "--format=%an", remote.oid]),
    files,
  };
}

function loadLandedSnapshots(context: SnapshotCliContext): { landed: LandedSnapshot[]; problems: string[] } {
  const files = command(context, ["git", "ls-tree", "-r", "--name-only", "origin/main", "--", "metrics/"])
    .split("\n")
    .filter((file) => file.endsWith(".json"));
  const landed: LandedSnapshot[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const parsed = parseSnapshot(readGitFile(context, "origin/main", file), file);
    if (parsed.kind === "error") {
      problems.push(`${file}: ${parsed.reason}`);
      continue;
    }
    if (!isFullSha(parsed.snapshot.commit)) {
      problems.push(`${file}: commit is not a lowercase full SHA`);
      continue;
    }
    if (!file.includes(parsed.snapshot.commit.slice(0, 12))) {
      problems.push(`${file}: filename prefix does not match commit`);
      continue;
    }
    if (parsed.snapshot.commit === context.targetSha) landed.push({ path: file, sha: parsed.snapshot.commit });
  }
  return { landed, problems };
}

function listRawPullRequests(context: SnapshotCliContext, headBranches: string[]): unknown[] {
  const pullRequests = new Map<number, unknown>();
  for (const headBranch of [...new Set(headBranches)]) {
    const raw = parseJsonOutput(
      command(context, [
        "gh",
        "pr",
        "list",
        "--state",
        "all",
        "--head",
        headBranch,
        "--limit",
        "10000",
        "--json",
        "number,url,state,mergeStateStatus,mergedAt,headRefName,headRefOid,headRepository,author,title,body,files",
      ]),
      `gh pr list --head ${headBranch}`,
    );
    if (!Array.isArray(raw)) throw new Error(`gh pr list --head ${headBranch} result is not an array`);
    for (const value of raw) {
      const record = requireRecord(value, "pull request");
      pullRequests.set(requireNumber(record.number, "pull request.number"), value);
    }
  }
  return [...pullRequests.values()];
}

function isUnmergedPullRequest(value: JsonRecord, hasRemoteBranch: boolean): boolean {
  if (value.mergedAt !== null && value.mergedAt !== undefined) return false;
  return String(value.state).toUpperCase() !== "CLOSED" || hasRemoteBranch;
}

function snapshotPullRequestIsRelevant(
  value: unknown,
  targetSha: string,
  branches: Set<string>,
): value is JsonRecord {
  if (!isRecord(value) || typeof value.headRefName !== "string") return false;
  const branchTarget = snapshotBranchTarget(value.headRefName);
  const matchesTarget = branchTarget !== null && targetSha.startsWith(branchTarget);
  return matchesTarget && isUnmergedPullRequest(value, branches.has(value.headRefName));
}

function snapshotPullRequestFiles(context: SnapshotCliContext, value: JsonRecord): ChangedFile[] {
  const repository = isRecord(value.headRepository) ? value.headRepository.nameWithOwner : undefined;
  const rawFiles = Array.isArray(value.files) ? value.files : [];
  return rawFiles.map((rawFile) => {
    const file = requireRecord(rawFile, "pull request file");
    const path = requireString(file.path, "pull request file.path");
    const canReadText = repository === context.repository && path.endsWith(".json");
    return {
      path,
      additions: requireNumber(file.additions, "pull request file.additions"),
      deletions: requireNumber(file.deletions, "pull request file.deletions"),
      text: canReadText ? readGitFile(context, requireString(value.headRefOid, "headRefOid"), path) : undefined,
    };
  });
}

function loadSnapshotPullRequests(
  context: SnapshotCliContext,
  remoteBranches: Array<{ name: string; oid: string }>,
): { pullRequests: PublicationPullRequest[]; problems: string[] } {
  const branches = new Set(remoteBranches.map((branch) => branch.name));
  const pullRequests: PublicationPullRequest[] = [];
  const problems: string[] = [];
  const canonicalBranch = `metrics/snapshot-${context.targetSha}`;
  for (const value of listRawPullRequests(context, [canonicalBranch, ...remoteBranches.map((branch) => branch.name)])) {
    if (!snapshotPullRequestIsRelevant(value, context.targetSha, branches)) continue;
    try {
      const files = snapshotPullRequestFiles(context, value);
      pullRequests.push(parseSnapshotCandidate({ ...value, files }, context) as PublicationPullRequest);
    } catch (error) {
      problems.push(`PR ${String(value.url ?? value.number ?? "?")}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pullRequests, problems };
}

function maintenancePullRequestIsRelevant(value: unknown, hasRemoteBranch: boolean): value is JsonRecord {
  return (
    isRecord(value) &&
    value.headRefName === MAINTENANCE_BRANCH &&
    isUnmergedPullRequest(value, hasRemoteBranch)
  );
}

function loadMaintenancePullRequests(
  context: SnapshotCliContext,
  hasRemoteBranch: boolean,
): { pullRequests: PublicationPullRequest[]; problems: string[] } {
  const pullRequests: PublicationPullRequest[] = [];
  const problems: string[] = [];
  for (const value of listRawPullRequests(context, [MAINTENANCE_BRANCH])) {
    if (!maintenancePullRequestIsRelevant(value, hasRemoteBranch)) continue;
    try {
      pullRequests.push(
        parseMaintenanceCandidate(value, {
          repository: context.repository,
          botLogin: context.botLogin,
        }) as PublicationPullRequest,
      );
    } catch (error) {
      problems.push(`PR ${String(value.url ?? value.number ?? "?")}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pullRequests, problems };
}

function maintenanceWorkingDiff(context: SnapshotCliContext): ChangedFile[] {
  return parseNameStatus(command(context, ["git", "diff", "--no-renames", "--name-status", "--", "metrics/"]));
}

function assertMaintenanceDiff(files: ChangedFile[]): void {
  for (const file of files) {
    if (file.path === "metrics/index.html" && file.status === "M") continue;
    if (file.path.startsWith("metrics/") && file.path.endsWith(".json") && file.status === "D") continue;
    throw new Error(`maintenance attempted an unowned change: ${file.status ?? "?"} ${file.path}`);
  }
}

function cutoffMaintenanceHasDiff(context: SnapshotCliContext, cutoffSha: string): boolean {
  try {
    command(context, ["git", "restore", "--staged", "--worktree", `--source=${cutoffSha}`, "--", "metrics/"]);
    command(context, ["git", "switch", "--detach", cutoffSha]);
    const cutoffJson = command(context, ["git", "ls-tree", "-r", "--name-only", cutoffSha, "--", "metrics/"])
      .split("\n")
      .filter((path) => path.endsWith(".json"));
    command(context, ["bun", "scripts/metrics-retention.ts", "--apply"]);
    command(context, ["bun", "scripts/metrics-visualize.ts", "--write"]);
    const expectedJson = new Set(
      readdirSync(join(context.repoRoot, "metrics"))
        .filter((name) => name.endsWith(".json"))
        .map((name) => `metrics/${name}`),
    );
    const expectedIndexOid = command(context, ["git", "hash-object", "--", "metrics/index.html"]);
    const mainIndexOid = command(context, ["git", "rev-parse", "origin/main:metrics/index.html"]);
    if (mainIndexOid !== expectedIndexOid) return true;
    for (const path of cutoffJson) {
      if (expectedJson.has(path)) {
        const expectedOid = command(context, ["git", "hash-object", "--", path]);
        const mainOid = command(context, ["git", "rev-parse", `origin/main:${path}`]);
        if (mainOid !== expectedOid) return true;
        continue;
      }
      try {
        readGitFile(context, "origin/main", path);
        return true;
      } catch {
        // A cutoff snapshot selected for pruning must be absent from main.
      }
    }
    return false;
  } finally {
    command(context, ["git", "restore", "--staged", "--worktree", "--source=origin/main", "--", "metrics/"]);
    command(context, ["git", "switch", "--detach", "origin/main"]);
  }
}

export class SnapshotCliPort implements SnapshotPublisherPort {
  readonly #context: SnapshotCliContext;

  constructor(context: SnapshotCliContext) {
    this.#context = context;
  }

  async inventory(): Promise<SnapshotInventory> {
    command(this.#context, ["git", "fetch", "--no-tags", "origin", "main"]);
    const remotes = listRemoteBranches(this.#context, `metrics/snapshot-${this.#context.targetSha.slice(0, 12)}*`).filter(
      (branch) => snapshotBranchTarget(branch.name) !== null && this.#context.targetSha.startsWith(snapshotBranchTarget(branch.name) ?? "!"),
    );
    const branches: PublicationBranch[] = [];
    const problems: string[] = [];
    for (const remote of remotes) {
      try {
        branches.push(parseSnapshotCandidate(loadRemoteBranch(this.#context, remote, "snapshot"), {
          repository: this.#context.repository,
          botLogin: this.#context.botLogin,
          targetSha: this.#context.targetSha,
        }) as PublicationBranch);
      } catch (error) {
        problems.push(`${remote.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const landed = loadLandedSnapshots(this.#context);
    const pullRequests = loadSnapshotPullRequests(this.#context, remotes);
    return {
      targetSha: this.#context.targetSha,
      landed: landed.landed,
      pullRequests: pullRequests.pullRequests,
      branches,
      problems: [...problems, ...landed.problems, ...pullRequests.problems],
    };
  }

  async cleanup(inventory: SnapshotInventory): Promise<OperationReceipt[]> {
    const receipts: OperationReceipt[] = [];
    for (const pullRequest of inventory.pullRequests) {
      if (pullRequest.state !== "open") continue;
      try {
        command(this.#context, ["gh", "pr", "close", pullRequest.url]);
        receipts.push({ operation: "close-pr", target: pullRequest.url, status: "accepted" });
      } catch (error) {
        receipts.push({ operation: "close-pr", target: pullRequest.url, status: "rejected", detail: String(error) });
      }
    }
    for (const branch of inventory.branches) {
      try {
        const observed = listRemoteBranches(this.#context, branch.name)[0]?.oid;
        if (observed !== branch.oid) throw new Error(`lease changed from ${branch.oid} to ${observed ?? "absent"}`);
        command(this.#context, [
          "git",
          "push",
          `--force-with-lease=refs/heads/${branch.name}:${branch.oid}`,
          "origin",
          `:refs/heads/${branch.name}`,
        ]);
        receipts.push({ operation: "delete-branch", target: branch.name, status: "accepted" });
      } catch (error) {
        receipts.push({ operation: "delete-branch", target: branch.name, status: "rejected", detail: String(error) });
      }
    }
    return receipts;
  }

  async create(): Promise<{ url: string; receipts: OperationReceipt[] }> {
    command(this.#context, ["git", "cat-file", "-e", `${this.#context.targetSha}^{commit}`]);
    command(this.#context, ["git", "switch", "--detach", this.#context.targetSha]);
    command(this.#context, ["bun", "scripts/metrics-snapshot.ts", "--write"]);
    const untracked = command(this.#context, ["git", "status", "--porcelain", "--", "metrics/"])
      .split("\n")
      .filter(Boolean);
    if (untracked.length !== 1 || !untracked[0].startsWith("?? metrics/") || !untracked[0].endsWith(".json")) {
      throw new Error(`snapshot writer must create exactly one JSON file, observed: ${untracked.join(", ")}`);
    }
    const path = untracked[0].slice(3);
    const parsed = parseSnapshot(readFileSync(join(this.#context.repoRoot, path), "utf8"), path);
    if (parsed.kind === "error" || parsed.snapshot.commit !== this.#context.targetSha) {
      throw new Error(`generated snapshot does not represent ${this.#context.targetSha}`);
    }
    command(this.#context, ["git", "switch", "--detach", "origin/main"]);
    command(this.#context, ["git", "add", "--", path]);
    const staged = parseNameStatus(command(this.#context, ["git", "diff", "--cached", "--name-status", "--", "metrics/"]));
    if (staged.length !== 1 || staged[0].status !== "A" || staged[0].path !== path) {
      throw new Error(`snapshot change set is not one JSON addition: ${JSON.stringify(staged)}`);
    }
    command(this.#context, ["git", "commit", "-m", `chore(metrics): record snapshot ${this.#context.targetSha}`]);
    const branch = `metrics/snapshot-${this.#context.targetSha}`;
    command(this.#context, [
      "git",
      "push",
      `--force-with-lease=refs/heads/${branch}:`,
      "origin",
      `HEAD:refs/heads/${branch}`,
    ]);
    const marker = `${SNAPSHOT_MARKER_PREFIX}${this.#context.targetSha} -->`;
    const url = command(this.#context, [
      "gh",
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      branch,
      "--title",
      `[amadeus:metrics-snapshot:v1] ${this.#context.targetSha}`,
      "--body",
      `${marker}\nAutomated immutable metrics snapshot for ${this.#context.targetSha}.`,
    ]);
    return {
      url,
      receipts: [
        { operation: "push-branch", target: branch, status: "accepted" },
        { operation: "create-pr", target: url, status: "accepted" },
      ],
    };
  }

  async enableAutoMerge(url: string): Promise<OperationReceipt> {
    try {
      command(this.#context, ["gh", "pr", "merge", "--auto", "--squash", "--delete-branch", url]);
      return { operation: "auto-merge", target: url, status: "accepted" };
    } catch (error) {
      return { operation: "auto-merge", target: url, status: "rejected", detail: String(error) };
    }
  }

  async dispatchMaintenance(): Promise<OperationReceipt> {
    try {
      command(this.#context, [
        "gh",
        "api",
        "--method",
        "POST",
        `repos/${this.#context.repository}/dispatches`,
        "-f",
        "event_type=metrics-maintenance",
        "-f",
        `client_payload[target_sha]=${this.#context.targetSha}`,
      ]);
      return { operation: "dispatch", target: "metrics-maintenance", status: "accepted" };
    } catch (error) {
      return { operation: "dispatch", target: "metrics-maintenance", status: "rejected", detail: String(error) };
    }
  }

  nowMs(): number {
    return Date.now();
  }

  async sleep(milliseconds: number): Promise<void> {
    await Bun.sleep(milliseconds);
  }
}

export class MaintenanceCliPort implements MaintenancePublisherPort {
  readonly #context: SnapshotCliContext;

  constructor(context: Omit<SnapshotCliContext, "targetSha">) {
    this.#context = { ...context, targetSha: "0".repeat(40) };
  }

  async #candidateInventory(hasDiff: boolean): Promise<MaintenanceInventory> {
    const remotes = listRemoteBranches(this.#context, MAINTENANCE_BRANCH);
    const branches: PublicationBranch[] = [];
    const problems: string[] = [];
    for (const remote of remotes) {
      try {
        branches.push(
          parseMaintenanceCandidate(loadRemoteBranch(this.#context, remote, "maintenance"), {
            repository: this.#context.repository,
            botLogin: this.#context.botLogin,
          }) as PublicationBranch,
        );
      } catch (error) {
        problems.push(`${remote.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const pullRequests = loadMaintenancePullRequests(this.#context, remotes.length > 0);
    return {
      hasDiff,
      pullRequests: pullRequests.pullRequests,
      branches,
      problems: [...problems, ...pullRequests.problems],
    };
  }

  async prepare(): Promise<MaintenancePreparation> {
    command(this.#context, ["git", "fetch", "--no-tags", "origin", "main"]);
    const cutoffSha = command(this.#context, ["git", "rev-parse", "origin/main"]);
    command(this.#context, ["git", "restore", "--staged", "--worktree", "--source=origin/main", "--", "metrics/"]);
    command(this.#context, ["git", "switch", "--detach", "origin/main"]);
    command(this.#context, ["bun", "scripts/metrics-retention.ts", "--apply"]);
    command(this.#context, ["bun", "scripts/metrics-visualize.ts", "--write"]);
    const files = maintenanceWorkingDiff(this.#context);
    assertMaintenanceDiff(files);
    return { cutoffSha, inventory: await this.#candidateInventory(files.length > 0) };
  }

  async currentMainSha(): Promise<string> {
    command(this.#context, ["git", "fetch", "--no-tags", "origin", "main"]);
    return command(this.#context, ["git", "rev-parse", "origin/main"]);
  }

  async cleanup(inventory: MaintenanceInventory): Promise<OperationReceipt[]> {
    const receipts: OperationReceipt[] = [];
    for (const pullRequest of inventory.pullRequests) {
      if (pullRequest.state !== "open") continue;
      try {
        command(this.#context, ["gh", "pr", "close", pullRequest.url]);
        receipts.push({ operation: "close-pr", target: pullRequest.url, status: "accepted" });
      } catch (error) {
        receipts.push({ operation: "close-pr", target: pullRequest.url, status: "rejected", detail: String(error) });
      }
    }
    for (const branch of inventory.branches) {
      try {
        const observed = listRemoteBranches(this.#context, branch.name)[0]?.oid;
        if (observed !== branch.oid) throw new Error(`lease changed from ${branch.oid} to ${observed ?? "absent"}`);
        command(this.#context, [
          "git",
          "push",
          `--force-with-lease=refs/heads/${branch.name}:${branch.oid}`,
          "origin",
          `:refs/heads/${branch.name}`,
        ]);
        receipts.push({ operation: "delete-branch", target: branch.name, status: "accepted" });
      } catch (error) {
        receipts.push({ operation: "delete-branch", target: branch.name, status: "rejected", detail: String(error) });
      }
    }
    return receipts;
  }

  async publish(preparation: MaintenancePreparation): Promise<MaintenancePublishResult> {
    const observedBranch = preparation.inventory.branches[0];
    const currentRemote = listRemoteBranches(this.#context, MAINTENANCE_BRANCH)[0];
    if (observedBranch?.oid !== currentRemote?.oid) {
      if (observedBranch !== undefined || currentRemote !== undefined) {
        return {
          kind: "retry",
          receipts: [
            {
              operation: "push-branch",
              target: MAINTENANCE_BRANCH,
              status: "rejected",
              detail: `lease changed from ${observedBranch?.oid ?? "absent"} to ${currentRemote?.oid ?? "absent"}`,
            },
          ],
        };
      }
    }
    const files = maintenanceWorkingDiff(this.#context);
    assertMaintenanceDiff(files);
    if (files.length === 0) {
      return { kind: "rejected", receipts: [], problem: "maintenance publish requested with no diff" };
    }
    command(this.#context, ["git", "add", "-A", "--", "metrics/"]);
    command(this.#context, ["git", "commit", "-m", `chore(metrics): maintain snapshots at ${preparation.cutoffSha}`]);
    const push = [
      "git",
      "push",
      ...(observedBranch
        ? [`--force-with-lease=refs/heads/${MAINTENANCE_BRANCH}:${observedBranch.oid}`]
        : [`--force-with-lease=refs/heads/${MAINTENANCE_BRANCH}:`]),
      "origin",
      `HEAD:refs/heads/${MAINTENANCE_BRANCH}`,
    ];
    try {
      command(this.#context, push);
    } catch (error) {
      return {
        kind: "retry",
        receipts: [{ operation: "push-branch", target: MAINTENANCE_BRANCH, status: "rejected", detail: String(error) }],
      };
    }
    const existing = preparation.inventory.pullRequests.find((pullRequest) => pullRequest.state === "open");
    const url =
      existing?.url ??
      command(this.#context, [
        "gh",
        "pr",
        "create",
        "--base",
        "main",
        "--head",
        MAINTENANCE_BRANCH,
        "--title",
        "[amadeus:metrics-maintenance:v1] Rebuild metrics index",
        "--body",
        `${MAINTENANCE_MARKER}\nAutomated deterministic retention and metrics index maintenance.`,
      ]);
    return {
      kind: "published",
      url,
      receipts: [
        { operation: "push-branch", target: MAINTENANCE_BRANCH, status: "accepted" },
        ...(existing ? [] : [{ operation: "create-pr", target: url, status: "accepted" as const }]),
      ],
    };
  }

  async enableAutoMerge(url: string): Promise<OperationReceipt> {
    try {
      command(this.#context, ["gh", "pr", "merge", "--auto", "--squash", "--delete-branch", url]);
      return { operation: "auto-merge", target: url, status: "accepted" };
    } catch (error) {
      return { operation: "auto-merge", target: url, status: "rejected", detail: String(error) };
    }
  }

  async reconcile(cutoffSha: string): Promise<{ mainSha: string; inventory: MaintenanceInventory }> {
    command(this.#context, ["git", "fetch", "--no-tags", "origin", "main"]);
    const mainSha = command(this.#context, ["git", "rev-parse", "origin/main"]);
    const hasDiff = cutoffMaintenanceHasDiff(this.#context, cutoffSha);
    return { mainSha, inventory: await this.#candidateInventory(hasDiff) };
  }

  nowMs(): number {
    return Date.now();
  }

  async sleep(milliseconds: number): Promise<void> {
    await Bun.sleep(milliseconds);
  }
}
