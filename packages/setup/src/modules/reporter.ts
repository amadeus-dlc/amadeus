import type { ApplyResult } from "../domain/apply-result.ts";
import type { UsageError } from "../domain/command.ts";
import { HarnessName } from "../domain/harness.ts";
import type { InstallAdmission, InstallationError } from "../domain/installation.ts";
import type { ManifestError } from "../domain/manifest.ts";
import type { OnboardingNotice } from "../domain/onboarding-ladder.ts";
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
  const harnesses = HarnessName.all.join("|");
  return [
    "amadeus-setup",
    "",
    "Usage:",
    `  amadeus-setup install [--harness <${harnesses}>] [--target <path>] [--version <semver|tag>] [--yes] [--force]`,
    `  amadeus-setup upgrade [--harness <${harnesses}>] [--target <path>] [--version <semver|tag>] [--yes] [--force]`,
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
  // #3388: a diverted or withheld onboarding doc is stated in words here, not
  // left to be inferred from an unfamiliar "-AMADEUS.md" path in the Add list.
  // This block is harness-neutral and always printed; the harness-specific
  // wiring steps ride with the success report (renderOnboardingWiring).
  const notices = plan.onboardingNotices();
  if (notices.length > 0) {
    lines.push("Onboarding doc:");
    for (const notice of notices) {
      lines.push(noticeLine(notice));
    }
  }
  return lines.join("\n");
}

// The one-line plan-report form of a notice. An upgrade that follows the
// installed manifest to the alternate reaches here with primaryExists=false
// whenever the user has since removed their own file at the real name, so
// "already exists" is stated only when it was actually observed.
function noticeLine(notice: OnboardingNotice): string {
  if (notice.kind === "blocked") {
    return `  ${notice.primary} and ${notice.alternate} both exist — not installed (manual wiring required).`;
  }
  if (notice.primaryExists) {
    return `  ${notice.primary} already exists — installing to ${notice.alternate} instead (manual wiring required).`;
  }
  return `  Installing to ${notice.alternate}, where the previous install placed it — ${notice.primary} must import it (manual wiring required).`;
}

// #3388, completion condition 2: the alternate onboarding filename is inert
// until the user wires it up — no harness auto-loads it — so an install that
// used one owes the user the exact wiring step for THEIR harness. Returns null
// when the doc landed on its real name and there is nothing to do.
export function renderOnboardingWiring(notices: readonly OnboardingNotice[], harness: HarnessName): string | null {
  if (notices.length === 0) return null;
  const lines = ["Action required — the Amadeus onboarding doc is not wired in yet:"];
  for (const notice of notices) {
    lines.push("");
    if (notice.kind === "alternate") {
      lines.push(
        notice.primaryExists
          ? `  ${notice.primary} already existed, so the onboarding doc was written to ${notice.alternate}.`
          : `  The onboarding doc was written to ${notice.alternate}, where the previous install placed it.`,
      );
    } else {
      lines.push(`  ${notice.primary} and ${notice.alternate} both already existed, so no onboarding doc was written.`);
    }
    lines.push(...wiringSteps(notice, harness));
  }
  return lines.join("\n");
}

// Claude Code resolves @-imports from CLAUDE.md, so one added line is the whole
// procedure. Codex-family harnesses (every AGENTS.md harness) read AGENTS.md
// and nothing else — there is no import mechanism to point at the alternate —
// so the content has to be merged by hand.
function wiringSteps(notice: OnboardingNotice, harness: HarnessName): string[] {
  const wireIn =
    (harness as string) === "claude"
      ? `  Add the line "@${notice.alternate}" to ${notice.primary}. Claude Code auto-loads ${notice.primary} only, so ${notice.alternate} stays inert until it is imported.`
      : `  Merge ${notice.alternate} into ${notice.primary}, or copy the parts you want across. This harness reads ${notice.primary} only and has no @-import, so ${notice.alternate} stays inert on its own.`;
  if (notice.kind === "alternate") return [wireIn];
  return [`  Move the existing ${notice.alternate} aside and re-run the installer, then:`, wireIn];
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
// `wiring` (#3388) is renderOnboardingWiring's output, appended last so the
// manual step the user still owes is the final thing on screen.
export function renderSuccess(_applied: ApplyResult, verify: VerifyResult, next: NextSteps, wiring: string | null = null): string {
  const lines = ["Install complete.", "", "Verification:"];
  for (const check of verify.checks()) {
    lines.push(`  [${check.ok ? "ok" : "FAIL"}] ${check.name}: ${check.detail}`);
  }
  lines.push("", ...next.lines());
  if (wiring !== null) lines.push("", wiring);
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

// FR-5a decision tree (kimi): an unreadable hook snippet master in the
// fetched payload is a broken distribution — loud fail, never silently skip
// the hook wiring.
export function renderSnippetUnreadable(path: string, detail: string): string {
  return `could not read the Kimi hook snippet at ${path}: ${detail}. The distribution is broken; your Kimi config was not changed.`;
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
      return `Invalid --harness value: "${err.raw}". Expected one of ${HarnessName.all.join(", ")}.`;
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
