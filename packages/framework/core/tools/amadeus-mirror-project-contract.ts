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

type MirrorProjectIdentity = Readonly<{
  owner: string;
  number: number;
}>;

// GitHub owner logins are case-insensitive. Every Project consumer uses this
// key for configuration deduplication, membership unioning, ledger identity,
// completion gates, and diagnostics so one board can never split into two
// logical targets because GitHub returned a different login casing.
export function mirrorProjectKey(
  project: MirrorProjectIdentity | string,
): string {
  return typeof project === "string"
    ? project.toLowerCase()
    : `${project.owner.toLowerCase()}/${project.number}`;
}

export function normalizeMirrorProjectIdentity(
  project: MirrorProjectIdentity,
): MirrorProjectIdentity {
  return {
    owner: project.owner.toLowerCase(),
    number: project.number,
  };
}
