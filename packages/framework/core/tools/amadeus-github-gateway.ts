// amadeus-github-gateway.ts — shared GitHub transport and domain adapters.
//
// The only process boundary that talks to GitHub. It receives a validated
// GitHubRepository (plus a C6-issued permit for mutations), builds an exact
// immutable `gh` argument array, runs it through the injected process runner,
// parses the `--include` HTTP envelope + JSON body, and returns a typed C0
// `GitHubGatewayOutcome`. It owns NO state, mode, provenance, landing, retry,
// warning, or audit — those belong to Unit 4 (C6–C8). Failures never carry raw
// stdout / stderr: the summary is rebuilt from a fixed redaction template.
//
// Component map within this module:
//   G1 Repository Validator  — parseGitHubRepository / URL / issue number
//   G3 Argv Builder          — operation-specific exact argv
//   G5 HTTP Envelope Parser  — status/header/body byte separation
//   G6 Issue Parser / Finder — DTO validation, PR exclusion, marker filter
//   G7 Failure Normalizer    — classification, effect certainty, redaction
//   G8 Gateway               — orchestration returning C0 GitHubGatewayOutcome

import { validateFindingMutationPermit } from "./amadeus-finding-capability.ts";
import type {
  FindingGitHubGateway,
  FindingMutationPermit,
} from "./amadeus-finding-types.ts";
import { validateMirrorMutationPermit } from "./amadeus-mirror-capability.ts";
import { createMirrorProjectGatewayMethods } from "./amadeus-mirror-project-gateway.ts";
export {
  ADD_PROJECT_ITEM_MUTATION,
  addProjectItemArgv,
  graphqlArgv,
  LIST_PROJECT_ITEMS_QUERY,
  listProjectItemsArgv,
  parseProjectFields,
  parseProjectItemsView,
  PROJECT_ITEMS_PER_PAGE,
  RESOLVE_PROJECT_FIELDS_QUERY,
  resolveProjectFieldsArgv,
  UPDATE_PROJECT_ITEM_FIELD_MUTATION,
  updateProjectItemSingleSelectFieldArgv,
} from "./amadeus-mirror-project-gateway.ts";
import type {
  MirrorGitHubGateway,
  MirrorMutationPermit,
} from "./amadeus-mirror-types.ts";
import type { MirrorLabelGateway } from "./amadeus-mirror-labels.ts";
import type {
  CreateGitHubIssueInput,
  GitHubGatewayOutcome,
  GitHubMutationEffect,
  GitHubRepository,
  RemoteGitHubIssue,
} from "./amadeus-github-types.ts";
import type {
  MirrorOperationProfile,
  MirrorProcessResult,
  MirrorProcessRunner,
} from "./amadeus-process-runner.ts";

const MAX_BODY_BYTES = 256 * 1024;

// --- G1 Repository Validator -------------------------------------------------

// owner / name: ASCII alphanumerics and - _ . only. The class excludes
// whitespace and slash, so a padded value is rejected without trimming.
const REPO_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

export function parseGitHubRepository(
  owner: string,
  name: string,
): GitHubRepository | null {
  if (!REPO_SEGMENT_RE.test(owner) || !REPO_SEGMENT_RE.test(name)) return null;
  const lowerOwner = owner.toLowerCase();
  const lowerName = name.toLowerCase();
  // Single lowercase representation; no separate display-case field is kept.
  return {
    owner: lowerOwner,
    name: lowerName,
    canonical: `${lowerOwner}/${lowerName}`,
  };
}

// Remote `repository_url` is https://api.github.com/repos/{owner}/{name}. The
// path must be exactly those two identity segments under /repos.
export function parseRepositoryUrlIdentity(
  url: string,
): GitHubRepository | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.host !== "api.github.com") {
    return null;
  }
  const segments = parsed.pathname.split("/").filter((s) => s.length > 0);
  if (segments.length !== 3 || segments[0] !== "repos") return null;
  return parseGitHubRepository(segments[1], segments[2]);
}

export function parseIssueNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

// --- G3 Argv Builder ---------------------------------------------------------

function issuesPath(repo: GitHubRepository): string {
  return `repos/${repo.canonical}/issues`;
}

export function versionArgv(): readonly string[] {
  return ["--version"];
}

export function authArgv(): readonly string[] {
  return ["auth", "status", "--hostname", "github.com"];
}

export function createArgv(
  repo: GitHubRepository,
  input: CreateGitHubIssueInput,
): readonly string[] {
  const args: string[] = [
    "api",
    "--include",
    "--method",
    "POST",
    issuesPath(repo),
    "-f",
    `title=${input.title}`,
    "-f",
    `body=${input.body}`,
  ];
  for (const label of input.labels) {
    args.push("-f", `labels[]=${label}`);
  }
  return args;
}

// Page size for the issue walk. One request fetches exactly one page: a short
// page (fewer than this many elements, empty included) is the last one.
export const FIND_PER_PAGE = 100;

// `--paginate --slurp` was removed here: gh interleaves the HTTP blocks with the
// per-page arrays inside one outer array, which is not a shape this gateway can
// read back page-for-page. Asking for one explicit page keeps every response a
// plain `<block><page array>` that the envelope parser already handles.
//
// The walk in findIssuesByMarker follows from that: the old
// `outer.length === pageCount` invariant becomes per request — one request must
// yield exactly one HTTP block and exactly one page array — and the walk stops
// on a page shorter than FIND_PER_PAGE. That is the same end signal the slurped
// form relied on (measured on gh 2.96.0: a page past the last one is `200` with
// an empty array).
export function findArgv(
  repo: GitHubRepository,
  page: number,
): readonly string[] {
  return [
    "api",
    "--include",
    "--method",
    "GET",
    issuesPath(repo),
    "-f",
    "state=all",
    "-f",
    `per_page=${FIND_PER_PAGE}`,
    "-f",
    `page=${page}`,
  ];
}

