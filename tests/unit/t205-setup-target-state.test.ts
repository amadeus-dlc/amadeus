// covers: package:@amadeus-dlc/setup, installer:target-state, installer:manifest, requirements:FR-006, requirements:FR-009, requirements:FR-013, stories:US-005, stories:US-006, stories:US-007

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { executeSetupCommand } from "../../packages/setup/src/application/setup-service.ts";
import { FileSystemTargetManifestReader } from "../../packages/setup/src/adapters/target-manifest-reader.ts";
import type { Harness } from "../../packages/setup/src/cli/types.ts";
import { detectTarget } from "../../packages/setup/src/domain/target-detector.ts";
import { snapshotTarget } from "../../packages/setup/src/domain/target-snapshot.ts";
import { CANONICAL_SOURCE_REPO, type DistributionFile, type LoadedDistribution, type ResolvedVersion } from "../../packages/setup/src/domain/source-types.ts";
import { INSTALLER_MANIFEST_PATH, type InstallerManifest, type ManifestReadResult, type TargetDetection } from "../../packages/setup/src/domain/target-types.ts";
import type { ArchiveExtractorPort } from "../../packages/setup/src/ports/archive-extractor.ts";
import type { ArchiveSourcePort } from "../../packages/setup/src/ports/archive-source.ts";
import type { TagSourcePort } from "../../packages/setup/src/ports/tag-source.ts";
import type { PromptPort, TargetManifestReadPort, TargetReadOnlyFilePort } from "../../packages/setup/src/ports/target-state.ts";

const targetRoot = "/tmp/amadeus-target";
const resolvedVersion: ResolvedVersion = {
  distributionVersion: "1.2.3",
  sourceTag: "v1.2.3",
  sourceRepo: CANONICAL_SOURCE_REPO,
  ignoredTags: [],
};

