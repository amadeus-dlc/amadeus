// Internal reviewer runtime for the existing stage-protocol §12a flow.

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import type { RunStageDirective } from "./amadeus-directive.ts";
import { validateDirective } from "./amadeus-directive.ts";
import {
  reviewerReadScope,
  runtimeReviewIdentity,
} from "./amadeus-reviewer.ts";

interface RuntimeFs {
  exists(path: string): boolean;
  stat(path: string): { isFile(): boolean };
  readFile(path: string | 0, encoding: "utf8"): string;
  readdir(path: string): string[];
  appendFile(path: string, content: string, encoding: "utf8"): void;
  writeFile(path: string, content: string, encoding: "utf8"): void;
  mkdir(path: string): void;
}

interface RuntimeUtc {
  command: string;
  args: string[];
  run(
    command: string,
    args: string[],
    options: { encoding: "utf8" },
  ): { status: number | null; stdout: string };
}

interface RuntimeWriter {
  write(text: string): unknown;
}

interface RuntimeExitCode {
  exitCode?: string | number | null;
}

interface ReviewerRuntimeDeps {
  cwd(): string;
  fs: RuntimeFs;
  utc: RuntimeUtc;
  stdin: 0;
  stdout: RuntimeWriter;
  stderr: RuntimeWriter;
  invocationId(): string;
  exitCode: RuntimeExitCode;
}

interface OwnerEvidence {
  path: string;
  excerpt: string;
}

interface ReadRequest {
  integrationId: string;
  path: string;
  reason: string;
  ownerEvidence: OwnerEvidence;
  operation: "read-file";
}

interface ScopeDecision extends ReadRequest {
  invocationId: string;
  iteration: number;
  decision: "approved";
  digest: string;
}

interface ReviewResult {
  invocationId: string;
  reviewer: string;
  verdict: "READY" | "NOT-READY";
  iteration: number;
  summary: string;
  findings: string[];
  scopeTranscript: unknown[];
  requestedReads: string[];
}

const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const INTEGRATION_ID = /^[A-Z][A-Z0-9_-]*-\d+$/;
const INVOCATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FINDING_SEVERITY = /^(BLOCKER|FOLLOW-UP|NIT) \| /;
const REVIEW_MARKER = (iteration: number): string =>
  `## Review — Iteration ${iteration}`;

const realDeps: ReviewerRuntimeDeps = {
  cwd: process.cwd,
  fs: {
    exists: existsSync,
    stat: statSync,
    readFile: readFileSync,
    readdir: readdirSync,
    appendFile: appendFileSync,
    writeFile: writeFileSync,
    mkdir: (path: string) => {
      mkdirSync(path, { recursive: true });
    },
  },
  utc: {
    command: "date",
    args: ["-u", "+%Y-%m-%dT%H:%M:%SZ"],
    run: spawnSync,
  },
  stdin: 0,
  stdout: process.stdout,
  stderr: process.stderr,
  invocationId: randomUUID,
  exitCode: process,
};

function absolutePath(path: string, deps: ReviewerRuntimeDeps): string {
  return isAbsolute(path) ? path : join(deps.cwd(), path);
}

function onDisk(path: string, deps: ReviewerRuntimeDeps): boolean {
  const resolved = absolutePath(path, deps);
  return deps.fs.exists(resolved) && deps.fs.stat(resolved).isFile();
}

