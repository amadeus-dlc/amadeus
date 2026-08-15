// pr-convergence-gh-runner.ts — U2 convergence-toolchain, component C6.
//
// The only place this plugin touches the `gh` binary. ADR-6 keeps it inside the
// plugin rather than importing the core GitHub gateway: the import-closure
// guard owns a plugin's closure to its own bundle prefix, so a core path can
// never be `owned` by this plugin. The gateway's four contracts are therefore
// reimplemented here and pinned by tests instead of inherited:
//
//   (i)   readiness is probed before any real call (`gh --version`, then
//         `gh auth status --hostname github.com`);
//   (ii)  every invocation is an argv array — no shell, no string joining;
//   (iii) no credential is retained or printed — stderr becomes a digest;
//   (iv)  every failure is a typed error that fails loudly, never a silent
//         empty result.
//
// This module is the leaf of the plugin's dependency graph: it imports nothing
// from its siblings.

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// ---------------------------------------------------------------------------
// Pull-request identity
// ---------------------------------------------------------------------------

export type PrNumber = number & { readonly __brand: "PrNumber" };

export interface PrRef {
  readonly repo: string;
  readonly number: PrNumber;
}

const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const PR_NUMBER_RE = /^[1-9][0-9]{0,9}$/;

/**
 * Smart constructor for the only identity that reaches an argv. Rejecting the
 * malformed shapes here (rather than validating at the call site and throwing
 * the proof away) is what lets the runner treat a `PrRef` as already safe.
 */
export function parsePrRef(repo: string, number: string | number): PrRef | null {
  if (!REPO_RE.test(repo)) return null;
  const raw = typeof number === "number" ? String(number) : number;
  if (!PR_NUMBER_RE.test(raw)) return null;
  return { repo, number: Number(raw) as PrNumber };
}

export function prRefOwner(ref: PrRef): string {
  return ref.repo.slice(0, ref.repo.indexOf("/"));
}

export function prRefName(ref: PrRef): string {
  return ref.repo.slice(ref.repo.indexOf("/") + 1);
}

// ---------------------------------------------------------------------------
// Errors and the runner type
// ---------------------------------------------------------------------------

export type GhError =
  | { readonly kind: "not-runnable" }
  | { readonly kind: "not-authenticated" }
  | {
      readonly kind: "command-failed";
      readonly exitCode: number;
      readonly stderrDigest: string;
    };

export type GhRunner = (argv: readonly string[]) => Promise<Result<string, GhError>>;

/**
 * The raw, unparsed merge state. The typed `PrState` is C3's to construct.
 *
 * The lifecycle fields (#2401) are optional at the type level by ruling
 * E-MPC-CGBLK: they are included only when the GraphQL response carries them,
 * so a pre-extension response (as older scripted doubles replay) yields a
 * value without them rather than one padded with fabricated defaults.
 */
export interface RawPrState {
  readonly mergeable: string;
  readonly mergeStateStatus: string;
  readonly title: string;
  readonly body: string;
  readonly headRefOid?: string;
  readonly headRefName?: string;
  readonly state?: string;
  readonly mergedAt?: string | null;
  readonly mergeCommitOid?: string | null;
  readonly checkRollupState?: string | null;
}

// The mutable projection of RawPrState's lifecycle slice, built up field by
// field so an absent response field stays absent (ruling E-MPC-CGBLK).
type RawLifecycleFields = { state?: string; headRefOid?: string; headRefName?: string; mergedAt?: string | null; mergeCommitOid?: string | null; checkRollupState?: string | null };

// ---------------------------------------------------------------------------
// The process seam
// ---------------------------------------------------------------------------

export interface GhSpawnResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Injected so tests never touch a real `gh`. Rejects when the binary is absent. */
export type GhSpawn = (argv: readonly string[]) => Promise<GhSpawnResult>;

export const GH_VERSION_ARGV: readonly string[] = ["gh", "--version"];
export const GH_AUTH_ARGV: readonly string[] = [
  "gh",
  "auth",
  "status",
  "--hostname",
  "github.com",
];

/**
 * Contract (iii): stderr may quote a token or an authenticated URL, so it never
 * enters the error value. A short digest is enough to tell two failures apart
 * in a log without carrying any of the text.
 */
export function digestStderr(stderr: string): string {
  return `sha256:${createHash("sha256").update(stderr, "utf-8").digest("hex").slice(0, 16)}`;
}

/**
 * Contract (ii): the argv array is passed straight to `spawn` with no shell.
 * A token such as `query=a b; rm -rf /` therefore stays one argument.
 */