export function viewArgv(
  repo: GitHubRepository,
  issueNumber: number,
): readonly string[] {
  return ["api", "--include", "--method", "GET", `${issuesPath(repo)}/${issueNumber}`];
}

// Every comment on one issue, in one request (#3181). `--include` is
// deliberately ABSENT here, unlike every other verb above: gh interleaves the
// per-page HTTP blocks with the per-page arrays under `--paginate`, which is
// not a shape parseHttpEnvelope can read back (the same measurement that made
// findArgv walk explicit pages). Without `--include`, gh merges the pages into
// ONE plain JSON array, so the comment walk reads a bare body and classifies
// failure from the exit code alone — no HTTP status is available to it.
export function commentsArgv(
  repo: GitHubRepository,
  issueNumber: number,
): readonly string[] {
  return [
    "api",
    "--paginate",
    "--method",
    "GET",
    `${issuesPath(repo)}/${issueNumber}/comments`,
    // Same page size as the issue walk, from the same constant: at the API
    // default of 30 a long cross-review costs extra round trips for nothing.
    "-f",
    `per_page=${FIND_PER_PAGE}`,
  ];
}

export function editArgv(
  repo: GitHubRepository,
  issueNumber: number,
  body: string,
): readonly string[] {
  return [
    "api",
    "--include",
    "--method",
    "PATCH",
    `${issuesPath(repo)}/${issueNumber}`,
    "-f",
    `body=${body}`,
  ];
}

export function closeArgv(
  repo: GitHubRepository,
  issueNumber: number,
): readonly string[] {
  return [
    "api",
    "--include",
    "--method",
    "PATCH",
    `${issuesPath(repo)}/${issueNumber}`,
    "-f",
    "state=closed",
  ];
}

// --- G5 HTTP Envelope Parser -------------------------------------------------

export type EnvelopeParse =
  | { kind: "ok"; statuses: readonly number[]; jsonText: string }
  | { kind: "http-error"; status: number }
  | { kind: "malformed" };

const STATUS_LINE_RE = /^HTTP\/[0-9.]+ (\d{3})(?: .*)?$/;

// End of the line starting at `pos`: `end` excludes the terminator, `next` is
// the first byte after it. Both CRLF and a bare LF terminate a line.
//
// This is not a compatibility layer for an older gh — it is what gh actually
// writes. Measured on `gh version 2.96.0`: the status line ends with a bare LF
// while the header lines that follow end with CRLF, so a CRLF-only reader
// swallowed the first header into the status line and rejected every response
// (issue #1498, all five verbs). Accepting either terminator on either line is
// the recovery; no other envelope semantics change.
function findLineEnd(
  bin: string,
  pos: number,
): { end: number; next: number } | null {
  const lf = bin.indexOf("\n", pos);
  if (lf < 0) return null;
  const end = lf > pos && bin[lf - 1] === "\r" ? lf - 1 : lf;
  return { end, next: lf + 1 };
}

// Grammar: P HTTP blocks
//   `HTTP/<ver> <3-digit> <reason> EOL *(header EOL) EOL`   (EOL = LF or CRLF)
// then a single JSON body (object for a single op, array for a page), an
// optional trailing LF, and EOF. Header bytes are consumed raw; the tail
// after the last blank line is the body, at whatever byte position the walk
// stops. Shared by parseHttpEnvelope (below) and parseHttpEnvelopeFinalStatus
// (#2020 CodeRabbit follow-up): both need the identical CRLF/LF-tolerant hop
// walk (see findLineEnd's own comment for why bare-LF status lines matter),
// and only differ in how they judge the collected statuses.
function walkHttpEnvelopeStatuses(
  bin: string,
): { statuses: readonly number[]; bodyPos: number } | null {
  let pos = 0;
  const statuses: number[] = [];

  while (bin.startsWith("HTTP/", pos)) {
    const statusEol = findLineEnd(bin, pos);
    if (statusEol === null) return null;
    const match = STATUS_LINE_RE.exec(bin.slice(pos, statusEol.end));
    if (match === null) return null;
    statuses.push(Number(match[1]));

    let headerPos = statusEol.next;
    for (;;) {
      const headerEol = findLineEnd(bin, headerPos);
      if (headerEol === null) return null;
      if (headerEol.end === headerPos) {
        headerPos = headerEol.next; // blank line terminates the header block
        break;
      }
      headerPos = headerEol.next;
    }
    pos = headerPos;
  }

  if (statuses.length === 0) return null;
  return { statuses, bodyPos: pos };
}

// The body-shape check shared by both envelope readers: a single JSON body
// (object for a single op, array for a page), trailing LF optional.
function extractEnvelopeBody(
  bin: string,
  bodyPos: number,
  mode: "single" | "array",
): string | null {
  let bodyBin = bin.slice(bodyPos);
  if (bodyBin.endsWith("\n")) bodyBin = bodyBin.slice(0, -1);
  if (bodyBin.length === 0) return null;
  const opener = bodyBin[0];
  if (mode === "single" ? opener !== "{" : opener !== "[") return null;
  return bodyBin;
}

// Any non-2xx status short-circuits to http-error so the failure normalizer
// can read the number. Used by every caller except isPullRequest (below).
export function parseHttpEnvelope(
  stdout: Buffer,
  mode: "single" | "array",
): EnvelopeParse {
  const bin = stdout.toString("latin1");
  const walk = walkHttpEnvelopeStatuses(bin);
  if (walk === null) return { kind: "malformed" };
  const { statuses, bodyPos } = walk;

  const firstBad = statuses.find((s) => s < 200 || s >= 300);
  if (firstBad !== undefined) return { kind: "http-error", status: firstBad };
  if (mode === "single" && statuses.length !== 1) return { kind: "malformed" };

  const bodyBin = extractEnvelopeBody(bin, bodyPos, mode);
  if (bodyBin === null) return { kind: "malformed" };

  return {
    kind: "ok",
    statuses,
    jsonText: Buffer.from(bodyBin, "latin1").toString("utf-8"),
  };
}

