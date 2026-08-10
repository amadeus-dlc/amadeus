// covers: file:packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts,
//         file:packages/framework/core/sensors/amadeus-numeric-provenance.md
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  classifyNumericProvenanceEvidence,
  evaluateNumericProvenance,
  GENERATED_NUMERIC_PROVENANCE_MAPPING,
  indexSweepArtifacts,
  sampleNumericClaimIdentity,
  scanNumericClaims,
  sweepNumericProvenance,
  validateGeneratedMapping,
} from "../../packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts";
import { parseSensorManifest, validateSensorManifest } from "../../packages/framework/core/tools/amadeus-sensor-schema.ts";
import { matchesGlob } from "../../packages/framework/core/tools/amadeus-sensor.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const MANIFEST = join(REPO_ROOT, "packages/framework/core/sensors/amadeus-numeric-provenance.md");
const CODE_GENERATION_STAGE = join(
  REPO_ROOT,
  "packages/framework/core/amadeus-common/stages/construction/code-generation.md",
);
const SWEEP_REPORT = join(
  REPO_ROOT,
  "amadeus/spaces/default/intents/260810-numeric-provenance-guard/construction/numeric-provenance-sensor-cli/measurements/numeric-provenance-corpus-sweep.md",
);
const LABELS_FIXTURE = join(
  REPO_ROOT,
  "tests/fixtures/numeric-provenance-sensor/code-summary-count-labels.json",
);

const DEPS = {
  fileExists: () => false,
  isRegularFile: () => false,
};

describe("t532 numeric provenance evaluator", () => {
  test("maps a missing artifact to an observable fail-open verdict", () => {
    const result = evaluateNumericProvenance(
      {
        stage: "code-generation",
        outputPath:
          "/workspace/amadeus/spaces/default/intents/260810-fixture/construction/example/code-generation/code-summary.md",
        content: { kind: "missing" },
      },
      DEPS,
    );

    expect(result).toEqual({
      pass: true,
      skipped: true,
      findings_count: 0,
      findings: [],
      metrics: {},
      reason: "file-not-found",
    });
  });

  test("returns one finding for one unprovenanced enforcement claim", () => {
    const result = evaluateNumericProvenance(
      {
        stage: "code-generation",
        outputPath:
          "/workspace/amadeus/spaces/default/intents/260810-fixture/construction/example/code-generation/code-summary.md",
        content: { kind: "present", markdown: "The corpus contains 10 files.\n" },
      },
      DEPS,
    );

    expect(result.pass).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.findings_count).toBe(1);
    expect(result.findings[0]).toMatchObject({ claim_class: "count", line: 1 });
  });

  test("accepts a command token within the generated structural window", () => {
    const result = evaluateNumericProvenance(
      {
        stage: "code-generation",
        outputPath:
          "/workspace/amadeus/spaces/default/intents/260810-fixture/construction/example/code-generation/code-summary.md",
        content: { kind: "present", markdown: "`rg --files`\nThe corpus contains 10 files.\n" },
      },
      DEPS,
    );

    expect(result.pass).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.findings_count).toBe(0);
    expect(result.metrics).toMatchObject({ candidate_count: 1, provenanced_count: 1 });
  });

  test("rejects W+1 and structural-boundary provenance", () => {
    const base = {
      stage: "code-generation",
      outputPath:
        "/workspace/amadeus/spaces/default/intents/260810-fixture/construction/example/code-generation/code-summary.md",
    } as const;
    const beyondWindow = evaluateNumericProvenance(
      { ...base, content: { kind: "present", markdown: "`rg --files`\ncontext\n10 files\n" } },
      DEPS,
    );
    const beyondHeading = evaluateNumericProvenance(
      { ...base, content: { kind: "present", markdown: "`rg --files`\n## Boundary\n10 files\n" } },
      DEPS,
    );

    expect(beyondWindow.findings_count).toBe(1);
    expect(beyondHeading.findings_count).toBe(1);
  });

  test("fails open before the cutoff and for undatable records", () => {
    const paths = [
      "/workspace/amadeus/spaces/default/intents/260809-old/construction/u/code-generation/code-summary.md",
      "/workspace/amadeus/spaces/default/intents/current/construction/u/code-generation/code-summary.md",
    ];
    expect(
      paths.map((outputPath) =>
        evaluateNumericProvenance(
          {
            stage: "code-generation",
            outputPath,
            content: { kind: "present", markdown: "10 files\n" },
          },
          DEPS,
        ).reason,
      ),
    ).toEqual(["pre-cutoff", "not-applicable"]);
  });

  test("keeps measurement-only claims observable without findings", () => {
    const result = evaluateNumericProvenance(
      {
        stage: "code-generation",
        outputPath:
          "/workspace/amadeus/spaces/default/intents/260810-fixture/construction/example/code-generation/code-summary.md",
        content: { kind: "present", markdown: "The observed rate was 12%.\n" },
      },
      DEPS,
    );

    expect(result).toMatchObject({ pass: true, skipped: false, findings_count: 0, reason: "evaluated" });
    expect(result.metrics).toMatchObject({ candidate_count: 2, measurement_only_candidates: 2 });
  });

  test("accepts only existing allowlisted relative links and memoizes probes", () => {
    let existsCalls = 0;
    let regularCalls = 0;
    const deps = {
      fileExists: () => {
        existsCalls += 1;
        return true;
      },
      isRegularFile: () => {
        regularCalls += 1;
        return true;
      },
    };
    const result = evaluateNumericProvenance(
      {
        stage: "code-generation",
        outputPath:
          "/workspace/amadeus/spaces/default/intents/260810-fixture/construction/example/code-generation/code-summary.md",
        content: {
          kind: "present",
          markdown:
            "10 files [measurement](../measurements/results.md) [same](../measurements/results.md)\n",
        },
      },
      deps,
    );

    expect(result.findings_count).toBe(0);
    expect({ existsCalls, regularCalls }).toEqual({ existsCalls: 1, regularCalls: 1 });
  });
});