function workspaceFile(path: string, deps: ReviewerRuntimeDeps): string {
  if (isAbsolute(path) || /[*?{}[\]$`|;&<>]/.test(path)) {
    throw new Error(`review request must name one literal workspace file: ${path}`);
  }
  const root = deps.cwd();
  const resolved = resolve(root, path);
  const fromRoot = relative(root, resolved);
  if (
    fromRoot === "" ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    throw new Error(`review request is outside the workspace: ${path}`);
  }
  if (!deps.fs.exists(resolved) || !deps.fs.stat(resolved).isFile()) {
    throw new Error(`review request is not an existing file: ${path}`);
  }
  return resolved;
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function singleLine(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new Error(`${label} must be a non-empty single line`);
  }
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value as string[];
}

function hasAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function canonicalFindings(value: unknown): string[] {
  const findings = stringArray(value, "review findings").map(
    (finding, index) => singleLine(finding, `review findings[${index}]`),
  );
  for (const [index, finding] of findings.entries()) {
    if (hasAsciiControl(finding)) {
      throw new Error(
        `review findings[${index}] must not contain ASCII control characters`,
      );
    }
  }
  if (new Set(findings).size !== findings.length) {
    throw new Error(
      "review findings must not contain duplicate canonical entries",
    );
  }
  for (const [index, finding] of findings.entries()) {
    if (!FINDING_SEVERITY.test(finding)) {
      throw new Error(
        `review findings[${index}] must start with BLOCKER |, FOLLOW-UP |, or NIT |`,
      );
    }
  }
  return findings;
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value as number;
}

function invocationId(value: unknown): string {
  const checked = singleLine(value, "review invocation ID");
  if (!INVOCATION_ID.test(checked)) {
    throw new Error("review invocation ID must be a UUID v4");
  }
  return checked;
}

// --- Invocation store (Issue #2147, ruling Q1=A) ---
//
// `scope` is the ONLY mint of a review invocation, so an id it never issued must
// not buy a spot-check admission or a READY verdict. The issued ids live in a
// machine-local ledger under the intent record root, where the shipped
// `.gitignore` rule `amadeus/spaces/*/intents/*/.amadeus-*` already keeps
// runtime state out of the committed tree.
//
// An entry is minted unbound and binds to the FIRST iteration that consumes it;
// any later carrier naming a different iteration is a replay. That check lives
// here and not in the transcript revalidation, so it runs on every path —
// including the empty-`scopeTranscript` one that returns before the transcript
// checks are reached.
const INVOCATION_STORE_FILE = ".amadeus-reviewer-invocations.json";
const RECORD_ROOT = /^(.*?\/intents\/[^/]+)\//;

interface IssuedInvocation {
  invocationId: string;
  iteration: number | null;
}

// A quality-repair receipt that has already funded one review iteration beyond
// the stage's declared cap (Issue #3415), and the projections this runtime has
// already written. Both live in the same machine-local ledger as the issued
// invocations: `complete-review` is their only writer, so neither a carrier nor
// an edited artifact can restate them.
interface ConsumedRepair {
  evidenceFingerprint: string;
  stageInstance: string;
  iteration: number;
}

interface RecordedReview {
  artifact: string;
  iteration: number;
}

interface InvocationStore {
  invocations: IssuedInvocation[];
  repairs: ConsumedRepair[];
  reviews: RecordedReview[];
}

function recordRoot(directive: RunStageDirective): string {
  const record = RECORD_ROOT.exec(directive.memory_path);
  if (!record) {
    throw new Error("directive memory path does not name an intent record dir");
  }
  return record[1];
}

function invocationStorePath(
  directive: RunStageDirective,
  deps: ReviewerRuntimeDeps,
): string {
  return absolutePath(join(recordRoot(directive), INVOCATION_STORE_FILE), deps);
}

function readInvocationStore(
  path: string,
  deps: ReviewerRuntimeDeps,
): InvocationStore {
  if (!deps.fs.exists(path)) return { invocations: [], repairs: [], reviews: [] };
  let raw: unknown;
  try {
    raw = JSON.parse(deps.fs.readFile(path, "utf8"));
  } catch {
    throw new Error("reviewer invocation store must be JSON");
  }
  const store = objectValue(raw, "reviewer invocation store");
  if (!Array.isArray(store.invocations)) {
    throw new Error("reviewer invocation store must list issued invocations");
  }
  const invocations = store.invocations.map((entry) => {
    const issued = objectValue(entry, "issued review invocation");
    return {
      invocationId: invocationId(issued.invocationId),
      iteration:
        issued.iteration === null
          ? null
          : positiveInteger(issued.iteration, "issued review iteration"),
    };
  });
  return {
    invocations,
    repairs: storedRepairs(store.repairs),
    reviews: storedReviews(store.reviews),
  };
}

function storedRepairs(value: unknown): ConsumedRepair[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("reviewer invocation store must list consumed repair evidence");
  }
  return value.map((entry) => {
    const consumed = objectValue(entry, "consumed repair evidence");
    return {
      evidenceFingerprint: repairFingerprint(consumed.evidenceFingerprint),
      stageInstance: singleLine(consumed.stageInstance, "consumed repair stage instance"),
      iteration: positiveInteger(consumed.iteration, "consumed repair iteration"),
    };
  });
}

function storedReviews(value: unknown): RecordedReview[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("reviewer invocation store must list recorded reviews");
  }
  return value.map((entry) => {
    const recorded = objectValue(entry, "recorded review");
    return {
      artifact: singleLine(recorded.artifact, "recorded review artifact"),
      iteration: positiveInteger(recorded.iteration, "recorded review iteration"),
    };
  });
}

function writeInvocationStore(
  path: string,
  store: InvocationStore,
  deps: ReviewerRuntimeDeps,
): void {
  deps.fs.mkdir(dirname(path));
  deps.fs.writeFile(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function issueInvocation(
  directive: RunStageDirective,
  invocation: string,
  deps: ReviewerRuntimeDeps,
): void {
  const path = invocationStorePath(directive, deps);
  const store = readInvocationStore(path, deps);
  const existing = store.invocations.find((entry) => entry.invocationId === invocation);
  if (existing) {
    if (existing.iteration !== null) {
      throw new Error("review invocation ID was already consumed");
    }
    return;
  }
  store.invocations.push({ invocationId: invocation, iteration: null });
  writeInvocationStore(path, store, deps);
}

function bindInvocation(
  directive: RunStageDirective,
  invocation: string,
  iteration: number,
  deps: ReviewerRuntimeDeps,
): void {
  const path = invocationStorePath(directive, deps);
  const store = readInvocationStore(path, deps);
  const existing = store.invocations.find((entry) => entry.invocationId === invocation);
  if (!existing) {
    throw new Error("review invocation ID was not issued by scope");
  }
  if (existing.iteration === null) {
    existing.iteration = iteration;
    writeInvocationStore(path, store, deps);
    return;
  }
  if (existing.iteration !== iteration) {
    throw new Error("review invocation ID is bound to a different iteration");
  }
}

// --- Review iteration cap (Issue #3415) ---
//
// The cap is re-derived from the stage DEFINITION rather than read off the
// carrier. `amadeus-orchestrate.ts` builds the directive field as
// `node.reviewer_max_iterations ?? 2` from the compiled graph node, and that
// node is compiled from this same frontmatter, so the two derivations agree by
// construction. Deriving it here closes the carrier-trust hole the old check
// left open: a carrier that raises the number, or drops the field so the
// truthiness test degraded to "no limit at all", is refused instead of quietly
// admitted. §12a already requires the unchanged directive JSON, so a carrier
// that disagrees with the definition is a tampered one.
const STAGE_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const DECLARED_ITERATION_CAP = /^reviewer_max_iterations:[ \t]*(\d+)[ \t]*$/m;
const DEFAULT_ITERATION_CAP = 2;

function reviewIterationCap(
  directive: RunStageDirective,
  deps: ReviewerRuntimeDeps,
): number {
  const content = deps.fs.readFile(absolutePath(directive.stage_file, deps), "utf8");
  const frontmatter = STAGE_FRONTMATTER.exec(content);
  const declared = frontmatter ? DECLARED_ITERATION_CAP.exec(frontmatter[1]) : null;
  const cap = declared ? Number(declared[1]) : DEFAULT_ITERATION_CAP;
  if (!Number.isInteger(cap) || cap < 1) {
    throw new Error("stage definition declares an invalid review iteration cap");
  }
  if (
    directive.reviewer_max_iterations !== undefined &&
    directive.reviewer_max_iterations !== cap
  ) {
    throw new Error("directive review iteration cap does not match the stage definition");
  }
  return cap;
}

// --- Repair-funded review iterations (Issue #3415) ---
//
// A quality-repair `repair` ruling that lands ON the spent budget orders the
// same closed checks re-run, but the re-review had nowhere legal to go: a
// higher iteration hit the cap and a same-iteration re-record hit the
// projection immutability check. One further iteration is admitted per
// `repair` ruling, and only when that ruling is DURABLE: the fingerprint the
// carrier names has to be a `QUALITY_SNAPSHOT_OBSERVED` snapshot with
// unresolved obligations, recorded for this stage instance in the intent
// record's own audit shards by `amadeus-bolt observe-quality`. An unbacked
// fingerprint funds nothing, so the extension cannot be talked into existence
// by the carrier alone.
const REPAIR_FINGERPRINT = /^sha256:[0-9a-f]{64}$/;
const AUDIT_SHARD_DIR = "audit";
const AUDIT_SHARD_SUFFIX = ".jsonl";
const QUALITY_TRANSACTION_EVENT = "QUALITY_REPAIR_TRANSACTION_COMMITTED";
const QUALITY_SNAPSHOT_EVENT = "QUALITY_SNAPSHOT_OBSERVED";

interface RepairEvidence {
  evidenceFingerprint: string;
}

function repairFingerprint(value: unknown): string {
  const fingerprint = singleLine(value, "repair evidence fingerprint");
  if (!REPAIR_FINGERPRINT.test(fingerprint)) {
    throw new Error("repair evidence fingerprint must be a sha256 quality snapshot digest");
  }
  return fingerprint;
}

function parseRepairEvidence(value: unknown): RepairEvidence | undefined {
  if (value === undefined) return undefined;
  const repair = objectValue(value, "repair evidence");
  return { evidenceFingerprint: repairFingerprint(repair.evidenceFingerprint) };
}

// The quality scope a §12a repair ruling is recorded under: the stage, narrowed
// by the Unit when the directive names one. Binding to it keeps a repair ruling
// raised for one Unit from funding another Unit's review.
function qualityStageInstance(directive: RunStageDirective): string {
  return directive.unit === undefined
    ? directive.stage
    : `${directive.stage}:${directive.unit}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The snapshot fingerprint this quality event contributes to the stage
// instance, or undefined when it is not a repair ruling for it. A snapshot with
// no unresolved obligations is the READY arm of `observe-quality`, which orders
// no re-run and therefore funds no iteration.
function observedRepairFingerprint(
  event: unknown,
  stageInstance: string,
): string | undefined {
  if (!isObject(event) || event.type !== QUALITY_SNAPSHOT_EVENT) return undefined;
  const fingerprint = event.snapshotFingerprint;
  if (typeof fingerprint !== "string") return undefined;
  if (!isObject(event.projection)) return undefined;
  const snapshot = event.projection.latestSnapshot;
  if (!isObject(snapshot)) return undefined;
  if (snapshot.snapshotFingerprint !== fingerprint) return undefined;
  if (snapshot.stageInstanceId !== stageInstance) return undefined;
  if (!Array.isArray(snapshot.unresolved) || snapshot.unresolved.length === 0) {
    return undefined;
  }
  return fingerprint;
}

// One audit shard line. The shape read here is the emitted journal envelope
// (`attributes` keyed by the audit field names) carrying the encoded quality
// transaction. A line this reader cannot decode is not evidence — it is
// skipped, so a malformed or future-shaped row fails the admission closed
// rather than opening it.
function collectShardFingerprints(
  line: string,
  stageInstance: string,
  found: Set<string>,
): void {
  if (line.trim() === "") return;
  let record: unknown;
  try {
    record = JSON.parse(line);
  } catch { return; }
  if (!isObject(record) || record.schemaVersion !== 2) return;
  if (!isObject(record.attributes)) return;
  const attributes = record.attributes;
  if (attributes.Event !== QUALITY_TRANSACTION_EVENT) return;
  if (typeof attributes.Transaction !== "string") return;
  let transaction: unknown;
  try {
    transaction = JSON.parse(attributes.Transaction);
  } catch { return; }
  if (!isObject(transaction) || !Array.isArray(transaction.qualityEvents)) return;
  for (const event of transaction.qualityEvents) {
    const fingerprint = observedRepairFingerprint(event, stageInstance);
    if (fingerprint !== undefined) found.add(fingerprint);
  }
}

function durableRepairFingerprints(
  directive: RunStageDirective,
  deps: ReviewerRuntimeDeps,
): Set<string> {
  const found = new Set<string>();
  const dir = absolutePath(join(recordRoot(directive), AUDIT_SHARD_DIR), deps);
  if (!deps.fs.exists(dir)) return found;
  const stageInstance = qualityStageInstance(directive);
  for (const entry of deps.fs.readdir(dir)) {
    if (!entry.endsWith(AUDIT_SHARD_SUFFIX)) continue;
    const shard = join(dir, entry);
    if (!onDisk(shard, deps)) continue;
    for (const line of deps.fs.readFile(shard, "utf8").split(/\r?\n/)) {
      collectShardFingerprints(line, stageInstance, found);
    }
  }
  return found;
}

// Each receipt funds exactly the NEXT iteration after the spent budget and the
// receipts already consumed for this stage instance, and it funds it once. A
// receipt presented again at a different iteration is a replay; presenting one
// out of sequence would let a single ruling buy an unbounded jump.
//
// The statements below stay on one line each, and this rationale stays outside
// the function body: inside a body, a continuation line of a single call and a
// run of comment lines both carry no DA record of their own under bun's union
// merge, so the patch coverage gate reads them as never executed. The same
// reason keeps the JSON decoders in `collectShardFingerprints` on a single-line
// `catch`, where a brace-only closing line would otherwise read uncovered.
function admitRepairIteration(
  directive: RunStageDirective,
  repair: RepairEvidence,
  iteration: number,
  cap: number,
  deps: ReviewerRuntimeDeps,
): void {
  const path = invocationStorePath(directive, deps);
  const store = readInvocationStore(path, deps);
  const stageInstance = qualityStageInstance(directive);
  const consumed = store.repairs.find(
    (entry) => entry.evidenceFingerprint === repair.evidenceFingerprint,
  );
  if (consumed) {
    if (consumed.iteration !== iteration || consumed.stageInstance !== stageInstance) {
      throw new Error("repair evidence is bound to a different review iteration");
    }
    return;
  }
  if (!durableRepairFingerprints(directive, deps).has(repair.evidenceFingerprint)) {
    throw new Error("repair evidence is not a durable quality-repair observation for this stage");
  }
  const funded = store.repairs.filter((entry) => entry.stageInstance === stageInstance);
  if (iteration !== cap + funded.length + 1) {
    throw new Error("repair-funded review iteration must follow the spent budget in sequence");
  }
  store.repairs.push({ evidenceFingerprint: repair.evidenceFingerprint, stageInstance, iteration });
  writeInvocationStore(path, store, deps);
}

// The projection immutability check can only speak about a block that is still
// in the artifact, so a rewrite that drops the Review sections used to let the
// same iteration be re-recorded with a different verdict and no warning. The
// ledger remembers every projection this runtime wrote for the artifact; one
// that has gone missing is a refusal, not a fresh append.
function verifyRecordedReviews(
  directive: RunStageDirective,
  artifact: string,
  content: string,
  deps: ReviewerRuntimeDeps,
): void {
  const store = readInvocationStore(invocationStorePath(directive, deps), deps);
  for (const recorded of store.reviews) {
    if (recorded.artifact !== artifact) continue;
    if (existingReviewBlock(content, recorded.iteration) === undefined) {
      throw new Error(`recorded Review projection for iteration ${recorded.iteration} is missing from the artifact`);
    }
  }
}

function rememberRecordedReview(
  directive: RunStageDirective,
  artifact: string,
  iteration: number,
  deps: ReviewerRuntimeDeps,
): void {
  const path = invocationStorePath(directive, deps);
  const store = readInvocationStore(path, deps);
  const known = store.reviews.some(
    (entry) => entry.artifact === artifact && entry.iteration === iteration,
  );
  if (known) return;
  store.reviews.push({ artifact, iteration });
  writeInvocationStore(path, store, deps);
}

function readRunStageDirective(input: string): RunStageDirective {
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    throw new Error("reviewer input must be JSON");
  }
  const checked = validateDirective(raw);
  if (!checked.valid || checked.data.kind !== "run-stage") {
    const detail = checked.valid
      ? `unexpected directive kind: ${checked.data.kind}`
      : checked.errors.join("; ");
    throw new Error(detail);
  }
  return checked.data;
}

function scopeForDirective(
  directive: RunStageDirective,
  deps: ReviewerRuntimeDeps,
) {
  const requiredGap = directive.consumes_absent?.find((consume) => !consume.expected);
  if (requiredGap) {
    throw new Error(`required review consume is missing: ${requiredGap.path}`);
  }
  if (!onDisk(directive.stage_file, deps)) {
    throw new Error(`stage definition is missing: ${directive.stage_file}`);
  }
  const optional = new Set(directive.optional_produces ?? []);
  const scope = reviewerReadScope(
    {
      unit: directive.unit,
      stageFile: directive.stage_file,
      produces: directive.produces.map((path) => ({
        path,
        present: onDisk(path, deps),
        optional: optional.has(path),
      })),
    },
    directive.consumes
      .filter((path) => onDisk(path, deps))
      .map((path) => ({ path, present: true })),
  );
  return scope;
}

function primaryArtifact(directive: RunStageDirective): string {
  const optional = new Set(directive.optional_produces ?? []);
  const primary = directive.produces.find((path) => !optional.has(path));
  if (!primary) {
    throw new Error("primary review artifact is missing");
  }
  return primary;
}

function parseRequest(value: unknown): ReadRequest {
  const request = objectValue(value, "read request");
  const integrationId = singleLine(request.integrationId, "integration ID");
  if (!INTEGRATION_ID.test(integrationId)) {
    throw new Error("read request requires a concrete integration ID");
  }
  const path = singleLine(request.path, "read path");
  const reason = singleLine(request.reason, "read reason");
  if (request.operation !== "read-file") {
    throw new Error("reviewer reads must use the single-file read-file operation");
  }
  const owner = objectValue(request.ownerEvidence, "owner evidence");
  return {
    integrationId,
    path,
    reason,
    ownerEvidence: {
      path: singleLine(owner.path, "owner evidence path"),
      excerpt: singleLine(owner.excerpt, "owner evidence excerpt"),
    },
    operation: "read-file",
  };
}

function countOccurrences(content: string, needle: string): number {
  if (needle === "") return 0;
  return content.split(needle).length - 1;
}

const PATH_TOKEN_CHARACTERS = "A-Za-z0-9._/\\-";
const PATH_TOKEN_TRAILING_BOUNDARY = "\\.(?=\\s|$)";

function escapeRegExpToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pathTokenPattern(body: string): string {
  return (
    `(^|[^${PATH_TOKEN_CHARACTERS}])${body}` +
    `(?=$|[^${PATH_TOKEN_CHARACTERS}]|${PATH_TOKEN_TRAILING_BOUNDARY})`
  );
}

function countPathTokenOccurrences(content: string, token: string): number {
  const pattern = new RegExp(pathTokenPattern(escapeRegExpToken(token)), "g");
  return [...content.matchAll(pattern)].length;
}

function ownerMatchesForRequest(
  directive: RunStageDirective,
  request: ReadRequest,
  exactOwnerEvidence: boolean,
  requestedBasename: string,
  deps: ReviewerRuntimeDeps,
): string[] {
  const matches: string[] = [];
  for (const path of directive.consumes) {
    if (!onDisk(path, deps)) continue;
    const content = deps.fs.readFile(absolutePath(path, deps), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const linePaths = repositoryPathsForBasename(line, requestedBasename);
      const lineMatches = exactOwnerEvidence
        ? countIdentifierTokenOccurrences(line, request.integrationId) > 0 &&
          linePaths.length === 1 &&
          linePaths[0] === request.path
        : countPathTokenOccurrences(line, requestedBasename) === 1;
      if (lineMatches) matches.push(path);
    }
  }
  return matches;
}

function countIdentifierTokenOccurrences(content: string, token: string): number {
  const escaped = escapeRegExpToken(token);
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_-])${escaped}(?=$|[^A-Za-z0-9_-])`,
    "g",
  );
  return [...content.matchAll(pattern)].length;
}

function repositoryPathsForBasename(
  content: string,
  requestedBasename: string,
): string[] {
  const escaped = escapeRegExpToken(requestedBasename);
  const pattern = new RegExp(
    pathTokenPattern(`((?:[A-Za-z0-9._-]+/)+${escaped})`),
    "g",
  );
  return [...content.matchAll(pattern)].map((match) => match[2]);
}

function corroboratedFullPaths(
  directive: RunStageDirective,
  request: ReadRequest,
  requestedBasename: string,
  deps: ReviewerRuntimeDeps,
): Set<string> {
  const paths = new Set<string>();
  const collect = (content: string): void => {
    for (const line of content.split(/\r?\n/)) {
      if (countIdentifierTokenOccurrences(line, request.integrationId) === 0) {
        continue;
      }
      for (const path of repositoryPathsForBasename(line, requestedBasename)) {
        paths.add(path);
      }
    }
  };
  for (const path of directive.consumes) {
    if (onDisk(path, deps)) {
      collect(deps.fs.readFile(absolutePath(path, deps), "utf8"));
    }
  }
  return paths;
}

function canonicalDecision(
  directive: RunStageDirective,
  request: ReadRequest,
  invocation: string,
  iteration: number,
  deps: ReviewerRuntimeDeps,
): ScopeDecision {
  const scope = scopeForDirective(directive, deps);
  workspaceFile(request.path, deps);
  if (scope.paths.includes(request.path)) {
    throw new Error("declared scope files do not require a spot-check request");
  }

  const currentArtifacts = directive.produces
    .filter((path) => onDisk(path, deps))
    .map((path) => deps.fs.readFile(absolutePath(path, deps), "utf8"));
  if (!currentArtifacts.some((content) => content.includes(request.integrationId))) {
    throw new Error("integration ID is absent from current artifacts");
  }

  if (!directive.consumes.includes(request.ownerEvidence.path)) {
    throw new Error("owner evidence is not a passed consume");
  }
  const requestedBasename = basename(request.path);
  const ownerExcerptPaths = repositoryPathsForBasename(
    request.ownerEvidence.excerpt,
    requestedBasename,
  );
  const exactOwnerEvidence = ownerExcerptPaths.length > 0;
  if (
    exactOwnerEvidence &&
    (ownerExcerptPaths.length !== 1 ||
      ownerExcerptPaths[0] !== request.path ||
      countIdentifierTokenOccurrences(
        request.ownerEvidence.excerpt,
        request.integrationId,
      ) !== 1)
  ) {
    throw new Error("owner evidence does not uniquely match the requested path");
  }
  if (
    !exactOwnerEvidence &&
    countPathTokenOccurrences(request.ownerEvidence.excerpt, requestedBasename) !== 1
  ) {
    throw new Error("owner evidence does not uniquely match the requested path");
  }
  if (!exactOwnerEvidence) {
    const corroboratedPaths = corroboratedFullPaths(
      directive,
      request,
      requestedBasename,
      deps,
    );
    if (corroboratedPaths.size !== 1 || !corroboratedPaths.has(request.path)) {
      throw new Error(
        "basename owner evidence requires one exact path corroboration",
      );
    }
  }
  const ownerMatches = ownerMatchesForRequest(
    directive,
    request,
    exactOwnerEvidence,
    requestedBasename,
    deps,
  );
  if (ownerMatches.length !== 1 || ownerMatches[0] !== request.ownerEvidence.path) {
    throw new Error("spot-check requires exactly one passed owner path");
  }
  const ownerContent = deps.fs.readFile(
    absolutePath(request.ownerEvidence.path, deps),
    "utf8",
  );
  if (
    countOccurrences(ownerContent, request.ownerEvidence.excerpt) !== 1
  ) {
    throw new Error("owner evidence does not uniquely match the requested path");
  }

  const canonical: ReadRequest & {
    invocationId: string;
    iteration: number;
    decision: "approved";
  } = {
    ...request,
    invocationId: invocation,
    iteration,
    decision: "approved",
  };
  const digest = createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
  return { ...canonical, digest };
}

function parseCarrier(input: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("reviewer input must be JSON");
  }
  return objectValue(parsed, "reviewer carrier");
}

function directiveFromCarrier(
  carrier: Record<string, unknown>,
): RunStageDirective {
  return readRunStageDirective(JSON.stringify(carrier.directive));
}

function checkRead(input: string, deps: ReviewerRuntimeDeps): void {
  const carrier = parseCarrier(input);
  const directive = directiveFromCarrier(carrier);
  const transcript = Array.isArray(carrier.transcript) ? carrier.transcript : null;
  if (!transcript) throw new Error("scope transcript must be an array");
  if (transcript.length !== 0) {
    throw new Error("only one spot-check request is allowed per invocation");
  }
  const invocation = invocationId(carrier.invocationId);
  const iteration = positiveInteger(
    carrier.iteration,
    "review invocation iteration",
  );
  bindInvocation(directive, invocation, iteration, deps);
  const decision = canonicalDecision(
    directive,
    parseRequest(carrier.request),
    invocation,
    iteration,
    deps,
  );
  deps.stdout.write(`${JSON.stringify({ decision, transcript: [decision] })}\n`);
}

function parseReviewResult(value: unknown): ReviewResult {
  const result = objectValue(value, "review result");
  const invocation = invocationId(result.invocationId);
  const reviewer = singleLine(result.reviewer, "reviewer");
  if (result.verdict !== "READY" && result.verdict !== "NOT-READY") {
    throw new Error("review verdict must be READY or NOT-READY");
  }
  const iteration = positiveInteger(result.iteration, "review iteration");
  const summary = singleLine(result.summary, "review summary");
  const findings = canonicalFindings(result.findings);
  const hasBlocker = findings.some((finding) => finding.startsWith("BLOCKER | "));
  if (result.verdict === "READY" && hasBlocker) {
    throw new Error("READY review must not contain BLOCKER findings");
  }
  if (result.verdict === "NOT-READY" && !hasBlocker) {
    throw new Error("NOT-READY review requires at least one BLOCKER finding");
  }
  if (!Array.isArray(result.scopeTranscript)) {
    throw new Error("scope transcript must be an array");
  }
  return {
    invocationId: invocation,
    reviewer,
    verdict: result.verdict,
    iteration,
    summary,
    findings,
    scopeTranscript: result.scopeTranscript,
    requestedReads: stringArray(result.requestedReads, "requested reads"),
  };
}

function revalidateTranscript(
  directive: RunStageDirective,
  result: ReviewResult,
  deps: ReviewerRuntimeDeps,
): ScopeDecision | undefined {
  if (result.scopeTranscript.length > 1 || result.requestedReads.length > 1) {
    throw new Error("only one spot-check request is allowed per invocation");
  }
  if (result.scopeTranscript.length !== result.requestedReads.length) {
    throw new Error("spot-check request bypassed check-read");
  }
  if (result.scopeTranscript.length === 0) return undefined;

  const recorded = objectValue(result.scopeTranscript[0], "scope decision");
  if (recorded.decision !== "approved") {
    throw new Error("rejected scope decisions cannot produce Review evidence");
  }
  if (recorded.invocationId !== result.invocationId) {
    throw new Error("scope decision belongs to a different review invocation");
  }
  if (recorded.iteration !== result.iteration) {
    throw new Error("scope decision belongs to a different review iteration");
  }
  const expected = canonicalDecision(
    directive,
    parseRequest(recorded),
    result.invocationId,
    result.iteration,
    deps,
  );
  if (JSON.stringify(recorded) !== JSON.stringify(expected)) {
    throw new Error("scope decision transcript was tampered with");
  }
  if (result.requestedReads[0] !== expected.path) {
    throw new Error("review result names an unapproved read path");
  }
  return expected;
}

function runtimeUtc(deps: ReviewerRuntimeDeps): string {
  const result = deps.utc.run(deps.utc.command, deps.utc.args, {
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("UTC command failed");
  const output = result.stdout;
  if (!UTC_SECONDS.test(output.trim()) || output !== `${output.trim()}\n`) {
    throw new Error("UTC command returned invalid output");
  }
  return output.trim();
}

function scopeProjection(decision: ScopeDecision | undefined): string {
  if (!decision) return "none";
  return [
    `approved — ${decision.integrationId} — ${decision.path}`,
    `reason: ${decision.reason}`,
    `owner: ${decision.ownerEvidence.path}#${decision.ownerEvidence.excerpt}`,
  ].join(" — ");
}