// #2020 CodeRabbit follow-up: parseHttpEnvelope's firstBad short-circuit
// (comment above) is deliberately strict for its many other single/array
// callers, but that makes it wrong for isPullRequest — `gh api --include` on
// a resource read prints one status line per hop of a redirect chain (and a
// leading 1xx informational line before the real status), so the first
// status is not necessarily the outcome, exactly the shape #2020 already
// fixed for the label path via finalLabelHttpStatus. This variant walks the
// SAME envelope grammar but judges on the FINAL non-1xx status instead, and
// (unlike parseHttpEnvelope) does not reject a multi-status envelope in
// "single" mode — a redirect/1xx chain legitimately produces more than one
// status line for a single logical read.
export function parseHttpEnvelopeFinalStatus(
  stdout: Buffer,
  mode: "single" | "array",
): EnvelopeParse {
  const bin = stdout.toString("latin1");
  const walk = walkHttpEnvelopeStatuses(bin);
  if (walk === null) return { kind: "malformed" };
  const { statuses, bodyPos } = walk;

  const finalStatus = finalLabelHttpStatus(statuses);
  // Only 1xx informational lines were observed — no final status to judge.
  if (finalStatus === null) return { kind: "malformed" };
  if (finalStatus < 200 || finalStatus >= 300) {
    return { kind: "http-error", status: finalStatus };
  }

  const bodyBin = extractEnvelopeBody(bin, bodyPos, mode);
  if (bodyBin === null) return { kind: "malformed" };

  return {
    kind: "ok",
    statuses,
    jsonText: Buffer.from(bodyBin, "latin1").toString("utf-8"),
  };
}

// --- G6 Body scanner + Issue parser / Finder ---------------------------------

function utf8Len(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

function isJsonWs(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

type StringRead =
  | { ok: true; end: number; byteLength: number; raw: string }
  | { ok: false };

// Advance over a JSON escape sequence starting at the backslash; report decoded
// UTF-8 byte length and the next index. \u pairs (surrogates) are combined.
function readEscape(
  text: string,
  backslash: number,
): { bytes: number; next: number } | null {
  const esc = text[backslash + 1];
  if (esc === undefined) return null;
  if (esc !== "u") {
    return '"\\/bfnrt'.includes(esc) ? { bytes: 1, next: backslash + 2 } : null;
  }
  const hex = text.slice(backslash + 2, backslash + 6);
  if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
  let cp = Number.parseInt(hex, 16);
  let next = backslash + 6;
  const lowHex = text.slice(next + 2, next + 6);
  if (
    cp >= 0xd800 &&
    cp <= 0xdbff &&
    text.slice(next, next + 2) === "\\u" &&
    /^[0-9a-fA-F]{4}$/.test(lowHex)
  ) {
    const low = Number.parseInt(lowHex, 16);
    if (low >= 0xdc00 && low <= 0xdfff) {
      cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00);
      next += 6;
    }
  }
  return { bytes: utf8Len(cp), next };
}

// Read a JSON string starting at an opening quote; report decoded UTF-8 byte
// length and the raw slice for short key comparison.
function readJsonString(text: string, start: number): StringRead {
  const n = text.length;
  let i = start + 1;
  let byteLength = 0;
  while (i < n) {
    const ch = text[i];
    if (ch === '"') {
      return { ok: true, end: i + 1, byteLength, raw: text.slice(start + 1, i) };
    }
    if (ch === "\\") {
      const decoded = readEscape(text, i);
      if (decoded === null) return { ok: false };
      byteLength += decoded.bytes;
      i = decoded.next;
      continue;
    }
    const cp = text.codePointAt(i);
    if (cp === undefined) return { ok: false };
    byteLength += utf8Len(cp);
    i += cp > 0xffff ? 2 : 1;
  }
  return { ok: false };
}

// Scan raw JSON text before JSON.parse: reject any `body` string value whose
// decoded UTF-8 length exceeds 256 KiB, and reject a malformed string. Total
// input is already bounded by the runner's stdout cap.
export function scanBodies(text: string): "ok" | "oversize" | "malformed" {
  const n = text.length;
  let i = 0;
  let pendingKey: string | null = null;

  while (i < n) {
    const ch = text[i];
    if (ch === '"') {
      const read = readJsonString(text, i);
      if (!read.ok) return "malformed";
      let j = read.end;
      while (j < n && isJsonWs(text[j])) j++;
      if (text[j] === ":") {
        pendingKey = read.raw;
      } else {
        if (pendingKey === "body" && read.byteLength > MAX_BODY_BYTES) {
          return "oversize";
        }
        pendingKey = null;
      }
      i = read.end;
      continue;
    }
    if (ch !== ":" && !isJsonWs(ch) && ch !== ",") {
      // A structural char or a non-string primitive value clears any pending
      // key (its value is not a string, so the body-size rule does not apply).
      pendingKey = null;
    }
    i++;
  }
  return "ok";
}

function isPullRequestEntry(element: unknown): boolean {
  return (
    typeof element === "object" &&
    element !== null &&
    "pull_request" in element &&
    (element as Record<string, unknown>).pull_request != null
  );
}

// Validate one remote element into a RemoteGitHubIssue bound to the request
// repository. Returns null (→ invalid-response) on any shape or repo mismatch.
export function parseIssueObject(
  element: unknown,
  repo: GitHubRepository,
): RemoteGitHubIssue | null {
  if (typeof element !== "object" || element === null) return null;
  const obj = element as Record<string, unknown>;

  const number = parseIssueNumber(obj.number);
  if (number === null) return null;
  if (typeof obj.title !== "string") return null;
  const title = obj.title;

  const rawBody = obj.body;
  if (rawBody !== null && typeof rawBody !== "string") return null;
  const body = rawBody === null ? "" : rawBody;

  let state: "OPEN" | "CLOSED";
  if (obj.state === "open") state = "OPEN";
  else if (obj.state === "closed") state = "CLOSED";
  else return null;

  if (typeof obj.repository_url !== "string") return null;
  const responseRepo = parseRepositoryUrlIdentity(obj.repository_url);
  if (responseRepo === null || responseRepo.canonical !== repo.canonical) {
    return null;
  }

  return { repository: repo, number, title, body, state };
}

// --- G6b Issue comment parser (evidence read surface, #3181) -----------------

// One issue comment, reduced to what the issue-evidence artifact records:
// identity, verbatim body, authorship, time, and the permalink the artifact
// cites. Declared here rather than in amadeus-github-types.ts because only the
// evidence adapter below produces it.
export type RemoteGitHubIssueComment = Readonly<{
  id: number;
  body: string;
  createdAt: string;
  authorLogin: string;
  htmlUrl: string;
}>;

// Remote `issue_url` is https://api.github.com/repos/{owner}/{name}/issues/{n}.
// parseRepositoryUrlIdentity demands exactly the two identity segments under
// /repos, so the issue-scoped form gets its own split — but the identity still
// goes through parseGitHubRepository, and that is what makes the comparison
// case-insensitive: GitHub echoes the repository's REAL casing here while our
// canonical is lowercased, so a literal prefix match would reject every repo
// with a capital letter in its owner or name.
function parseIssueUrlRepository(url: string): GitHubRepository | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.host !== "api.github.com") {
    return null;
  }
  const segments = parsed.pathname.split("/").filter((s) => s.length > 0);
  if (segments.length !== 5 || segments[0] !== "repos" || segments[3] !== "issues") {
    return null;
  }
  return parseGitHubRepository(segments[1], segments[2]);
}

