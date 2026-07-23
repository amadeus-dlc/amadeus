// amadeus-election-migrate.ts — deterministic elections migration planner.
//
// Dry-run is the default and the only mode that creates an approved-plan
// candidate. Execution additionally requires a separately authored approval
// record whose SHA-256 binds it to those exact plan bytes.

import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import {
  appendElectionToRegistry,
  electionsRoot,
  mintElectionDirName,
  readElectionsRegistry,
  type ElectionRegistryEntry,
} from "./amadeus-election-store";
import type { ElectionState } from "./amadeus-election-model";

export type CreatedAtSource = "timeline-oldest" | "git-first-commit" | "unknown";

export type MigrationRename = {
  from: string;
  to: string;
  electionId: string;
  createdAt: string;
  createdAtSource: CreatedAtSource;
};

export type MigrationPlan = {
  renames: MigrationRename[];
  registry: ElectionRegistryEntry[];
  conflicts: string[];
  degraded: string[];
  skipped: string[];
};

export type MigrationCandidate = {
  dirName: string;
  electionId: string;
  status: ElectionState;
  timelineInstants: string[];
  gitFirstCommit: string | null;
};

export type ExecutePreconditionInput = {
  fullClone: boolean;
  s2Landed: boolean;
  statuses: ElectionState[];
  removalIssueRef: string | null;
  removalIssueExists: boolean;
  userApproval: "pending" | "granted";
  expectedPlanHash: string | null;
  actualPlanHash: string;
};

export type ExecutePreconditionReport = {
  fullClone: boolean;
  s2Landed: boolean;
  noCollecting: boolean;
  removalIssueRef: string | null;
  userApproval: "pending" | "granted";
  planHashMatches: boolean;
  ok: boolean;
  failures: string[];
};