function reviewBlock(
  identity: { reviewer: string; date: string },
  result: ReviewResult,
  decision: ScopeDecision | undefined,
  repair: string | undefined,
): string {
  const findings =
    result.findings.length === 0
      ? "- None"
      : result.findings.map((finding) => `- ${finding}`).join("\n");
  return [
    "",
    REVIEW_MARKER(result.iteration),
    "",
    `- **Verdict:** ${result.verdict}`,
    `- **Reviewer:** ${identity.reviewer}`,
    `- **Date:** ${identity.date}`,
    `- **Iteration:** ${result.iteration}`,
    `- **Scope decision:** ${scopeProjection(decision)}`,
    // Present only on a repair-funded iteration, so an ordinary projection is
    // byte-identical to the one this runtime has always written.
    ...(repair === undefined ? [] : [`- **Repair evidence:** ${repair}`]),
    "",
    result.summary,
    "",
    "### Findings",
    "",
    findings,
    "",
  ].join("\n");
}

function canonicalReviewProjection(
  identity: { reviewer: string; date: string },
  result: ReviewResult,
  decision: ScopeDecision | undefined,
  repair: string | undefined,
): string {
  // The first newline is the append separator, not part of the stored block.
  return reviewBlock(identity, result, decision, repair).slice(1);
}