// Validate one remote comment element, binding it to the request repository the
// same way parseIssueObject binds an issue: the remote `issue_url` names the
// repo the comment actually hangs off, so a response for another repository is
// rejected rather than transcribed into this intent's evidence.
function parseIssueCommentObject(
  element: unknown,
  repo: GitHubRepository,
): RemoteGitHubIssueComment | null {
  if (typeof element !== "object" || element === null) return null;
  const obj = element as Record<string, unknown>;

  const id = parseIssueNumber(obj.id);
  if (id === null) return null;

  const rawBody = obj.body;
  if (rawBody !== null && typeof rawBody !== "string") return null;

  if (typeof obj.created_at !== "string") return null;
  if (typeof obj.html_url !== "string") return null;
  if (typeof obj.issue_url !== "string") return null;
  const commentRepo = parseIssueUrlRepository(obj.issue_url);
  if (commentRepo === null || commentRepo.canonical !== repo.canonical) return null;

  const user = obj.user;
  if (typeof user !== "object" || user === null) return null;
  const authorLogin = (user as Record<string, unknown>).login;
  if (typeof authorLogin !== "string") return null;

  return {
    id,
    body: rawBody === null ? "" : rawBody,
    createdAt: obj.created_at,
    authorLogin,
    htmlUrl: obj.html_url,
  };
}

// Parse a comments page. Fail-closed: one bad element rejects the WHOLE list
// rather than yielding a shortened one, because a partial evidence capture
// would read as a complete record of the cross-review.
export function parseIssueComments(
  payload: unknown,
  repo: GitHubRepository,
): GitHubGatewayOutcome<readonly RemoteGitHubIssueComment[]> {
  if (!Array.isArray(payload)) return invalidResponse("read-only");
  const comments: RemoteGitHubIssueComment[] = [];
  for (const element of payload) {
    const parsed = parseIssueCommentObject(element, repo);
    if (parsed === null) return invalidResponse("read-only");
    comments.push(parsed);
  }
  return ok<readonly RemoteGitHubIssueComment[]>(comments);
}

// --- G7 Failure Normalizer / Redactor ---------------------------------------

type OpKind = "read-only" | "mutation";

type Failure = Extract<GitHubGatewayOutcome<unknown>, { kind: "failure" }>;

type Classification = Failure["classification"];

// Non-secret substrings that positively identify an OS transport failure. Used
// only to classify command failures as `network`; never transcribed anywhere.
const NETWORK_SIGNALS: readonly string[] = [
  "could not resolve host",
  "could not resolve",
  "no such host",
  "connection refused",
  "connection reset",
  "network is unreachable",
  "i/o timeout",
  "dial tcp",
];

function hasNetworkSignal(stderrTail: string): boolean {
  const lower = stderrTail.toLowerCase();
  return NETWORK_SIGNALS.some((signal) => lower.includes(signal));
}

function effectForOp(op: OpKind, started: boolean): GitHubMutationEffect {
  if (op === "read-only") return "no-effect-confirmed";
  return started ? "outcome-unknown" : "not-started";
}

function redactSummary(
  classification: Classification,
  effect: GitHubMutationEffect,
  exitCode: number | null,
  httpStatus: number | null,
): string {
  const exit = exitCode === null ? "none" : String(exitCode);
  const http = httpStatus === null ? "none" : String(httpStatus);
  return `GitHub unavailable (${classification}; ${effect}; exit=${exit}; http=${http})`;
}

