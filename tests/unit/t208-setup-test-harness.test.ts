// covers: package:@amadeus-dlc/setup, installer:test-harness, requirements:FR-005, requirements:FR-006, requirements:FR-007, requirements:FR-008, requirements:FR-009, requirements:FR-010, requirements:FR-011, requirements:FR-012, requirements:FR-013, requirements:FR-014, requirements:NFR-001, requirements:NFR-002, requirements:NFR-003, requirements:NFR-004, stories:US-001, stories:US-002, stories:US-003, stories:US-004, stories:US-005, stories:US-006, stories:US-007, stories:US-008, stories:US-010, stories:US-012

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ArchiveExtractor } from "../../packages/setup/src/adapters/archive-extractor.ts";
import { runRenderedSetupCommand } from "../helpers/setup/index.ts";
import { renderPlan } from "../../packages/setup/src/cli/reporter.ts";
import { detectTarget } from "../../packages/setup/src/domain/target-detector.ts";
import { planInstall } from "../../packages/setup/src/domain/operation-planner.ts";
import { INSTALLER_MANIFEST_PATH } from "../../packages/setup/src/domain/target-types.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";
import {
  assertSetupCoverageHandoff,
  collectSetupCoverageEntries,
  createTempWorkspace,
  DEFAULT_RESOLVED_VERSION,
  distributionFile,
  fakeArchiveSource,
  fakePromptPort,
  fakeTagSource,
  FakeTargetFiles,
  installCommand,
  installerManifest,
  loadedDistribution,
  md5,
  normalizeInstallerOutput,
  seedCodexDistributionDir,
  seedTargetFixture,
  SETUP_TEST_FILES,
  stablePlanSnapshot,
} from "../helpers/setup/index.ts";

const BUN_ENTRYPOINT = join(REPO_ROOT, "packages", "setup", "src", "bin", "amadeus-setup.ts");
const WRAPPER = join(REPO_ROOT, "packages", "setup", "bin", "amadeus-setup.js");

describe("U6 setup test harness", () => {
  test("fixture builders produce deterministic distribution metadata", () => {
    const file = distributionFile("AGENTS.md", { content: "agents" });
    expect(file.md5).toBe(md5("agents"));
    expect(installerManifest().harness).toBe("codex");
    expect(DEFAULT_RESOLVED_VERSION.sourceTag).toBe("v1.2.3");
  });

  test("fake tag and archive ports expose deterministic retry behavior", async () => {
    const tags = fakeTagSource(["v1.2.3", "v1.4.0"]);
    const tagResult = await tags.listTags("https://github.com/amadeus-dlc/amadeus");
    expect(tagResult.ok).toBe(true);

    const transient = fakeArchiveSource({ archivePath: "/tmp/archive", mode: "transient-then-success" });
    const first = await transient.fetchArchive({ sourceRepo: "https://github.com/amadeus-dlc/amadeus", sourceTag: "v1.2.3" });
    const second = await transient.fetchArchive({ sourceRepo: "https://github.com/amadeus-dlc/amadeus", sourceTag: "v1.2.3" });
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(true);
    expect(transient.fetchCalls).toBe(2);

    const failing = fakeArchiveSource({ archivePath: "/tmp/archive", mode: "failure" });
    const exhausted = await failing.fetchArchive({ sourceRepo: "https://github.com/amadeus-dlc/amadeus", sourceTag: "v1.2.3" });
    expect(exhausted.ok).toBe(false);
    if (!exhausted.ok) {
      expect(exhausted.error.code).toBe("archive-fetch-failed");
      expect(exhausted.error.noFilesModified).toBe(true);
    }
  });

  test("target fixtures seed isolated temp states without touching real projects", () => {
    const workspace = createTempWorkspace("amadeus-setup-harness-target-");
    try {
      seedTargetFixture(workspace.root, "clean");
      expect(existsSync(join(workspace.root, INSTALLER_MANIFEST_PATH))).toBe(false);

      seedTargetFixture(workspace.root, "manifest-installed", { manifestVersion: "1.0.0" });
      expect(existsSync(join(workspace.root, INSTALLER_MANIFEST_PATH))).toBe(true);

      const ambiguous = createTempWorkspace("amadeus-setup-harness-ambiguous-");
      try {
        seedTargetFixture(ambiguous.root, "ambiguous-harness");
        expect(existsSync(join(ambiguous.root, ".kiro"))).toBe(true);
        expect(existsSync(join(ambiguous.root, "AGENTS.md"))).toBe(true);
      } finally {
        ambiguous.cleanup();
      }
    } finally {
      workspace.cleanup();
    }
  });

  test("snapshot normalizer removes host-specific temp paths and timestamps", () => {
    const raw = [
      "Target: /var/folders/zz/abc/T/amadeus-setup-12345",
      "Installed at 2026-07-07T12:34:56.000Z",
      "Backup: AGENTS.md.20260707T123456Z.bk",
    ].join("\n");
    expect(normalizeInstallerOutput(raw)).toBe(
      [
        "Target: <TEMP>",
        "Installed at <TIMESTAMP>",
        "Backup: AGENTS.md.<BACKUP_TS>.bk",
      ].join("\n"),
    );
  });

  test("coverage handoff lists setup tests with covers headers for U7", () => {
    const handoff = assertSetupCoverageHandoff();
    expect(handoff.ok).toBe(true);
    if (handoff.ok) {
      expect(handoff.entries.map((entry) => entry.file)).toEqual([...SETUP_TEST_FILES]);
      expect(handoff.entries.every((entry) => entry.covers.includes("package:@amadeus-dlc/setup"))).toBe(true);
      const requirements = new Set(handoff.entries.flatMap((entry) => entry.requirements));
      expect(requirements.has("FR-011")).toBe(true);
      const stories = new Set(handoff.entries.flatMap((entry) => entry.stories));
      expect(stories.has("US-012")).toBe(true);
    }
    const registry = collectSetupCoverageEntries();
    expect(registry.find((entry) => entry.file.endsWith("t208-setup-test-harness.test.ts"))?.covers).toContain("installer:test-harness");
  });
});

