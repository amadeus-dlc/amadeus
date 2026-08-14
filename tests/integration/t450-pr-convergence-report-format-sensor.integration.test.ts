// covers: file:plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts,
//         file:plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md
// size: medium
//
// U3 C8 — the blocking report-format sensor (FR-4, NFR-3). Two halves:
//
//   1. The manifest is a well-formed sensor manifest by the SHIPPED schema
//      (parseSensorManifest + validateSensorManifest), advisory-only, and its
//      `matches` glob addresses the per-unit report path the guard reads.
//   2. The predicate accepts BOTH canonical shapes rendered by the plugin CLI
//      (converged / override — ADR-3) and goes red on each missing required
//      field. The red half is the falling evidence: an override report with no
//      `human turn` / `reason` is exactly the hand-written forgery FR-6 is
//      meant to surface.
//
// The sensor deliberately re-parses the report with its own minimal reader
// rather than importing the plugin tools: core must not depend on a plugin
// bundle that may not be installed. The two shapes are kept in step by this
// file, which renders its fixtures from the CLI's own renderReport.
//
// Touches a real filesystem (fixtures on disk + the real manifest), hence the
// integration tier (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseSensorManifest,
  validateSensorManifest,
} from "../../packages/framework/core/tools/amadeus-sensor-schema.ts";
import {
  evaluateReportFormat,
  main as sensorMain,
} from "../../plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts";
import {
  attestationId,
  renderAttestation,
  type ReportAttestation,
  reportPayloadDigest,
} from "../../plugins/pr-convergence/tools/pr-convergence-attestation.ts";
import { renderReport } from "../../plugins/pr-convergence/tools/pr-convergence-cli.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = join(
  REPO_ROOT,
  "plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md",
);

const VERDICT = {
  converged: true,
  mergeState: "clean",
  mergeableResolution: "MERGEABLE",
  violating: { repliedUnresolved: 0, ignored: 0 },
} as const;

const LEDGER = {
  resolved: 3,
  outdated: 1,
  repliedUnresolved: 0,
  ignored: 0,
  humanOnly: 0,
  terminalized: 1,
} as const;

function convergedReport(): string {
  return renderReport({
    kind: "converged",
    generatedAt: "2026-08-05T10:00:00.000Z",
    prRef: { repo: "amadeus-dlc/amadeus", number: 1971 },
    // The CLI's own types are wider than this fixture needs; the render only
    // reads the fields listed above.
    verdict: VERDICT as never,
    ledgerSummary: LEDGER as never,
  });
}

function overrideReport(): string {
  return renderReport({
    kind: "override",
    generatedAt: "2026-08-05T10:05:00.000Z",
    prRef: { repo: "amadeus-dlc/amadeus", number: 1971 },
    verdict: { ...VERDICT, converged: false } as never,
    ledgerSummary: LEDGER as never,
    override: {
      humanTurnId: "e1f2a3b4",
      reason: "GitHub unreachable — human ruling recorded",
      recordedAt: "2026-08-05T10:05:00.000Z",
    },
  });
}

function landedReport(): string {
  return renderReport({
    kind: "landed",
    prRef: { repo: "amadeus-dlc/amadeus", number: 2401 },
    mergedAt: "2026-08-07T01:00:00Z",
    mergeCommitOid: "0123456789abcdef0123456789abcdef01234567",
    checkRollupState: "SUCCESS",
    generatedAt: "2026-08-07T02:00:00Z",
  });
}

let dir = "";
function reportAt(body: string, name = "pr-convergence-report.md"): string {
  const path = join(dir, name);
  writeFileSync(path, body, "utf-8");
  return path;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "amadeus-t450-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("t450 manifest conforms to the shipped sensor schema", () => {
  test("parses, validates, and is blocking", () => {
    const manifest = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    expect(() =>
      validateSensorManifest(manifest, MANIFEST, "pr-convergence-report-format"),
    ).not.toThrow();
    expect(manifest.id).toBe("pr-convergence-report-format");
    expect(manifest.kind).toBe("deterministic");
    expect(manifest.default_severity).toBe("blocking");
    expect(manifest.command).toContain("amadeus-sensor-pr-convergence-report-format.ts");
  });

  test("matches addresses the per-unit report path the guard reads (FR-2b)", () => {
    const manifest = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    expect(manifest.matches).toBe(
      "**/construction/*/code-generation/pr-convergence-report.md",
    );
  });
});

