// Plugin-owned blocking evidence check for the convergence report (FR-4).
//
// The `pr-convergence` plugin's CLI is the only legitimate writer of
// `pr-convergence-report.md`; the code-generation artifact guard only asks
// whether that file EXISTS. This sensor closes the gap in the only way a
// sensor may — by looking, never by enforcing: it re-reads the report and
// reports which required fields the CLI would have written and a hand-written
// forgery would not. Both canonical shapes are accepted (ADR-3):
//
//   converged  — the loop reached a clean verdict.
//   override   — a human ruled the Bolt forward without convergence (FR-7b).
//                The human-turn id, the timestamp, and the reason are the
//                whole point of that record, so their absence is a finding.
//   landed     — the merge queue landed the pull request before the loop could
//                report (#3062). Always needs the merge instant and a
//                well-formed merge commit: it records a merge that happened,
//                it does not claim convergence. Accepted at the
//                `pr-convergence` stage unconditionally, and at any other
//                stage (code-generation, in particular — #3235) only when the
//                RECEIPT — not merely the body — attests that merge: the
//                receipt is what turns a merge fact from a claim into
//                evidence, so the stage a landed record may close follows the
//                same rule #3149 gave the checkout/merge binding.
//   superseded — a unit's own pull request never converged because the work
//                it carried reached the trunk through a different pull
//                request or commit (#3239). The human turn, reason, and
//                recorded-at are the override shape it shares (FR-7b); the
//                commit that actually delivered the work is the one field it
//                adds, and it is required in the same well-formed-object-id
//                shape a merge commit is. Unlike landed, it IS the
//                code-generation evidence for that unit — the only report it
//                will ever have — so unlike landed it is accepted at every
//                stage, not only pr-convergence.
//
// Which environment a record answers for is NOT read off its kind (#3149): any
// kind may be finalised against the merge that closed it, and the receipt is
// what says so. See `checkAttestationEnvironment`. #3235 applies the same
// receipt-over-kind principle to which STAGE a `landed` record may finalise.
//
// Deliberately does NOT import the plugin's renderReport. Core ships to every
// harness whether or not the plugin is installed, and a core->plugin import
// would break the composed host the moment the plugin is dropped. The price is
// a second, minimal reader of the same field names; the shipped test renders
// its fixtures FROM renderReport so the two cannot drift unobserved.
//
// Dispatcher contract: every check
// outcome — pass or fail — exits 0. The only exit-1 path is a missing CLI flag.
// A non-existent --output-path is not an exception to that: it exits 0 like any
// other outcome, but as a BLOCKING finding, because the convergence evidence
// the stage requires is absent.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname } from "node:path";
import { requireFlagValue } from "./sensor-flags.ts";
import {
  ATTESTATION_HEADING,
  attestationId,
  auditCarriesAttestation,
  isSelfRecord,
  OWNER_PROJECTION_HEADING,
  parseAttestation,
  parseOwnerProjection,
  REPORT_BASENAME,
  type ReportAttestation,
  recordRootForReport,
  renderAttestation,
  renderOwnerProjection,
  reportPathFor,
  reportPayload,
  reportPayloadDigest,
} from "./pr-convergence-attestation.ts";
import {
  canonicalUnitSlugs,
  resolveDeliveryBoltMembership,
  resolveIntentReference,
} from "./pr-convergence-presentation.ts";

/** Result shape read by the dispatcher: `pass` gates PASSED/FAILED and
 *  `findings_count` is emitted verbatim; `reason` and `findings` are advisory
 *  detail written to the finding file. */
export interface ReportFormatFinding {
  field: string;
  reason: string;
}

export interface ReportFormatResult {
  pass: boolean;
  findings_count: number;
  reason: string;
  findings: ReportFormatFinding[];
}

export { REPORT_BASENAME };

function verdict(reason: string, findings: ReportFormatFinding[]): ReportFormatResult {
  return { pass: findings.length === 0, findings_count: findings.length, reason, findings };
}

