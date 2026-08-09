// covers: file:packages/framework/core/tools/amadeus-sensor-nfr-budget.ts,
//         file:packages/framework/core/sensors/amadeus-nfr-budget.md
// size: medium
//
// #2684 stage ② — the NFR measurement sensor, at its filesystem and manifest
// boundaries.
//
// Three halves:
//
//   1. The manifest is well-formed by the SHIPPED schema, advisory-only, and
//      its `matches` glob addresses the artifacts the two NFR stages produce —
//      under BOTH glob engines that read it (the dispatcher's own matcher and
//      Bun.Glob in the PostToolUse hook), which disagree on some patterns.
//   2. The predicate measures a unit: bytes for the stage over the unit's
//      declared id count, with the per-artifact figure kept as a diagnostic.
//      Both stages divide by the SAME denominator, because nfr-design cites
//      ids rather than declaring them.
//   3. The enforcement cutoff holds in both directions — the falling proof
//      (a post-contract unit with no ids IS reported) and its other side (a
//      pre-contract unit with no ids is NOT), which is what keeps the sensor
//      from being a retroactive block on a corpus written before the contract.
//
// The corpus sweep — no pre-contract record anywhere in the live workspace is
// reported — lives here too, since it is the other half of the falling proof
// (cid:code-generation:corpus-sweep-for-new-guards).
//
// Touches a real filesystem (fixtures on disk + the real manifest and corpus),
// hence the integration tier (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalDepth, readRecordDepth } from "../../packages/framework/core/tools/amadeus-sensor-depth-budget.ts";
import {
  NFR_DESIGN_ARTIFACTS,
  NFR_DESIGN_STANDARD_BUDGET,
  NFR_ID_CONTRACT_LANDED,
  NFR_REQUIREMENTS_ARTIFACTS,
  NFR_REQUIREMENTS_STANDARD_BUDGET,
  PERFORMANCE_REQUIREMENTS_ARTIFACT,
  artifactsRequiredForKind,
  countNfrIds,
  evaluateNfrBudget,
  flagsNfrBudget,
  idsMissingNumericThreshold,
  main as sensorMain,
  measureNfrStageDir,
  readProducesKinds,
  readRecordBirth,
  resolveRecordRoot,
  unitIdCount,
} from "../../packages/framework/core/tools/amadeus-sensor-nfr-budget.ts";
import { parseSensorManifest, validateSensorManifest } from "../../packages/framework/core/tools/amadeus-sensor-schema.ts";
import { depthBudgetArgs, matchesGlob, unitKindArgs } from "../../packages/framework/core/tools/amadeus-sensor.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = join(REPO_ROOT, "packages/framework/core/sensors/amadeus-nfr-budget.md");
const STAGES_DIR = join(REPO_ROOT, "packages/framework/core/amadeus-common/stages/construction");
const CORPUS = join(REPO_ROOT, "amadeus/spaces/default/intents");

let tmp = "";
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "amadeus-t514-"));
});
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

/** A record on disk: `<root>/construction/<unit>/<stage>/<artifact>.md`, with an
 *  audit shard carrying the birth the cutoff is read from. */
function record(birth: string | undefined): string {
  const root = join(tmp, "260809-fixture");
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "amadeus-state.md"), "- **Depth**: Standard\n");
  if (birth !== undefined) {
    mkdirSync(join(root, "audit"), { recursive: true });
    writeFileSync(
      join(root, "audit", "clone.jsonl"),
      `${JSON.stringify({ schemaVersion: 1, seq: 1, timestamp: birth, event: "WORKFLOW_STARTED", fields: {} })}\n`,
    );
  }
  return root;
}

function writeArtifact(root: string, unit: string, stage: string, artifact: string, body: string): string {
  const dir = join(root, "construction", unit, stage);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${artifact}.md`);
  writeFileSync(path, body);
  return path;
}

/** A requirements body of EXACTLY `count * bytesPerId` bytes declaring `count`
 *  ids, so a fixture sized at a figure measures at that figure. */
function requirementsBody(count: number, bytesPerId: number, prefix = "SEC"): string {
  const parts: string[] = [];
  for (let n = 1; n <= count; n += 1) {
    const head = `### ${prefix}-${n}: requirement ${n}\n`;
    // The filler ends on its own newline so the next heading starts a line —
    // a declaration position is anchored at the start of one.
    parts.push(`${head}${"x".repeat(Math.max(0, bytesPerId - head.length - 1))}\n`);
  }
  return parts.join("");
}

// ---------------------------------------------------------------------------
// 1. Manifest
// ---------------------------------------------------------------------------

describe("t514 the nfr-budget manifest is shippable and advisory", () => {
  test("parses and validates against the shipped schema", () => {
    const parsed = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    expect(() => validateSensorManifest(parsed, MANIFEST, "nfr-budget")).not.toThrow();
    expect(parsed.id).toBe("nfr-budget");
    // Advisory is the only severity the schema ships; the issue's stopping
    // condition also forbids raising it before #2683 rules on the total.
    expect(parsed.default_severity).toBe("advisory");
  });

  test("the matches glob addresses the artifacts both NFR stages produce", () => {
    const parsed = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    const matches = parsed.matches as string;
    for (const artifact of NFR_REQUIREMENTS_ARTIFACTS) {
      const path = `/w/amadeus/spaces/default/intents/260809-x/construction/u1/nfr-requirements/${artifact}.md`;
      expect(matchesGlob(matches, path)).toBe(true);
      expect(new Bun.Glob(matches).match(path)).toBe(true);
    }
    for (const artifact of NFR_DESIGN_ARTIFACTS) {
      const path = `/w/amadeus/spaces/default/intents/260809-x/construction/u1/nfr-design/${artifact}.md`;
      expect(matchesGlob(matches, path)).toBe(true);
      expect(new Bun.Glob(matches).match(path)).toBe(true);
    }
  });

  test("an unrelated artifact is out of the glob's reach", () => {
    const parsed = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    const matches = parsed.matches as string;
    const path = "/w/amadeus/spaces/default/intents/260809-x/inception/requirements-analysis/requirements.md";
    expect(matchesGlob(matches, path)).toBe(false);
    expect(new Bun.Glob(matches).match(path)).toBe(false);
  });
});

