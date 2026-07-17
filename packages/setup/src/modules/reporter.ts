import type { ApplyResult } from "../domain/apply-result.ts";
import type { UsageError } from "../domain/command.ts";
import type { InstallAdmission, InstallationError } from "../domain/installation.ts";
import type { ManifestError } from "../domain/manifest.ts";
import type { FetchError } from "../domain/payload.ts";
import type { Plan, PlanAction, PlanRefusal } from "../domain/plan.ts";
import type { ResolveError } from "../domain/resolved-version.ts";
import type { UpgradeRefusal } from "../domain/upgrade.ts";
import type { NextSteps, VerifyResult } from "../domain/verify-result.ts";

// U3 widens this union with UpgradeRefusal (domain-entities.md); install-flow
// alone only ever produces the first five members.
export type ClassifiedError = UsageError | ResolveError | FetchError | ManifestError | PlanRefusal | UpgradeRefusal | InstallationError;

// SEC-I04: every user-facing string lives here so its wording can be reviewed
// in one place. cli.ts only ever calls console.log/error with these results —
// it never builds its own message text.

export function renderHelp(): string {
  return [
    "amadeus-setup",
    "",
    "Usage:",
    "  amadeus-setup install [--harness <claude|codex|kiro|kiro-ide|opencode|cursor>] [--target <path>] [--version <semver|tag>] [--yes] [--force]",
    "  amadeus-setup upgrade [--harness <claude|codex|kiro|kiro-ide|opencode|cursor>] [--target <path>] [--version <semver|tag>] [--yes] [--force]",
    "  amadeus-setup            # this help; install/upgrade are never run implicitly",
  ].join("\n");
}

const ACTION_LABELS: Record<PlanAction, string> = {
  add: "Add",
  update: "Update",
  skip: "Skip",
  backup: "Backup then copy",
  conflict: "Conflict (needs confirmation)",
};

// FR-007: always rendered before apply/exit, in both interactive and
// non-interactive modes, so CI logs stay auditable (BR-I13). `note` carries
// upgrade's source.strategyNote() (business-logic-model.md workflow 1);
// install never passes one, so its report is unchanged.
export function renderPlanReport(plan: Plan, note?: string): string {
  const lines: string[] = [];
  if (note !== undefined) lines.push(note, "");
  lines.push("Plan:");
  const actionsInReportOrder: readonly PlanAction[] = ["add", "update", "backup", "conflict", "skip"];
  for (const action of actionsInReportOrder) {
    const entries = plan.entriesBy(action);
    if (entries.length === 0) continue;
    lines.push(`  ${ACTION_LABELS[action]}:`);
    for (const entry of entries) {
      lines.push(`    ${entry.path}${entry.forced ? " (forced)" : ""}`);
    }
  }
  const summary = plan.summary();
  lines.push(
    `Summary: add=${summary.add} update=${summary.update} backup=${summary.backup} conflict=${summary.conflict} skip=${summary.skip}`,
  );
  return lines.join("\n");
}

// FR-004/BR-I07: the only UX for a refused install (fresh files untouched).
export function renderAlreadyInstalled(admission: InstallAdmission): string {
  if (admission.type !== "refuse-suggest-upgrade") {
    return "Amadeus is already installed here.";
  }
  return [
    `Amadeus is already installed here (${admission.detected}).`,
    "Run `amadeus-setup upgrade` instead, or pass --force to reinstall.",
  ].join("\n");
}

// Partial-apply failures are never reported as success (no silent failures).
export function renderApplyFailure(applied: ApplyResult): string {
  const lines = ["Install failed while applying files:"];
  for (const failure of applied.failures()) {
    lines.push(`  [${failure.operation}] ${failure.path}: ${failure.detail}`);
  }
  lines.push("No manifest was written; re-run once the issue above is resolved.");
  return lines.join("\n");
}

export function renderVerifyFailure(verify: VerifyResult): string {
  const lines = ["Verification failed after install:"];
  for (const check of verify.failures()) {
    lines.push(`  [${check.name}] ${check.detail}`);
  }
  return lines.join("\n");
}

// US-A6: harness, version, target, verification checks, then next steps.
export function renderSuccess(_applied: ApplyResult, verify: VerifyResult, next: NextSteps): string {
  const lines = ["Install complete.", "", "Verification:"];
  for (const check of verify.checks()) {
    lines.push(`  [${check.ok ? "ok" : "FAIL"}] ${check.name}: ${check.detail}`);
  }
  lines.push("", ...next.lines());
  return lines.join("\n");
}