function failure(
  classification: Classification,
  retryable: boolean,
  effect: GitHubMutationEffect,
  exitCode: number | null,
  httpStatus: number | null,
): Failure {
  return {
    kind: "failure",
    classification,
    summary: redactSummary(classification, effect, exitCode, httpStatus),
    retryable,
    effect,
  };
}

type HttpStatusClassification = Readonly<{ classification: Classification; retryable: boolean }>;

function classifyHttpStatus(
  status: number,
): HttpStatusClassification {
  if (status === 429) return { classification: "rate-limit", retryable: true };
  if (status === 401) {
    return { classification: "unauthenticated", retryable: false };
  }
  if (status === 403) return { classification: "permission", retryable: false };
  if (status >= 500) return { classification: "api", retryable: true };
  return { classification: "api", retryable: false };
}

// Map a non-`exited` runner result (spawn error / timeout / capacity /
// termination failure) to a typed failure. Read-only effect is always
// no-effect-confirmed; mutation is not-started only on spawn error.
function processFailure(
  result: Exclude<MirrorProcessResult, { kind: "exited" }>,
  op: OpKind,
): Failure {
  if (result.kind === "spawn-error") {
    return failure("not-installed", false, effectForOp(op, false), null, null);
  }
  const started = true;
  if (result.termination.kind === "termination-failed") {
    return failure("command", false, effectForOp(op, started), null, null);
  }
  if (result.kind === "timed-out") {
    return failure("network", true, effectForOp(op, started), null, null);
  }
  // capacity-exceeded
  return failure("invalid-response", false, effectForOp(op, started), null, null);
}

// --- G8 Gateway --------------------------------------------------------------

type ApiInterpretation =
  | { kind: "success"; jsonText: string; pageCount: number }
  | { kind: "failure"; failure: Failure };

function interpretApiResult(
  result: MirrorProcessResult,
  mode: "single" | "array",
  op: OpKind,
  // #2020 CodeRabbit follow-up: "final-status" swaps in
  // parseHttpEnvelopeFinalStatus (tolerates a leading 1xx/redirect hop,
  // judges on the final status) instead of parseHttpEnvelope's strict
  // firstBad short-circuit. Every existing caller omits this and keeps the
  // original strict behavior; only isPullRequest opts in.
  envelopeMode: "strict" | "final-status" = "strict",
): ApiInterpretation {
  if (result.kind !== "exited") {
    return { kind: "failure", failure: processFailure(result, op) };
  }

  const env =
    envelopeMode === "final-status"
      ? parseHttpEnvelopeFinalStatus(result.stdout, mode)
      : parseHttpEnvelope(result.stdout, mode);
  if (env.kind === "http-error") {
    const { classification, retryable } = classifyHttpStatus(env.status);
    return {
      kind: "failure",
      failure: failure(
        classification,
        retryable,
        effectForOp(op, true),
        result.exitCode,
        env.status,
      ),
    };
  }
  if (env.kind === "malformed") {
    if (result.exitCode !== 0) {
      const classification: Classification = hasNetworkSignal(result.stderrTail)
        ? "network"
        : "command";
      return {
        kind: "failure",
        failure: failure(
          classification,
          classification === "network",
          effectForOp(op, true),
          result.exitCode,
          null,
        ),
      };
    }
    return {
      kind: "failure",
      failure: failure(
        "invalid-response",
        false,
        effectForOp(op, true),
        result.exitCode,
        null,
      ),
    };
  }
  // env.kind === "ok"
  if (result.exitCode !== 0) {
    return {
      kind: "failure",
      failure: failure(
        "invalid-response",
        false,
        effectForOp(op, true),
        result.exitCode,
        env.statuses[0] ?? null,
      ),
    };
  }
  return { kind: "success", jsonText: env.jsonText, pageCount: env.statuses.length };
}

function invalidResponse(op: OpKind): Failure {
  return failure("invalid-response", false, effectForOp(op, true), null, null);
}

// Tool readiness: gh installed, then gh authenticated. One definition shared by
// every adapter below — the mirror gateway exposes it per-repository (the repo
// is ignored: readiness probes the tool, not a mutation target) and the
// evidence adapter exposes it bare.
async function probeReadiness(
  runner: MirrorProcessRunner,
): Promise<GitHubGatewayOutcome<void>> {
  const version = await runner.run({
    executable: "gh",
    args: versionArgv(),
    profile: "version-auth",
  });
  if (version.kind !== "exited") return processFailure(version, "read-only");
  if (version.exitCode !== 0) {
    return failure("not-installed", false, "no-effect-confirmed", version.exitCode, null);
  }

  const auth = await runner.run({
    executable: "gh",
    args: authArgv(),
    profile: "version-auth",
  });
  if (auth.kind !== "exited") return processFailure(auth, "read-only");
  if (auth.exitCode !== 0) {
    return failure("unauthenticated", false, "no-effect-confirmed", auth.exitCode, null);
  }
  return ok<void>(undefined);
}

// --- GraphQL body interpretation (BR-U1-7) -----------------------------------
//
// GraphQL answers HTTP 200 even when the operation failed, carrying the reason
// in `body.errors[].type`. This table is deliberately CONSERVATIVE: only the
// error types whose meaning is unambiguous get a specific class, and anything
// unrecognised (including an absent `type`) falls to a non-retryable `api`.
//
// PROVISIONAL — the mapping is fixed against real `gh api graphql` responses in
// this Unit's real-Project verification step; until that measurement lands, no
// entry here is treated as measured fact.
const GRAPHQL_ERROR_CLASSES: Readonly<
  Record<string, { classification: Classification; retryable: boolean }>