describe("t532 numeric provenance manifest and wiring", () => {
  test("is a shipped advisory manifest whose glob agrees in both engines", () => {
    const manifest = parseSensorManifest(readFileSync(MANIFEST, "utf8"));
    expect(() => validateSensorManifest(manifest, MANIFEST, "numeric-provenance")).not.toThrow();
    expect(manifest.default_severity).toBe("advisory");
    const matches = manifest.matches as string;
    const artifact =
      "/workspace/amadeus/spaces/default/intents/260810-fixture/construction/example/code-generation/code-summary.md";
    expect(matchesGlob(matches, artifact)).toBe(true);
    expect(new Bun.Glob(matches).match(artifact)).toBe(true);
  });

  test("wires exactly the generated enforcement stage", () => {
    const frontmatter = readFileSync(CODE_GENERATION_STAGE, "utf8").split("---")[1]!;
    expect(frontmatter).toContain("- numeric-provenance");
  });
});

describe("t532 fixed numeric claim predicate", () => {
  test("recognizes the four classes and excludes decorative and fenced numbers", () => {
    const claims = scanNumericClaims(
      [
        "## 3. Results",
        "- scanned 1,234 files",
        "- checks were 29/30 PASS",
        "- false-positive rate was 9.5%",
        "- observed latency was 42 ms",
        "Observed on 2026-08-10 for Issue #2815 at commit 0123456789abcdef with v1.2.3.",
        "```sh",
        "bun test --timeout 120000",
        "```",
      ].join("\n"),
    );

    expect(claims.map((claim) => claim.claimClass)).toEqual([
      "count",
      "ratio",
      "percentage",
      "measured-value",
    ]);
  });
});

describe("t532 design-time threshold classification", () => {
  test("fails closed for invalid label counts and provenance distances", () => {
    const base = {
      artifactKind: "requirements",
      claimClass: "count" as const,
      labeledCount: 30,
      falsePositiveCount: 0,
      provenancePositiveDistances: [0, 2],
    };

    expect(() => classifyNumericProvenanceEvidence({ ...base, labeledCount: -1 })).toThrow(
      "invalid-labeled-count",
    );
    expect(() => classifyNumericProvenanceEvidence({ ...base, falsePositiveCount: 31 })).toThrow(
      "invalid-false-positive-count",
    );
    expect(() =>
      classifyNumericProvenanceEvidence({ ...base, provenancePositiveDistances: [0, -1] }),
    ).toThrow("invalid-provenance-distance");
  });

  test("moves a lower-bound saturated p95 to the smallest strict interior window", () => {
    const result = classifyNumericProvenanceEvidence({
      artifactKind: "requirements",
      claimClass: "count",
      labeledCount: 30,
      falsePositiveCount: 0,
      provenancePositiveDistances: [...Array.from({ length: 19 }, () => 0), 2],
    });

    expect(result.mode).toBe("enforcement");
    expect(result.searchScope).toEqual({ kind: "bounded", window: 1 });
    expect(result.statistics).toEqual({ count: 20, min: 0, median: 0, p95: 0, max: 2 });
    expect(result.coverage).toEqual({ numerator: 19, denominator: 20 });
  });

  test("keeps an upper-bound saturated group measurement-only", () => {
    const result = classifyNumericProvenanceEvidence({
      artifactKind: "requirements",
      claimClass: "count",
      labeledCount: 30,
      falsePositiveCount: 0,
      provenancePositiveDistances: [...Array.from({ length: 18 }, () => 0), 2, 2],
    });

    expect(result.mode).toBe("measurement-only");
    expect(result.searchScope).toEqual({ kind: "full-structural-region" });
    expect(result.downgradeReasons).toContain("upper-bound-saturation");
  });
});

