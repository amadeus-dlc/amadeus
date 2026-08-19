// amadeus-mirror-orphan.ts — Orphan Intent Mirror diagnosis and repair (#3147).
//
// An "orphan" mirror is an OPEN GitHub Issue carrying an Intent Mirror marker
// (see amadeus-mirror-provenance.ts) whose intentUuid is absent from the
// CURRENT working tree's registry (intents.json). Absence has two causes this
// module cannot itself distinguish: (a) the local record that once existed for
// that UUID was destroyed before it ever landed on `main` (a true orphan), or
// (b) the UUID belongs to an Intent that is alive in a concurrent
// worktree/branch and simply has not landed here yet (a false positive). The
// normal Mirror lifecycle (amadeus-mirror-lifecycle.ts) cannot reach either
// case: its every entry point resolves an Intent through the registry first,
// and a registry-absent UUID resolves to nothing (fail-closed).
//
// Because that false-positive class cannot be eliminated from local state
// alone, this module never closes an Issue automatically as a side effect of
// scanning. `diagnoseOrphanMirrors` only ever reports (a warning surface);
// `repairOrphanMirrorIssue` is a single, explicitly-named, issue-numbered
// operation that re-verifies ownership at call time before it comments and
// closes, and reports (never throws) on failure — the same fail-open posture
// documented for every other Mirror operation (docs/guide/22-intent-mirror.md
// "Failure and retry").

import { readIntentRegistry } from "./amadeus-lib.ts";
import {
  createMirrorGitHubGatewayAdapter,
  parseGitHubRepository,
  parseHttpEnvelope,
} from "./amadeus-github-gateway.ts";
import { createGitHubProcessRunner as createMirrorProcessRunner } from "./amadeus-mirror-runner.ts";
import { MARKER_PREFIX, parseMirrorMarker } from "./amadeus-mirror-provenance.ts";
import type { MirrorGitHubGateway, RepositoryIdentity } from "./amadeus-mirror-types.ts";
import type { MirrorProcessRunner } from "./amadeus-process-runner.ts";

// --- Pure classification -----------------------------------------------------

export type OrphanMirrorMarkerIssue = Readonly<{
  repository: RepositoryIdentity;
  number: number;
  state: "OPEN" | "CLOSED";
  body: string;
}>;

export type OrphanNotOrphanReason =
  | "not-open"
  | "wrong-repository"
  | "no-marker"
  | "invalid-marker"
  | "uuid-present-in-registry";

export type OrphanVerdict =
  | Readonly<{
      kind: "orphan-candidate";
      issueNumber: number;
      intentUuid: string;
      intentDir: string;
      preparedAt: string;
    }>
  | Readonly<{
      kind: "not-orphan";
      issueNumber: number;
      reason: OrphanNotOrphanReason;
    }>;

// Fail-closed classification: every non-affirmative path (wrong repo, missing
// or unparseable marker, UUID present in the registry) returns "not-orphan".
// The registry-presence check is the false-positive guard both #3147
// cross-reviews required: a UUID that IS in the working tree's registry is by
// definition not orphaned here, regardless of the Issue's open/closed state
// noise elsewhere.
export function classifyOrphanCandidate(input: Readonly<{
  issue: OrphanMirrorMarkerIssue;
  repository: RepositoryIdentity;
  registryUuids: ReadonlySet<string>;
}>): OrphanVerdict {
  const { issue, repository, registryUuids } = input;
  if (issue.state !== "OPEN") {
    return { kind: "not-orphan", issueNumber: issue.number, reason: "not-open" };
  }
  if (issue.repository.canonical !== repository.canonical) {
    return { kind: "not-orphan", issueNumber: issue.number, reason: "wrong-repository" };
  }
  const marker = parseMirrorMarker(issue.body);
  if (marker.kind === "missing") {
    return { kind: "not-orphan", issueNumber: issue.number, reason: "no-marker" };
  }
  if (marker.kind === "invalid") {
    return { kind: "not-orphan", issueNumber: issue.number, reason: "invalid-marker" };
  }
  if (registryUuids.has(marker.identity.intentUuid)) {
    return { kind: "not-orphan", issueNumber: issue.number, reason: "uuid-present-in-registry" };
  }
  return {
    kind: "orphan-candidate",
    issueNumber: issue.number,
    intentUuid: marker.identity.intentUuid,
    intentDir: marker.identity.intentDir,
    preparedAt: marker.identity.preparedAt,
  };
}

export function renderOrphanObsoleteComment(input: Readonly<{
  intentUuid: string;
  intentDir: string;
  preparedAt: string;
  checkedAt: string;
}>): string {
  return [
    "## Orphan Intent Mirror — closed as obsolete",
    "",
    `This Issue's mirror marker names Intent UUID \`${input.intentUuid}\` (record \`${input.intentDir}\`, prepared ${input.preparedAt}), which is absent from the working tree's \`intents.json\` registry as of ${input.checkedAt}.`,
    "",
    "Closed by the orphan mirror repair tool (see docs/guide/15-troubleshooting.md, Issue #3147). If this Intent is alive in another worktree that has not yet landed on `main`, reopen this Issue and re-run diagnostics once it has.",
  ].join("\n");
}

