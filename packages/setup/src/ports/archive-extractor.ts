import type { Harness } from "../domain/installer-contracts.ts";
import type { LoadedDistribution, ResolvedVersion, SourceResult } from "../domain/source-types.ts";

export type ArchiveExtractRequest = {
  archivePath: string;
  harness: Harness;
  resolvedVersion: ResolvedVersion;
};

export type ArchiveExtractorPort = {
  extractHarness(request: ArchiveExtractRequest): Promise<SourceResult<LoadedDistribution>>;
  cleanup(distribution: LoadedDistribution): Promise<void>;
};
