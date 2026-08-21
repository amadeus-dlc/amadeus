// covers: file:packages/framework/core/tools/amadeus-sensor-depth-budget.ts,
//         file:packages/framework/core/sensors/amadeus-depth-budget.md,
//         file:packages/framework/core/tools/amadeus-sensor.ts
// size: medium
//
// #2425 the depth-budget sensor — the third leg of depth delivery. The engine
// now delivers `directive.depth` and the stage contracts state a per-depth
// volume, but nothing MEASURES the result: `brief` had no numeric meaning, so
// the same kind of intent produced requirements.md files spanning 5,382 B to
// 61,333 B (11x) with Minimal's median ABOVE Standard's.
//
// This sensor gives `brief` a number. It is advisory by construction (the
// shipped schema admits no other severity), so a finding is data at the gate,
// never a block. Halves:
//
//   1. The manifest is well-formed by the SHIPPED schema, advisory-only, and
//      its `matches` glob addresses the requirements.md the stage produces —
//      under BOTH glob engines that see it (the dispatcher's own matcher and
//      Bun.Glob in the PostToolUse hook), which disagree on some patterns.
//   2. The predicate measures bytes per numbered FR and flags a depth's
//      ceiling being exceeded. Thresholds are deliberately BELOW today's
//      measured medians (Minimal 2,459 B/FR, Standard 2,067 B/FR) so the gate
//      is not a rubber stamp on the status quo.
//
// Fail-open everywhere absence is legitimate: no file, no depth, and
// Comprehensive (which declares no ceiling) all pass. The one exception is a
// requirements.md with NO numbered FRs at all — that is the stage contract's
// `FR-n` requirement going unmet, and it is reported.
//
// Touches a real filesystem (fixtures on disk + the real manifest), hence the
// integration tier (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseSensorManifest,
  validateSensorManifest,
} from "../../packages/framework/core/tools/amadeus-sensor-schema.ts";
import {
  DEPTH_BUDGETS,
  evaluateDepthBudget,
  main as sensorMain,
  readRecordDepth,
} from "../../packages/framework/core/tools/amadeus-sensor-depth-budget.ts";
import {
  depthBudgetArgs,
  matchesGlob,
} from "../../packages/framework/core/tools/amadeus-sensor.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = join(REPO_ROOT, "packages/framework/core/sensors/amadeus-depth-budget.md");
// chmod 000 is the portable way to make a read fail — but root ignores mode
// bits, so those cases would silently assert the wrong thing there. One shared
// guard rather than a per-case skip (the repo's existing isRoot idiom).
const isRoot = typeof process.getuid === "function" && process.getuid() === 0;

const STAGE_FILE = join(
  REPO_ROOT,
  "packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md",
);

let tmp = "";
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "amadeus-t488-"));
});
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

/** A requirements.md body of EXACTLY `count * bytesPerFr` bytes carrying
 *  `count` numbered FRs, so a fixture sized at a ceiling measures at that
 *  ceiling rather than one byte over it. */
function requirements(count: number, bytesPerFr: number, heading = "### FR-"): string {
  const parts: string[] = [];
  for (let n = 1; n <= count; n += 1) {
    const head = `${heading}${n}: requirement ${n}\n`;
    // Each block ends with a newline so the NEXT heading starts a line — the
    // FR patterns anchor at line start, and running them together would leave
    // every requirement after the first uncounted.
    parts.push(`${head}${"x".repeat(Math.max(0, bytesPerFr - head.length - 1))}\n`);
  }
  return parts.join("");
}

function writeRequirements(body: string): string {
  const p = join(tmp, "requirements.md");
  writeFileSync(p, body);
  return p;
}

// ===========================================================================
// 1. The manifest
// ===========================================================================

