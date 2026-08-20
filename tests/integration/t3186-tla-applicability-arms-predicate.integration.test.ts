import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ApplicabilityArms,
  DEFECT_RECURRENCE_THRESHOLD,
} from "../../plugins/formal-model-check/tools/tla-applicability-arms.ts";

// t3186 tier (i): the vocabulary-drift predicate is measured against the REAL
// corpus — the registered .tla modules and the implementation sources — with no
// model-map registration in the way. The predicate is fed the bytes directly,
// so this file measures the arm itself and never the landing order of any other
// unit (business-logic-model.md § 落ちる実証 (i)).
//
// It reads that corpus off the filesystem, which makes it a medium test and so
// an integration one, even though the subject under test is a pure predicate
// (cid:code-generation:c2-doctor-seam).

const REPO_ROOT = join(import.meta.dir, "..", "..");
const SPEC_DIR = join(REPO_ROOT, "amadeus", "spaces", "default", "specs", "tla");

function repoText(...segments: readonly string[]): string {
  return readFileSync(join(REPO_ROOT, ...segments), "utf8");
}

function specText(name: string): string {
  return readFileSync(join(SPEC_DIR, name), "utf8");
}

function valueSetsOf(...specs: readonly string[]): ReturnType<typeof ApplicabilityArms.parseValueSets> {
  const parsed = specs.map((spec) => ApplicabilityArms.parseValueSets(specText(spec)));
  const failed = parsed.find((result) => !result.ok);
  if (failed !== undefined && !failed.ok) return failed;
  return {
    ok: true,
    value: parsed.flatMap((result) => (result.ok ? result.value : [])),
  };
}

function driftOf(specs: readonly string[], implPath: string) {
  const sets = valueSetsOf(...specs);
  expect(sets.ok).toBe(true);
  if (!sets.ok) throw new Error("unreachable");
  return {
    sets: sets.value,
    findings: ApplicabilityArms.detectValueSetDrift(sets.value, repoText(implPath)),
  };
}

// The governed entries of each model, transcribed from
// amadeus/spaces/default/specs/tla/model-map.json (measured 2026-08-20). They
// are listed here rather than read back out of the map so that the negative
// side pins a named file set instead of whatever the map happens to hold.
const MIRROR_SOURCES = [
  "packages/framework/core/tools/amadeus-mirror-coordinator.ts",
  "packages/framework/core/tools/amadeus-mirror-project-reconciliation-reducer.ts",
  "packages/framework/core/tools/amadeus-mirror-state-reducer.ts",
  "packages/framework/core/tools/amadeus-mirror-types.ts",
] as const;

const ELECTION_SOURCES = [
  "packages/framework/core/tools/amadeus-election-codec.ts",
  "packages/framework/core/tools/amadeus-election-record.ts",
  "packages/framework/core/tools/amadeus-election-store.ts",
  "packages/framework/core/tools/amadeus-election-transport.ts",
  "packages/framework/core/tools/amadeus-election.ts",
] as const;

const PR_CONVERGENCE_CLI = "plugins/github-pr-convergence/tools/pr-convergence-cli.ts";

describe("tier (i): the drift predicate over the real corpus (FR-ARM-1)", () => {
  test("PrConvergenceGate's Verdicts set is drifted from the report lifecycle it governs", () => {
    const { findings } = driftOf(["PrConvergenceGate.tla"], PR_CONVERGENCE_CLI);
    expect(findings.length).toBeGreaterThan(0);
    const lifecycle = findings.find((finding) => finding.snippet.includes("superseded"));
    expect(lifecycle).toBeDefined();
    expect(lifecycle?.coveredValueSets).toContain("TerminalVerdicts");
    expect([...(lifecycle?.unknownLiterals ?? [])].sort()).toEqual(["landed", "superseded"]);
  });

  test("BoltPrAttestationGate carries the same drift — the arm is general, not per-model (FR-ARM-4)", () => {
    const { findings } = driftOf(["BoltPrAttestationGate.tla"], PR_CONVERGENCE_CLI);
    const lifecycle = findings.find((finding) => finding.snippet.includes("superseded"));
    expect(lifecycle).toBeDefined();
    expect([...(lifecycle?.unknownLiterals ?? [])].sort()).toEqual(["landed", "superseded"]);
  });

  test("MirrorLifecycle does not fire against its own governed sources", () => {
    const { sets } = driftOf(["MirrorLifecycle.tla", "MirrorLifecycleCore.tla"], MIRROR_SOURCES[0] as string);
    // Non-vacuous: the model really does declare string-literal value sets, so
    // a false positive would have somewhere to come from.
    expect(sets.length).toBeGreaterThanOrEqual(4);
    for (const source of MIRROR_SOURCES) {
      expect(driftOf(["MirrorLifecycle.tla", "MirrorLifecycleCore.tla"], source).findings).toEqual([]);
    }
  });

  test("FormalElection does not fire against its own governed sources", () => {
    const sets = valueSetsOf("FormalElection.tla", "FormalElectionCore.tla");
    expect(sets.ok).toBe(true);
    // Measured: this model declares no string-literal value sets at all, so its
    // non-fire is recorded as vacuous rather than claimed as evidence.
    if (sets.ok) expect(sets.value).toEqual([]);
    for (const source of ELECTION_SOURCES) {
      expect(driftOf(["FormalElection.tla", "FormalElectionCore.tla"], source).findings).toEqual([]);
    }
  });
});

