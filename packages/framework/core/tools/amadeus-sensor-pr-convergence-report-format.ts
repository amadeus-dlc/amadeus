// pr-convergence-report-format sensor — advisory surface for the convergence
// report's shape (FR-6a/6b, ADR-3).
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
// Advisory contract, as in amadeus-sensor-answer-evidence.ts: every check
// outcome — pass or fail — exits 0. The only exit-1 path is a missing CLI flag.
// A non-existent --output-path is likewise not an error: absence is the
// artifact guard's business, not the sensor's.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

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
      reason: "missing — every report declares converged, override or landed",
    });
  } else if (kind !== "converged" && kind !== "override" && kind !== "landed") {
    findings.push({
      field: "kind",
      reason: `unknown kind "${kind}" — expected converged, override or landed`,
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
    }
  }
}

/** Pure evaluation core (in-process test seam). Reads the file itself so the
 *  CLI entry stays a thin argv shim. */
export function evaluateReportFormat(outputPath: string): ReportFormatResult {
  if (basename(outputPath) !== REPORT_BASENAME) return verdict("not-a-report", []);

  let body: string;
  try {
    body = readFileSync(outputPath, "utf-8");
  } catch {
    return verdict("no-file", []);
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
  } else if (kind === "converged" && converged === "false") {
    findings.push({ field: "converged", reason: "a converged report is converged: true by construction" });
  }
  const reason = kind === "override" || kind === "landed" ? kind : "converged";
  return verdict(reason, findings);
}

interface Flags {
  stage?: string;
  outputPath?: string;
}

function parseFlags(argv: string[]): Flags {
  const out: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--stage") out.stage = argv[++i];
    else if (argv[i] === "--output-path") out.outputPath = argv[++i];
  }
  return out;
}

function fail(msg: string): never {
  process.stderr.write(`amadeus-sensor-pr-convergence-report-format: ${msg}\n`);
  process.exit(1);
}

/** CLI entry / in-process test seam. Exits 1 ONLY on a missing required flag;
 *  every check outcome is stdout JSON with exit 0 (advisory contract). */
export function main(argv: string[] = process.argv.slice(2)): void {
  const flags = parseFlags(argv);
  if (!flags.stage) fail("--stage is required");
  if (!flags.outputPath) fail("--output-path is required");
  process.stdout.write(`${JSON.stringify(evaluateReportFormat(flags.outputPath))}\n`);
  process.exit(0);
}

// Guard the CLI entry so the module can be imported (the exported seams are
// driven in-process by tests) without executing main() at load time.
if (import.meta.main) main();