describe("t532 design-time artifact index", () => {
  test("derives stable declared and codekb descriptors without a runtime mapping", () => {
    const descriptors = indexSweepArtifacts({
      snapshot: {
        observedSha: "1111111",
        graphRevision: "runtime-graph-v1",
        predicateRevision: "fr-pred-v1",
        corpusContentDigest: "a".repeat(64),
      },
      declaredProduces: [
        {
          stageSlug: "code-generation",
          recordRelativeOutputPattern: "construction/*/code-generation/code-summary.md",
          producesKey: "code-summary",
        },
      ],
      codekbRescanPaths: ["amadeus/spaces/default/codekb/amadeus/re-scans/260810-fixture.md"],
    });

    expect(descriptors).toEqual([
      {
        source: "codekb-re-scan",
        relativePath: "amadeus/spaces/default/codekb/amadeus/re-scans/260810-fixture.md",
        artifactKind: "codekb-re-scan",
        eligibility: "scan-only",
        reasonCode: "codekb-scan-only",
      },
      {
        source: "declared-artifact",
        relativePath: "construction/*/code-generation/code-summary.md",
        stageSlug: "code-generation",
        recordRelativeOutputPattern: "construction/*/code-generation/code-summary.md",
        producesKey: "code-summary",
        artifactKind: "code-summary",
        eligibility: "candidate",
        reasonCode: "declared-candidate",
      },
    ]);
  });
});

describe("t532 corpus sweep generator", () => {
  test("scans indexed artifacts and emits an enforceable generated mapping", () => {
    const files = new Map<string, string>();
    for (let index = 0; index < 30; index += 1) {
      const relativePath =
        `amadeus/spaces/default/intents/260810-fixture-${index}/` +
        "construction/example/code-generation/code-summary.md";
      const markdown =
        index < 19
          ? "`rg --files` found 10 files.\n"
          : index === 19
            ? "`rg --files`\ncontext\nfound 10 files.\n"
            : "found 10 files.\n";
      files.set(relativePath, markdown);
    }
    const labels = new Map<string, { meaningfulNumericClaim: true; validProvenanceNotMissed: true; reason: string }>();
    for (const [relativePath, markdown] of files) {
      const claim = scanNumericClaims(markdown)[0]!;
      labels.set(sampleNumericClaimIdentity(relativePath, claim.line, claim.normalizedText), {
        meaningfulNumericClaim: true,
        validProvenanceNotMissed: true,
        reason: "Fixture claim and provenance classification reviewed.",
      });
    }

    const report = sweepNumericProvenance("/repo", {
      indexInput: {
        snapshot: {
          observedSha: "1111111",
          graphRevision: "runtime-graph-v1",
          predicateRevision: "fr-pred-v1",
          corpusContentDigest: "a".repeat(64),
        },
        declaredProduces: [
          {
            stageSlug: "code-generation",
            recordRelativeOutputPattern: "construction/*/code-generation/code-summary.md",
            producesKey: "code-summary",
          },
        ],
        codekbRescanPaths: [],
      },
      listMarkdownFiles: () => [...files.keys()],
      readFile: (path) => files.get(path)!,
      labels,
      evaluationDeps: DEPS,
    });

    expect(report.evidence).toHaveLength(1);
    expect(report.evidence[0]).toMatchObject({
      artifactKind: "code-summary",
      claimClass: "count",
      mode: "enforcement",
      searchScope: { kind: "bounded", window: 1 },
    });
    expect(report.mapping.wiredStages).toEqual(["code-generation"]);
    expect(report.mapping.policies).toHaveLength(1);
  });
});

