import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_SELF_SCOPES,
  SELF_HARNESSES,
  evaluateSelfScopeConsistency,
  main,
} from "../../packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts";

const HARNESSES: readonly string[] = SELF_HARNESSES;
const SCOPES: readonly string[] = EXPECTED_SELF_SCOPES;
const roots: string[] = [];

// Cells every face shares — the intersection the parity invariant ranges over.
const SHARED_STAGES: Readonly<Record<string, string>> = {
  "intent-capture": "EXECUTE",
  feasibility: "SKIP",
  "requirements-analysis": "EXECUTE",
  "code-generation": "EXECUTE",
};
// Present on the canonical face alone, mirroring the real per-face plugin
// composition (`self-feature.pr-convergence` on .claude only). Every
// fixture carries it, so each passing case doubles as a negative control that
// face-local stage keys never enter the comparison.
const FACE_LOCAL_STAGE = "pr-convergence";
const CANONICAL_FACE = ".claude";

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-self-scope-sensor-"));
  roots.push(root);
  return root;
}

function scopeBody(scope: string): string {
  return `---\nname: ${scope}\n---\n\n# ${scope}\n\nShared prose for ${scope}.\n`;
}

interface SeedOverrides {
  readonly gridScopes?: readonly string[];
  /** scope -> stage -> cell value, layered over SHARED_STAGES. */
  readonly cells?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** scope -> full file body, replacing scopeBody(). */
  readonly bodies?: Readonly<Record<string, string>>;
}

