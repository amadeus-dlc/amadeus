import type { NoWriteReasonCode } from "./plan-types.ts";

export function noWriteReasonMessage(reason: NoWriteReasonCode | string): string {
  switch (reason) {
    case "non-interactive-collision":
      return "target contains existing shared files and --force was not supplied.";
    case "already-up-to-date":
      return "target is already at the requested distribution version.";
    case "downgrade-unsupported":
      return "downgrade to an older distribution version is unsupported.";
    case "installed-newer-than-latest":
      return "installed distribution is newer than the latest stable release.";
    case "upgrade-target-none":
      return "upgrade requires an existing installation; run install first.";
    case "unsupported-layout":
      return "target layout is unsupported for upgrade.";
    case "ambiguous-harness":
      return "target harness is ambiguous and could not be resolved.";
    case "partial-target-force-required":
      return "partial target requires --force before upgrade can continue.";
    default:
      return `plan is not writable (${reason}).`;
  }
}

export function noWriteNextAction(reason: NoWriteReasonCode | string): string {
  switch (reason) {
    case "non-interactive-collision":
      return "Re-run interactively to review the plan, or use --force to back up changed shared files before copy.";
    case "already-up-to-date":
      return "No action is required unless you want to reinstall with --force.";
    case "downgrade-unsupported":
      return "Choose a newer or equal distribution version.";
    case "installed-newer-than-latest":
      return "Pass --version explicitly to upgrade to a newer prerelease or release.";
    case "upgrade-target-none":
      return "Run amadeus-setup install for this target first.";
    case "unsupported-layout":
      return "Install into a supported first-release Amadeus layout or choose a different target.";
    case "ambiguous-harness":
      return "Pass --harness explicitly or resolve the ambiguity interactively.";
    case "partial-target-force-required":
      return "Re-run with --force after reviewing the partial target state.";
    default:
      return "Review the plan diagnostics and adjust command flags or target state.";
  }
}