describe("U6 setup integration via harness", () => {
  test("clean install to temp target succeeds with fake ports", async () => {
    const source = createTempWorkspace("amadeus-setup-harness-source-");
    const target = createTempWorkspace("amadeus-setup-harness-target-");
    try {
      seedCodexDistributionDir(source.root);
      const result = await runRenderedSetupCommand(
        { command: "install", harness: "codex", target: target.root, version: undefined, yes: true, force: false },
        {
          tagSource: fakeTagSource(["v1.2.3"]),
          archiveSource: fakeArchiveSource({ archivePath: source.root }),
          archiveExtractor: new ArchiveExtractor(),
        },
      );

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Installed Amadeus.");
      expect(existsSync(join(target.root, "AGENTS.md"))).toBe(true);
      expect(existsSync(join(target.root, INSTALLER_MANIFEST_PATH))).toBe(true);
    } finally {
      source.cleanup();
      target.cleanup();
    }
  });

  test("manifest-first upgrade uses harness target fixture and stays no-write when already current", async () => {
    const source = createTempWorkspace("amadeus-setup-harness-upgrade-source-");
    const target = createTempWorkspace("amadeus-setup-harness-upgrade-target-");
    try {
      seedCodexDistributionDir(source.root);
      seedTargetFixture(target.root, "manifest-installed", { manifestVersion: "1.2.3" });
      const result = await runRenderedSetupCommand(
        { command: "upgrade", harness: "codex", target: target.root, version: undefined, yes: true, force: false },
        {
          tagSource: fakeTagSource(["v1.2.3"]),
          archiveSource: fakeArchiveSource({ archivePath: source.root }),
          archiveExtractor: new ArchiveExtractor(),
        },
      );

      expect(result.code).toBe(2);
      expect(result.stderr).toContain("already at the requested distribution version");
      expect(result.stderr).toContain("No files were modified.");
    } finally {
      source.cleanup();
      target.cleanup();
    }
  });

  test("non-interactive collision is no-write without force", async () => {
    const source = createTempWorkspace("amadeus-setup-harness-collision-source-");
    const target = createTempWorkspace("amadeus-setup-harness-collision-target-");
    try {
      seedCodexDistributionDir(source.root);
      seedTargetFixture(target.root, "manual-or-unknown");
      const result = await runRenderedSetupCommand(
        { command: "install", harness: "codex", target: target.root, version: undefined, yes: true, force: false },
        {
          tagSource: fakeTagSource(["v1.2.3"]),
          archiveSource: fakeArchiveSource({ archivePath: source.root }),
          archiveExtractor: new ArchiveExtractor(),
        },
      );

      expect(result.code).toBe(2);
      expect(result.stderr).toContain("collision");
      expect(result.stderr).toContain("No files were modified.");
      expect(existsSync(join(target.root, INSTALLER_MANIFEST_PATH))).toBe(false);
    } finally {
      source.cleanup();
      target.cleanup();
    }
  });

  test("archive fetch failure after retry leaves target untouched", async () => {
    const target = createTempWorkspace("amadeus-setup-harness-fetch-target-");
    try {
      const result = await runRenderedSetupCommand(
        { command: "install", harness: "codex", target: target.root, version: undefined, yes: true, force: false },
        {
          tagSource: fakeTagSource(["v1.2.3"]),
          archiveSource: fakeArchiveSource({ archivePath: "/tmp/missing", mode: "failure" }),
          archiveExtractor: new ArchiveExtractor(),
        },
      );

      expect(result.code).toBe(2);
      expect(result.stderr).toContain("archive-fetch-failed");
      expect(result.stderr).toContain("No files were modified.");
      expect(existsSync(join(target.root, "AGENTS.md"))).toBe(false);
    } finally {
      target.cleanup();
    }
  });

  test("kiro and kiro-ide ambiguity is no-write unless prompt resolves harness", async () => {
    const files = new FakeTargetFiles();
    seedTargetFixture("/tmp/unused", "ambiguous-harness");
    for (const path of [".kiro", "AGENTS.md", "amadeus"]) {
      files.addExisting(join("/tmp/target", path), path === "AGENTS.md" ? "agents" : "");
    }

    const ambiguous = await detectTarget({
      targetPath: "/tmp/target",
      requestedHarness: undefined,
      promptsAllowed: false,
      manifestReader: { readManifestForDetection: () => ({ status: "absent", diagnostics: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH } }) },
      files,
    });
    const resolved = await detectTarget({
      targetPath: "/tmp/target",
      requestedHarness: undefined,
      promptsAllowed: true,
      manifestReader: { readManifestForDetection: () => ({ status: "absent", diagnostics: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH } }) },
      files,
      promptPort: fakePromptPort({ chooseHarness: () => "kiro-ide" }),
    });

    expect(ambiguous.ok).toBe(true);
    if (ambiguous.ok && ambiguous.detection.state === "ambiguous-harness") {
      expect(ambiguous.detection.candidates).toEqual(["kiro", "kiro-ide"]);
    }
    expect(resolved.ok).toBe(true);
    if (resolved.ok && resolved.detection.state === "manual-or-unknown") {
      expect(resolved.detection.inferredHarness).toBe("kiro-ide");
    }
  });

  test("plan and report output stay consistent through harness snapshot helper", () => {
    const target = "/tmp/project";
    const file = distributionFile("AGENTS.md", { content: "agents" });
    const plan = planInstall({
      command: installCommand({ target, yes: true }),
      mode: "non-interactive",
      harness: "codex",
      target,
      distribution: loadedDistribution("/tmp/source", "codex", [file]),
      metadata: [file],
      targetDetection: {
        state: "none",
        target,
        diagnostics: {
          manifestRead: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
          sentinelMatches: [],
        },
      },
      targetSnapshot: {
        target,
        detection: {
          state: "none",
          target,
          diagnostics: {
            manifestRead: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
            sentinelMatches: [],
          },
        },
        existingFiles: [],
        diagnostics: { expectedFileCount: 0, unknownMd5Count: 0, unreadableFiles: [] },
      },
      operationTimestamp: new Date("2026-07-07T12:34:56.000Z"),
      backupPathExists: () => false,
    });

    const rendered = renderPlan(plan);
    expect(stablePlanSnapshot(rendered)).toContain("| Operation | Files | Example |");
    expect(stablePlanSnapshot(rendered)).toContain("| add | 1 | AGENTS.md |");
    expect(stablePlanSnapshot(rendered)).not.toContain("/tmp/project");
  });
});

describe("U6 setup smoke via harness", () => {
  test("Bun entrypoint help smoke uses repository constants", () => {
    const result = spawnSync(process.execPath, [BUN_ENTRYPOINT, "--help"], { encoding: "utf-8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("amadeus-setup install");
    expect(result.stdout).toContain("amadeus-setup upgrade");
    expect(result.stderr).toBe("");
  });

  test("Node wrapper smoke reports bun-required without Bun on PATH", () => {
    const emptyPath = createTempWorkspace("amadeus-setup-harness-empty-path-");
    try {
      const node = spawnSync("bash", ["-lc", "command -v node"], { encoding: "utf-8" });
      const nodeExecutable = node.status === 0 && node.stdout.trim().length > 0 ? node.stdout.trim() : "node";
      const result = spawnSync(nodeExecutable, [WRAPPER, "--help"], {
        encoding: "utf-8",
        env: { PATH: emptyPath.root },
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Bun is required");
      expect(result.stderr).toContain("No files were modified.");
    } finally {
      emptyPath.cleanup();
    }
  });
});
