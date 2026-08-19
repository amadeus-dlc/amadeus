import { appendFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  RELEASE_PR_MARKER,
  parseOpenReleasePrUrl,
  parseReleasePrView,
  releaseBranchName,
  releaseTagName,
  runReleaseLand,
  type ReleaseBump,
  type ReleaseLandMode,
  type ReleaseLandPort,
  type ReleasePrObservation,
} from "./release-land-domain.ts";
import { SETUP_PACKAGE_REL, VERSION_SURFACES } from "./release-version-sync-plan.ts";

export type CommandOutput = { stdout: string; stderr: string };
export type CommandRunner = {
  run(command: string[], options?: { cwd?: string }): CommandOutput;
};

export const systemCommandRunner: CommandRunner = {
  run(command, options = {}) {
    const result = spawnSync(command[0], command.slice(1), {
      cwd: options.cwd,
      encoding: "utf8",
      env: process.env,
    });
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || `${command[0]} exited ${result.status}`).trim();
      throw new Error(`${command.join(" ")}: ${detail}`);
    }
    return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  },
};

export type ReleaseLandCliArgs = {
  readonly repository: string;
  readonly botLogin: string;
  readonly mode: ReleaseLandMode;
  readonly deadlineSeconds: number;
  readonly pollSeconds: number;
};

const USAGE =
  "Usage: bun scripts/release-land.ts --repository <owner/repo> --bot-login <login> [--bump patch|minor|major] [--bootstrap] [--dry-run] [--deadline-seconds <n>] [--poll-seconds <n>]";

const BUMP_TRACKED_PATHS = VERSION_SURFACES.map((surface) => surface.relPath);

function positiveNumber(value: string | undefined, flag: string): number {
  if (value === undefined || !/^[1-9][0-9]*$/.test(value)) throw new Error(`${flag} requires a positive integer`);
  return Number(value);
}

function parseBump(value: string | undefined): ReleaseBump {
  if (value === "patch" || value === "minor" || value === "major") return value;
  throw new Error("--bump must be patch, minor, or major");
}

function modeFromFlags(input: { readonly bootstrap: boolean; readonly dryRun: boolean; readonly bump: ReleaseBump }): ReleaseLandMode {
  if (input.dryRun) return { kind: "dry-run", bump: input.bump };
  if (input.bootstrap) return { kind: "bootstrap" };
  return { kind: "land", bump: input.bump };
}

function collectCliFlags(
  argv: string[],
  spec: { readonly values: ReadonlySet<string>; readonly switches: ReadonlySet<string> },
): { values: Map<string, string>; switches: Set<string> } {
  const values = new Map<string, string>();
  const switches = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === undefined || !(spec.values.has(flag) || spec.switches.has(flag))) throw new Error(USAGE);
    if (spec.switches.has(flag)) {
      if (switches.has(flag)) throw new Error(`duplicate option: ${flag}`);
      switches.add(flag);
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(USAGE);
    if (values.has(flag)) throw new Error(`duplicate option: ${flag}`);
    values.set(flag, value);
    index += 1;
  }
  return { values, switches };
}

export function parseReleaseLandArgs(argv: string[]): ReleaseLandCliArgs {
  const { values, switches } = collectCliFlags(argv, {
    values: new Set(["--repository", "--bot-login", "--bump", "--deadline-seconds", "--poll-seconds"]),
    switches: new Set(["--bootstrap", "--dry-run"]),
  });
  const repository = values.get("--repository");
  const botLogin = values.get("--bot-login");
  if (repository === undefined || !/^[^/\s]+\/[^/\s]+$/.test(repository)) throw new Error("--repository must be owner/name");
  if (botLogin === undefined || botLogin.trim() === "") throw new Error("--bot-login is required");
  const bump = values.has("--bump") ? parseBump(values.get("--bump")) : "patch";
  if (!switches.has("--bootstrap") && !values.has("--bump")) throw new Error("--bump is required unless --bootstrap");
  return {
    repository,
    botLogin,
    mode: modeFromFlags({
      bootstrap: switches.has("--bootstrap"),
      dryRun: switches.has("--dry-run"),
      bump,
    }),
    deadlineSeconds: values.has("--deadline-seconds")
      ? positiveNumber(values.get("--deadline-seconds"), "--deadline-seconds")
      : 4800,
    pollSeconds: values.has("--poll-seconds") ? positiveNumber(values.get("--poll-seconds"), "--poll-seconds") : 15,
  };
}

type ReleaseLandContext = {
  readonly repoRoot: string;
  readonly repository: string;
  readonly botLogin: string;
  readonly runner: CommandRunner;
};

function command(context: ReleaseLandContext, args: string[], options: { cwd?: string } = {}): string {
  return context.runner.run(args, { cwd: options.cwd ?? context.repoRoot }).stdout;
}

