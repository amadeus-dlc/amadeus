// amadeus-mirror.ts — mirror-issue CLI for the intent-first filing practice
// (team.md cid:intent-first-mirror-issue). Creates, syncs, and closes the
// GitHub mirror issue of an amadeus intent. The record tree is the source of
// truth; sync is strictly record -> issue (one-way). State is read only from
// deterministic sources (intents.json + amadeus-state.md); the tool never
// writes intents.json (the WORKSPACE-lock contract stays untouched) — its only
// writes are gh calls and the `Mirror Issue` field in amadeus-state.md.
//
// Subcommands: create | sync | close | status (see USAGE). Mutating verbs use
// exit 0 for success, 1 for runtime faults, and 2 for usage. Status uses 0 for
// clean, 1 for divergence, and 2 for precondition or usage errors.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  activeIntent,
  getField,
  type IntentRegistryEntry,
  intentsDir,
  readIntentRegistry,
  recordDirMatches,
  setOrInsertField,
} from "./amadeus-lib";

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));

export function projectDirFromToolsDir(
  toolsDir: string,
  joinPath: (...parts: string[]) => string = join,
): string {
  const normalized = toolsDir.replaceAll("\\", "/").replace(/\/+$/, "");
  return normalized.endsWith("/packages/framework/core/tools")
    ? joinPath(toolsDir, "..", "..", "..", "..")
    : joinPath(toolsDir, "..", "..");
}

const PROJECT_DIR = projectDirFromToolsDir(TOOLS_DIR);

const USAGE =
  [
    "Usage: bun <harness-dir>/tools/amadeus-mirror.ts <create|sync|close|status> [--intent <dirName>]",
    "Operational note: create/close are run by the conductor by team agreement; this is not mechanically enforced (see team.md).",
  ].join("\n");

// --- C1: args-parser -------------------------------------------------------

export type ArgsOutcome =
  | { kind: "create"; intentDir: string | null }
  | { kind: "sync"; intentDir: string | null }
  | { kind: "close"; intentDir: string | null }
  | { kind: "status"; intentDir: string | null }
  | { kind: "usage"; message: string };

export function parseArgs(argv: string[]): ArgsOutcome {
  const [sub, ...rest] = argv;
  if (sub !== "create" && sub !== "sync" && sub !== "close" && sub !== "status") {
    return { kind: "usage", message: USAGE };
  }
  let intentDir: string | null = null;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--intent") {
      const value = rest[i + 1];
      if (value === undefined || value.startsWith("--")) {
        return { kind: "usage", message: USAGE };
      }
      intentDir = value;
      i++;
      continue;
    }
    return { kind: "usage", message: USAGE };
  }
  return { kind: sub, intentDir };
}

// --- C2: state-snapshot ----------------------------------------------------

export type MirrorSnapshot = {
  dirName: string;
  slug: string;
  projectSummary: string;
  recordPath: string;
  phase: string;
  stage: string;
  stagesApproved: number;
  stagesTotal: number;
  parked: boolean;
  parkedAtStage: string | null;
  workflowStatus: string;
  intentStatus: string;
  lastUpdated: string;
  mirrorIssue: number | null;
};

export type SnapshotOutcome =
  | { kind: "ok"; snapshot: MirrorSnapshot }
  | { kind: "error"; message: string };

// Count `- [x]` as approved. Two kinds of skipped stage leave the denominator,
// mirroring the statusline convention: (1) jump-skipped rows carry the `[S]`
// checkbox mark; (2) scope-skipped rows keep a live checkbox (`[ ]`, `[x]`, …)
// but carry a ` — SKIP` action suffix (written by setStageSuffix). Both are
// excluded from progress.
// ADR-3a: counts come from the target intent's own state file, never from the
// active intent's runtime-graph summary.
export function countStageProgress(stateContent: string): {
  approved: number;
  total: number;
} {
  const lines = stateContent.split("\n");
  let approved = 0;
  let total = 0;
  let inProgress = false;
  for (const line of lines) {
    if (line.startsWith("## ")) inProgress = line.startsWith("## Stage Progress");
    if (!inProgress) continue;
    const m = line.match(/^- \[(x|X| |-|\?|R|S)\] /);
    if (!m) continue;
    if (m[1] === "S") continue;
    if (/ — SKIP\s*$/.test(line)) continue;
    total++;
    if (m[1].toLowerCase() === "x") approved++;
  }
  return { approved, total };
}

