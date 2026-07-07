import { SUPPORTED_HARNESSES, type SetupError } from "./types.ts";

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
    "  --version <version> Requested Amadeus distribution version. Resolution is implemented later.",
    "  --yes               Suppress prompts in later installer units.",
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
