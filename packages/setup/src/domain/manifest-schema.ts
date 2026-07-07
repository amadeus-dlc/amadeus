import { SUPPORTED_HARNESSES, type Harness } from "../cli/types.ts";
import type { DistributionFile, FileClass } from "./source-types.ts";
import { INSTALLER_MANIFEST_SCHEMA_VERSION, type InstallerManifest, type ManifestValidationIssue } from "./target-types.ts";

const FILE_CLASSES = new Set<FileClass>(["owned", "shared", "user-preserved"]);
const HARNESSES = new Set<Harness>(SUPPORTED_HARNESSES);

type ManifestDocument = {
  schemaVersion?: unknown;
  installerPackageVersion?: unknown;
  distributionVersion?: unknown;
  sourceTag?: unknown;
  installedAt?: unknown;
  harness?: unknown;
  files?: unknown;
};

export type ManifestValidationResult =
  | { ok: true; manifest: InstallerManifest }
  | { ok: false; issues: ManifestValidationIssue[] };

function toPosixPath(path: string): string {
  return path.split("\\").join("/");
}

export function isSafeManifestRelativePath(path: string): boolean {
  const normalized = toPosixPath(path);
  return (
    path.length > 0 &&
    normalized.length > 0 &&
    !path.includes("\\") &&
    !normalized.startsWith("/") &&
    !/^[A-Za-z]:\//.test(normalized) &&
    !normalized.split("/").includes("..") &&
    normalized.split("/").every((segment) => segment.length > 0)
  );
}

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validateFile(value: unknown, issues: ManifestValidationIssue[]): DistributionFile | undefined {
  if (typeof value !== "object" || value === null) {
    issues.push("invalid-files");
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const path = candidate.path;
  const fileClass = candidate.class;
  const required = candidate.required;
  const md5 = candidate.md5;

  if (typeof path !== "string" || !isSafeManifestRelativePath(path)) {
    issues.push("invalid-file-path");
  }
  if (typeof fileClass !== "string" || !FILE_CLASSES.has(fileClass as FileClass)) {
    issues.push("invalid-file-class");
  }
  if (typeof required !== "boolean") {
    issues.push("invalid-file-required");
  }
  if (typeof md5 !== "string" || !/^[0-9a-f]{32}$/.test(md5)) {
    issues.push("invalid-file-md5");
  }

  if (typeof path !== "string" || typeof fileClass !== "string" || typeof required !== "boolean" || typeof md5 !== "string") {
    return undefined;
  }
  if (!isSafeManifestRelativePath(path) || !FILE_CLASSES.has(fileClass as FileClass) || !/^[0-9a-f]{32}$/.test(md5)) {
    return undefined;
  }
  return {
    path: toPosixPath(path),
    class: fileClass as FileClass,
    required,
    md5,
  };
}

export function validateInstallerManifestJson(content: string): ManifestValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, issues: ["invalid-json"] };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, issues: ["invalid-schema-version"] };
  }

  const document = parsed as ManifestDocument;
  const issues: ManifestValidationIssue[] = [];
  if (document.schemaVersion !== INSTALLER_MANIFEST_SCHEMA_VERSION) {
    issues.push("invalid-schema-version");
  }
  if (typeof document.installerPackageVersion !== "string" || document.installerPackageVersion.length === 0) {
    issues.push("invalid-package-version");
  }
  if (typeof document.distributionVersion !== "string" || document.distributionVersion.length === 0) {
    issues.push("invalid-distribution-version");
  }
  if (typeof document.sourceTag !== "string" || document.sourceTag.length === 0) {
    issues.push("invalid-source-tag");
  }
  if (typeof document.installedAt !== "string" || !isIsoTimestamp(document.installedAt)) {
    issues.push("invalid-installed-at");
  }
  if (typeof document.harness !== "string" || !HARNESSES.has(document.harness as Harness)) {
    issues.push("invalid-harness");
  }
  if (!Array.isArray(document.files)) {
    issues.push("invalid-files");
  }

  const files = Array.isArray(document.files)
    ? document.files.map((file) => validateFile(file, issues)).filter((file): file is DistributionFile => file !== undefined)
    : [];

  if (issues.length > 0) {
    return { ok: false, issues: [...new Set(issues)] };
  }

  return {
    ok: true,
    manifest: {
      schemaVersion: INSTALLER_MANIFEST_SCHEMA_VERSION,
      installerPackageVersion: document.installerPackageVersion as string,
      distributionVersion: document.distributionVersion as string,
      sourceTag: document.sourceTag as string,
      installedAt: document.installedAt as string,
      harness: document.harness as Harness,
      files,
    },
  };
}
