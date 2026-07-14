// covers: cli:amadeus-migrate(dry-run,apply)
//
// Public-interface contract for the deterministic upstream-v2 workspace
// migration. Every assertion crosses the real process seam and observes only
// exit status, JSON, Git, or filesystem state.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  createUpstreamV2Fixture,
  projectSnapshot,
  type UpstreamV2Fixture,
  UPSTREAM_FILE_PREFIX,
  UPSTREAM_WORKSPACE_NAME,
} from "../helpers/upstream-v2-fixture.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const MIGRATE_TOOL = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-migrate.ts",
);
const OPERATIONAL_TOKEN_FIXTURE = join(
  REPO_ROOT,
  "tests",
  "fixtures",
  "upstream-v2-migration",
  "operational-tokens.txt",
);
const fixtures: UpstreamV2Fixture[] = [];

interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

interface MigrationReport {
  schemaVersion: number;
  status: string;
  mode: string;
  source: string;
  destination: string;
  sourceVersion: string;
  target: string;
  checks: unknown;
  operations: unknown[];
  warnings: unknown[];
  evidence: {
    stateFiles?: number;
    auditBefore?: Record<string, string>;
    auditAfter?: Record<string, string>;
    doctor?: { status: string; output: string };
    auditAppends?: Array<{ path: string; bytes: number; events: string[] }>;
    rollback?: { attempted: boolean; restored: boolean };
  };
}

function fixture(options: Parameters<typeof createUpstreamV2Fixture>[0] = {}): UpstreamV2Fixture {
  const created = createUpstreamV2Fixture(options);
  fixtures.push(created);
  return created;
}

function migrate(project: UpstreamV2Fixture, ...args: string[]): CliResult {
  return runMigrationProcess(project, project.sourceRoot, args);
}

function migrateFrom(
  project: UpstreamV2Fixture,
  source: string,
  ...args: string[]
): CliResult {
  return runMigrationProcess(project, source, args);
}

function migrateWithEnv(
  project: UpstreamV2Fixture,
  extraEnv: NodeJS.ProcessEnv,
  ...args: string[]
): CliResult {
  return runMigrationProcess(project, project.sourceRoot, args, extraEnv);
}

function migrateWithTool(
  project: UpstreamV2Fixture,
  tool: string,
  ...args: string[]
): CliResult {
  return runMigrationProcess(project, project.sourceRoot, args, {}, tool);
}

