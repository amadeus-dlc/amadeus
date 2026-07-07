import type { Harness } from "./installer-contracts.ts";
import type { ArchiveSourcePort } from "../ports/archive-source.ts";
import type { ArchiveExtractorPort } from "../ports/archive-extractor.ts";
import type { LoadedDistribution, ResolvedVersion, SourceResult } from "./source-types.ts";

export async function loadDistribution(input: {
  resolvedVersion: ResolvedVersion;
  harness: Harness;
  archiveSource: ArchiveSourcePort;
  archiveExtractor: ArchiveExtractorPort;
}): Promise<SourceResult<LoadedDistribution>> {
  const archive = await input.archiveSource.fetchArchive({
    sourceRepo: input.resolvedVersion.sourceRepo,
    sourceTag: input.resolvedVersion.sourceTag,
  });
  if (!archive.ok) {
    return archive;
  }
  return input.archiveExtractor.extractHarness({
    archivePath: archive.value.archivePath,
    harness: input.harness,
    resolvedVersion: input.resolvedVersion,
  });
}