export function buildSnapshot(
  projectDir: string,
  explicitIntentDir: string | null,
): SnapshotOutcome {
  const dirName = activeIntent(projectDir, undefined, explicitIntentDir ?? undefined);
  if (dirName === null) {
    return { kind: "error", message: "no active intent (and no --intent given)" };
  }
  const registry = readIntentRegistry(projectDir);
  const entry: IntentRegistryEntry | undefined = registry.find((e) =>
    recordDirMatches(e, dirName),
  );
  if (entry === undefined) {
    return { kind: "error", message: `intent "${dirName}" not found in intents.json` };
  }
  const recordDir = join(intentsDir(projectDir), dirName);
  let stateContent: string;
  try {
    stateContent = readFileSync(join(recordDir, "amadeus-state.md"), "utf-8");
  } catch {
    return { kind: "error", message: `amadeus-state.md not readable under ${recordDir}` };
  }
  const { approved, total } = countStageProgress(stateContent);
  const mirrorRaw = getField(stateContent, "Mirror Issue");
  const mirrorMatch = mirrorRaw === null ? null : mirrorRaw.match(/#?(\d+)/);
  const parkedField = getField(stateContent, "Parked");
  return {
    kind: "ok",
    snapshot: {
      dirName,
      slug: entry.slug,
      projectSummary: getField(stateContent, "Project") ?? entry.slug,
      recordPath: `amadeus/spaces/default/intents/${dirName}/`,
      phase: getField(stateContent, "Lifecycle Phase") ?? "?",
      stage: getField(stateContent, "Current Stage") ?? "?",
      stagesApproved: approved,
      stagesTotal: total,
      parked: parkedField !== null && parkedField !== "",
      parkedAtStage: getField(stateContent, "Parked At Stage"),
      workflowStatus: getField(stateContent, "Status") ?? "?",
      intentStatus: entry.status,
      lastUpdated: getField(stateContent, "Last Updated") ?? "?",
      mirrorIssue: mirrorMatch === null ? null : Number.parseInt(mirrorMatch[1], 10),
    },
  };
}

// --- C3: mirror-template ---------------------------------------------------

export function renderTitle(s: MirrorSnapshot): string {
  return `intent: ${s.slug}(${s.dirName})`;
}

// ADR-3 status line: bold status first, then phase/stage, counts, timestamp.
export function renderStatusLine(s: MirrorSnapshot): string {
  let status: string;
  if (s.workflowStatus === "Completed") status = "complete";
  else if (s.parked) status = `parked @ ${s.parkedAtStage ?? s.stage}`;
  else status = "in-flight";
  return `**${status}** — ${s.phase}/${s.stage}(approved ${s.stagesApproved}/${s.stagesTotal})、更新 ${s.lastUpdated}`;
}

// The body is the fixed three-section template (FR-5) and nothing else — the
// mirror structurally has no place for design detail.
export function renderBody(s: MirrorSnapshot): string {
  const summary = s.projectSummary.length > 400
    ? `${s.projectSummary.slice(0, 400)}…`
    : s.projectSummary;
  return [
    "## 概要",
    "",
    summary,
    "",
    "## Record(正本)",
    "",
    `→ \`${s.recordPath}\``,
    "",
    "## 状態",
    "",
    renderStatusLine(s),
    "",
  ].join("\n");
}

export type StatusFindingKind =
  | "stale-status-line"
  | "mirror-missing"
  | "issue-drifted";

export type StatusFinding = {
  kind: StatusFindingKind;
  detail: string;
};

export type StatusOutcome =
  | { kind: "clean" }
  | { kind: "diverged"; findings: [StatusFinding, ...StatusFinding[]] }
  | { kind: "precondition"; reason: string };

export function compareMirrorStatus(
  snapshot: MirrorSnapshot,
  issueBody: string | null,
): StatusOutcome {
  if (issueBody === null) {
    return {
      kind: "diverged",
      findings: [{
        kind: "mirror-missing",
        detail: snapshot.mirrorIssue === null
          ? `record ${snapshot.dirName} has no Mirror Issue field`
          : `mirror issue #${snapshot.mirrorIssue} does not exist`,
      }],
    };
  }

  const findings: StatusFinding[] = [];
  const expectedStatusLine = renderStatusLine(snapshot);
  if (!issueBody.split(/\r?\n/).includes(expectedStatusLine)) {
    findings.push({
      kind: "stale-status-line",
      detail: `record Status="${snapshot.workflowStatus}" is not reflected in the mirror issue`,
    });
  }
  if (issueBody !== renderBody(snapshot)) {
    findings.push({
      kind: "issue-drifted",
      detail: "mirror issue body differs from the body rendered from the current record",
    });
  }
  if (findings.length === 0) return { kind: "clean" };
  return {
    kind: "diverged",
    findings: findings as [StatusFinding, ...StatusFinding[]],
  };
}

export function exitOfStatus(outcome: StatusOutcome): 0 | 1 | 2 {
  if (outcome.kind === "clean") return 0;
  if (outcome.kind === "diverged") return 1;
  return 2;
}

// --- C4: gh-gateway --------------------------------------------------------

export type GhResult =
  | { kind: "ok"; stdout: string }
  | { kind: "error"; exitCode: number; stderr: string };

export type GhRunner = (args: string[]) => GhResult;

// Argument-array spawn only (no shell), env passed explicitly
// (bun-spawn-env-snapshot). The exit code is read from the child itself.
export function spawnGh(args: string[]): GhResult {
  let proc: ReturnType<typeof Bun.spawnSync>;
  try {
    proc = Bun.spawnSync({
      cmd: ["gh", ...args],
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (e) {
    return { kind: "error", exitCode: 127, stderr: `gh not runnable: ${String(e)}` };
  }
  const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
  const stderr = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";
  if (proc.exitCode !== 0) {
    return { kind: "error", exitCode: proc.exitCode ?? 1, stderr };
  }
  return { kind: "ok", stdout };
}

export function ensureGhReady(run: GhRunner): GhResult {
  return run(["auth", "status"]);
}

function isMissingIssueError(result: Extract<GhResult, { kind: "error" }>): boolean {
  return /\b404\b|not found|could not resolve to an issue/i.test(result.stderr);
}

function outcomeFromIssueView(snapshot: MirrorSnapshot, viewed: GhResult): StatusOutcome {
  if (viewed.kind === "error") {
    if (isMissingIssueError(viewed)) return compareMirrorStatus(snapshot, null);
    return {
      kind: "precondition",
      reason: `gh issue view failed: ${viewed.stderr.trim()}`,
    };
  }
  try {
    const parsed: unknown = JSON.parse(viewed.stdout);
    if (
      typeof parsed !== "object"
      || parsed === null
      || !("body" in parsed)
      || typeof parsed.body !== "string"
    ) {
      return {
        kind: "precondition",
        reason: "gh issue view returned JSON without a string body",
      };
    }
    return compareMirrorStatus(snapshot, parsed.body);
  } catch {
    return {
      kind: "precondition",
      reason: "gh issue view returned invalid JSON",
    };
  }
}

// --- C5: commands ----------------------------------------------------------

function fail(message: string): number {
  console.error(`amadeus-mirror: ${message}`);
  return 1;
}

function writeMirrorIssueField(
  projectDir: string,
  dirName: string,
  issue: number,
): void {
  const statePath = join(intentsDir(projectDir), dirName, "amadeus-state.md");
  const content = readFileSync(statePath, "utf-8");
  const next = setOrInsertField(
    content,
    "## Project Information",
    "Mirror Issue",
    `#${issue}`,
  );
  writeFileSync(statePath, next);
}

export function handleCreate(
  projectDir: string,
  intentDir: string | null,
  run: GhRunner,
): number {
  const outcome = buildSnapshot(projectDir, intentDir);
  if (outcome.kind === "error") return fail(outcome.message);
  const s = outcome.snapshot;
  if (s.mirrorIssue !== null) {
    return fail(
      `mirror issue already exists: #${s.mirrorIssue} (duplicate create is refused; run sync instead)`,
    );
  }
  const ready = ensureGhReady(run);
  if (ready.kind === "error") return fail(`gh not ready: ${ready.stderr.trim()}`);
  const created = run([
    "issue",
    "create",
    "--title",
    renderTitle(s),
    "--body",
    renderBody(s),
    "--label",
    "intent-mirror",
    "--label",
    "enhancement",
  ]);
  if (created.kind === "error") return fail(`gh issue create failed: ${created.stderr.trim()}`);
  const num = created.stdout.match(/\/issues\/(\d+)/);
  if (num === null) {
    return fail(`could not parse issue number from gh output: ${created.stdout.trim()}`);
  }
  const issue = Number.parseInt(num[1], 10);
  try {
    writeMirrorIssueField(projectDir, s.dirName, issue);
  } catch (e) {
    // R-3: the issue exists but the field write failed — surface the number
    // so a human can record it, and fail loud. Never auto-close the issue.
    return fail(
      `issue #${issue} was created but writing the Mirror Issue field failed (${String(e)}); record it manually`,
    );
  }
  console.log(`created mirror issue #${issue} for ${s.dirName}`);
  return 0;
}

export function handleSync(
  projectDir: string,
  intentDir: string | null,
  run: GhRunner,
): number {
  const outcome = buildSnapshot(projectDir, intentDir);
  if (outcome.kind === "error") return fail(outcome.message);
  const s = outcome.snapshot;
  if (s.mirrorIssue === null) {
    return fail(`no Mirror Issue field for ${s.dirName} (run create first)`);
  }
  const ready = ensureGhReady(run);
  if (ready.kind === "error") return fail(`gh not ready: ${ready.stderr.trim()}`);
  const edited = run([
    "issue",
    "edit",
    String(s.mirrorIssue),
    "--body",
    renderBody(s),
  ]);
  if (edited.kind === "error") return fail(`gh issue edit failed: ${edited.stderr.trim()}`);
  console.log(`synced mirror issue #${s.mirrorIssue} for ${s.dirName}`);
  return 0;
}

export function handleClose(
  projectDir: string,
  intentDir: string | null,
  run: GhRunner,
): number {
  const outcome = buildSnapshot(projectDir, intentDir);
  if (outcome.kind === "error") return fail(outcome.message);
  const s = outcome.snapshot;
  if (s.mirrorIssue === null) {
    return fail(`no Mirror Issue field for ${s.dirName} (run create first)`);
  }
  const ready = ensureGhReady(run);
  if (ready.kind === "error") return fail(`gh not ready: ${ready.stderr.trim()}`);
  // FR-4.1 landing check: both completion signals must hold (they are written
  // in one transaction by complete-workflow; one-sided state is an anomaly and
  // the close stays shut — fail-closed).
  const intentsComplete = s.intentStatus === "complete";
  const stateCompleted = s.workflowStatus === "Completed";
  if (!intentsComplete || !stateCompleted) {
    return fail(
      `landing check failed: intents.json status="${s.intentStatus}" (need "complete") AND state Status="${s.workflowStatus}" (need "Completed")`,
    );
  }
  const synced = run(["issue", "edit", String(s.mirrorIssue), "--body", renderBody(s)]);
  if (synced.kind === "error") return fail(`final sync failed: ${synced.stderr.trim()}`);
  const closed = run(["issue", "close", String(s.mirrorIssue)]);
  if (closed.kind === "error") return fail(`gh issue close failed: ${closed.stderr.trim()}`);
  console.log(`closed mirror issue #${s.mirrorIssue} for ${s.dirName}`);
  return 0;
}

export function handleStatus(
  projectDir: string,
  intentDir: string | null,
  run: GhRunner,
): number {
  const ready = ensureGhReady(run);
  if (ready.kind === "error") {
    const outcome: StatusOutcome = {
      kind: "precondition",
      reason: `gh not ready: ${ready.stderr.trim()}`,
    };
    console.error(`amadeus-mirror: ${outcome.reason}`);
    return exitOfStatus(outcome);
  }

  const snapshotOutcome = buildSnapshot(projectDir, intentDir);
  if (snapshotOutcome.kind === "error") {
    const outcome: StatusOutcome = {
      kind: "precondition",
      reason: snapshotOutcome.message,
    };
    console.error(`amadeus-mirror: ${outcome.reason}`);
    return exitOfStatus(outcome);
  }
  const snapshot = snapshotOutcome.snapshot;

  let outcome: StatusOutcome;
  if (snapshot.mirrorIssue === null) {
    outcome = compareMirrorStatus(snapshot, null);
  } else {
    const viewed = run(["issue", "view", String(snapshot.mirrorIssue), "--json", "body"]);
    outcome = outcomeFromIssueView(snapshot, viewed);
  }

  if (outcome.kind === "precondition") {
    console.error(`amadeus-mirror: ${outcome.reason}`);
  } else if (outcome.kind === "clean") {
    console.log(`mirror issue is in sync for ${snapshot.dirName}`);
  } else {
    for (const finding of outcome.findings) {
      console.log(`${finding.kind}: ${finding.detail}`);
    }
  }
  return exitOfStatus(outcome);
}

// --- C6: entry -------------------------------------------------------------

// projectDir/run are injectable (ADR-4 test seam via default parameters); the
// CLI entry always runs with the real repo root and the real gh spawn.
export function main(
  argv: string[],
  projectDir: string = PROJECT_DIR,
  run: GhRunner = spawnGh,
): number {
  const args = parseArgs(argv);
  if (args.kind === "usage") {
    console.error(args.message);
    return 2;
  }
  if (args.kind === "create") return handleCreate(projectDir, args.intentDir, run);
  if (args.kind === "sync") return handleSync(projectDir, args.intentDir, run);
  if (args.kind === "close") return handleClose(projectDir, args.intentDir, run);
  return handleStatus(projectDir, args.intentDir, run);
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