// --- Diagnosis (read-only) ---------------------------------------------------

export type OrphanCandidateReport = Extract<OrphanVerdict, { kind: "orphan-candidate" }>;

export type DiagnoseOrphanMirrorsOutcome =
  | Readonly<{ kind: "ok"; scanned: number; candidates: readonly OrphanCandidateReport[] }>
  | Readonly<{ kind: "error"; message: string }>;

export type DiagnoseOrphanMirrorsInput = Readonly<{
  projectDir: string;
  space?: string;
  repository: RepositoryIdentity;
  gateway?: MirrorGitHubGateway;
}>;

export async function diagnoseOrphanMirrors(
  input: DiagnoseOrphanMirrorsInput,
): Promise<DiagnoseOrphanMirrorsOutcome> {
  const registryUuids = new Set(
    readIntentRegistry(input.projectDir, input.space).map((entry) => entry.uuid),
  );
  const gateway =
    input.gateway ?? createMirrorGitHubGatewayAdapter(createMirrorProcessRunner());
  // The marker prefix, not the `amadeus-intent-mirror` label, is the
  // authoritative "is this a Mirror Issue" signal throughout this codebase
  // (see amadeus-mirror-provenance.ts): every Mirror Issue carries it and
  // nothing else does, so filtering on it here needs no separate label read.
  const found = await gateway.findIssuesByMarker(input.repository, MARKER_PREFIX);
  if (found.kind === "failure") {
    return { kind: "error", message: `${found.classification}: ${found.summary}` };
  }
  const candidates: OrphanCandidateReport[] = [];
  for (const issue of found.value) {
    const verdict = classifyOrphanCandidate({
      issue,
      repository: input.repository,
      registryUuids,
    });
    if (verdict.kind === "orphan-candidate") candidates.push(verdict);
  }
  return { kind: "ok", scanned: found.value.length, candidates };
}

// --- Repair (mutating, single issue, fail-open) ------------------------------
//
// This intentionally bypasses amadeus-mirror-capability.ts's permit system:
// that system exists to bind a mutation to a live receipt in an Intent's local
// Mirror state, and an orphan Issue has no such receipt by definition (that is
// the defect #3147 reports). The mutation surface here is instead limited to
// exactly two argv builders, both scoped to a single already-numbered Issue,
// and both preceded by a fresh classifyOrphanCandidate re-check (TOCTOU guard:
// refuses to act if the UUID has reappeared in the registry since the caller
// last listed it).

function issuesApiPath(repository: RepositoryIdentity): string {
  return `repos/${repository.canonical}/issues`;
}

export function closeOrphanIssueArgv(
  repository: RepositoryIdentity,
  issueNumber: number,
): readonly string[] {
  return [
    "api",
    "--include",
    "--method",
    "PATCH",
    `${issuesApiPath(repository)}/${issueNumber}`,
    "-f",
    "state=closed",
  ];
}

export function commentOnOrphanIssueArgv(
  repository: RepositoryIdentity,
  issueNumber: number,
  body: string,
): readonly string[] {
  return [
    "api",
    "--include",
    "--method",
    "POST",
    `${issuesApiPath(repository)}/${issueNumber}/comments`,
    "-f",
    `body=${body}`,
  ];
}

type GhCallOutcome = Readonly<{ kind: "ok" }> | Readonly<{ kind: "error"; message: string }>;

async function runGhApiSingle(
  runner: MirrorProcessRunner,
  args: readonly string[],
): Promise<GhCallOutcome> {
  const result = await runner.run({ executable: "gh", args, profile: "single" });
  if (result.kind !== "exited") {
    return { kind: "error", message: `gh did not complete cleanly (${result.kind})` };
  }
  const envelope = parseHttpEnvelope(result.stdout, "single");
  if (envelope.kind === "http-error") {
    return { kind: "error", message: `gh api returned HTTP ${envelope.status}` };
  }
  if (envelope.kind === "malformed") {
    return { kind: "error", message: "gh api returned a malformed response" };
  }
  return { kind: "ok" };
}

export type RepairOrphanMirrorOutcome =
  | Readonly<{ kind: "closed"; issueNumber: number; intentUuid: string; intentDir: string }>
  | Readonly<{ kind: "refused"; issueNumber: number; reason: OrphanNotOrphanReason }>
  | Readonly<{ kind: "error"; message: string }>;

export type RepairOrphanMirrorIssueInput = Readonly<{
  projectDir: string;
  space?: string;
  repository: RepositoryIdentity;
  issueNumber: number;
  now: string;
  gateway?: MirrorGitHubGateway;
  processRunner?: MirrorProcessRunner;
}>;

