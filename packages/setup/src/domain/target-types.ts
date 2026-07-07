import type { Harness, SetupError } from "../cli/types.ts";
import type { DistributionFile } from "./source-types.ts";

export const INSTALLER_MANIFEST_PATH = "amadeus/.installer/amadeus-setup-manifest.json" as const;
export const INSTALLER_MANIFEST_SCHEMA_VERSION = 1 as const;

export type InstallerManifest = {
  schemaVersion: typeof INSTALLER_MANIFEST_SCHEMA_VERSION;
  installerPackageVersion: string;
  distributionVersion: string;
  sourceTag: string;
  installedAt: string;
  harness: Harness;
  files: DistributionFile[];
};

export type ManifestValidationIssue =
  | "invalid-json"
  | "invalid-schema-version"
  | "invalid-package-version"
  | "invalid-distribution-version"
  | "invalid-source-tag"
  | "invalid-installed-at"
  | "invalid-harness"
  | "invalid-files"
  | "invalid-file-path"
  | "invalid-file-class"
  | "invalid-file-required"
  | "invalid-file-md5";

export type ManifestReadStatus = "valid" | "absent" | "invalid" | "unreadable";

export type ManifestReadDiagnostics = {
  status: ManifestReadStatus;
  reasonCode: "manifest-valid" | "manifest-absent" | "manifest-invalid" | "manifest-unreadable";
  manifestPath: typeof INSTALLER_MANIFEST_PATH;
  validationIssues?: ManifestValidationIssue[];
};

export type ManifestReadResult =
  | { status: "valid"; manifest: InstallerManifest; diagnostics: ManifestReadDiagnostics }
  | { status: "absent"; diagnostics: ManifestReadDiagnostics }
  | { status: "invalid"; diagnostics: ManifestReadDiagnostics }
  | { status: "unreadable"; diagnostics: ManifestReadDiagnostics };

export type SentinelMatchKind = "full" | "partial" | "none";

export type SentinelSet = {
  harness: Harness;
  requiredPaths: string[];
  presentPaths: string[];
  missingPaths: string[];
  matchKind: SentinelMatchKind;
};

export type TargetDetectionState =
  | "manifest-installed"
  | "manual-or-unknown"
  | "partial"
  | "none"
  | "unsupported-layout"
  | "ambiguous-harness";

export type TargetDetectionDiagnostics = {
  manifestRead: ManifestReadDiagnostics;
  sentinelMatches: SentinelSet[];
  ambiguousHarnesses?: Harness[];
  reason?: string;
};

type TargetDetectionBase = {
  target: string;
  diagnostics: TargetDetectionDiagnostics;
};

export type TargetDetection =
  | (TargetDetectionBase & {
      state: "manifest-installed";
      manifest: InstallerManifest;
      inferredHarness: Harness;
    })
  | (TargetDetectionBase & {
      state: "manual-or-unknown";
      inferredHarness: Harness;
    })
  | (TargetDetectionBase & {
      state: "partial";
      inferredHarness?: Harness;
      missingPaths: string[];
      ambiguousHarnesses?: Harness[];
    })
  | (TargetDetectionBase & {
      state: "none";
    })
  | (TargetDetectionBase & {
      state: "unsupported-layout";
      reason: string;
    })
  | (TargetDetectionBase & {
      state: "ambiguous-harness";
      candidates: Harness[];
      reason: string;
    });

export type TargetDetectionResult = { ok: true; detection: TargetDetection } | { ok: false; error: SetupError };

export type TargetSnapshotFile = {
  path: string;
  exists: boolean;
  md5?: string;
};

export type TargetSnapshotDiagnostics = {
  expectedFileCount: number;
  unknownMd5Count: number;
  unreadableFiles: Array<{ path: string; reasonCode: "md5-unreadable" }>;
};

export type TargetSnapshot = {
  target: string;
  detection: TargetDetection;
  existingFiles: TargetSnapshotFile[];
  diagnostics: TargetSnapshotDiagnostics;
};