function seedHarness(root: string, harness: string, overrides: SeedOverrides = {}): void {
  const scopesDir = join(root, harness, "scopes");
  const dataDir = join(root, harness, "tools", "data");
  mkdirSync(scopesDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  for (const scope of SCOPES) {
    writeFileSync(
      join(scopesDir, `amadeus-${scope}.md`),
      overrides.bodies?.[scope] ?? scopeBody(scope),
    );
  }
  const grid = Object.fromEntries(
    (overrides.gridScopes ?? SCOPES).map((scope) => [
      scope,
      {
        stages: {
          ...SHARED_STAGES,
          ...(harness === CANONICAL_FACE ? { [FACE_LOCAL_STAGE]: "EXECUTE" } : {}),
          ...(overrides.cells?.[scope] ?? {}),
        },
      },
    ]),
  );
  writeFileSync(join(dataDir, "scope-grid.json"), `${JSON.stringify(grid)}\n`);
}

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function runMain(root: string, argv: string[]): { code: number; stdout: string; stderr: string } {
  const originalExit = process.exit.bind(process);
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);
  const originalProjectDir = process.env.AMADEUS_PROJECT_DIR;
  let stdout = "";
  let stderr = "";
  let code = 0;
  process.env.AMADEUS_PROJECT_DIR = root;
  process.exit = ((value?: number): never => {
    throw new ExitSignal(value ?? 0);
  }) as typeof process.exit;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    main(argv);
  } catch (error) {
    if (error instanceof ExitSignal) code = error.code;
    else throw error;
  } finally {
    process.exit = originalExit;
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    if (originalProjectDir === undefined) delete process.env.AMADEUS_PROJECT_DIR;
    else process.env.AMADEUS_PROJECT_DIR = originalProjectDir;
  }
  return { code, stdout, stderr };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("self-scope-consistency sensor", () => {
  // #2363 — the scanned face set must cover every promoted dogfood surface.
  // Pi became a self-install face when promote-self started reflecting
  // dist/pi/.pi into the project root; a face the parity sensor does not scan
  // is a face whose scope grid can drift unobserved, which is exactly the
  // #2033 failure this sensor exists to catch.
  test("scans every promoted dogfood face", () => {
    expect([...SELF_HARNESSES]).toEqual([".claude", ".codex", ".cursor", ".opencode", ".kimi-code", ".pi"]);
  });

  test("stays dormant outside Amadeus self-development", () => {
    expect(evaluateSelfScopeConsistency(fixtureRoot())).toEqual({
      pass: true,
      findings_count: 0,
      findings: [],
      skipped: "no-self-scopes",
    });
  });

  test("passes when all six dogfood harnesses expose every promoted scope", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) seedHarness(root, harness);
    expect(evaluateSelfScopeConsistency(root).pass).toBe(true);
  });

  test("reports a scope file and scope-grid mismatch", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) {
      seedHarness(root, harness, {
        gridScopes: harness === ".codex" ? SCOPES.filter((scope) => scope !== "self-fix") : SCOPES,
      });
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

  test("reports malformed, unreadable, legacy, and extra scope surfaces", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) seedHarness(root, harness);

    const claudeScopes = join(root, ".claude", "scopes");
    writeFileSync(
      join(claudeScopes, "amadeus-self-feature.md"),
      "---\nname: wrong-name\n---\n",
    );
    rmSync(join(claudeScopes, "amadeus-self-fix.md"));
    mkdirSync(join(claudeScopes, "amadeus-self-fix.md"));
    writeFileSync(
      join(claudeScopes, "amadeus-self-extra.md"),
      "---\nname: self-extra\n---\n",
    );
    const gridPath = join(root, ".claude", "tools", "data", "scope-grid.json");
    const gridScopes = [...SCOPES, "self-extra", "amadeus-bugfix"];
    const grid = Object.fromEntries(gridScopes.map((scope) => [scope, { stages: {} }]));
    writeFileSync(gridPath, `${JSON.stringify(grid)}\n`);
    // A grid that EXISTS but cannot be parsed must surface as unreadable —
    // the existsSync guard only silences the not-yet-set-up (missing) case.
    const codexGridPath = join(root, ".codex", "tools", "data", "scope-grid.json");
    writeFileSync(codexGridPath, "{ not json\n");

    const result = evaluateSelfScopeConsistency(root);
    expect(result.findings).toContainEqual({
      harness: ".claude",
      surface: "scope-file",
      reason: "name-mismatch",
      scope: "self-feature",
      path: join(claudeScopes, "amadeus-self-feature.md"),
    });
    expect(result.findings).toContainEqual({
      harness: ".claude",
      surface: "scope-file",
      reason: "unreadable",
      scope: "self-fix",
      path: join(claudeScopes, "amadeus-self-fix.md"),
    });
    expect(result.findings).toContainEqual({
      harness: ".claude",
      surface: "scope-grid",
      reason: "unexpected",
      scope: "amadeus-bugfix",
      path: gridPath,
    });
    expect(result.findings).toContainEqual({
      harness: ".claude",
      surface: "scope-file",
      reason: "unexpected",
      scope: "self-extra",
      path: claudeScopes,
    });
    expect(result.findings).toContainEqual({
      harness: ".codex",
      surface: "scope-grid",
      reason: "unreadable",
      path: codexGridPath,
    });
  });

  test("reports a shared scope-grid cell that diverges on one face", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) {
      seedHarness(root, harness, {
        cells: harness === ".kimi-code" ? { "self-feature": { feasibility: "EXECUTE" } } : {},
      });
    }
    const result = evaluateSelfScopeConsistency(root);
    expect(result.pass).toBe(false);
    expect(result.findings).toContainEqual({
      harness: ".kimi-code",
      surface: "scope-grid",
      reason: "cell-mismatch",
      scope: "self-feature",
      stage: "feasibility",
      expected: "SKIP",
      actual: "EXECUTE",
      path: join(root, ".kimi-code", "tools", "data", "scope-grid.json"),
    });
    // The canonical face's face-local stage is absent from the other four, so
    // it falls outside the shared intersection and must never be reported.
    expect(
      result.findings.some((finding) => finding.stage === FACE_LOCAL_STAGE),
    ).toBe(false);
  });

  test("still reports cell divergence when another face is missing the scope row", () => {
    // A face that lacks the scope row entirely must not blank the shared-key
    // intersection for the faces that do carry it: the missing row and the
    // cell divergence are independent defects and both must surface.
    const root = fixtureRoot();
    for (const harness of HARNESSES) {
      seedHarness(root, harness, {
        gridScopes: harness === ".cursor" ? SCOPES.filter((s) => s !== "self-feature") : SCOPES,
        cells: harness === ".kimi-code" ? { "self-feature": { feasibility: "EXECUTE" } } : {},
      });
    }
    const result = evaluateSelfScopeConsistency(root);
    expect(result.pass).toBe(false);
    expect(result.findings).toContainEqual({
      harness: ".cursor",
      surface: "scope-grid",
      reason: "missing",
      scope: "self-feature",
      path: join(root, ".cursor", "tools", "data", "scope-grid.json"),
    });
    expect(result.findings).toContainEqual({
      harness: ".kimi-code",
      surface: "scope-grid",
      reason: "cell-mismatch",
      scope: "self-feature",
      stage: "feasibility",
      expected: "SKIP",
      actual: "EXECUTE",
      path: join(root, ".kimi-code", "tools", "data", "scope-grid.json"),
    });
  });

  test("reports scope prose that diverges on one face", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) {
      seedHarness(root, harness, {
        bodies:
          harness === ".opencode"
            ? { "self-refactor": "---\nname: self-refactor\n---\n\n# drifted\n" }
            : {},
      });
    }
    const result = evaluateSelfScopeConsistency(root);
    expect(result.pass).toBe(false);
    expect(result.findings).toContainEqual({
      harness: ".opencode",
      surface: "scope-file",
      reason: "body-mismatch",
      scope: "self-refactor",
      path: join(root, ".opencode", "scopes", "amadeus-self-refactor.md"),
    });
  });

  test("passes against this repository's five real self-install faces", () => {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    expect(evaluateSelfScopeConsistency(repoRoot)).toMatchObject({
      pass: true,
      findings_count: 0,
      findings: [],
      skipped: null,
    });
  });

  test("main validates required flags and emits the sensor result", () => {
    const root = fixtureRoot();
    for (const harness of HARNESSES) seedHarness(root, harness);

    const missingStage = runMain(root, []);
    expect(missingStage.code).toBe(1);
    expect(missingStage.stderr).toContain("--stage is required");

    const missingOutput = runMain(root, ["--stage", "code-generation"]);
    expect(missingOutput.code).toBe(1);
    expect(missingOutput.stderr).toContain("--output-path is required");

    const valid = runMain(root, [
      "--stage",
      "code-generation",
      "--output-path",
      "src/example.ts",
    ]);
    expect(valid.code).toBe(0);
    expect(JSON.parse(valid.stdout)).toMatchObject({ pass: true, findings_count: 0 });
  });
});
