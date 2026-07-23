// size: medium
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  type GraphStage,
  loadGraph,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import {
  auditLockDir,
  auditShards,
  hooksHealthDir,
  readAllAuditShards,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  deepFreezeDoctorSnapshot,
  type DoctorContext,
  handleDoctor,
  resolveDoctorContext,
  runUtilityMain,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
import {
  cleanupTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  seededAuditShard,
  setupIntegrationProject,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STAGE_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const RULES_DIR = join(REPO_ROOT, "packages", "framework", "core", "memory");
const projects: string[] = [];
const scratchRoots: string[] = [];
const savedEnv = {
  codexHome: process.env.CODEX_HOME,
  defaultScope: process.env.AMADEUS_DEFAULT_SCOPE,
  harness: process.env.AMADEUS_HARNESS_DIR,
  lockBase: process.env.AMADEUS_LOCK_BASE_DIR,
  migration: process.env.AMADEUS_MIGRATION_DOCTOR,
  nodeEnv: process.env.NODE_ENV,
  rules: process.env.AMADEUS_RULES_DIR,
  stageGraph: process.env.AMADEUS_STAGE_GRAPH,
  swapHealthDir: process.env.AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET,
  swapHeartbeat: process.env.AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET,
};

function restoreEnv(name: keyof NodeJS.ProcessEnv, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function healthyProject(withAudit = false): string {
  const projectDir = setupIntegrationProject({
    withAudit,
    withState: "state-mid-ideation.md",
  });
  projects.push(projectDir);
  return projectDir;
}

function fixtureContext(
  projectDir: string,
  overrides: Partial<DoctorContext> = {},
): DoctorContext {
  const base = resolveDoctorContext(projectDir);
  return deepFreezeDoctorSnapshot({ ...base, ...overrides }) as DoctorContext;
}

beforeEach(() => {
  process.env.AMADEUS_HARNESS_DIR = ".claude";
  process.env.AMADEUS_STAGE_GRAPH = STAGE_GRAPH;
  process.env.AMADEUS_RULES_DIR = RULES_DIR;
  delete process.env.AMADEUS_DEFAULT_SCOPE;
  delete process.env.AMADEUS_LOCK_BASE_DIR;
  delete process.env.AMADEUS_MIGRATION_DOCTOR;
  delete process.env.CODEX_HOME;
  delete process.env.AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET;
  delete process.env.AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET;
});

afterEach(() => {
  while (projects.length > 0) cleanupTestProject(projects.pop());
  while (scratchRoots.length > 0) {
    rmSync(scratchRoots.pop() as string, { recursive: true, force: true });
  }
  restoreEnv("CODEX_HOME", savedEnv.codexHome);
  restoreEnv("AMADEUS_DEFAULT_SCOPE", savedEnv.defaultScope);
  restoreEnv("AMADEUS_HARNESS_DIR", savedEnv.harness);
  restoreEnv("AMADEUS_LOCK_BASE_DIR", savedEnv.lockBase);
  restoreEnv("AMADEUS_MIGRATION_DOCTOR", savedEnv.migration);
  restoreEnv("NODE_ENV", savedEnv.nodeEnv);
  restoreEnv("AMADEUS_RULES_DIR", savedEnv.rules);
  restoreEnv("AMADEUS_STAGE_GRAPH", savedEnv.stageGraph);
  restoreEnv(
    "AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET",
    savedEnv.swapHealthDir,
  );
  restoreEnv(
    "AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET",
    savedEnv.swapHeartbeat,
  );
});

describe("t257 doctor core result and context contracts", () => {
  test("returns a complete successful report without process output or exit control", () => {
    const result = handleDoctor(fixtureContext(healthyProject()));

    expect(result.exitCode).toBe(0);
    expect(result.output).toStartWith(`AI-DLC Health Check\n${"─".repeat(37)}\n`);
    expect(result.output).toMatch(/\d+ passed, 0 failed\n$/);
    expect(Object.isFrozen(result)).toBe(true);
  });

  test("fixture graph failures return exit 1 and the complete diagnostic output", () => {
    const projectDir = healthyProject();
    const base = resolveDoctorContext(projectDir);
    const graph = structuredClone(base.graph) as GraphStage[];
    graph[0].consumes = [
      ...graph[0].consumes,
      { artifact: "missing-from-doctor-fixture", required: true },
    ];
    const result = handleDoctor(fixtureContext(projectDir, { graph }));

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('consumes unknown artifact "missing-from-doctor-fixture"');
    expect(result.output).toMatch(/\d+ passed, [1-9]\d* failed\n$/);
  });

  test("main-checkout, harness, and env snapshots are selected only from context", () => {
    const projectDir = healthyProject();
    const mainCheckout = mkdtempSync(join(tmpdir(), "amadeus-t257-main-"));
    scratchRoots.push(mainCheckout);
    mkdirSync(join(mainCheckout, ".amadeus", "worktrees", "bolt-contextanchor"), {
      recursive: true,
    });
    const context = fixtureContext(projectDir, {
      worktreeBaseDir: mainCheckout,
      harnessDir: ".fixture-harness",
      homeDir: undefined,
      defaultScope: "invalid-context-scope",
    });
    const result = handleDoctor(context);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("Orphan worktrees: 1 drift");
    expect(result.output).toContain("contextanchor");
    expect(result.output).toContain("AMADEUS_DEFAULT_SCOPE=invalid-context-scope (invalid)");
    expect(result.output).toContain(".fixture-harness/hooks/");
  });

  test("resolver breaks loader aliases and rejects nested snapshot mutation", () => {
    const projectDir = healthyProject();
    const loaderGraph = loadGraph();
    const originalName = loaderGraph[0].name;
    const context = resolveDoctorContext(projectDir);
    loaderGraph[0].name = "mutated-loader-alias";
    try {
      expect(context.graph[0].name).toBe(originalName);
      expect(() => {
        (context.graph[0] as { name: string }).name = "mutated-context";
      }).toThrow(TypeError);
      expect(Object.isFrozen(context.graph[0])).toBe(true);
      expect(Object.isFrozen(context.rules[0].headings)).toBe(true);
      expect(() => {
        (context.rules[0].headings as Map<string, string>).set("Injected", "value");
      }).toThrow(TypeError);
    } finally {
      loaderGraph[0].name = originalName;
    }
  });

  test("core does not reread routing, catalog, runtime env, or platform after context resolution", () => {
    const projectDir = healthyProject();
    const codexHome = mkdtempSync(join(tmpdir(), "amadeus-t257-codex-home-"));
    const changedCodexHome = mkdtempSync(join(tmpdir(), "amadeus-t257-codex-home-changed-"));
    const externalHealthDir = mkdtempSync(join(tmpdir(), "amadeus-t257-health-swap-"));
    const externalHeartbeatRoot = mkdtempSync(join(tmpdir(), "amadeus-t257-heartbeat-swap-"));
    scratchRoots.push(
      codexHome,
      changedCodexHome,
      externalHealthDir,
      externalHeartbeatRoot,
    );
    writeFileSync(
      join(codexHome, "config.toml"),
      `[projects.${JSON.stringify(projectDir)}]\ntrust_level = "trusted"\n`,
      "utf-8",
    );
    const heartbeatDir = hooksHealthDir(projectDir);
    mkdirSync(heartbeatDir, { recursive: true });
    writeFileSync(
      join(heartbeatDir, "session-start.last"),
      "2026-07-23T00:00:00Z\n",
      "utf-8",
    );
    const externalHeartbeat = join(externalHeartbeatRoot, "external.last");
    writeFileSync(externalHeartbeat, "EXTERNAL\n", "utf-8");
    process.env.AMADEUS_HARNESS_DIR = ".codex";
    process.env.CODEX_HOME = codexHome;
    process.env.NODE_ENV = "production";
    const context = resolveDoctorContext(projectDir);
    const baseline = handleDoctor(context);
    const originalPlatform = process.platform;
    process.env.AMADEUS_HARNESS_DIR = ".claude";
    process.env.AMADEUS_DEFAULT_SCOPE = "invalid-after-snapshot";
    process.env.AMADEUS_STAGE_GRAPH = join(projectDir, "missing-stage-graph.json");
    process.env.AMADEUS_RULES_DIR = join(projectDir, "missing-rules");
    process.env.AMADEUS_MIGRATION_DOCTOR = "1";
    process.env.CODEX_HOME = changedCodexHome;
    process.env.NODE_ENV = "test";
    process.env.AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET = externalHealthDir;
    process.env.AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET = externalHeartbeat;
    Object.defineProperty(process, "platform", {
      value: originalPlatform === "win32" ? "darwin" : "win32",
    });
    let repeated: ReturnType<typeof handleDoctor>;
    try {
      repeated = handleDoctor(context);
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }

    expect(repeated).toEqual(baseline);
  });
});

describe("t257 doctor audit and cleanup side effects", () => {
  test("a cold project remains audit-free", () => {
    const projectDir = healthyProject();
    expect(auditShards(projectDir)).toEqual([]);

    handleDoctor(fixtureContext(projectDir));

    expect(auditShards(projectDir)).toEqual([]);
  });

  test("an active audit receives GUARDRAIL_LOADED before HEALTH_CHECKED", () => {
    const projectDir = healthyProject(true);
    const result = handleDoctor(fixtureContext(projectDir));
    const audit = readAllAuditShards(projectDir);
    const guardrailIndex = audit.lastIndexOf("**Event**: GUARDRAIL_LOADED");
    const healthIndex = audit.lastIndexOf("**Event**: HEALTH_CHECKED");

    expect(result.exitCode).toBe(0);
    expect(guardrailIndex).toBeGreaterThan(-1);
    expect(healthIndex).toBeGreaterThan(guardrailIndex);
  });

  test("a dead-owner audit lock is reported and removed", () => {
    const projectDir = healthyProject();
    const lockDir = auditLockDir(projectDir, DEFAULT_RECORD_DIR, DEFAULT_SPACE);
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(
      join(lockDir, "owner.json"),
      JSON.stringify({ pid: 2_000_000_000, startedAtMs: 0 }),
      "utf-8",
    );

    const result = handleDoctor(fixtureContext(projectDir));

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(`Leaked audit lock on bucket "${DEFAULT_SPACE}/${DEFAULT_RECORD_DIR}"`);
    expect(result.output).toContain("dead-owner");
    expect(existsSync(lockDir)).toBe(false);
  });
});

describe("t257 doctor CLI boundary and fatal ordering", () => {
  test("writes the core output once and exits with the returned code", () => {
    const projectDir = healthyProject();
    const originalArgv = process.argv;
    const originalExit = process.exit;
    const originalWrite = process.stdout.write;
    const writes: string[] = [];
    let exitCode: number | undefined;
    process.argv = [process.execPath, "amadeus-utility.ts", "doctor", "--project-dir", projectDir];
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    }) as typeof process.stdout.write;
    process.exit = ((code?: number): never => {
      exitCode = code;
      throw new Error("__t257_exit__");
    }) as typeof process.exit;
    try {
      expect(() => runUtilityMain()).toThrow("__t257_exit__");
    } finally {
      process.argv = originalArgv;
      process.exit = originalExit;
      process.stdout.write = originalWrite;
    }

    expect(writes).toHaveLength(1);
    expect(writes[0]).toStartWith("AI-DLC Health Check\n");
    expect(exitCode).toBe(0);
  });

  test("an audit failure before output preserves the original error and writes nothing", () => {
    const projectDir = healthyProject(true);
    const brokenLockBase = join(projectDir, "lock-base-file");
    writeFileSync(brokenLockBase, "not a directory\n", "utf-8");
    process.env.AMADEUS_LOCK_BASE_DIR = brokenLockBase;
    const originalArgv = process.argv;
    const originalExit = process.exit;
    const originalWrite = process.stdout.write;
    let writeCount = 0;
    let exitCount = 0;
    process.argv = [process.execPath, "amadeus-utility.ts", "doctor", "--project-dir", projectDir];
    process.stdout.write = (() => {
      writeCount++;
      return true;
    }) as typeof process.stdout.write;
    process.exit = (() => {
      exitCount++;
      throw new Error("unexpected explicit exit");
    }) as typeof process.exit;
    let thrown: unknown;
    try {
      runUtilityMain();
    } catch (error) {
      thrown = error;
    } finally {
      process.argv = originalArgv;
      process.exit = originalExit;
      process.stdout.write = originalWrite;
    }

    expect(String(thrown)).not.toContain("Doctor failed after completing its output");
    expect(String(thrown)).toContain("Failed to acquire audit lock after retries");
    expect(writeCount).toBe(0);
    expect(exitCount).toBe(0);
  }, 10_000);

  test("a HEALTH_CHECKED failure writes the full output then rethrows its cause", async () => {
    const projectDir = healthyProject(true);
    const sections = Array.from(
      { length: 20_000 },
      (_, index) => `[submodule "fixture-${index}"]\n\tpath = fixtures/${index}\n`,
    );
    writeFileSync(join(projectDir, ".gitmodules"), sections.join(""), "utf-8");
    const shard = seededAuditShard(projectDir);
    const auditDir = dirname(shard);
    const watcherReady = join(projectDir, ".t257-watcher-ready");
    const watcherStart = join(projectDir, ".t257-watcher-start");
    const watcherTarget = join(projectDir, ".t257-watcher-target");
    const watcherScript = [
      'import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";',
      'import { join } from "node:path";',
      `const auditDir = ${JSON.stringify(auditDir)};`,
      `const ready = ${JSON.stringify(watcherReady)};`,
      `const start = ${JSON.stringify(watcherStart)};`,
      `const target = ${JSON.stringify(watcherTarget)};`,
      "const waitCell = new Int32Array(new SharedArrayBuffer(4));",
      'writeFileSync(ready, "ready\\n");',
      "while (!existsSync(start)) Atomics.wait(waitCell, 0, 0, 2);",
      "while (true) {",
      "  for (const entry of readdirSync(auditDir)) {",
      "    const candidate = join(auditDir, entry);",
      '    try { if (readFileSync(candidate, "utf-8").includes("GUARDRAIL_LOADED")) {',
      '      writeFileSync(target, candidate, "utf-8");',
      "      rmSync(candidate, { force: true }); mkdirSync(candidate); process.exit(0);",
      "    } } catch {}",
      "  }",
      "  Atomics.wait(waitCell, 0, 0, 2);",
      "}",
    ].join("\n");
    const watcher = Bun.spawn([process.execPath, "-e", watcherScript], {
      stdout: "ignore",
      stderr: "pipe",
    });
    const originalArgv = process.argv;
    const originalExit = process.exit;
    const originalWrite = process.stdout.write;
    const writes: string[] = [];
    let exitCount = 0;
    process.argv = [process.execPath, "amadeus-utility.ts", "doctor", "--project-dir", projectDir];
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    }) as typeof process.stdout.write;
    process.exit = (() => {
      exitCount++;
      throw new Error("unexpected explicit exit");
    }) as typeof process.exit;
    let thrown: unknown;
    let watcherExit: number | null = null;
    try {
      while (!existsSync(watcherReady)) {
        if (watcher.exitCode !== null) {
          throw new Error(`watcher exited before READY with code ${watcher.exitCode}`);
        }
        await Bun.sleep(1);
      }
      writeFileSync(watcherStart, "start\n", "utf-8");
      runUtilityMain();
    } catch (error) {
      thrown = error;
    } finally {
      process.argv = originalArgv;
      process.exit = originalExit;
      process.stdout.write = originalWrite;
      const guardrailReached =
        existsSync(watcherTarget) ||
        auditShards(projectDir).some((path) => {
          try {
            return readFileSync(path, "utf-8").includes("GUARDRAIL_LOADED");
          } catch {
            return false;
          }
        });
      if (guardrailReached) {
        watcherExit = await Promise.race([
          watcher.exited,
          Bun.sleep(60_000).then(() => null),
        ]);
      }
      if (watcher.exitCode === null) watcher.kill();
      await watcher.exited;
    }

    expect(watcherExit).toBe(0);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toStartWith("AI-DLC Health Check\n");
    expect(writes[0]).toMatch(/\d+ passed, \d+ failed\n$/);
    expect(String(thrown)).toMatch(/EISDIR|is a directory/i);
    expect(exitCount).toBe(0);
  }, 75_000);
});
