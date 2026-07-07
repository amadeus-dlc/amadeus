import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import type { Harness } from "../../../packages/setup/src/cli/types.ts";
import { distributionFile, md5 } from "./fixtures.ts";

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

export function buildTarGzArchive(entries: Array<{ name: string; content: string }>): Buffer {
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

const CODEX_DIST_FILES = [
  "AGENTS.md",
  ".codex/config.toml",
  ".codex/tools/.gitkeep",
  "amadeus/spaces/default/memory/org.md",
] as const;

export function seedCodexDistributionDir(root: string, input: { version?: string } = {}): string {
  const distRoot = join(root, "dist", "codex");
  mkdirSync(join(distRoot, ".codex", "tools"), { recursive: true });
  mkdirSync(join(distRoot, "amadeus", "spaces", "default", "memory"), { recursive: true });
  writeFileSync(join(distRoot, "AGENTS.md"), "agents");
  writeFileSync(join(distRoot, ".codex", "config.toml"), "config");
  writeFileSync(join(distRoot, ".codex", "tools", ".gitkeep"), "");
  writeFileSync(join(distRoot, "amadeus", "spaces", "default", "memory", "org.md"), "org");
  if (input.version !== undefined) {
    writeFileSync(join(distRoot, "VERSION.txt"), input.version);
  }
  return distRoot;
}

export function codexDistributionFiles(): ReturnType<typeof distributionFile>[] {
  return [
    distributionFile("AGENTS.md", { content: "agents" }),
    distributionFile(".codex/config.toml", { content: "config", class: "owned" }),
    distributionFile(".codex/tools/.gitkeep", { content: "", class: "owned" }),
    distributionFile("amadeus/spaces/default/memory/org.md", { content: "org" }),
  ];
}

export function buildCodexArchiveEntries(): Array<{ name: string; content: string }> {
  return CODEX_DIST_FILES.map((path) => ({
    name: `repo/dist/codex/${path}`,
    content: path === "AGENTS.md" ? "agents" : path.endsWith("org.md") ? "org" : path.endsWith("config.toml") ? "config" : "",
  }));
}

export function writeCodexArchiveAt(root: string): string {
  const archivePath = join(root, "archive.tar.gz");
  writeFileSync(archivePath, buildTarGzArchive(buildCodexArchiveEntries()));
  return archivePath;
}

export function harnessDistPrefix(harness: Harness): string {
  switch (harness) {
    case "claude":
      return "repo/dist/claude/";
    case "codex":
      return "repo/dist/codex/";
    case "kiro":
      return "repo/dist/kiro/";
    case "kiro-ide":
      return "repo/dist/kiro-ide/";
  }
}

export { md5 };