// BR-I18: rejecting the wizard's final confirmation is an explicit abort —
// this is the only message printed for it (workflow 2's inline "中断しました").
export function renderWizardAborted(): string {
  return "Install aborted: selection was not confirmed. No files were changed.";
}

// SEC-I04: the one place that phrases a temp-directory setup failure.
// FR-742 / E-B3b Q2=a: when --force reinstalls over an unreadable manifest,
// the override is loud — the user sees what was wrong and that the manifest
// will be rewritten by the install, never a silent swallow of the corruption.
export function renderCorruptManifestForced(err: InstallationError): string {
  return [
    `WARNING: The installer manifest at ${err.path} exists but could not be read.`,
    renderError(err.cause),
    "--force: continuing anyway; the install will rewrite the manifest on success.",
  ].join("\n");
}

export function renderTmpDirFailure(detail: string): string {
  return `could not prepare a temp directory: ${detail}`;
}

// US-A7/FR-012: classification line, detail, then retry guidance for network
// failures; a dedicated message per UsageError/ResolveError/ManifestError/
// PlanRefusal variant otherwise.
export function renderError(err: ClassifiedError): string {
  if (isFetchErrorLike(err)) {
    return [`Network error (${err.type}): ${err.detail}`, err.guidance()].join("\n");
  }

  switch (err.type) {
    case "unknown-subcommand":
      return `Unknown command: "${err.raw}". Run \`amadeus-setup\` with no arguments for usage.`;
    case "unknown-flag":
      return `Unknown option: ${err.raw}. Run \`amadeus-setup\` with no arguments for usage.`;
    case "invalid-harness":
      return `Invalid --harness value: "${err.raw}". Expected one of claude, codex, kiro, kiro-ide, opencode, cursor.`;
    case "multiple-harnesses":
      return `Only one --harness is supported per run (got: ${err.raws.join(", ")}). Run once per harness.`;
    case "missing-required":
      return `Missing required option(s) in non-interactive mode: ${err.fields.join(", ")}.`;
    case "invalid-version":
      return `Invalid --version value: "${err.cause.raw}" (${err.cause.reason}).`;
    case "no-stable-version":
      return `Could not resolve a version to install: ${err.detail}`;
    case "not-found":
      return `Requested version not found: ${err.requested}`;
    case "schema-unsupported":
      return "The existing installer manifest uses an unsupported schema version.";
    case "malformed":
      return `The existing installer manifest is malformed: ${err.detail}`;
    case "unknown-harness":
      return `The existing installer manifest references an unknown harness: "${err.raw}".`;
    case "duplicate-path":
      return `Internal error: duplicate manifest path "${err.path}".`;
    case "io":
      return `I/O error: ${err.detail}`;
    case "already-installed":
      return renderAlreadyInstalled(err.admission);
    case "harness-not-in-payload":
      return `The requested harness "${err.harness}" is not present in this distribution.`;
    case "no-installation":
      return "No Amadeus installation was found here. Run `amadeus-setup install` instead.";
    case "unsupported-layout":
      return `This installation cannot be upgraded: ${err.detail}. No files were changed.`;
    case "partial-refused":
      return `A partial Amadeus installation was found (missing: ${err.missing.join(", ")}). Re-run with --force to proceed conservatively, or restore the missing files first.`;
    case "already-up-to-date":
      return `Already up to date: the installed version (${err.installed.format()}) matches the requested version.`;
    case "downgrade-unsupported":
      return `Cannot downgrade: requested ${err.requested.format()} is older than the installed version ${err.installed.format()}.`;
    case "installed-newer-than-latest":
      return `The installed version (${err.installed.format()}) is newer than the latest resolved version (${err.latest.format()}). Pass --version to target a specific release.`;
    case "corrupt-manifest":
      return [
        `The installer manifest at ${err.path} exists but could not be read.`,
        renderError(err.cause),
        "Re-run `amadeus-setup install --force` to reinstall over it, or remove/restore the manifest and try again.",
      ].join("\n");
    default:
      return "An unexpected error occurred.";
  }
}

function isFetchErrorLike(err: ClassifiedError): err is FetchError {
  return typeof (err as { guidance?: unknown }).guidance === "function";
}
