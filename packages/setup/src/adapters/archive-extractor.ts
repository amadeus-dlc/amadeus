import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix, relative, resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";
import type { LoadedDistributionFile } from "../domain/source-types.ts";
import { setupSourceError, type LoadedDistribution, type SourceResult } from "../domain/source-types.ts";
import type { ArchiveExtractRequest, ArchiveExtractorPort } from "../ports/archive-extractor.ts";

type TarEntry = {
  name: string;
  type: "file" | "directory" | "other";
  content: Buffer;
};

function md5(content: Buffer): string {
  return createHash("md5").update(content).digest("hex");
}

function readString(buffer: Buffer, start: number, length: number): string {
  return buffer.subarray(start, start + length).toString("utf-8").replace(/\0.*$/u, "");
}

function readTarSize(header: Buffer): number {
  const raw = readString(header, 124, 12).trim();
  return raw.length === 0 ? 0 : Number.parseInt(raw, 8);
}

function isZeroBlock(header: Buffer): boolean {
  return header.every((byte) => byte === 0);
}

function parseTarGz(path: string): SourceResult<TarEntry[]> {
  let tar: Buffer;
  try {
    tar = gunzipSync(readFileSync(path));
  } catch {
    return {
      ok: false,
      error: setupSourceError({
        code: "archive-invalid",
        message: "Archive is not a readable tar.gz file.",
        nextAction: "Retry with a valid Amadeus release archive.",
      }),
    };
  }

  const entries: TarEntry[] = [];
  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    if (isZeroBlock(header)) {
      break;
    }
    const name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    const fullName = prefix.length > 0 ? `${prefix}/${name}` : name;
    const size = readTarSize(header);
    const typeFlag = readString(header, 156, 1);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    const type = typeFlag === "5" ? "directory" : typeFlag === "0" || typeFlag === "" ? "file" : "other";
    entries.push({ name: fullName, type, content: tar.subarray(contentStart, contentEnd) });
    offset = contentStart + Math.ceil(size / 512) * 512;
  }

  return { ok: true, value: entries };
}

function safeArchivePath(name: string): string | undefined {
  const rawPath = name.replaceAll("\\", "/");
  if (rawPath.split("/").includes("..")) {
    return undefined;
  }
  const normalized = posix.normalize(rawPath);
  if (normalized.startsWith("/") || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    return undefined;
  }
  return normalized;
}

function selectedHarnessRelativePath(entryPath: string, harness: string): string | undefined {
  const segments = entryPath.split("/");
  const distIndex = segments.findIndex((segment, index) => segment === "dist" && segments[index + 1] === harness);
  if (distIndex === -1) {
    return undefined;
  }
  const relativeSegments = segments.slice(distIndex + 2);
  if (relativeSegments.length === 0) {
    return "";
  }
  return relativeSegments.join("/");
}

function assertInsideRoot(root: string, destination: string): boolean {
  const resolvedRoot = resolve(root);
  const resolvedDestination = resolve(destination);
  return resolvedDestination === resolvedRoot || resolvedDestination.startsWith(`${resolvedRoot}${sep}`);
}

