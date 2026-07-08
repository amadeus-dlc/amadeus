import type { ManifestError, ManifestFiles } from "./manifest.ts";
import type { PlanEntry } from "./plan.ts";
import type { Result } from "../shared/result.ts";

export type ApplyFailure = {
  readonly path: string;
  readonly operation: "copy" | "backup" | "mkdir";
  readonly detail: string;
};

export type ApplyResult = {
  hasFailures(): boolean;
  failures(): ReadonlyArray<ApplyFailure>;
  appliedEntries(): ReadonlyArray<PlanEntry>;
  backupPaths(): ReadonlyArray<string>;
  manifestFiles(): Result<ManifestFiles, ManifestError>;
};

// No public companion: ApplyResult is only ever constructed by
// modules/applier.ts, the sole owner of the apply algorithm
// (domain-entities.md: "applier 内部ファクトリのみ").
