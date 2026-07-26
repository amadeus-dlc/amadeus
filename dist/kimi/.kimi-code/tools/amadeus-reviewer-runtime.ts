// Internal reviewer runtime for the existing stage-protocol §12a flow.

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

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
  appendFile(path: string, content: string, encoding: "utf8"): void;
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
const REVIEW_MARKER = (iteration: number): string =>
  `## Review — Iteration ${iteration}`;

const realDeps: ReviewerRuntimeDeps = {
  cwd: process.cwd,
  fs: {
    exists: existsSync,
    stat: statSync,
    readFile: readFileSync,
    appendFile: appendFileSync,
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
  const ownerMatches: string[] = [];
  for (const path of directive.consumes) {
    if (!onDisk(path, deps)) continue;
    const content = deps.fs.readFile(absolutePath(path, deps), "utf8");
    const lines = content
      .split(/\r?\n/)
      .filter(
        (line) =>
          line.includes(request.integrationId) && line.includes(request.path),
      );
    ownerMatches.push(...lines.map(() => path));
  }
  if (ownerMatches.length !== 1 || ownerMatches[0] !== request.ownerEvidence.path) {
    throw new Error("spot-check requires exactly one passed owner path");
  }
  const ownerContent = deps.fs.readFile(
    absolutePath(request.ownerEvidence.path, deps),
    "utf8",
  );
  if (
    countOccurrences(ownerContent, request.ownerEvidence.excerpt) !== 1 ||
    !request.ownerEvidence.excerpt.includes(request.integrationId) ||
    !request.ownerEvidence.excerpt.includes(request.path)
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
): string {
  // The first newline is the append separator, not part of the stored block.
  return reviewBlock(identity, result, decision).slice(1);
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
): void {
  reviewField(block, "Verdict");
  reviewField(block, "Reviewer");
  const date = reviewField(block, "Date");
  reviewField(block, "Iteration");
  reviewField(block, "Scope decision");

  const identity = runtimeReviewIdentity(result.reviewer, date);
  if (block !== canonicalReviewProjection(identity, result, decision)) {
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
  if (
    directive.reviewer_max_iterations &&
    result.iteration > directive.reviewer_max_iterations
  ) {
    throw new Error("review iteration exceeds the directive limit");
  }
  const decision = revalidateTranscript(directive, result, deps);
  const artifact = primaryArtifact(directive);
  const artifactPath = absolutePath(artifact, deps);
  const existing = deps.fs.readFile(artifactPath, "utf8");
  const review = existingReviewBlock(existing, result.iteration);
  if (review !== undefined) {
    validateExistingReview(review, result, decision);
    deps.stdout.write(
      `${JSON.stringify({
        ready: result.verdict === "READY",
        artifact,
        appended: false,
      })}\n`,
    );
    return;
  }

  const identity = runtimeReviewIdentity(directive.reviewer, runtimeUtc(deps));
  const projection = canonicalReviewProjection(identity, result, decision);
  validateExistingReview(projection, result, decision);
  deps.fs.appendFile(
    artifactPath,
    `\n${projection}`,
    "utf8",
  );
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
  deps.stdout.write(
    `${JSON.stringify({
      scope,
      invocationId: invocationId(deps.invocationId()),
      transcript: [],
    })}\n`,
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
