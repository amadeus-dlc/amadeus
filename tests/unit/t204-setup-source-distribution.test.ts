// covers: package:@amadeus-dlc/setup, installer:source-distribution, requirements:FR-007, requirements:FR-012, requirements:FR-013, stories:US-002, stories:US-005, stories:US-012

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { ArchiveExtractor } from "../../packages/setup/src/adapters/archive-extractor.ts";
import { GitHubArchiveSource } from "../../packages/setup/src/adapters/github-source.ts";
import { executeSetupCommand } from "../../packages/setup/src/application/setup-service.ts";
import { renderSetupResult } from "../../packages/setup/src/cli/setup-result-renderer.ts";
import { readDistributionMetadata, DISTRIBUTION_METADATA_PATH } from "../../packages/setup/src/domain/distribution-metadata.ts";
import { CANONICAL_SOURCE_REPO, type LoadedDistribution, type ResolvedVersion } from "../../packages/setup/src/domain/source-types.ts";
import { INSTALLER_MANIFEST_PATH } from "../../packages/setup/src/domain/target-types.ts";
import type { ArchiveSourcePort } from "../../packages/setup/src/ports/archive-source.ts";
import type { TagSourcePort } from "../../packages/setup/src/ports/tag-source.ts";

function md5(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

function tarHeader(name: string, size: number, type = "0"): Buffer {
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, "utf-8");
  header.write("0000644\0", 100, "ascii");
  header.write("0000000\0", 108, "ascii");
  header.write("0000000\0", 116, "ascii");
  header.write(size.toString(8).padStart(11, "0") + "\0", 124, "ascii");
  header.write("00000000000\0", 136, "ascii");
  header.write("        ", 148, "ascii");
  header.write(type, 156, "ascii");
  header.write("ustar\0", 257, "ascii");
  header.write("00", 263, "ascii");
  return header;
}

function tarArchive(entries: Array<{ name: string; content: string }>): Buffer {
  const parts: Buffer[] = [];
  for (const entry of entries) {
    const content = Buffer.from(entry.content);
    parts.push(tarHeader(entry.name, content.length), content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) {
      parts.push(Buffer.alloc(padding, 0));
    }
  }
  parts.push(Buffer.alloc(1024, 0));
  return gzipSync(Buffer.concat(parts));
}

async function writeArchive(entries: Array<{ name: string; content: string }>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "amadeus-setup-archive-test-"));
  const archivePath = join(root, "archive.tar.gz");
  await writeFile(archivePath, tarArchive(entries));
  return archivePath;
}

const resolvedVersion: ResolvedVersion = {
  distributionVersion: "1.2.3",
  sourceTag: "v1.2.3",
  sourceRepo: CANONICAL_SOURCE_REPO,
  ignoredTags: [],
};

function loadedDistribution(root: string, files: LoadedDistribution["files"]): LoadedDistribution {
  return {
    root,
    harness: "codex",
    resolvedVersion,
    files,
  };
}

