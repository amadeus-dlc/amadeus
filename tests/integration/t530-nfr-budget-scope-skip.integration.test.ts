// covers: file:packages/framework/core/tools/amadeus-sensor-nfr-budget.ts,
//         file:packages/framework/core/amadeus-common/stages/construction/nfr-design.md
// size: medium
//
// #2773 — a scope that SKIPs nfr-requirements while EXECUTing nfr-design
// (self-feature is the only one today) left the nfr-budget sensor with no
// denominator it could ever obtain: the ids live in a stage the scope never
// runs. The sensor read that as `missing-nfr-ids` and reported every
// nfr-design artifact of every post-cutoff record born under such a scope —
// a finding no artifact content can clear.
//
// The signal the engine already carries for this is the scope grid: the
// EXECUTE/SKIP matrix that decides which stages run. When the grid says this
// record's scope SKIPs nfr-requirements, the absence of declared ids is the
// scope's own doing and not an omission by the unit.
//
// Both sides are pinned here:
//
//   - the omission is recognised (no missing-nfr-ids for an nfr-design
//     artifact of a SKIP-scope record), and
//   - nothing else moves: a scope that EXECUTEs nfr-requirements keeps the
//     finding, an unresolvable scope keeps it (fail-closed on the reported
//     side), the pre-cutoff cohort stays fail-open, and an nfr-requirements
//     artifact is never excused by the grid.
//
// Touches a real filesystem (fixture records and a fixture grid), hence the
// integration tier (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NFR_ID_CONTRACT_LANDED,
  evaluateNfrBudget,
} from "../../packages/framework/core/tools/amadeus-sensor-nfr-budget.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAGES_DIR = join(REPO_ROOT, "packages/framework/core/amadeus-common/stages/construction");

const POST_CUTOFF = "2026-08-09T04:00:00Z";
const PRE_CUTOFF = "2026-08-09T03:47:45Z";
const NO_IDS = "## Design\n\nprose with no declared identifier.\n";

