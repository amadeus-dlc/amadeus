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
  resolveElectionDir,
  type ElectionRegistryEntry,
} from "./amadeus-election-store";
import { handleVerify } from "./amadeus-election";
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
  approvalProvenance: string | null;
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

export type FidelityResult = {
  ok: boolean;
  baselineVerified: string[];
  verified: string[];
  resolutionFailures: string[];
  verificationFailures: string[];
  registryRows: number;
  directories: number;
  directPathReferences: string[];
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
  if (
    input.approvalProvenance === null ||
    !/^agmsg:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      input.approvalProvenance,
    )
  ) {
    failures.push("approval provenance is missing or invalid");
  }
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

export function readCandidates(
  projectDir: string,
  root: string,
  gitLog: (projectDir: string, args: string[]) => string | null = git,
): MigrationCandidate[] {
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
      const commits =
        timelineInstants.length === 0
          ? gitLog(projectDir, [
              "log",
              "--diff-filter=A",
              "--format=%aI",
              "--reverse",
              "--",
              path,
            ])
          : null;
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
  fidelityRecordPath: string;
};

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    projectDir: process.cwd(),
    space: "default",
    planPath: "",
    approvalPath: null,
    execute: false,
    removalIssueExists: false,
    fidelityRecordPath: "",
  };
  const valueFlags: Record<string, keyof CliOptions> = {
    "--project-dir": "projectDir",
    "--space": "space",
    "--plan": "planPath",
    "--approval": "approvalPath",
    "--fidelity-record": "fidelityRecordPath",
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--execute") {
      options.execute = true;
      continue;
    }
    if (arg === "--removal-issue-exists") {
      options.removalIssueExists = true;
      continue;
    }
    const key = valueFlags[arg];
    if (key === undefined || args[i + 1] === undefined) throw new Error(`unknown argument: ${arg}`);
    Object.assign(options, { [key]: args[++i] });
  }
  if (options.planPath === "") options.planPath = join(options.projectDir, "approved-plan.json");
  if (options.fidelityRecordPath === "") {
    options.fidelityRecordPath = join(options.projectDir, "fidelity-record.md");
  }
  return options;
}

type ApprovalRecord = {
  userApproval: "pending" | "granted";
  approvedPlanSha256: string;
  removalIssueRef: string;
  provenance: string;
};

function readApproval(path: string | null): ApprovalRecord | null {
  if (path === null || !existsSync(path)) return null;
  const text = readFileSync(path, "utf8");
  const hash = text.match(/^approved-plan-sha256:\s*([a-f0-9]{64})\s*$/im)?.[1];
  const issue = text.match(/^removal-issue:\s*(https:\/\/github\.com\/\S+\/issues\/\d+)\s*$/im)?.[1];
  const granted = /^user-approval:\s*granted\s*$/im.test(text);
  const provenance = text.match(
    /^approval-provenance:\s*(agmsg:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)\s*$/im,
  )?.[1];
  return hash !== undefined && issue !== undefined && provenance !== undefined
    ? {
        userApproval: granted ? "granted" : "pending",
        approvedPlanSha256: hash,
        removalIssueRef: issue,
        provenance,
      }
    : null;
}