describe("t488 depth-budget manifest", () => {
  test("is a well-formed, advisory, document-shape sensor manifest", () => {
    const parsed = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    expect(() => validateSensorManifest(parsed, MANIFEST, "depth-budget")).not.toThrow();
    expect(parsed.id).toBe("depth-budget");
    expect(parsed.kind).toBe("deterministic");
    expect(parsed.default_severity).toBe("advisory");
    // document-shape restricts firing to the run-stage's declared produces, so
    // the sensor cannot fire on an unrelated requirements.md in the tree.
    expect(parsed.category).toBe("document-shape");
  });

  test("matches the requirements.md the stage produces, under BOTH glob engines", () => {
    const parsed = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    const glob = parsed.matches ?? "";
    const real = "amadeus/spaces/default/intents/260808-x-ab12cd34/inception/requirements-analysis/requirements.md";
    // The dispatcher uses its own matcher; the PostToolUse hook uses Bun.Glob.
    // A pattern the two read differently fires in one place and not the other,
    // so both are asserted on the same path.
    expect({ engine: "dispatcher", hit: matchesGlob(glob, real) }).toEqual({ engine: "dispatcher", hit: true });
    expect({ engine: "bun", hit: new Bun.Glob(glob).match(real) }).toEqual({ engine: "bun", hit: true });
  });

  test("does not match a sibling artifact of the same stage", () => {
    const glob = parseSensorManifest(readFileSync(MANIFEST, "utf-8")).matches ?? "";
    const questions =
      "amadeus/spaces/default/intents/260808-x-ab12cd34/inception/requirements-analysis/requirements-analysis-questions.md";
    expect(matchesGlob(glob, questions)).toBe(false);
    expect(new Bun.Glob(glob).match(questions)).toBe(false);
  });

  test("the stage binds the sensor so compile resolves it", () => {
    // An id in a stage's `sensors:` list that has no manifest is a loud compile
    // reject, so this pins the pair rather than the manifest alone.
    expect(Bun.file(STAGE_FILE).text()).resolves.toContain("- depth-budget");
  });
});

// ===========================================================================
// 2. The predicate
// ===========================================================================

// Measured with this sensor's own predicate over every
// `amadeus/spaces/default/intents/*/inception/requirements-analysis/requirements.md`
// (133 files), each paired with its record's `**Depth**` field. ALL 133 carry
// FR ids under the current patterns (table rows and fused ids included, #2534);
// one has no recognizable depth and drops out of the per-level rows:
//
//   Minimal  n=74  min  681  p25 1513  median 1857  max 6544 B/FR
//   Standard n=58  min  428  p25 1191  median 1546  max 3354 B/FR
//
// Both levels move DOWN from the previous measurement because the widened
// patterns find requirements the old ones missed, and the count is the
// denominator. Standard's maximum falls hardest (12,844 -> 3,354): its old
// extreme was a table-form artifact read as carrying a single requirement.
//
// These replace an earlier set taken while prefixed ids went uncounted, which
// inflated every figure and was quoted without its search predicate — the
// numbers here are re-runnable from the enumeration above. The ceilings are
// re-checked against the corrected numbers below rather than being re-derived
// from them — a threshold moved in the same change that fixed its denominator
// could not be told apart from one tuned to the new numbers.
//
// A ceiling has to sit INSIDE its level's range to carry information. Below the
// minimum it reports "every artifact is too long", which says nothing about
// which ones are outliers; above the maximum it reports nothing at all. The
// original Minimal ceiling of 1,200 flagged every artifact then measured — a
// permanently red signal, which is noise rather than a detector.
const MINIMAL_OBSERVED = { min: 681, p25: 1513, median: 1857, max: 6544 };
const STANDARD_OBSERVED = { min: 428, median: 1546, max: 3354 };