function collectDirectoryFiles(root: string, current: string, files: LoadedDistributionFile[]): void {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolutePath = join(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error("symlink");
    }
    if (entry.isDirectory()) {
      collectDirectoryFiles(root, absolutePath, files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const content = readFileSync(absolutePath);
    files.push({
      path: relative(root, absolutePath).split(sep).join("/"),
      absolutePath,
      md5: md5(content),
    });
  }
}

async function extractDirectory(request: ArchiveExtractRequest, extractionRoot: string): Promise<SourceResult<LoadedDistribution>> {
  const harnessRoot = join(request.archivePath, "dist", request.harness);
  if (!existsSync(harnessRoot) || !lstatSync(harnessRoot).isDirectory()) {
    return {
      ok: false,
      error: setupSourceError({
        code: "harness-dist-missing",
        message: `Archive does not contain dist/${request.harness}.`,
        nextAction: "Choose a release archive that includes the selected harness distribution.",
        details: { harness: request.harness },
      }),
    };
  }

  const files: LoadedDistributionFile[] = [];
  try {
    const copyRecursive = (source: string, destination: string): void => {
      mkdirSync(destination, { recursive: true });
      for (const entry of readdirSync(source, { withFileTypes: true })) {
        const sourcePath = join(source, entry.name);
        const destinationPath = join(destination, entry.name);
        if (entry.isSymbolicLink()) {
          throw new Error("symlink");
        }
        if (entry.isDirectory()) {
          copyRecursive(sourcePath, destinationPath);
        } else if (entry.isFile()) {
          copyFileSync(sourcePath, destinationPath);
        }
      }
    };
    copyRecursive(harnessRoot, extractionRoot);
    collectDirectoryFiles(extractionRoot, extractionRoot, files);
  } catch {
    return {
      ok: false,
      error: setupSourceError({
        code: "archive-invalid",
        message: "Directory-backed archive contains an unsupported or unsafe entry.",
        nextAction: "Use a directory fixture or archive with regular files only.",
      }),
    };
  }

  files.sort((left, right) => left.path.localeCompare(right.path));
  return { ok: true, value: { root: extractionRoot, harness: request.harness, resolvedVersion: request.resolvedVersion, files } };
}

async function extractTar(request: ArchiveExtractRequest, extractionRoot: string): Promise<SourceResult<LoadedDistribution>> {
  const parsed = parseTarGz(request.archivePath);
  if (!parsed.ok) {
    return parsed;
  }

  let selectedEntries = 0;
  for (const entry of parsed.value) {
    const safePath = safeArchivePath(entry.name);
    if (safePath === undefined) {
      return {
        ok: false,
        error: setupSourceError({
          code: "archive-invalid",
          message: "Archive contains an unsafe absolute or parent-traversal path.",
          nextAction: "Use a release archive without path traversal entries.",
        }),
      };
    }
    const relativePath = selectedHarnessRelativePath(safePath, request.harness);
    if (relativePath === undefined || relativePath.length === 0) {
      continue;
    }
    selectedEntries += 1;
    if (entry.type === "directory") {
      const destination = join(extractionRoot, relativePath);
      if (!assertInsideRoot(extractionRoot, destination)) {
        return {
          ok: false,
          error: setupSourceError({
            code: "archive-invalid",
            message: "Archive extraction destination escaped the temporary root.",
            nextAction: "Use a release archive without path traversal entries.",
          }),
        };
      }
      mkdirSync(destination, { recursive: true });
      continue;
    }
    if (entry.type !== "file") {
      return {
        ok: false,
        error: setupSourceError({
          code: "archive-invalid",
          message: "Selected harness archive contains an unsupported entry type.",
          nextAction: "Use a release archive with regular files and directories only.",
        }),
      };
    }
    const destination = join(extractionRoot, relativePath);
    if (!assertInsideRoot(extractionRoot, destination)) {
      return {
        ok: false,
        error: setupSourceError({
          code: "archive-invalid",
          message: "Archive extraction destination escaped the temporary root.",
          nextAction: "Use a release archive without path traversal entries.",
        }),
      };
    }
    mkdirSync(resolve(destination, ".."), { recursive: true });
    writeFileSync(destination, entry.content);
  }

  if (selectedEntries === 0) {
    return {
      ok: false,
      error: setupSourceError({
        code: "harness-dist-missing",
        message: `Archive does not contain dist/${request.harness}.`,
        nextAction: "Choose a release archive that includes the selected harness distribution.",
        details: { harness: request.harness },
      }),
    };
  }

  const files: LoadedDistributionFile[] = [];
  collectDirectoryFiles(extractionRoot, extractionRoot, files);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { ok: true, value: { root: extractionRoot, harness: request.harness, resolvedVersion: request.resolvedVersion, files } };
}

export class ArchiveExtractor implements ArchiveExtractorPort {
  async extractHarness(request: ArchiveExtractRequest): Promise<SourceResult<LoadedDistribution>> {
    const extractionRoot = await mkdtemp(join(tmpdir(), "amadeus-setup-dist-"));
    const result = existsSync(request.archivePath) && lstatSync(request.archivePath).isDirectory()
      ? await extractDirectory(request, extractionRoot)
      : await extractTar(request, extractionRoot);
    if (!result.ok) {
      rmSync(extractionRoot, { recursive: true, force: true });
    }
    return result;
  }

  async cleanup(distribution: LoadedDistribution): Promise<void> {
    rmSync(distribution.root, { recursive: true, force: true });
  }
}
