import { FileSystemManifestStore } from "../adapters/manifest-store.ts";
import { NodeTargetFile } from "../adapters/target-file.ts";
import { ArchiveExtractor } from "../adapters/archive-extractor.ts";
import { GitHubArchiveSource, GitHubTagSource } from "../adapters/github-source.ts";
import { FileSystemTargetManifestReader } from "../adapters/target-manifest-reader.ts";
import { NodeTargetReadOnlyFile } from "../adapters/target-readonly-file.ts";
import { readDistributionMetadata } from "../domain/distribution-metadata.ts";
import type { ArchiveExtractorPort } from "../ports/archive-extractor.ts";
import type { ArchiveSourcePort } from "../ports/archive-source.ts";
import type { TargetFilePort } from "../ports/filesystem.ts";
import type { ManifestStorePort } from "../ports/manifest-store.ts";
import type { TagSourcePort } from "../ports/tag-source.ts";
import type { PromptPort, TargetManifestReadPort, TargetReadOnlyFilePort } from "../ports/target-state.ts";

export type SetupServiceDeps = {
  tagSource?: TagSourcePort;
  archiveSource?: ArchiveSourcePort;
  archiveExtractor?: ArchiveExtractorPort;
  readMetadata?: typeof readDistributionMetadata;
  targetManifestReader?: TargetManifestReadPort;
  targetFiles?: TargetReadOnlyFilePort;
  targetWritableFiles?: TargetFilePort;
  manifestStore?: ManifestStorePort;
  promptPort?: PromptPort;
  stdinIsTTY?: boolean;
  operationTimestamp?: () => Date;
  installedAt?: () => string;
  backupPathExists?: (backupPath: string) => boolean;
};

export type ResolvedSetupServiceDeps = Required<Omit<SetupServiceDeps, "promptPort">> & Pick<SetupServiceDeps, "promptPort">;

export function resolveSetupDeps(deps: SetupServiceDeps): ResolvedSetupServiceDeps {
  const targetFiles = deps.targetFiles ?? new NodeTargetReadOnlyFile();
  const targetWritableFiles = deps.targetWritableFiles ?? new NodeTargetFile();
  return {
    tagSource: deps.tagSource ?? new GitHubTagSource(),
    archiveSource: deps.archiveSource ?? new GitHubArchiveSource(),
    archiveExtractor: deps.archiveExtractor ?? new ArchiveExtractor(),
    readMetadata: deps.readMetadata ?? readDistributionMetadata,
    targetManifestReader: deps.targetManifestReader ?? new FileSystemTargetManifestReader(targetFiles),
    targetFiles,
    targetWritableFiles,
    manifestStore: deps.manifestStore ?? new FileSystemManifestStore(targetWritableFiles),
    promptPort: deps.promptPort,
    stdinIsTTY: deps.stdinIsTTY ?? false,
    operationTimestamp: deps.operationTimestamp ?? (() => new Date()),
    installedAt: deps.installedAt ?? (() => new Date().toISOString()),
    backupPathExists: deps.backupPathExists ?? (() => false),
  };
}