/** Read one `- <label>: <value>` line from the report body. Returns null when
 *  the label is absent and "" when it is present but empty — the caller
 *  distinguishes the two so a blank `- reason:` is a finding rather than a
 *  missing field. */
function field(body: string, label: string): string | null {
  const match = body.match(new RegExp(`^- ${label}:[ \\t]*(.*)$`, "m"));
  return match === null ? null : match[1].trim();
}

/** Collect the fields both shapes must carry. `kind` and `converged` are
 *  returned so the caller can cross-check them against each other. */
function checkCommon(body: string, findings: ReportFormatFinding[]): {
  kind: string | null;
  converged: string | null;
} {
  const kind = field(body, "kind");
  if (kind === null || kind === "") {
    findings.push({
      field: "kind",
      reason: "missing — every report declares created, converged, or override",
    });
  } else if (
    kind !== "created" && kind !== "converged" && kind !== "override" &&
    kind !== "landed" && kind !== "superseded"
  ) {
    findings.push({
      field: "kind",
      reason: `unknown kind "${kind}" — expected created, converged, or override`,
    });
  }

  const pr = field(body, "pull request");
  if (pr === null || !/^[^\s]+#\d+$/.test(pr)) {
    findings.push({ field: "pull request", reason: "missing or not <repo>#<number>" });
  }

  const generatedAt = field(body, "generated at");
  if (generatedAt === null || generatedAt === "") {
    findings.push({ field: "generated at", reason: "missing — the report records when it was produced" });
  } else if (Number.isNaN(Date.parse(generatedAt))) {
    findings.push({ field: "generated at", reason: `unparseable timestamp "${generatedAt}"` });
  }

  const converged = field(body, "converged");
  if (converged !== "true" && converged !== "false") {
    findings.push({ field: "converged", reason: "missing or not a boolean" });
  }
  return { kind, converged };
}

/** The override record (FR-7b): the three fields that make the human ruling
 *  auditable. Absent or blank, the report claims a ruling it cannot evidence. */
function checkOverride(body: string, findings: ReportFormatFinding[]): void {
  for (const label of ["human turn", "reason"]) {
    const value = field(body, label);
    if (value === null || value === "") {
      findings.push({ field: label, reason: `missing — an override records the ${label}` });
    }
  }
  const recordedAt = field(body, "recorded at");
  if (recordedAt === null || recordedAt === "") {
    findings.push({ field: "recorded at", reason: "missing — an override records when it was ruled" });
  } else if (Number.isNaN(Date.parse(recordedAt))) {
    findings.push({ field: "recorded at", reason: `unparseable timestamp "${recordedAt}"` });
  }
}

/** The landed record (#2401): the merge instant and the merge commit are what
 *  make it a factual record rather than a bare claim, and a landed report that
 *  says converged: true would smuggle a convergence claim through a merge
 *  fact. Since #3062 this record finalises the pr-convergence stage, so the
 *  merge commit is checked for the object-id shape gh returns rather than
 *  merely for presence — a "merge commit" that is not one records nothing. The
 *  check rollup stays informational and deliberately unchecked: a post-merge
 *  workflow can fail a rollup the pull request never carried. */
type MergeFactLabel = "merged at" | "merge commit";

const MERGE_FACT_LABELS: readonly MergeFactLabel[] = ["merged at", "merge commit"];

/**
 * How a merge fact is malformed, or null when it is well formed. The single
 * definition for both readers — the record's body and the receipt — so a value
 * the body would be refused for cannot pass by travelling in the receipt
 * instead. Shape matters there for the same reason it matters here, and more:
 * since #3149 an attested merge fact is what chooses the merge binding over the
 * checkout binding, so a bare non-empty string would otherwise buy a record its
 * way out of the checkout probe.
 */
function malformedMergeFact(label: MergeFactLabel, value: string): string | null {
  if (label === "merged at") {
    return Number.isNaN(Date.parse(value)) ? `unparseable timestamp "${value}"` : null;
  }
  return /^[0-9a-f]{40}$/.test(value) ? null : `not a commit object id "${value}"`;
}

