// In-process coverage seam + spawn contract for #788: amadeus-runtime
// subcommand dispatch must resolve handlers by own-property only, so
// prototype-chain names (`constructor`, `toString`, `hasOwnProperty`) fall to
// the Unknown-subcommand exit-1 path instead of being invoked as handlers.
//
// SUBCOMMANDS and main() are non-exported / process.exit paths (spawn
// blindspot). resolveOwnHandler is exported to register the own/prototype
// branch decision in lcov in-process (local-lcov-pre-push norm); the exit-1
// process contract stays pinned by the spawn arm below.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { main, resolveOwnHandler } from "../../dist/claude/.claude/tools/amadeus-runtime.ts";

const BUN = process.execPath;
const TOOL = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-runtime.ts");

function run(args: string[]): { status: number; stderr: string; stdout: string } {
  const res = spawnSync(BUN, [TOOL, ...args], { encoding: "utf-8" });
  return { status: res.status ?? -1, stderr: res.stderr ?? "", stdout: res.stdout ?? "" };
}

// main() ends the CLI via process.exit; in-process we convert that into a
// throwable so the resolveOwnHandler call site inside main registers in lcov
// (the spawn-driven cases above cannot be seen by bun's instrumentation).
// stdout/stderr are silenced so a real subcommand's output does not pollute the
// test log.
class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function driveMain(argv: string[]): number {
  const origExit = process.exit.bind(process);
  const origLog = console.log;
  const origWrite = process.stderr.write.bind(process.stderr);
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = () => {};
  process.stderr.write = (() => true) as typeof process.stderr.write;
  let status = 0;
  try {
    main(argv);
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    console.log = origLog;
    process.stderr.write = origWrite;
  }
  return status;
}

describe("t-runtime-dispatch-seam (#788)", () => {
  // In-process: both branches of the own-property guard.
  test("resolveOwnHandler returns own-property handlers", () => {
    const marker = () => {};
    const table: Record<string, () => void> = { compile: marker };
    expect(resolveOwnHandler(table, "compile")).toBe(marker);
  });

  test("resolveOwnHandler rejects prototype-chain names", () => {
    const table: Record<string, () => void> = { compile: () => {} };
    expect(resolveOwnHandler(table, "constructor")).toBeUndefined();
    expect(resolveOwnHandler(table, "toString")).toBeUndefined();
    expect(resolveOwnHandler(table, "hasOwnProperty")).toBeUndefined();
  });

  // Spawn contract: prototype names hit the Unknown-subcommand exit-1 path
  // (pre-fix these silently exited 0 by invoking the inherited function).
  test("`constructor` -> Unknown subcommand + exit 1", () => {
    const r = run(["constructor"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Unknown subcommand");
    expect(r.stderr).toContain("constructor");
  });

  test("`toString` -> Unknown subcommand + exit 1", () => {
    const r = run(["toString"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Unknown subcommand");
  });

  // Unchanged: a genuine unknown word still exits 1, a real subcommand still
  // dispatches (does not report Unknown), and --help usage is untouched.
  test("genuine unknown word still exits 1", () => {
    const r = run(["bogus"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Unknown subcommand");
  });

  test("real subcommand `summary` dispatches (not Unknown)", () => {
    const r = run(["summary"]);
    expect(r.stderr).not.toContain("Unknown subcommand");
  });

  test("--help still exits 0", () => {
    const r = run(["--help"]);
    expect(r.status).toBe(0);
  });

  // In-process main() drive: registers the resolveOwnHandler call site inside
  // main (line uncovered by the spawn arm — the spawn blindspot) in lcov.
  test("main dispatches a real subcommand in-process (own-property hit)", () => {
    // `summary` resolves its handler by own-property, then exits 1 when no
    // runtime-graph.json is present (read-only) — either way the call site runs.
    expect(driveMain(["summary"])).toBe(1);
  });

  test("main routes a prototype-chain name to exit 1 in-process", () => {
    expect(driveMain(["constructor"])).toBe(1);
  });
});