describe("value-set parsing is fail-closed (BR-3 / NFR-2)", () => {
  test("a module header is required", () => {
    const parsed = ApplicabilityArms.parseValueSets('Verdicts == {"a", "b"}\n');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.detail).toContain("MODULE");
  });

  test("an unterminated value set is a parse failure, never an empty vocabulary", () => {
    const parsed = ApplicabilityArms.parseValueSets('---- MODULE X ----\nVerdicts == {"a", "b"\n');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.detail).toContain("Verdicts");
  });

  test("non-literal sets are classified out rather than parsed as an empty set", () => {
    const parsed = ApplicabilityArms.parseValueSets('---- MODULE X ----\nBits == {0, 1}\nK == {"a", "b"}\n');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.map((set) => set.name)).toEqual(["K"]);
  });
});

describe("cfg property class (FD step 2(b))", () => {
  test("PrConvergenceGate.cfg is invariants-only", () => {
    const classified = ApplicabilityArms.classifyProperties(specText("PrConvergenceGate.cfg"));
    expect(classified).toEqual({ ok: true, value: "invariants-only" });
  });

  test("FormalElection.cfg has a temporal property", () => {
    const classified = ApplicabilityArms.classifyProperties(specText("FormalElection.cfg"));
    expect(classified).toEqual({ ok: true, value: "has-properties" });
  });

  test("a cfg with no directive at all is a parse failure", () => {
    const classified = ApplicabilityArms.classifyProperties("\\* only a comment\n");
    expect(classified.ok).toBe(false);
  });
});

describe("vocabulary self-consistency (FD step 2(c))", () => {
  const PR_CONVERGENCE_VOCABULARY = {
    namedInvariants: [
      "TypeOK",
      "EvidenceCurrentHead",
      "SensorRequiresAttestation",
      "CodeGenerationGuarded",
      "WorkflowGuarded",
    ],
    traceStateVariables: [
      "workflowDone",
      "artifactsComplete",
      "verdict",
      "codeGenerationDone",
      "sensorPassed",
      "reportHead",
      "head",
      "attested",
    ],
  } as const;

  test("the registered PrConvergenceGate vocabulary is consistent with its module", () => {
    const checked = ApplicabilityArms.checkVocabulary([specText("PrConvergenceGate.tla")], PR_CONVERGENCE_VOCABULARY);
    expect(checked).toEqual({ missingInvariants: [], missingVariables: [] });
  });

  test("an invariant that the module does not define is reported", () => {
    const checked = ApplicabilityArms.checkVocabulary([specText("PrConvergenceGate.tla")], {
      namedInvariants: ["TypeOK", "NeverDefined"],
      traceStateVariables: ["head", "notAVariable"],
    });
    expect(checked).toEqual({ missingInvariants: ["NeverDefined"], missingVariables: ["notAVariable"] });
  });
});

// --- defectRecurrence -------------------------------------------------------

const GOVERNED = [
  "packages/framework/core/tools/amadeus-orchestrate.ts",
  "packages/framework/core/tools/amadeus-state.ts",
  "packages/framework/core/tools/amadeus-election-store.ts",
] as const;

function evidence(sections: readonly { issue: number; title: string; body: string }[]): string {
  return [
    "# Issue Evidence — fixture",
    "",
    "## メタデータ",
    "",
    "- fetched-at: 2026-08-20T00:00:00Z / repo: amadeus-dlc/amadeus / tool: issue-evidence fetch",
    "",
    ...sections.flatMap((section) => [`## Issue #${section.issue}: ${section.title}`, "", section.body, ""]),
  ].join("\n");
}

