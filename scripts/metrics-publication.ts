import {
  isFullSha,
  runMaintenancePublisher,
  runSnapshotPublisher,
} from "./metrics-publication-domain.ts";
import {
  type CommandRunner,
  MaintenanceCliPort,
  SnapshotCliPort,
  systemCommandRunner,
} from "./metrics-publication-github.ts";

type PublicationCliArgs = {
  mode: "snapshot" | "maintenance";
  targetSha?: string;
  repository: string;
  botLogin: string;
  deadlineSeconds: number;
  pollSeconds: number;
};

const PUBLICATION_USAGE =
  "Usage: bun scripts/metrics-publication.ts snapshot --target-sha <sha> --repository <owner/repo> --bot-login <login> [--deadline-seconds <n>] [--poll-seconds <n>]\n       bun scripts/metrics-publication.ts maintenance --repository <owner/repo> --bot-login <login> [--deadline-seconds <n>] [--poll-seconds <n>]";

function positiveNumber(value: string | undefined, flag: string): number {
  if (value === undefined || !/^[1-9][0-9]*$/.test(value)) throw new Error(`${flag} requires a positive integer`);
  return Number(value);
}

function parseMode(value: string | undefined): PublicationCliArgs["mode"] {
  if (value === "snapshot" || value === "maintenance") return value;
  throw new Error(PUBLICATION_USAGE);
}

function parseOptionValues(argv: string[]): Map<string, string> {
  const allowed = new Set(["--target-sha", "--repository", "--bot-login", "--deadline-seconds", "--poll-seconds"]);
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) throw new Error(PUBLICATION_USAGE);
    if (!allowed.has(flag)) throw new Error(`unknown option: ${flag}`);
    if (values.has(flag)) throw new Error(`duplicate option: ${flag}`);
    values.set(flag, value);
  }
  return values;
}

function parseTargetSha(mode: PublicationCliArgs["mode"], value: string | undefined): string | undefined {
  if (mode === "maintenance" && value !== undefined) throw new Error("--target-sha is only valid in snapshot mode");
  if (mode === "snapshot" && (value === undefined || !isFullSha(value))) {
    throw new Error("--target-sha must be 40 lowercase hexadecimal characters");
  }
  return value;
}

export function parsePublicationArgs(argv: string[]): PublicationCliArgs {
  const mode = parseMode(argv[0]);
  const values = parseOptionValues(argv.slice(1));
  const targetSha = parseTargetSha(mode, values.get("--target-sha"));
  const repository = values.get("--repository");
  const botLogin = values.get("--bot-login");
  if (repository === undefined || !/^[^/\s]+\/[^/\s]+$/.test(repository)) throw new Error("--repository must be owner/name");
  if (botLogin === undefined || botLogin.trim() === "") throw new Error("--bot-login is required");
  return {
    mode,
    targetSha,
    repository,
    botLogin,
    deadlineSeconds: values.has("--deadline-seconds")
      ? positiveNumber(values.get("--deadline-seconds"), "--deadline-seconds")
      : 270,
    pollSeconds: values.has("--poll-seconds") ? positiveNumber(values.get("--poll-seconds"), "--poll-seconds") : 5,
  };
}

export async function publicationMain(
  argv: string[],
  options: { runner?: CommandRunner; repoRoot?: string; nowMs?: () => number } = {},
): Promise<number> {
  let args: PublicationCliArgs;
  try {
    args = parsePublicationArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
  const nowMs = options.nowMs ?? Date.now;
  try {
    const context = {
      repoRoot: options.repoRoot ?? process.cwd(),
      repository: args.repository,
      botLogin: args.botLogin,
      runner: options.runner ?? systemCommandRunner,
    };
    const runOptions = {
      deadlineMs: nowMs() + args.deadlineSeconds * 1000,
      pollIntervalMs: args.pollSeconds * 1000,
    };
    const result =
      args.mode === "snapshot"
        ? await runSnapshotPublisher(new SnapshotCliPort({ ...context, targetSha: args.targetSha ?? "" }), runOptions)
        : await runMaintenancePublisher(new MaintenanceCliPort(context), runOptions);
    console.log(JSON.stringify(result));
    return result.code;
  } catch (error) {
    console.error(JSON.stringify({ code: 1, finalState: "operation-failed", error: error instanceof Error ? error.message : String(error) }));
    return 1;
  }
}

if (import.meta.main) {
  process.exit(await publicationMain(process.argv.slice(2)));
}
