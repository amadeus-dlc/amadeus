import type { ArchiveFetchOutcome, SourceResult } from "../domain/source-types.ts";

export type ArchiveFetchRequest = {
  sourceRepo: string;
  sourceTag: string;
};

export type ArchiveSourcePort = {
  fetchArchive(request: ArchiveFetchRequest): Promise<SourceResult<ArchiveFetchOutcome>>;
};
