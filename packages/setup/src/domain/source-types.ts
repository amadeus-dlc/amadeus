import type { Harness, SetupError } from "../cli/types.ts";

export const CANONICAL_SOURCE_REPO = "https://github.com/amadeus-dlc/amadeus" as const;

export type SourceResult<T> = { ok: true; value: T } | { ok: false; error: SetupError };

export type VersionRequest = {
  requestedVersion?: string;
  sourceRepo: typeof CANONICAL_SOURCE_REPO;
  allowExplicitPrerelease: boolean;
};

export type IgnoredTag = {
  tag: string;
  reason: "duplicate-bare-tag" | "duplicate-v-tag" | "malformed" | "prerelease-excluded";
};

export type ResolvedVersion = {
  distributionVersion: string;
  sourceTag: string;
  sourceRepo: typeof CANONICAL_SOURCE_REPO;
  ignoredTags: IgnoredTag[];
};

export type TagCandidate = {
  tag: string;
  kind: "stable" | "prerelease" | "malformed";
  version?: string;
  preferred: boolean;
  ignoredReason?: IgnoredTag["reason"];
};

export type FileClass = "owned" | "shared" | "user-preserved";

export type DistributionFile = {
  path: string;
  class: FileClass;
  required: boolean;
  md5: string;
};

export type LoadedDistributionFile = {
  path: string;
  absolutePath: string;
  md5: string;
};

export type LoadedDistribution = {
  root: string;
  harness: Harness;
  resolvedVersion: ResolvedVersion;
  files: LoadedDistributionFile[];
};

export type ArchiveFetchOutcome = {
  archivePath: string;
  diagnostics?: string[];
};

export type LoadedSourceDistribution = {
  resolvedVersion: ResolvedVersion;
  distribution: LoadedDistribution;
  metadata: DistributionFile[];
};

export function setupSourceError(input: Omit<SetupError, "noFilesModified">): SetupError {
  return { ...input, noFilesModified: true };
}