/** Whether the record's RECEIPT — not merely its body — attests the merge it
 *  was finalised against. Only a self-development record carries a receipt at
 *  all (`checkAttestation` below is a no-op for anything else), so a landed
 *  record outside that scope never has one and stays checkout/pr-convergence
 *  bound (#3062's original boundary). */
function landedReceiptAttestsMerge(outputPath: string, body: string): boolean {
  const recordRoot = recordRootForReport(outputPath);
  if (recordRoot === null || !isSelfRecord(recordRoot)) return false;
  const receipt = parseAttestation(body);
  return receipt !== null && receipt.mergeCommit !== undefined && receipt.mergedAt !== undefined;
}

function checkLanded(body: string, converged: string | null, findings: ReportFormatFinding[]): void {
  if (converged === "true") {
    findings.push({ field: "converged", reason: "a landed report is converged: false by construction" });
  }
  for (const label of MERGE_FACT_LABELS) {
    const value = field(body, label);
    if (value === null || value === "") {
      findings.push({ field: label, reason: `missing — a landed report records the ${label}` });
      continue;
    }
    const malformed = malformedMergeFact(label, value);
    if (malformed !== null) findings.push({ field: label, reason: malformed });
  }
}

/** The superseded record (#3239): the override shape (human turn, reason,
 *  recorded at) plus the one fact it adds — the commit that actually
 *  delivered the work, in the same well-formed-object-id shape a merge
 *  commit is checked in. A superseded report claiming converged:true would
 *  smuggle a convergence claim through a record that exists precisely
 *  because convergence never happened. */
function checkSuperseded(body: string, converged: string | null, findings: ReportFormatFinding[]): void {
  checkOverride(body, findings);
  if (converged === "true") {
    findings.push({ field: "converged", reason: "a superseded report is converged: false by construction" });
  }
  const supersededBy = field(body, "superseded by");
  if (supersededBy === null || supersededBy === "") {
    findings.push({
      field: "superseded by",
      reason: "missing — a superseded report records the commit that actually delivered the work",
    });
  } else if (!/^[0-9a-f]{40}$/.test(supersededBy)) {
    findings.push({ field: "superseded by", reason: `not a commit object id "${supersededBy}"` });
  }
}

function checkOwnerProjection(
  body: string,
  receipt: ReportAttestation,
  ownerUnit: string,
  findings: ReportFormatFinding[],
): void {
  const start = body.indexOf(OWNER_PROJECTION_HEADING);
  if (receipt.memberUnits === undefined) {
    if (start !== -1) findings.push({ field: "owner projection", reason: "single-Unit reports must keep legacy bytes" });
    return;
  }
  const projection = parseOwnerProjection(body);
  const end = body.indexOf(ATTESTATION_HEADING);
  if (
    projection === null || start === -1 || end <= start ||
    body.slice(start, end) !== renderOwnerProjection(projection)
  ) {
    findings.push({ field: "owner projection", reason: "missing, malformed, or non-canonical" });
    return;
  }
  const expectedPath = reportPathFor(receipt.record, ownerUnit);
  if (!ownerProjectionMatches(projection, receipt, receipt.memberUnits, ownerUnit, expectedPath)) {
    findings.push({ field: "owner projection", reason: "does not bind the attestation tuple and owner path" });
  }
}

function ownerProjectionMatches(
  projection: NonNullable<ReturnType<typeof parseOwnerProjection>>,
  receipt: ReportAttestation,
  memberUnits: readonly string[],
  ownerUnit: string,
  expectedPath: string,
): boolean {
  return projection.intent === receipt.intent && projection.intentUuid === receipt.intentUuid &&
    projection.record === receipt.record && projection.bolt === receipt.bolt &&
    projection.memberUnits.join("\0") === memberUnits.join("\0") &&
    projection.ownerUnit === receipt.unit && projection.ownerUnit === ownerUnit &&
    projection.reportPath === expectedPath && projection.repo === receipt.repo &&
    projection.pr === receipt.pr && projection.head === receipt.localHead;
}

