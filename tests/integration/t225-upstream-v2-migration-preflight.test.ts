// covers: cli:amadeus-migrate(dry-run)
//
// Refusal contract for upstream-v2 migration preflight. Every case mutates a
// real committed fixture, invokes the public CLI, and proves that refusal is
// read-only at both the filesystem and Git levels.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
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
  sourceVersion: string;
}

function fixture(
  options: Parameters<typeof createUpstreamV2Fixture>[0] = {},
): UpstreamV2Fixture {
  const created = createUpstreamV2Fixture(options);
  fixtures.push(created);
  return created;
}

function migrate(project: UpstreamV2Fixture, source = project.sourceRoot): CliResult {
  const result = spawnSync(
    process.execPath,
    [
      MIGRATE_TOOL,
      "--project-dir",
      project.projectDir,
      "--from",
      source,
      "--json",
    ],
    {
      cwd: project.projectDir,
      encoding: "utf-8",
      timeout: 20_000,
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function migrateWithEnv(
  project: UpstreamV2Fixture,
  extraEnv: NodeJS.ProcessEnv,
): CliResult {
  const result = spawnSync(
    process.execPath,
    [
      MIGRATE_TOOL,
      "--project-dir",
      project.projectDir,
      "--from",
      project.sourceRoot,
      "--json",
    ],
    {
      cwd: project.projectDir,
      encoding: "utf-8",
      env: { ...process.env, ...extraEnv },
      timeout: 20_000,
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function gitIndexPath(project: UpstreamV2Fixture): string {
  const raw = project.git(["rev-parse", "--git-path", "index"]).trim();
  return isAbsolute(raw) ? raw : resolve(project.projectDir, raw);
}

function expectReadOnlyRefusal(
  project: UpstreamV2Fixture,
  run: () => CliResult,
  diagnostic: RegExp,
): MigrationReport {
  const snapshotBefore = projectSnapshot(project.projectDir);
  const statusBefore = project.git(["status", "--porcelain=v1", "-z"]);
  const indexPath = gitIndexPath(project);
  const indexBefore = readFileSync(indexPath);
  const result = run();

  expect(result.status).not.toBe(0);
  expect(result.stderr).toBe("");
  const report = JSON.parse(result.stdout) as MigrationReport;
  expect(report.schemaVersion).toBe(1);
  expect(report.status).toBe("refused");
  expect(report.mode).toBe("dry-run");
  expect(JSON.stringify(report).toLowerCase()).toMatch(diagnostic);
  expect(projectSnapshot(project.projectDir)).toBe(snapshotBefore);
  expect(readFileSync(indexPath)).toEqual(indexBefore);
  expect(project.git(["status", "--porcelain=v1", "-z"])).toBe(statusBefore);
  return report;
}

function expectReadOnlyReady(
  project: UpstreamV2Fixture,
  run: () => CliResult,
  sourceVersion: string,
): void {
  const snapshotBefore = projectSnapshot(project.projectDir);
  const statusBefore = project.git(["status", "--porcelain=v1", "-z"]);
  const indexPath = gitIndexPath(project);
  const indexBefore = readFileSync(indexPath);
  const result = run();

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  const report = JSON.parse(result.stdout) as MigrationReport;
  expect(report.schemaVersion).toBe(1);
  expect(report.status).toBe("ready");
  expect(report.mode).toBe("dry-run");
  expect(report.sourceVersion).toBe(sourceVersion);
  expect(projectSnapshot(project.projectDir)).toBe(snapshotBefore);
  expect(readFileSync(indexPath)).toEqual(indexBefore);
  expect(project.git(["status", "--porcelain=v1", "-z"])).toBe(statusBefore);
}

function declareUpstreamVersion(project: UpstreamV2Fixture, version: string): void {
  const toolsRoot = join(project.projectDir, ".codex", "tools");
  mkdirSync(toolsRoot, { recursive: true });
  writeFileSync(
    join(toolsRoot, `${UPSTREAM_WORKSPACE_NAME}-version.ts`),
    `export const ${["AI", "DLC_VERSION"].join("")} = "${version}";\n`,
    "utf-8",
  );
  project.commitAll(`test: declare upstream version ${version}`);
}

function mountInfoFor(path: string): string {
  const escaped = path
    .replaceAll("\\", "\\134")
    .replaceAll(" ", "\\040")
    .replaceAll("\t", "\\011")
    .replaceAll("\n", "\\012");
  return `42 31 0:42 / ${escaped} rw,relatime - bind bind rw\n`;
}

afterEach(() => {
  for (const project of fixtures.splice(0)) project.cleanup();
});

describe("t225 upstream-v2 migration preflight refusals", () => {
  test("refuses migration when no project-local Amadeus engine is installed", () => {
    const project = fixture();
    rmSync(join(project.projectDir, ".claude"), { recursive: true, force: true });
    project.commitAll("test: remove installed Amadeus engine");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /installed amadeus engine|amadeus-utility|doctor/,
    );
  });

  test("refuses a symlinked project-local Amadeus utility", () => {
    const project = fixture();
    const utility = join(
      project.projectDir,
      ".claude",
      "tools",
      "amadeus-utility.ts",
    );
    const target = `${utility}.target`;
    renameSync(utility, target);
    symlinkSync(basename(target), utility);
    project.commitAll("test: symlink installed Amadeus utility");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /installed amadeus engine|amadeus-utility|doctor/,
    );
  });

  test("refuses an assume-unchanged modification in the doctor tool dependency tree", () => {
    const project = fixture();
    const relativeLib = ".claude/tools/amadeus-lib.ts";
    const library = join(project.projectDir, relativeLib);
    project.git(["update-index", "--assume-unchanged", "--", relativeLib]);
    writeFileSync(
      library,
      Buffer.concat([
        readFileSync(library),
        Buffer.from("\n// hidden dependency modification\n", "utf-8"),
      ]),
    );
    expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /installed amadeus engine|amadeus-utility|doctor/,
    );
  });

  test("refuses a missing source without mutating the committed project", () => {
    const project = fixture();
    rmSync(project.sourceRoot, { recursive: true, force: true });
    project.commitAll("test: remove migration source");

    expectReadOnlyRefusal(project, () => migrate(project), /source[^"]*does not exist/);
  });

  test("refuses a non-UTF-8 gitignore without changing its bytes or Git index", () => {
    const project = fixture();
    const gitignore = join(project.projectDir, ".gitignore");
    writeFileSync(
      gitignore,
      Buffer.concat([
        Buffer.from(`${UPSTREAM_WORKSPACE_NAME}/active-space\n`, "utf-8"),
        Buffer.from([0xff, 0x00]),
      ]),
    );
    project.commitAll("test: use a binary gitignore");

    expectReadOnlyRefusal(project, () => migrate(project), /gitignore[^"]*(utf-8|nul)/);
  });

  test("refuses the legacy v1 docs layout without mutating it", () => {
    const project = fixture();
    const legacyRoot = join(project.projectDir, ["ai", "dlc-docs"].join(""));
    rmSync(project.sourceRoot, { recursive: true, force: true });
    mkdirSync(legacyRoot, { recursive: true });
    writeFileSync(join(legacyRoot, `${UPSTREAM_FILE_PREFIX}state.md`), "# Legacy v1 state\n", "utf-8");
    project.commitAll("test: seed legacy v1 docs layout");

    expectReadOnlyRefusal(project, () => migrate(project, legacyRoot), /v2 spaces|workspace-layout/);
  });

  test("refuses an existing operational destination without mutating either workspace", () => {
    const project = fixture();
    const existingRecord = join(
      project.destinationRoot,
      "spaces",
      "default",
      "intents",
      "existing-0000000000000001",
    );
    mkdirSync(existingRecord, { recursive: true });
    writeFileSync(join(existingRecord, "amadeus-state.md"), "# Existing workflow\n", "utf-8");
    project.commitAll("test: seed operational destination");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /destination[^"]*(exists|installer)|installer-managed seed/,
    );
  });

  test("refuses an installer manifest with no seeded files without mutation", () => {
    const project = fixture();
    const manifestPath = join(
      project.destinationRoot,
      ".installer",
      "amadeus-setup-manifest.json",
    );
    mkdirSync(join(project.destinationRoot, ".installer"), { recursive: true });
    writeFileSync(
      manifestPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          installerPackageVersion: "9.9.9",
          distributionVersion: "9.9.9",
          sourceTag: "v9.9.9",
          installedAt: "2026-07-14T00:00:00.000Z",
          harness: "claude",
          files: [],
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );
    project.commitAll("test: seed empty installer manifest");

    expectReadOnlyRefusal(project, () => migrate(project), /installer|manifest|files/);
  });

  test("refuses an installer manifest containing invalid UTF-8", () => {
    const project = fixture({ withInstallerSeed: true });
    const manifest = readFileSync(project.installerManifestPath);
    const marker = manifest.indexOf("2026-07-14");
    expect(marker).toBeGreaterThanOrEqual(0);
    manifest[marker + 1] = 0xff;
    writeFileSync(project.installerManifestPath, manifest);
    project.commitAll("test: corrupt installer manifest encoding");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /installer manifest[^"]*(utf-8|nul|malformed)/,
    );
  });

  test("refuses a seed whose installer manifest traverses a symlink without reading it", () => {
    const project = fixture({ withInstallerSeed: true });
    const external = mkdtempSync(join(tmpdir(), "amadeus-external-manifest-"));
    const installerDir = join(project.destinationRoot, ".installer");
    const sentinel = "EXTERNAL_MANIFEST_MUST_NOT_BE_READ";
    try {
      writeFileSync(
        join(external, "amadeus-setup-manifest.json"),
        sentinel,
        "utf-8",
      );
      rmSync(installerDir, { recursive: true, force: true });
      symlinkSync(
        external,
        installerDir,
        process.platform === "win32" ? "junction" : "dir",
      );
      project.commitAll("test: route installer manifest through a symlink");

      const report = expectReadOnlyRefusal(
        project,
        () => migrate(project),
        /installer manifest path[^"]*symlink/,
      );
      expect(JSON.stringify(report)).not.toContain(sentinel);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("refuses a source installer symlink without touching its external manifest", () => {
    const project = fixture({ withInstallerSeed: true });
    const external = mkdtempSync(join(tmpdir(), "amadeus-source-installer-"));
    const target = join(external, "amadeus-setup-manifest.json");
    const sentinel = "SOURCE_INSTALLER_SENTINEL_MUST_NOT_CHANGE\n";
    try {
      writeFileSync(target, sentinel, "utf-8");
      symlinkSync(
        external,
        join(project.sourceRoot, ".installer"),
        process.platform === "win32" ? "junction" : "dir",
      );
      project.commitAll("test: add a source installer symlink");

      expectReadOnlyRefusal(project, () => migrate(project), /source \.installer[^"]*symlink/);
      expect(readFileSync(target, "utf-8")).toBe(sentinel);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("refuses a registry and record mismatch without mutating the source", () => {
    const project = fixture();
    const registryPath = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
      "intents.json",
    );
    writeFileSync(registryPath, "[]\n", "utf-8");
    project.commitAll("test: break registry record reconciliation");

    expectReadOnlyRefusal(project, () => migrate(project), /registry[^"]*do not reconcile/);
  });

  test("refuses an active cursor in an otherwise pre-Intent workspace", () => {
    const project = fixture({ preIntentLayout: "absent" });
    const intentsRoot = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
    );
    mkdirSync(intentsRoot, { recursive: true });
    writeFileSync(join(intentsRoot, "active-intent"), "missing-record\n", "utf-8");

    expectReadOnlyRefusal(project, () => migrate(project), /registry|cursor/);
  });

  test("refuses a malformed registry in an otherwise pre-Intent workspace", () => {
    const project = fixture({ preIntentLayout: "absent" });
    const intentsRoot = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
    );
    mkdirSync(intentsRoot, { recursive: true });
    writeFileSync(join(intentsRoot, "intents.json"), "{not-json}\n", "utf-8");
    project.commitAll("test: add malformed empty registry");

    expectReadOnlyRefusal(project, () => migrate(project), /registry|malformed/);
  });

  test("refuses an intent registry containing invalid UTF-8", () => {
    const project = fixture();
    const registryPath = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
      "intents.json",
    );
    const registry = readFileSync(registryPath);
    const marker = registry.indexOf("checkout");
    expect(marker).toBeGreaterThanOrEqual(0);
    registry[marker + 1] = 0xff;
    writeFileSync(registryPath, registry);
    project.commitAll("test: corrupt intent registry encoding");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /registry[^"]*(utf-8|nul|malformed)/,
    );
  });

  test.skipIf(process.platform === "win32")(
    "refuses an ignored FIFO in the source without blocking or reading it",
    () => {
      const project = fixture();
      const relativePipe = `${UPSTREAM_WORKSPACE_NAME}/spaces/default/knowledge/pipe`;
      writeFileSync(
        join(project.projectDir, ".gitignore"),
        `${readFileSync(join(project.projectDir, ".gitignore"), "utf-8")}/${relativePipe}\n`,
        "utf-8",
      );
      project.commitAll("test: ignore a source fifo");
      const pipe = join(project.projectDir, relativePipe);
      mkdirSync(join(pipe, ".."), { recursive: true });
      const created = spawnSync("mkfifo", [pipe], { encoding: "utf-8" });
      expect(created.status).toBe(0);
      const indexBefore = readFileSync(gitIndexPath(project));
      try {
        const result = migrate(project);
        expect(result.status).not.toBe(0);
        const report = JSON.parse(result.stdout) as MigrationReport;
        expect(report.status).toBe("refused");
        expect(JSON.stringify(report)).toMatch(/source[^"]*(special|non-regular)|entry type/i);
        expect(readFileSync(gitIndexPath(project))).toEqual(indexBefore);
        expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");
      } finally {
        rmSync(pipe, { force: true });
      }
    },
  );

  test("refuses a nested source filesystem boundary without mutation", () => {
    const project = fixture();

    expectReadOnlyRefusal(
      project,
      () =>
        migrateWithEnv(project, {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_SOURCE_NESTED_DEVICE_MISMATCH:
            "spaces/default/knowledge",
        }),
      /source entries[^"]*filesystem boundary|source-entry-filesystems/,
    );
  });

  test("refuses a nested installer-seed filesystem boundary without mutation", () => {
    const project = fixture({ withInstallerSeed: true });

    expectReadOnlyRefusal(
      project,
      () =>
        migrateWithEnv(project, {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_SEED_NESTED_DEVICE_MISMATCH:
            "spaces/default/memory",
        }),
      /installer seed entry[^"]*filesystem boundary|destination/,
    );
  });

  test("refuses a same-device nested source mountpoint from escaped mountinfo", () => {
    const project = fixture();
    const mounted = join(
      project.sourceRoot,
      "spaces",
      "default",
      "knowledge",
      "mounted secret",
    );
    mkdirSync(mounted, { recursive: true });
    writeFileSync(join(mounted, "sentinel.txt"), "MOUNT_SENTINEL\n", "utf-8");
    project.commitAll("test: seed a simulated source mountpoint");

    expectReadOnlyRefusal(
      project,
      () =>
        migrateWithEnv(project, {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_MOUNTINFO: mountInfoFor(mounted),
        }),
      /source[^"]*(mount|reparse)[^"]*boundar|source-mount-boundaries/,
    );
  });

  test("refuses a same-device nested installer-seed mountpoint from mountinfo", () => {
    const project = fixture({ withInstallerSeed: true });
    const mounted = join(
      project.destinationRoot,
      "spaces",
      "default",
      "memory",
    );

    expectReadOnlyRefusal(
      project,
      () =>
        migrateWithEnv(project, {
          NODE_ENV: "test",
          AMADEUS_MIGRATE_TEST_MOUNTINFO: mountInfoFor(mounted),
        }),
      /installer seed[^"]*(mount|reparse)[^"]*boundar|destination/,
    );
  });

  test.skipIf(process.platform === "win32")(
    "refuses an upstream version FIFO without blocking or reading it",
    () => {
      const project = fixture();
      const relativePipe = `.codex/tools/${UPSTREAM_WORKSPACE_NAME}-version.ts`;
      writeFileSync(
        join(project.projectDir, ".gitignore"),
        `${readFileSync(join(project.projectDir, ".gitignore"), "utf-8")}/${relativePipe}\n`,
        "utf-8",
      );
      project.commitAll("test: ignore an upstream version fifo");
      const pipe = join(project.projectDir, relativePipe);
      mkdirSync(join(pipe, ".."), { recursive: true });
      const created = spawnSync("mkfifo", [pipe], { encoding: "utf-8" });
      expect(created.status).toBe(0);
      const indexBefore = readFileSync(gitIndexPath(project));
      try {
        const result = migrate(project);
        expect(result.status).not.toBe(0);
        const report = JSON.parse(result.stdout) as MigrationReport;
        expect(report.status).toBe("refused");
        expect(JSON.stringify(report)).toMatch(/version[^"]*(malformed|non-regular)/i);
        expect(readFileSync(gitIndexPath(project))).toEqual(indexBefore);
        expect(project.git(["status", "--porcelain=v1", "-z"])).toBe("");
      } finally {
        rmSync(pipe, { force: true });
      }
    },
  );

  test("refuses an uppercase legacy registry UUID and record suffix without mutation", () => {
    const project = fixture();
    const intentsRoot = join(project.sourceRoot, "spaces", "default", "intents");
    const uppercaseRecordDir = project.recordDir.replace(/cafe$/, "CAFE");
    renameSync(
      join(intentsRoot, project.recordDir),
      join(intentsRoot, uppercaseRecordDir),
    );
    writeFileSync(
      join(intentsRoot, "intents.json"),
      `${JSON.stringify(
        [
          {
            uuid: "00000000-0000-7000-8000-00000000CAFE",
            slug: "checkout",
            status: "in-flight",
            scope: "feature",
          },
        ],
        null,
        2,
      )}\n`,
      "utf-8",
    );
    writeFileSync(join(intentsRoot, "active-intent"), `${uppercaseRecordDir}\n`, "utf-8");
    project.commitAll("test: uppercase legacy registry identity");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /registry[^"]*do not reconcile/,
    );
  });

  test("refuses an explicit registry dirName that does not match its record", () => {
    const project = fixture();
    const registryPath = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
      "intents.json",
    );
    const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as Array<
      Record<string, unknown>
    >;
    registry[0].dirName = "wrong-directory";
    writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf-8");
    project.commitAll("test: break explicit registry directory");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /registry[^"]*do not reconcile/,
    );
  });

  test("refuses an intent registry symlink without mutating the source", () => {
    const project = fixture();
    const registryPath = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
      "intents.json",
    );
    const registryTarget = `${registryPath}.target`;
    renameSync(registryPath, registryTarget);
    symlinkSync(basename(registryTarget), registryPath);
    project.commitAll("test: replace intent registry with symlink");

    expectReadOnlyRefusal(project, () => migrate(project), /registry|symbolic|symlink/);
  });

  test("refuses a record whose state file is missing without throwing", () => {
    const project = fixture();
    rmSync(project.statePath);
    project.commitAll("test: remove record state");

    expectReadOnlyRefusal(project, () => migrate(project), /state|record|registry/);
  });

  test.each([
    ["invalid UTF-8", Buffer.from([0xff])],
    ["a NUL byte", Buffer.from([0x00])],
  ] as const)("refuses a state file containing %s", (_label, suffix) => {
    const project = fixture();
    writeFileSync(
      project.statePath,
      Buffer.concat([readFileSync(project.statePath), suffix]),
    );
    project.commitAll("test: make state encoding invalid");

    expectReadOnlyRefusal(project, () => migrate(project), /state[^"]*(utf-8|nul)/);
  });

  test("refuses a State Version 7 record with a missing required field", () => {
    const project = fixture();
    const state = readFileSync(project.statePath, "utf-8");
    writeFileSync(
      project.statePath,
      state.replace(/^- \*\*Test Strategy\*\*:.*\r?\n/m, ""),
      "utf-8",
    );
    project.commitAll("test: remove required state field");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /test strategy|state validation/,
    );
  });

  test("refuses a record with a nested duplicate state file", () => {
    const project = fixture();
    const duplicate = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
      project.recordDir,
      "nested",
      `${UPSTREAM_FILE_PREFIX}state.md`,
    );
    mkdirSync(join(duplicate, ".."), { recursive: true });
    writeFileSync(duplicate, readFileSync(project.statePath));
    project.commitAll("test: duplicate record state");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /state.*(unique|exactly|validation)/,
    );
  });

  test("refuses a stray state file outside an Intent record during dry-run", () => {
    const project = fixture();
    const stray = join(
      project.sourceRoot,
      "spaces",
      "default",
      "memory",
      `${UPSTREAM_FILE_PREFIX}state.md`,
    );
    writeFileSync(stray, readFileSync(project.statePath));
    project.commitAll("test: add a stray upstream state");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /state inventory|outside validated record roots|state-inventory/,
    );
  });

  test("refuses an active-intent cursor that names a slug instead of a record directory", () => {
    const project = fixture({ withMultipleSpacesAndIntents: true });
    const cursor = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
      "active-intent",
    );
    writeFileSync(cursor, "checkout\n", "utf-8");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /active intent cursor|active-intent/,
    );
  });

  test("refuses a state filename collision without mutating the source", () => {
    const project = fixture();
    const destinationState = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
      project.recordDir,
      "amadeus-state.md",
    );
    writeFileSync(destinationState, readFileSync(project.statePath));
    project.commitAll("test: add state rename collision");

    expectReadOnlyRefusal(project, () => migrate(project), /state validation|collision/);
  });

  test("refuses a state file symlink without mutating the source", () => {
    const project = fixture();
    const stateTarget = `${project.statePath}.target`;
    renameSync(project.statePath, stateTarget);
    symlinkSync(basename(stateTarget), project.statePath);
    project.commitAll("test: replace state with symlink");

    expectReadOnlyRefusal(project, () => migrate(project), /state|symbolic|symlink/);
  });

  test("refuses a clone-id rename collision without mutating the source", () => {
    const project = fixture();
    writeFileSync(join(project.sourceRoot, ".amadeus-clone-id"), "conflicting-clone\n", "utf-8");
    project.commitAll("test: add clone id rename collision");

    expectReadOnlyRefusal(project, () => migrate(project), /clone|collision/);
  });

  test("refuses a knowledge directory rename collision without mutating the source", () => {
    const project = fixture();
    const destinationKnowledge = join(
      project.sourceRoot,
      "spaces",
      "default",
      "knowledge",
      "amadeus-shared",
    );
    mkdirSync(destinationKnowledge, { recursive: true });
    writeFileSync(join(destinationKnowledge, "README.md"), "# Conflicting knowledge\n", "utf-8");
    project.commitAll("test: add knowledge rename collision");

    expectReadOnlyRefusal(project, () => migrate(project), /knowledge|collision/);
  });

  test("refuses an active Bolt reference without mutating the source", () => {
    const project = fixture();
    const state = readFileSync(project.statePath, "utf-8").replace(
      "- **Bolt Refs**:",
      "- **Bolt Refs**: bolt-checkout-01",
    );
    writeFileSync(project.statePath, state, "utf-8");
    project.commitAll("test: activate bolt reference");

    expectReadOnlyRefusal(project, () => migrate(project), /state validation|bolt/);
  });

  test("refuses an active-intent cursor symlink without mutating the source", () => {
    const project = fixture();
    const cursorPath = join(
      project.sourceRoot,
      "spaces",
      "default",
      "intents",
      "active-intent",
    );
    const cursorTarget = `${cursorPath}.target`;
    renameSync(cursorPath, cursorTarget);
    symlinkSync(basename(cursorTarget), cursorPath);
    project.commitAll("test: replace active intent cursor with symlink");

    expectReadOnlyRefusal(project, () => migrate(project), /active-intent|cursor|symbolic|symlink/);
  });

  test("refuses destination-named runtime scratch without following its external symlink", () => {
    const project = fixture();
    const external = mkdtempSync(join(tmpdir(), "amadeus-runtime-scratch-"));
    const secret = "EXTERNAL_HEARTBEAT_SECRET_MUST_NOT_LEAK";
    const heartbeat = join(external, "external.last");
    try {
      writeFileSync(heartbeat, secret, "utf-8");
      const heartbeatBefore = readFileSync(heartbeat);
      symlinkSync(
        external,
        join(dirname(project.statePath), ".amadeus-hooks-health"),
        process.platform === "win32" ? "junction" : "dir",
      );
      project.commitAll("test: add destination-named runtime scratch");

      const report = expectReadOnlyRefusal(
        project,
        () => migrate(project),
        /destination[^"]*runtime scratch|destination-runtime-scratch/,
      );

      expect(JSON.stringify(report)).not.toContain(secret);
      expect(readFileSync(heartbeat)).toEqual(heartbeatBefore);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });

  test("refuses a registered upstream worktree without mutating either checkout", () => {
    const project = fixture();
    const worktreeRoot = join(
      project.projectDir,
      `.${UPSTREAM_WORKSPACE_NAME}`,
      "worktrees",
      "active-bolt",
    );
    const gitignorePath = join(project.projectDir, ".gitignore");
    writeFileSync(
      gitignorePath,
      `${readFileSync(gitignorePath, "utf-8")}.${UPSTREAM_WORKSPACE_NAME}/worktrees/\n`,
      "utf-8",
    );
    project.commitAll("test: ignore upstream worktree storage");
    project.git(["worktree", "add", "--detach", worktreeRoot, "HEAD"]);

    expectReadOnlyRefusal(project, () => migrate(project), /registered upstream worktrees/);
  });

  test.each([["2.2.0"], ["2.2.10"]] as const)(
    "accepts supported upstream version boundary %s without mutation",
    (version) => {
      const project = fixture();
      declareUpstreamVersion(project, version);

      expectReadOnlyReady(project, () => migrate(project), version);
    },
  );

  test("refuses a known upstream version outside the supported range without mutation", () => {
    const project = fixture();
    declareUpstreamVersion(project, "2.1.9");

    expectReadOnlyRefusal(project, () => migrate(project), /unsupported upstream version 2\.1\.9/);
  });

  test("refuses the first known upstream version above the supported range without mutation", () => {
    const project = fixture();
    declareUpstreamVersion(project, "2.2.11");

    expectReadOnlyRefusal(project, () => migrate(project), /unsupported upstream version 2\.2\.11/);
  });

  test("refuses an upstream version file whose version declaration is malformed", () => {
    const project = fixture();
    const toolsRoot = join(project.projectDir, ".codex", "tools");
    mkdirSync(toolsRoot, { recursive: true });
    writeFileSync(
      join(toolsRoot, `${UPSTREAM_WORKSPACE_NAME}-version.ts`),
      "export const version = unknown;\n",
      "utf-8",
    );
    project.commitAll("test: add malformed upstream version file");

    expectReadOnlyRefusal(project, () => migrate(project), /version[^"]*(malformed|parse|declaration)/);
  });

  test("refuses an upstream version file containing invalid UTF-8", () => {
    const project = fixture();
    declareUpstreamVersion(project, "2.2.10");
    const versionPath = join(
      project.projectDir,
      ".codex",
      "tools",
      `${UPSTREAM_WORKSPACE_NAME}-version.ts`,
    );
    writeFileSync(
      versionPath,
      Buffer.concat([readFileSync(versionPath), Buffer.from([0xff])]),
    );
    project.commitAll("test: corrupt upstream version encoding");

    expectReadOnlyRefusal(
      project,
      () => migrate(project),
      /version[^"]*(malformed|utf-8)/,
    );
  });
});
