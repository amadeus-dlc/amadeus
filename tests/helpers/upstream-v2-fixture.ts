import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(TESTS_ROOT, "..");

/** The foreign workspace name is assembled so the repository prefix guard stays exact. */
export const UPSTREAM_WORKSPACE_NAME = ["ai", "dlc"].join("");
export const UPSTREAM_FILE_PREFIX = `${UPSTREAM_WORKSPACE_NAME}-`;

const DEFAULT_UUID = "00000000-0000-7000-8000-00000000cafe";
const DEFAULT_RECORD_SUFFIX = DEFAULT_UUID.replaceAll("-", "").slice(-16);
const DEFAULT_INTENT_SLUG = "checkout";
const DEFAULT_SPACE = "default";

export interface UpstreamV2FixtureOptions {
  stateVersion?: number;
  intentSlug?: string;
  withInstallerSeed?: boolean;
  modifiedInstallerSeed?: boolean;
  withComposePending?: boolean;
  withMultipleSpacesAndIntents?: boolean;
  preIntentLayout?: "absent" | "scratch";
}

export interface UpstreamV2RecordFixture {
  space: string;
  slug: string;
  recordDir: string;
  statePath: string;
}

export interface UpstreamV2Fixture {
  projectDir: string;
  sourceRoot: string;
  destinationRoot: string;
  recordDir: string;
  statePath: string;
  auditPath: string;
  binaryPath: string;
  symlinkPath: string;
  runtimePath: string;
  prefixedUserDataPath: string;
  sourceMemoryPath: string;
  installerManifestPath: string;
  installerSeedMemoryPath: string;
  records: readonly UpstreamV2RecordFixture[];
  commitAll(message?: string): void;
  git(args: readonly string[]): string;
  cleanup(): void;
}

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function writeText(path: string, body: string): void {
  ensureParent(path);
  writeFileSync(path, body, "utf-8");
}