describe("t450 predicate accepts both canonical shapes (ADR-3)", () => {
  test("a converged report passes with zero findings", () => {
    const result = evaluateReportFormat(reportAt(convergedReport()));
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.findings_count).toBe(0);
    expect(result.reason).toBe("converged");
  });

  test("an override report passes with zero findings", () => {
    const result = evaluateReportFormat(reportAt(overrideReport()));
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("override");
  });

  test("a landed report is not convergence evidence", () => {
    const result = evaluateReportFormat(reportAt(landedReport()));
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("landed");
  });

  test("a non-report path is skipped, not judged", () => {
    const result = evaluateReportFormat(reportAt(convergedReport(), "code-summary.md"));
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("not-a-report");
  });

  test("an absent file fails closed", () => {
    const result = evaluateReportFormat(join(dir, "pr-convergence-report.md"));
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("no-file");
  });

  test("code-generation accepts a local-evidence report without a CLI kind", () => {
    const body = [
      "# 収束レポート — example",
      "",
      "## 判定",
      "",
      "READY（local implementation scope）。",
      "",
      "## 実行証拠",
      "",
      "| Command | Result |",
      "",
    ].join("\n");
    const result = evaluateReportFormat(reportAt(body), "code-generation");
    expect(result).toEqual({
      pass: true,
      findings_count: 0,
      reason: "local-evidence",
      findings: [],
    });
  });

  test("pr-convergence still rejects a local-evidence report", () => {
    const body = "# 収束レポート\n\n## 判定\n\nREADY\n\n## 実行証拠\n\n";
    const result = evaluateReportFormat(reportAt(body), "pr-convergence");
    expect(result.pass).toBe(false);
    expect(result.findings.map((finding) => finding.field)).toContain("kind");
  });

  test("code-generation still fail-closes a report that is neither local evidence nor CLI-shaped", () => {
    const result = evaluateReportFormat(reportAt("# notes\n"), "code-generation");
    expect(result.pass).toBe(false);
    expect(result.findings.map((finding) => finding.field)).toContain("kind");
  });
});

describe("t450 falling evidence — each missing required field goes red", () => {
  // Table-driven so the red half covers EVERY required field rather than one
  // representative; a field silently dropped from the predicate shows up here.
  const cases: ReadonlyArray<readonly [label: string, mutate: (body: string) => string, field: string]> = [
    ["kind", (b) => b.replace(/^- kind: .*\n/m, ""), "kind"],
    ["pull request", (b) => b.replace(/^- pull request: .*\n/m, ""), "pull request"],
    ["generated at", (b) => b.replace(/^- generated at: .*\n/m, ""), "generated at"],
    ["converged", (b) => b.replace(/^- converged: .*\n/m, ""), "converged"],
  ];
  for (const [label, mutate, field] of cases) {
    test(`a converged report without "${label}" is a finding`, () => {
      const result = evaluateReportFormat(reportAt(mutate(convergedReport())));
      expect(result.pass).toBe(false);
      expect(result.findings.map((f) => f.field)).toContain(field);
      expect(result.findings_count).toBe(result.findings.length);
    });
  }

  const overrideCases: ReadonlyArray<readonly [label: string, pattern: RegExp, field: string]> = [
    ["human turn", /^- human turn: .*\n/m, "human turn"],
    ["recorded at", /^- recorded at: .*\n/m, "recorded at"],
    ["reason", /^- reason: .*\n/m, "reason"],
  ];
  for (const [label, pattern, field] of overrideCases) {
    test(`an override report without "${label}" is a finding (FR-7b forgery surface)`, () => {
      const result = evaluateReportFormat(reportAt(overrideReport().replace(pattern, "")));
      expect(result.pass).toBe(false);
      expect(result.findings.map((f) => f.field)).toContain(field);
    });
  }

  test("an override recorded-at that does not parse as a timestamp is a finding", () => {
    const body = overrideReport().replace(/^- recorded at: .*$/m, "- recorded at: not-a-timestamp");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    const finding = result.findings.find((f) => f.field === "recorded at");
    expect(finding?.reason).toContain("unparseable");
  });

  test("an override reason that is present but blank is still a finding", () => {
    const body = overrideReport().replace(/^- reason: .*$/m, "- reason:");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("reason");
  });

  test("kind override with converged:true is an internal contradiction", () => {
    const body = overrideReport().replace("- converged: false", "- converged: true");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("converged");
  });

  test("kind converged with converged:false is an internal contradiction", () => {
    const body = convergedReport().replace("- converged: true", "- converged: false");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("converged");
  });

  test("an unparseable generated-at timestamp is a finding", () => {
    const body = convergedReport().replace(/^- generated at: .*$/m, "- generated at: yesterday");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("generated at");
  });

  test("a landed report claiming converged:true is an internal contradiction (#2401)", () => {
    const body = landedReport().replace("- converged: false", "- converged: true");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("converged");
  });

  test("a landed report without merged at is a finding (#2401)", () => {
    const body = landedReport().replace(/^- merged at: .*\n/m, "");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("merged at");
  });

  test("a landed report with an unparseable merged at is a finding (#2401)", () => {
    const body = landedReport().replace(/^- merged at: .*$/m, "- merged at: not-a-timestamp");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("merged at");
  });

  test("a landed report without a merge commit is a finding (#2401)", () => {
    const body = landedReport().replace(/^- merge commit: .*\n/m, "");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("merge commit");
  });

  test("an unknown kind is a finding, never a silent pass", () => {
    const body = convergedReport().replace("- kind: converged", "- kind: waived");
    const result = evaluateReportFormat(reportAt(body));
    expect(result.pass).toBe(false);
    expect(result.findings.map((f) => f.field)).toContain("kind");
  });
});

