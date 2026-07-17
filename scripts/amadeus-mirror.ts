// amadeus-mirror.ts — mirror-issue CLI for the intent-first filing practice
// (team.md cid:intent-first-mirror-issue). Creates, syncs, and closes the
// GitHub mirror issue of an amadeus intent. The record tree is the source of
// truth; sync is strictly record -> issue (one-way). State is read only from
// deterministic sources (intents.json + amadeus-state.md); the tool never
// writes intents.json (the WORKSPACE-lock contract stays untouched) — its only
// writes are gh calls and the `Mirror Issue` field in amadeus-state.md.
//
// Subcommands: create | sync | close (see USAGE). Exit codes: 0 ok, 1 fault
// (gh missing/unauthenticated, missing field, landing check failed), 2 usage.

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
} from "../packages/framework/core/tools/amadeus-lib";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(SCRIPTS_DIR, "..");

const USAGE =
  "Usage: bun scripts/amadeus-mirror.ts <create|sync|close> [--intent <dirName>]";

// --- C1: args-parser -------------------------------------------------------

export type ArgsOutcome =
  | { kind: "create"; intentDir: string | null }
  | { kind: "sync"; intentDir: string | null }
  | { kind: "close"; intentDir: string | null }
  | { kind: "usage"; message: string };

export function parseArgs(argv: string[]): ArgsOutcome {
  const [sub, ...rest] = argv;
  if (sub !== "create" && sub !== "sync" && sub !== "close") {
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

// Count `- [x]` as approved; `[S]` rows leave the denominator (jump-skipped
// stages are excluded from progress, mirroring the statusline convention).
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
  return handleClose(projectDir, args.intentDir, run);
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
