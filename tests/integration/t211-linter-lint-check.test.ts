// Two-stage detection contract of the `linter` sensor script (Issue #847,
// re-grounding of #538). Guards that a workspace declaring a `lint:check` npm
// script drives its OWN linter (any harness — Biome here) instead of the
// eslint-only fallback that silently quiet-PASSed on Biome repos.
//
// HERMETIC (t92 #819/#862 posture): NO real eslint / real linter is ever
// spawned. The `lint:check` tier is exercised with a stub package.json script
// (`exit 1` / `exit 0`) driven through `bun run`, so tier-1 is proven with zero
// real-linter dependency. The tool module is imported IN-PROCESS (not spawned)
// so the added seams are counted for coverage — the `import.meta.main` guard
// keeps `main()` from auto-running on import. main() is driven in-process by
// overriding process.argv and intercepting process.exit.
//
// Mechanism = none (in-process import; the module path appears only in the
// stripped import line, and this file spawns no shipped CLI itself).

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { spawnSync } from "node:child_process";
import {
  buildLintScriptOutput,
  detectLintScript,
  main,
  maybeRunLintTier,
  runLintScript,
} from "../../dist/claude/.claude/tools/amadeus-sensor-linter.ts";

const tempDirs: string[] = [];
afterEach(() => {
  for (const d of tempDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Fresh temp project with a package.json (optional lint:check) and a .ts file. */
function makeProject(lintCheck: string | null): { root: string; file: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t211-"));
  tempDirs.push(root);
  const pkg: { name: string; scripts?: Record<string, string> } = { name: "t211-fixture" };
  if (lintCheck !== null) pkg.scripts = { "lint:check": lintCheck };
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg), "utf-8");
  const file = join(root, "code.ts");
  writeFileSync(file, "export const x = 1;\n", "utf-8");
  return { root, file };
}

/**
 * Drive the tool's main() in-process against a fixture. Overrides process.argv
 * and intercepts process.exit (which main() calls to terminate) so the run
 * returns control to the test. Captures process.stdout.write. Fully restored
 * in finally.
 */
class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function runMain(file: string): { exitCode: number; stdout: string } {
  const origArgv = process.argv;
  const origExit = process.exit.bind(process);
  const origWrite = process.stdout.write.bind(process.stdout);
  let stdout = "";
  let exitCode = -1;
  process.argv = [origArgv[0], "amadeus-sensor-linter.ts", "--stage", "code-generation", "--file-path", file];
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    main();
  } catch (e) {
    if (e instanceof ExitSignal) exitCode = e.code;
    else throw e;
  } finally {
    process.argv = origArgv;
    process.exit = origExit;
    process.stdout.write = origWrite;
  }
  return { exitCode, stdout };
}

describe("t211: linter sensor lint:check tier (Issue #847)", () => {
  // (a) declared + violation -> FAILED. This is the falling case: the pre-fix
  // eslint-only sensor quiet-PASSed here (127 on a Biome repo). Now the
  // declared lint:check (stub `exit 1`) produces a real error-severity finding.
  test("declared lint:check + violation -> pass:false, findings 1", () => {
    const { file } = makeProject("exit 1");
    const { exitCode, stdout } = runMain(file);
    expect(exitCode).toBe(0); // sensor-run success; verdict rides in JSON
    const out = JSON.parse(stdout);
    expect(out.pass).toBe(false);
    expect(out.findings_count).toBe(1);
    expect(out.errorCount).toBe(1);
    expect(out.violations).toHaveLength(1);
    expect(out.violations[0].rule).toBe("lint:check");
    expect(out.violations[0].severity).toBe("error");
  });

  // (b) declared + clean -> PASSED.
  test("declared lint:check + no violation -> pass:true, findings 0", () => {
    const { file } = makeProject("exit 0");
    const { exitCode, stdout } = runMain(file);
    expect(exitCode).toBe(0);
    const out = JSON.parse(stdout);
    expect(out.pass).toBe(true);
    expect(out.findings_count).toBe(0);
    expect(out.errorCount).toBe(0);
    expect(out.violations).toHaveLength(0);
  });

  // (c) NOT declared -> tier-1 bypassed, falls through to the eslint tier
  // (unchanged legacy path; its own coverage lives in t92 case 11 / e2e).
  // Asserted at the seam (no real eslint spawn here).
  test("no lint:check declared -> detectLintScript false (eslint tier preserved)", () => {
    const { root } = makeProject(null);
    expect(detectLintScript(root)).toBe(false);
    expect(maybeRunLintTier(root, join(root, "code.ts"))).toBeNull();
  });

  // (d) unreadable / missing package.json -> false (catch branch).
  test("missing package.json -> detectLintScript false", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t211-nopkg-"));
    tempDirs.push(root);
    expect(detectLintScript(root)).toBe(false);
  });

  // (e) spawn failure (status null: signal / timeout) -> conservative
  // tool-unavailable (exit 127), same as the eslint tier. Injected fake spawn.
  test("lint:check spawn failure (status null) -> exitCode 127", () => {
    const fake = (() => ({ status: null, stdout: "", stderr: "" })) as unknown as typeof spawnSync;
    const r = runLintScript("/nonexistent-root", "code.ts", fake);
    expect(r.exitCode).toBe(127);
    expect(r.stdout).toBe("");
  });

  // buildLintScriptOutput: empty diagnostic output falls back to a synthetic
  // message carrying the exit code.
  test("buildLintScriptOutput: empty output falls back to exit-code message", () => {
    const out = buildLintScriptOutput(3, "", "", "code.ts");
    expect(out.pass).toBe(false);
    expect(out.violations[0].message).toBe("lint:check exited 3");
  });
});
