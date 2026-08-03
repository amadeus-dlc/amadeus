import type { Result } from "./contract.ts";
import type { ModuleDepsError } from "./tla-model-loader-internal.ts";
import {
  type TlaModelPipelineError,
  type VerifiedTlaSource,
  type VerifiedTlaSources,
  loadVerifiedTlaSourceInternal,
  loadVerifiedTlaSourcesInternal,
  selectVerifiedModel,
} from "./tla-model-loader-internal.ts";

export type {
  ModelLoadError,
  ModelLoadErrorCode,
  ModelMap,
  ModuleDepsError,
  SourceDriftError,
  TlaModelPipelineError,
  VerifiedModelSource,
  VerifiedTlaSource,
  VerifiedTlaSources,
} from "./tla-model-loader-internal.ts";

// Time-boxed compatibility shim (BR-S4): projects the multi-model pipeline
// onto the pre-u2 singular shape. u3 removes it once run-model-check-source.ts
// and tla-arm.ts move to the plural API.
export function loadVerifiedTlaSource(): Result<VerifiedTlaSource, TlaModelPipelineError> {
  return loadVerifiedTlaSourceInternal(import.meta.url);
}

export function loadVerifiedTlaSources(): Result<VerifiedTlaSources, TlaModelPipelineError | ModuleDepsError> {
  return loadVerifiedTlaSourcesInternal(import.meta.url);
}

export { selectVerifiedModel };