export function applyPlan(root: string, plan: MigrationPlan): void {
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

function walkFiles(root: string, relativeDir = ""): string[] {
  const dir = join(root, relativeDir);
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(relativeDir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(root, child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

export function inventoryDirectPathReferences(
  projectDir: string,
  plan: MigrationPlan,
): string[] {
  const oldNames = new Set(plan.renames.map((entry) => entry.from));
  const roots = ["docs", "amadeus"];
  const references: string[] = [];
  for (const rootName of roots) {
    const root = join(projectDir, rootName);
    for (const file of walkFiles(root)) {
      if (!/\.(?:md|json|yaml|yml|txt)$/.test(file)) continue;
      const path = join(root, file);
      const text = readFileSync(path, "utf8");
      for (const name of oldNames) {
        if (text.includes(`elections/${name}`)) references.push(`${join(rootName, file)}: elections/${name}`);
      }
    }
  }
  return references.sort();
}

export function verifyFidelity(
  projectDir: string,
  root: string,
  plan: MigrationPlan,
  baselineVerified: string[],
  verify: (root: string, electionId: string) => number = handleVerify,
): FidelityResult {
  const registry = readElectionsRegistry(root);
  if (registry.kind !== "ok") {
    return {
      ok: false,
      baselineVerified,
      verified: [],
      resolutionFailures: [`registry ${registry.kind}`],
      verificationFailures: [],
      registryRows: 0,
      directories: 0,
      directPathReferences: inventoryDirectPathReferences(projectDir, plan),
    };
  }
  const directories = readdirSync(root, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  ).length;
  const resolutionFailures: string[] = [];
  const verificationFailures: string[] = [];
  const verified: string[] = [];
  for (const row of registry.entries) {
    try {
      const resolved = resolveElectionDir(root, row.electionId);
      if (resolved.kind !== "registry" || !existsSync(resolved.dir)) {
        resolutionFailures.push(row.electionId);
        continue;
      }
    } catch {
      resolutionFailures.push(row.electionId);
      continue;
    }
    if (verify(root, row.electionId) !== 0) verificationFailures.push(row.electionId);
    else verified.push(row.electionId);
  }
  verified.sort();
  const ok =
    resolutionFailures.length === 0 &&
    verificationFailures.length === 0 &&
    registry.entries.length === directories &&
    registry.entries.length === plan.registry.length &&
    baselineVerified.length === verified.length &&
    baselineVerified.every((electionId, index) => electionId === verified[index]);
  return {
    ok,
    baselineVerified,
    verified,
    resolutionFailures,
    verificationFailures,
    registryRows: registry.entries.length,
    directories,
    directPathReferences: inventoryDirectPathReferences(projectDir, plan),
  };
}

export function verifyBeforeMigration(
  root: string,
  plan: MigrationPlan,
  verify: (root: string, electionId: string) => number = handleVerify,
): string[] {
  return plan.registry
    .map((entry) => entry.electionId)
    .sort()
    .filter((electionId) => verify(root, electionId) === 0);
}

function renderFidelity(result: FidelityResult, planHash: string): string {
  return [
    "# Elections Migration Fidelity Record",
    "",
    `- Result: ${result.ok ? "PASS" : "FAIL"}`,
    `- Approved plan SHA-256: \`${planHash}\``,
    `- Registry rows: ${result.registryRows}`,
    `- Physical directories: ${result.directories}`,
    `- Independent verify baseline passed: ${result.baselineVerified.length}`,
    `- Resolver + independent verify passed: ${result.verified.length}`,
    `- Resolution failures: ${result.resolutionFailures.length}`,
    `- Verification failures: ${result.verificationFailures.length}`,
    `- Direct-path references requiring owner review: ${result.directPathReferences.length}`,
    "",
    "## Direct-path reference inventory",
    "",
    ...(result.directPathReferences.length > 0 ? result.directPathReferences.map((item) => `- ${item}`) : ["- None"]),
    "",
  ].join("\n");
}

function runDryRun(options: CliOptions, root: string): number {
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

function runExecute(options: CliOptions, root: string): number {
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
    approvalProvenance: approval?.provenance ?? null,
  });
  if (plan.conflicts.length > 0) report.failures.push("approved plan contains conflicts");
  if (!report.ok || plan.conflicts.length > 0) {
    throw new Error(`--execute refused: ${report.failures.join("; ")}`);
  }
  const baselineVerified = verifyBeforeMigration(root, plan);
  if (baselineVerified.length !== plan.registry.length) {
    throw new Error("pre-execute independent verification failed");
  }
  applyPlan(root, plan);
  const fidelity = verifyFidelity(options.projectDir, root, plan, baselineVerified);
  writeFileSync(options.fidelityRecordPath, renderFidelity(fidelity, sha256(planBytes)));
  if (!fidelity.ok) throw new Error("post-execute fidelity verification failed");
  return 0;
}

export function main(args = process.argv.slice(2)): number {
  const options = parseArgs(args);
  const root = electionsRoot(options.projectDir, options.space);
  return options.execute ? runExecute(options, root) : runDryRun(options, root);
}

if (import.meta.main) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