describe("t488 depth-budget thresholds", () => {
  test("each ceiling discriminates — it sits inside its level's observed range", () => {
    // The property that makes a ceiling a detector rather than a verdict. Below
    // the observed minimum everything flags; above the maximum nothing does.
    const minimal = DEPTH_BUDGETS.Minimal as number;
    expect(minimal).toBeGreaterThan(MINIMAL_OBSERVED.min);
    expect(minimal).toBeLessThan(MINIMAL_OBSERVED.max);
    const standard = DEPTH_BUDGETS.Standard as number;
    expect(standard).toBeGreaterThan(STANDARD_OBSERVED.min);
    expect(standard).toBeLessThan(STANDARD_OBSERVED.max);
  });

  test("the MINIMAL ceiling pulls its level down — under today's median", () => {
    // Minimal is the level the inversion is about: its median (1,930) sits
    // ABOVE Standard's (1,654) despite declaring less detail. A Minimal ceiling
    // at or above its own median would ratify exactly that.
    expect(DEPTH_BUDGETS.Minimal).toBeLessThan(MINIMAL_OBSERVED.median);
  });

  test("the STANDARD ceiling deliberately sits above its median, admitting the level as it is", () => {
    // Not an oversight and not held to Minimal's rule: Standard's current
    // volume was judged reasonable, so its ceiling catches the tail (7/52)
    // rather than the middle. Pinned as an intentional asymmetry so the two
    // levels cannot be silently collapsed into one rule.
    expect(DEPTH_BUDGETS.Standard as number).toBeGreaterThan(STANDARD_OBSERVED.median);
    // Still bounded: above the median but well inside the range, or it would
    // stop discriminating altogether.
    expect(DEPTH_BUDGETS.Standard as number).toBeLessThan(STANDARD_OBSERVED.max);
  });

  test("the ceilings restore the ordering Minimal < Standard", () => {
    expect(DEPTH_BUDGETS.Minimal as number).toBeLessThan(DEPTH_BUDGETS.Standard as number);
  });

  test("a lean Minimal artifact passes while the median one does not", () => {
    // The concrete consequence, as behaviour rather than a comparison of
    // constants: the leanest quarter of today's Minimal corpus is admitted, the
    // median is not. A ceiling that failed both would carry no signal.
    const lean = writeRequirements(requirements(4, MINIMAL_OBSERVED.p25));
    expect(evaluateDepthBudget(lean, "Minimal").pass).toBe(true);
    const median = writeRequirements(requirements(4, MINIMAL_OBSERVED.median));
    expect(evaluateDepthBudget(median, "Minimal").pass).toBe(false);
  });

  test("today's Standard median still passes", () => {
    const standardToday = writeRequirements(requirements(4, STANDARD_OBSERVED.median));
    expect(evaluateDepthBudget(standardToday, "Standard").pass).toBe(true);
  });

  test("Comprehensive declares no ceiling", () => {
    expect(DEPTH_BUDGETS.Comprehensive).toBeUndefined();
  });

  test("Minimal within budget passes", () => {
    const p = writeRequirements(requirements(6, 400));
    const r = evaluateDepthBudget(p, "Minimal");
    expect(r.pass).toBe(true);
    expect(r.findings_count).toBe(0);
    expect(r.fr_count).toBe(6);
  });

  test("Minimal over budget fails and reports the measurement (falling evidence)", () => {
    const p = writeRequirements(requirements(1, 3000));
    const r = evaluateDepthBudget(p, "Minimal");
    expect(r.pass).toBe(false);
    expect(r.findings_count).toBe(1);
    // The finding must carry the numbers a human needs at the gate: what was
    // measured and what the ceiling was.
    expect(r.bytes_per_fr).toBeGreaterThan(DEPTH_BUDGETS.Minimal as number);
    expect(r.findings[0].reason).toContain(String(DEPTH_BUDGETS.Minimal));
  });

  test("Standard admits what Minimal rejects (the levels are distinguishable)", () => {
    const p = writeRequirements(requirements(4, 2000));
    expect(evaluateDepthBudget(p, "Minimal").pass).toBe(false);
    expect(evaluateDepthBudget(p, "Standard").pass).toBe(true);
  });

  test("a sub-integer overrun is caught — the comparison is exact, not rounded", () => {
    // 10 FRs at 1,200 B each plus one byte: 1200.1 B/FR. Rounding the per-FR
    // figure before comparing would report 1200 and slip under a 1200 ceiling,
    // so the check is made on the exact total.
    const ceiling = DEPTH_BUDGETS.Minimal as number;
    const body = `${requirements(10, ceiling)}x`;
    const r = evaluateDepthBudget(writeRequirements(body), "Minimal");
    expect(r.fr_count).toBe(10);
    expect(r.bytes).toBe(ceiling * 10 + 1);
    expect(r.pass).toBe(false);
  });

  test("exactly at the ceiling passes — the overrun must be real", () => {
    const ceiling = DEPTH_BUDGETS.Minimal as number;
    const r = evaluateDepthBudget(writeRequirements(requirements(10, ceiling)), "Minimal");
    expect(r.bytes).toBe(ceiling * 10);
    expect(r.pass).toBe(true);
  });

  test("the Standard ceiling is exclusive of overrun and inclusive at the boundary", () => {
    const at = writeRequirements(requirements(1, DEPTH_BUDGETS.Standard as number));
    expect(evaluateDepthBudget(at, "Standard").pass).toBe(true);
    const over = writeRequirements(requirements(1, (DEPTH_BUDGETS.Standard as number) + 200));
    expect(evaluateDepthBudget(over, "Standard").pass).toBe(false);
  });

  test("Comprehensive always passes — it declares no ceiling", () => {
    const p = writeRequirements(requirements(1, 60_000));
    const r = evaluateDepthBudget(p, "Comprehensive");
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("no-ceiling");
  });
});

