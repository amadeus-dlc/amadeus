// The migration post-check runs doctor after intentionally discarding runtime
// scratch. These in-process tests cover the no-follow heartbeat reader and the
// doctor dispatch seam; the spawned migration tests retain the end-to-end CLI
// contract while this file keeps Bun's coverage in the process under test.

import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  codexProjectTrustDoctorCheck,
  handleDoctor,
  hookHeartbeatDoctorCheck,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
import { hooksHealthDir } from "../../packages/framework/core/tools/amadeus-lib.ts";

const roots: string[] = [];
const repoRoot = join(import.meta.dir, "..", "..");
const savedEnv = {
  codexHome: process.env.CODEX_HOME,
  harness: process.env.AMADEUS_HARNESS_DIR,
  migration: process.env.AMADEUS_MIGRATION_DOCTOR,
  node: process.env.NODE_ENV,
  rules: process.env.AMADEUS_RULES_DIR,
  scopeGrid: process.env.AMADEUS_SCOPE_GRID,
  stageGraph: process.env.AMADEUS_STAGE_GRAPH,
  swapDirectory: process.env.AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET,
  swapHeartbeat: process.env.AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET,
};

function root(tag: string): string {
  const created = mkdtempSync(join(tmpdir(), `amadeus-t226-${tag}-`));
  roots.push(created);
  return created;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnv("CODEX_HOME", savedEnv.codexHome);
  restoreEnv("AMADEUS_HARNESS_DIR", savedEnv.harness);
  restoreEnv("AMADEUS_MIGRATION_DOCTOR", savedEnv.migration);
  restoreEnv("NODE_ENV", savedEnv.node);
  restoreEnv("AMADEUS_RULES_DIR", savedEnv.rules);
  restoreEnv("AMADEUS_SCOPE_GRID", savedEnv.scopeGrid);
  restoreEnv("AMADEUS_STAGE_GRAPH", savedEnv.stageGraph);
  restoreEnv(
    "AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET",
    savedEnv.swapDirectory,
  );
  restoreEnv(
    "AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET",
    savedEnv.swapHeartbeat,
  );
  for (const path of roots.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

function healthDir(projectDir: string): string {
  return hooksHealthDir(projectDir);
}

describe("t226 migration doctor heartbeat inspection", () => {
  test("migration mode skips runtime scratch without reading it", () => {
    const projectDir = root("migration-skip");
    process.env.AMADEUS_MIGRATION_DOCTOR = "1";
    expect(hookHeartbeatDoctorCheck(projectDir)).toEqual({
      pass: true,
      label:
        "Hook heartbeats: not inspected during migration (runtime scratch is intentionally discarded)",
    });
  });

  test("a missing heartbeat directory is a fresh-install advisory", () => {
    const result = hookHeartbeatDoctorCheck(root("missing"));
    expect(result.pass).toBe(true);
    expect(result.label).toContain("not yet fired");
  });

  test("an empty, linked, or non-directory heartbeat root is unhealthy", () => {
    const emptyProject = root("empty");
    mkdirSync(healthDir(emptyProject), { recursive: true });
    expect(hookHeartbeatDoctorCheck(emptyProject).pass).toBe(false);

    const linkedProject = root("linked-dir");
    const external = root("linked-target");
    mkdirSync(dirname(healthDir(linkedProject)), { recursive: true });
    symlinkSync(
      external,
      healthDir(linkedProject),
      process.platform === "win32" ? "junction" : "dir",
    );
    expect(hookHeartbeatDoctorCheck(linkedProject).pass).toBe(false);

    const fileProject = root("file-root");
    mkdirSync(dirname(healthDir(fileProject)), { recursive: true });
    writeFileSync(healthDir(fileProject), "not a directory\n", "utf-8");
    expect(hookHeartbeatDoctorCheck(fileProject).pass).toBe(false);
  });

  test("a regular heartbeat is reported with its timestamp", () => {
    const projectDir = root("regular");
    const dir = healthDir(projectDir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "session-start.last"), "2026-07-14T01:02:03Z\n", "utf-8");
    writeFileSync(join(dir, "ignored.txt"), "ignored\n", "utf-8");
    mkdirSync(join(dir, "nested.last"));

    expect(hookHeartbeatDoctorCheck(projectDir)).toEqual({
      pass: true,
      label: "Hooks last fired: session-start 2026-07-14T01:02:03Z",
    });
  });

  test("a heartbeat swapped to a symlink is rejected without reading its target", () => {
    const projectDir = root("file-swap");
    const dir = healthDir(projectDir);
    const external = join(root("file-target"), "secret.last");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "local.last"), "LOCAL\n", "utf-8");
    writeFileSync(external, "EXTERNAL_SECRET\n", "utf-8");
    process.env.NODE_ENV = "test";
    process.env.AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET = external;

    const result = hookHeartbeatDoctorCheck(projectDir);
    expect(result.pass).toBe(false);
    expect(JSON.stringify(result)).not.toContain("EXTERNAL_SECRET");
  });

  test("a heartbeat directory swapped to a symlink is rejected", () => {
    const projectDir = root("directory-swap");
    const dir = healthDir(projectDir);
    const external = root("directory-target");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "local.last"), "LOCAL\n", "utf-8");
    writeFileSync(join(external, "external.last"), "EXTERNAL_SECRET\n", "utf-8");
    process.env.NODE_ENV = "test";
    process.env.AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET = external;

    const result = hookHeartbeatDoctorCheck(projectDir);
    expect(result.pass).toBe(false);
    expect(JSON.stringify(result)).not.toContain("EXTERNAL_SECRET");
  });

  test("the in-process doctor dispatch includes the migration heartbeat check", () => {
    const projectDir = root("doctor");
    const originalExit = process.exit;
    const originalWrite = process.stdout.write;
    let output = "";
    let exitCode: number | undefined;
    process.env.AMADEUS_HARNESS_DIR = ".claude";
    process.env.AMADEUS_MIGRATION_DOCTOR = "1";
    process.env.AMADEUS_RULES_DIR = join(
      repoRoot,
      "packages/framework/core/memory",
    );
    process.env.AMADEUS_SCOPE_GRID = join(
      repoRoot,
      "dist/claude/.claude/tools/data/scope-grid.json",
    );
    process.env.AMADEUS_STAGE_GRAPH = join(
      repoRoot,
      "dist/claude/.claude/tools/data/stage-graph.json",
    );
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      output += typeof chunk === "string"
        ? chunk
        : Buffer.from(chunk).toString("utf-8");
      return true;
    }) as typeof process.stdout.write;
    process.exit = ((code?: number): never => {
      exitCode = code;
      throw new Error("__DOCTOR_EXIT__");
    }) as typeof process.exit;
    try {
      expect(() => handleDoctor(projectDir)).toThrow("__DOCTOR_EXIT__");
    } finally {
      process.exit = originalExit;
      process.stdout.write = originalWrite;
    }

    expect(exitCode).toBe(1);
    expect(output).toContain("Hook heartbeats: not inspected during migration");
  });
});