describe("defectRecurrence fires on a governed-file intersection (FR-ARM-2)", () => {
  // The threshold is pinned strictly inside the observed range measured over
  // the whole issue-evidence corpus (business-logic-model.md §3: 0 for
  // 260817-inception-cost-batch, 2 for 260818-priority-bug-batch-4).
  const OBSERVED_MINIMUM = 0;
  const OBSERVED_MAXIMUM = 2;

  test("the threshold sits strictly inside the observed range", () => {
    expect(OBSERVED_MINIMUM).toBeLessThan(DEFECT_RECURRENCE_THRESHOLD);
    expect(DEFECT_RECURRENCE_THRESHOLD).toBeLessThan(OBSERVED_MAXIMUM);
  });

  test("two governed intersections fire the arm (260818-shaped fixture)", () => {
    const text = evidence([
      {
        issue: 2837,
        title: "bug(harness/codex): invoke-swarm directive が実行コンテキストを欠く",
        body: "`packages/framework/core/tools/amadeus-orchestrate.ts` が routing を返す。",
      },
      {
        issue: 3106,
        title: "bug(engine): per-unit 経路の cancelled unit が終端 outcome を持たない",
        body: "`packages/framework/core/tools/amadeus-state.ts` の terminal 判定。",
      },
    ]);
    const outcome = ApplicabilityArms.evaluateDefectRecurrence(text, GOVERNED);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.fired).toBe(true);
    expect([...outcome.value.intersections].sort()).toEqual([
      "packages/framework/core/tools/amadeus-orchestrate.ts",
      "packages/framework/core/tools/amadeus-state.ts",
    ]);
    expect(outcome.value.bugIssues).toEqual([2837, 3106]);
  });

  test("a single governed intersection already fires — the threshold is one", () => {
    const text = evidence([
      {
        issue: 4001,
        title: "bug(engine): 単発交差",
        body: "`packages/framework/core/tools/amadeus-state.ts` のみ。",
      },
    ]);
    const outcome = ApplicabilityArms.evaluateDefectRecurrence(text, GOVERNED);
    expect(outcome.ok && outcome.value.fired).toBe(true);
    expect(outcome.ok && outcome.value.intersections.length).toBe(DEFECT_RECURRENCE_THRESHOLD);
  });

  test("no governed intersection does not fire (260817-shaped fixture)", () => {
    const text = evidence([
      {
        issue: 3181,
        title: "bug(reverse-engineering): 上流入力の再導出",
        body: "`packages/framework/core/tools/amadeus-mirror.ts` は governed ではない。",
      },
    ]);
    const outcome = ApplicabilityArms.evaluateDefectRecurrence(text, GOVERNED);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.value.fired).toBe(false);
      expect(outcome.value.intersections).toEqual([]);
    }
  });

  test("an enhancement naming a governed file does not fire — the arm is bug-typed", () => {
    const text = evidence([
      {
        issue: 3186,
        title: "enhancement(formal-model-check): 適用性判定の腕",
        body: "`packages/framework/core/tools/amadeus-orchestrate.ts` を引用するだけ。",
      },
    ]);
    const outcome = ApplicabilityArms.evaluateDefectRecurrence(text, GOVERNED);
    expect(outcome.ok && outcome.value.fired).toBe(false);
    expect(outcome.ok && outcome.value.bugIssues).toEqual([]);
  });

  test("a file with no issue section at all is a parse failure, not a non-fire (BR-3)", () => {
    const outcome = ApplicabilityArms.evaluateDefectRecurrence("# not an issue evidence file\n", GOVERNED);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error.detail).toContain("Issue");
  });
});

describe("coverageCheck records gaps and never reclassifies (FR-ARM-5 / BR-5)", () => {
  test("an uncovered changed file is recorded with an entries-extension proposal", () => {
    const outcome = ApplicabilityArms.evaluateCoverage(
      ["packages/framework/core/tools/amadeus-state.ts", "plugins/github-pr-convergence/tools/pr-convergence-cli.ts"],
      GOVERNED,
      ["PrConvergenceGate"],
    );
    expect(outcome.kind).toBe("performed");
    if (outcome.kind !== "performed") return;
    expect(outcome.uncovered).toEqual(["plugins/github-pr-convergence/tools/pr-convergence-cli.ts"]);
    expect(outcome.proposal).toEqual({
      kind: "entries-extension",
      models: ["PrConvergenceGate"],
      paths: ["plugins/github-pr-convergence/tools/pr-convergence-cli.ts"],
    });
  });

  test("a fully covered change proposes nothing", () => {
    const outcome = ApplicabilityArms.evaluateCoverage(
      ["packages/framework/core/tools/amadeus-state.ts"],
      GOVERNED,
      ["PrConvergenceGate"],
    );
    expect(outcome).toEqual({ kind: "performed", uncovered: [], proposal: null });
  });
});