describe("t488 depth-budget FR counting", () => {
  test("counts heading, bold-list and bold-line FR forms", () => {
    const body = [
      "### FR-1: heading form",
      "y".repeat(50),
      "- **FR-2**: bold list form",
      "y".repeat(50),
      "**FR-3**: bold line form",
      "y".repeat(50),
    ].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(3);
  });

  // REGRESSION (#2425): the shipped pattern required a digit straight after
  // `FR-`, so every domain-prefixed id the corpus actually uses went uncounted.
  // 17 of the 132 corpus artifacts were undercounted and 14 were reported as
  // carrying no requirements at all (population: the enumeration documented at
  // the OBSERVED constants above). Because the count is the DENOMINATOR of bytes-per-FR,
  // undercounting inflates the measurement and skews the ceilings derived from
  // it — the failure was not cosmetic.
  //
  // The bodies below are the real shapes, quoted from the corpus.
  test("counts domain-prefixed ids — the form the corpus actually uses", () => {
    const body = [
      "- **FR-AUTH-1(semi 専用 authorization 型の新設)** — ...",
      "y".repeat(50),
      "- **FR-LAD-2(第2関門ルーティング)** — ...",
      "y".repeat(50),
      "- **FR-GRT-004** — ...",
      "y".repeat(50),
    ].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(3);
  });

  test("a domain-prefixed heading id counts too", () => {
    const body = ["### FR-ADV-5: heading with a domain prefix", "y".repeat(50)].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(1);
  });

  test("plain and prefixed ids coexist without collapsing into one", () => {
    // Distinct ids across both shapes must stay distinct: collapsing them would
    // shrink the denominator and inflate bytes-per-FR just as undercounting did.
    const body = [
      "### FR-1: plain",
      "y".repeat(50),
      "- **FR-AUTH-1**: prefixed, a DIFFERENT requirement",
      "y".repeat(50),
    ].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(2);
  });

  test("an unnumbered id does not count — the contract says numbered", () => {
    // `FR-AUTH` carries no number, so a document holding only such ids has NOT
    // met the numbering requirement and must still report no-numbered-frs.
    const body = ["- **FR-AUTH**: prefix but no number", "y".repeat(50)].join("\n");
    const result = evaluateDepthBudget(writeRequirements(body), "Minimal");
    expect(result.fr_count).toBe(0);
    expect(result.reason).toBe("no-numbered-frs");
  });

  test("an id must END on its number — trailing junk disqualifies it", () => {
    // `FR-AUTH-1x` and `FR-AUTH-1-` do not end on a numeric segment; counting
    // them would accept ids downstream stages cannot address.
    const body = [
      "- **FR-AUTH-1x**: number followed by a letter",
      "y".repeat(50),
      "- **FR-AUTH-1-**: number followed by a dangling hyphen",
      "y".repeat(50),
    ].join("\n");
    const result = evaluateDepthBudget(writeRequirements(body), "Minimal");
    expect(result.fr_count).toBe(0);
    expect(result.reason).toBe("no-numbered-frs");
  });

  test("a repeated id counts once (a cross-reference is not a new requirement)", () => {
    const body = ["### FR-1: the requirement", "z".repeat(50), "### FR-1: restated later", "z".repeat(50)].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(1);
  });
});