> = {
  RATE_LIMITED: { classification: "rate-limit", retryable: true },
  FORBIDDEN: { classification: "permission", retryable: false },
  INSUFFICIENT_SCOPES: { classification: "permission", retryable: false },
  UNAUTHORIZED: { classification: "unauthenticated", retryable: false },
  SERVICE_UNAVAILABLE: { classification: "api", retryable: true },
  INTERNAL: { classification: "api", retryable: true },
  NOT_FOUND: { classification: "api", retryable: false },
};

export type GraphqlBodyOutcome =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "errors"; classification: Classification; retryable: boolean }
  | { kind: "malformed" };

// Judge an already-successful HTTP envelope's GraphQL body. Only the error
// `type` discriminator is read; no message text is retained, so nothing from the
// remote reaches a summary.
export function interpretGraphqlResult(parse: EnvelopeParse): GraphqlBodyOutcome {
  if (parse.kind !== "ok") return { kind: "malformed" };
  if (scanBodies(parse.jsonText) !== "ok") return { kind: "malformed" };
  let body: unknown;
  try {
    body = JSON.parse(parse.jsonText);
  } catch {
    return { kind: "malformed" };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { kind: "malformed" };
  }
  const record = body as Record<string, unknown>;
  const errors = record.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return { kind: "errors", ...classifyGraphqlErrors(errors) };
  }
  const data = record.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { kind: "malformed" };
  }
  return { kind: "ok", data: data as Record<string, unknown> };
}

type ErrorClass = Readonly<{ classification: Classification; retryable: boolean }>;

// The most actionable error wins: a retryable class is reported over a terminal
// one so a transient rate limit inside a mixed batch is not buried.
function classifyGraphqlErrors(errors: readonly unknown[]): ErrorClass {
  let firstMapped: ErrorClass | undefined;
  for (const entry of errors) {
    const type =
      typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>).type
        : undefined;
    const mapped =
      typeof type === "string" ? GRAPHQL_ERROR_CLASSES[type] : undefined;
    if (mapped === undefined) continue;
    if (mapped.retryable) return mapped;
    firstMapped ??= mapped;
  }
  return firstMapped ?? { classification: "api", retryable: false };
}

function ok<T>(value: T): GitHubGatewayOutcome<T> {
  return { kind: "ok", value };
}

// Parse a single-object success body into a RemoteGitHubIssue.
function parseSingleIssue(
  interp: Extract<ApiInterpretation, { kind: "success" }>,
  repo: GitHubRepository,
  op: OpKind,
): GitHubGatewayOutcome<RemoteGitHubIssue> {
  if (scanBodies(interp.jsonText) !== "ok") return invalidResponse(op);
  let parsed: unknown;
  try {
    parsed = JSON.parse(interp.jsonText);
  } catch {
    return invalidResponse(op);
  }
  const issue = parseIssueObject(parsed, repo);
  return issue === null ? invalidResponse(op) : ok(issue);
}