describe("t514 both NFR stages import the sensor", () => {
  for (const stage of ["nfr-requirements", "nfr-design"]) {
    test(`${stage} declares nfr-budget in its sensors list`, () => {
      // The graph compile rejects an unknown sensor id, so the manifest and
      // this declaration must land together.
      const text = readFileSync(join(STAGES_DIR, `${stage}.md`), "utf-8");
      const frontmatter = text.split("---")[1] as string;
      expect(frontmatter).toContain("- nfr-budget");
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Measurement
// ---------------------------------------------------------------------------

describe("t514 the sensor measures a unit against its declared ids", () => {
  test("reports bytes, the unit roll-up, and both ratios", () => {
    const root = record("2026-08-09T10:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(4, 500));
    writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", requirementsBody(2, 300, "PERF"));

    const result = evaluateNfrBudget(path);
    expect(result.reason).toBe("measured");
    expect(result.pass).toBe(true);
    expect(result.bytes).toBe(2000);
    expect(result.declared_ids).toBe(4);
    // The unit: two artifacts, 2,000 + 600 bytes, six distinct ids.
    expect(result.unit_files).toBe(2);
    expect(result.unit_bytes).toBe(2600);
    expect(result.unit_nfr_count).toBe(6);
    // D2 (primary) and D1 (diagnostic) share the unit denominator.
    expect(result.unit_bytes_per_nfr).toBe(Math.round(2600 / 6));
    expect(result.bytes_per_nfr).toBe(Math.round(2000 / 6));
  });

  test("nfr-design divides by the ids nfr-requirements declared", () => {
    // The stage ① contract has nfr-design CITE ids, never declare them, so an
    // in-file count would be zero for every design artifact ever written.
    const root = record("2026-08-09T10:00:00Z");
    writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(5, 400));
    const path = writeArtifact(
      root,
      "u1",
      "nfr-design",
      "security-design",
      "## Design\n\nThe token store satisfies SEC-1 and SEC-2.\n",
    );

    const result = evaluateNfrBudget(path);
    expect(result.reason).toBe("measured");
    expect(result.declared_ids).toBe(0);
    expect(result.unit_nfr_count).toBe(5);
    expect(result.unit_bytes_per_nfr).toBe(Math.round(result.unit_bytes / 5));
  });

  test("an absent sibling artifact is skipped, not counted as zero", () => {
    // `produces_kinds` prunes artifacts by unit kind and the expected set
    // cannot be reconstructed from disk, so the measurement never assumes one.
    const root = record("2026-08-09T10:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(2, 500));
    const result = evaluateNfrBudget(path);
    expect(result.unit_files).toBe(1);
    expect(result.unit_bytes).toBe(1000);
  });
});

describe("t514 the sensor passes wherever it cannot legitimately measure", () => {
  test("a path that is not an NFR artifact", () => {
    const root = record("2026-08-09T10:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "memory", "## Diary\n");
    expect(evaluateNfrBudget(path).reason).toBe("not-nfr-artifact");
    expect(evaluateNfrBudget(path).pass).toBe(true);
  });

  test("a file that does not exist", () => {
    const result = evaluateNfrBudget(join(tmp, "nowhere", "security-requirements.md"));
    expect(result.reason).toBe("no-file");
    expect(result.pass).toBe(true);
  });

  test("a file mid-write, still empty", () => {
    const root = record("2026-08-09T10:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", "");
    expect(evaluateNfrBudget(path).reason).toBe("empty");
    expect(evaluateNfrBudget(path).pass).toBe(true);
  });

  test("a file holding only whitespace, even under the contract", () => {
    // A newline is still nothing written. Reporting it as an unmet id contract
    // would fire on the first keystroke of every post-contract artifact.
    const root = record("2026-08-09T10:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", "\n  \n\t\n");
    const result = evaluateNfrBudget(path);
    expect(result.reason).toBe("empty");
    expect(result.pass).toBe(true);
  });

  test("a record whose birth cannot be read", () => {
    // Fail-open: an unreadable audit trail never lands a record in the reported
    // cohort, so a missing shard cannot manufacture a finding.
    const root = record(undefined);
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", "## No ids here\n\ntext\n");
    const result = evaluateNfrBudget(path);
    expect(result.record_birth).toBeNull();
    expect(result.under_id_contract).toBe(false);
    expect(result.pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. The cutoff, both sides
// ---------------------------------------------------------------------------

describe("t514 the id contract is enforced going forward only", () => {
  const NO_IDS = "## Performance\n\nThe service should be fast enough.\n";

  test("a unit born AFTER the contract with no ids is reported", () => {
    const root = record("2026-08-09T04:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("missing-nfr-ids");
    expect(result.findings_count).toBe(1);
    expect(result.findings[0]?.field).toBe("nfr-ids");
    expect(result.under_id_contract).toBe(true);
  });

  test("a unit born AT the cutoff instant is reported", () => {
    // The comparison is inclusive: a record born at the landing instant was
    // written under the contract.
    const root = record(NFR_ID_CONTRACT_LANDED);
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.under_id_contract).toBe(true);
    expect(result.reason).toBe("missing-nfr-ids");
  });

  test("a unit born a MILLISECOND after the cutoff is reported", () => {
    // The string form of this birth sorts BELOW the cutoff, so a lexicographic
    // comparison would file it as pre-contract and never report it.
    const root = record("2026-08-09T03:47:46.001Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.under_id_contract).toBe(true);
    expect(result.reason).toBe("missing-nfr-ids");
  });

  test("a unit born a millisecond BEFORE the cutoff is not", () => {
    const root = record("2026-08-09T03:47:45.999Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.under_id_contract).toBe(false);
    expect(result.reason).toBe("measured");
  });

  test("the same unit born BEFORE the contract is not", () => {
    const root = record("2026-08-09T03:47:45Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("measured");
    expect(result.under_id_contract).toBe(false);
  });

  test("a post-contract unit that declares ids passes", () => {
    const root = record("2026-08-09T04:00:00Z");
    // security-requirements, not performance-requirements — the #2684 stage ⑥
    // numeric-threshold check (below) is scoped to performance alone, so this
    // artifact stays a pure id-contract fixture: filler bytes with no numbers
    // are still fine here.
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(3, 400));
    expect(evaluateNfrBudget(path).pass).toBe(true);
  });

  test("a design artifact inherits its unit's id absence", () => {
    // The finding is a property of the UNIT, so it surfaces from either stage's
    // artifacts rather than only from the one that should have declared.
    const root = record("2026-08-09T04:00:00Z");
    writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", NO_IDS);
    const path = writeArtifact(root, "u1", "nfr-design", "performance-design", "## Design\n\nprose\n");
    expect(evaluateNfrBudget(path).reason).toBe("missing-nfr-ids");
  });
});

// ---------------------------------------------------------------------------
// #2684 stage ⑥ (issue comment 5230806329, scope narrowed from a stopped
// first attempt by comment 5230769702) — the measurable-numeric-threshold
// check, scoped to performance-requirements.md alone and gated on the same
// id-contract cutoff as missing-nfr-ids.
// ---------------------------------------------------------------------------

describe("t514 the numeric-threshold check is scoped to performance-requirements.md", () => {
  test("a post-contract performance id with no measurable number is reported", () => {
    const root = record("2026-08-09T04:00:00Z");
    const body = "### PERF-1: latency\n\nThe service should be fast enough.\n";
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", body);
    const result = evaluateNfrBudget(path);
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("missing-numeric-threshold");
    expect(result.findings_count).toBe(1);
    expect(result.findings[0]?.field).toBe("nfr-id:PERF-1");
    expect(result.missing_numeric_threshold_count).toBe(1);
  });

  test("one finding per offending id, sorted, when several ids lack a number", () => {
    const root = record("2026-08-09T04:00:00Z");
    const body = [
      "### PERF-2: throughput",
      "should be fast.",
      "",
      "### PERF-1: latency",
      "p95 under 200 ms.",
      "",
      "### PERF-3: memory",
      "should be small.",
    ].join("\n");
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", body);
    const result = evaluateNfrBudget(path);
    expect(result.reason).toBe("missing-numeric-threshold");
    // PERF-1 has a number; PERF-2 and PERF-3 do not — sorted.
    expect(result.findings.map((f) => f.field)).toEqual(["nfr-id:PERF-2", "nfr-id:PERF-3"]);
    expect(result.missing_numeric_threshold_count).toBe(2);
  });

  test("a post-contract performance id WITH a measurable number passes", () => {
    const root = record("2026-08-09T04:00:00Z");
    const body = "### PERF-1: latency\n\np95 must stay under 200 ms.\n";
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", body);
    const result = evaluateNfrBudget(path);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("measured");
    expect(result.missing_numeric_threshold_count).toBe(0);
  });

  test("the check is GATED on the id-contract cutoff — pre-contract measures clean", () => {
    // Falling proof, other side: the same body that reports post-contract must
    // NOT report pre-contract — the cutoff gates this check exactly as it
    // gates missing-nfr-ids.
    const root = record("2026-08-09T03:47:45Z"); // one second before the cutoff
    const body = "### PERF-1: latency\n\nThe service should be fast enough.\n";
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", body);
    const result = evaluateNfrBudget(path);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("measured");
    expect(result.missing_numeric_threshold_count).toBe(0);
  });

  test("the check does NOT apply to other nfr-requirements artifacts", () => {
    // The same qualitative body that would be a genuine gap in performance is
    // a structurally correct requirement for security — scoped out entirely.
    const root = record("2026-08-09T04:00:00Z");
    const body = "### SEC-1: token handling\n\nThe service does not retain the token.\n";
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", body);
    const result = evaluateNfrBudget(path);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("measured");
    expect(result.missing_numeric_threshold_count).toBe(0);
  });

  test("the check does NOT apply to nfr-design's performance-design.md", () => {
    // nfr-design only CITES ids (the stage ① contract), so the check that
    // reads THIS artifact's own declarations is scoped to nfr-requirements.
    const root = record("2026-08-09T04:00:00Z");
    writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", "### PERF-1: latency\n\np95 under 200 ms.\n");
    const path = writeArtifact(root, "u1", "nfr-design", "performance-design", "## Design\n\nSatisfies PERF-1.\n");
    const result = evaluateNfrBudget(path);
    expect(result.pass).toBe(true);
    expect(result.missing_numeric_threshold_count).toBe(0);
  });

  test("vacuity guard: a block with only decorative digits (id number, section number, date) is still reported", () => {
    // If a bare digit anywhere in the block were enough, the check would be
    // vacuously satisfied by the id's own heading and never fire.
    const root = record("2026-08-09T04:00:00Z");
    const body = "### PERF-1: measured on 2026-08-09 (see section 3.2)\n\nprose only, no unit.\n";
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", body);
    const result = evaluateNfrBudget(path);
    expect(result.reason).toBe("missing-numeric-threshold");
    expect(idsMissingNumericThreshold(body)).toEqual(["PERF-1"]);
  });
});

describe("t514 the numeric-threshold check does not retroactively report the live corpus", () => {
  test("no pre-contract performance-requirements.md is reported for missing-numeric-threshold", () => {
    // Same shape as the missing-nfr-ids falling proof above: the id-contract
    // cutoff has to hold for BOTH checks it gates, not just the first one.
    const paths = preContractRecords().flatMap((dir) =>
      nfrArtifactsOf(dir).filter((path) => path.endsWith(`${PERFORMANCE_REQUIREMENTS_ARTIFACT}.md`)),
    );
    const reasons = paths.map((path) => evaluateNfrBudget(path).reason);
    // Vacuity guard: the sweep must actually have walked performance
    // artifacts, or "not reported" would be vacuously true.
    expect(paths.length).toBeGreaterThan(0);
    expect(reasons).not.toContain("missing-numeric-threshold");
  });

  test("re-measuring the corpus with the shipped predicate reproduces a non-trivial, non-universal flag rate", () => {
    // The pre-implementation corpus re-measurement this stage's stopping
    // condition required (ruling comment 5230806329, item 6): applying THIS
    // predicate to every performance-requirements.md id in the live corpus,
    // regardless of the id-contract cutoff (which the exploratory sweep this
    // reproduces did not apply either — it measured the raw predicate against
    // every declared id). Bounds only, not the literal 126/302 = 41.7% the
    // ruling measured at its own ref: the live corpus legitimately grows and
        // archives records between that measurement and any later run of this
    // suite, so pinning the exact fraction would pin corpus motion rather
    // than the predicate. What must hold regardless: the population is
    // non-empty, SOME ids are flagged, and NOT ALL are — a predicate that
    // measured nothing, or that flagged everything or nothing, would say
    // nothing about which ids are the outliers.
    let total = 0;
    let flagged = 0;
    for (const entry of readdirSync(CORPUS).filter((e) => /^[0-9]{6}-/.test(e))) {
      const constructionDir = join(CORPUS, entry, "construction");
      if (!existsSync(constructionDir)) continue;
      for (const unit of readdirSync(constructionDir)) {
        const path = join(constructionDir, unit, "nfr-requirements", `${PERFORMANCE_REQUIREMENTS_ARTIFACT}.md`);
        if (!existsSync(path)) continue;
        const body = readFileSync(path, "utf-8");
        const ids = countNfrIds(body);
        if (ids === 0) continue;
        total += ids;
        flagged += idsMissingNumericThreshold(body).length;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(flagged).toBeGreaterThan(0);
    expect(flagged).toBeLessThan(total);
  });
});

describe("t514 record resolution walks up to the record root", () => {
  test("finds the root from an artifact four levels down", () => {
    const root = record("2026-08-09T04:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-design", "security-design", "x");
    expect(resolveRecordRoot(path)).toBe(root);
    expect(readRecordBirth(root)).toBe("2026-08-09T04:00:00Z");
  });

  test("a path with no record above it resolves to nothing", () => {
    const orphan = join(tmp, "loose");
    mkdirSync(orphan, { recursive: true });
    writeFileSync(join(orphan, "security-requirements.md"), "x");
    expect(resolveRecordRoot(join(orphan, "security-requirements.md"))).toBeUndefined();
  });

  test("the walk is bounded — a record further up than the limit is not found", () => {
    // Without the bound, a run inside a nested checkout would climb into
    // whatever workspace sits above and read a stranger's record.
    const root = join(tmp, "260809-deep");
    mkdirSync(join(root, "audit"), { recursive: true });
    writeFileSync(join(root, "audit", "clone.jsonl"), "");
    const deep = join(root, "a", "b", "c", "d", "e", "f", "g", "h", "i");
    mkdirSync(deep, { recursive: true });
    const path = join(deep, "security-requirements.md");
    writeFileSync(path, "x");
    expect(resolveRecordRoot(path)).toBeUndefined();
  });

  test("an unreadable shard is skipped, not fatal", () => {
    // A record's other shards still answer for it; only this one is lost.
    //
    // A DANGLING SYMLINK is the portable throw: readdir lists it, and the read
    // fails with ENOENT on every platform. chmod 000 does not work under root,
    // and a directory named *.jsonl throws only on macOS — Linux returns "".
    const root = record("2026-08-09T04:00:00Z");
    symlinkSync(join(root, "audit", "gone"), join(root, "audit", "dangling.jsonl"));
    expect(readRecordBirth(root)).toBe("2026-08-09T04:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// The CLI contract — advisory means exit 0 on BOTH verdicts
// ---------------------------------------------------------------------------

describe("t514 CLI contract", () => {
  function run(argv: string[]): { code: number; stdout: string; stderr: string } {
    let stdout = "";
    let stderr = "";
    let code = -1;
    const outWrite = process.stdout.write.bind(process.stdout);
    const errWrite = process.stderr.write.bind(process.stderr);
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
    process.stderr.write = ((chunk: string) => {
      stderr += chunk;
      return true;
    }) as typeof process.stderr.write;
    try {
      sensorMain(argv);
    } catch (err) {
      if (!(err instanceof Error) || err.message !== "__exit__") throw err;
    } finally {
      process.stdout.write = outWrite;
      process.stderr.write = errWrite;
      // biome-ignore lint/suspicious/noExplicitAny: restore the real exit
      (process as any).exit = exit;
    }
    return { code, stdout, stderr };
  }

  test("a measured artifact exits 0 with a JSON verdict", () => {
    const root = record("2026-08-09T04:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(4, 500));
    const { code, stdout } = run(["--stage", "nfr-requirements", "--output-path", path]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, findings_count: 0, unit_nfr_count: 4 });
  });

  test("a reported artifact ALSO exits 0 — the verdict is data, not enforcement", () => {
    const root = record("2026-08-09T04:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "performance-requirements", "## Performance\n\nfast.\n");
    const { code, stdout } = run(["--stage", "nfr-requirements", "--output-path", path]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: false, reason: "missing-nfr-ids" });
  });

  test("a missing-numeric-threshold verdict (#2684 stage ⑥) ALSO exits 0", () => {
    const root = record("2026-08-09T04:00:00Z");
    const path = writeArtifact(
      root,
      "u1",
      "nfr-requirements",
      "performance-requirements",
      "### PERF-1: latency\n\nfast enough.\n",
    );
    const { code, stdout } = run(["--stage", "nfr-requirements", "--output-path", path]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: false, reason: "missing-numeric-threshold" });
  });

  test("--kind threads through to the coverage verdict, which ALSO exits 0", () => {
    // The CLI half of the stage ⑤ falling proof: the same fixture reported
    // in-process must report through the argv shim, and stay advisory.
    const root = recordWithUnitKind("2026-08-09T04:00:00Z", "u1", "service");
    const path = serviceUnitMissingTwo(root, "u1")[0] as string;
    const { code, stdout } = run(["--stage", "nfr-requirements", "--output-path", path, "--kind", "service"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      pass: false,
      reason: "missing-kind-required-artifacts",
      unit_kind: "service",
      missing_kind_required_count: 2,
    });
  });

  test("without --kind the same fixture is not reported — the flag is what enables the check", () => {
    const root = recordWithUnitKind("2026-08-09T04:00:00Z", "u2", "service");
    const path = serviceUnitMissingTwo(root, "u2")[0] as string;
    const { code, stdout } = run(["--stage", "nfr-requirements", "--output-path", path]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ unit_kind: null, missing_kind_required_count: 0 });
  });

  test("a missing flag is the ONLY exit-1 path", () => {
    const missingStage = run(["--output-path", "/nowhere/security-requirements.md"]);
    expect(missingStage.code).toBe(1);
    expect(missingStage.stderr).toContain("--stage is required");

    const missingPath = run(["--stage", "nfr-requirements"]);
    expect(missingPath.code).toBe(1);
    expect(missingPath.stderr).toContain("--output-path is required");
  });

  test("--depth Standard applies the ceiling; a within-budget unit still exits 0", () => {
    const root = record("2026-08-09T04:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(4, 100));
    const { code, stdout } = run(["--stage", "nfr-requirements", "--output-path", path, "--depth", "Standard"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, reason: "measured" });
  });

  test("--depth Standard on an over-budget unit ALSO exits 0 — advisory, not blocking", () => {
    const root = record("2026-08-09T04:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(2, 1300));
    const { code, stdout } = run(["--stage", "nfr-requirements", "--output-path", path, "--depth", "Standard"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: false, reason: "nfr-budget-exceeded" });
  });

  test("without --depth the same over-budget unit measures clean — never guesses a level", () => {
    const root = record("2026-08-09T04:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(2, 1300));
    const { code, stdout } = run(["--stage", "nfr-requirements", "--output-path", path]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, reason: "measured" });
  });
});

// ---------------------------------------------------------------------------
// #2684 stage ③ — the Standard-depth ceiling, both-side falling proof
// ---------------------------------------------------------------------------

describe("t514 the Standard ceiling flags an over-budget unit, independent of the id-contract cutoff", () => {
  test("nfr-requirements: exceeding the ceiling flags, even for a PRE-contract unit", () => {
    const root = record("2026-08-09T03:00:00Z"); // before NFR_ID_CONTRACT_LANDED
    // 2 ids * 1,300 B/id = 2,600 B, over the 2 * 1,200 = 2,400 B ceiling.
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(2, 1300));
    const result = evaluateNfrBudget(path, "Standard");
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("nfr-budget-exceeded");
    expect(result.findings_count).toBe(1);
    expect(result.findings[0]?.field).toBe("unit-bytes-per-nfr");
    // The unit predates the id contract; the flag fired anyway.
    expect(result.under_id_contract).toBe(false);
  });

  test("nfr-design: exceeding the ceiling flags, using the shared id denominator", () => {
    const root = record("2026-08-09T03:00:00Z");
    writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(2, 100));
    // nfr-design's own bytes (not nfr-requirements') are compared against the
    // same 2-id denominator: 2 * NFR_DESIGN_STANDARD_BUDGET is the ceiling.
    const designBody = `## Design\n\nSatisfies SEC-1 and SEC-2.\n${"x".repeat(2 * NFR_DESIGN_STANDARD_BUDGET)}\n`;
    const path = writeArtifact(root, "u1", "nfr-design", "security-design", designBody);
    const result = evaluateNfrBudget(path, "Standard");
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("nfr-budget-exceeded");
  });

  test("the same over-budget unit measures clean at Minimal — no ceiling declared there", () => {
    const root = record("2026-08-09T03:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(2, 1300));
    expect(evaluateNfrBudget(path, "Minimal").reason).toBe("measured");
  });

  test("the same over-budget unit measures clean at Comprehensive — no ceiling declared there", () => {
    const root = record("2026-08-09T03:00:00Z");
    const path = writeArtifact(root, "u1", "nfr-requirements", "security-requirements", requirementsBody(2, 1300));
    expect(evaluateNfrBudget(path, "Comprehensive").reason).toBe("measured");
  });

  test("exactly at the ceiling does not flag; one byte over does (strict inequality, exact total)", () => {
    const root = record("2026-08-09T03:00:00Z");
    const atCeiling = writeArtifact(
      root,
      "u1",
      "nfr-requirements",
      "security-requirements",
      requirementsBody(2, NFR_REQUIREMENTS_STANDARD_BUDGET),
    );
    expect(evaluateNfrBudget(atCeiling, "Standard").reason).toBe("measured");

    const overRoot = record("2026-08-09T03:00:00Z");
    const overPath = writeArtifact(overRoot, "u1", "nfr-requirements", "security-requirements", requirementsBody(2, 1201));
    expect(evaluateNfrBudget(overPath, "Standard").reason).toBe("nfr-budget-exceeded");
  });
});

// ---------------------------------------------------------------------------
// Corpus sweep — the other side of the falling proof
// ---------------------------------------------------------------------------

/** Every NFR artifact of one record that exists on disk. */
function nfrArtifactsOf(recordDir: string): string[] {
  const construction = join(recordDir, "construction");
  if (!existsSync(construction)) return [];
  const paths: string[] = [];
  for (const unit of readdirSync(construction)) {
    for (const [stage, artifacts] of [
      ["nfr-requirements", NFR_REQUIREMENTS_ARTIFACTS],
      ["nfr-design", NFR_DESIGN_ARTIFACTS],
    ] as const) {
      for (const artifact of artifacts) {
        const path = join(construction, unit, stage, `${artifact}.md`);
        if (existsSync(path)) paths.push(path);
      }
    }
  }
  return paths;
}

/** The records the id-contract cutoff does NOT reach. A record born at or
 *  after the cutoff is entitled to be reported for missing-nfr-ids, and
 *  asserting on it would pin the corpus rather than the guard. */
function preContractRecords(): string[] {
  return readdirSync(CORPUS)
    .filter((entry) => /^[0-9]{6}-/.test(entry))
    .map((entry) => join(CORPUS, entry))
    .filter((dir) => {
      const birth = readRecordBirth(dir);
      return birth === undefined || birth < NFR_ID_CONTRACT_LANDED;
    });
}

/** The record's own resolved depth, read the same way the dispatcher's
 *  --depth flag is derived (depthBudgetArgs / readRecordDepth). */
function depthOf(recordDir: string): string | undefined {
  return canonicalDepth(readRecordDepth(join(recordDir, "amadeus-state.md"), REPO_ROOT));
}

describe("t514 the live corpus is not retroactively reported for missing ids", () => {
  test("no artifact of a pre-contract record is reported for missing-nfr-ids", () => {
    const paths = preContractRecords().flatMap(nfrArtifactsOf);
    const reasons = paths.map((path) => evaluateNfrBudget(path).reason);
    // The sweep must actually have swept: a predicate that measured nothing
    // would pass this vacuously. A floor at today's corpus size would instead
    // fail whenever records are archived, which says nothing about the guard.
    expect(paths.length).toBeGreaterThan(0);
    expect(reasons).not.toContain("missing-nfr-ids");
  });

  test("a pre-contract record's own resolved depth can still surface nfr-budget-exceeded — the ceiling check is independent of the cutoff", () => {
    // Distinct from the assertion above: the id-contract cutoff governs ONLY
    // missing-nfr-ids (flagsNfrBudget's own comment says so). When --depth
    // resolves to the record's actual Standard depth, any finding a
    // pre-contract record produces must be the budget flag, never the
    // missing-id one.
    const reported: string[] = [];
    let evaluated = 0;
    for (const recordDir of preContractRecords()) {
      const depth = depthOf(recordDir);
      for (const path of nfrArtifactsOf(recordDir)) {
        const result = evaluateNfrBudget(path, depth);
        evaluated += 1;
        if (!result.pass) reported.push(result.reason);
      }
    }
    // Vacuity guard: `every` on an empty list proves nothing. The corpus must
    // actually have been walked for the assertion below to carry weight.
    expect(evaluated).toBeGreaterThan(0);
    expect(reported.every((reason) => reason === "nfr-budget-exceeded")).toBe(true);
  });
});

describe("t514 the corpus sweep holds the ruling's invariants", () => {
  test("each stage's Standard population is non-empty and its flags stay a strict subset", () => {
    // Walks the live corpus with this sensor's own shipped predicates end to
    // end (measureNfrStageDir + unitIdCount + flagsNfrBudget) rather than a
    // re-derived count. The ruling's exact figures at its measurement ref
    // (comment 5230416035: 12/78 and 16/78) are NOT pinned here — the live
    // corpus legitimately grows and archives records, and a count drift is
    // not a sensor defect (the same reason Line 566-569 avoids corpus-count
    // literals). What must hold regardless of corpus motion: the population
    // was actually walked, and flagging stays a subset of it. The ruling
    // figures themselves live in the manifest table and the unit-test
    // OBSERVED constants, both pinned to the measurement ref.
    const counts: Record<"nfr-requirements" | "nfr-design", { n: number; flagged: number }> = {
      "nfr-requirements": { n: 0, flagged: 0 },
      "nfr-design": { n: 0, flagged: 0 },
    };
    for (const entry of readdirSync(CORPUS).filter((e) => /^[0-9]{6}-/.test(e))) {
      const recordDir = join(CORPUS, entry);
      const depth = depthOf(recordDir);
      if (depth !== "Standard") continue;
      const constructionDir = join(recordDir, "construction");
      if (!existsSync(constructionDir)) continue;
      for (const unit of readdirSync(constructionDir)) {
        for (const [stage, artifacts] of [
          ["nfr-requirements", NFR_REQUIREMENTS_ARTIFACTS],
          ["nfr-design", NFR_DESIGN_ARTIFACTS],
        ] as const) {
          const stageDir = join(constructionDir, unit, stage);
          if (!existsSync(stageDir)) continue;
          const measured = measureNfrStageDir(stageDir, artifacts);
          if (measured.files === 0) continue;
          const idCount = unitIdCount(stageDir);
          if (idCount === 0) continue; // population = units WITH declared ids
          counts[stage].n += 1;
          if (flagsNfrBudget(stage, "Standard", measured.bytes, idCount)) counts[stage].flagged += 1;
        }
      }
    }
    for (const stage of ["nfr-requirements", "nfr-design"] as const) {
      const { n, flagged } = counts[stage];
      expect(n).toBeGreaterThan(0);
      expect(flagged).toBeGreaterThan(0);
      expect(flagged).toBeLessThan(n);
    }
  });
});

describe("t514 the dispatcher arm turns a resolved depth into nfr-budget's --depth flag", () => {
  let seq = 0;
  function seedRecord(depthLine: string | null): string {
    seq += 1;
    const root = join(tmp, "amadeus", "spaces", "default", "intents", `260809-x-${seq}`);
    if (depthLine !== null) {
      mkdirSync(root, { recursive: true });
      writeFileSync(join(root, "amadeus-state.md"), `# State\n\n## Scope Configuration\n\n${depthLine}\n`);
    } else {
      mkdirSync(root, { recursive: true });
    }
    const stageDir = join(root, "construction", "u1", "nfr-requirements");
    mkdirSync(stageDir, { recursive: true });
    const out = join(stageDir, "security-requirements.md");
    writeFileSync(out, requirementsBody(1, 100));
    return out;
  }

  test("resolves --depth for nfr-budget, the same as depth-budget", () => {
    const out = seedRecord("- **Depth**: Standard");
    expect(depthBudgetArgs("nfr-budget", out, tmp)).toEqual(["--depth", "Standard"]);
    expect(depthBudgetArgs("depth-budget", out, tmp)).toEqual(["--depth", "Standard"]);
  });

  test("is silent for an unrelated sensor and for an unresolved depth", () => {
    const withDepth = seedRecord("- **Depth**: Standard");
    expect(depthBudgetArgs("required-sections", withDepth, tmp)).toEqual([]);
    expect(depthBudgetArgs("nfr-budget", seedRecord(null), tmp)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. Kind coverage — #2684 stage ⑤ (ruling comment 5230791793)
// ---------------------------------------------------------------------------
//
// FORWARD-LOOKING ONLY. `produces_kinds` landed on nfr-requirements in #1338
// (2026-07-22) and no record born since declares a resolvable unit kind AND
// ran nfr-requirements, so the live corpus holds zero positive instances. Both
// sides of the falling proof are therefore synthetic: a fixture record whose
// unit-of-work-dependency.md declares `kind: service` reports the omission,
// and the same omission under a kind that does not require the artifact — or
// with no kind at all — reports nothing. The corpus sweep below asserts the
// other side on live data: zero findings today.

/** The stage's real `produces_kinds` map — the same one the sensor reads, so
 *  these fixtures are judged against the shipped contract rather than a copy. */
const REQUIREMENTS_KINDS = readProducesKinds("nfr-requirements", STAGES_DIR) as Map<string, string[]>;

/** A record whose units-generation artifact declares one unit's kind, in the
 *  nested edge-block form parseBoltDag accepts. */
function recordWithUnitKind(birth: string | undefined, unit: string, kind: string | null): string {
  const root = record(birth);
  const dir = join(root, "inception", "units-generation");
  mkdirSync(dir, { recursive: true });
  const kindLine = kind === null ? "" : `    kind: ${kind}\n`;
  writeFileSync(
    join(dir, "unit-of-work-dependency.md"),
    ["# Units", "", "```yaml", "units:", `  - name: ${unit}`, kindLine + "    depends_on: []", "```", ""].join("\n"),
  );
  return root;
}

/** A service unit missing scalability + reliability: two artifacts its kind
 *  requires. The remaining three exist so the sensor has something to fire on. */
function serviceUnitMissingTwo(root: string, unit: string): string[] {
  const present = ["performance-requirements", "security-requirements", "tech-stack-decisions"];
  return present.map((artifact) =>
    writeArtifact(root, unit, "nfr-requirements", artifact, requirementsBody(1, 400, "PERF").concat("p95 200 ms.\n")),
  );
}

describe("t514 the kind coverage check separates pruning from a silent omission", () => {
  test("falling proof: a service unit missing artifacts its kind requires is reported", () => {
    const root = recordWithUnitKind("2026-08-09T10:00:00Z", "u1", "service");
    const paths = serviceUnitMissingTwo(root, "u1");
    const result = evaluateNfrBudget(paths[0] as string, "Standard", "service");
    expect(result.reason).toBe("missing-kind-required-artifacts");
    expect(result.pass).toBe(false);
    expect(result.unit_kind).toBe("service");
    expect(result.findings.map((f) => f.field)).toEqual([
      "artifact:reliability-requirements",
      "artifact:scalability-requirements",
    ]);
    expect(result.missing_kind_required_count).toBe(2);
  });

  test("the other side: the same absence under a kind that prunes it reports nothing", () => {
    // `library` requires neither scalability nor reliability (neither lists it
    // in produces_kinds), so the identical filesystem is case (a) — pruning.
    const root = recordWithUnitKind("2026-08-09T10:00:00Z", "u2", "library");
    const paths = serviceUnitMissingTwo(root, "u2");
    const result = evaluateNfrBudget(paths[0] as string, "Standard", "library");
    expect(result.reason).not.toBe("missing-kind-required-artifacts");
    expect(result.missing_kind_required_count).toBe(0);
    expect(result.unit_kind).toBe("library");
  });

  test("an unresolved kind is fail-open: measured, never classified", () => {
    // The kindless generation (most of the corpus) reaches here. Without a kind
    // the two absences are indistinguishable, so neither is reported.
    const root = recordWithUnitKind("2026-08-09T10:00:00Z", "u3", null);
    const paths = serviceUnitMissingTwo(root, "u3");
    const result = evaluateNfrBudget(paths[0] as string, "Standard");
    expect(result.reason).not.toBe("missing-kind-required-artifacts");
    expect(result.unit_kind).toBeNull();
    expect(result.missing_kind_required_count).toBe(0);
  });

  test("the cutoff holds: a pre-contract record with a resolvable kind is not reported", () => {
    const root = recordWithUnitKind("2026-07-01T00:00:00Z", "u4", "service");
    const paths = serviceUnitMissingTwo(root, "u4");
    const result = evaluateNfrBudget(paths[0] as string, "Standard", "service");
    expect(result.under_id_contract).toBe(false);
    expect(result.reason).not.toBe("missing-kind-required-artifacts");
  });

  test("vacuity guard: the verdict is the same whichever artifact of the unit fired", () => {
    // The check is judged on the UNIT's stage directory, so a fire on any
    // present artifact must reach the identical finding set — otherwise one
    // unit would be reported once per artifact with drifting content.
    const root = recordWithUnitKind("2026-08-09T10:00:00Z", "u5", "service");
    const paths = serviceUnitMissingTwo(root, "u5");
    expect(paths.length).toBeGreaterThan(1);
    const verdicts = paths.map((path) => {
      const r = evaluateNfrBudget(path, "Standard", "service");
      return { reason: r.reason, fields: r.findings.map((f) => f.field).join(","), count: r.missing_kind_required_count };
    });
    for (const verdict of verdicts) {
      expect(verdict).toEqual(verdicts[0] as (typeof verdicts)[number]);
    }
    expect(verdicts[0]?.reason).toBe("missing-kind-required-artifacts");
  });

  test("a complete service unit is not reported", () => {
    const root = recordWithUnitKind("2026-08-09T10:00:00Z", "u6", "service");
    let first = "";
    for (const artifact of NFR_REQUIREMENTS_ARTIFACTS) {
      const path = writeArtifact(
        root,
        "u6",
        "nfr-requirements",
        artifact,
        `${requirementsBody(1, 400, "PERF")}p95 200 ms.\n`,
      );
      if (first === "") first = path;
    }
    expect(evaluateNfrBudget(first, "Standard", "service").missing_kind_required_count).toBe(0);
  });

  test("the shipped map keeps the keyless artifacts required of every kind", () => {
    // Pins the semantic the whole check rests on against the REAL frontmatter:
    // security-requirements and tech-stack-decisions declare no key, so no
    // kind prunes them.
    for (const kind of ["service", "ui", "library", "spec", "packaging"]) {
      const required = artifactsRequiredForKind("nfr-requirements", kind, REQUIREMENTS_KINDS);
      expect(required).toContain("security-requirements");
      expect(required).toContain("tech-stack-decisions");
    }
  });
});

describe("t514 the dispatcher resolves a unit kind into nfr-budget's --kind flag", () => {
  test("reads the kind from the record's committed unit-of-work-dependency.md", () => {
    const root = recordWithUnitKind("2026-08-09T10:00:00Z", "u1", "service");
    const path = serviceUnitMissingTwo(root, "u1")[0] as string;
    expect(unitKindArgs("nfr-budget", path, tmp)).toEqual(["--kind", "service"]);
  });

  test("is silent for an unrelated sensor, an absent edge block, and a kindless unit", () => {
    const withKind = recordWithUnitKind("2026-08-09T10:00:00Z", "u1", "service");
    const withKindPath = serviceUnitMissingTwo(withKind, "u1")[0] as string;
    expect(unitKindArgs("depth-budget", withKindPath, tmp)).toEqual([]);

    const kindless = recordWithUnitKind("2026-08-09T10:00:00Z", "u2", null);
    expect(unitKindArgs("nfr-budget", serviceUnitMissingTwo(kindless, "u2")[0] as string, tmp)).toEqual([]);

    const noBlock = record("2026-08-09T10:00:00Z");
    expect(unitKindArgs("nfr-budget", serviceUnitMissingTwo(noBlock, "u3")[0] as string, tmp)).toEqual([]);
  });

  test("a path outside the project directory resolves nothing", () => {
    const outside = mkdtempSync(join(tmpdir(), "amadeus-t514-outside-"));
    try {
      const root = recordWithUnitKind("2026-08-09T10:00:00Z", "u1", "service");
      const path = serviceUnitMissingTwo(root, "u1")[0] as string;
      expect(unitKindArgs("nfr-budget", path, outside)).toEqual([]);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("t514 the live corpus reports no kind-coverage omission", () => {
  test("every artifact whose unit kind resolves is complete for that kind", () => {
    // The other half of the synthetic falling proof
    // (cid:code-generation:corpus-sweep-for-new-guards). ZERO is the expected
    // result and is asserted as such: `produces_kinds` postdates every record
    // that ran nfr-requirements with a resolvable kind, so no live unit can
    // legitimately be in case (c) today. A non-zero count here means either a
    // real silent omission has appeared or the predicate over-fires.
    const reported: string[] = [];
    let evaluated = 0;
    for (const entry of readdirSync(CORPUS).filter((e) => /^[0-9]{6}-/.test(e))) {
      const recordDir = join(CORPUS, entry);
      const depth = depthOf(recordDir);
      for (const path of nfrArtifactsOf(recordDir)) {
        const kind = unitKindArgs("nfr-budget", path, REPO_ROOT)[1];
        evaluated += 1;
        const result = evaluateNfrBudget(path, depth, kind);
        if (result.missing_kind_required_count > 0) reported.push(path);
      }
    }
    // Vacuity guard: the sweep must have walked the corpus for the zero to
    // carry weight.
    expect(evaluated).toBeGreaterThan(0);
    expect(reported).toEqual([]);
  });
});
