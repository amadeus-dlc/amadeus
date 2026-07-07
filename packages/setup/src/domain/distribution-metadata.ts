import { existsSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Harness } from "./installer-contracts.ts";
import { setupSourceError, type DistributionFile, type FileClass, type LoadedDistribution, type SourceResult } from "./source-types.ts";

export const DISTRIBUTION_METADATA_PATH = "amadeus/.installer/distribution-metadata.json";

type MetadataDocument = {
  schemaVersion?: unknown;
  harness?: unknown;
  files?: unknown;
};

const FILE_CLASSES = new Set<FileClass>(["owned", "shared", "user-preserved"]);
const SHARED_PATHS = new Set(["AGENTS.md", "CLAUDE.md", ".claude/settings.json", ".codex/config.toml", ".kiro/settings/cli.json"]);

function toPosixPath(path: string): string {
  return path.split("\\").join("/");
}

function isSafeRelativePath(path: string): boolean {
  const normalized = toPosixPath(path);
  return normalized.length > 0 && !isAbsolute(normalized) && !normalized.split("/").includes("..") && !path.includes("\\");
}

function isDistributionFile(value: unknown): value is DistributionFile {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.path === "string" &&
    isSafeRelativePath(candidate.path) &&
    typeof candidate.class === "string" &&
    FILE_CLASSES.has(candidate.class as FileClass) &&
    typeof candidate.required === "boolean" &&
    typeof candidate.md5 === "string" &&
    /^[0-9a-f]{32}$/.test(candidate.md5)
  );
}

function parseMetadata(content: string, harness: Harness): DistributionFile[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }
  const document = typeof parsed === "object" && parsed !== null ? (parsed as MetadataDocument) : {};
  if (document.schemaVersion !== 1) {
    return undefined;
  }
  if (document.harness !== undefined && document.harness !== harness) {
    return undefined;
  }
  const files = document.files;
  if (!Array.isArray(files) || !files.every(isDistributionFile)) {
    return undefined;
  }
  return files.map((file) => ({
    path: toPosixPath(file.path),
    class: file.class,
    required: file.required,
    md5: file.md5,
  }));
}

function fallbackClass(path: string): FileClass {
  if (path.startsWith("amadeus/spaces/") || path.startsWith("amadeus/audit/") || path === "amadeus/intents.json" || path === "amadeus/active-space" || path === "amadeus/active-intent") {
    return "user-preserved";
  }
  if (SHARED_PATHS.has(path)) {
    return "shared";
  }
  return "owned";
}

export type ReadDistributionMetadataRequest = {
  distribution: LoadedDistribution;
  harness: Harness;
};

export function readDistributionMetadata(request: ReadDistributionMetadataRequest): SourceResult<DistributionFile[]> {
  const metadataFile = `${request.distribution.root}/${DISTRIBUTION_METADATA_PATH}`;
  if (existsSync(metadataFile)) {
    const metadata = parseMetadata(readFileSync(metadataFile, "utf-8"), request.harness);
    if (metadata === undefined) {
      return {
        ok: false,
        error: setupSourceError({
          code: "distribution-metadata-invalid",
          message: `Distribution metadata for ${request.harness} is invalid.`,
          nextAction: "Publish corrected distribution metadata or remove the invalid metadata file before falling back.",
          details: { metadataPath: DISTRIBUTION_METADATA_PATH, harness: request.harness },
        }),
      };
    }
    return { ok: true, value: metadata };
  }

  return {
    ok: true,
    value: request.distribution.files.map((file) => {
      const path = toPosixPath(file.path);
      const fileClass = fallbackClass(path);
      return {
        path,
        class: fileClass,
        required: fileClass !== "user-preserved",
        md5: file.md5,
      };
    }),
  };
}
