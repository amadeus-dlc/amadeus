// covers: function:handleNext function:runUtilityMain hook:amadeus-stop subcommand:amadeus-utility:recompose
// size: medium

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isPendingComposeStop } from "../../packages/framework/core/hooks/amadeus-stop.ts";
import { hooksHealthDir } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  handleDoctor,
  resolveDoctorContext,
  runUtilityMain,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

const BUN = process.execPath;
const ROOT = join(import.meta.dir, "..", "..");
const ORCHESTRATE = join(ROOT, "packages/framework/core/tools/amadeus-orchestrate.ts");
const UTILITY = join(ROOT, "packages/framework/core/tools/amadeus-utility.ts");
const STOP = join(ROOT, "packages/framework/core/hooks/amadeus-stop.ts");

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t246-"));
  roots.push(root);
  mkdirSync(join(root, "amadeus", "spaces", "default", "memory", "phases"), { recursive: true });
  writeFileSync(join(root, "amadeus", "spaces", "default", "memory", "org.md"), "# Org\n", "utf-8");
  return root;
}

function run(tool: string, args: string[], cwd = ROOT) {
  const result = spawnSync(BUN, [tool, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, AMADEUS_HARNESS_DIR: ".claude" },
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function utilityInProcess(args: string[]): { code: number; output: string } {
  const argv = process.argv;
  const exit = process.exit;
  const stdout = process.stdout.write;
  const stderr = process.stderr.write;
  const graph = process.env.AMADEUS_STAGE_GRAPH;
  const grid = process.env.AMADEUS_SCOPE_GRID;
  let output = "";
  process.env.AMADEUS_STAGE_GRAPH = join(ROOT, "dist/claude/.claude/tools/data/stage-graph.json");
  process.env.AMADEUS_SCOPE_GRID = join(ROOT, "dist/claude/.claude/tools/data/scope-grid.json");
  process.argv = [BUN, UTILITY, ...args];
  process.exit = ((code?: number): never => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  const capture = ((chunk: string | Uint8Array): boolean => {
    output += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
    return true;
  }) as typeof process.stdout.write;
  process.stdout.write = capture;
  process.stderr.write = capture as typeof process.stderr.write;
  let code = 0;
  try {
    runUtilityMain();
  } catch (e) {
    if (e instanceof ExitSignal) code = e.code;
    else throw e;
  } finally {
    process.argv = argv;
    process.exit = exit;
    process.stdout.write = stdout;
    process.stderr.write = stderr;
    if (graph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
    else process.env.AMADEUS_STAGE_GRAPH = graph;
    if (grid === undefined) delete process.env.AMADEUS_SCOPE_GRID;
    else process.env.AMADEUS_SCOPE_GRID = grid;
  }
  return { code, output };
}

describe("t246 production help routing", () => {
  test("engine routes every reserved form to global help before state inspection", () => {
    for (const tokens of [["help"], ["-h"], ["intent", "help"], ["space", "-h"]]) {
      const result = run(ORCHESTRATE, ["next", ...tokens]);
      expect(result.status).toBe(0);
      const directive = JSON.parse(result.stdout) as { kind: string; message?: string };
      expect(directive.kind).toBe("print");
      expect(directive.message).toContain("amadeus-utility.ts help");
    }
  });

  test("space-create -h refuses before slugify and creates no h space", () => {
    const root = project();
    const result = run(UTILITY, ["space-create", "-h", "--project-dir", root], root);
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/reserved|help|-h/i);
    expect(existsSync(join(root, "amadeus", "spaces", "h"))).toBe(false);
  });

  test("handleNext and runUtilityMain drive the production adapters in-process", () => {
    const originalLog = console.log;
    let directive = "";
    console.log = (value?: unknown) => {
      directive += String(value ?? "");
    };
    try {
      handleNext(["intent", "help"], ROOT);
    } finally {
      console.log = originalLog;
    }
    expect(JSON.parse(directive)).toMatchObject({ kind: "print" });

    const help = utilityInProcess(["space", "-h"]);
    expect(help.code).toBe(0);
    expect(help.output).toContain("AI-DLC");

    const root = project();
    const refusal = utilityInProcess(["space-create", "-h", "--project-dir", root]);
    expect(refusal.code).toBe(1);
    expect(existsSync(join(root, "amadeus", "spaces", "h"))).toBe(false);
  });

  test("reserved birth and space slugs refuse after normalization without workflow mutation", () => {
    const root = project();
    const intents = join(root, "amadeus", "spaces", "default", "intents");
    for (const label of ["help", "Help", "HELP", "help!"]) {
      const birth = utilityInProcess([
        "intent-birth",
        "--scope",
        "poc",
        "--label",
        label,
        "--project-dir",
        root,
      ]);
      expect(birth.code).toBe(1);
      expect(birth.output).toMatch(/reserved|help/i);
      expect(existsSync(intents)).toBe(false);

      const space = utilityInProcess(["space-create", label, "--project-dir", root]);
      expect(space.code).toBe(1);
      expect(space.output).toMatch(/reserved|help/i);
      expect(existsSync(join(root, "amadeus", "spaces", "help"))).toBe(false);
    }
    expect(existsSync(join(root, "amadeus", "active-space"))).toBe(false);
    expect(existsSync(join(root, "amadeus", "spaces", "default", "audit"))).toBe(false);
  });

  test("unknown navigation refuses without workflow mutation", () => {
    const root = project();
    const intents = join(root, "amadeus", "spaces", "default", "intents");
    const unknownIntent = utilityInProcess(["intent", "missing", "--project-dir", root]);
    expect(unknownIntent.code).toBe(1);
    expect(unknownIntent.output).toContain("list existing intents");
    expect(unknownIntent.output).not.toMatch(/start|build|create/i);
    const unknownSpace = utilityInProcess(["space", "missing", "--project-dir", root]);
    expect(unknownSpace.code).toBe(1);
    expect(unknownSpace.output).toContain("list existing spaces");
    expect(unknownSpace.output).not.toMatch(/space-create|create it/i);
    expect(existsSync(join(root, "amadeus", "active-space"))).toBe(false);
    expect(existsSync(join(root, "amadeus", "spaces", "default", "audit"))).toBe(false);

    for (const record of ["260721-duplicate", "260722-duplicate"]) {
      mkdirSync(join(intents, record), { recursive: true });
      writeFileSync(join(intents, record, "amadeus-state.md"), "# State\n", "utf-8");
    }
    const ambiguousIntent = utilityInProcess(["intent", "duplicate", "--project-dir", root]);
    expect(ambiguousIntent.code).toBe(1);
    expect(ambiguousIntent.output).toContain("Ambiguous intent");
  });
});

describe("t246 production marker carrier", () => {
  test("fake deps cover autonomy, absent, fresh, stale, cleanup failure, and unreadable", () => {
    const state = "- **Construction Autonomy Mode**: gated\n";
    const marker = "/tmp/t246/amadeus/.amadeus-compose-pending";
    let statCalls = 0;
    let clockCalls = 0;
    let unlinkCalls = 0;
    const diagnostics: Array<{
      markerState: "stale";
      cleanup: "deleted" | "delete-failed";
      enforcement: "continued";
    }> = [];
    const deps = (stat: () => { mtimeMs: number } | undefined, unlink = () => {}) => ({
      projectDir: "/tmp/t246",
      nowMs: () => {
        clockCalls++;
        return 100_000_000;
      },
      stat: (path: string) => {
        expect(path).toBe(marker);
        statCalls++;
        return stat();
      },
      unlink: (path: string) => {
        expect(path).toBe(marker);
        unlinkCalls++;
        unlink();
      },
      diagnostic: (value: (typeof diagnostics)[number]) => diagnostics.push(value),
    });

    expect(isPendingComposeStop("- **Construction Autonomy Mode**: autonomous\n", deps(() => undefined))).toBe(false);
    expect([statCalls, clockCalls, unlinkCalls]).toEqual([0, 0, 0]);
    expect(isPendingComposeStop(state, deps(() => undefined))).toBe(false);
    expect(isPendingComposeStop(state, deps(() => ({ mtimeMs: 100_000_000 })))).toBe(true);
    expect(isPendingComposeStop(state, deps(() => ({ mtimeMs: 0 })))).toBe(false);
    expect(unlinkCalls).toBe(1);
    expect(isPendingComposeStop(state, deps(() => ({ mtimeMs: 0 }), () => { throw new Error("EPERM"); }))).toBe(false);
    expect(unlinkCalls).toBe(2);
    expect(diagnostics).toEqual([
      { markerState: "stale", cleanup: "deleted", enforcement: "continued" },
      { markerState: "stale", cleanup: "delete-failed", enforcement: "continued" },
    ]);
    expect(isPendingComposeStop(state, deps(() => ({ mtimeMs: -1 })))).toBe(false);
    expect(unlinkCalls).toBe(2);
    expect(isPendingComposeStop(state, deps(() => { throw new Error("EACCES"); }))).toBe(false);
  });

  test("real deps observe, remove, and then miss the canonical marker", async () => {
    const root = project();
    const marker = join(root, "amadeus", ".amadeus-compose-pending");
    const originalProjectDir = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = root;
    try {
      const isolated = await import(`${STOP}?t246-real-deps`) as {
        isPendingComposeStop: typeof isPendingComposeStop;
      };
      const state = "- **Construction Autonomy Mode**: gated\n";
      writeFileSync(marker, "pending\n", "utf-8");
      expect(isolated.isPendingComposeStop(state)).toBe(true);
      utimesSync(marker, new Date(0), new Date(0));
      expect(isolated.isPendingComposeStop(state)).toBe(false);
      expect(existsSync(marker)).toBe(false);
      const dropFile = join(hooksHealthDir(root), "stop.drops");
      expect(readFileSync(dropFile, "utf-8")).toMatch(/stale.*deleted/i);
      expect(isolated.isPendingComposeStop(state)).toBe(false);
    } finally {
      if (originalProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = originalProjectDir;
    }
  });

  test("doctor projects fresh and stale marker state without mutating the marker", () => {
    const originalGraph = process.env.AMADEUS_STAGE_GRAPH;
    const root = project();
    const marker = join(root, "amadeus", ".amadeus-compose-pending");
    writeFileSync(marker, "pending\n", "utf-8");
    process.env.AMADEUS_STAGE_GRAPH = join(ROOT, "dist/claude/.claude/tools/data/stage-graph.json");
    try {
      const context = resolveDoctorContext(root);
      let output = handleDoctor(context).output;
      expect(output).toContain("Compose approval marker: fresh");
      const before = readFileSync(marker, "utf-8");
      utimesSync(marker, new Date(0), new Date(0));
      output = handleDoctor(context).output;
      expect(output).toContain("Compose approval marker: stale");
      expect(readFileSync(marker, "utf-8")).toBe(before);

      utimesSync(marker, new Date(-1), new Date(-1));
      output = handleDoctor(context).output;
      expect(output).toContain("Compose approval marker: unreadable");
      expect(readFileSync(marker, "utf-8")).toBe(before);

      const unreadableRoot = mkdtempSync(join(tmpdir(), "amadeus-t246-unreadable-"));
      roots.push(unreadableRoot);
      writeFileSync(join(unreadableRoot, "amadeus"), "not-a-directory\n", "utf-8");
      output = handleDoctor(resolveDoctorContext(unreadableRoot)).output;
      expect(output).toContain("Compose approval marker: unreadable");
    } finally {
      if (originalGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
      else process.env.AMADEUS_STAGE_GRAPH = originalGraph;
    }
  });
});

describe("t246 Stop hook import safety", () => {
  test("module import reaches the sentinel without reading stdin or exiting", () => {
    const script = `await import(${JSON.stringify(STOP)}); console.log("T246_IMPORTED");`;
    const result = run("-e", [script]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("T246_IMPORTED");
  });
});

describe("t246 autonomous recompose atomicity", () => {
  test("autonomous refusal is loud and leaves the state bytes unchanged", () => {
    const root = project();
    const intents = join(root, "amadeus", "spaces", "default", "intents");
    const record = join(intents, "260721-t246");
    mkdirSync(record, { recursive: true });
    writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
    writeFileSync(join(intents, "active-intent"), "260721-t246\n", "utf-8");
    const state = [
      "# AI-DLC State Tracking",
      "- **Status**: Running",
      "- **Scope**: feature",
      "- **Current Stage**: intent-capture",
      "- **Construction Autonomy Mode**: autonomous",
      "- [x] state-init — EXECUTE",
      "- [ ] market-research — EXECUTE",
      "",
    ].join("\n");
    const statePath = join(record, "amadeus-state.md");
    writeFileSync(statePath, state, "utf-8");
    const before = readFileSync(statePath, "utf-8");
    const result = run(UTILITY, ["recompose", "--skip", "market-research", "--project-dir", root], root);
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/autonomous|human gate/i);
    expect(readFileSync(statePath, "utf-8")).toBe(before);

    const direct = utilityInProcess([
      "recompose",
      "--skip",
      "market-research",
      "--project-dir",
      root,
    ]);
    expect(direct.code).toBe(1);
    expect(direct.output).toMatch(/autonomous|human gate/i);
    expect(readFileSync(statePath, "utf-8")).toBe(before);
    expect(existsSync(join(record, "audit"))).toBe(false);
    expect(existsSync(join(record, "runtime-graph.json"))).toBe(false);

    for (const autonomy of ["gated", "unset"] as const) {
      const variant = autonomy === "gated"
        ? state.replace("autonomous", "gated")
        : state.replace("- **Construction Autonomy Mode**: autonomous\n", "");
      writeFileSync(statePath, variant, "utf-8");
      const afterGuard = utilityInProcess([
        "recompose",
        "--skip",
        "definitely-unknown",
        "--project-dir",
        root,
      ]);
      expect(afterGuard.code).toBe(1);
      expect(afterGuard.output).not.toMatch(/autonomous Construction/i);
      expect(readFileSync(statePath, "utf-8")).toBe(variant);
    }
  });

  test("unknown autonomy fails closed before recompose mutation", () => {
    const root = project();
    const intents = join(root, "amadeus", "spaces", "default", "intents");
    const record = join(intents, "260721-t246-corrupt");
    mkdirSync(record, { recursive: true });
    writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
    writeFileSync(join(intents, "active-intent"), "260721-t246-corrupt\n", "utf-8");
    const state = [
      "# AI-DLC State Tracking",
      "- **Status**: Running",
      "- **Scope**: feature",
      "- **Current Stage**: intent-capture",
      "- **Construction Autonomy Mode**: corrupt",
      "- [x] state-init — EXECUTE",
      "- [ ] market-research — EXECUTE",
      "",
    ].join("\n");
    const statePath = join(record, "amadeus-state.md");
    writeFileSync(statePath, state, "utf-8");

    const result = utilityInProcess([
      "recompose",
      "--skip",
      "market-research",
      "--project-dir",
      root,
    ]);
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/autonomy|corrupt|unknown|invalid/i);
    expect(readFileSync(statePath, "utf-8")).toBe(state);
    expect(existsSync(join(record, "audit"))).toBe(false);
    expect(existsSync(join(record, "runtime-graph.json"))).toBe(false);
  });
});