describe("U2 source archive and metadata", () => {
  test("GitHub archive adapter owns exactly one retry", async () => {
    let calls = 0;
    const adapter = new GitHubArchiveSource(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("temporary failure");
      }
      return new Response("archive-bytes", { status: 200 });
    });

    const result = await adapter.fetchArchive({ sourceRepo: CANONICAL_SOURCE_REPO, sourceTag: "v1.2.3" });

    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
    if (result.ok) {
      expect(existsSync(result.value.archivePath)).toBe(true);
      expect(result.value.diagnostics).toEqual(["attempt 1: fetch failed"]);
    }
  });

  test("archive extractor selects only the requested harness distribution", async () => {
    const archivePath = await writeArchive([
      { name: "repo/dist/codex/.codex/config.toml", content: "codex" },
      { name: "repo/dist/claude/.claude/settings.json", content: "claude" },
    ]);
    const extractor = new ArchiveExtractor();

    const result = await extractor.extractHarness({ archivePath, harness: "codex", resolvedVersion });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.files.map((file) => file.path)).toEqual([".codex/config.toml"]);
      expect(result.value.files[0]?.md5).toBe(md5("codex"));
      await extractor.cleanup(result.value);
    }
  });

  test("archive extractor rejects missing harness dist and path traversal", async () => {
    const missingArchive = await writeArchive([{ name: "repo/dist/claude/.claude/settings.json", content: "claude" }]);
    const traversalArchive = await writeArchive([{ name: "repo/dist/codex/../escape.txt", content: "escape" }]);
    const extractor = new ArchiveExtractor();

    const missing = await extractor.extractHarness({ archivePath: missingArchive, harness: "codex", resolvedVersion });
    const traversal = await extractor.extractHarness({ archivePath: traversalArchive, harness: "codex", resolvedVersion });

    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe("harness-dist-missing");
    }
    expect(traversal.ok).toBe(false);
    if (!traversal.ok) {
      expect(traversal.error.code).toBe("archive-invalid");
    }
  });

  test("distribution metadata uses valid present metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "amadeus-setup-metadata-valid-"));
    mkdirSync(join(root, "amadeus", ".installer"), { recursive: true });
    writeFileSync(
      join(root, DISTRIBUTION_METADATA_PATH),
      JSON.stringify({
        schemaVersion: 1,
        harness: "codex",
        files: [{ path: "AGENTS.md", class: "shared", required: true, md5: md5("agents") }],
      }),
    );

    const result = readDistributionMetadata({ distribution: loadedDistribution(root, []), harness: "codex" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([{ path: "AGENTS.md", class: "shared", required: true, md5: md5("agents") }]);
    }
    await rm(root, { recursive: true, force: true });
  });

  test("absent metadata falls back to path policy and binary md5", async () => {
    const root = await mkdtemp(join(tmpdir(), "amadeus-setup-metadata-fallback-"));
    const distribution = loadedDistribution(root, [
      { path: "AGENTS.md", absolutePath: join(root, "AGENTS.md"), md5: md5("agents") },
      { path: ".codex/tool.ts", absolutePath: join(root, ".codex", "tool.ts"), md5: md5("tool") },
    ]);

    const result = readDistributionMetadata({ distribution, harness: "codex" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContainEqual({ path: "AGENTS.md", class: "shared", required: true, md5: md5("agents") });
      expect(result.value).toContainEqual({ path: ".codex/tool.ts", class: "owned", required: true, md5: md5("tool") });
    }
    await rm(root, { recursive: true, force: true });
  });

  test("invalid present metadata is a hard failure with no fallback", async () => {
    const root = await mkdtemp(join(tmpdir(), "amadeus-setup-metadata-invalid-"));
    mkdirSync(join(root, "amadeus", ".installer"), { recursive: true });
    writeFileSync(join(root, DISTRIBUTION_METADATA_PATH), JSON.stringify({ schemaVersion: 1, files: [{ path: "AGENTS.md", class: "invalid", required: true, md5: md5("agents") }] }));
    const distribution = loadedDistribution(root, [{ path: "AGENTS.md", absolutePath: join(root, "AGENTS.md"), md5: md5("agents") }]);

    const result = readDistributionMetadata({ distribution, harness: "codex" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("distribution-metadata-invalid");
    }
    await rm(root, { recursive: true, force: true });
  });

  test("setup service resolves source with fake ports and applies install on --yes", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "amadeus-setup-service-source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "amadeus-setup-service-target-"));
    mkdirSync(join(sourceRoot, "dist", "codex", ".codex", "tools"), { recursive: true });
    mkdirSync(join(sourceRoot, "dist", "codex", "amadeus", "spaces", "default", "memory"), { recursive: true });
    writeFileSync(join(sourceRoot, "dist", "codex", "AGENTS.md"), "agents");
    writeFileSync(join(sourceRoot, "dist", "codex", ".codex", "config.toml"), "config");
    writeFileSync(join(sourceRoot, "dist", "codex", ".codex", "tools", ".gitkeep"), "");
    writeFileSync(join(sourceRoot, "dist", "codex", "amadeus", "spaces", "default", "memory", "org.md"), "org");
    const tagSource: TagSourcePort = {
      async listTags() {
        return { ok: true, value: ["v1.2.3"] };
      },
    };
    const archiveSource: ArchiveSourcePort = {
      async fetchArchive() {
        return { ok: true, value: { archivePath: sourceRoot } };
      },
    };

    const result = renderSetupResult(
      await executeSetupCommand(
        { command: "install", harness: "codex", target: targetRoot, version: undefined, yes: true, force: false },
        { tagSource, archiveSource, archiveExtractor: new ArchiveExtractor() },
      ),
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("version:  1.2.3");
    expect(result.stdout).toContain("Installed Amadeus.");
    expect(existsSync(join(targetRoot, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(targetRoot, ".codex", "config.toml"))).toBe(true);
    expect(existsSync(join(targetRoot, INSTALLER_MANIFEST_PATH))).toBe(true);
    await rm(sourceRoot, { recursive: true, force: true });
    await rm(targetRoot, { recursive: true, force: true });
  });
});