// REGRESSION (#2534): seven corpus artifacts wrote every requirement in a form
// the three shipped patterns could not see, so each measured as carrying NO
// requirements at all. Two forms account for all seven: a Markdown table whose
// first cell is the id, and a fused id (`FR-A1`) whose final segment mixes
// letters and digits instead of ending on a bare number. The bodies below are
// the real shapes, quoted from those artifacts.
describe("t488 depth-budget FR counting — table and fused-id forms", () => {
  test("counts ids written as the first cell of a table row", () => {
    const body = [
      "| ID | 要件 |",
      "|---|---|",
      "| FR-01 | 共通selector |",
      "y".repeat(50),
      "| FR-EVT-1 | Event Registry |",
      "y".repeat(50),
      "| FR-HAR-001 | harness 契約 |",
      "y".repeat(50),
    ].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(3);
  });

  test("a table header or separator row is not a requirement", () => {
    // `| FR ID |` names the column; `|---|` draws the rule. Counting either
    // would invent requirements out of table furniture.
    const body = ["| FR ID | 要件 |", "|---|---|", "| FR-01 | the only requirement |", "y".repeat(50)].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(1);
  });

  test("an id mentioned in a later cell is a reference, not a definition", () => {
    // Only the FIRST cell declares. A dependency column naming FR-09 must not
    // add a requirement the document never defines.
    const body = ["| FR-01 | depends on | FR-09 |", "y".repeat(50)].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(1);
  });

  test("counts fused ids in bold-list and plain-list forms", () => {
    const body = [
      "- **FR-A1(移設)**: `scripts/legacy-tools/` を移設する",
      "y".repeat(50),
      "- FR-B2: dispatch tool 語彙の両受理",
      "y".repeat(50),
      "- FR-A3（再発防止）: 新規 drift ガードテストを追加する",
      "y".repeat(50),
    ].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(3);
  });

  test("a fused id still has to end on its digits", () => {
    // `FR-A` carries no number and `FR-A1x` does not end on one, so neither is
    // an addressable numbered requirement.
    const body = ["### FR-A: 配布自立化", "y".repeat(50), "- **FR-A1x**: trailing letter", "y".repeat(50)].join("\n");
    const result = evaluateDepthBudget(writeRequirements(body), "Minimal");
    expect(result.fr_count).toBe(0);
    expect(result.reason).toBe("no-numbered-frs");
  });

  test("a plain-list line only declares when a label delimiter follows the id", () => {
    // `- FR-3 は削除する` is prose about FR-3, not its declaration. Without the
    // delimiter the plain-list form would count every passing mention.
    const body = ["- FR-3 は本 intent のスコープ外", "y".repeat(50)].join("\n");
    const result = evaluateDepthBudget(writeRequirements(body), "Minimal");
    expect(result.fr_count).toBe(0);
    expect(result.reason).toBe("no-numbered-frs");
  });

  test("a parenthesised gloss does not stand in for the label colon", () => {
    // Quoted from the corpus: this line glosses an id decided elsewhere and
    // declares nothing. Only the entry that reaches a colon is a declaration.
    const body = [
      "- FR-GRT-006(full grant の確認儀式)は不変 — #2253 既決",
      "y".repeat(50),
      "- FR-GRT-007（新規）: 本 intent が定める要件",
      "y".repeat(50),
    ].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(1);
  });
});

