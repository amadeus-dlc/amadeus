// Self-development intent-birth integrity attestation (#2772).
//
// The attestation is disposable workspace runtime state. The build path writes
// it only after the source distribution and self-install promotion succeed;
// the birth guard reads it without writing lifecycle state.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  evaluateLifecycleGuards,
  guardAllowed,
  guardDenied,
  guardNotApplicable,
  guardUnknown,
  type LifecycleCheckpoint,
  type LifecycleGuardAdapter,
  type LifecycleGuardDecision,
  type LifecycleGuardVerdict,
} from "./amadeus-lifecycle-guard.ts";

export const SELFDEV_INTEGRITY_RELATIVE_PATH = ".amadeus/.amadeus-selfdev-integrity.json";
export const SELFDEV_BUILD_COMMAND = "bun run build";
export const ABSENT_BASE_MARKER = "absent";
export const SELFDEV_SCOPES = [
  "self-feature",
  "self-fix",
  "self-refactor",
  "self-document",
] as const;
export const SELFDEV_RUNTIME_HARNESSES = [
  ".claude",
  ".codex",
  ".cursor",
  ".opencode",
  ".kimi-code",
  ".pi",
] as const;

const SOURCE_TOOLS_RELATIVE_PATH = join("packages", "framework", "core", "tools");
const GENERATED_RUNTIME_ONLY_FILES = new Set([
  "data/harness.json",
  "data/memory-seed/",
  "data/scope-grid.json",
  "data/stage-graph.json",
]);
const SUCCESS = "success" as const;
const SHA256_RE = /^sha256:[0-9a-f]{64}$/u;
const REVISION_RE = /^[0-9a-f]{40,64}$/iu;

export interface SelfDevelopmentIntegrityAttestation {
  readonly schemaVersion: 1;
  readonly targetHead: string;
  readonly observedOriginMain: string;
  readonly buildStatus: typeof SUCCESS;
  readonly builtAt: string;
  readonly sourceDigest: string;
  readonly runtimeDigests: Readonly<Record<string, string>>;
}

export interface SelfDevelopmentIntegrityContext {
  readonly projectDir: string;
  readonly scope: string;
  // Optional for compatibility with existing guard registry callers. The real
  // birth path supplies both values explicitly; absent means not self-dev.
  readonly selfDevelopmentWorkspace?: boolean;
  readonly runtimeHarness?: string;
}

export interface GitCommandResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface SelfDevelopmentIntegrityDeps {
  readonly runGit?: (projectDir: string, args: readonly string[]) => GitCommandResult;
  readonly now?: () => Date;
}

type ParsedAttestation =
  | { readonly kind: "missing" }
  | { readonly kind: "malformed"; readonly detail: string }
  | { readonly kind: "valid"; readonly value: SelfDevelopmentIntegrityAttestation };

function validRevision(value: unknown): value is string {
  return typeof value === "string" && REVISION_RE.test(value);
}

function validOriginRevision(value: unknown): value is string {
  return validRevision(value) || value === ABSENT_BASE_MARKER;
}

function validDigest(value: unknown): value is string {
  return typeof value === "string" && SHA256_RE.test(value);
}

function validRuntimeDigests(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.entries(value).every(([harness, digest]) =>
    harness.startsWith(".") && validDigest(digest),
  );
}

type ValidAttestationRecord = Record<string, unknown> & {
  targetHead: string;
  observedOriginMain: string;
  builtAt: string;
  sourceDigest: string;
  runtimeDigests: Record<string, string>;
};

function validAttestationShape(value: Record<string, unknown>): value is ValidAttestationRecord {
  return (
    value.schemaVersion === 1 &&
    validRevision(value.targetHead) &&
    validOriginRevision(value.observedOriginMain) &&
    value.buildStatus === SUCCESS &&
    typeof value.builtAt === "string" &&
    Number.isFinite(Date.parse(value.builtAt)) &&
    validDigest(value.sourceDigest) &&
    validRuntimeDigests(value.runtimeDigests)
  );
}