// ---------------------------------------------------------------------------
// The attestation half: only a self-development record is checked, so these
// fixtures build the real `amadeus/spaces/<space>/intents/<intent>` layout the
// sensor resolves the record root from.
// ---------------------------------------------------------------------------

const SELF_SHA = "c".repeat(40);
const SELF_UNIT = "cli";
const SELF_SLUG = "t450-gate";
const SELF_DIR = "260812-t450-gate";
const SELF_UUID = "uuid-t450";
const SELF_RECORD_PATH = `amadeus/spaces/default/intents/${SELF_DIR}/`;

interface SelfRecord {
  readonly record: string;
  /** Writes the report at the per-unit path and returns it. */
  readonly reportAt: (body: string) => string;
}

function selfRecord(options: { registry?: boolean; audit?: string } = {}): SelfRecord {
  const intents = join(dir, "amadeus", "spaces", "default", "intents");
  const record = join(intents, SELF_DIR);
  const stage = join(record, "construction", SELF_UNIT, "code-generation");
  mkdirSync(stage, { recursive: true });
  writeFileSync(join(record, "amadeus-state.md"), "- **Scope**: self-fix\n", "utf-8");
  if (options.registry !== false) {
    writeFileSync(
      join(intents, "intents.json"),
      `${JSON.stringify([
        { slug: SELF_SLUG, uuid: SELF_UUID, dirName: SELF_DIR, status: "in-flight" },
      ])}\n`,
      "utf-8",
    );
  }
  if (options.audit !== undefined) {
    mkdirSync(join(record, "audit"), { recursive: true });
    writeFileSync(join(record, "audit", "clone.jsonl"), options.audit, "utf-8");
  }
  return {
    record,
    reportAt: (body) => {
      const path = join(stage, "pr-convergence-report.md");
      writeFileSync(path, body, "utf-8");
      return path;
    },
  };
}

/** A report payload plus a receipt that binds it, with fields overridable so a
 *  single mismatch can be isolated. */
function attested(payload: string, overrides: Partial<Omit<ReportAttestation, "id">> = {}): string {
  const unsigned = {
    intent: SELF_SLUG,
    intentUuid: SELF_UUID,
    record: SELF_RECORD_PATH,
    bolt: "delivery",
    unit: SELF_UNIT,
    repo: "amadeus-dlc/amadeus",
    pr: 2838,
    localHead: SELF_SHA,
    remoteHead: SELF_SHA,
    prHead: SELF_SHA,
    contentDigest: reportPayloadDigest(payload),
    ...overrides,
  };
  return `${payload}${renderAttestation({ id: attestationId(unsigned), ...unsigned })}`;
}

function createdPayload(): string {
  return renderReport({
    kind: "created",
    generatedAt: "2026-08-12T00:00:00Z",
    prRef: { repo: "amadeus-dlc/amadeus", number: 2838 },
  });
}