function checkCanonicalAttestation(
  body: string,
  receipt: ReportAttestation,
  findings: ReportFormatFinding[],
): void {
  if (body.startsWith("\uFEFF") || body.includes("\r") || !body.endsWith("\n") || body.endsWith("\n\n")) {
    findings.push({ field: "canonical bytes", reason: "report must be BOM-free LF text with exactly one trailing newline" });
  }
  const start = body.indexOf(ATTESTATION_HEADING);
  if (start === -1 || body.slice(start) !== renderAttestation(receipt)) {
    findings.push({ field: "attestation", reason: "does not use the canonical field order" });
  }
}

function checkAttestationIntegrity(
  body: string,
  receipt: ReportAttestation,
  findings: ReportFormatFinding[],
): void {
  const expectedId = attestationId({
    intent: receipt.intent, intentUuid: receipt.intentUuid, record: receipt.record,
    bolt: receipt.bolt, unit: receipt.unit,
    ...(receipt.memberUnits === undefined ? {} : { memberUnits: receipt.memberUnits }),
    repo: receipt.repo, pr: receipt.pr,
    localHead: receipt.localHead, remoteHead: receipt.remoteHead, prHead: receipt.prHead,
    ...(receipt.mergeCommit === undefined ? {} : { mergeCommit: receipt.mergeCommit }),
    ...(receipt.mergedAt === undefined ? {} : { mergedAt: receipt.mergedAt }),
    contentDigest: receipt.contentDigest,
  });
  if (receipt.id !== expectedId) findings.push({ field: "attestation id", reason: "does not bind the declared identity" });
  if (receipt.contentDigest !== reportPayloadDigest(reportPayload(body))) {
    findings.push({ field: "content digest", reason: "does not match current report bytes" });
  }
}

function checkAttestationOwner(
  recordRoot: string,
  outputPath: string,
  body: string,
  receipt: ReportAttestation,
  findings: ReportFormatFinding[],
): string {
  const intent = resolveIntentReference(recordRoot);
  const unit = basename(dirname(dirname(outputPath)));
  checkOwnerProjection(body, receipt, unit, findings);
  if (!intent.ok || receipt.intent !== intent.value.name || receipt.intentUuid !== intent.value.uuid || receipt.record !== intent.value.recordPath) {
    findings.push({ field: "intent", reason: "does not match the report owner record" });
  }
  if (receipt.unit !== unit) findings.push({ field: "unit", reason: "does not match the report owner path" });
  return unit;
}

function checkAttestationMembers(
  recordRoot: string,
  unit: string,
  receipt: ReportAttestation,
  findings: ReportFormatFinding[],
): void {
  const effectiveMembers = receipt.memberUnits ?? [receipt.unit];
  const members = canonicalUnitSlugs(effectiveMembers);
  if (!members.ok || !effectiveMembers.includes(unit)) {
    findings.push({ field: "member units", reason: "not canonical or does not contain the report owner" });
    return;
  }
  const approved = resolveDeliveryBoltMembership(recordRoot, receipt.bolt);
  if (!approved.ok || approved.value.join("\0") !== members.value.join("\0")) {
    findings.push({ field: "member units", reason: "does not match the approved Delivery Bolt projection" });
  }
}

/** Whether the record touches merge facts at all — through the receipt that
 *  attests them, or through the body that states them. */
function touchesMergeFacts(body: string, receipt: ReportAttestation): boolean {
  return receipt.mergeCommit !== undefined || receipt.mergedAt !== undefined ||
    field(body, "merge commit") !== null || field(body, "merged at") !== null;
}

/**
 * What the receipt is bound to besides its own identity. A live record answers
 * for the checkout it was written from; a record finalised against a merge
 * cannot — the merge queue commonly deletes the head branch and the checkout
 * has moved on, so the merge stands in that place.
 *
 * Which of the two applies is decided by the receipt, never by the kind
 * (#3149). A `converged` verdict is final and cannot be re-minted as another
 * kind, so binding the choice to `landed` left every merged converged record
 * red the moment the checkout moved — with no kind it was allowed to become.
 * The merge facts travel in the receipt, and through it in the audit shard, so
 * "was this finalised against a merge?" is answerable from the record alone,
 * without a network call and without consulting the kind.
 */