function md5(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

function distributionFile(path: string, content = path): DistributionFile {
  return { path, class: "shared", required: true, md5: md5(content) };
}

function manifest(input: Partial<InstallerManifest> = {}): InstallerManifest {
  return {
    schemaVersion: 1,
    installerPackageVersion: "0.0.0",
    distributionVersion: "1.2.3",
    sourceTag: "v1.2.3",
    installedAt: "2026-07-07T00:00:00.000Z",
    harness: "codex",
    files: [distributionFile("AGENTS.md", "agents")],
    ...input,
  };
}

function manifestResult(status: "absent" | "invalid" | "unreadable"): ManifestReadResult {
  return {
    status,
    diagnostics: {
      status,
      reasonCode: status === "absent" ? "manifest-absent" : status === "invalid" ? "manifest-invalid" : "manifest-unreadable",
      manifestPath: INSTALLER_MANIFEST_PATH,
    },
  };
}

function validManifestResult(value: InstallerManifest): ManifestReadResult {
  return {
    status: "valid",
    manifest: value,
    diagnostics: { status: "valid", reasonCode: "manifest-valid", manifestPath: INSTALLER_MANIFEST_PATH },
  };
}

class StubManifestReader implements TargetManifestReadPort {
  constructor(private readonly result: ManifestReadResult) {}

  readManifestForDetection(): ManifestReadResult {
    return this.result;
  }
}

class FakeTargetFiles implements TargetReadOnlyFilePort {
  readonly existsCalls: string[] = [];
  readonly md5Calls: string[] = [];
  readonly readCalls: string[] = [];
  readonly writeCalls: string[] = [];
  private readonly entries = new Map<string, Uint8Array | Error>();
  private readonly existing = new Set<string>();
  private readonly md5Failures = new Set<string>();

  addExisting(path: string, content = ""): void {
    this.existing.add(path);
    this.entries.set(path, Buffer.from(content));
  }

  addUnreadable(path: string): void {
    this.existing.add(path);
    this.entries.set(path, new Error("unreadable"));
  }

  failMd5(path: string): void {
    this.md5Failures.add(path);
  }

  exists(path: string): boolean {
    this.existsCalls.push(path);
    return this.existing.has(path);
  }

  readFile(path: string): Uint8Array {
    this.readCalls.push(path);
    const entry = this.entries.get(path);
    if (entry instanceof Error || entry === undefined) {
      throw new Error("unreadable");
    }
    return entry;
  }

  md5(path: string): string {
    this.md5Calls.push(path);
    if (this.md5Failures.has(path)) {
      throw new Error("unreadable");
    }
    const entry = this.entries.get(path);
    if (entry instanceof Error || entry === undefined) {
      throw new Error("unreadable");
    }
    return createHash("md5").update(entry).digest("hex");
  }

  writeFile(path: string): void {
    this.writeCalls.push(path);
  }
}

async function detectWithFiles(files: FakeTargetFiles, requestedHarness?: Harness, manifestRead: ManifestReadResult = manifestResult("absent"), promptPort?: PromptPort) {
  return detectTarget({
    targetPath: targetRoot,
    requestedHarness,
    promptsAllowed: promptPort !== undefined,
    manifestReader: new StubManifestReader(manifestRead),
    files,
    promptPort,
  });
}

describe("U3 manifest target detection", () => {
  test("valid manifest wins and infers harness without sentinel reads", async () => {
    const files = new FakeTargetFiles();
    const result = await detectWithFiles(files, undefined, validManifestResult(manifest({ harness: "claude" })));

    expect(result.ok).toBe(true);
    if (result.ok && result.detection.state === "manifest-installed") {
      expect(result.detection.inferredHarness).toBe("claude");
      expect(result.detection.diagnostics.manifestRead.status).toBe("valid");
    }
    expect(files.existsCalls).toEqual([]);
    expect(files.writeCalls).toEqual([]);
  });

  test("requested harness mismatch is a no-write error", async () => {
    const result = await detectWithFiles(new FakeTargetFiles(), "codex", validManifestResult(manifest({ harness: "claude" })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("target-harness-mismatch");
      expect(result.error.noFilesModified).toBe(true);
    }
  });

  test("invalid manifest falls back to sentinel detection with diagnostics preserved", async () => {
    const files = new FakeTargetFiles();
    for (const path of [".codex", ".agents", "AGENTS.md", "amadeus"]) {
      files.addExisting(join(targetRoot, path));
    }

    const result = await detectWithFiles(files, "codex", manifestResult("invalid"));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detection.state).toBe("manual-or-unknown");
      expect(result.detection.diagnostics.manifestRead.status).toBe("invalid");
    }
  });

  test("unreadable manifest is diagnostic-only and falls back to sentinels", async () => {
    const files = new FakeTargetFiles();
    files.addUnreadable(join(targetRoot, INSTALLER_MANIFEST_PATH));
    for (const path of [".claude", "amadeus"]) {
      files.addExisting(join(targetRoot, path));
    }
    const reader = new FileSystemTargetManifestReader(files);

    const result = await detectTarget({
      targetPath: targetRoot,
      requestedHarness: "claude",
      promptsAllowed: false,
      manifestReader: reader,
      files,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detection.state).toBe("manual-or-unknown");
      expect(result.detection.diagnostics.manifestRead.status).toBe("unreadable");
    }
  });

  test("manifest path validation rejects absolute and parent-relative files", async () => {
    const files = new FakeTargetFiles();
    files.addExisting(
      join(targetRoot, INSTALLER_MANIFEST_PATH),
      JSON.stringify({
        ...manifest(),
        files: [{ path: "../escape.md", class: "shared", required: true, md5: md5("escape") }],
      }),
    );

    const result = await new FileSystemTargetManifestReader(files).readManifestForDetection(targetRoot);

    expect(result.status).toBe("invalid");
    expect(result.diagnostics.validationIssues).toContain("invalid-file-path");
  });
});

describe("U3 sentinel classification", () => {
  test("no requested harness infers exactly one full sentinel match", async () => {
    const files = new FakeTargetFiles();
    for (const path of [".codex", ".agents", "AGENTS.md", "amadeus"]) {
      files.addExisting(join(targetRoot, path));
    }

    const result = await detectWithFiles(files);

    expect(result.ok).toBe(true);
    if (result.ok && result.detection.state === "manual-or-unknown") {
      expect(result.detection.inferredHarness).toBe("codex");
    }
  });

  test("selected harness classifies partial and none separately", async () => {
    const partialFiles = new FakeTargetFiles();
    partialFiles.addExisting(join(targetRoot, ".codex"));

    const partial = await detectWithFiles(partialFiles, "codex");
    const none = await detectWithFiles(new FakeTargetFiles(), "claude");

    expect(partial.ok).toBe(true);
    if (partial.ok && partial.detection.state === "partial") {
      expect(partial.detection.missingPaths).toEqual([".agents", "AGENTS.md", "amadeus"]);
    }
    expect(none.ok).toBe(true);
    if (none.ok) {
      expect(none.detection.state).toBe("none");
    }
  });

  test("unsupported layout is bounded to the first-release sentinel surface", async () => {
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "amadeus"));

    const result = await detectWithFiles(files);

    expect(result.ok).toBe(true);
    if (result.ok && result.detection.state === "unsupported-layout") {
      expect(result.detection.reason).toContain("first-release harness sentinel");
    }
  });

  test("kiro and kiro-ide ambiguity is no-write unless prompt resolves it", async () => {
    const files = new FakeTargetFiles();
    for (const path of [".kiro", "AGENTS.md", "amadeus"]) {
      files.addExisting(join(targetRoot, path));
    }

    const ambiguous = await detectWithFiles(files);
    const resolved = await detectWithFiles(files, undefined, manifestResult("absent"), {
      chooseHarness() {
        return "kiro-ide";
      },
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

  test("legacy core and harness paths are not compatibility sentinels", async () => {
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "core"));
    files.addExisting(join(targetRoot, "harness"));

    const result = await detectWithFiles(files);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detection.state).toBe("none");
    }
    expect(files.existsCalls.some((path) => path.endsWith("/core") || path.endsWith("/harness"))).toBe(false);
  });
});