function runInstalledDoctor(
  project: UpstreamV2Fixture,
  extraEnv: NodeJS.ProcessEnv = {},
): CliResult {
  const result = spawnSync(
    process.execPath,
    [
      join(project.projectDir, ".claude", "tools", "amadeus-utility.ts"),
      "doctor",
      "--project-dir",
      project.projectDir,
    ],
    {
      cwd: project.projectDir,
      encoding: "utf-8",
      env: { ...process.env, ...extraEnv, AMADEUS_HARNESS_DIR: ".claude" },
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function runMigrationProcess(
  project: UpstreamV2Fixture,
  source: string,
  args: readonly string[],
  extraEnv: NodeJS.ProcessEnv = {},
  tool = MIGRATE_TOOL,
): CliResult {
  const result = spawnSync(
    process.execPath,
    [
      tool,
      "--project-dir",
      project.projectDir,
      "--from",
      source,
      "--json",
      ...args,
    ],
    {
      cwd: project.projectDir,
      encoding: "utf-8",
      env: { ...process.env, ...extraEnv },
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function installClaudeHarness(
  project: UpstreamV2Fixture,
  options: { validSettings: boolean },
): string {
  const harnessRoot = join(project.projectDir, ".claude");
  if (options.validSettings) {
    return join(harnessRoot, "tools", "amadeus-migrate.ts");
  } else {
    rmSync(join(harnessRoot, "settings.json"), { force: true });
  }
  const installedMigrator = join(harnessRoot, "tools", "amadeus-migrate.ts");
  project.commitAll("test: install migration harness");
  return installedMigrator;
}

function parseReport(result: CliResult): MigrationReport {
  try {
    return JSON.parse(result.stdout) as MigrationReport;
  } catch (error) {
    throw new Error(
      `migration did not emit JSON (exit ${result.status})\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      { cause: error },
    );
  }
}

function gitIndexPath(project: UpstreamV2Fixture): string {
  const raw = project.git(["rev-parse", "--git-path", "index"]).trim();
  return isAbsolute(raw) ? raw : resolve(project.projectDir, raw);
}

function hashBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function expectRefused(
  result: CliResult,
  diagnostic: RegExp,
): MigrationReport {
  expect(result.status).not.toBe(0);
  expect(result.stderr).toBe("");
  const report = parseReport(result);
  expect(report.schemaVersion).toBe(1);
  expect(report.status).toBe("refused");
  expect(report.mode).toBe("dry-run");
  expect(JSON.stringify(report).toLowerCase()).toMatch(diagnostic);
  return report;
}

function expectReadOnlyRefusal(
  project: UpstreamV2Fixture,
  run: () => CliResult,
  diagnostic: RegExp,
): MigrationReport {
  const beforeSnapshot = projectSnapshot(project.projectDir);
  const beforeStatus = project.git(["status", "--porcelain=v1", "-z"]);
  const report = expectRefused(run(), diagnostic);
  expect(projectSnapshot(project.projectDir)).toBe(beforeSnapshot);
  expect(project.git(["status", "--porcelain=v1", "-z"])).toBe(beforeStatus);
  return report;
}

afterEach(() => {
  for (const project of fixtures.splice(0)) project.cleanup();
});

describe("t224 upstream-v2 migration public CLI", () => {
  test("dry-run reports a sorted eligible plan and leaves Git and the filesystem unchanged", () => {
    const project = fixture();
    const beforeSnapshot = projectSnapshot(project.projectDir);
    const beforeStatus = project.git(["status", "--porcelain=v1", "-z"]);

    const result = migrate(project);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const report = parseReport(result);

    expect(report.schemaVersion).toBe(1);
    expect(report.status).toBe("ready");
    expect(report.mode).toBe("dry-run");
    expect(report.source).toBe(project.sourceRoot);
    expect(report.destination).toBe(project.destinationRoot);
    expect(report.sourceVersion).toBe("unknown");
    expect(report.target).toBe("absent");
    expect(report.checks).toBeDefined();
    expect(report.evidence).toBeDefined();
    expect(Array.isArray(report.operations)).toBe(true);
    expect(report.operations.length).toBeGreaterThan(0);
    expect(Array.isArray(report.warnings)).toBe(true);

    const operationOrder = report.operations.map((operation) => JSON.stringify(operation));
    expect(operationOrder).toEqual([...operationOrder].sort());
    expect(projectSnapshot(project.projectDir)).toBe(beforeSnapshot);
    expect(project.git(["status", "--porcelain=v1", "-z"])).toBe(beforeStatus);
    expect(existsSync(project.sourceRoot)).toBe(true);
    expect(existsSync(project.destinationRoot)).toBe(false);
  });

  test("dry-run does not refresh Git index bytes when only tracked-file metadata changed", () => {
    const project = fixture();
    const tracked = join(project.projectDir, "README.md");
    const trackedStat = statSync(tracked);
    utimesSync(
      tracked,
      trackedStat.atime,
      new Date(trackedStat.mtimeMs + 60_000),
    );
    const indexPath = gitIndexPath(project);
    const indexBefore = readFileSync(indexPath);
    const hashBefore = hashBytes(indexBefore);

    const result = migrate(project);

    expect(result.status).toBe(0);
    expect(parseReport(result).status).toBe("ready");
    const indexAfter = readFileSync(indexPath);
    expect(indexAfter).toEqual(indexBefore);
    expect(hashBytes(indexAfter)).toBe(hashBefore);
    expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");
  });

  test.each([
    ["an absent Intent root", "absent"],
    ["known no-Intent scratch", "scratch"],
  ] as const)(
    "migrates a pre-Intent workspace with %s without creating an Intent",
    (_case, preIntentLayout) => {
      const project = fixture({ preIntentLayout });
      const beforeSnapshot = projectSnapshot(project.projectDir);
      const beforeStatus = project.git(["status", "--porcelain=v1", "-z"]);

      const dryRun = migrate(project);
      expect(dryRun.status).toBe(0);
      const dryRunReport = parseReport(dryRun);
      expect(dryRunReport.status).toBe("ready");
      expect(dryRunReport.evidence.stateFiles).toBe(0);
      expect(projectSnapshot(project.projectDir)).toBe(beforeSnapshot);
      expect(project.git(["status", "--porcelain=v1", "-z"])).toBe(beforeStatus);

      const applied = migrate(project, "--apply");
      expect(applied.status).toBe(0);
      const appliedReport = parseReport(applied);
      expect(appliedReport.status).toBe("applied");
      expect(appliedReport.evidence.stateFiles).toBe(0);
      expect(existsSync(project.sourceRoot)).toBe(false);

      const intentsRoot = join(
        project.destinationRoot,
        "spaces",
        "default",
        "intents",
      );
      if (existsSync(intentsRoot)) {
        expect(readdirSync(intentsRoot)).toEqual([]);
      }
      expect(existsSync(join(intentsRoot, "intents.json"))).toBe(false);
      expect(existsSync(join(intentsRoot, "active-intent"))).toBe(false);
      expect(project.records).toEqual([]);
      expect(project.git(["diff", "--name-only"])).toBe("");
    },
  );

  test("dry-run warns about legacy engine files anywhere under harness roots", () => {
    const project = fixture();
    const legacyHook = join(
      project.projectDir,
      ".codex",
      "hooks",
      `${UPSTREAM_WORKSPACE_NAME}-stop.ts`,
    );
    mkdirSync(join(project.projectDir, ".codex", "hooks"), { recursive: true });
    writeFileSync(legacyHook, "export {};\n", "utf-8");
    project.commitAll("test: retain a legacy engine hook");
    const before = projectSnapshot(project.projectDir);

    const result = migrate(project);
    expect(result.status).toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("ready");
    expect(report.warnings.map(String)).toContain(
      `Legacy upstream engine file remains outside the workspace: .codex/hooks/${UPSTREAM_WORKSPACE_NAME}-stop.ts`,
    );
    expect(projectSnapshot(project.projectDir)).toBe(before);

    const applied = migrate(project, "--apply");
    expect(applied.status).toBe(0);
    expect(readFileSync(legacyHook, "utf-8")).toBe("export {};\n");
  });

  test("apply migrates an absent target while preserving durable bytes and discarding runtime state", () => {
    const project = fixture();
    const sourceAudit = readFileSync(project.auditPath);
    const sourceBinary = readFileSync(project.binaryPath);
    const sourceSymlink = readlinkSync(project.symlinkPath);
    const recordRelative = join("spaces", "default", "intents", project.recordDir);

    const result = migrate(project, "--apply");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const report = parseReport(result);
    expect(report.schemaVersion).toBe(1);
    expect(report.status).toBe("applied");
    expect(report.mode).toBe("apply");
    expect(report.target).toBe("absent");
    expect(report.evidence.doctor?.status).toBe("passed");

    expect(existsSync(project.sourceRoot)).toBe(false);
    expect(existsSync(project.destinationRoot)).toBe(true);

    const destinationState = join(
      project.destinationRoot,
      recordRelative,
      "amadeus-state.md",
    );
    expect(existsSync(destinationState)).toBe(true);
    const migratedState = readFileSync(destinationState, "utf-8");
    expect(migratedState).toContain("amadeus-product-agent");
    expect(migratedState).not.toContain(UPSTREAM_FILE_PREFIX);

    const destinationAudit = join(
      project.destinationRoot,
      relative(project.sourceRoot, project.auditPath),
    );
    const destinationBinary = join(
      project.destinationRoot,
      relative(project.sourceRoot, project.binaryPath),
    );
    const destinationSymlink = join(
      project.destinationRoot,
      relative(project.sourceRoot, project.symlinkPath),
    );
    expect(readFileSync(destinationAudit)).toEqual(sourceAudit);
    expect(readFileSync(destinationBinary)).toEqual(sourceBinary);
    expect(readlinkSync(destinationSymlink)).toBe(sourceSymlink);
    expect(
      readFileSync(
        join(
          project.destinationRoot,
          recordRelative,
          "inception",
          "requirements-analysis",
          "requirements.md",
        ),
        "utf-8",
      ),
    ).toContain("`/amadeus --status`");

    expect(
      existsSync(join(project.destinationRoot, relative(project.sourceRoot, project.runtimePath))),
    ).toBe(false);
    expect(existsSync(join(project.destinationRoot, `.${UPSTREAM_FILE_PREFIX}sessions`))).toBe(
      false,
    );
    expect(
      existsSync(join(project.destinationRoot, recordRelative, `.${UPSTREAM_FILE_PREFIX}recovery.md`)),
    ).toBe(false);
    for (const runtimePrefix of [`.${UPSTREAM_FILE_PREFIX}`, ".amadeus-"]) {
      expect(existsSync(join(project.destinationRoot, `${runtimePrefix}sessions`))).toBe(false);
      expect(
        existsSync(
          join(
            project.destinationRoot,
            "spaces",
            "default",
            "intents",
            `${runtimePrefix}hooks-health`,
          ),
        ),
      ).toBe(false);
      expect(
        existsSync(
          join(project.destinationRoot, recordRelative, `${runtimePrefix}recovery.md`),
        ),
      ).toBe(false);
    }
    expect(
      readFileSync(
        join(
          project.destinationRoot,
          relative(project.sourceRoot, project.prefixedUserDataPath),
        ),
        "utf-8",
      ),
    ).toBe("durable user notes\n");
    expect(existsSync(join(project.destinationRoot, ".amadeus-clone-id"))).toBe(true);
    expect(
      existsSync(
        join(
          project.destinationRoot,
          "spaces",
          "default",
          "knowledge",
          "amadeus-shared",
        ),
      ),
    ).toBe(true);
    expect(
      readFileSync(
        join(
          project.destinationRoot,
          "spaces",
          "default",
          "knowledge",
          "runtime-graph.json",
        ),
        "utf-8",
      ),
    ).toBe('{"durable":true}\n');
    expect(
      readFileSync(
        join(
          project.destinationRoot,
          "spaces",
          "default",
          "knowledge",
          `.${UPSTREAM_FILE_PREFIX}recovery.md`,
        ),
        "utf-8",
      ),
    ).toBe("durable recovery guidance\n");

    const ignore = readFileSync(join(project.projectDir, ".gitignore"), "utf-8");
    expect(ignore).toContain("amadeus/active-space");
    expect(ignore).not.toContain(`${UPSTREAM_WORKSPACE_NAME}/active-space`);

    expect(project.git(["diff", "--name-only"])).toBe("");
    expect(project.git(["diff", "--cached", "--name-only"]).trim()).not.toBe("");
    const porcelain = project.git(["status", "--porcelain=v1"]);
    for (const line of porcelain.trim().split("\n")) {
      if (line.length > 0) expect(line[1]).toBe(" ");
    }
  });

  test("apply accepts an unmodified installer seed, preserves its manifest, and lets migrated memory win", () => {
    const project = fixture({ withInstallerSeed: true });
    const manifestBefore = readFileSync(project.installerManifestPath);
    const runtimePath = join(project.projectDir, ".claude", "tools", "amadeus-runtime.ts");
    const runtimeBefore = readFileSync(runtimePath);
    expect(runtimeBefore.length).toBeGreaterThan(1_000);
    const seedMemoryBefore = readFileSync(project.installerSeedMemoryPath, "utf-8");
    const sourceMemoryBefore = readFileSync(project.sourceMemoryPath, "utf-8");

    const result = migrate(project, "--apply");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const report = parseReport(result);
    expect(report.status).toBe("applied");
    expect(report.mode).toBe("apply");
    expect(report.target).toBe("installer-seed");

    expect(readFileSync(project.installerManifestPath)).toEqual(manifestBefore);
    expect(readFileSync(runtimePath)).toEqual(runtimeBefore);
    const migratedMemory = readFileSync(project.installerSeedMemoryPath, "utf-8");
    expect(migratedMemory).not.toBe(seedMemoryBefore);
    expect(migratedMemory).toBe(
      sourceMemoryBefore.replaceAll(`${UPSTREAM_WORKSPACE_NAME}/`, "amadeus/"),
    );
    expect(existsSync(project.sourceRoot)).toBe(false);
    expect(existsSync(project.destinationRoot)).toBe(true);
    expect(project.git(["diff", "--name-only"])).toBe("");
  });

  test("apply rolls back before restoring a manifest through a converted installer symlink", () => {
    const project = fixture({ withInstallerSeed: true });
    const external = mkdtempSync(join(tmpdir(), "amadeus-converted-installer-"));
    const target = join(external, "amadeus-setup-manifest.json");
    const sentinel = "INSTALLER_SENTINEL_MUST_NOT_CHANGE\n";
    try {
      writeFileSync(target, sentinel, "utf-8");
      const snapshotBefore = projectSnapshot(project.projectDir);
      const indexBefore = readFileSync(gitIndexPath(project));
      const manifestBefore = readFileSync(project.installerManifestPath);

      const result = migrateWithEnv(
        project,
        {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_CONVERTED_INSTALLER_SYMLINK: external,
        },
        "--apply",
      );

      expect(result.status).not.toBe(0);
      const report = parseReport(result);
      expect(report.status).toBe("failed");
      expect(report.evidence.rollback).toEqual({ attempted: true, restored: true });
      expect(report.warnings.join(" ")).toMatch(/installer directory[^.]*real directory/i);
      expect(readFileSync(target, "utf-8")).toBe(sentinel);
      expect(projectSnapshot(project.projectDir)).toBe(snapshotBefore);
      expect(readFileSync(gitIndexPath(project))).toEqual(indexBefore);
      expect(readFileSync(project.installerManifestPath)).toEqual(manifestBefore);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("apply preserves a source installer symlink when the destination is absent", () => {
    const project = fixture();
    const external = mkdtempSync(join(tmpdir(), "amadeus-preserved-installer-"));
    const target = join(external, "sentinel.txt");
    const sentinel = "PRESERVED_INSTALLER_SENTINEL\n";
    try {
      writeFileSync(target, sentinel, "utf-8");
      symlinkSync(
        external,
        join(project.sourceRoot, ".installer"),
        process.platform === "win32" ? "junction" : "dir",
      );
      project.commitAll("test: preserve a source installer symlink");

      const result = migrate(project, "--apply");

      expect(result.status).toBe(0);
      expect(parseReport(result).status).toBe("applied");
      const migrated = join(project.destinationRoot, ".installer");
      expect(lstatSync(migrated).isSymbolicLink()).toBe(true);
      expect(readlinkSync(migrated)).toBe(external);
      expect(readFileSync(target, "utf-8")).toBe(sentinel);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("apply preserves historical text below a source installer directory", () => {
    const project = fixture();
    const historical = join(project.sourceRoot, ".installer", "migration-notes.md");
    const contents = `Keep /${UPSTREAM_WORKSPACE_NAME} --status as migration history.\n`;
    mkdirSync(dirname(historical), { recursive: true });
    writeFileSync(historical, contents, "utf-8");
    project.commitAll("test: add historical installer notes");

    const result = migrate(project, "--apply");

    expect(result.status).toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("applied");
    expect(report.evidence.doctor?.status).toBe("passed");
    expect(
      readFileSync(
        join(project.destinationRoot, ".installer", "migration-notes.md"),
        "utf-8",
      ),
    ).toBe(contents);
  });

  test("apply rolls back when converted state retains an upstream operational token", () => {
    const project = fixture();
    const snapshotBefore = projectSnapshot(project.projectDir);
    const indexBefore = readFileSync(gitIndexPath(project));
    const stateBefore = readFileSync(project.statePath);

    const result = migrateWithEnv(
      project,
      {
        NODE_ENV: "test",
        AMADEUS_MIGRATE_TEST_CONVERTED_STATE_TOKEN: "1",
      },
      "--apply",
    );

    expect(result.status).not.toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("failed");
    expect(report.evidence.rollback).toEqual({ attempted: true, restored: true });
    expect(report.warnings.join(" ")).toMatch(/operational upstream reference remains in state/i);
    expect(readFileSync(project.statePath)).toEqual(stateBefore);
    expect(projectSnapshot(project.projectDir)).toBe(snapshotBefore);
    expect(readFileSync(gitIndexPath(project))).toEqual(indexBefore);
    expect(existsSync(project.destinationRoot)).toBe(false);
  });

  test("postcondition rejects destination runtime scratch and rolls back without following it", () => {
    const project = fixture();
    const external = mkdtempSync(join(tmpdir(), "amadeus-applied-scratch-"));
    const heartbeat = join(external, "external.last");
    const secret = "APPLIED_RUNTIME_SECRET_MUST_NOT_LEAK";
    try {
      writeFileSync(heartbeat, secret, "utf-8");
      const heartbeatBefore = readFileSync(heartbeat);
      const snapshotBefore = projectSnapshot(project.projectDir);
      const indexBefore = readFileSync(gitIndexPath(project));

      const result = migrateWithEnv(
        project,
        {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_APPLIED_RUNTIME_SCRATCH_TARGET: external,
        },
        "--apply",
      );

      expect(result.status).not.toBe(0);
      const report = parseReport(result);
      expect(report.status).toBe("failed");
      expect(report.evidence.rollback).toEqual({ attempted: true, restored: true });
      expect(report.warnings.join(" ")).toMatch(/discarded runtime path remains/i);
      expect(result.stdout).not.toContain(secret);
      expect(readFileSync(heartbeat)).toEqual(heartbeatBefore);
      expect(projectSnapshot(project.projectDir)).toBe(snapshotBefore);
      expect(readFileSync(gitIndexPath(project))).toEqual(indexBefore);
      expect(existsSync(project.sourceRoot)).toBe(true);
      expect(existsSync(project.destinationRoot)).toBe(false);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("apply rewrites only complete operational tokens", () => {
    const project = fixture();
    const lookalike = `br${UPSTREAM_WORKSPACE_NAME}/reference`;
    const upstreamEnvironmentPrefix = ["AI", "DLC", "_"].join("");
    const upstreamToolPrefix = `${UPSTREAM_WORKSPACE_NAME}-`;
    const upstreamRuntimePrefix = `.${UPSTREAM_FILE_PREFIX}`;
    const source = [
      "# Token boundaries",
      "",
      `Use ${UPSTREAM_WORKSPACE_NAME}/spaces/default operationally.`,
      `Keep the bare ${UPSTREAM_WORKSPACE_NAME} methodology name.`,
      `Keep the AI-DLC methodology name and ${lookalike}.`,
      `Use ${upstreamEnvironmentPrefix}ROOT and ${UPSTREAM_FILE_PREFIX}state.md operationally.`,
      `Keep MY${upstreamEnvironmentPrefix}ROOT and my-${UPSTREAM_FILE_PREFIX}state.md unchanged.`,
      `Keep .${UPSTREAM_FILE_PREFIX}user-notes.md because it is user data.`,
      `Convert ${UPSTREAM_WORKSPACE_NAME}\\spaces\\default and .${UPSTREAM_WORKSPACE_NAME}\\cache paths.`,
      `Convert .codex/tools/${upstreamToolPrefix}jump.ts and ${upstreamToolPrefix}worktree.ts.`,
      `Convert <${upstreamRuntimePrefix}sessions> and ${upstreamRuntimePrefix}plan.json?.`,
      `Convert <code>/${UPSTREAM_WORKSPACE_NAME}</code> and /${UPSTREAM_WORKSPACE_NAME}?.`,
      `Convert ${upstreamToolPrefix}enterprise.md and ${upstreamToolPrefix}architect-agent.json.`,
      `Keep ${upstreamToolPrefix}enterprise and ${upstreamToolPrefix}product-agent.json lookalikes.`,
      `Keep ${upstreamToolPrefix}product-thinking and ${upstreamToolPrefix}state-of-the-art prose.`,
      "",
    ].join("\n");
    writeFileSync(project.sourceMemoryPath, source, "utf-8");
    project.commitAll("test: add migration token boundaries");

    const result = migrate(project, "--apply");
    expect(result.status).toBe(0);
    expect(readFileSync(project.installerSeedMemoryPath, "utf-8")).toBe(
      source
        .replace(`${UPSTREAM_WORKSPACE_NAME}/spaces/default`, "amadeus/spaces/default")
        .replace(`${upstreamEnvironmentPrefix}ROOT`, "AMADEUS_ROOT")
        .replace(`${UPSTREAM_FILE_PREFIX}state.md operationally`, "amadeus-state.md operationally")
        .replace(`${UPSTREAM_WORKSPACE_NAME}\\spaces\\default`, "amadeus\\spaces\\default")
        .replace(`.${UPSTREAM_WORKSPACE_NAME}\\cache`, ".amadeus\\cache")
        .replace(`${upstreamToolPrefix}jump.ts`, "amadeus-jump.ts")
        .replace(`${upstreamToolPrefix}worktree.ts`, "amadeus-worktree.ts")
        .replace(`${upstreamRuntimePrefix}sessions`, ".amadeus-sessions")
        .replace(`${upstreamRuntimePrefix}plan.json`, ".amadeus-plan.json")
        .replace(`${upstreamToolPrefix}enterprise.md`, "amadeus-enterprise.md")
        .replace(`${upstreamToolPrefix}architect-agent.json`, "amadeus-architect-agent.json")
        .replaceAll(`/${UPSTREAM_WORKSPACE_NAME}`, "/amadeus"),
    );
  });

  test("apply rewrites every distributed upstream operational basename", () => {
    const project = fixture();
    const inventory = readFileSync(OPERATIONAL_TOKEN_FIXTURE, "utf-8");
    expect(inventory.trim().split(/\r?\n/)).toHaveLength(152);
    writeFileSync(project.sourceMemoryPath, inventory, "utf-8");
    project.commitAll("test: add upstream operational token inventory");

    const result = migrate(project, "--apply");
    expect(result.status).toBe(0);
    expect(parseReport(result).status).toBe("applied");
    expect(readFileSync(project.installerSeedMemoryPath, "utf-8")).toBe(
      inventory.replace(/^aidlc/gm, "amadeus"),
    );
  });

  test("apply preserves gitignore line endings and custom lines", () => {
    const project = fixture();
    const before = [
      "# user rule",
      `vendor/${UPSTREAM_WORKSPACE_NAME}/cache`,
      `/${UPSTREAM_WORKSPACE_NAME}/active-space`,
      "custom.tmp",
      "",
    ].join("\r\n");
    writeFileSync(join(project.projectDir, ".gitignore"), before, "utf-8");
    project.commitAll("test: use crlf gitignore");

    const result = migrate(project, "--apply");
    expect(result.status).toBe(0);
    expect(readFileSync(join(project.projectDir, ".gitignore"), "utf-8")).toBe(
      before.replace(`/${UPSTREAM_WORKSPACE_NAME}/active-space`, "/amadeus/active-space"),
    );
  });

  test("apply rewrites known gitignore patterns for a custom source path", () => {
    const project = fixture();
    const customSource = join(project.projectDir, "legacy-workspace");
    renameSync(project.sourceRoot, customSource);
    const gitignorePath = join(project.projectDir, ".gitignore");
    writeFileSync(
      gitignorePath,
      readFileSync(gitignorePath, "utf-8").replaceAll(
        `${UPSTREAM_WORKSPACE_NAME}/`,
        "legacy-workspace/",
      ),
      "utf-8",
    );
    project.commitAll("test: relocate upstream workspace");

    const result = migrateFrom(project, customSource, "--apply");
    expect(result.status).toBe(0);
    expect(parseReport(result).status).toBe("applied");
    const migratedIgnore = readFileSync(gitignorePath, "utf-8");
    expect(migratedIgnore).toContain("amadeus/active-space");
    expect(migratedIgnore).not.toContain("legacy-workspace/active-space");
    expect(existsSync(customSource)).toBe(false);
    expect(existsSync(project.destinationRoot)).toBe(true);
  });

  test("apply renames a broken clone-id symlink without following it", () => {
    const project = fixture();
    const upstreamCloneId = join(
      project.sourceRoot,
      `.${UPSTREAM_FILE_PREFIX}clone-id`,
    );
    rmSync(upstreamCloneId, { force: true });
    symlinkSync("missing-clone-id", upstreamCloneId);

    const result = migrate(project, "--apply");
    expect(result.status).toBe(0);
    expect(parseReport(result).status).toBe("applied");
    const migratedCloneId = join(project.destinationRoot, ".amadeus-clone-id");
    expect(lstatSync(migratedCloneId).isSymbolicLink()).toBe(true);
    expect(readlinkSync(migratedCloneId)).toBe("missing-clone-id");
    expect(() => lstatSync(join(project.destinationRoot, `.${UPSTREAM_FILE_PREFIX}clone-id`))).toThrow();
  });

  test.each([
    [`${UPSTREAM_FILE_PREFIX}shared`, "amadeus-shared", "shared-target"],
    [`${UPSTREAM_FILE_PREFIX}developer-agent`, "amadeus-developer-agent", "role-target"],
  ] as const)(
    "apply renames the known knowledge symlink %s without following it",
    (legacyName, migratedName, targetName) => {
      const project = fixture();
      const knowledge = join(
        project.sourceRoot,
        "spaces",
        "default",
        "knowledge",
      );
      const legacy = join(knowledge, legacyName);
      rmSync(legacy, { recursive: true, force: true });
      mkdirSync(join(knowledge, targetName), { recursive: true });
      writeFileSync(join(knowledge, targetName, "README.md"), "# Link target\n", "utf-8");
      symlinkSync(targetName, legacy);
      project.commitAll("test: use a knowledge symlink");

      const result = migrate(project, "--apply");

      expect(result.status).toBe(0);
      expect(parseReport(result).status).toBe("applied");
      const migrated = join(
        project.destinationRoot,
        "spaces",
        "default",
        "knowledge",
        migratedName,
      );
      expect(lstatSync(migrated).isSymbolicLink()).toBe(true);
      expect(readlinkSync(migrated)).toBe(targetName);
      expect(() => lstatSync(join(dirname(migrated), legacyName))).toThrow();
    },
  );

  test("installed doctor ignores a preserved linked space without reading external data", () => {
    const project = fixture();
    const external = mkdtempSync(join(tmpdir(), "amadeus-linked-space-"));
    const secret = "external-secret-do-not-read";
    const registry = join(external, "intents", "intents.json");
    try {
      mkdirSync(dirname(registry), { recursive: true });
      writeFileSync(
        registry,
        `${JSON.stringify(
          [
            {
              uuid: "feedface-feed-7000-8000-feedfacefeed",
              slug: secret,
              status: "in-flight",
              dirName: `${secret}-feedfacefeed`,
            },
          ],
          null,
          2,
        )}\n`,
        "utf-8",
      );
      const registryBefore = readFileSync(registry);
      const linkedSpace = join(project.sourceRoot, "spaces", "linked-secret");
      symlinkSync(external, linkedSpace);
      project.commitAll("test: preserve an external linked space");

      const result = migrate(project, "--apply");

      expect(result.status).toBe(0);
      const report = parseReport(result);
      expect(report.status).toBe("applied");
      expect(report.evidence.doctor?.status).toBe("passed");
      expect(report.evidence.doctor?.output).not.toContain(secret);
      expect(result.stdout).not.toContain(secret);
      const migratedLink = join(project.destinationRoot, "spaces", "linked-secret");
      expect(lstatSync(migratedLink).isSymbolicLink()).toBe(true);
      expect(readlinkSync(migratedLink)).toBe(external);
      expect(readFileSync(registry)).toEqual(registryBefore);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("installed doctor does not follow a linked heartbeat directory or heartbeat file", () => {
    const project = fixture();
    const external = mkdtempSync(join(tmpdir(), "amadeus-linked-heartbeat-"));
    const secret = "DOCTOR_HEARTBEAT_SECRET_MUST_NOT_LEAK";
    const heartbeat = join(external, "external.last");
    const healthDir = join(
      project.destinationRoot,
      "spaces",
      "default",
      "intents",
      project.recordDir,
      ".amadeus-hooks-health",
    );
    try {
      writeFileSync(heartbeat, secret, "utf-8");
      const heartbeatBefore = readFileSync(heartbeat);
      const migrated = migrate(project, "--apply");
      expect(migrated.status).toBe(0);
      expect(existsSync(healthDir)).toBe(false);

      symlinkSync(
        external,
        healthDir,
        process.platform === "win32" ? "junction" : "dir",
      );
      const linkedDirectory = runInstalledDoctor(project);
      expect(linkedDirectory.stdout).not.toContain(secret);
      expect(linkedDirectory.stderr).not.toContain(secret);
      expect(lstatSync(healthDir).isSymbolicLink()).toBe(true);
      expect(readFileSync(heartbeat)).toEqual(heartbeatBefore);

      rmSync(healthDir, { recursive: true, force: true });
      mkdirSync(healthDir, { recursive: true });
      const linkedFile = join(healthDir, "linked.last");
      symlinkSync(heartbeat, linkedFile);
      const linkedHeartbeat = runInstalledDoctor(project);
      expect(linkedHeartbeat.stdout).not.toContain(secret);
      expect(linkedHeartbeat.stderr).not.toContain(secret);
      expect(lstatSync(linkedFile).isSymbolicLink()).toBe(true);
      expect(readFileSync(heartbeat)).toEqual(heartbeatBefore);

      rmSync(linkedFile, { force: true });
      const swappedFile = join(healthDir, "swapped.last");
      writeFileSync(swappedFile, "LOCAL_HEARTBEAT_BEFORE_SWAP", "utf-8");
      const swappedHeartbeat = runInstalledDoctor(project, {
        NODE_ENV: "test",
        AMADEUS_DOCTOR_TEST_SWAP_HEARTBEAT_TARGET: heartbeat,
      });
      expect(swappedHeartbeat.stdout).not.toContain(secret);
      expect(swappedHeartbeat.stderr).not.toContain(secret);
      expect(lstatSync(swappedFile).isSymbolicLink()).toBe(true);
      expect(readFileSync(heartbeat)).toEqual(heartbeatBefore);

      rmSync(healthDir, { recursive: true, force: true });
      mkdirSync(healthDir, { recursive: true });
      writeFileSync(join(healthDir, "local.last"), "LOCAL_HEARTBEAT", "utf-8");
      const swappedDirectory = runInstalledDoctor(project, {
        NODE_ENV: "test",
        AMADEUS_DOCTOR_TEST_SWAP_HEALTH_DIR_TARGET: external,
      });
      expect(swappedDirectory.stdout).not.toContain(secret);
      expect(swappedDirectory.stderr).not.toContain(secret);
      expect(lstatSync(healthDir).isSymbolicLink()).toBe(true);
      expect(readlinkSync(healthDir)).toBe(external);
      expect(readFileSync(heartbeat)).toEqual(heartbeatBefore);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("migration doctor does not inspect a heartbeat directory swapped after postcondition", () => {
    const project = fixture();
    const external = mkdtempSync(join(tmpdir(), "amadeus-migration-doctor-health-"));
    const secret = "MIGRATION_DOCTOR_PARENT_SECRET_MUST_NOT_LEAK";
    const heartbeat = join(external, "external.last");
    try {
      writeFileSync(heartbeat, secret, "utf-8");
      const heartbeatBefore = readFileSync(heartbeat);

      const result = migrateWithEnv(
        project,
        {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_DOCTOR_HEALTH_DIR_SYMLINK: external,
        },
        "--apply",
      );

      expect(result.status).toBe(0);
      const report = parseReport(result);
      expect(report.status).toBe("applied");
      expect(report.evidence.doctor?.status).toBe("passed");
      expect(report.evidence.doctor?.output).toContain(
        "Hook heartbeats: not inspected during migration",
      );
      expect(result.stdout).not.toContain(secret);
      expect(report.evidence.doctor?.output).not.toContain(secret);
      expect(readFileSync(heartbeat)).toEqual(heartbeatBefore);
      expect(
        existsSync(
          join(
            project.destinationRoot,
            "spaces",
            "default",
            "intents",
            project.recordDir,
            ".amadeus-hooks-health",
          ),
        ),
      ).toBe(false);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("apply migrates every state, registry, and cursor across multiple spaces and intents", () => {
    const project = fixture({ withMultipleSpacesAndIntents: true });
    expect(project.records).toHaveLength(3);
    const spaces = [...new Set(project.records.map((record) => record.space))].sort();
    expect(spaces).toEqual(["default", "platform"]);
    const registryBytes = new Map(
      spaces.map((space) => {
        const path = join(
          project.sourceRoot,
          "spaces",
          space,
          "intents",
          "intents.json",
        );
        return [space, readFileSync(path)] as const;
      }),
    );

    const result = migrate(project, "--apply");
    expect(result.status).toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("applied");
    expect(report.evidence).toMatchObject({ stateFiles: 3 });

    for (const record of project.records) {
      expect(
        existsSync(
          join(
            project.destinationRoot,
            "spaces",
            record.space,
            "intents",
            record.recordDir,
            "amadeus-state.md",
          ),
        ),
      ).toBe(true);
    }
    for (const space of spaces) {
      const migratedIntents = join(
        project.destinationRoot,
        "spaces",
        space,
        "intents",
      );
      const originalRegistry = registryBytes.get(space);
      if (!originalRegistry) throw new Error(`missing registry fixture for space ${space}`);
      expect(readFileSync(join(migratedIntents, "intents.json"))).toEqual(originalRegistry);
      const active = readFileSync(join(migratedIntents, "active-intent"), "utf-8").trim();
      expect(
        project.records.some((record) => record.space === space && record.recordDir === active),
      ).toBe(true);
    }
    expect(project.git(["diff", "--name-only"])).toBe("");
  });

  test("installed apply runs the real doctor and records only known append-only health events", () => {
    const project = fixture();
    const auditBefore = readFileSync(project.auditPath);
    const installedMigrator = installClaudeHarness(project, {
      validSettings: true,
    });

    const result = migrateWithTool(project, installedMigrator, "--apply");
    expect(result.status).toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("applied");
    expect(report.evidence.doctor?.status).toBe("passed");
    expect(report.evidence.auditAppends).toHaveLength(1);
    expect(report.evidence.auditAppends?.[0]?.events).toEqual([
      "GUARDRAIL_LOADED",
      "HEALTH_CHECKED",
    ]);
    expect(report.evidence.auditAppends?.[0]?.bytes).toBeGreaterThan(0);

    const migratedAudit = join(
      project.destinationRoot,
      relative(project.sourceRoot, project.auditPath),
    );
    expect(readFileSync(migratedAudit)).toEqual(auditBefore);
    expect(project.git(["diff", "--name-only"])).toBe("");
  });

  test("an installed migrator prefers its own harness doctor when harnesses coexist", () => {
    const project = fixture();
    const kiroRoot = join(project.projectDir, ".kiro");
    cpSync(join(REPO_ROOT, "dist", "kiro", ".kiro"), kiroRoot, {
      recursive: true,
    });
    cpSync(
      join(REPO_ROOT, "packages", "framework", "core", "tools"),
      join(kiroRoot, "tools"),
      { recursive: true },
    );
    rmSync(join(project.projectDir, ".claude", "settings.json"), { force: true });
    project.commitAll("test: install a second healthy harness");

    const result = migrateWithTool(
      project,
      join(kiroRoot, "tools", "amadeus-migrate.ts"),
      "--apply",
    );

    expect(result.status).toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("applied");
    expect(report.evidence.doctor?.status).toBe("passed");
  });

  test("doctor utility replacement immediately before execution is rejected without running it", () => {
    const project = fixture();
    const external = mkdtempSync(join(tmpdir(), "amadeus-doctor-utility-"));
    const marker = join(external, "executed.txt");
    const replacement = join(external, "amadeus-utility.ts");
    try {
      writeFileSync(
        replacement,
        `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(marker)}, "EXECUTED\\n");\n`,
        "utf-8",
      );
      const snapshotBefore = projectSnapshot(project.projectDir);
      const indexBefore = readFileSync(gitIndexPath(project));

      const result = migrateWithEnv(
        project,
        {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_DOCTOR_UTILITY_SYMLINK: replacement,
        },
        "--apply",
      );

      expect(result.status).not.toBe(0);
      const report = parseReport(result);
      expect(report.status).toBe("failed");
      expect(report.evidence.rollback).toEqual({ attempted: true, restored: true });
      expect(existsSync(marker)).toBe(false);
      expect(projectSnapshot(project.projectDir)).toBe(snapshotBefore);
      expect(readFileSync(gitIndexPath(project))).toEqual(indexBefore);
      expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("installed apply refuses a predicted audit shard symlink without touching its target", () => {
    const project = fixture();
    const installedMigrator = installClaudeHarness(project, {
      validSettings: true,
    });
    const external = mkdtempSync(join(tmpdir(), "amadeus-audit-target-"));
    const target = join(external, "sentinel.md");
    const sentinel = "AUDIT_SENTINEL_MUST_NOT_CHANGE\n";
    try {
      writeFileSync(target, sentinel, "utf-8");
      writeFileSync(
        join(project.sourceRoot, `.${UPSTREAM_FILE_PREFIX}clone-id`),
        "fixtureclone\n",
        "utf-8",
      );
      const host = hostname()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "host";
      symlinkSync(
        target,
        join(dirname(project.auditPath), `${host}-fixtureclone.md`),
      );
      project.commitAll("test: add a predicted audit shard symlink");
      const snapshotBefore = projectSnapshot(project.projectDir);
      const indexBefore = readFileSync(gitIndexPath(project));

      const result = migrateWithTool(project, installedMigrator, "--apply");

      expect(result.status).not.toBe(0);
      const report = parseReport(result);
      expect(report.status).toBe("refused");
      expect(report.mode).toBe("apply");
      expect(JSON.stringify(report)).toMatch(/audit[^"]*(symlink|non-regular)/i);
      expect(readFileSync(target, "utf-8")).toBe(sentinel);
      expect(projectSnapshot(project.projectDir)).toBe(snapshotBefore);
      expect(readFileSync(gitIndexPath(project))).toEqual(indexBefore);
      expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("installed doctor derives a stable clone id from a symlink without touching its target", () => {
    const project = fixture();
    const installedMigrator = installClaudeHarness(project, {
      validSettings: true,
    });
    const external = mkdtempSync(join(tmpdir(), "amadeus-clone-id-target-"));
    const target = join(external, "sentinel.txt");
    const sentinel = "CLONE_ID_SENTINEL_MUST_NOT_CHANGE\n";
    try {
      writeFileSync(target, sentinel, "utf-8");
      const cloneId = join(project.sourceRoot, `.${UPSTREAM_FILE_PREFIX}clone-id`);
      rmSync(cloneId, { force: true });
      symlinkSync(target, cloneId);

      const result = migrateWithTool(project, installedMigrator, "--apply");

      expect(result.status).toBe(0);
      const report = parseReport(result);
      expect(report.status).toBe("applied");
      expect(report.mode).toBe("apply");
      expect(report.evidence.doctor?.status).toBe("passed");
      expect(report.evidence.auditAppends?.[0]?.events).toEqual([
        "GUARDRAIL_LOADED",
        "HEALTH_CHECKED",
      ]);
      expect(readFileSync(target, "utf-8")).toBe(sentinel);
      const migratedCloneId = join(project.destinationRoot, ".amadeus-clone-id");
      expect(lstatSync(migratedCloneId).isSymbolicLink()).toBe(true);
      expect(readlinkSync(migratedCloneId)).toBe(target);
      expect(project.git(["diff", "--name-only"])).toBe("");
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("a real doctor failure rolls the workspace and Git index back", () => {
    const project = fixture();
    const installedMigrator = installClaudeHarness(project, {
      validSettings: false,
    });
    const beforeSnapshot = projectSnapshot(project.projectDir);
    const beforeIndex = project.git(["write-tree"]).trim();

    const result = migrateWithTool(project, installedMigrator, "--apply");
    expect(result.status).not.toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("failed");
    expect(report.evidence.rollback).toEqual({ attempted: true, restored: true });
    expect(projectSnapshot(project.projectDir)).toBe(beforeSnapshot);
    expect(project.git(["write-tree"]).trim()).toBe(beforeIndex);
  });

  test.each([
    ["after-seed-move"],
    ["after-source-move"],
    ["after-destination-replace"],
    ["after-manifest-restore"],
    ["after-gitignore-write"],
    ["after-workspace-write"],
    ["before-doctor"],
    ["after-doctor"],
    ["before-git-add"],
  ] as const)(
    "apply restores the source, installer seed, gitignore, and index when failure is injected at %s",
    (failurePoint) => {
      const project = fixture({ withInstallerSeed: true });
      const beforeSnapshot = projectSnapshot(project.projectDir);
      const beforeStatus = project.git(["status", "--porcelain=v1", "-z"]);
      const beforeIndex = project.git(["write-tree"]).trim();
      const manifestBefore = readFileSync(project.installerManifestPath);

      const result = migrateWithEnv(
        project,
        { AMADEUS_MIGRATE_TEST_FAIL_AT: failurePoint },
        "--apply",
      );
      expect(result.status).not.toBe(0);
      expect(result.stderr).toBe("");
      const report = parseReport(result);
      expect(report.status).toBe("failed");
      expect(report.mode).toBe("apply");
      expect(report.target).toBe("installer-seed");
      expect(report.evidence).toMatchObject({
        rollback: { attempted: true, restored: true },
      });

      expect(projectSnapshot(project.projectDir)).toBe(beforeSnapshot);
      expect(project.git(["status", "--porcelain=v1", "-z"])).toBe(beforeStatus);
      expect(project.git(["write-tree"]).trim()).toBe(beforeIndex);
      expect(existsSync(project.sourceRoot)).toBe(true);
      expect(existsSync(project.destinationRoot)).toBe(true);
      expect(readFileSync(project.installerManifestPath)).toEqual(manifestBefore);
    },
  );

  test("apply keeps the installer seed when failure occurs before moving it", () => {
    const project = fixture({ withInstallerSeed: true });
    const beforeSnapshot = projectSnapshot(project.projectDir);
    const beforeIndex = project.git(["write-tree"]).trim();

    const result = migrateWithEnv(
      project,
      { AMADEUS_MIGRATE_TEST_FAIL_AT: "before-seed-move" },
      "--apply",
    );
    expect(result.status).not.toBe(0);
    expect(parseReport(result).evidence).toMatchObject({
      rollback: { attempted: false, restored: true },
    });
    expect(projectSnapshot(project.projectDir)).toBe(beforeSnapshot);
    expect(project.git(["write-tree"]).trim()).toBe(beforeIndex);
  });

  test("apply retains rollback backups through final verification", () => {
    const project = fixture();
    const beforeSnapshot = projectSnapshot(project.projectDir);
    const beforeIndex = project.git(["write-tree"]).trim();

    const result = migrateWithEnv(
      project,
      { AMADEUS_MIGRATE_TEST_FAIL_AT: "before-final-verification" },
      "--apply",
    );
    expect(result.status).not.toBe(0);
    expect(parseReport(result).evidence).toMatchObject({
      rollback: { attempted: true, restored: true },
    });
    expect(projectSnapshot(project.projectDir)).toBe(beforeSnapshot);
    expect(project.git(["write-tree"]).trim()).toBe(beforeIndex);
  });

  test("rollback restores the Git index byte-for-byte including assume-unchanged flags", () => {
    const project = fixture();
    project.git(["update-index", "--assume-unchanged", "README.md"]);
    const indexPath = gitIndexPath(project);
    const indexBefore = readFileSync(indexPath);
    const flagBefore = project.git(["ls-files", "-v", "README.md"]);

    const result = migrateWithEnv(
      project,
      { AMADEUS_MIGRATE_TEST_FAIL_AT: "after-source-move" },
      "--apply",
    );

    expect(result.status).not.toBe(0);
    expect(parseReport(result).evidence.rollback).toEqual({
      attempted: true,
      restored: true,
    });
    const indexAfter = readFileSync(indexPath);
    expect(indexAfter).toEqual(indexBefore);
    expect(hashBytes(indexAfter)).toBe(hashBytes(indexBefore));
    expect(project.git(["ls-files", "-v", "README.md"])).toBe(flagBefore);
    expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");
  });

  test("rollback reports restoration failure when ignored durable backup data is corrupted", () => {
    const project = fixture();
    const indexBefore = readFileSync(gitIndexPath(project));
    const before = readFileSync(project.prefixedUserDataPath, "utf-8");

    const result = migrateWithEnv(
      project,
      {
        NODE_ENV: "test",
        AMADEUS_MIGRATE_TEST_CORRUPT_ROLLBACK_BACKUP: relative(
          project.sourceRoot,
          project.prefixedUserDataPath,
        ),
        AMADEUS_MIGRATE_TEST_FAIL_AT: "after-source-move",
      },
      "--apply",
    );

    expect(result.status).not.toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("failed");
    expect(report.evidence.rollback).toEqual({ attempted: true, restored: false });
    expect(report.warnings.join(" ")).toContain(
      "Automatic rollback did not restore the clean baseline.",
    );
    expect(readFileSync(project.prefixedUserDataPath, "utf-8")).toBe(
      `${before}corrupted rollback backup\n`,
    );
    expect(readFileSync(gitIndexPath(project))).toEqual(indexBefore);
    expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");
  });

  test("apply aborts when preserved ignored data changes after staging", () => {
    const project = fixture();
    const before = readFileSync(project.prefixedUserDataPath, "utf-8");
    const mutationPath = relative(
      project.sourceRoot,
      project.prefixedUserDataPath,
    );

    const result = migrateWithEnv(
      project,
      {
        NODE_ENV: "test",
        AMADEUS_MIGRATE_TEST_MUTATE_AFTER_COPY: mutationPath,
      },
      "--apply",
    );

    expect(result.status).not.toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("failed");
    expect(report.warnings.join(" ")).toContain(
      "Migration preflight changed before the workspace move.",
    );
    expect(report.evidence.rollback).toEqual({ attempted: false, restored: true });
    expect(readFileSync(project.prefixedUserDataPath, "utf-8")).toBe(
      `${before}concurrent update after migration staging\n`,
    );
    expect(existsSync(project.sourceRoot)).toBe(true);
    expect(existsSync(project.destinationRoot)).toBe(false);
    expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");
  });

  test.each(["source", "seed", "gitignore"] as const)(
    "commit-boundary check preserves a concurrent %s file update",
    (kind) => {
      const project = fixture({ withInstallerSeed: true });
      const target = kind === "source"
        ? project.prefixedUserDataPath
        : kind === "seed"
          ? project.installerSeedMemoryPath
          : join(project.projectDir, ".gitignore");
      const before = readFileSync(target, "utf-8");
      const manifestBefore = readFileSync(project.installerManifestPath);

      const result = migrateWithEnv(
        project,
        {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_MUTATE_BEFORE_COMMIT_PATH: relative(
            project.projectDir,
            target,
          ),
        },
        "--apply",
      );

      expect(result.status).not.toBe(0);
      const report = parseReport(result);
      expect(report.status).toBe("failed");
      expect(report.evidence.rollback).toEqual({ attempted: false, restored: true });
      expect(report.warnings.join(" ")).toContain(
        "Migration preflight changed before the workspace move.",
      );
      expect(readFileSync(target, "utf-8")).toBe(
        `${before}concurrent update before migration commit\n`,
      );
      expect(existsSync(project.sourceRoot)).toBe(true);
      expect(existsSync(project.destinationRoot)).toBe(true);
      expect(readFileSync(project.installerManifestPath)).toEqual(manifestBefore);
      expect(
        existsSync(
          join(
            project.destinationRoot,
            "spaces",
            "default",
            "intents",
            project.recordDir,
            "amadeus-state.md",
          ),
        ),
      ).toBe(false);
    },
  );

  test("commit-boundary check refuses a concurrent Git index update", () => {
    const project = fixture({ withInstallerSeed: true });
    const sourceStateBefore = readFileSync(project.statePath);
    const manifestBefore = readFileSync(project.installerManifestPath);

    const result = migrateWithEnv(
      project,
      {
        NODE_ENV: "test",
        AMADEUS_MIGRATE_TEST_MUTATE_BEFORE_COMMIT_INDEX: "1",
      },
      "--apply",
    );

    expect(result.status).not.toBe(0);
    const report = parseReport(result);
    expect(report.status).toBe("failed");
    expect(report.evidence.rollback).toEqual({ attempted: false, restored: true });
    expect(report.warnings.join(" ")).toContain(
      "Git index changed before the workspace mutation boundary.",
    );
    expect(project.git(["ls-files", "-v", "README.md"])).toStartWith("h ");
    expect(readFileSync(project.statePath)).toEqual(sourceStateBefore);
    expect(readFileSync(project.installerManifestPath)).toEqual(manifestBefore);
    expect(existsSync(project.sourceRoot)).toBe(true);
    expect(existsSync(project.destinationRoot)).toBe(true);
  });

  test("preflight refuses a workspace whose state version is not 7 without mutation", () => {
    const project = fixture({ stateVersion: 6 });
    expectReadOnlyRefusal(project, () => migrate(project), /state version/);
  });

  test("preflight refuses a dirty Git worktree without mutation", () => {
    const project = fixture();
    writeFileSync(join(project.projectDir, "uncommitted.txt"), "dirty\n", "utf-8");
    expectReadOnlyRefusal(project, () => migrate(project), /dirty|git-clean|must be clean/);
  });

  test("preflight refuses a modified installer seed without mutation", () => {
    const project = fixture({ modifiedInstallerSeed: true });
    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /installer[^"]*(modified|hash)|(modified|hash)[^"]*installer/,
    );
  });

  test("preflight refuses an installer seed on a different filesystem", () => {
    const project = fixture({ withInstallerSeed: true });
    expectReadOnlyRefusal(
      project,
      () =>
        migrateWithEnv(project, {
          AMADEUS_MIGRATE_TEST_DESTINATION_DEVICE_MISMATCH: "1",
        }),
      /same filesystem/,
    );
  });

  test("preflight refuses a modified installer-managed harness file", () => {
    const project = fixture({ withInstallerSeed: true });
    writeFileSync(
      join(project.projectDir, ".claude", "tools", "amadeus-runtime.ts"),
      "export const runtime = false;\n",
      "utf-8",
    );
    project.commitAll("test: modify installer-managed harness file");
    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /installer-managed file was modified|modified.*amadeus-runtime/,
    );
  });

  test("preflight refuses an installer-managed path that traverses a symlink", () => {
    const project = fixture({ withInstallerSeed: true });
    const harnessRoot = join(project.projectDir, ".claude");
    const tool = join(harnessRoot, "tools", "amadeus-runtime.ts");
    const outside = mkdtempSync(join(tmpdir(), "amadeus-seed-escape-"));
    try {
      mkdirSync(join(outside, "tools"), { recursive: true });
      writeFileSync(
        join(outside, "tools", "amadeus-runtime.ts"),
        readFileSync(tool),
      );
      rmSync(harnessRoot, { recursive: true, force: true });
      symlinkSync(
        outside,
        harnessRoot,
        process.platform === "win32" ? "junction" : "dir",
      );
      project.commitAll("test: route installer path through symlink");

      expectReadOnlyRefusal(
        project,
        () => migrate(project),
        /installer manifest contains an unsafe path/,
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test("preflight refuses extra empty data in an installer seed without mutation", () => {
    const project = fixture({ withInstallerSeed: true });
    mkdirSync(join(project.destinationRoot, "spaces", "extra-empty-space"), {
      recursive: true,
    });
    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /installer[^"]*(unexpected directory|destination)|(unexpected directory|destination)[^"]*installer/,
    );
  });

  test("preflight refuses a broken destination symlink without mutation", () => {
    const project = fixture();
    symlinkSync("missing-installer-seed", project.destinationRoot);
    project.commitAll("test: add broken destination symlink");
    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /destination|symlink|installer seed/,
    );
  });

  test("preflight refuses the reserved help intent slug without mutation", () => {
    const project = fixture({ intentSlug: "help" });
    expectReadOnlyRefusal(project, () => migrate(project), /help/);
  });

  test("preflight refuses an unresolved compose marker without mutation", () => {
    const project = fixture({ withComposePending: true });
    expectReadOnlyRefusal(project, () => migrate(project), /compose/);
  });

  test("preflight refuses a source outside the project root without inspecting or mutating it", () => {
    const project = fixture();
    const outside = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "amadeus-outside-source-"));
    try {
      writeFileSync(join(outside, "do-not-read.txt"), "outside\n", "utf-8");
      mkdirSync(join(outside, "audit"));
      writeFileSync(join(outside, "audit", "secret.txt"), "secret\n", "utf-8");
      const report = expectReadOnlyRefusal(
        project,
        () => migrateFrom(project, outside),
        /outside|project root|escape/,
      );
      expect(report.evidence).toMatchObject({ stateFiles: 0, auditBefore: {} });
      expect(JSON.stringify(report)).not.toContain("secret.txt");
      expect(readFileSync(join(outside, "do-not-read.txt"), "utf-8")).toBe("outside\n");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
