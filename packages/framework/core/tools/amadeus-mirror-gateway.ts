// amadeus-mirror-gateway.ts — C5 Mirror GitHub Gateway (design G1, G3, G5–G8).
//
// The only process boundary that talks to GitHub. It receives a validated
// RepositoryIdentity (plus a C6-issued permit for mutations), builds an exact
// immutable `gh` argument array, runs it through the injected process runner,
// parses the `--include` HTTP envelope + JSON body, and returns a typed C0
// `GatewayOutcome`. It owns NO state, mode, provenance, landing, retry,
// warning, or audit — those belong to Unit 4 (C6–C8). Failures never carry raw
// stdout / stderr: the summary is rebuilt from a fixed redaction template.
//
// Component map within this module:
//   G1 Repository Validator  — parseRepositoryIdentity / URL / issue number
//   G3 Argv Builder          — operation-specific exact argv
//   G5 HTTP Envelope Parser  — status/header/body byte separation
//   G6 Issue Parser / Finder — DTO validation, PR exclusion, marker filter
//   G7 Failure Normalizer    — classification, effect certainty, redaction
//   G8 Gateway               — orchestration returning C0 GatewayOutcome

import {
  validateMirrorMutationPermit,
  validateMirrorProjectMutationPermit,
} from "./amadeus-mirror-capability.ts";
import type {
  CreateMirrorIssueInput,
  GatewayOutcome,
  MirrorGitHubGateway,
  MirrorMutationEffect,
  MirrorMutationPermit,
  MirrorIssueRef,
  MirrorProjectItem,
  MirrorProjectItemsView,
  MirrorProjectMutationPermit,
  MirrorProjectRef,
  MirrorProjectStatusField,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";
import type {
  MirrorOperationProfile,
  MirrorProcessResult,
  MirrorProcessRunner,
} from "./amadeus-mirror-runner.ts";

const MAX_BODY_BYTES = 256 * 1024;

// --- G1 Repository Validator -------------------------------------------------

// owner / name: ASCII alphanumerics and - _ . only. The class excludes
// whitespace and slash, so a padded value is rejected without trimming.
const REPO_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

export function parseRepositoryIdentity(
  owner: string,
  name: string,
): RepositoryIdentity | null {
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
): RepositoryIdentity | null {
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
  return parseRepositoryIdentity(segments[1], segments[2]);
}

export function parseIssueNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

// --- G3 Argv Builder ---------------------------------------------------------

function issuesPath(repo: RepositoryIdentity): string {
  return `repos/${repo.canonical}/issues`;
}

export function versionArgv(): readonly string[] {
  return ["--version"];
}

export function authArgv(): readonly string[] {
  return ["auth", "status", "--hostname", "github.com"];
}

export function createArgv(
  repo: RepositoryIdentity,
  input: CreateMirrorIssueInput,
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
  repo: RepositoryIdentity,
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
  repo: RepositoryIdentity,
  issueNumber: number,
): readonly string[] {
  return ["api", "--include", "--method", "GET", `${issuesPath(repo)}/${issueNumber}`];
}

export function editArgv(
  repo: RepositoryIdentity,
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
  repo: RepositoryIdentity,
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

// --- G3 Argv Builder: GraphQL (Project status sync) --------------------------

// Page size for the Issue's current Project memberships. An Issue belonging to
// more Projects than this is out of U1's scope (single configured target); the
// walk is deliberately not paginated because the membership check only needs to
// find the one configured Project.
export const PROJECT_ITEMS_PER_PAGE = 50;

// Exactly one query answers both "what is this Issue's node id" and "which
// Projects is it already on" — the node id has no other in-budget source, since
// addProjectV2ItemById needs it for an Issue that is not yet a member.
export const LIST_PROJECT_ITEMS_QUERY =
  "query($owner:String!,$name:String!,$number:Int!,$first:Int!){" +
  "repository(owner:$owner,name:$name){issue(number:$number){id " +
  "projectItems(first:$first){nodes{id " +
  "project{id number owner{__typename ... on Organization{login} ... on User{login}}} " +
  'fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}' +
  "}}}}}";

// Organization-owned Projects only (E-U1CG ruling 2): no user-owner fallback, so
// the per-Project query budget stays at one. An unresolved organization or
// Project is a loud failure the executor answers with skip + diagnostic.
export const RESOLVE_PROJECT_STATUS_FIELD_QUERY =
  "query($owner:String!,$number:Int!){" +
  "organization(login:$owner){projectV2(number:$number){id " +
  'field(name:"Status"){... on ProjectV2SingleSelectField{id options{id name}}}' +
  "}}}";

export const ADD_PROJECT_ITEM_MUTATION =
  "mutation($projectId:ID!,$contentId:ID!){" +
  "addProjectV2ItemById(input:{projectId:$projectId,contentId:$contentId})" +
  "{item{id}}}";

export const UPDATE_PROJECT_ITEM_STATUS_MUTATION =
  "mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){" +
  "updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId," +
  "fieldId:$fieldId,value:{singleSelectOptionId:$optionId}})" +
  "{projectV2Item{id}}}";

// `-f` sends a literal string; `-F` is used ONLY for numbers this module formats
// itself. That split matters: `-F` also interprets `@file`, `true`, and `null`,
// so routing caller strings through it would let a configured value reach the
// filesystem. Numbers are required because the GraphQL variables are `Int!`.
export function graphqlArgv(
  query: string,
  variables: Readonly<Record<string, string | number>>,
): readonly string[] {
  const args: string[] = ["api", "graphql", "--include", "-f", `query=${query}`];
  for (const key of Object.keys(variables)) {
    const value = variables[key];
    args.push(
      typeof value === "number" ? "-F" : "-f",
      `${key}=${String(value)}`,
    );
  }
  return args;
}

export function listProjectItemsArgv(issue: MirrorIssueRef): readonly string[] {
  return graphqlArgv(LIST_PROJECT_ITEMS_QUERY, {
    owner: issue.repository.owner,
    name: issue.repository.name,
    number: issue.number,
    first: PROJECT_ITEMS_PER_PAGE,
  });
}

export function resolveProjectStatusFieldArgv(
  project: MirrorProjectRef,
): readonly string[] {
  return graphqlArgv(RESOLVE_PROJECT_STATUS_FIELD_QUERY, {
    owner: project.owner,
    number: project.number,
  });
}

export function addProjectItemArgv(
  projectId: string,
  issueNodeId: string,
): readonly string[] {
  return graphqlArgv(ADD_PROJECT_ITEM_MUTATION, {
    projectId,
    contentId: issueNodeId,
  });
}

export function updateProjectItemStatusArgv(
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string,
): readonly string[] {
  return graphqlArgv(UPDATE_PROJECT_ITEM_STATUS_MUTATION, {
    projectId,
    itemId,
    fieldId,
    optionId,
  });
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
// optional trailing LF, and EOF. Header bytes are consumed raw; only the tail
// after the last blank line is JSON. Any non-2xx status short-circuits to
// http-error so the failure normalizer can read the number.
export function parseHttpEnvelope(
  stdout: Buffer,
  mode: "single" | "array",
): EnvelopeParse {
  const bin = stdout.toString("latin1");
  let pos = 0;
  const statuses: number[] = [];

  while (bin.startsWith("HTTP/", pos)) {
    const statusEol = findLineEnd(bin, pos);
    if (statusEol === null) return { kind: "malformed" };
    const match = STATUS_LINE_RE.exec(bin.slice(pos, statusEol.end));
    if (match === null) return { kind: "malformed" };
    statuses.push(Number(match[1]));

    let headerPos = statusEol.next;
    for (;;) {
      const headerEol = findLineEnd(bin, headerPos);
      if (headerEol === null) return { kind: "malformed" };
      if (headerEol.end === headerPos) {
        headerPos = headerEol.next; // blank line terminates the header block
        break;
      }
      headerPos = headerEol.next;
    }
    pos = headerPos;
  }

  if (statuses.length === 0) return { kind: "malformed" };
  const firstBad = statuses.find((s) => s < 200 || s >= 300);
  if (firstBad !== undefined) return { kind: "http-error", status: firstBad };

  let bodyBin = bin.slice(pos);
  if (bodyBin.endsWith("\n")) bodyBin = bodyBin.slice(0, -1);
  if (bodyBin.length === 0) return { kind: "malformed" };

  const opener = bodyBin[0];
  if (mode === "single") {
    if (statuses.length !== 1 || opener !== "{") return { kind: "malformed" };
  } else if (opener !== "[") {
    return { kind: "malformed" };
  }

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

// Validate one remote element into a RemoteMirrorIssue bound to the request
// repository. Returns null (→ invalid-response) on any shape or repo mismatch.
export function parseIssueObject(
  element: unknown,
  repo: RepositoryIdentity,
): RemoteMirrorIssue | null {
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

// --- G7 Failure Normalizer / Redactor ---------------------------------------

type OpKind = "read-only" | "mutation";

type Failure = Extract<GatewayOutcome<unknown>, { kind: "failure" }>;

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

function effectForOp(op: OpKind, started: boolean): MirrorMutationEffect {
  if (op === "read-only") return "no-effect-confirmed";
  return started ? "outcome-unknown" : "not-started";
}

function redactSummary(
  classification: Classification,
  effect: MirrorMutationEffect,
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
  effect: MirrorMutationEffect,
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

function classifyHttpStatus(status: number): {
  classification: Classification;
  retryable: boolean;
} {
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
): ApiInterpretation {
  if (result.kind !== "exited") {
    return { kind: "failure", failure: processFailure(result, op) };
  }

  const env = parseHttpEnvelope(result.stdout, mode);
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

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

// Parse a single-object success body into a RemoteMirrorIssue.
function parseSingleIssue(
  interp: Extract<ApiInterpretation, { kind: "success" }>,
  repo: RepositoryIdentity,
  op: OpKind,
): GatewayOutcome<RemoteMirrorIssue> {
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

type GraphqlRun =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "failure"; failure: Failure };

// --- GraphQL response parsers ------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// One `projectItems` node -> MirrorProjectItem. A node whose Project identity is
// incomplete is rejected (null) rather than defaulted, so a partial response can
// never be read as "not a member of the configured Project".
function parseProjectItemNode(node: unknown): MirrorProjectItem | null {
  const record = asRecord(node);
  if (record === null) return null;
  const itemId = nonEmptyString(record.id);
  const project = asRecord(record.project);
  if (itemId === null || project === null) return null;
  const projectId = nonEmptyString(project.id);
  const owner = asRecord(project.owner);
  const projectNumber = project.number;
  if (projectId === null || owner === null) return null;
  if (typeof projectNumber !== "number" || !Number.isSafeInteger(projectNumber)) {
    return null;
  }
  const projectOwner = nonEmptyString(owner.login);
  if (projectOwner === null) return null;
  const fieldValue = asRecord(record.fieldValueByName);
  const currentStatus =
    fieldValue === null ? null : nonEmptyString(fieldValue.name);
  return { projectId, projectNumber, projectOwner, itemId, currentStatus };
}

export function parseProjectItemsView(
  data: Record<string, unknown>,
): MirrorProjectItemsView | null {
  const repository = asRecord(data.repository);
  const issue = repository === null ? null : asRecord(repository.issue);
  if (issue === null) return null;
  const issueNodeId = nonEmptyString(issue.id);
  const projectItems = asRecord(issue.projectItems);
  if (issueNodeId === null || projectItems === null) return null;
  const nodes = projectItems.nodes;
  if (!Array.isArray(nodes)) return null;
  const items: MirrorProjectItem[] = [];
  for (const node of nodes) {
    const item = parseProjectItemNode(node);
    if (item === null) return null;
    items.push(item);
  }
  return { issueNodeId, items };
}

// An unresolved organization / Project / Status field all return null: the
// executor answers every one of them with skip + diagnostic, never a mutation.
export function parseProjectStatusField(
  data: Record<string, unknown>,
): MirrorProjectStatusField | null {
  const organization = asRecord(data.organization);
  const project =
    organization === null ? null : asRecord(organization.projectV2);
  if (project === null) return null;
  const projectId = nonEmptyString(project.id);
  const field = asRecord(project.field);
  if (projectId === null || field === null) return null;
  const fieldId = nonEmptyString(field.id);
  const rawOptions = field.options;
  if (fieldId === null || !Array.isArray(rawOptions)) return null;
  const options: { id: string; name: string }[] = [];
  for (const raw of rawOptions) {
    const option = asRecord(raw);
    const id = option === null ? null : nonEmptyString(option.id);
    const name = option === null ? null : nonEmptyString(option.name);
    if (id === null || name === null) return null;
    options.push({ id, name });
  }
  return { projectId, fieldId, options };
}

function parseAddedItemId(data: Record<string, unknown>): string | null {
  const added = asRecord(data.addProjectV2ItemById);
  const item = added === null ? null : asRecord(added.item);
  return item === null ? null : nonEmptyString(item.id);
}

function parseUpdatedItemId(data: Record<string, unknown>): string | null {
  const updated = asRecord(data.updateProjectV2ItemFieldValue);
  const item = updated === null ? null : asRecord(updated.projectV2Item);
  return item === null ? null : nonEmptyString(item.id);
}

export function createMirrorGitHubGateway(
  runner: MirrorProcessRunner,
): MirrorGitHubGateway {
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

  const permitRepo = (permit: MirrorMutationPermit): RepositoryIdentity =>
    (permit as unknown as { repository: RepositoryIdentity }).repository;

  const permitIssueNumber = (permit: MirrorMutationPermit): number | null =>
    (permit as unknown as { issueNumber: number | null }).issueNumber;

  const runApi = (
    args: readonly string[],
    profile: MirrorOperationProfile,
  ): Promise<MirrorProcessResult> =>
    runner.run({ executable: "gh", args, profile });

  const requireValidProjectPermit = (
    permit: MirrorProjectMutationPermit,
    expected: Parameters<typeof validateMirrorProjectMutationPermit>[1],
  ): void => {
    if (!validateMirrorProjectMutationPermit(permit, expected)) {
      throw new Error(
        "mirror gateway: rejected Project mutation permit (forged or mismatched binding)",
      );
    }
  };

  // Run one GraphQL operation and reduce it to `data` or a typed failure. The
  // HTTP envelope is judged first (transport / status), then the body's own
  // `errors` array, because GraphQL reports operation failure inside a 200.
  const runGraphql = async (
    args: readonly string[],
    op: OpKind,
  ): Promise<GraphqlRun> => {
    const result = await runApi(args, "single");
    if (result.kind !== "exited") {
      return { kind: "failure", failure: processFailure(result, op) };
    }
    const envelope = parseHttpEnvelope(result.stdout, "single");
    if (envelope.kind === "http-error") {
      const { classification, retryable } = classifyHttpStatus(envelope.status);
      return {
        kind: "failure",
        failure: failure(
          classification,
          retryable,
          effectForOp(op, true),
          result.exitCode,
          envelope.status,
        ),
      };
    }
    if (envelope.kind === "malformed" || result.exitCode !== 0) {
      const classification: Classification =
        envelope.kind === "malformed" &&
        result.exitCode !== 0 &&
        hasNetworkSignal(result.stderrTail)
          ? "network"
          : "invalid-response";
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
    const body = interpretGraphqlResult(envelope);
    if (body.kind === "errors") {
      return {
        kind: "failure",
        failure: failure(
          body.classification,
          body.retryable,
          effectForOp(op, true),
          result.exitCode,
          null,
        ),
      };
    }
    if (body.kind === "malformed") {
      return { kind: "failure", failure: invalidResponse(op) };
    }
    return { kind: "ok", data: body.data };
  };

  return {
    async readiness(repository) {
      void repository; // readiness probes the tool, not a repo mutation target
      const version = await runner.run({
        executable: "gh",
        args: versionArgv(),
        profile: "version-auth",
      });
      if (version.kind !== "exited") return processFailure(version, "read-only");
      if (version.exitCode !== 0) {
        return failure(
          "not-installed",
          false,
          "no-effect-confirmed",
          version.exitCode,
          null,
        );
      }

      const auth = await runner.run({
        executable: "gh",
        args: authArgv(),
        profile: "version-auth",
      });
      if (auth.kind !== "exited") return processFailure(auth, "read-only");
      if (auth.exitCode !== 0) {
        return failure(
          "unauthenticated",
          false,
          "no-effect-confirmed",
          auth.exitCode,
          null,
        );
      }
      return ok<void>(undefined);
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

    async findIssuesByMarker(repository, marker) {
      const issues: RemoteMirrorIssue[] = [];
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
      return ok<readonly RemoteMirrorIssue[]>(matches);
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

    async listProjectItems(issue) {
      const run = await runGraphql(listProjectItemsArgv(issue), "read-only");
      if (run.kind === "failure") return run.failure;
      const view = parseProjectItemsView(run.data);
      return view === null ? invalidResponse("read-only") : ok(view);
    },

    async resolveProjectStatusField(project) {
      const run = await runGraphql(
        resolveProjectStatusFieldArgv(project),
        "read-only",
      );
      if (run.kind === "failure") return run.failure;
      const field = parseProjectStatusField(run.data);
      return field === null ? invalidResponse("read-only") : ok(field);
    },

    async addProjectItem(permit, projectId, issueNodeId) {
      requireValidProjectPermit(permit, { mutation: "add-project-item" });
      const run = await runGraphql(
        addProjectItemArgv(projectId, issueNodeId),
        "mutation",
      );
      if (run.kind === "failure") return run.failure;
      const itemId = parseAddedItemId(run.data);
      return itemId === null ? invalidResponse("mutation") : ok({ itemId });
    },

    async updateProjectItemStatus(permit, projectId, itemId, fieldId, optionId) {
      requireValidProjectPermit(permit, {
        mutation: "update-project-item-status",
      });
      const run = await runGraphql(
        updateProjectItemStatusArgv(projectId, itemId, fieldId, optionId),
        "mutation",
      );
      if (run.kind === "failure") return run.failure;
      return parseUpdatedItemId(run.data) === null
        ? invalidResponse("mutation")
        : ok<void>(undefined);
    },
  };
}