describe("t226 codex project-trust doctor check", () => {
  test("normal run with no config.toml fails loud with a fix", () => {
    delete process.env.AMADEUS_MIGRATION_DOCTOR;
    process.env.CODEX_HOME = root("codex-home-absent");
    const result = codexProjectTrustDoctorCheck("/abs/project");
    expect(result.pass).toBe(false);
    expect(result.label).toContain('project trust: [projects."/abs/project"]');
    expect(result.label).toContain("Codex skips all .codex hooks silently without it");
    expect(result.fix).toContain("scripts/team-up.sh");
  });

  test("normal run passes when the project has a [projects] entry", () => {
    delete process.env.AMADEUS_MIGRATION_DOCTOR;
    const home = root("codex-home-present");
    process.env.CODEX_HOME = home;
    writeFileSync(
      join(home, "config.toml"),
      '[projects."/abs/project"]\ntrust_level = "trusted"\n',
      "utf-8",
    );
    const result = codexProjectTrustDoctorCheck("/abs/project");
    expect(result.pass).toBe(true);
    expect(result.label).toContain('[projects."/abs/project"]');
  });

  test("migration mode skips the check without reading any config", () => {
    process.env.AMADEUS_MIGRATION_DOCTOR = "1";
    process.env.CODEX_HOME = root("codex-home-migration");
    expect(codexProjectTrustDoctorCheck("/abs/project")).toEqual({
      pass: true,
      label: "project trust: not inspected during migration (seeded at team-up runtime)",
    });
  });
});
