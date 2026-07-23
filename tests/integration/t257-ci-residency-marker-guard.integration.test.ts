// t257 — CI-residency marker guard (#1294 NFR-1, regression guard).
// Layer: integration (readdir/readFileSync over the whole tests/ tree —
// classifyTestSize = medium; fs-tests-integration-first).
//
// The defect this guards (Issue #1294): a test file whose header CLAIMS to be a
// standing/CI-resident proof, yet lives in tests/e2e/ — which --ci
// (smoke+unit+integration, run-tests.ts) never runs. The claim is then theatre:
// the "standing proof" never executes on a PR. The size-purity guard
// (t-test-size-drift) does NOT catch this — e2e permits large/spawn tests, so a
// misplaced CI-resident test passes size purity while never running in CI.
//
// THE CHECK (write⇔check symmetry): every test file that carries the
// `CI-resident` marker MUST live in a scope that --ci executes (smoke, unit, or
// integration), never e2e. The marker is a promise; this scan is the check.
//
// Falling-proof (NFR-1 / Mandated): the predicate self-test below asserts a
// synthetic e2e path bearing the marker is flagged, and the PR includes an
// external run where the marker is injected into a real tests/e2e/ file, this
// suite turns red, then green once reverted.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Built at runtime so this guard's own source does not embed the literal marker.
const MARKER = `CI-${"resident"}`;

// Scopes that --ci executes (run-tests.ts: smoke + unit + integration). A
// CI-resident claim is only honest in one of these; e2e is excluded from --ci.
const CI_SCOPES = new Set(["smoke", "unit", "integration"]);

function scopeOf(relPath: string): string {
  const scope = relPath.split("/")[1];
  return scope ?? "other";
}

function allTestFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "logs") continue;
      out.push(...allTestFiles(p));
    } else if (entry.name.endsWith(".test.ts")) {
      out.push(p);
    }
  }
  return out;
}

// The offender predicate: a file that claims CI residency but lives outside the
// --ci scopes. Pure over (relPath, body) so the self-test can exercise it on a
// synthetic path without touching disk.
function claimsButNotCiResident(relPath: string, body: string): boolean {
  if (!body.includes(MARKER)) return false;
  return !CI_SCOPES.has(scopeOf(relPath));
}

describe("CI-residency marker guard — claim must live where --ci runs", () => {
  test("no test file claims CI residency from a scope --ci does not execute", () => {
    const offenders: string[] = [];
    for (const abs of allTestFiles(TESTS_ROOT)) {
      const rel = abs.slice(TESTS_ROOT.length - "tests".length);
      const body = readFileSync(abs, "utf-8");
      if (claimsButNotCiResident(rel, body)) {
        offenders.push(`${rel}: claims CI-resident but scope=${scopeOf(rel)} is not in --ci`);
      }
    }
    expect(offenders.sort()).toEqual([]);
  });

  test("predicate flags a marker-bearing e2e file and clears a --ci scope (falling-proof)", () => {
    const body = `// ${MARKER} claim\n`;
    expect(claimsButNotCiResident("tests/e2e/t-fake.test.ts", body)).toBe(true);
    expect(claimsButNotCiResident("tests/integration/t-fake.test.ts", body)).toBe(false);
    expect(claimsButNotCiResident("tests/e2e/t-fake.test.ts", "// no claim\n")).toBe(false);
  });
});
