import type { ApplyResult } from "../domain/apply-result.ts";
import type { UsageError } from "../domain/command.ts";
import type { InstallAdmission } from "../domain/installation.ts";
import type { ManifestError } from "../domain/manifest.ts";
import type { FetchError } from "../domain/payload.ts";
import type { Plan, PlanAction, PlanRefusal } from "../domain/plan.ts";
import type { ResolveError } from "../domain/resolved-version.ts";
import type { NextSteps, VerifyResult } from "../domain/verify-result.ts";

// U3 widens this union with UpgradeRefusal once upgrade-flow defines that
// type (domain-entities.md); install-flow only ever produces these five.
export type ClassifiedError = UsageError | ResolveError | FetchError | ManifestError | PlanRefusal;

// SEC-I04: every user-facing string lives here so its wording can be reviewed
// in one place. cli.ts only ever calls console.log/error with these results —
// it never builds its own message text.

export function renderHelp(): string {
  return [
    "amadeus-setup",
    "",
    "Usage:",
    "  amadeus-setup install [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]",
    "  amadeus-setup upgrade [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]",
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
// non-interactive modes, so CI logs stay auditable (BR-I13).
export function renderPlanReport(plan: Plan): string {
  const lines: string[] = ["Plan:"];
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

// upgrade-flow is a separate unit (U3); the CLI Contract's symmetric grammar
// still needs `upgrade` to parse and dispatch in this release.
export function renderUpgradeNotImplemented(): string {
  return "`amadeus-setup upgrade` is not implemented in this release.";
}

// SEC-I04: the one place that phrases a temp-directory setup failure.
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
      return `Invalid --harness value: "${err.raw}". Expected one of claude, codex, kiro, kiro-ide.`;
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
    default:
      return "An unexpected error occurred.";
  }
}

function isFetchErrorLike(err: ClassifiedError): err is FetchError {
  return typeof (err as { guidance?: unknown }).guidance === "function";
}