describe("t488 depth-budget fail-open", () => {
  test("a missing file passes (absence is the artifact guard's business)", () => {
    const r = evaluateDepthBudget(join(tmp, "absent", "requirements.md"), "Minimal");
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("no-file");
  });

  test("a non-requirements output is skipped outright", () => {
    expect(evaluateDepthBudget(join(tmp, "code-summary.md"), "Minimal").reason).toBe("not-requirements");
  });

  test("an unknown or absent depth passes (the sensor never guesses a level)", () => {
    const p = writeRequirements(requirements(1, 9000));
    expect(evaluateDepthBudget(p, undefined).pass).toBe(true);
    expect(evaluateDepthBudget(p, undefined).reason).toBe("no-depth");
    expect(evaluateDepthBudget(p, "banana").pass).toBe(true);
  });

  test("no numbered FRs is a finding — the stage contract requires FR-n ids", () => {
    const p = writeRequirements("## Requirements\n\nSome prose with no numbered requirements at all.\n");
    const r = evaluateDepthBudget(p, "Minimal");
    expect(r.pass).toBe(false);
    expect(r.findings_count).toBe(1);
    expect(r.reason).toBe("no-numbered-frs");
  });

  test.each([undefined, "banana", "Comprehensive"])(
    "no numbered FRs is a finding even at depth %s — the numbering contract is depth-independent",
    (depth) => {
      // Checked BEFORE the depth guard: if it came after, the numbering contract
      // would go unenforced on exactly the runs where depth cannot be resolved.
      const p = writeRequirements("## Requirements\n\nProse with no numbered requirements at all.\n");
      const r = evaluateDepthBudget(p, depth);
      expect(r.pass).toBe(false);
      expect(r.reason).toBe("no-numbered-frs");
    },
  );

  test("an empty file is not reported as missing FRs (nothing was written yet)", () => {
    const r = evaluateDepthBudget(writeRequirements(""), "Minimal");
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("empty");
  });
});

// ===========================================================================
// 3. readRecordDepth — how the dispatcher learns the depth to pass in
// ===========================================================================

