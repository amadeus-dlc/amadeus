// covers: file:packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts,
//         file:packages/framework/core/sensors/amadeus-pr-convergence-report-format.md
// size: medium
//
// U3 C8 — the advisory report-format sensor (FR-6a/6b, NFR-3). Two halves:
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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
} from "../../packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts";
import { renderReport } from "../../plugins/pr-convergence/tools/pr-convergence-cli.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = join(
  REPO_ROOT,
  "packages/framework/core/sensors/amadeus-pr-convergence-report-format.md",
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
  test("parses, validates, and is advisory-only", () => {
    const manifest = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    expect(() =>
      validateSensorManifest(manifest, MANIFEST, "pr-convergence-report-format"),
    ).not.toThrow();
    expect(manifest.id).toBe("pr-convergence-report-format");
    expect(manifest.kind).toBe("deterministic");
    // FR-6a: the sensor never enforces. Advisory is the only severity shipped.
    expect(manifest.default_severity).toBe("advisory");
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

  test("a landed report passes with zero findings (#2401)", () => {
    const result = evaluateReportFormat(reportAt(landedReport()));
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("landed");
  });

  test("a non-report path is skipped, not judged", () => {
    const result = evaluateReportFormat(reportAt(convergedReport(), "code-summary.md"));
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("not-a-report");
  });

  test("an absent file is a pass — the guard, not the sensor, owns absence", () => {
    const result = evaluateReportFormat(join(dir, "pr-convergence-report.md"));
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("no-file");
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