export async function repairOrphanMirrorIssue(
  input: RepairOrphanMirrorIssueInput,
): Promise<RepairOrphanMirrorOutcome> {
  const registryUuids = new Set(
    readIntentRegistry(input.projectDir, input.space).map((entry) => entry.uuid),
  );
  const processRunner = input.processRunner ?? createMirrorProcessRunner();
  const gateway = input.gateway ?? createMirrorGitHubGatewayAdapter(processRunner);

  const viewed = await gateway.viewIssue(input.repository, input.issueNumber);
  if (viewed.kind === "failure") {
    return {
      kind: "error",
      message: `unable to fetch Issue #${input.issueNumber}: ${viewed.classification}: ${viewed.summary}`,
    };
  }
  const verdict = classifyOrphanCandidate({
    issue: viewed.value,
    repository: input.repository,
    registryUuids,
  });
  if (verdict.kind !== "orphan-candidate") {
    return { kind: "refused", issueNumber: input.issueNumber, reason: verdict.reason };
  }

  const commentBody = renderOrphanObsoleteComment({
    intentUuid: verdict.intentUuid,
    intentDir: verdict.intentDir,
    preparedAt: verdict.preparedAt,
    checkedAt: input.now,
  });
  const commented = await runGhApiSingle(
    processRunner,
    commentOnOrphanIssueArgv(input.repository, input.issueNumber, commentBody),
  );
  if (commented.kind === "error") {
    return { kind: "error", message: `posting the obsolete comment failed: ${commented.message}` };
  }

  const closed = await runGhApiSingle(
    processRunner,
    closeOrphanIssueArgv(input.repository, input.issueNumber),
  );
  if (closed.kind === "error") {
    return { kind: "error", message: `closing the Issue failed: ${closed.message}` };
  }

  return {
    kind: "closed",
    issueNumber: input.issueNumber,
    intentUuid: verdict.intentUuid,
    intentDir: verdict.intentDir,
  };
}

// --- CLI ----------------------------------------------------------------------

const USAGE = [
  "Usage: bun amadeus-mirror-orphan.ts diagnose --repo <owner/name> [--project-dir <dir>] [--space <name>]",
  "       bun amadeus-mirror-orphan.ts repair --issue <n> --repo <owner/name> [--project-dir <dir>] [--space <name>]",
  "diagnose is read-only and never mutates GitHub; it lists candidates as a warning surface.",
  "repair re-verifies ownership for the single named Issue before it comments and closes; it never auto-closes from a diagnose scan.",
].join("\n");

function flagValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function resolveRepositoryFlag(args: readonly string[]): RepositoryIdentity | null {
  const raw = flagValue(args, "--repo");
  if (!raw) return null;
  const parts = raw.split("/");
  if (parts.length !== 2) return null;
  return parseGitHubRepository(parts[0], parts[1]);
}

export async function runMirrorOrphanMain(
  args: string[],
  now: () => string = () => new Date().toISOString(),
  deps: Readonly<{ gateway?: MirrorGitHubGateway; processRunner?: MirrorProcessRunner }> = {},
): Promise<number> {
  const [sub, ...rest] = args;
  const repository = resolveRepositoryFlag(rest);
  if ((sub !== "diagnose" && sub !== "repair") || !repository) {
    console.error(USAGE);
    return 2;
  }
  const projectDir = flagValue(rest, "--project-dir") ?? process.cwd();
  const space = flagValue(rest, "--space");

  if (sub === "diagnose") {
    const result = await diagnoseOrphanMirrors({ projectDir, space, repository, gateway: deps.gateway });
    if (result.kind === "error") {
      console.error(`amadeus-mirror-orphan: diagnose failed: ${result.message}`);
      return 1;
    }
    console.log(JSON.stringify(result));
    if (result.candidates.length > 0) {
      console.error(
        `amadeus-mirror-orphan: WARNING: ${result.candidates.length} orphan mirror candidate(s) found (${result.candidates.map((c) => `#${c.issueNumber}`).join(", ")}). Re-verify before running repair.`,
      );
    }
    return 0;
  }

  const issueRaw = flagValue(rest, "--issue");
  const issueNumber = issueRaw && /^[1-9]\d*$/.test(issueRaw) ? Number(issueRaw) : null;
  if (issueNumber === null) {
    console.error(USAGE);
    return 2;
  }
  const result = await repairOrphanMirrorIssue({
    projectDir,
    space,
    repository,
    issueNumber,
    now: now(),
    gateway: deps.gateway,
    processRunner: deps.processRunner,
  });
  if (result.kind === "error") {
    console.error(`amadeus-mirror-orphan: WARNING: repair failed for #${issueNumber}: ${result.message}`);
    return 1;
  }
  if (result.kind === "refused") {
    console.error(
      `amadeus-mirror-orphan: refused to close #${issueNumber}: not verified as an orphan (${result.reason}).`,
    );
    return 1;
  }
  console.log(JSON.stringify(result));
  return 0;
}

if (import.meta.main) {
  process.exit(await runMirrorOrphanMain(process.argv.slice(2)));
}