function existingReviewBlock(
  content: string,
  iteration: number,
): string | undefined {
  const marker = REVIEW_MARKER(iteration);
  const headings = [...content.matchAll(/^## Review(?:[ \t].*)?$/gm)];
  const matches = headings.filter((heading) => heading[0].trim() === marker);
  if (matches.length > 1) {
    throw new Error(`duplicate Review projection for iteration ${iteration}`);
  }
  if (matches.length === 0) return undefined;

  const start = matches[0].index!;
  const next = headings.find((heading) => (heading.index ?? -1) > start);
  return content.slice(start, next?.index ?? content.length);
}

function reviewField(block: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [
    ...block.matchAll(new RegExp(`^- \\*\\*${escaped}:\\*\\* (.+)$`, "gm")),
  ];
  if (matches.length !== 1) {
    throw new Error(`existing Review must contain exactly one ${label} field`);
  }
  return matches[0][1];
}

function validateExistingReview(
  block: string,
  result: ReviewResult,
  decision: ScopeDecision | undefined,
  repair: string | undefined,
): void {
  reviewField(block, "Verdict");
  reviewField(block, "Reviewer");
  const date = reviewField(block, "Date");
  reviewField(block, "Iteration");
  reviewField(block, "Scope decision");
  if (repair !== undefined) reviewField(block, "Repair evidence");

  const identity = runtimeReviewIdentity(result.reviewer, date);
  if (block !== canonicalReviewProjection(identity, result, decision, repair)) {
    throw new Error("existing Review projection conflicts with the result");
  }
}

function completeReview(input: string, deps: ReviewerRuntimeDeps): void {
  const carrier = parseCarrier(input);
  const directive = directiveFromCarrier(carrier);
  scopeForDirective(directive, deps);
  const invocation = invocationId(carrier.invocationId);
  const result = parseReviewResult(carrier.result);
  if (result.invocationId !== invocation) {
    throw new Error("review result belongs to a different invocation");
  }
  if (!directive.reviewer || result.reviewer !== directive.reviewer) {
    throw new Error("review result persona does not match the checker directive");
  }
  const cap = reviewIterationCap(directive, deps);
  const repair = parseRepairEvidence(carrier.repair);
  let repairEvidence: string | undefined;
  if (result.iteration > cap) {
    // Unchanged for every review that is not repair-funded: the spent budget
    // still halts the loop for human direction (§12a).
    if (repair === undefined) {
      throw new Error("review iteration exceeds the directive limit");
    }
    admitRepairIteration(directive, repair, result.iteration, cap, deps);
    repairEvidence = repair.evidenceFingerprint;
  } else if (repair !== undefined) {
    // While the budget still has room the ordinary loop already records the
    // re-review, so a receipt spent here would only inflate the ceiling.
    throw new Error("repair evidence applies only after the review iteration budget is spent");
  }
  bindInvocation(directive, invocation, result.iteration, deps);
  const decision = revalidateTranscript(directive, result, deps);
  const artifact = primaryArtifact(directive);
  const artifactPath = absolutePath(artifact, deps);
  const existing = deps.fs.readFile(artifactPath, "utf8");
  const review = existingReviewBlock(existing, result.iteration);
  if (review !== undefined) {
    validateExistingReview(review, result, decision, repairEvidence);
    verifyRecordedReviews(directive, artifact, existing, deps);
    deps.stdout.write(
      `${JSON.stringify({
        ready: result.verdict === "READY",
        artifact,
        appended: false,
      })}\n`,
    );
    return;
  }
  verifyRecordedReviews(directive, artifact, existing, deps);

  const identity = runtimeReviewIdentity(directive.reviewer, runtimeUtc(deps));
  const projection = canonicalReviewProjection(identity, result, decision, repairEvidence);
  validateExistingReview(projection, result, decision, repairEvidence);
  deps.fs.appendFile(
    artifactPath,
    `\n${projection}`,
    "utf8",
  );
  rememberRecordedReview(directive, artifact, result.iteration, deps);
  deps.stdout.write(
    `${JSON.stringify({
      ready: result.verdict === "READY",
      artifact,
      appended: true,
    })}\n`,
  );
}

function runScope(input: string, deps: ReviewerRuntimeDeps): void {
  const directive = readRunStageDirective(input);
  const scope = scopeForDirective(directive, deps);
  const invocation = invocationId(deps.invocationId());
  issueInvocation(directive, invocation, deps);
  deps.stdout.write(
    `${JSON.stringify({ scope, invocationId: invocation, transcript: [] })}\n`,
  );
}

export function runReviewerCommand(
  argv: string[],
  deps: ReviewerRuntimeDeps,
): void {
  try {
    const input = deps.fs.readFile(deps.stdin, "utf8");
    const mode = argv[0];
    if (mode === "scope") runScope(input, deps);
    else if (mode === "check-read") checkRead(input, deps);
    else if (mode === "complete-review") completeReview(input, deps);
    else throw new Error(`unknown internal reviewer mode: ${mode ?? "<missing>"}`);
    deps.exitCode.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.stderr.write(`amadeus-reviewer-runtime: ${message}\n`);
    deps.exitCode.exitCode = 1;
  }
}

if (import.meta.main) runReviewerCommand(process.argv.slice(2), realDeps);