function parseJsonOutput(output: string, source: string): unknown {
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`${source} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export class ReleaseLandCliPort implements ReleaseLandPort {
  readonly #context: ReleaseLandContext;

  constructor(context: ReleaseLandContext) {
    this.#context = context;
  }

  currentSetupVersion(): string {
    const pkg = JSON.parse(readFileSync(join(this.#context.repoRoot, SETUP_PACKAGE_REL), "utf8")) as {
      version?: unknown;
    };
    if (typeof pkg.version !== "string" || pkg.version.length === 0) {
      throw new Error(`${SETUP_PACKAGE_REL} is missing version`);
    }
    return pkg.version;
  }

  currentHeadSha(): string {
    return command(this.#context, ["git", "rev-parse", "HEAD"]);
  }

  tagExists(tag: string): boolean {
    const local = command(this.#context, ["git", "tag", "--list", tag]);
    if (local === tag) return true;
    const remote = command(this.#context, ["git", "ls-remote", "--tags", "origin", `refs/tags/${tag}`]);
    return remote.length > 0;
  }

  queueReleasePullRequest(version: string): string {
    const url = this.#ensureReleasePullRequest(version);
    // main's Ruleset requires the merge queue (#2888): the queue owns the
    // merge strategy (ruleset merge_method=SQUASH) and branch deletion, so
    // `--squash` and `--delete-branch` are both rejected by gh CLI (#2925).
    command(this.#context, ["gh", "pr", "merge", "--auto", url]);
    return url;
  }

  observePr(url: string): ReleasePrObservation {
    const output = command(this.#context, [
      "gh",
      "pr",
      "view",
      url,
      "--json",
      "state,url,mergeCommit,statusCheckRollup",
    ]);
    return parseReleasePrView(parseJsonOutput(output, "gh pr view"), "gh pr view");
  }

  createAndPushTag(version: string, sha: string): void {
    const tag = releaseTagName(version);
    command(this.#context, ["git", "tag", "-a", tag, "-m", `Release ${tag}`, sha]);
    command(this.#context, ["git", "push", "origin", tag]);
  }

  nowMs(): number {
    return Date.now();
  }

  async sleep(milliseconds: number): Promise<void> {
    await Bun.sleep(milliseconds);
  }

  #ensureReleasePullRequest(version: string): string {
    const branch = releaseBranchName(version);
    const existing = this.#findOpenReleasePr(branch);
    if (existing !== null) return existing;
    this.#checkoutReleaseBranch(branch);
    command(this.#context, ["bun", "scripts/release-version-sync.ts", version]);
    command(this.#context, ["git", "add", "--", ...BUMP_TRACKED_PATHS]);
    command(this.#context, ["git", "commit", "-m", `chore(release): v${version}`]);
    command(this.#context, [
      "git",
      "push",
      `--force-with-lease=refs/heads/${branch}:`,
      "origin",
      `HEAD:refs/heads/${branch}`,
    ]);
    return this.#findOpenReleasePr(branch) ?? this.#createReleasePr(branch, version);
  }

  #checkoutReleaseBranch(branch: string): void {
    command(this.#context, ["git", "fetch", "--no-tags", "origin", "main"]);
    command(this.#context, ["git", "switch", "--detach", "origin/main"]);
    command(this.#context, ["git", "switch", "-C", branch]);
  }

  #findOpenReleasePr(branch: string): string | null {
    const output = command(this.#context, [
      "gh",
      "pr",
      "list",
      "--repo",
      this.#context.repository,
      "--base",
      "main",
      "--head",
      branch,
      "--state",
      "open",
      "--json",
      "url,author",
    ]);
    return parseOpenReleasePrUrl(parseJsonOutput(output, "gh pr list"), {
      branch,
      botLogin: this.#context.botLogin,
    });
  }

  #createReleasePr(branch: string, version: string): string {
    return command(this.#context, [
      "gh",
      "pr",
      "create",
      "--repo",
      this.#context.repository,
      "--base",
      "main",
      "--head",
      branch,
      "--title",
      `chore(release): v${version}`,
      "--body",
      `${RELEASE_PR_MARKER}\nAutomated release version sync for v${version}.\n\nOpened by the Release workflow. Merge Queue lands it; this run tags the squash commit and publishes.`,
    ]);
  }
}

function writeGithubOutput(result: { version: string; sha: string }): void {
  const path = process.env.GITHUB_OUTPUT;
  if (path === undefined || path.length === 0) return;
  appendFileSync(path, `version=${result.version}\nsha=${result.sha}\n`);
}

export async function releaseLandMain(
  argv: string[],
  options: { runner?: CommandRunner; repoRoot?: string } = {},
): Promise<number> {
  let args: ReleaseLandCliArgs;
  try {
    args = parseReleaseLandArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
  try {
    const port = new ReleaseLandCliPort({
      repoRoot: options.repoRoot ?? process.cwd(),
      repository: args.repository,
      botLogin: args.botLogin,
      runner: options.runner ?? systemCommandRunner,
    });
    const result = await runReleaseLand(port, {
      mode: args.mode,
      deadlineMs: Date.now() + args.deadlineSeconds * 1000,
      pollIntervalMs: args.pollSeconds * 1000,
    });
    writeGithubOutput(result);
    console.log(JSON.stringify(result));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.main) {
  process.exit(await releaseLandMain(process.argv.slice(2)));
}