describe("t488 readRecordDepth", () => {
  // A distinct record per call: reusing one directory would leave an earlier
  // case's amadeus-state.md in place, so a "no state" case could read the
  // previous case's Depth and pass for the wrong reason.
  let recordSeq = 0;
  function seedRecord(depthLine: string | null): string {
    recordSeq += 1;
    const record = join(tmp, "amadeus", "spaces", "default", "intents", `260808-x-${recordSeq}`);
    const stageDir = join(record, "inception", "requirements-analysis");
    mkdirSync(stageDir, { recursive: true });
    if (depthLine !== null) {
      writeFileSync(join(record, "amadeus-state.md"), `# State\n\n## Scope Configuration\n\n${depthLine}\n`);
    }
    const out = join(stageDir, "requirements.md");
    writeFileSync(out, requirements(1, 100));
    return out;
  }

  test("walks up from the output path to the record state", () => {
    expect(readRecordDepth(seedRecord("- **Depth**: Standard"), tmp)).toBe("Standard");
  });

  test("normalizes a hand-edited lowercase value", () => {
    expect(readRecordDepth(seedRecord("- **Depth**: comprehensive"), tmp)).toBe("Comprehensive");
  });

  test("no state, no Depth field, and an unrecognizable value each yield undefined", () => {
    expect(readRecordDepth(seedRecord(null), tmp)).toBeUndefined();
    expect(readRecordDepth(seedRecord("- **Scope**: fix"), tmp)).toBeUndefined();
    expect(readRecordDepth(seedRecord("- **Depth**: banana"), tmp)).toBeUndefined();
  });

  test("the NEAREST state file is the authority — no climbing past it", () => {
    // An ancestor with a valid Depth above a record whose own state carries
    // none. Continuing the walk would measure this artifact against a ceiling
    // from a different workflow, so the nearest state's silence must win.
    const outer = join(tmp, "outer");
    mkdirSync(outer, { recursive: true });
    writeFileSync(join(outer, "amadeus-state.md"), "- **Depth**: Comprehensive\n");
    const record = join(outer, "intents", "260808-nodepth");
    const stageDir = join(record, "inception", "requirements-analysis");
    mkdirSync(stageDir, { recursive: true });
    writeFileSync(join(record, "amadeus-state.md"), "# State\n\n- **Scope**: fix\n");
    const out = join(stageDir, "requirements.md");
    writeFileSync(out, requirements(1, 100));
    expect(readRecordDepth(out, tmp)).toBeUndefined();
  });

  test("an output path OUTSIDE the project resolves nothing", () => {
    // The bound is not just a stopping point for an inside walk: a path from
    // elsewhere must not be measured against whatever state sits above IT.
    const foreign = mkdtempSync(join(tmpdir(), "amadeus-t488-foreign-"));
    try {
      const stageDir = join(foreign, "inception", "requirements-analysis");
      mkdirSync(stageDir, { recursive: true });
      writeFileSync(join(foreign, "amadeus-state.md"), "- **Depth**: Comprehensive\n");
      const out = join(stageDir, "requirements.md");
      writeFileSync(out, requirements(1, 100));
      // Read against ITS own root it resolves, proving the fixture is sound...
      expect(readRecordDepth(out, foreign)).toBe("Comprehensive");
      // ...but read against an unrelated projectDir it must resolve nothing.
      expect(readRecordDepth(out, tmp)).toBeUndefined();
    } finally {
      rmSync(foreign, { recursive: true, force: true });
    }
  });

  test("stops at the project root rather than escaping to an ancestor state", () => {
    // A state file ABOVE the project root must not be consulted: the walk is
    // bounded, or a developer's own workspace state could leak into a test run.
    const out = seedRecord(null);
    writeFileSync(join(tmp, "..", `t488-escape-${process.pid}.md`), "- **Depth**: Comprehensive\n");
    expect(readRecordDepth(out, tmp)).toBeUndefined();
    rmSync(join(tmp, "..", `t488-escape-${process.pid}.md`), { force: true });
  });

  test("the dispatcher arm turns a resolved depth into the --depth flag", () => {
    const out = seedRecord("- **Depth**: Standard");
    expect(depthBudgetArgs("depth-budget", out, tmp)).toEqual(["--depth", "Standard"]);
  });

  test("the dispatcher arm is silent for other sensors and for an unresolved depth", () => {
    const withDepth = seedRecord("- **Depth**: Standard");
    // Another sensor's fire must not pick up the flag...
    expect(depthBudgetArgs("required-sections", withDepth, tmp)).toEqual([]);
    // ...and an unresolvable depth omits it, leaving the sensor fail-open.
    expect(depthBudgetArgs("depth-budget", seedRecord(null), tmp)).toEqual([]);
  });

  test("a state path that is not a file yields undefined rather than throwing", () => {
    const record = join(tmp, "amadeus", "spaces", "default", "intents", "260808-notafile");
    const stageDir = join(record, "inception", "requirements-analysis");
    mkdirSync(join(record, "amadeus-state.md"), { recursive: true });
    mkdirSync(stageDir, { recursive: true });
    const out = join(stageDir, "requirements.md");
    writeFileSync(out, requirements(1, 100));
    expect(readRecordDepth(out, tmp)).toBeUndefined();
  });

  test.skipIf(isRoot)("an UNREADABLE record state still stops the walk — no ancestor answers for it", () => {
    // The nearest-state rule holds even when the nearest state cannot be read:
    // it is still this record's state. Climbing past it would measure the
    // artifact against an ancestor's ceiling on the strength of a permission
    // error, which is exactly the wrong-workflow measurement being prevented.
    const outer = join(tmp, "outer-unreadable");
    mkdirSync(outer, { recursive: true });
    writeFileSync(join(outer, "amadeus-state.md"), "- **Depth**: Comprehensive\n");
    const record = join(outer, "intents", "260808-unreadable-inner");
    const stageDir = join(record, "inception", "requirements-analysis");
    mkdirSync(stageDir, { recursive: true });
    const state = join(record, "amadeus-state.md");
    writeFileSync(state, "- **Depth**: Minimal\n");
    chmodSync(state, 0o000);
    try {
      const out = join(stageDir, "requirements.md");
      writeFileSync(out, requirements(1, 100));
      expect(readRecordDepth(out, tmp)).toBeUndefined();
    } finally {
      chmodSync(state, 0o600);
    }
  });

  test.skipIf(isRoot)("a state file that cannot be READ yields undefined rather than throwing", () => {
    // Distinct from the case above: here the path IS a regular file, so the
    // walk gets past the isFile guard and the read itself fails. Without the
    // catch, an unreadable state would take the whole sensor down instead of
    // leaving it fail-open. chmod 000 yields EACCES for a non-root process; the
    // isRoot guard above keeps this case off the one environment where mode
    // bits do not apply.
    const record = join(tmp, "amadeus", "spaces", "default", "intents", "260808-unreadable");
    const stageDir = join(record, "inception", "requirements-analysis");
    mkdirSync(stageDir, { recursive: true });
    const state = join(record, "amadeus-state.md");
    writeFileSync(state, "- **Depth**: Standard\n");
    chmodSync(state, 0o000);
    try {
      expect(() => readFileSync(state, "utf-8")).toThrow();
      const out = join(stageDir, "requirements.md");
      writeFileSync(out, requirements(1, 100));
      expect(readRecordDepth(out, tmp)).toBeUndefined();
    } finally {
      // Restore so the afterEach cleanup can remove the tree.
      chmodSync(state, 0o600);
    }
  });
});

