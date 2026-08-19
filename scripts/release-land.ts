import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  RELEASE_PR_MARKER,
  parseReleasePrView,
  releaseTagName,
  replaceSetupPackageVersion,
  runReleaseLand,
  type ReleaseBump,
  type ReleaseLandPort,
  type ReleasePrObservation,
} from "./release-land-domain.ts";

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
  readonly bump: ReleaseBump;
  readonly bootstrap: boolean;
  readonly dryRun: boolean;
  readonly deadlineSeconds: number;
  readonly pollSeconds: number;
};

const USAGE =
  "Usage: bun scripts/release-land.ts --repository <owner/repo> --bot-login <login> [--bump patch|minor|major] [--bootstrap] [--dry-run] [--deadline-seconds <n>] [--poll-seconds <n>]";

function positiveNumber(value: string | undefined, flag: string): number {
  if (value === undefined || !/^[1-9][0-9]*$/.test(value)) throw new Error(`${flag} requires a positive integer`);
  return Number(value);
}

function parseBump(value: string | undefined): ReleaseBump {
  if (value === "patch" || value === "minor" || value === "major") return value;
  throw new Error("--bump must be patch, minor, or major");
}

export function parseReleaseLandArgs(argv: string[]): ReleaseLandCliArgs {
  const flags = new Set([
    "--repository",
    "--bot-login",
    "--bump",
    "--bootstrap",
    "--dry-run",
    "--deadline-seconds",
    "--poll-seconds",
  ]);
  const values = new Map<string, string>();
  const switches = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag?.startsWith("--") || !flags.has(flag)) throw new Error(USAGE);
    if (flag === "--bootstrap" || flag === "--dry-run") {
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
  const repository = values.get("--repository");
  const botLogin = values.get("--bot-login");
  if (repository === undefined || !/^[^/\s]+\/[^/\s]+$/.test(repository)) throw new Error("--repository must be owner/name");
  if (botLogin === undefined || botLogin.trim() === "") throw new Error("--bot-login is required");
  const bump = values.has("--bump") ? parseBump(values.get("--bump")) : "patch";
  if (!switches.has("--bootstrap") && !values.has("--bump")) throw new Error("--bump is required unless --bootstrap");
  return {
    repository,
    botLogin,
    bump,
    bootstrap: switches.has("--bootstrap"),
    dryRun: switches.has("--dry-run"),
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

  #setupPackagePath(): string {
    return join(this.#context.repoRoot, "packages/setup/package.json");
  }

  currentSetupVersion(): string {
    const pkg = JSON.parse(readFileSync(this.#setupPackagePath(), "utf8")) as { version?: unknown };
    if (typeof pkg.version !== "string" || pkg.version.length === 0) {
      throw new Error("packages/setup/package.json is missing version");
    }
    return pkg.version;
  }

  currentHeadSha(): string {
    const sha = command(this.#context, ["git", "rev-parse", "HEAD"]);
    return sha;
  }

  tagExists(tag: string): boolean {
    const local = command(this.#context, ["git", "tag", "--list", tag]);
    if (local === tag) return true;
    const remote = command(this.#context, ["git", "ls-remote", "--tags", "origin", `refs/tags/${tag}`]);
    return remote.length > 0;
  }

  writeSetupVersion(version: string): void {
    const path = this.#setupPackagePath();
    writeFileSync(path, replaceSetupPackageVersion(readFileSync(path, "utf8"), version));
  }

  syncVersionSurfaces(version: string): void {
    command(this.#context, ["bun", "scripts/release-version-sync.ts", version]);
  }

  checkoutReleaseBranch(branch: string): void {
    command(this.#context, ["git", "fetch", "--no-tags", "origin", "main"]);
    command(this.#context, ["git", "switch", "--detach", "origin/main"]);
    command(this.#context, ["git", "switch", "-C", branch]);
  }

  createBumpCommit(version: string): void {
    command(this.#context, [
      "git",
      "add",
      "--",
      "packages/setup/package.json",
      "packages/framework/core/tools/amadeus-version.ts",
      "README.md",
    ]);
    command(this.#context, ["git", "commit", "-m", `chore(release): v${version}`]);
  }

  pushReleaseBranch(branch: string): void {
    command(this.#context, [
      "git",
      "push",
      `--force-with-lease=refs/heads/${branch}:`,
      "origin",
      `HEAD:refs/heads/${branch}`,
    ]);
  }

  findOpenReleasePr(branch: string): string | null {
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
    const parsed = parseJsonOutput(output, "gh pr list");
    if (!Array.isArray(parsed)) throw new Error("gh pr list did not return an array");
    if (parsed.length === 0) return null;
    if (parsed.length !== 1) throw new Error(`expected 0 or 1 open release PRs for ${branch}, found ${parsed.length}`);
    const row = parsed[0];
    if (typeof row !== "object" || row === null || Array.isArray(row)) throw new Error("gh pr list row is invalid");
    const record = row as Record<string, unknown>;
    const author = record.author;
    const login =
      typeof author === "object" && author !== null && !Array.isArray(author) && typeof (author as { login?: unknown }).login === "string"
        ? (author as { login: string }).login
        : "";
    if (login !== this.#context.botLogin) {
      throw new Error(`open PR for ${branch} is owned by ${login || "unknown"}, not ${this.#context.botLogin}`);
    }
    if (typeof record.url !== "string" || record.url.length === 0) throw new Error("gh pr list row is missing url");
    return record.url;
  }

  createReleasePr(branch: string, version: string): string {
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

  enableAutoMerge(url: string): void {
    // main's Ruleset requires the merge queue (#2888): the queue owns the
    // merge strategy (ruleset merge_method=SQUASH) and branch deletion, so
    // `--squash` and `--delete-branch` are both rejected by gh CLI (#2925).
    command(this.#context, ["gh", "pr", "merge", "--auto", url]);
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
      bump: args.bump,
      bootstrap: args.bootstrap,
      dryRun: args.dryRun,
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