function createCombinedGitHubGateway(
  runner: MirrorProcessRunner,
): MirrorGitHubGateway & FindingGitHubGateway {
  const requireValidPermit = (
    permit: MirrorMutationPermit,
    expected: Parameters<typeof validateMirrorMutationPermit>[1],
  ): void => {
    if (!validateMirrorMutationPermit(permit, expected)) {
      // A forged / mismatched permit is an authority defect: fail loud before
      // any process starts rather than returning a recoverable outcome.
      throw new Error(
        "mirror gateway: rejected mutation permit (forged or mismatched binding)",
      );
    }
  };

  const permitRepo = (permit: MirrorMutationPermit): GitHubRepository =>
    (permit as unknown as { repository: GitHubRepository }).repository;

  const permitIssueNumber = (permit: MirrorMutationPermit): number | null =>
    (permit as unknown as { issueNumber: number | null }).issueNumber;

  const findingPermitRepo = (permit: FindingMutationPermit): GitHubRepository =>
    (permit as unknown as { repository: GitHubRepository }).repository;

  const runApi = (args: readonly string[], profile: MirrorOperationProfile): Promise<MirrorProcessResult> =>
    runner.run({ executable: "gh", args, profile });

  // Run one GraphQL operation and reduce it to `data` or a typed failure. The
  // HTTP envelope is judged first (transport / status), then the body's own
  // `errors` array, because GraphQL reports operation failure inside a 200.
  const runGraphql = async (
    args: readonly string[],
    op: OpKind,
  ): Promise<GitHubGatewayOutcome<Record<string, unknown>>> => {
    const result = await runApi(args, "single");
    if (result.kind !== "exited") {
      return processFailure(result, op);
    }
    const envelope = parseHttpEnvelope(result.stdout, "single");
    if (envelope.kind === "http-error") {
      const { classification, retryable } = classifyHttpStatus(envelope.status);
      return failure(
        classification,
        retryable,
        effectForOp(op, true),
        result.exitCode,
        envelope.status,
      );
    }
    if (envelope.kind === "malformed" || result.exitCode !== 0) {
      const classification: Classification =
        envelope.kind === "malformed" &&
        result.exitCode !== 0 &&
        hasNetworkSignal(result.stderrTail)
          ? "network"
          : "invalid-response";
      return failure(
        classification,
        classification === "network",
        effectForOp(op, true),
        result.exitCode,
        null,
      );
    }
    const body = interpretGraphqlResult(envelope);
    if (body.kind === "errors") {
      return failure(
        body.classification,
        body.retryable,
        effectForOp(op, true),
        result.exitCode,
        null,
      );
    }
    if (body.kind === "malformed") {
      return invalidResponse(op);
    }
    return ok(body.data);
  };

  const projectMethods = createMirrorProjectGatewayMethods({
    run: runGraphql,
    invalidResponse,
  });

  return {
    readiness(repository) {
      void repository; // readiness probes the tool, not a repo mutation target
      return probeReadiness(runner);
    },

    async createIssue(permit, input) {
      const repository = permitRepo(permit);
      requireValidPermit(permit, {
        operation: "create",
        repository,
        issueNumber: null,
      });
      const result = await runApi(createArgv(repository, input), "single");
      const interp = interpretApiResult(result, "single", "mutation");
      if (interp.kind === "failure") return interp.failure;
      return parseSingleIssue(interp, repository, "mutation");
    },

    async createFindingIssue(permit, input) {
      const repository = findingPermitRepo(permit);
      const marker = input.body.match(
        /^(<!-- amadeus-finding:[a-f0-9]{64} -->)(?:\r?\n|$)/,
      )?.[1];
      if (
        marker === undefined ||
        !validateFindingMutationPermit(permit, { repository, marker })
      ) {
        throw new Error(
          "mirror gateway: rejected finding mutation permit (forged or mismatched marker)",
        );
      }
      const result = await runApi(createArgv(repository, input), "single");
      const interp = interpretApiResult(result, "single", "mutation");
      if (interp.kind === "failure") return interp.failure;
      return parseSingleIssue(interp, repository, "mutation");
    },

    // Deliberate full walk of every issue (state=all) with a client-side
    // marker filter, NOT the Search API: search indexing lags writes, so a
    // just-created issue can be invisible to search and the dedup guard would
    // file a duplicate. The cost is linear in the repository's issue count
    // (FIND_PER_PAGE-sized sequential requests) and is accepted for the
    // consistency guarantee.
    async findIssuesByMarker(repository, marker) {
      const issues: RemoteGitHubIssue[] = [];
      for (let page = 1; ; page++) {
        const result = await runApi(findArgv(repository, page), "paginated");
        const interp = interpretApiResult(result, "array", "read-only");
        if (interp.kind === "failure") return interp.failure;
        if (interp.pageCount !== 1) return invalidResponse("read-only");

        if (scanBodies(interp.jsonText) !== "ok") {
          return invalidResponse("read-only");
        }
        let elements: unknown;
        try {
          elements = JSON.parse(interp.jsonText);
        } catch {
          return invalidResponse("read-only");
        }
        if (!Array.isArray(elements)) return invalidResponse("read-only");

        for (const element of elements) {
          if (isPullRequestEntry(element)) continue;
          const issue = parseIssueObject(element, repository);
          if (issue === null) return invalidResponse("read-only");
          issues.push(issue);
        }
        if (elements.length < FIND_PER_PAGE) break;
      }
      const matches = issues.filter((issue) => issue.body.includes(marker));
      return ok<readonly RemoteGitHubIssue[]>(matches);
    },

    async viewIssue(repository, issueNumber) {
      const number = parseIssueNumber(issueNumber);
      if (number === null) return invalidResponse("read-only");
      const result = await runApi(viewArgv(repository, number), "single");
      const interp = interpretApiResult(result, "single", "read-only");
      if (interp.kind === "failure") return interp.failure;
      return parseSingleIssue(interp, repository, "read-only");
    },

    async editIssue(permit, body) {
      const repository = permitRepo(permit);
      const issueNumber = permitIssueNumber(permit);
      requireValidPermit(permit, { operation: "sync", repository, issueNumber });
      const number = parseIssueNumber(issueNumber);
      if (number === null) {
        return failure("invalid-response", false, "not-started", null, null);
      }
      const result = await runApi(editArgv(repository, number, body), "single");
      const interp = interpretApiResult(result, "single", "mutation");
      if (interp.kind === "failure") return interp.failure;
      return parseSingleIssue(interp, repository, "mutation");
    },

    async closeIssue(permit) {
      const repository = permitRepo(permit);
      const issueNumber = permitIssueNumber(permit);
      requireValidPermit(permit, { operation: "close", repository, issueNumber });
      const number = parseIssueNumber(issueNumber);
      if (number === null) {
        return failure("invalid-response", false, "not-started", null, null);
      }
      const result = await runApi(closeArgv(repository, number), "single");
      const interp = interpretApiResult(result, "single", "mutation");
      if (interp.kind === "failure") return interp.failure;
      return parseSingleIssue(interp, repository, "mutation");
    },
    ...projectMethods,
  };
}

export function createMirrorGitHubGatewayAdapter(
  runner: MirrorProcessRunner,
): MirrorGitHubGateway {
  return createCombinedGitHubGateway(runner);
}

export function createFindingGitHubGatewayAdapter(
  runner: MirrorProcessRunner,
): FindingGitHubGateway {
  return createCombinedGitHubGateway(runner);
}

// --- Evidence read adapter (#3181) -------------------------------------------
//
// The third adapter, and the only wholly read-only one: it captures a filing
// Issue's body and its cross-review comments for the issue-evidence artifact.
// No mutation reaches it, so it takes no permit — the permit machinery guards
// writes, and there are none here.

export type EvidenceGitHubGateway = Readonly<{
  readiness(): Promise<GitHubGatewayOutcome<void>>;
  viewIssue(
    repository: GitHubRepository,
    issueNumber: number,
  ): Promise<GitHubGatewayOutcome<RemoteGitHubIssue>>;
  listComments(
    repository: GitHubRepository,
    issueNumber: number,
  ): Promise<GitHubGatewayOutcome<readonly RemoteGitHubIssueComment[]>>;
}>;