let tmp = "";
let previousGrid: string | undefined;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "amadeus-t530-"));
  previousGrid = process.env.AMADEUS_SCOPE_GRID;
});
afterEach(() => {
  if (previousGrid === undefined) delete process.env.AMADEUS_SCOPE_GRID;
  else process.env.AMADEUS_SCOPE_GRID = previousGrid;
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

/** A record whose state names `scope` (or none, when undefined) and whose audit
 *  shard carries `birth` — the two inputs the suppression reads. */
function record(scope: string | undefined, birth: string): string {
  const root = join(tmp, "260810-fixture");
  mkdirSync(join(root, "audit"), { recursive: true });
  const scopeLine = scope === undefined ? "" : `- **Scope**: ${scope}\n`;
  writeFileSync(join(root, "amadeus-state.md"), `- **Depth**: Standard\n${scopeLine}`);
  writeFileSync(
    join(root, "audit", "clone.jsonl"),
    `${JSON.stringify({ schemaVersion: 1, seq: 1, timestamp: birth, event: "WORKFLOW_STARTED", fields: {} })}\n`,
  );
  return root;
}

function writeArtifact(root: string, stage: string, artifact: string, body: string): string {
  const dir = join(root, "construction", "u1", stage);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${artifact}.md`);
  writeFileSync(path, body);
  return path;
}

/** A compiled grid on disk, pointed at through the same AMADEUS_SCOPE_GRID seam
 *  amadeus-graph.ts reads. */
function useGrid(grid: Record<string, { stages: Record<string, string> }>): void {
  const path = join(tmp, "scope-grid.json");
  writeFileSync(path, `${JSON.stringify(grid, null, 2)}\n`);
  process.env.AMADEUS_SCOPE_GRID = path;
}

const SKIP_SCOPE = { "skip-upstream": { stages: { "nfr-requirements": "SKIP", "nfr-design": "EXECUTE" } } };
const EXECUTE_SCOPE = { "runs-upstream": { stages: { "nfr-requirements": "EXECUTE", "nfr-design": "EXECUTE" } } };

describe("t530 an intentionally skipped nfr-requirements is not a missing id contract", () => {
  test("a design artifact of a SKIP-scope record is not reported", () => {
    useGrid(SKIP_SCOPE);
    const root = record("skip-upstream", POST_CUTOFF);
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.reason).toBe("upstream-omitted");
    expect(result.pass).toBe(true);
    expect(result.findings_count).toBe(0);
    // The cohort is unchanged — the record IS under the contract; what changed
    // is that the contract has no upstream stage to be met in.
    expect(result.under_id_contract).toBe(true);
    expect(result.unit_nfr_count).toBe(0);
  });

  test("a scope that EXECUTEs nfr-requirements keeps the finding", () => {
    useGrid(EXECUTE_SCOPE);
    const root = record("runs-upstream", POST_CUTOFF);
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.reason).toBe("missing-nfr-ids");
    expect(result.pass).toBe(false);
  });

  test("an nfr-requirements artifact is never excused by the grid", () => {
    // The grid says the stage is skipped, yet its artifact is on disk with no
    // ids. Whatever produced it was under the contract, so the finding stands:
    // the suppression answers for the CITING stage's missing denominator only.
    useGrid(SKIP_SCOPE);
    const root = record("skip-upstream", POST_CUTOFF);
    const path = writeArtifact(root, "nfr-requirements", "performance-requirements", NO_IDS);
    expect(evaluateNfrBudget(path).reason).toBe("missing-nfr-ids");
  });

  test("a state file with no Scope keeps the finding", () => {
    useGrid(SKIP_SCOPE);
    const root = record(undefined, POST_CUTOFF);
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    expect(evaluateNfrBudget(path).reason).toBe("missing-nfr-ids");
  });

  test("a scope the grid does not name keeps the finding", () => {
    useGrid(SKIP_SCOPE);
    const root = record("some-composed-scope", POST_CUTOFF);
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    expect(evaluateNfrBudget(path).reason).toBe("missing-nfr-ids");
  });

  test("an unreadable grid keeps the finding", () => {
    process.env.AMADEUS_SCOPE_GRID = join(tmp, "absent-grid.json");
    const root = record("skip-upstream", POST_CUTOFF);
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    expect(evaluateNfrBudget(path).reason).toBe("missing-nfr-ids");
  });

  test("a grid row with no stages map keeps the finding", () => {
    // Malformed shapes answer "cannot decide" exactly as an absent grid does —
    // the suppression only fires on a positive SKIP it can read.
    writeFileSync(join(tmp, "shapeless.json"), '{"skip-upstream": {"note": "no stages here"}}\n');
    process.env.AMADEUS_SCOPE_GRID = join(tmp, "shapeless.json");
    const root = record("skip-upstream", POST_CUTOFF);
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    expect(evaluateNfrBudget(path).reason).toBe("missing-nfr-ids");
  });

  test("a non-string cell keeps the finding", () => {
    writeFileSync(join(tmp, "odd-cell.json"), '{"skip-upstream": {"stages": {"nfr-requirements": null}}}\n');
    process.env.AMADEUS_SCOPE_GRID = join(tmp, "odd-cell.json");
    const root = record("skip-upstream", POST_CUTOFF);
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    expect(evaluateNfrBudget(path).reason).toBe("missing-nfr-ids");
  });

  test("the pre-cutoff cohort stays fail-open under the same scope", () => {
    // The cutoff is the outer gate: a record born before the id contract is
    // never reported, and the suppression does not relabel it either.
    useGrid(SKIP_SCOPE);
    const root = record("skip-upstream", PRE_CUTOFF);
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.under_id_contract).toBe(false);
    expect(result.reason).toBe("measured");
  });

  test("a SKIP-scope unit that does declare ids is measured normally", () => {
    // The suppression is about an ABSENT denominator, not about the scope: a
    // unit that carries nfr-requirements artifacts anyway is measured against
    // them exactly as any other unit is.
    useGrid(SKIP_SCOPE);
    const root = record("skip-upstream", POST_CUTOFF);
    writeArtifact(root, "nfr-requirements", "security-requirements", "### SEC-1: keep secrets out\n\nno token.\n");
    const path = writeArtifact(root, "nfr-design", "performance-design", NO_IDS);
    const result = evaluateNfrBudget(path);
    expect(result.unit_nfr_count).toBe(1);
    expect(result.reason).toBe("measured");
  });
});

describe("t530 the stage frontmatter carries the scope asymmetry this answers", () => {
  test("nfr-design names self-feature and nfr-requirements does not", () => {
    // The live condition #2773 was filed about. `scopes:` frontmatter is the
    // sole source of the EXECUTE/SKIP grid (amadeus-graph.ts transposeScopeGrid),
    // so this asymmetry IS the skipped-upstream case in the shipped tree.
    const scopesOf = (stage: string): string[] => {
      const body = readFileSync(join(STAGES_DIR, `${stage}.md`), "utf-8");
      const block = body.split("\nscopes:\n")[1] ?? "";
      const out: string[] = [];
      for (const line of block.split("\n")) {
        const entry = line.match(/^\s+-\s+(\S+)\s*$/);
        if (entry === null) break;
        out.push(entry[1] as string);
      }
      return out;
    };
    expect(scopesOf("nfr-design")).toContain("self-feature");
    expect(scopesOf("nfr-requirements")).not.toContain("self-feature");
  });

  test("the cutoff constant is the one the suppression is gated behind", () => {
    expect(Date.parse(NFR_ID_CONTRACT_LANDED)).toBeLessThan(Date.parse(POST_CUTOFF));
    expect(Date.parse(NFR_ID_CONTRACT_LANDED)).toBeGreaterThan(Date.parse(PRE_CUTOFF));
  });
});