export const nodeGhSpawn: GhSpawn = (argv) =>
  new Promise<GhSpawnResult>((resolve, reject) => {
    const [command, ...args] = argv;
    if (command === undefined) {
      reject(new Error("empty argv"));
      return;
    }
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });

// ---------------------------------------------------------------------------
// Runner construction
// ---------------------------------------------------------------------------

/**
 * Contract (i): both probes run before the runner exists, so no caller can hold
 * a runner that has not been proven runnable and authenticated. Contract (iv):
 * every non-zero exit becomes a typed error — the runner never returns an empty
 * string that a caller could mistake for an empty result set.
 */
export async function createGhRunner(
  ghSpawn: GhSpawn = nodeGhSpawn,
): Promise<Result<GhRunner, GhError>> {
  let version: GhSpawnResult;
  try {
    version = await ghSpawn(GH_VERSION_ARGV);
  } catch {
    return { ok: false, error: { kind: "not-runnable" } };
  }
  if (version.code !== 0) return { ok: false, error: { kind: "not-runnable" } };

  let auth: GhSpawnResult;
  try {
    auth = await ghSpawn(GH_AUTH_ARGV);
  } catch {
    return { ok: false, error: { kind: "not-authenticated" } };
  }
  if (auth.code !== 0) return { ok: false, error: { kind: "not-authenticated" } };

  const runner: GhRunner = async (argv) => {
    let run: GhSpawnResult;
    try {
      run = await ghSpawn(argv);
    } catch {
      return { ok: false, error: { kind: "not-runnable" } };
    }
    if (run.code !== 0) {
      return {
        ok: false,
        error: {
          kind: "command-failed",
          exitCode: run.code,
          stderrDigest: digestStderr(run.stderr),
        },
      };
    }
    return { ok: true, value: run.stdout };
  };
  return { ok: true, value: runner };
}

// ---------------------------------------------------------------------------
// Raw pull-request state
// ---------------------------------------------------------------------------

