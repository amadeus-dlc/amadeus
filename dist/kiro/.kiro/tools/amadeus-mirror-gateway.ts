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

import { validateMirrorMutationPermit } from "./amadeus-mirror-capability.ts";
import type {
  CreateMirrorIssueInput,
  GatewayOutcome,
  MirrorGitHubGateway,
  MirrorMutationEffect,
  MirrorMutationPermit,
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

export function findArgv(repo: RepositoryIdentity): readonly string[] {
  return [
    "api",
    "--include",
    "--method",
    "GET",
    "--paginate",
    "--slurp",
    issuesPath(repo),
    "-f",
    "state=all",
    "-f",
    "per_page=100",
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

// --- G5 HTTP Envelope Parser -------------------------------------------------

export type EnvelopeParse =
  | { kind: "ok"; statuses: readonly number[]; jsonText: string }
  | { kind: "http-error"; status: number }
  | { kind: "malformed" };

const STATUS_LINE_RE = /^HTTP\/[0-9.]+ (\d{3})(?: .*)?$/;

// Grammar (per security-design): P HTTP blocks
//   `HTTP/<ver> <3-digit> <reason> CRLF *(header CRLF) CRLF`
// then a single slurped JSON body (object for a single op, P-length array for
// pagination), an optional trailing LF, and EOF. Header bytes are consumed
// raw; only the tail after the last blank line is JSON. Any non-2xx status
// short-circuits to http-error so the failure normalizer can read the number.
export function parseHttpEnvelope(
  stdout: Buffer,
  mode: "single" | "array",
): EnvelopeParse {
  const bin = stdout.toString("latin1");
  let pos = 0;
  const statuses: number[] = [];

  while (bin.startsWith("HTTP/", pos)) {
    const eol = bin.indexOf("\r\n", pos);
    if (eol < 0) return { kind: "malformed" };
    const match = STATUS_LINE_RE.exec(bin.slice(pos, eol));
    if (match === null) return { kind: "malformed" };
    statuses.push(Number(match[1]));

    let headerPos = eol + 2;
    for (;;) {
      const headerEol = bin.indexOf("\r\n", headerPos);
      if (headerEol < 0) return { kind: "malformed" };
      if (headerEol === headerPos) {
        headerPos += 2; // blank line terminates the header block
        break;
      }
      headerPos = headerEol + 2;
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
      const result = await runApi(findArgv(repository), "paginated");
      const interp = interpretApiResult(result, "array", "read-only");
      if (interp.kind === "failure") return interp.failure;

      if (scanBodies(interp.jsonText) !== "ok") {
        return invalidResponse("read-only");
      }
      let outer: unknown;
      try {
        outer = JSON.parse(interp.jsonText);
      } catch {
        return invalidResponse("read-only");
      }
      if (!Array.isArray(outer) || outer.length !== interp.pageCount) {
        return invalidResponse("read-only");
      }

      const issues: RemoteMirrorIssue[] = [];
      for (const page of outer) {
        if (!Array.isArray(page)) return invalidResponse("read-only");
        for (const element of page) {
          if (isPullRequestEntry(element)) continue;
          const issue = parseIssueObject(element, repository);
          if (issue === null) return invalidResponse("read-only");
          issues.push(issue);
        }
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
  };
}