function defaultRunGit(projectDir: string, args: readonly string[]): GitCommandResult {
  const result = spawnSync("git", [...args], {
    cwd: projectDir,
    encoding: "utf-8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? "").toString(),
    stderr: (result.stderr ?? "").toString(),
  };
}

function git(deps: SelfDevelopmentIntegrityDeps, projectDir: string, args: readonly string[]): GitCommandResult {
  return (deps.runGit ?? defaultRunGit)(projectDir, args);
}

function recovery(): string {
  return `Run \`git fetch origin\`, then \`${SELFDEV_BUILD_COMMAND}\`, then retry intent creation.`;
}

function refusal(reason: string) {
  return guardDenied({ reason, recovery: recovery() });
}

function unknown(reason: string) {
  return guardUnknown({ reason, recovery: recovery() });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAttestation(projectDir: string): ParsedAttestation {
  const path = join(projectDir, SELFDEV_INTEGRITY_RELATIVE_PATH);
  if (!existsSync(path)) return { kind: "missing" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch (error) {
    return { kind: "malformed", detail: error instanceof Error ? error.message : String(error) };
  }
  if (!isRecord(parsed)) return { kind: "malformed", detail: "top-level value is not an object" };
  if (!validAttestationShape(parsed)) {
    return { kind: "malformed", detail: "schema, revision, build marker, timestamp, or digest is invalid" };
  }
  if (parsed.observedOriginMain === ABSENT_BASE_MARKER) {
    return { kind: "malformed", detail: "origin/main binding is absent; a fresh build is required" };
  }
  return {
    kind: "valid",
    value: {
      schemaVersion: 1,
      targetHead: parsed.targetHead,
      observedOriginMain: parsed.observedOriginMain,
      buildStatus: SUCCESS,
      builtAt: parsed.builtAt as string,
      sourceDigest: parsed.sourceDigest,
      runtimeDigests: parsed.runtimeDigests,
    },
  };
}

function filesUnder(root: string, current = root): string[] {
  if (!existsSync(root)) throw new Error(`directory does not exist: ${root}`);
  const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(current, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...filesUnder(root, full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

/** Digest a generated tool tree using stable relative paths and file bytes. */
export function digestDirectory(root: string, ignoredRelativePaths: ReadonlySet<string> = new Set()): string {
  const hash = createHash("sha256");
  for (const file of filesUnder(root)) {
    const relativePath = relative(root, file).split("\\").join("/");
    if ([...ignoredRelativePaths].some((ignored) =>
      ignored.endsWith("/") ? relativePath.startsWith(ignored) : relativePath === ignored,
    )) continue;
    hash.update(relativePath);
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function digestRuntimeTools(runtimeRoot: string, sourceRoot: string): string {
  const hash = createHash("sha256");
  for (const sourceFile of filesUnder(sourceRoot)) {
    const relativePath = relative(sourceRoot, sourceFile).split("\\").join("/");
    if ([...GENERATED_RUNTIME_ONLY_FILES].some((ignored) =>
      ignored.endsWith("/") ? relativePath.startsWith(ignored) : relativePath === ignored,
    )) continue;
    const runtimeFile = join(runtimeRoot, ...relativePath.split("/"));
    if (!existsSync(runtimeFile)) throw new Error(`runtime file is missing: ${relativePath}`);
    hash.update(relativePath);
    hash.update("\0");
    hash.update(readFileSync(runtimeFile));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function currentDigest(root: string, label: string, sourceRoot?: string): { digest: string } | { error: string } {
  try {
    return { digest: sourceRoot === undefined ? digestDirectory(root) : digestRuntimeTools(root, sourceRoot) };
  } catch (error) {
    return { error: `${label} is unavailable: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function evaluateVerdict(
  context: SelfDevelopmentIntegrityContext,
  deps: SelfDevelopmentIntegrityDeps,
): LifecycleGuardVerdict {
  if (!SELFDEV_SCOPES.includes(context.scope as (typeof SELFDEV_SCOPES)[number])) {
    return guardNotApplicable(`scope "${context.scope}" is not a self-development scope`);
  }
  const selfDevelopmentWorkspace = context.selfDevelopmentWorkspace ?? existsSync(join(context.projectDir, "scripts", "promote-self.ts"));
  if (!selfDevelopmentWorkspace) {
    return guardNotApplicable("workspace is not the Amadeus self-development repository");
  }

  const evidence = parseAttestation(context.projectDir);
  if (evidence.kind === "missing") {
    return refusal(`The self-development build attestation is missing at ${SELFDEV_INTEGRITY_RELATIVE_PATH}.`);
  }
  if (evidence.kind === "malformed") {
    return refusal(`The self-development build attestation is malformed (${evidence.detail}).`);
  }
  const attestation = evidence.value;
  const runtimeHarness = context.runtimeHarness ?? ".claude";
  const recordedRuntimeDigest = attestation.runtimeDigests[runtimeHarness];
  if (recordedRuntimeDigest === undefined) {
    return refusal(`The self-development build attestation has no runtime digest for ${runtimeHarness}.`);
  }

  const fetched = git(deps, context.projectDir, ["fetch", "origin"]);
  if (fetched.status !== 0) {
    return unknown(`Self-development integrity is unknown: git fetch origin failed (${fetched.stderr.trim() || `exit ${fetched.status}`}).`);
  }
  const head = git(deps, context.projectDir, ["rev-parse", "HEAD"]);
  const originMain = git(deps, context.projectDir, ["rev-parse", "refs/remotes/origin/main"]);
  if (head.status !== 0 || originMain.status !== 0) {
    return unknown("Self-development integrity is unknown: HEAD or refs/remotes/origin/main could not be resolved.");
  }
  const targetHead = head.stdout.trim();
  const currentOriginMain = originMain.stdout.trim();
  if (attestation.targetHead !== targetHead) {
    return refusal(`The self-development build attestation targets ${attestation.targetHead}, but HEAD is ${targetHead}.`);
  }
  if (attestation.observedOriginMain !== currentOriginMain) {
    return refusal(`The self-development build attestation observed origin/main at ${attestation.observedOriginMain}, but the fresh fetch reports ${currentOriginMain}.`);
  }
  const ancestry = git(deps, context.projectDir, ["merge-base", "--is-ancestor", "refs/remotes/origin/main", "HEAD"]);
  if (ancestry.status === 1) {
    return refusal("origin/main is not an ancestor of HEAD; the self-development checkout is behind the current base.");
  }
  if (ancestry.status !== 0) {
    return unknown(`Self-development base ancestry is unknown (${ancestry.stderr.trim() || `exit ${ancestry.status}`}).`);
  }

  const source = currentDigest(join(context.projectDir, SOURCE_TOOLS_RELATIVE_PATH), "canonical source tools");
  const sourceRoot = join(context.projectDir, SOURCE_TOOLS_RELATIVE_PATH);
  const runtime = currentDigest(join(context.projectDir, runtimeHarness, "tools"), `${runtimeHarness} runtime tools`, sourceRoot);
  if ("error" in source || "error" in runtime) {
    const detail = "error" in source ? source.error : "error" in runtime ? runtime.error : "unavailable";
    return unknown(`Self-development source/runtime integrity is unknown: ${detail}.`);
  }
  if (attestation.sourceDigest !== source.digest || recordedRuntimeDigest !== runtime.digest) {
    return refusal("The self-development build attestation is stale: source or runtime digest no longer matches the recorded build.");
  }
  if (source.digest !== runtime.digest) {
    return refusal("Self-development source/runtime digests do not match; the runtime is not the current source build.");
  }
  return guardAllowed();
}

export function selfDevelopmentIntegrityAdapter(
  deps: SelfDevelopmentIntegrityDeps = {},
): LifecycleGuardAdapter<SelfDevelopmentIntegrityContext> {
  return {
    id: "intent-birth.self-development-integrity",
    checkpoint: "intent-birth" satisfies LifecycleCheckpoint,
    order: 40,
    evaluate: (context) => evaluateVerdict(context, deps),
  };
}

export function evaluateSelfDevelopmentIntegrity(
  context: SelfDevelopmentIntegrityContext,
  deps: SelfDevelopmentIntegrityDeps = {},
): LifecycleGuardDecision {
  return evaluateLifecycleGuards({
    checkpoint: "intent-birth",
    targetRevision: `intent:${context.scope}`,
    adapters: [selfDevelopmentIntegrityAdapter(deps)],
    context,
  });
}

function gitRevision(projectDir: string, ref: string): string {
  const result = defaultRunGit(projectDir, ["rev-parse", ref]);
  if (result.status !== 0) {
    throw new Error(`cannot resolve ${ref}: ${result.stderr.trim() || `exit ${result.status}`}`);
  }
  return result.stdout.trim();
}

function gitOriginMainRevision(projectDir: string): string {
  try {
    return gitRevision(projectDir, "refs/remotes/origin/main");
  } catch (error) {
    console.warn(
      `promote-self: could not resolve refs/remotes/origin/main; writing ${ABSENT_BASE_MARKER} base marker (${error instanceof Error ? error.message : String(error)})`,
    );
    return ABSENT_BASE_MARKER;
  }
}

/** Write the disposable attestation atomically after a successful build path. */
export function writeSelfDevelopmentIntegrityAttestation(
  projectDir: string,
  runtimeHarnesses: readonly string[] = SELFDEV_RUNTIME_HARNESSES,
  now: () => Date = () => new Date(),
): void {
  const sourceRoot = join(projectDir, SOURCE_TOOLS_RELATIVE_PATH);
  const sourceDigest = digestDirectory(sourceRoot);
  const runtimeDigests = Object.fromEntries(
    runtimeHarnesses.map((harness) => [harness, digestRuntimeTools(join(projectDir, harness, "tools"), sourceRoot)]),
  );
  for (const [harness, digest] of Object.entries(runtimeDigests)) {
    if (digest !== sourceDigest) {
      throw new Error(`cannot attest ${harness}: source/runtime digest mismatch after ${SELFDEV_BUILD_COMMAND}`);
    }
  }
  const attestation: SelfDevelopmentIntegrityAttestation = {
    schemaVersion: 1,
    targetHead: gitRevision(projectDir, "HEAD"),
    observedOriginMain: gitOriginMainRevision(projectDir),
    buildStatus: SUCCESS,
    builtAt: now().toISOString(),
    sourceDigest,
    runtimeDigests,
  };
  const path = join(projectDir, SELFDEV_INTEGRITY_RELATIVE_PATH);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(attestation, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}
