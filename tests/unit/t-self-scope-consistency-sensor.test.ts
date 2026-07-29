import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateSelfScopeConsistency } from "../../packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts";

const HARNESSES = [".claude", ".codex", ".cursor", ".opencode", ".kimi-code"];
const SCOPES = ["self-document", "self-feature", "self-fix", "self-refactor"];
const roots: string[] = [];

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-self-scope-sensor-"));
  roots.push(root);
  return root;
}

function seedHarness(root: string, harness: string, gridScopes = SCOPES): void {
  const scopesDir = join(root, harness, "scopes");
  const dataDir = join(root, harness, "tools", "data");
  mkdirSync(scopesDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  for (const scope of SCOPES) {
    writeFileSync(
      join(scopesDir, `amadeus-${scope}.md`),
      `---\nname: ${scope}\n---\n`,
    );
  }
  const grid = Object.fromEntries(gridScopes.map((scope) => [scope, { stages: {} }]));
  writeFileSync(join(dataDir, "scope-grid.json"), `${JSON.stringify(grid)}\n`);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("self-scope-consistency sensor", () => {
  test("stays dormant outside Amadeus self-development", () => {
    expect(evaluateSelfScopeConsistency(fixtureRoot())).toEqual({
      pass: true,
      findings_count: 0,
      findings: [],
      skipped: "no-self-scopes",
    });
  });

  test("passes when all five dogfood harnesses expose the canonical self scopes", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) seedHarness(root, harness);
    expect(evaluateSelfScopeConsistency(root).pass).toBe(true);
  });

  test("reports a scope file and scope-grid mismatch", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) {
      seedHarness(
        root,
        harness,
        harness === ".codex" ? SCOPES.filter((scope) => scope !== "self-fix") : SCOPES,
      );
    }
    const result = evaluateSelfScopeConsistency(root);
    expect(result.pass).toBe(false);
    expect(result.findings).toContainEqual({
      harness: ".codex",
      surface: "scope-grid",
      reason: "missing",
      scope: "self-fix",
      path: join(root, ".codex", "tools", "data", "scope-grid.json"),
    });
  });

  test("rejects a removed amadeus-amadeus-* compatibility surface", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) seedHarness(root, harness);
    writeFileSync(
      join(root, ".claude", "scopes", "amadeus-amadeus-fix.md"),
      "---\nname: amadeus-fix\n---\n",
    );
    const result = evaluateSelfScopeConsistency(root);
    expect(result.pass).toBe(false);
    expect(result.findings.some(
      (finding) =>
        finding.harness === ".claude" &&
        finding.reason === "unexpected" &&
        finding.scope === "amadeus-fix",
    )).toBe(true);
  });
});