function md5(path: string): string {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

function runGit(projectDir: string, args: readonly string[]): string {
  const result = spawnSync("git", args, {
    cwd: projectDir,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout ?? "";
}

function seedInstallerWorkspace(
  projectDir: string,
  modifiedAfterManifest: boolean,
): { manifestPath: string; memoryPath: string } {
  const memoryPath = join(projectDir, "amadeus", "spaces", DEFAULT_SPACE, "memory", "org.md");
  writeText(memoryPath, "# Installer seed\n\nPristine framework defaults.\n");
  const harnessToolPath = join(
    projectDir,
    ".claude",
    "tools",
    "amadeus-runtime.ts",
  );
  if (!existsSync(harnessToolPath)) {
    writeText(harnessToolPath, "export const runtime = true;\n");
  }

  const manifestPath = join(
    projectDir,
    "amadeus",
    ".installer",
    "amadeus-setup-manifest.json",
  );
  writeText(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        installerPackageVersion: "9.9.9",
        distributionVersion: "v9.9.9",
        sourceTag: "v9.9.9",
        installedAt: "2026-07-14T00:00:00.000Z",
        harness: "claude",
        files: [
          {
            path: "amadeus/spaces/default/memory/org.md",
            class: "shared",
            required: true,
            md5: md5(memoryPath),
          },
          {
            path: ".claude/tools/amadeus-runtime.ts",
            class: "owned",
            required: true,
            md5: md5(harnessToolPath),
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  if (modifiedAfterManifest) {
    writeText(memoryPath, "# Installer seed\n\nUser-modified framework defaults.\n");
  }
  return { manifestPath, memoryPath };
}

function installProjectHarness(projectDir: string, sourceRoot: string): void {
  const memoryRoot = join(sourceRoot, "spaces", DEFAULT_SPACE, "memory");
  rmSync(memoryRoot, { recursive: true, force: true });
  cpSync(join(REPO_ROOT, "packages", "framework", "core", "memory"), memoryRoot, {
    recursive: true,
  });

  const harnessRoot = join(projectDir, ".claude");
  cpSync(join(REPO_ROOT, "dist", "claude", ".claude"), harnessRoot, {
    recursive: true,
  });
  cpSync(
    join(REPO_ROOT, "packages", "framework", "core", "tools"),
    join(harnessRoot, "tools"),
    { recursive: true },
  );
  cpSync(
    join(harnessRoot, "settings.json.example"),
    join(harnessRoot, "settings.json"),
  );
}

/**
 * Create a committed, clean Git repository containing a minimal upstream-v2
 * workspace. Machine-local files are present but ignored, matching a real
 * checkout rather than a synthetic all-tracked tree.
 */
export function createUpstreamV2Fixture(
  options: UpstreamV2FixtureOptions = {},
): UpstreamV2Fixture {
  let projectDir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "amadeus-upstream-v2-"));
  try {
    projectDir = realpathSync(projectDir);
  } catch {
    // Keep the raw path on platforms where the temporary directory cannot be canonicalised.
  }

  const stateVersion = options.stateVersion ?? 7;
  const intentSlug = options.intentSlug ?? DEFAULT_INTENT_SLUG;
  const recordDir = `${intentSlug}-${DEFAULT_RECORD_SUFFIX}`;
  const sourceRoot = join(projectDir, UPSTREAM_WORKSPACE_NAME);
  const destinationRoot = join(projectDir, "amadeus");
  const intentsRoot = join(
    sourceRoot,
    "spaces",
    DEFAULT_SPACE,
    "intents",
  );
  const recordRoot = join(intentsRoot, recordDir);

  runGit(projectDir, ["init", "-q"]);
  runGit(projectDir, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  writeText(join(projectDir, "README.md"), "# Migration fixture\n");

  writeText(join(sourceRoot, "active-space"), `${DEFAULT_SPACE}\n`);
  writeText(join(intentsRoot, "active-intent"), `${recordDir}\n`);
  const defaultRegistry = [
    {
      uuid: DEFAULT_UUID,
      slug: intentSlug,
      dirName: recordDir,
      status: "in-flight",
      scope: "feature",
    },
  ];
  const additionalDefaultUuid = "00000000-0000-7000-8000-00000000beef";
  const additionalDefaultSlug = "inventory";
  const additionalDefaultRecord = `${additionalDefaultSlug}-${additionalDefaultUuid
    .replaceAll("-", "")
    .slice(-16)}`;
  if (options.withMultipleSpacesAndIntents) {
    defaultRegistry.push({
      uuid: additionalDefaultUuid,
      slug: additionalDefaultSlug,
      dirName: additionalDefaultRecord,
      status: "in-flight",
      scope: "feature",
    });
  }
  writeText(
    join(intentsRoot, "intents.json"),
    `${JSON.stringify(defaultRegistry, null, 2)}\n`,
  );

  const stateTemplate = readFileSync(
    join(TESTS_ROOT, "fixtures", "state-brownfield-feature.md"),
    "utf-8",
  );
  const stateBody = stateTemplate
    .replace("- **State Version**: 7", `- **State Version**: ${stateVersion}`)
    .replaceAll("amadeus-", UPSTREAM_FILE_PREFIX)
    .replace("/home/user/projects/shop-app", projectDir);
  const statePath = join(recordRoot, `${UPSTREAM_FILE_PREFIX}state.md`);
  writeText(statePath, stateBody);
  const records: UpstreamV2RecordFixture[] = [
    { space: DEFAULT_SPACE, slug: intentSlug, recordDir, statePath },
  ];

  if (options.withMultipleSpacesAndIntents) {
    const additionalStatePath = join(
      intentsRoot,
      additionalDefaultRecord,
      `${UPSTREAM_FILE_PREFIX}state.md`,
    );
    writeText(additionalStatePath, stateBody);
    records.push({
      space: DEFAULT_SPACE,
      slug: additionalDefaultSlug,
      recordDir: additionalDefaultRecord,
      statePath: additionalStatePath,
    });

    const platformSpace = "platform";
    const platformUuid = "00000000-0000-7000-8000-00000000d00d";
    const platformSlug = "delivery";
    const platformRecord = `${platformSlug}-${platformUuid.replaceAll("-", "").slice(-16)}`;
    const platformIntents = join(sourceRoot, "spaces", platformSpace, "intents");
    const platformStatePath = join(
      platformIntents,
      platformRecord,
      `${UPSTREAM_FILE_PREFIX}state.md`,
    );
    writeText(join(platformIntents, "active-intent"), `${platformRecord}\n`);
    writeText(
      join(platformIntents, "intents.json"),
      `${JSON.stringify(
        [
          {
            uuid: platformUuid,
            slug: platformSlug,
            dirName: platformRecord,
            status: "in-flight",
            scope: "infra",
          },
        ],
        null,
        2,
      )}\n`,
    );
    writeText(platformStatePath, stateBody);
    writeText(join(sourceRoot, "spaces", platformSpace, "memory", "org.md"), "# Platform rules\n");
    writeText(join(sourceRoot, "spaces", platformSpace, "codekb", ".gitkeep"), "");
    records.push({
      space: platformSpace,
      slug: platformSlug,
      recordDir: platformRecord,
      statePath: platformStatePath,
    });
  }

  const sourceMemoryPath = join(sourceRoot, "spaces", DEFAULT_SPACE, "memory", "org.md");
  writeText(
    sourceMemoryPath,
    `# Organisation rules\n\nUse \`${UPSTREAM_WORKSPACE_NAME}/spaces/default\` as the workspace root.\n`,
  );
  writeText(join(sourceRoot, "spaces", DEFAULT_SPACE, "memory", "team.md"), "# Team rules\n");
  writeText(join(sourceRoot, "spaces", DEFAULT_SPACE, "memory", "project.md"), "# Project rules\n");
  writeText(
    join(sourceRoot, "spaces", DEFAULT_SPACE, "memory", "phases", "inception.md"),
    "# Inception rules\n",
  );
  writeText(
    join(sourceRoot, "spaces", DEFAULT_SPACE, "knowledge", `${UPSTREAM_FILE_PREFIX}shared`, "README.md"),
    "# Shared knowledge\n",
  );
  writeText(
    join(
      sourceRoot,
      "spaces",
      DEFAULT_SPACE,
      "knowledge",
      `${UPSTREAM_FILE_PREFIX}developer-agent`,
      "README.md",
    ),
    "# Developer knowledge\n",
  );
  writeText(
    join(sourceRoot, "spaces", DEFAULT_SPACE, "knowledge", "runtime-graph.json"),
    '{"durable":true}\n',
  );
  writeText(
    join(
      sourceRoot,
      "spaces",
      DEFAULT_SPACE,
      "knowledge",
      `.${UPSTREAM_FILE_PREFIX}recovery.md`,
    ),
    "durable recovery guidance\n",
  );
  writeText(join(sourceRoot, "spaces", DEFAULT_SPACE, "codekb", ".gitkeep"), "");
  writeText(join(sourceRoot, ".migrated"), "v2\n");

  const artifactPath = join(recordRoot, "inception", "requirements-analysis", "requirements.md");
  writeText(
    artifactPath,
    `# Requirements\n\nRun \`/${UPSTREAM_WORKSPACE_NAME} --status\` and read \`${UPSTREAM_WORKSPACE_NAME}/spaces/default\`.\n`,
  );

  const auditPath = join(recordRoot, "audit", "fixture.md");
  writeText(
    auditPath,
    `# Audit\n\n- Source: ${UPSTREAM_WORKSPACE_NAME}/spaces/default/intents/${recordDir}\n- Agent: ${UPSTREAM_FILE_PREFIX}product-agent\n`,
  );

  const binaryPath = join(recordRoot, "assets", "sample.bin");
  ensureParent(binaryPath);
  writeFileSync(binaryPath, Buffer.from([0x00, 0xff, 0x10, 0x80, 0x41, 0x42]));

  const symlinkPath = join(recordRoot, "latest-requirements");
  symlinkSync(join("inception", "requirements-analysis", "requirements.md"), symlinkPath);

  const runtimePath = join(recordRoot, "runtime-graph.json");
  writeText(runtimePath, '{"discard":true}\n');
  writeText(join(sourceRoot, `.${UPSTREAM_FILE_PREFIX}clone-id`), "fixture-clone\n");
  writeText(join(sourceRoot, `.${UPSTREAM_FILE_PREFIX}sessions`, "session.json"), "{}\n");
  writeText(join(sourceRoot, `.${UPSTREAM_FILE_PREFIX}turn-counter`), "3\n");
  writeText(
    join(intentsRoot, `.${UPSTREAM_FILE_PREFIX}hooks-health`, "submit.last"),
    "2026-07-14T00:00:00.000Z\n",
  );
  writeText(join(recordRoot, `.${UPSTREAM_FILE_PREFIX}recovery.md`), "scratch\n");
  const prefixedUserDataPath = join(
    recordRoot,
    `.${UPSTREAM_FILE_PREFIX}user-notes.md`,
  );
  writeText(prefixedUserDataPath, "durable user notes\n");
  if (options.withComposePending) {
    writeText(join(sourceRoot, `.${UPSTREAM_FILE_PREFIX}compose-pending`), "pending\n");
  }
  if (options.preIntentLayout !== undefined) {
    rmSync(intentsRoot, { recursive: true, force: true });
    if (options.preIntentLayout === "scratch") {
      writeText(
        join(intentsRoot, `.${UPSTREAM_FILE_PREFIX}hooks-health`, "submit.last"),
        "2026-07-14T00:00:00.000Z\n",
      );
    }
    records.length = 0;
  }

  const ignoredRoot = `${UPSTREAM_WORKSPACE_NAME}/.${UPSTREAM_FILE_PREFIX}`;
  writeText(
    join(projectDir, ".gitignore"),
    [
      `${UPSTREAM_WORKSPACE_NAME}/active-space`,
      `${UPSTREAM_WORKSPACE_NAME}/spaces/*/intents/active-intent`,
      `${ignoredRoot}clone-id`,
      `${ignoredRoot}sessions/`,
      `${ignoredRoot}compose-pending`,
      `${ignoredRoot}turn-counter`,
      `${UPSTREAM_WORKSPACE_NAME}/spaces/*/intents/*/runtime-graph.json`,
      `${UPSTREAM_WORKSPACE_NAME}/spaces/*/intents/.${UPSTREAM_FILE_PREFIX}*`,
      `${UPSTREAM_WORKSPACE_NAME}/spaces/*/intents/*/.${UPSTREAM_FILE_PREFIX}*`,
      "",
    ].join("\n"),
  );

  installProjectHarness(projectDir, sourceRoot);

  let installerManifestPath = join(destinationRoot, ".installer", "amadeus-setup-manifest.json");
  let installerSeedMemoryPath = join(destinationRoot, "spaces", DEFAULT_SPACE, "memory", "org.md");
  if (options.withInstallerSeed || options.modifiedInstallerSeed) {
    const seed = seedInstallerWorkspace(projectDir, options.modifiedInstallerSeed === true);
    installerManifestPath = seed.manifestPath;
    installerSeedMemoryPath = seed.memoryPath;
  }

  const commitAll = (message = "test: seed upstream workspace"): void => {
    runGit(projectDir, ["add", "-A"]);
    runGit(projectDir, [
      "-c",
      "user.name=Migration Fixture",
      "-c",
      "user.email=migration-fixture@example.invalid",
      "commit",
      "-qm",
      message,
    ]);
  };
  commitAll();

  return {
    projectDir,
    sourceRoot,
    destinationRoot,
    recordDir,
    statePath,
    auditPath,
    binaryPath,
    symlinkPath,
    runtimePath,
    prefixedUserDataPath,
    sourceMemoryPath,
    installerManifestPath,
    installerSeedMemoryPath,
    records,
    commitAll,
    git: (args) => runGit(projectDir, args),
    cleanup: () => rmSync(projectDir, { recursive: true, force: true }),
  };
}

interface SnapshotEntry {
  path: string;
  kind: "directory" | "file" | "symlink";
  mode: number;
  value?: string;
}

/** Hash every non-Git entry without following symlinks. */
export function projectSnapshot(projectDir: string): string {
  const entries: SnapshotEntry[] = [];

  const walk = (absoluteDir: string): void => {
    for (const name of readdirSync(absoluteDir).sort()) {
      if (absoluteDir === projectDir && name === ".git") continue;
      const absolutePath = join(absoluteDir, name);
      const stat = lstatSync(absolutePath);
      const path = relative(projectDir, absolutePath).split(sep).join("/");
      const mode = stat.mode & 0o777;
      if (stat.isSymbolicLink()) {
        entries.push({ path, kind: "symlink", mode, value: readlinkSync(absolutePath) });
        continue;
      }
      if (stat.isDirectory()) {
        entries.push({ path, kind: "directory", mode });
        walk(absolutePath);
        continue;
      }
      entries.push({
        path,
        kind: "file",
        mode,
        value: createHash("sha256").update(readFileSync(absolutePath)).digest("hex"),
      });
    }
  };

  if (existsSync(projectDir)) walk(projectDir);
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}