function checkAttestationEnvironment(
  recordRoot: string,
  body: string,
  receipt: ReportAttestation,
  findings: ReportFormatFinding[],
): void {
  const pr = field(body, "pull request");
  if (pr !== `${receipt.repo}#${receipt.pr}`) findings.push({ field: "pull request", reason: "does not match the attestation" });
  if (receipt.localHead !== receipt.remoteHead || receipt.localHead !== receipt.prHead) {
    findings.push({ field: "head", reason: "local, remote, and PR head SHAs differ" });
  }
  if (touchesMergeFacts(body, receipt)) checkMergeBinding(body, receipt, findings);
  else checkCheckoutBinding(recordRoot, receipt, findings);
  if (!auditCarriesAttestation(recordRoot, receipt)) {
    findings.push({ field: "attestation event", reason: "canonical audit receipt is missing" });
  }
}

/** The merge facts are evidence only when the receipt — and through it the
 *  audit shard — attests them. A record that merely states them in its body has
 *  written them by hand, which is the forgery this check exists to catch; where
 *  both state and attest, the two must agree. */
function checkMergeBinding(
  body: string,
  receipt: ReportAttestation,
  findings: ReportFormatFinding[],
): void {
  if (receipt.mergeCommit === undefined || receipt.mergedAt === undefined) {
    findings.push({
      field: "attestation",
      reason: "a record bound to a merge attests the merge commit and the merge instant",
    });
    return;
  }
  const attested: ReadonlyArray<readonly [MergeFactLabel, string]> = [
    ["merged at", receipt.mergedAt],
    ["merge commit", receipt.mergeCommit],
  ];
  for (const [label, value] of attested) {
    const malformed = malformedMergeFact(label, value);
    if (malformed !== null) {
      findings.push({ field: label, reason: `attested value is malformed — ${malformed}` });
    }
    const stated = field(body, label);
    if (stated !== null && stated !== value) {
      findings.push({ field: label, reason: "does not match the attestation" });
    }
  }
}

function checkCheckoutBinding(
  recordRoot: string,
  receipt: ReportAttestation,
  findings: ReportFormatFinding[],
): void {
  const local = spawnSync("git", ["rev-parse", "HEAD"], { cwd: recordRoot, encoding: "utf-8" });
  if (local.status !== 0 || local.stdout.trim() !== receipt.localHead) {
    findings.push({ field: "local head", reason: "does not match the current checkout" });
  }
}

function checkAttestation(
  outputPath: string,
  body: string,
  findings: ReportFormatFinding[],
): void {
  const recordRoot = recordRootForReport(outputPath);
  if (recordRoot === null || !isSelfRecord(recordRoot)) return;
  const receipt = parseAttestation(body);
  if (receipt === null) {
    findings.push({ field: "attestation", reason: "missing or malformed CLI attestation" });
    return;
  }
  checkCanonicalAttestation(body, receipt, findings);
  checkAttestationIntegrity(body, receipt, findings);
  const unit = checkAttestationOwner(recordRoot, outputPath, body, receipt, findings);
  checkAttestationMembers(recordRoot, unit, receipt, findings);
  checkAttestationEnvironment(recordRoot, body, receipt, findings);
}

/** The section body between a real `## <heading>` line (outside code fences)
 *  and the next heading, or null when the heading never appears as a heading. */
function markdownSectionContent(body: string, heading: string): string | null {
  const lines = body.split("\n");
  let inFence = false;
  let start = -1;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (start < 0) {
      if (line.trimEnd() === heading) start = index + 1;
      continue;
    }
    if (/^#{1,6} /.test(line)) return lines.slice(start, index).join("\n");
  }
  return start < 0 ? null : lines.slice(start).join("\n");
}

