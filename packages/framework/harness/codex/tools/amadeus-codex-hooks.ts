import { resolve } from "node:path";
import {
  activateCodexHooks,
  codexHooksDoctorCheck,
} from "./amadeus-codex-hooks-contract.ts";
import {
  CodexHooksMigrationError,
  migrateSelfCodexHooks,
} from "./amadeus-codex-hooks-migration.ts";

export {
  activateCodexHooks,
  codexHooksDoctorCheck,
} from "./amadeus-codex-hooks-contract.ts";
export type {
  CodexHooksActivation,
  CodexHooksCheck,
  CodexHooksReason,
} from "./amadeus-codex-hooks-contract.ts";
export {
  CodexHooksMigrationError,
  migrateSelfCodexHooks,
} from "./amadeus-codex-hooks-migration.ts";
export type { CodexHooksMigrationResult } from "./amadeus-codex-hooks-migration.ts";

const CLI_USAGE =
  "Usage:\n" +
  "  amadeus-codex-hooks activate [--project-dir <path>]\n" +
  "  amadeus-codex-hooks doctor [--json] [--project-dir <path>]\n" +
  "  amadeus-codex-hooks migrate-self --target-ref <ref> [--project-dir <path>]\n";

interface CliOptions {
  json: boolean;
  projectDir: string;
  targetRef: string | null;
}

function parseCliOptions(args: string[]): CliOptions | null {
  let json = false;
  let projectDir = process.cwd();
  let targetRef: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-dir" && args[i + 1]) {
      projectDir = resolve(args[++i]);
    } else if (args[i] === "--target-ref" && args[i + 1]) {
      targetRef = args[++i];
    } else if (args[i] === "--json") {
      json = true;
    } else {
      return null;
    }
  }
  return { json, projectDir, targetRef };
}

function runCliCommand(
  command: "activate" | "doctor" | "migrate-self",
  options: CliOptions,
): number {
  if (command === "activate") {
    if (options.json || options.targetRef !== null) throw new Error(CLI_USAGE.trimEnd());
    process.stdout.write(`Codex hooks active: ${activateCodexHooks(options.projectDir)}\n`);
    return 0;
  }
  if (command === "doctor") {
    if (options.targetRef !== null) throw new Error(CLI_USAGE.trimEnd());
    const result = codexHooksDoctorCheck(options.projectDir);
    process.stdout.write(options.json ? `${JSON.stringify(result)}\n` : `${result.label}\n`);
    return result.pass ? 0 : 1;
  }
  if (options.json) throw new Error(CLI_USAGE.trimEnd());
  if (options.targetRef === null || options.targetRef.trim() === "") {
    throw new CodexHooksMigrationError(
      "TARGET_REF_REQUIRED",
      "migrate-self requires a locally available --target-ref",
    );
  }
  const result = migrateSelfCodexHooks(options.projectDir, options.targetRef);
  process.stdout.write("Codex hooks self migration complete\n");
  process.stdout.write(`Target commit: ${result.targetCommit}\n`);
  process.stdout.write(`Backup: ${result.backupPath}\n`);
  process.stdout.write(`SHA-256: ${result.sha256}\n`);
  return 0;
}

export function main(argv: string[] = process.argv.slice(2)): number {
  const [rawCommand, ...args] = argv;
  if (
    rawCommand !== "activate" &&
    rawCommand !== "doctor" &&
    rawCommand !== "migrate-self"
  ) {
    process.stderr.write(CLI_USAGE);
    return 1;
  }
  const options = parseCliOptions(args);
  if (options === null) {
    process.stderr.write(CLI_USAGE);
    return 1;
  }
  try {
    return runCliCommand(rawCommand, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof CodexHooksMigrationError ? ` [${error.code}]` : "";
    process.stderr.write(`ERROR${code}: ${message}\n`);
    return 1;
  }
}

if (import.meta.main) process.exit(main());
