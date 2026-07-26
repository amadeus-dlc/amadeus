// amadeus-mirror.ts — mirror-issue CLI for the intent-first filing practice
// (team.md cid:intent-first-mirror-issue). Creates, syncs, and closes the
// GitHub mirror issue of an amadeus intent through the guarded v1 lifecycle.
// The record tree is the source of truth; sync is strictly record -> issue
// (one-way). The tool never writes the legacy "Mirror Issue" state field; the
// v1 mirror-state block (issueNumber + provenance) is the single authority for
// whether a mirror exists, read through buildMirrorStatusRecordView.
//
// Subcommands: create | sync | close | status (see USAGE). Mutating verbs use
// exit 0 for success, 1 for runtime faults, and 2 for usage. Status uses 0 for
// clean, 1 for divergence, and 2 for precondition or usage errors.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMirrorStatusRecordView,
  type MirrorLifecycleAdapterOutcome,
  type MirrorLifecycleRequest,
  type MirrorStatusRecordView,
  runMirrorLifecycleBoundary,
} from "./amadeus-mirror-lifecycle.ts";
import { renderMirrorLegacyHelp } from "./amadeus-mirror-presentation.ts";

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

const USAGE = renderMirrorLegacyHelp();

// --- C1: args-parser -------------------------------------------------------

export type ArgsOutcome =
  | { kind: "create"; intentDir: string | null; instance: string }
  | { kind: "sync"; intentDir: string | null; instance: string }
  | { kind: "close"; intentDir: string | null; instance: string }
  | { kind: "status"; intentDir: string | null }
  | { kind: "usage"; message: string };

export function parseArgs(argv: string[]): ArgsOutcome {
  const [sub, ...rest] = argv;
  if (sub !== "create" && sub !== "sync" && sub !== "close" && sub !== "status") {
    return { kind: "usage", message: USAGE };
  }
  let intentDir: string | null = null;
  let instance: string | null = null;
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
    if (rest[i] === "--instance") {
      const value = rest[i + 1];
      if (value === undefined || value.startsWith("--")) {
        return { kind: "usage", message: USAGE };
      }
      instance = value;
      i++;
      continue;
    }
    return { kind: "usage", message: USAGE };
  }
  if (sub === "status") {
    return instance === null
      ? { kind: "status", intentDir }
      : { kind: "usage", message: USAGE };
  }
  return instance === null
    ? { kind: "usage", message: USAGE }
    : { kind: sub, intentDir, instance };
}

// --- C2: status comparison -------------------------------------------------

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

export type StatusRecordView = Extract<MirrorStatusRecordView, { kind: "ok" }>;

// Read the value under a `## <heading>` section of a canonical issue body (from
// the heading line to the next `## ` or EOF), trimmed. Returns null when the
// section is absent. Used to distinguish a stale status value from a whole-body
// drift against the SAME renderer the lifecycle writes with.
export function sectionValue(body: string, heading: string): string | null {
  const lines = body.split(/\r?\n/);
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) return null;
  const rest: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    rest.push(lines[i]);
  }
  return rest.join("\n").trim();
}

