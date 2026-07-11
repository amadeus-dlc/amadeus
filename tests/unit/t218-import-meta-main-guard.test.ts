// t218 — #846: import.meta.main guard for amadeus-sensor-required-sections,
// amadeus-sensor-upstream-coverage, and amadeus-validate.
//
// THE BUG (#846): the three tools called a bare, unconditional `main()` at
// module top level, so importing the module fired the CLI (parseFlags on the
// caller's argv → process.exit / stderr). That made an in-process seam
// structurally impossible and risked side effects on an accidental import.
//
// THE FIX (contract-equivalent to archive 657dc9267 / #507): wrap the entry in
// `if (import.meta.main) main();` and export `main(argv = process.argv.slice(2))`
// so tests drive it in-process (seam-export-handler-amend).
//
// Modules are imported from dist/claude (the shipped artifact the dispatcher
// runs and the same seam t-sensor-fire-seam / t86 use); codecov.yml remaps the
// dist path back to packages/framework/core for patch coverage.
//
// COVERAGE NOTE. The guard line `if (import.meta.main) main();` is exercised at
// import time (import.meta.main is false in the test module, so the condition
// evaluates and the line is hit); the exported `main` body is driven by the
// happy-path tests below.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { main as requiredSectionsMain } from "../../dist/claude/.claude/tools/amadeus-sensor-required-sections.ts";
import { main as upstreamCoverageMain } from "../../dist/claude/.claude/tools/amadeus-sensor-upstream-coverage.ts";
import { main as validateMain } from "../../dist/claude/.claude/tools/amadeus-validate.ts";

const DIST_TOOLS = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
);

const TOOLS = [
  "amadeus-sensor-required-sections.ts",
  "amadeus-sensor-upstream-coverage.ts",
  "amadeus-validate.ts",
] as const;

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit(${code})`);
  }
}

// Drive an exported main/handler in-process: intercept process.exit (a CLI tool
// terminates the process, which would kill the test runner) and swallow the
// stdout/stderr the JSON emitters write. Returns the exit code, or 0 when the
// function returns without calling process.exit.
function drive(fn: () => void): number {
  const origExit = process.exit.bind(process);
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  process.stdout.write = (() => true) as typeof process.stdout.write;
  process.stderr.write = (() => true) as typeof process.stderr.write;
  let status = 0;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  return status;
}

// (i) Import side effect: importing the module must NOT fire the CLI. Probed in
// a child process (a clean import graph) so it is independent of this file's own
// static imports. Pre-fix (bare `main()`) the import fires main() → non-zero
// exit + stderr; post-fix the guard keeps it silent.
describe("#846 — importing the module fires no CLI (subprocess probe)", () => {
  for (const tool of TOOLS) {
    test(`import ${tool} → exit 0, no stdout, no stderr`, () => {
      const modPath = join(DIST_TOOLS, tool);
      const res = spawnSync(
        process.execPath,
        ["-e", `await import(${JSON.stringify(modPath)});`],
        { encoding: "utf-8", env: { ...process.env } },
      );
      expect(res.status).toBe(0);
      expect(res.stdout).toBe("");
      expect(res.stderr).toBe("");
    });
  }
});

// (ii) Exported main driven in-process on the happy path.
describe("#846 — exported main() drives in-process", () => {
  let dir: string;

  function tmpArtifact(name: string, body: string): string {
    dir = mkdtempSync(join(tmpdir(), "t218-"));
    const p = join(dir, name);
    writeFileSync(p, body, "utf-8");
    return p;
  }

  test("required-sections main([--output-path]) exits 0 on a >=2-H2 doc", () => {
    const p = tmpArtifact("rs.md", "# Title\n\n## Alpha\n\n## Beta\n");
    expect(drive(() => requiredSectionsMain(["--output-path", p]))).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });

  test("upstream-coverage main([--output-path]) exits 0 when no upstream", () => {
    const p = tmpArtifact("uc.md", "# Title\n\n## Alpha\n");
    expect(drive(() => upstreamCoverageMain(["--output-path", p]))).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });

  test("validate main([outputs, construction]) returns without exit", () => {
    // handleOutputs writes JSON via jsonSuccess and returns (no process.exit),
    // so drive observes status 0.
    expect(drive(() => validateMain(["outputs", "construction"]))).toBe(0);
  });
});

// (iii) Spawn non-regression: the shipped CLI behaviour is unchanged.
describe("#846 — spawn CLI non-regression", () => {
  let dir: string;

  function tmpArtifact(name: string, body: string): string {
    dir = mkdtempSync(join(tmpdir(), "t218-spawn-"));
    const p = join(dir, name);
    writeFileSync(p, body, "utf-8");
    return p;
  }

  test("required-sections spawned exits 0 and reports pass", () => {
    const p = tmpArtifact("rs.md", "# Title\n\n## Alpha\n\n## Beta\n");
    const res = spawnSync(
      process.execPath,
      [join(DIST_TOOLS, "amadeus-sensor-required-sections.ts"), "--output-path", p],
      { encoding: "utf-8", env: { ...process.env } },
    );
    rmSync(dir, { recursive: true, force: true });
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout).pass).toBe(true);
  });

  test("upstream-coverage spawned exits 0 and reports pass", () => {
    const p = tmpArtifact("uc.md", "# Title\n\n## Alpha\n");
    const res = spawnSync(
      process.execPath,
      [join(DIST_TOOLS, "amadeus-sensor-upstream-coverage.ts"), "--output-path", p],
      { encoding: "utf-8", env: { ...process.env } },
    );
    rmSync(dir, { recursive: true, force: true });
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout).pass).toBe(true);
  });

  test("validate spawned exits 0 and reports pass", () => {
    const res = spawnSync(
      process.execPath,
      [join(DIST_TOOLS, "amadeus-validate.ts"), "outputs", "construction"],
      { encoding: "utf-8", env: { ...process.env } },
    );
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout).pass).toBe(true);
  });
});
