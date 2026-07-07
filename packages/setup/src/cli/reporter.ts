import type { SetupResult } from "../domain/apply-types.ts";
import type { FileOperation, FileOperationPlan } from "../domain/plan-types.ts";
import { noWriteNextAction, noWriteReasonMessage } from "../domain/plan-messages.ts";
import { SUPPORTED_HARNESSES, type SetupError } from "./types.ts";

export { noWriteNextAction, noWriteReasonMessage };

export function renderHelp(): string {
  return [
    "amadeus-setup",
    "",
    "Usage:",
    "  amadeus-setup install [--harness <name>] [--target <path>] [--version <version>] [--yes] [--force]",
    "  amadeus-setup upgrade [--harness <name>] [--target <path>] [--version <version>] [--yes] [--force]",
    "",
    "Commands:",
    "  install   Install Amadeus DLC harness files into a target project.",
    "  upgrade   Upgrade an existing Amadeus DLC harness installation.",
    "",
    "Options:",
    `  --harness <name>    One of: ${SUPPORTED_HARNESSES.join(", ")}.`,
    "  --target <path>     Target project path. U1 preserves the value but does not inspect it.",
    "  --version <version> Requested Amadeus distribution version (stable default or explicit tag).",
    "  --yes               Suppress prompts and confirmations (non-interactive mode).",
    "  --force             Preserve the force intent for later collision policy. Does not imply --yes.",
    "  -h, --help          Show this help.",
    "",
    "Runtime:",
    "  Bun is required for this release. Prefer: bunx @amadeus-dlc/setup --help",
    "  npx @amadeus-dlc/setup is best-effort and delegates to Bun when Bun is discoverable on PATH.",
  ].join("\n");
}

export function renderError(error: SetupError): string {
  const lines = [
    `amadeus-setup: ${error.message}`,
    `Code: ${error.code}`,
    `Next action: ${error.nextAction}`,
  ];
  if (error.noFilesModified) {
    lines.push("No files were modified.");
  }
  return lines.join("\n");
}

type OperationRow = {
  kind: FileOperation["kind"];
  count: number;
  example: string;
};

function operationExample(operation: FileOperation): string {
  switch (operation.kind) {
    case "backup":
      return `${operation.path} -> ${operation.backupPath}`;
    case "force-update":
      return `${operation.path} (force)`;
    case "conflict":
      return `${operation.path} (${operation.reason})`;
    case "skip":
      return `${operation.path} (${operation.reason})`;
    default:
      return operation.path;
  }
}

function buildOperationRows(operations: FileOperation[]): OperationRow[] {
  const rows: OperationRow[] = [];
  const indexByKind = new Map<FileOperation["kind"], number>();
  for (const operation of operations) {
    const existingIndex = indexByKind.get(operation.kind);
    if (existingIndex === undefined) {
      indexByKind.set(operation.kind, rows.length);
      rows.push({ kind: operation.kind, count: 1, example: operationExample(operation) });
      continue;
    }
    const row = rows[existingIndex];
    if (row !== undefined) {
      row.count += 1;
    }
  }
  return rows;
}

function renderOperationTable(operations: FileOperation[]): string {
  const rows = buildOperationRows(operations);
  if (rows.length === 0) {
    return "File operations:\n  (none)";
  }
  const lines = ["File operations:", "| Operation | Files | Example |", "|---|---:|---|"];
  for (const row of rows) {
    lines.push(`| ${row.kind} | ${row.count} | ${row.example} |`);
  }
  return lines.join("\n");
}

export function renderPlan(plan: FileOperationPlan): string {
  const manifestPath = `${plan.target}/${plan.manifestPath}`;
  return [
    "Amadeus Setup",
    "",
    "Plan:",
    `  command:  ${plan.command}`,
    `  harness:  ${plan.harness}`,
    `  target:   ${plan.target}`,
    `  manifest: ${manifestPath}`,
    `  version:  ${plan.resolvedVersion.distributionVersion}`,
    "",
    renderOperationTable(plan.operations),
  ].join("\n");
}

function renderBackupSummary(backups: Array<{ path: string; backupPath: string }>): string {
  if (backups.length === 0) {
    return "";
  }
  const lines = ["Backups:"];
  for (const backup of backups) {
    lines.push(`  ${backup.path} -> ${backup.backupPath}`);
  }
  return lines.join("\n");
}

function renderAppliedSummary(applied: FileOperation[]): string {
  const mutating = applied.filter((operation) => operation.kind === "add" || operation.kind === "update" || operation.kind === "force-update" || operation.kind === "backup");
  if (mutating.length === 0) {
    return "";
  }
  return ["Applied operations:", renderOperationTable(mutating)].join("\n");
}

function renderVerification(result: SetupResult): string {
  if (result.verificationResult === undefined) {
    return "";
  }
  if (result.verificationResult.ok) {
    return "Verifying installation... done";
  }
  const failed = result.verificationResult.checks.filter((check) => check.status === "failed");
  const lines = ["Verifying installation... failed", "", "Error: installation verification failed."];
  for (const check of failed) {
    lines.push(`  failed check: ${check.name}`);
  }
  return lines.join("\n");
}

export function renderResult(result: SetupResult, options: { omitPlan?: boolean } = {}): string {
  const sections: string[] = [];
  if (result.plan !== undefined && options.omitPlan !== true) {
    sections.push(renderPlan(result.plan));
  }
  if (result.applyResult !== undefined) {
    const apply = result.applyResult;
    if (apply.ok) {
      sections.push("Applying plan... done");
      const backupSummary = renderBackupSummary(apply.backups);
      if (backupSummary.length > 0) {
        sections.push(backupSummary);
      }
      if (apply.manifestWrite === "written") {
        sections.push("Writing installer manifest... done");
      } else if (apply.manifestWrite === "failed") {
        sections.push("Writing installer manifest... failed");
      }
      const verification = renderVerification(result);
      if (verification.length > 0) {
        sections.push(verification);
      }
      if (result.verificationResult?.ok === true) {
        sections.push(
          "",
          result.plan?.command === "upgrade" ? "Upgraded Amadeus." : "Installed Amadeus.",
          `  harness:  ${result.plan?.harness ?? "unknown"}`,
          `  version:  ${result.plan?.resolvedVersion.distributionVersion ?? "unknown"}`,
          `  manifest: ${result.plan?.manifestPath ?? "unknown"}`,
        );
      }
    } else {
      sections.push(`Apply failed during ${apply.failedPhase}.`);
      sections.push(renderAppliedSummary(apply.applied));
      const backupSummary = renderBackupSummary(apply.backups);
      if (backupSummary.length > 0) {
        sections.push(backupSummary);
      }
    }
  }
  if (result.classifiedError !== undefined) {
    sections.push("", renderError(result.classifiedError));
  }
  return sections.join("\n");
}
