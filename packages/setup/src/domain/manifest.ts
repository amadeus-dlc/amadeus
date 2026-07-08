import { createManifestFiles } from "../internal/manifest-files-factory.ts";
import { createManifest } from "../internal/manifest-factory.ts";
import type { ExtractedPayload } from "./payload.ts";
import { HarnessName } from "./harness.ts";
import { SemVer } from "./semver.ts";
import { Result } from "../shared/result.ts";

export type FileClass = "owned" | "shared" | "user-preserved";

export type ManifestFile = {
  readonly path: string;
  readonly class: FileClass;
  readonly required: boolean;
  readonly md5: string;
};

export type Disposition =
  | { readonly type: "overwrite" }
  | { readonly type: "backup-then-copy" }
  | { readonly type: "preserve" };

export type ManifestFiles = {
  requiredPaths(): readonly string[];
  dispositionFor(path: string, actualMd5: string | null): Disposition; // FR-008: Tell, Don't Ask
  entries(): ReadonlyArray<ManifestFile>;
};

export namespace ManifestFiles {
  export function fromEntries(entries: readonly ManifestFile[]): Result<ManifestFiles, ManifestError> {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (seen.has(entry.path)) return Result.err(ManifestError.duplicatePath(entry.path));
      seen.add(entry.path);
    }
    return Result.ok(createManifestFiles(entries));
  }
}

Object.freeze(ManifestFiles);

export type InstallMeta = {
  readonly installerPackageVersion: string;
  readonly harness: HarnessName;
  readonly installStartedAt: string;
};

export type BuildInput = {
  readonly payload: ExtractedPayload;
  readonly files: ManifestFiles;
  readonly meta: InstallMeta;
};

export type ManifestJson = {
  readonly schemaVersion: 1;
  readonly installerPackageVersion: string;
  readonly distributionVersion: string;
  readonly sourceTag: string;
  readonly installedAt: string;
  readonly harness: string;
  readonly files: ReadonlyArray<{ path: string; class: string; required: boolean; md5: string }>;
};

export type Manifest = {
  readonly schemaVersion: 1;
  readonly installerPackageVersion: string;
  readonly distributionVersion: SemVer;
  readonly sourceTag: `v${string}`;
  readonly installedAt: string;
  readonly harness: HarnessName;
  dispositionFor(path: string, actualMd5: string | null): Disposition;
  isNewerThan(candidate: SemVer): boolean;
  requiredPaths(): readonly string[];
  upgradedTo(next: BuildInput): Manifest;
  toJSON(): ManifestJson;
};

export namespace Manifest {
  export function parse(json: unknown): Result<Manifest, ManifestError> {
    return parseManifestJson(json);
  }

  export function build(payload: ExtractedPayload, files: ManifestFiles, meta: InstallMeta): Manifest {
    return createManifest({
      installerPackageVersion: meta.installerPackageVersion,
      distributionVersion: payload.version.semver,
      sourceTag: payload.version.tag,
      installedAt: meta.installStartedAt,
      harness: meta.harness,
      files,
    });
  }
}

Object.freeze(Manifest);

export type ManifestError =
  | { readonly type: "schema-unsupported"; readonly found: unknown }
  | { readonly type: "malformed"; readonly detail: string }
  | { readonly type: "unknown-harness"; readonly raw: string }
  | { readonly type: "duplicate-path"; readonly path: string }
  | { readonly type: "io"; readonly detail: string };

export namespace ManifestError {
  export function schemaUnsupported(found: unknown): ManifestError {
    return Object.freeze({ type: "schema-unsupported", found });
  }
  export function malformed(detail: string): ManifestError {
    return Object.freeze({ type: "malformed", detail });
  }
  export function unknownHarness(raw: string): ManifestError {
    return Object.freeze({ type: "unknown-harness", raw });
  }
  export function duplicatePath(path: string): ManifestError {
    return Object.freeze({ type: "duplicate-path", path });
  }
  export function io(detail: string): ManifestError {
    return Object.freeze({ type: "io", detail });
  }
}

Object.freeze(ManifestError);

// --- Manifest.parse implementation (BR-F12; Parse, Don't Validate at the JSON boundary) ---

function parseManifestJson(json: unknown): Result<Manifest, ManifestError> {
  if (typeof json !== "object" || json === null) {
    return Result.err(ManifestError.malformed("expected a JSON object"));
  }
  const obj = json as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    return Result.err(ManifestError.schemaUnsupported(obj.schemaVersion));
  }

  const { installerPackageVersion, distributionVersion: distributionVersionRaw, sourceTag, installedAt, harness: harnessRaw, files: filesRaw } = obj;

  if (
    typeof installerPackageVersion !== "string" ||
    typeof distributionVersionRaw !== "string" ||
    typeof sourceTag !== "string" ||
    typeof installedAt !== "string" ||
    typeof harnessRaw !== "string" ||
    !Array.isArray(filesRaw)
  ) {
    return Result.err(ManifestError.malformed("one or more required fields are missing or the wrong type"));
  }
  if (!sourceTag.startsWith("v")) {
    return Result.err(ManifestError.malformed(`sourceTag must start with "v", got ${sourceTag}`));
  }
  if (!(HarnessName.all as readonly string[]).includes(harnessRaw)) {
    return Result.err(ManifestError.unknownHarness(harnessRaw));
  }
  const distributionVersion = SemVer.parse(distributionVersionRaw);
  if (distributionVersion.type === "err") {
    return Result.err(ManifestError.malformed(`invalid distributionVersion: ${distributionVersion.error.reason}`));
  }

  const parsedFiles: ManifestFile[] = [];
  for (const entry of filesRaw) {
    const parsedEntry = parseManifestFile(entry);
    if (parsedEntry === null) {
      return Result.err(ManifestError.malformed("a files[] entry is missing a required field or has the wrong type"));
    }
    parsedFiles.push(parsedEntry);
  }

  const files = ManifestFiles.fromEntries(parsedFiles);
  if (files.type === "err") return files;

  return Result.ok(
    createManifest({
      installerPackageVersion,
      distributionVersion: distributionVersion.value,
      sourceTag: sourceTag as `v${string}`,
      installedAt,
      harness: harnessRaw as HarnessName,
      files: files.value,
    }),
  );
}

function parseManifestFile(entry: unknown): ManifestFile | null {
  if (typeof entry !== "object" || entry === null) return null;
  const e = entry as Record<string, unknown>;
  if (typeof e.path !== "string" || typeof e.md5 !== "string" || typeof e.required !== "boolean") return null;
  if (e.class !== "owned" && e.class !== "shared" && e.class !== "user-preserved") return null;
  return { path: e.path, class: e.class, required: e.required, md5: e.md5 };
}
