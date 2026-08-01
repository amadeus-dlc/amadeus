import type { Result } from "./contract.ts";
import {
  type TlaModelPipelineError,
  type VerifiedTlaSource,
  loadVerifiedTlaSourceInternal,
} from "./tla-model-loader-internal.ts";

export type {
  ModelLoadError,
  ModelLoadErrorCode,
  ModelMap,
  SourceDriftError,
  TlaModelPipelineError,
  VerifiedTlaSource,
} from "./tla-model-loader-internal.ts";

export function loadVerifiedTlaSource(): Result<VerifiedTlaSource, TlaModelPipelineError> {
  return loadVerifiedTlaSourceInternal(import.meta.url);
}