function auditRow(body: string): string {
  const id = body.match(/^- attestation id: (\S+)$/m)?.[1] ?? "";
  return `${JSON.stringify({
    attributes: { Event: "ARTIFACT_ATTESTED", "Attestation Id": id },
  })}\n`;
}

const fieldsOf = (result: { findings: readonly { field: string }[] }) =>
  result.findings.map((finding) => finding.field);

describe("t450 attestation checks on a self-development record", () => {
  test("a report with no attestation section is a single, named finding", () => {
    const self = selfRecord();
    const result = evaluateReportFormat(self.reportAt(createdPayload()), "code-generation");
    expect(result.pass).toBe(false);
    expect(fieldsOf(result)).toContain("attestation");
    // The check stops at the missing receipt rather than cascading.
    expect(fieldsOf(result)).not.toContain("content digest");
  });

  test("bytes edited after the receipt was written break the content digest", () => {
    const self = selfRecord();
    const body = attested(createdPayload()).replace(
      "- generated at: 2026-08-12T00:00:00Z",
      "- generated at: 2026-08-12T09:00:00Z",
    );
    const result = evaluateReportFormat(self.reportAt(body), "code-generation");
    expect(fieldsOf(result)).toContain("content digest");
  });

  test("a receipt naming an intent the record cannot resolve is a finding", () => {
    const self = selfRecord({ registry: false });
    const result = evaluateReportFormat(
      self.reportAt(attested(createdPayload())),
      "code-generation",
    );
    expect(fieldsOf(result)).toContain("intent");
  });

  test("a receipt whose local, remote, and PR heads disagree is a finding", () => {
    const self = selfRecord();
    const body = attested(createdPayload(), { remoteHead: "d".repeat(40) });
    const result = evaluateReportFormat(self.reportAt(body), "code-generation");
    expect(fieldsOf(result)).toContain("head");
  });

  test("a receipt that no audit shard carries, and whose head is not the checkout, is red", () => {
    const self = selfRecord();
    const result = evaluateReportFormat(
      self.reportAt(attested(createdPayload())),
      "code-generation",
    );
    expect(fieldsOf(result)).toContain("attestation event");
    // The fixture is not a git checkout at that SHA, so the local-head probe
    // fails too — both are independent findings.
    expect(fieldsOf(result)).toContain("local head");
  });

  test("an audit shard carrying the receipt clears the attestation-event finding", () => {
    const body = attested(createdPayload());
    const self = selfRecord({ audit: auditRow(body) });
    const result = evaluateReportFormat(self.reportAt(body), "code-generation");
    expect(fieldsOf(result)).not.toContain("attestation event");
  });

  test("a created report claiming convergence is a finding", () => {
    const body = createdPayload().replace("- converged: false", "- converged: true");
    const result = evaluateReportFormat(reportAt(body), "code-generation");
    expect(result.pass).toBe(false);
    expect(fieldsOf(result)).toContain("converged");
  });
});

describe("t450 CLI contract — advisory means exit 0 on both verdicts", () => {
  function run(argv: string[]): { code: number; stdout: string } {
    let stdout = "";
    let code = -1;
    const write = process.stdout.write.bind(process.stdout);
    const exit = process.exit.bind(process);
    // biome-ignore lint/suspicious/noExplicitAny: process.exit's never-return type
    (process as any).exit = (c: number) => {
      code = c;
      throw new Error("__exit__");
    };
    process.stdout.write = ((chunk: string) => {
      stdout += chunk;
      return true;
    }) as typeof process.stdout.write;
    try {
      sensorMain(argv);
    } catch (err) {
      if (!(err instanceof Error) || err.message !== "__exit__") throw err;
    } finally {
      process.stdout.write = write;
      // biome-ignore lint/suspicious/noExplicitAny: restore the real exit
      (process as any).exit = exit;
    }
    return { code, stdout };
  }

  test("a passing report exits 0 with a JSON verdict", () => {
    const path = reportAt(convergedReport());
    const { code, stdout } = run(["--stage", "code-generation", "--output-path", path]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, findings_count: 0 });
  });

  test("a failing report ALSO exits 0 — the verdict is data, not enforcement", () => {
    const path = reportAt(convergedReport().replace(/^- converged: .*\n/m, ""));
    const { code, stdout } = run(["--stage", "code-generation", "--output-path", path]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: false });
  });

  test("a missing flag is the only exit-1 path", () => {
    const { code } = run(["--stage", "code-generation"]);
    expect(code).toBe(1);
  });
});