function isLocalCodeGenerationEvidence(body: string): boolean {
  if (field(body, "kind") !== null) return false;
  const verdictSection = markdownSectionContent(body, "## 判定");
  const evidenceSection = markdownSectionContent(body, "## 実行証拠");
  return verdictSection !== null && verdictSection.trim().length > 0
    && evidenceSection !== null && evidenceSection.trim().length > 0;
}

/** Pure evaluation core (in-process test seam). Reads the file itself so the
 *  CLI entry stays a thin argv shim. */
export function evaluateReportFormat(outputPath: string, stage?: string): ReportFormatResult {
  if (basename(outputPath) !== REPORT_BASENAME) return verdict("not-a-report", []);

  let body: string;
  try {
    body = readFileSync(outputPath, "utf-8");
  } catch {
    return verdict("no-file", [{ field: "report", reason: "missing — blocking evidence must exist" }]);
  }

  if (stage === "code-generation" && isLocalCodeGenerationEvidence(body)) {
    return verdict("local-evidence", []);
  }

  const findings: ReportFormatFinding[] = [];
  const { kind, converged } = checkCommon(body, findings);
  applyKindRules(kind, converged, body, findings, stage, landedReceiptAttestsMerge(outputPath, body));
  checkAttestation(outputPath, body, findings);
  const reason = kind === "override" || kind === "landed" || kind === "created" || kind === "superseded"
    ? kind
    : "converged";
  return verdict(reason, findings);
}

function applyKindRules(
  kind: string | null,
  converged: string | null,
  body: string,
  findings: ReportFormatFinding[],
  stage: string | undefined,
  mergeAttested: boolean,
): void {
  if (kind === "override") {
    checkOverride(body, findings);
    if (converged === "true") {
      findings.push({ field: "converged", reason: "an override report is converged: false by construction" });
    }
    return;
  }
  if (kind === "landed") {
    checkLanded(body, converged, findings);
    if (stage !== "pr-convergence" && !mergeAttested) {
      findings.push({
        field: "kind",
        reason: "landed without a receipt-attested merge finalises the pr-convergence stage only (#3235)",
      });
    }
    return;
  }
  if (kind === "superseded") {
    checkSuperseded(body, converged, findings);
    return;
  }
  if (kind === "converged" && converged === "false") {
    findings.push({ field: "converged", reason: "a converged report is converged: true by construction" });
  } else if (kind === "created" && converged === "true") {
    findings.push({ field: "converged", reason: "a created report is converged: false by construction" });
  }
  if (stage === "pr-convergence" && kind === "created") {
    findings.push({ field: "kind", reason: "created proves PR delivery only; final convergence requires converged or override" });
  }
}

interface Flags {
  stage?: string;
  outputPath?: string;
}

function parseFlags(argv: string[]): Flags {
  const out: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--stage") out.stage = requireFlagValue(argv, ++i, "--stage", fail);
    else if (argv[i] === "--output-path") out.outputPath = requireFlagValue(argv, ++i, "--output-path", fail);
  }
  return out;
}

/** The only non-zero exit: a missing required flag, or a flag whose value is
 *  missing / stolen by the next flag. Exported as an in-process seam — reached
 *  from `main` it runs inside a spawned child, which bun's coverage does not
 *  measure, so the arm would sit permanently uncovered while its behaviour is
 *  genuinely tested. */
export function fail(msg: string): never {
  process.stderr.write(`amadeus-sensor-pr-convergence-report-format: ${msg}\n`);
  process.exit(1);
}

/** CLI entry / in-process test seam. Exits 1 ONLY on a missing required flag;
 *  every check outcome is stdout JSON with exit 0 for the dispatcher. */
export function main(argv: string[] = process.argv.slice(2)): void {
  const flags = parseFlags(argv);
  if (!flags.stage) fail("--stage is required");
  if (!flags.outputPath) fail("--output-path is required");
  process.stdout.write(`${JSON.stringify(evaluateReportFormat(flags.outputPath, flags.stage))}\n`);
  process.exit(0);
}

// Guard the CLI entry so the module can be imported (the exported seams are
// driven in-process by tests) without executing main() at load time.
if (import.meta.main) main();
