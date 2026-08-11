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
//
// Deliberately does NOT import the plugin's renderReport. Core ships to every
// harness whether or not the plugin is installed, and a core->plugin import
// would break the composed host the moment the plugin is dropped. The price is
// a second, minimal reader of the same field names; the shipped test renders
// its fixtures FROM renderReport so the two cannot drift unobserved.
//
// Dispatcher contract: every check
// outcome — pass or fail — exits 0. The only exit-1 path is a missing CLI flag.
// A non-existent --output-path is likewise not an error: absence is the
// artifact guard's business, not the sensor's.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname } from "node:path";
import { requireFlagValue } from "./sensor-flags.ts";
import {
  attestationId,
  auditCarriesAttestation,
  isSelfRecord,
  parseAttestation,
  recordRootForReport,
  reportPayload,
  reportPayloadDigest,
} from "./pr-convergence-attestation.ts";
import { resolveIntentReference } from "./pr-convergence-presentation.ts";

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

/** The basename the code-generation produces entry resolves to (FR-2b). */
export const REPORT_BASENAME = "pr-convergence-report.md";

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
  } else if (kind !== "created" && kind !== "converged" && kind !== "override" && kind !== "landed") {
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
 *  fact. The check rollup is informational and deliberately not checked. */
function checkLanded(body: string, converged: string | null, findings: ReportFormatFinding[]): void {
  if (converged === "true") {
    findings.push({ field: "converged", reason: "a landed report is converged: false by construction" });
  }
  for (const label of ["merged at", "merge commit"]) {
    const value = field(body, label);
    if (value === null || value === "") {
      findings.push({ field: label, reason: `missing — a landed report records the ${label}` });
    } else if (label === "merged at" && Number.isNaN(Date.parse(value))) {
      findings.push({ field: label, reason: `unparseable timestamp "${value}"` });
    }
  }
}

function checkAttestation(outputPath: string, body: string, findings: ReportFormatFinding[]): void {
  const recordRoot = recordRootForReport(outputPath);
  if (recordRoot === null || !isSelfRecord(recordRoot)) return;
  const receipt = parseAttestation(body);
  if (receipt === null) {
    findings.push({ field: "attestation", reason: "missing or malformed CLI attestation" });
    return;
  }
  const expectedId = attestationId({
    intent: receipt.intent, intentUuid: receipt.intentUuid, record: receipt.record,
    bolt: receipt.bolt, unit: receipt.unit, repo: receipt.repo, pr: receipt.pr,
    localHead: receipt.localHead, remoteHead: receipt.remoteHead, prHead: receipt.prHead,
    contentDigest: receipt.contentDigest,
  });
  if (receipt.id !== expectedId) findings.push({ field: "attestation id", reason: "does not bind the declared identity" });
  if (receipt.contentDigest !== reportPayloadDigest(reportPayload(body))) {
    findings.push({ field: "content digest", reason: "does not match current report bytes" });
  }
  const intent = resolveIntentReference(recordRoot);
  const unit = basename(dirname(dirname(outputPath)));
  if (!intent.ok || receipt.intent !== intent.value.name || receipt.intentUuid !== intent.value.uuid || receipt.record !== intent.value.recordPath) {
    findings.push({ field: "intent", reason: "does not match the report owner record" });
  }
  if (receipt.unit !== unit) findings.push({ field: "unit", reason: "does not match the report owner path" });
  const pr = field(body, "pull request");
  if (pr !== `${receipt.repo}#${receipt.pr}`) findings.push({ field: "pull request", reason: "does not match the attestation" });
  if (receipt.localHead !== receipt.remoteHead || receipt.localHead !== receipt.prHead) {
    findings.push({ field: "head", reason: "local, remote, and PR head SHAs differ" });
  }
  const local = spawnSync("git", ["rev-parse", "HEAD"], { cwd: recordRoot, encoding: "utf-8" });
  if (local.status !== 0 || local.stdout.trim() !== receipt.localHead) {
    findings.push({ field: "local head", reason: "does not match the current checkout" });
  }
  if (!auditCarriesAttestation(recordRoot, receipt)) {
    findings.push({ field: "attestation event", reason: "canonical audit receipt is missing" });
  }
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

  const findings: ReportFormatFinding[] = [];
  const { kind, converged } = checkCommon(body, findings);
  if (kind === "override") {
    checkOverride(body, findings);
    if (converged === "true") {
      findings.push({ field: "converged", reason: "an override report is converged: false by construction" });
    }
  } else if (kind === "landed") {
    checkLanded(body, converged, findings);
    findings.push({ field: "kind", reason: "landed is a merge fact, not convergence evidence" });
  } else if (kind === "converged" && converged === "false") {
    findings.push({ field: "converged", reason: "a converged report is converged: true by construction" });
  } else if (kind === "created" && converged === "true") {
    findings.push({ field: "converged", reason: "a created report is converged: false by construction" });
  }
  if (stage === "pr-convergence" && kind === "created") {
    findings.push({ field: "kind", reason: "created proves PR delivery only; final convergence requires converged or override" });
  }
  checkAttestation(outputPath, body, findings);
  const reason = kind === "override" || kind === "landed" || kind === "created" ? kind : "converged";
  return verdict(reason, findings);
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
