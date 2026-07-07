import type { SourceResult } from "../domain/source-types.ts";

export type TagSourcePort = {
  listTags(sourceRepo: string): Promise<SourceResult<string[]>>;
};