// The issue body is compared against the canonical body the record would render
// now (view.expectedBody = renderMirrorIssueContent, identical to sync). A null
// body means the mirror is unrecorded or the recorded issue does not exist.
export function compareMirrorStatus(
  view: StatusRecordView,
  issueBody: string | null,
): StatusOutcome {
  if (issueBody === null) {
    return {
      kind: "diverged",
      findings: [{
        kind: "mirror-missing",
        detail: view.issueNumber === null
          ? `record ${view.intentDir} has no mirror issue recorded`
          : `mirror issue #${view.issueNumber} does not exist`,
      }],
    };
  }

  const findings: StatusFinding[] = [];
  if (sectionValue(issueBody, "Status") !== view.currentStatus) {
    findings.push({
      kind: "stale-status-line",
      detail: `record Status="${view.currentStatus}" is not reflected in the mirror issue`,
    });
  }
  if (issueBody !== view.expectedBody) {
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

function outcomeFromIssueView(view: StatusRecordView, viewed: GhResult): StatusOutcome {
  if (viewed.kind === "error") {
    if (isMissingIssueError(viewed)) return compareMirrorStatus(view, null);
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
    return compareMirrorStatus(view, parsed.body);
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

  const view = buildMirrorStatusRecordView({
    projectDir,
    ...(intentDir ? { intentDir } : {}),
  });
  if (view.kind === "error") {
    console.error(`amadeus-mirror: ${view.message}`);
    return exitOfStatus({ kind: "precondition", reason: view.message });
  }

  let outcome: StatusOutcome;
  if (view.issueNumber === null) {
    outcome = compareMirrorStatus(view, null);
  } else {
    const viewed = run(["issue", "view", String(view.issueNumber), "--json", "body"]);
    outcome = outcomeFromIssueView(view, viewed);
  }

  if (outcome.kind === "precondition") {
    console.error(`amadeus-mirror: ${outcome.reason}`);
  } else if (outcome.kind === "clean") {
    console.log(`mirror issue is in sync for ${view.intentDir}`);
  } else {
    for (const finding of outcome.findings) {
      console.log(`${finding.kind}: ${finding.detail}`);
    }
  }
  return exitOfStatus(outcome);
}

// --- C6: entry -------------------------------------------------------------

type MirrorLifecycleRunner = (
  request: MirrorLifecycleRequest,
) => Promise<MirrorLifecycleAdapterOutcome>;

async function runMirrorMutation(
  args: Extract<ArgsOutcome, { kind: "create" | "sync" | "close" }>,
  projectDir: string,
  runLifecycle: MirrorLifecycleRunner,
): Promise<number> {
  // FR-3: refuse a duplicate create against the v1 authority BEFORE the
  // lifecycle runs, so re-create surfaces a clear message rather than a
  // downstream provenance rejection (#1547b).
  if (args.kind === "create") {
    const view = buildMirrorStatusRecordView({
      projectDir,
      ...(args.intentDir ? { intentDir: args.intentDir } : {}),
    });
    if (view.kind === "ok" && view.issueNumber !== null) {
      return fail(
        `mirror already exists: #${view.issueNumber} (duplicate create is refused; run sync instead)`,
      );
    }
  }
  const result = await runLifecycle({
    projectDir,
    ...(args.intentDir ? { intentDir: args.intentDir } : {}),
    boundary: { kind: "manual", instance: args.instance },
    manualOperation: args.kind,
    invocationId: args.instance,
  });
  if (result.kind === "error") {
    return fail(result.message);
  }
  if (
    result.outcome.kind !== "continued" ||
    result.outcome.outcomes.length === 0 ||
    !result.outcome.outcomes.every((outcome) => outcome.kind === "completed")
  ) {
    return fail(`lifecycle outcome is not completed: ${JSON.stringify(result.outcome)}`);
  }
  const outcome = result.outcome.outcomes.at(-1);
  if (!outcome || outcome.kind !== "completed") {
    return fail("lifecycle completed without an operation outcome");
  }
  console.log(
    `${args.kind === "create" ? "created" : args.kind === "sync" ? "synced" : "closed"} mirror issue #${outcome.issueNumber} for ${args.intentDir ?? "active intent"}`,
  );
  return 0;
}

// Dependencies are injectable at the CLI boundaries. Mutation verbs use only
// the lifecycle runner; the gh runner remains confined to read-only status.
export async function main(
  argv: string[],
  projectDir: string = PROJECT_DIR,
  run: GhRunner = spawnGh,
  runLifecycle: MirrorLifecycleRunner = runMirrorLifecycleBoundary,
): Promise<number> {
  const args = parseArgs(argv);
  if (args.kind === "usage") {
    console.error(args.message);
    return 2;
  }
  if (args.kind !== "status") {
    return runMirrorMutation(args, projectDir, runLifecycle);
  }
  return handleStatus(projectDir, args.intentDir, run);
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