export function createEvidenceGitHubGatewayAdapter(
  runner: MirrorProcessRunner,
): EvidenceGitHubGateway {
  const readOnly = createCombinedGitHubGateway(runner);
  return {
    readiness: () => probeReadiness(runner),
    viewIssue: (repository, issueNumber) => readOnly.viewIssue(repository, issueNumber),
    async listComments(repository, issueNumber) {
      const number = parseIssueNumber(issueNumber);
      if (number === null) return invalidResponse("read-only");
      const result = await runner.run({
        executable: "gh",
        args: commentsArgv(repository, number),
        profile: "paginated",
      });
      if (result.kind !== "exited") return processFailure(result, "read-only");
      // No `--include` on this transport (see commentsArgv), so there is no
      // HTTP status to classify against: a non-zero exit is all the signal
      // there is, and only an OS transport signature narrows it to `network`.
      if (result.exitCode !== 0) {
        const classification: Classification = hasNetworkSignal(result.stderrTail)
          ? "network"
          : "command";
        return failure(
          classification,
          classification === "network",
          effectForOp("read-only", true),
          result.exitCode,
          null,
        );
      }
      const jsonText = result.stdout.toString("utf-8");
      if (scanBodies(jsonText) !== "ok") return invalidResponse("read-only");
      let payload: unknown;
      try {
        payload = JSON.parse(jsonText);
      } catch {
        return invalidResponse("read-only");
      }
      return parseIssueComments(payload, repository);
    },
  };
}

// --- Label sync gateway (#1990) ----------------------------------------------
// Deliberately outside the permit-gated mirror mutation surface: label sync
// touches the intent's RELATED issues, which never carry a mirror permit.

export function addLabelsArgv(
  repo: GitHubRepository,
  issueNumber: number,
  labels: readonly string[],
): readonly string[] {
  const args: string[] = [
    "api",
    "--include",
    "--method",
    "POST",
    `${issuesPath(repo)}/${issueNumber}/labels`,
  ];
  for (const label of labels) args.push("-f", `labels[]=${label}`);
  return args;
}

export function removeLabelArgv(
  repo: GitHubRepository,
  issueNumber: number,
  label: string,
): readonly string[] {
  return [
    "api",
    "--include",
    "--method",
    "DELETE",
    `${issuesPath(repo)}/${issueNumber}/labels/${encodeURIComponent(label)}`,
  ];
}

// Label mutations only need the HTTP status: a successful DELETE is typically
// `204 No Content` with an EMPTY body, which parseHttpEnvelope would reject as
// malformed (it demands a JSON body). Scan the `--include` status lines alone.
const LABEL_STATUS_LINE_RE = /^HTTP\/[0-9.]+ (\d{3})/gm;

function labelHttpStatuses(stdout: Buffer): readonly number[] {
  const text = stdout.toString("latin1");
  if (!text.startsWith("HTTP/")) return [];
  return [...text.matchAll(LABEL_STATUS_LINE_RE)].map((match) => Number(match[1]));
}

// The final (last) status line decides the outcome, after dropping 1xx
// informational lines: `gh api --include` prints one status line per hop of a
// redirect chain, so the first status is not necessarily the outcome, and 1xx
// is never a final outcome by definition (#2020). null means only 1xx lines
// were observed — no final status to judge.
function finalLabelHttpStatus(statuses: readonly number[]): number | null {
  const finalCandidates = statuses.filter((status) => status >= 200);
  return finalCandidates.length === 0 ? null : finalCandidates[finalCandidates.length - 1]!;
}

export function createMirrorLabelGateway(
  runner: MirrorProcessRunner,
): MirrorLabelGateway {
  const call = async (
    args: readonly string[],
    okStatuses: ReadonlySet<number>,
  ): Promise<GitHubGatewayOutcome<void>> => {
    const result = await runner.run({ executable: "gh", args, profile: "single" });
    if (result.kind !== "exited") {
      return processFailure(result, "mutation");
    }
    const statuses = labelHttpStatuses(result.stdout);
    if (statuses.length === 0) {
      return failure("invalid-response", false, "outcome-unknown", result.exitCode, null);
    }
    const finalStatus = finalLabelHttpStatus(statuses);
    if (finalStatus === null) {
      // Only 1xx informational lines were observed — no final status to judge.
      return failure("invalid-response", false, "outcome-unknown", result.exitCode, null);
    }
    if (finalStatus < 200 || finalStatus >= 300) {
      if (okStatuses.has(finalStatus)) return ok<void>(undefined);
      const { classification, retryable } = classifyHttpStatus(finalStatus);
      return failure(classification, retryable, "outcome-unknown", result.exitCode, finalStatus);
    }
    return ok<void>(undefined);
  };
  return {
    addIssueLabels(repository, issueNumber, labels) {
      return call(addLabelsArgv(repository, issueNumber, labels), new Set());
    },
    // 404 = the label (or its assignment) is already gone; removal is
    // idempotent, so absence counts as success.
    removeIssueLabel(repository, issueNumber, label) {
      return call(removeLabelArgv(repository, issueNumber, label), new Set([404]));
    },
    // #2020: advisory PR/issue discrimination for the label-add path. A
    // failure here (transport error, malformed envelope) is returned as a
    // typed failure like every other read; runMirrorLabelSync's caller-side
    // fail-open contract is what turns "inconclusive" into "proceed with the
    // add" — this check must never itself become a reason to skip a
    // legitimate issue.
    async isPullRequest(repository, issueNumber) {
      const result = await runner.run({
        executable: "gh",
        args: viewArgv(repository, issueNumber),
        profile: "single",
      });
      // "final-status": `gh api --include` on a resource read prints one
      // status line per hop, so a leading 1xx or a redirect's 3xx must not
      // decide the outcome — only the final status does (#2020 CodeRabbit
      // follow-up, consistent with the label path's finalLabelHttpStatus).
      const interp = interpretApiResult(result, "single", "read-only", "final-status");
      if (interp.kind === "failure") return interp.failure;
      let payload: unknown;
      try {
        payload = JSON.parse(interp.jsonText);
      } catch {
        return invalidResponse("read-only");
      }
      return ok<boolean>(isPullRequestEntry(payload));
    },
  };
}