describe("t532 generated authority projection", () => {
  test("matches the machine-readable sweep report and the wired stage set", () => {
    const report = readFileSync(SWEEP_REPORT, "utf8");
    const machine = JSON.parse(report.match(/```json\n([\s\S]*?)\n```/)?.[1] ?? "null");

    expect(machine.mapping.authoritySweepDigest).toBe(GENERATED_NUMERIC_PROVENANCE_MAPPING.authorityDigest);
    expect(machine.mapping.policies).toEqual(GENERATED_NUMERIC_PROVENANCE_MAPPING.policies);
    expect(machine.mapping.wiredStages).toEqual(GENERATED_NUMERIC_PROVENANCE_MAPPING.wiredStages);
    expect(machine.enforcementEvidence).toMatchObject({
      artifactKind: "code-summary",
      claimClass: "count",
      labeledCount: 50,
      falsePositiveRate: { numerator: 0, denominator: 50 },
      coverage: { numerator: 506, denominator: 507 },
      searchScope: { kind: "bounded", window: 1 },
    });
  });

  test("maps every approved identity to one corpus tuple under the U1 expression", () => {
    const fixture = JSON.parse(readFileSync(LABELS_FIXTURE, "utf8")) as { readonly labels: readonly string[] };
    const approved = new Set(fixture.labels);
    const seen = new Map<string, string>();
    const glob = new Bun.Glob("amadeus/spaces/default/intents/**/code-generation/code-summary.md");
    for (const relativePath of glob.scanSync({ cwd: REPO_ROOT, onlyFiles: true })) {
      const markdown = readFileSync(join(REPO_ROOT, relativePath), "utf8");
      for (const claim of scanNumericClaims(markdown)) {
        if (claim.claimClass !== "count") continue;
        const identity = sampleNumericClaimIdentity(relativePath, claim.line, claim.normalizedText);
        if (!approved.has(identity)) continue;
        const tuple = JSON.stringify([relativePath, claim.line, claim.normalizedText]);
        expect(seen.get(identity) ?? tuple).toBe(tuple);
        seen.set(identity, tuple);
      }
    }

    expect(approved.size).toBe(50);
    expect([...approved].filter((identity) => !seen.has(identity))).toEqual([]);
  });

  test("fails closed for corrupt or conflicting generated mappings", () => {
    expect(() => validateGeneratedMapping(GENERATED_NUMERIC_PROVENANCE_MAPPING)).not.toThrow();
    const conflict = {
      ...GENERATED_NUMERIC_PROVENANCE_MAPPING,
      policies: [
        ...GENERATED_NUMERIC_PROVENANCE_MAPPING.policies,
        GENERATED_NUMERIC_PROVENANCE_MAPPING.policies[0]!,
      ],
    };
    expect(() => validateGeneratedMapping(conflict)).toThrow("numeric-provenance-policy-conflict");
  });
});

describe("t532 performance budget", () => {
  function adversarialInput(kibibytes: number) {
    let markdown = "";
    const row =
      "- adversarial 123 files, 29/30 PASS, 9.5%, observed 42, [escape](../../outside.md), `not-a-command` xxxxxxxxxx\n";
    while (Buffer.byteLength(markdown) < kibibytes * 1024) markdown += row;
    return {
      stage: "code-generation",
      outputPath:
        "/workspace/amadeus/spaces/default/intents/260810-performance/construction/u/code-generation/code-summary.md",
      content: { kind: "present" as const, markdown },
    };
  }

  function durations(input: ReturnType<typeof adversarialInput>): number[] {
    for (let index = 0; index < 5; index += 1) evaluateNumericProvenance(input, DEPS);
    return Array.from({ length: 20 }, () => {
      const started = Bun.nanoseconds();
      evaluateNumericProvenance(input, DEPS);
      return (Bun.nanoseconds() - started) / 1_000_000;
    }).sort((left, right) => left - right);
  }

  test("stays within the 50KB/100KB latency and linearity budgets", () => {
    const fifty = durations(adversarialInput(50));
    const hundred = durations(adversarialInput(100));
    const fiftyMedian = fifty[9]!;
    const hundredMedian = hundred[9]!;
    const hundredP95 = hundred[18]!;

    expect(hundredMedian).toBeLessThanOrEqual(100);
    expect(hundredP95).toBeLessThanOrEqual(250);
    expect(hundredMedian / fiftyMedian).toBeLessThanOrEqual(2.5);
  });
});
