// amadeus-mirror-project-contract.ts — import-free Project field vocabulary.
//
// C1 configuration, C2 policy, the GitHub boundary, and C8 presentation all
// consume this one immutable contract. Keeping it below those layers prevents
// configuration from importing policy and keeps runtime behavior, diagnostics,
// and generated documentation on the same field and option names.

export const MIRROR_PROJECT_FIELD_CONTRACT = {
  lifecycle: {
    defaultField: "Intent Phase",
  },
  auxiliaryStatus: {
    field: "Status",
    active: "In progress",
    complete: "Done",
  },
} as const;

export const DEFAULT_PROJECT_PHASE_FIELD =
  MIRROR_PROJECT_FIELD_CONTRACT.lifecycle.defaultField;