export const PR_STATE_QUERY = `query($owner:String!,$name:String!,$number:Int!){
  repository(owner:$owner,name:$name){
    pullRequest(number:$number){ mergeable mergeStateStatus title body state mergedAt mergeCommit { oid statusCheckRollup { state } } headRefOid headRefName }
  }
}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads `mergeable` / `mergeStateStatus` as raw strings. Normalising them is
 * C3's job (ADR-2 keeps the parse in one place), which is also what keeps this
 * module a leaf.
 */
export async function fetchRawPrState(
  gh: GhRunner,
  ref: PrRef,
): Promise<Result<RawPrState, GhError>> {
  const out = await gh([
    "gh",
    "api",
    "graphql",
    "-f",
    `query=${PR_STATE_QUERY}`,
    "-F",
    `owner=${prRefOwner(ref)}`,
    "-F",
    `name=${prRefName(ref)}`,
    "-F",
    `number=${ref.number}`,
  ]);
  if (!out.ok) return out;

  let parsed: unknown;
  try {
    parsed = JSON.parse(out.value);
  } catch {
    return { ok: false, error: malformedResponse(out.value) };
  }
  const data = isRecord(parsed) ? parsed.data : undefined;
  const repository = isRecord(data) ? data.repository : undefined;
  const pullRequest = isRecord(repository) ? repository.pullRequest : undefined;
  if (!isRecord(pullRequest)) return { ok: false, error: malformedResponse(out.value) };
  const { mergeable, mergeStateStatus, title, body } = pullRequest;
  if (
    typeof mergeable !== "string" ||
    typeof mergeStateStatus !== "string" ||
    typeof title !== "string" ||
    typeof body !== "string"
  ) {
    return { ok: false, error: malformedResponse(out.value) };
  }
  return {
    ok: true,
    value: { mergeable, mergeStateStatus, title, body, ...lifecycleFields(pullRequest) },
  };
}

// Lifecycle fields (#2401), raw and unparsed like mergeable/mergeStateStatus.
// By ruling E-MPC-CGBLK each is included only when the response mentions it: a
// null in the response stays null (a fact — no merge instant), while a field
// the response never carried stays absent (no fabricated default).
function lifecycleFields(pullRequest: Record<string, unknown>): RawLifecycleFields {
  const fields: RawLifecycleFields = {};
  if (typeof pullRequest.state === "string") fields.state = pullRequest.state;
  if (typeof pullRequest.headRefOid === "string") fields.headRefOid = pullRequest.headRefOid;
  if (typeof pullRequest.headRefName === "string") fields.headRefName = pullRequest.headRefName;
  if ("mergedAt" in pullRequest) {
    fields.mergedAt = typeof pullRequest.mergedAt === "string" ? pullRequest.mergedAt : null;
  }
  if ("mergeCommit" in pullRequest) {
    const mergeCommit = pullRequest.mergeCommit;
    fields.mergeCommitOid =
      isRecord(mergeCommit) && typeof mergeCommit.oid === "string" ? mergeCommit.oid : null;
    const rollup = isRecord(mergeCommit) ? mergeCommit.statusCheckRollup : null;
    fields.checkRollupState =
      isRecord(rollup) && typeof rollup.state === "string" ? rollup.state : null;
  }
  return fields;
}

// ---------------------------------------------------------------------------
// The open pull request already published for a head branch
// ---------------------------------------------------------------------------

/** The slice of an existing pull request a create decision needs. */
export interface OpenPrSummary {
  readonly number: number;
  readonly url: string;
  readonly headRefName: string;
  readonly headRefOid: string;
  readonly title: string;
  readonly body: string;
}

export const PR_LIST_FIELDS = "number,url,headRefName,headRefOid,title,body";

/**
 * The open pull request for `head`, or null when there is none. `gh pr create`
 * failing on a duplicate is not evidence of what already exists, so the answer
 * is read rather than inferred from the failure text.
 */
export async function fetchOpenPrForHead(
  gh: GhRunner,
  repo: string,
  head: string,
): Promise<Result<OpenPrSummary | null, GhError>> {
  const out = await gh([
    "gh", "pr", "list",
    "--repo", repo,
    "--head", head,
    "--state", "open",
    "--json", PR_LIST_FIELDS,
    "--limit", "1",
  ]);
  if (!out.ok) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(out.value);
  } catch {
    return { ok: false, error: malformedResponse(out.value) };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: malformedResponse(out.value) };
  const first = parsed[0];
  if (first === undefined) return { ok: true, value: null };
  if (!isRecord(first)) return { ok: false, error: malformedResponse(out.value) };
  const { number, url, headRefName, headRefOid, title, body } = first;
  if (
    typeof number !== "number" || typeof url !== "string" || typeof headRefName !== "string" ||
    typeof headRefOid !== "string" || typeof title !== "string" || typeof body !== "string"
  ) {
    return { ok: false, error: malformedResponse(out.value) };
  }
  return { ok: true, value: { number, url, headRefName, headRefOid, title, body } };
}

// ---------------------------------------------------------------------------
// The merged pull request already published for a head branch
// ---------------------------------------------------------------------------

/** The slice of a merged pull request a create refusal names (#3109). */
export interface MergedPrSummary {
  readonly number: number;
  readonly url: string;
}

export const MERGED_PR_LIST_FIELDS = "number,url,state";

/**
 * The merged pull request for `head`, or null when there is none.
 *
 * The answer is taken from the row's own `state`, never from the query filter
 * alone: a row that does not declare `MERGED` evidences no merge, whichever
 * filter returned it. Reading the fact rather than trusting the argv is what
 * makes this a merge check instead of a duplicate-head check.
 */
export async function fetchMergedPrForHead(
  gh: GhRunner,
  repo: string,
  head: string,
): Promise<Result<MergedPrSummary | null, GhError>> {
  const out = await gh([
    "gh", "pr", "list",
    "--repo", repo,
    "--head", head,
    "--state", "merged",
    "--json", MERGED_PR_LIST_FIELDS,
    "--limit", "1",
  ]);
  if (!out.ok) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(out.value);
  } catch {
    return { ok: false, error: malformedResponse(out.value) };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: malformedResponse(out.value) };
  const first = parsed[0];
  if (first === undefined) return { ok: true, value: null };
  if (!isRecord(first)) return { ok: false, error: malformedResponse(out.value) };
  if (first.state !== "MERGED") return { ok: true, value: null };
  const { number, url } = first;
  if (typeof number !== "number" || typeof url !== "string") {
    return { ok: false, error: malformedResponse(out.value) };
  }
  return { ok: true, value: { number, url } };
}

/**
 * A malformed response is reported through the same typed channel as a non-zero
 * exit, with the body digested rather than echoed: a GraphQL error body can
 * carry an authenticated URL.
 */
function malformedResponse(body: string): GhError {
  return { kind: "command-failed", exitCode: 0, stderrDigest: digestStderr(body) };
}
