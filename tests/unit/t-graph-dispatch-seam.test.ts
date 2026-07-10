// covers: function:main
// In-process coverage seam + spawn contract for #788: amadeus-graph subcommand
// dispatch must resolve handlers by own-property only, so prototype-chain names
// (`constructor`, `toString`, `hasOwnProperty`) fall to the Unknown-subcommand
// exit-1 path instead of being invoked as handlers.
//
// The dispatch table (COMMANDS) is non-exported and main() ends via
// process.exit, so bun's coverage instrumentation cannot see the spawned CLI
// (the spawn blindspot). resolveOwnHandler is exported to register the
// own/prototype branch decision in lcov in-process, and main() is exported +
// argv-parameterised so its handler-resolution call site is driven in-process
// too (local-lcov-pre-push norm); the exit-1 process contract stays pinned by
// the spawn arm below.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { main, resolveOwnHandler } from "../../dist/claude/.claude/tools/amadeus-graph.ts";

const BUN = process.execPath;
const TOOL = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-graph.ts");

function run(args: string[]): { status: number; stderr: string; stdout: string } {
  const res = spawnSync(BUN, [TOOL, ...args], { encoding: "utf-8" });
  return { status: res.status ?? -1, stderr: res.stderr ?? "", stdout: res.stdout ?? "" };
}

// main() ends the CLI via process.exit; in-process we convert that into a
// throwable so the resolveOwnHandler call site inside main registers in lcov
// (the spawn-driven cases above cannot be seen by bun's instrumentation). stdout
// is silenced so a real subcommand's output does not pollute the test log.
class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

async function driveMain(argv: string[]): Promise<number> {
  const origExit = process.exit.bind(process);
  const origLog = console.log;
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = () => {};
  console.error = () => {};
  let status = 0;
  try {
    await main(argv);
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    console.log = origLog;
    console.error = origErr;
  }
  return status;
}

describe("t-graph-dispatch-seam (#788)", () => {
  // In-process: both branches of the own-property guard.
  test("resolveOwnHandler returns own-property handlers", () => {
    const marker = () => {};
    const table: Record<string, () => void> = { artifacts: marker };
    expect(resolveOwnHandler(table, "artifacts")).toBe(marker);
  });

  test("resolveOwnHandler rejects prototype-chain names", () => {
    const table: Record<string, () => void> = { artifacts: () => {} };
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
  // works, and the no-subcommand usage shape (t63) is untouched.
  test("genuine unknown word still exits 1", () => {
    const r = run(["bogus"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Unknown subcommand");
  });

  test("real subcommand `artifacts` still exits 0", () => {
    const r = run(["artifacts"]);
    expect(r.status).toBe(0);
  });

  test("no subcommand still prints usage + exit 1", () => {
    const r = run([]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Usage: amadeus-graph");
  });

  // In-process main() drive: registers the resolveOwnHandler call site inside
  // main (line uncovered by the spawn arm — the spawn blindspot) in lcov.
  test("main dispatches a real subcommand in-process (own-property hit)", async () => {
    expect(await driveMain(["artifacts"])).toBe(0);
  });

  test("main routes a prototype-chain name to exit 1 in-process", async () => {
    expect(await driveMain(["constructor"])).toBe(1);
  });
});