describe("U3 target snapshot and service boundary", () => {
  test("snapshot reads expected paths only and omits unreadable md5", async () => {
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "AGENTS.md"), "agents");
    files.addExisting(join(targetRoot, ".codex/config.toml"), "config");
    files.failMd5(join(targetRoot, ".codex/config.toml"));
    const detection = {
      state: "none",
      target: targetRoot,
      diagnostics: {
        manifestRead: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
        sentinelMatches: [],
      },
    } satisfies TargetDetection;

    const snapshot = await snapshotTarget({
      targetPath: targetRoot,
      detection,
      distributionFiles: [distributionFile("AGENTS.md", "agents"), distributionFile(".codex/config.toml", "config")],
      files,
    });

    expect(snapshot.existingFiles).toEqual([
      { path: ".codex/config.toml", exists: true },
      { path: "AGENTS.md", exists: true, md5: md5("agents") },
    ]);
    expect(snapshot.diagnostics.unknownMd5Count).toBe(1);
    expect(snapshot.diagnostics.unreadableFiles).toEqual([{ path: ".codex/config.toml", reasonCode: "md5-unreadable" }]);
    expect(files.existsCalls.sort()).toEqual([join(targetRoot, ".codex/config.toml"), join(targetRoot, "AGENTS.md")].sort());
    expect(files.writeCalls).toEqual([]);
  });

  test("snapshot includes valid manifest context without scanning target", async () => {
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "AGENTS.md"), "agents");
    const detection = {
      state: "manifest-installed",
      target: targetRoot,
      manifest: manifest({ files: [distributionFile("old.md", "old")] }),
      inferredHarness: "codex",
      diagnostics: {
        manifestRead: { status: "valid", reasonCode: "manifest-valid", manifestPath: INSTALLER_MANIFEST_PATH },
        sentinelMatches: [],
      },
    } satisfies TargetDetection;

    const snapshot = await snapshotTarget({
      targetPath: targetRoot,
      detection,
      distributionFiles: [distributionFile("AGENTS.md", "agents")],
      files,
    });

    expect(snapshot.existingFiles.map((file) => file.path)).toEqual(["AGENTS.md", "old.md"]);
    expect(files.existsCalls).toEqual([join(targetRoot, "AGENTS.md"), join(targetRoot, "old.md")]);
  });

  test("service resolves source, detects target, snapshots, and stops before planning or apply", async () => {
    const files = new FakeTargetFiles();
    for (const path of [".codex", ".agents", "AGENTS.md", "amadeus"]) {
      files.addExisting(join(targetRoot, path), path);
    }
    const distribution: LoadedDistribution = {
      root: "/tmp/source-dist",
      harness: "codex",
      resolvedVersion,
      files: [{ path: "AGENTS.md", absolutePath: "/tmp/source-dist/AGENTS.md", md5: md5("agents") }],
    };
    const tagSource: TagSourcePort = {
      async listTags() {
        return { ok: true, value: ["v1.2.3"] };
      },
    };
    const archiveSource: ArchiveSourcePort = {
      async fetchArchive() {
        return { ok: true, value: { archivePath: "/tmp/archive" } };
      },
    };
    const archiveExtractor: ArchiveExtractorPort = {
      async extractHarness() {
        return { ok: true, value: distribution };
      },
      async cleanup() {},
    };

    const result = await executeSetupCommand(
      { command: "upgrade", target: targetRoot, harness: "codex", version: undefined, yes: true, force: false },
      {
        tagSource,
        archiveSource,
        archiveExtractor,
        readMetadata() {
          return { ok: true, value: [distributionFile("AGENTS.md", "agents")] };
        },
        targetManifestReader: new StubManifestReader(manifestResult("absent")),
        targetFiles: files,
      },
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Code: downstream-not-implemented");
    expect(result.stderr).toContain("detected target state manual-or-unknown");
    expect(result.stderr).toContain("snapshotted 1 expected files");
    expect(files.writeCalls).toEqual([]);
    expect(files.md5Calls).toEqual([join(targetRoot, "AGENTS.md")]);
  });
});