function validIso(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function deriveCreatedAt(
  candidate: MigrationCandidate,
  dryRunAt: string,
): { createdAt: string; createdAtSource: CreatedAtSource } {
  const timeline = candidate.timelineInstants.filter(validIso).sort();
  if (timeline.length > 0) {
    return { createdAt: timeline[0], createdAtSource: "timeline-oldest" };
  }
  if (candidate.gitFirstCommit !== null && validIso(candidate.gitFirstCommit)) {
    return { createdAt: candidate.gitFirstCommit, createdAtSource: "git-first-commit" };
  }
  return { createdAt: dryRunAt, createdAtSource: "unknown" };
}

export function planMigration(
  candidates: MigrationCandidate[],
  existingRegistry: ElectionRegistryEntry[],
  dryRunAt: string,
): MigrationPlan {
  if (!validIso(dryRunAt)) throw new Error(`invalid dry-run instant: ${dryRunAt}`);
  const plan: MigrationPlan = {
    renames: [],
    registry: [...existingRegistry],
    conflicts: [],
    degraded: [],
    skipped: [],
  };
  const registryById = new Map(existingRegistry.map((entry) => [entry.electionId, entry]));
  const physicalNames = new Set(candidates.map((candidate) => candidate.dirName));
  const allocatedNames = new Set(existingRegistry.map((entry) => entry.dirName));
  const seenIds = new Set<string>();

  for (const candidate of [...candidates].sort((a, b) => a.electionId.localeCompare(b.electionId))) {
    if (seenIds.has(candidate.electionId)) {
      plan.conflicts.push(`duplicate electionId: ${candidate.electionId}`);
      continue;
    }
    seenIds.add(candidate.electionId);
    const existing = registryById.get(candidate.electionId);
    if (existing !== undefined) {
      if (existing.dirName === candidate.dirName) plan.skipped.push(candidate.electionId);
      else {
        plan.conflicts.push(
          `registry mismatch: ${candidate.electionId} maps to ${existing.dirName}, found ${candidate.dirName}`,
        );
      }
      continue;
    }

    const { createdAt, createdAtSource } = deriveCreatedAt(candidate, dryRunAt);
    if (createdAtSource === "unknown") plan.degraded.push(candidate.electionId);

    const unavailable = new Set([...physicalNames, ...allocatedNames]);
    unavailable.delete(candidate.dirName);
    const to = mintElectionDirName(candidate.electionId, createdAt, unavailable);
    if (to !== candidate.dirName && physicalNames.has(to)) {
      plan.conflicts.push(`directory collision: ${candidate.dirName} -> ${to}`);
      continue;
    }
    allocatedNames.add(to);
    const row: ElectionRegistryEntry = {
      electionId: candidate.electionId,
      dirName: to,
      createdAt,
      status: candidate.status,
    };
    plan.renames.push({
      from: candidate.dirName,
      to,
      electionId: candidate.electionId,
      createdAt,
      createdAtSource,
    });
    plan.registry.push(row);
  }
  return plan;
}

export function sha256(bytes: string | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function checkExecutePreconditions(
  input: ExecutePreconditionInput,
): ExecutePreconditionReport {
  const noCollecting = !input.statuses.some(
    (status) => status === "open" || status === "collecting",
  );
  const issueOk =
    input.removalIssueRef !== null &&
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(input.removalIssueRef) &&
    input.removalIssueExists;
  const planHashMatches =
    input.expectedPlanHash !== null && input.expectedPlanHash === input.actualPlanHash;
  const failures: string[] = [];
  if (!input.fullClone) failures.push("repository is shallow");
  if (!input.s2Landed) failures.push("S2 resolver has not landed");
  if (!noCollecting) failures.push("open or collecting elections exist");
  if (!issueOk) failures.push("legacy fallback removal issue is missing or unverified");
  if (input.userApproval !== "granted") failures.push("user approval is not granted");
  if (!planHashMatches) failures.push("approved plan hash does not match");
  return {
    fullClone: input.fullClone,
    s2Landed: input.s2Landed,
    noCollecting,
    removalIssueRef: issueOk ? input.removalIssueRef : null,
    userApproval: input.userApproval,
    planHashMatches,
    ok: failures.length === 0,
    failures,
  };
}

function git(projectDir: string, args: string[]): string | null {
  const result = spawnSync("git", args, { cwd: projectDir, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function readCandidates(projectDir: string, root: string): MigrationCandidate[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(root, entry.name);
      const raw = JSON.parse(readFileSync(join(dir, "election.json"), "utf8")) as Record<
        string,
        unknown
      >;
      if (typeof raw.electionId !== "string" || typeof raw.state !== "string") {
        throw new Error(`invalid election.json: ${entry.name}`);
      }
      let timelineInstants: string[] = [];
      const timelinePath = join(dir, "timeline.json");
      if (existsSync(timelinePath)) {
        const timeline = JSON.parse(readFileSync(timelinePath, "utf8")) as unknown;
        if (Array.isArray(timeline)) {
          timelineInstants = timeline
            .map((event) =>
              typeof event === "object" &&
              event !== null &&
              typeof (event as Record<string, unknown>).at === "string"
                ? ((event as Record<string, unknown>).at as string)
                : null,
            )
            .filter((instant): instant is string => instant !== null);
        }
      }
      const path = relative(projectDir, join(dir, "election.json"));
      const commits = git(projectDir, [
        "log",
        "--diff-filter=A",
        "--format=%aI",
        "--reverse",
        "--",
        path,
      ]);
      return {
        dirName: entry.name,
        electionId: raw.electionId,
        status: raw.state as ElectionState,
        timelineInstants,
        gitFirstCommit: commits?.split("\n").find(Boolean) ?? null,
      };
    });
}

function renderPlan(plan: MigrationPlan): string {
  const lines = [
    `elections: ${plan.renames.length + plan.skipped.length}`,
    `renames: ${plan.renames.length}`,
    `conflicts: ${plan.conflicts.length}`,
    `degraded: ${plan.degraded.length}`,
    "",
    ...plan.renames.map((entry) => `${entry.from} -> ${entry.to}`),
  ];
  if (plan.conflicts.length > 0) lines.push("", ...plan.conflicts.map((item) => `CONFLICT: ${item}`));
  if (plan.degraded.length > 0) lines.push("", ...plan.degraded.map((item) => `DEGRADED: ${item}`));
  return `${lines.join("\n")}\n`;
}

type CliOptions = {
  projectDir: string;
  space: string;
  planPath: string;
  approvalPath: string | null;
  execute: boolean;
  removalIssueExists: boolean;
};

function parseArgs(args: string[]): CliOptions {
  let projectDir = process.cwd();
  let space = "default";
  let planPath = "";
  let approvalPath: string | null = null;
  let execute = false;
  let removalIssueExists = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project-dir") projectDir = args[++i];
    else if (arg === "--space") space = args[++i];
    else if (arg === "--plan") planPath = args[++i];
    else if (arg === "--approval") approvalPath = args[++i];
    else if (arg === "--execute") execute = true;
    else if (arg === "--removal-issue-exists") removalIssueExists = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (planPath === "") planPath = join(projectDir, "approved-plan.json");
  return { projectDir, space, planPath, approvalPath, execute, removalIssueExists };
}

type ApprovalRecord = {
  userApproval: "pending" | "granted";
  approvedPlanSha256: string;
  removalIssueRef: string;
};

function readApproval(path: string | null): ApprovalRecord | null {
  if (path === null || !existsSync(path)) return null;
  const text = readFileSync(path, "utf8");
  const hash = text.match(/^approved-plan-sha256:\s*([a-f0-9]{64})\s*$/im)?.[1];
  const issue = text.match(/^removal-issue:\s*(https:\/\/github\.com\/\S+\/issues\/\d+)\s*$/im)?.[1];
  const granted = /^user-approval:\s*granted\s*$/im.test(text);
  return hash !== undefined && issue !== undefined
    ? { userApproval: granted ? "granted" : "pending", approvedPlanSha256: hash, removalIssueRef: issue }
    : null;
}

function applyPlan(root: string, plan: MigrationPlan): void {
  for (const entry of plan.renames) {
    const from = join(root, entry.from);
    const to = join(root, entry.to);
    if (existsSync(from) && from !== to) renameSync(from, to);
    if (!existsSync(to) || !statSync(to).isDirectory()) {
      throw new Error(`planned directory is missing: ${entry.to}`);
    }
    const appended = appendElectionToRegistry(
      root,
      plan.registry.find((row) => row.electionId === entry.electionId) as ElectionRegistryEntry,
    );
    if (!appended.ok && appended.error !== "duplicate") {
      throw new Error(`registry append failed for ${entry.electionId}: ${appended.error}`);
    }
  }
}

export function main(args = process.argv.slice(2)): number {
  const options = parseArgs(args);
  const root = electionsRoot(options.projectDir, options.space);
  if (!options.execute) {
    const registry = readElectionsRegistry(root);
    if (registry.kind === "corrupt") throw new Error(`elections registry corrupt: ${registry.detail}`);
    const plan = planMigration(
      readCandidates(options.projectDir, root),
      registry.kind === "ok" ? registry.entries : [],
      new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    );
    const bytes = `${JSON.stringify(plan, null, 2)}\n`;
    writeFileSync(options.planPath, bytes);
    process.stdout.write(renderPlan(plan));
    process.stdout.write(`approved-plan-sha256: ${sha256(bytes)}\n`);
    return plan.conflicts.length === 0 ? 0 : 1;
  }

  const planBytes = readFileSync(options.planPath, "utf8");
  const plan = JSON.parse(planBytes) as MigrationPlan;
  const approval = readApproval(options.approvalPath);
  const shallow = git(options.projectDir, ["rev-parse", "--is-shallow-repository"]);
  const storeSource = readFileSync(
    join(options.projectDir, "scripts", "amadeus-election-store.ts"),
    "utf8",
  );
  const report = checkExecutePreconditions({
    fullClone: shallow === "false",
    s2Landed:
      /export function resolveElectionDir\(/.test(storeSource) &&
      !/\bfunction dirOf\(/.test(storeSource),
    statuses: plan.registry.map((entry) => entry.status),
    removalIssueRef: approval?.removalIssueRef ?? null,
    removalIssueExists: options.removalIssueExists,
    userApproval: approval?.userApproval ?? "pending",
    expectedPlanHash: approval?.approvedPlanSha256 ?? null,
    actualPlanHash: sha256(planBytes),
  });
  if (plan.conflicts.length > 0) report.failures.push("approved plan contains conflicts");
  if (!report.ok || plan.conflicts.length > 0) {
    throw new Error(`--execute refused: ${report.failures.join("; ")}`);
  }
  applyPlan(root, plan);
  return 0;
}

if (import.meta.main) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