// ===========================================================================
// 4. The CLI contract — advisory means exit 0 on BOTH verdicts
// ===========================================================================

describe("t488 CLI contract", () => {
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

  test("a within-budget artifact exits 0 with a JSON verdict", () => {
    const p = writeRequirements(requirements(6, 400));
    const { code, stdout } = run(["--stage", "requirements-analysis", "--output-path", p, "--depth", "Minimal"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, findings_count: 0 });
  });

  test("an over-budget artifact ALSO exits 0 — the verdict is data, not enforcement", () => {
    const p = writeRequirements(requirements(1, 3000));
    const { code, stdout } = run(["--stage", "requirements-analysis", "--output-path", p, "--depth", "Minimal"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: false, findings_count: 1 });
  });

  test("--depth is optional; without it the sensor passes fail-open", () => {
    const p = writeRequirements(requirements(1, 9000));
    const { code, stdout } = run(["--stage", "requirements-analysis", "--output-path", p]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, reason: "no-depth" });
  });

  // #2741 revised this contract explicitly. It previously read "a missing flag
  // is the only exit-1 path" — true then, and the reason a MALFORMED flag was
  // fail-open: `--depth` with no value produced the same exit-0, no-depth
  // measurement as omitting `--depth` entirely, so a typo was indistinguishable
  // from a deliberate reading. A missing flag is still exit 1; it is no longer
  // the ONLY one. The two malformed-value arms are pinned across every
  // per-sensor CLI in t521; the two cases below keep this file's own coverage of
  // the arm that reaches them.
  test("a missing OR malformed flag exits 1, and it names the flag", () => {
    const missingOutput = run(["--stage", "requirements-analysis"]);
    expect(missingOutput.code).toBe(1);
    expect(missingOutput.stderr).toContain("--output-path is required");

    const missingStage = run(["--output-path", writeRequirements(requirements(1, 100))]);
    expect(missingStage.code).toBe(1);
    expect(missingStage.stderr).toContain("--stage is required");

    // Arm 1 — the flag is last, so no value follows it at all.
    const danglingDepth = run([
      "--stage",
      "requirements-analysis",
      "--output-path",
      writeRequirements(requirements(1, 100)),
      "--depth",
    ]);
    expect(danglingDepth.code).toBe(1);
    expect(danglingDepth.stderr).toContain("--depth expects a value, got end of arguments.");

    // Arm 2 — the NEXT FLAG would have been swallowed as the value.
    const stolenValue = run(["--stage", "requirements-analysis", "--output-path", "--depth", "Minimal"]);
    expect(stolenValue.code).toBe(1);
    expect(stolenValue.stderr).toContain('--output-path expects a value, got another flag: "--depth".');
  });
});
