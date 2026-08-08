import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";
import { buildChildEnvironment } from "./live-e2e/policy.ts";
import { requireCapability } from "./live-e2e/registry.ts";
import { removeTreeVerified, withRollback } from "./live-e2e/testing/remove-tree-verified.ts";

const CAPABILITY = requireCapability("codex-exec");

export function codexExecLiveSkipReason(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  if (env.GITHUB_ACTIONS === "true") {
    return "live codex-exec E2E is disabled on GitHub Actions";
  }
  if (env.AMADEUS_CODEX_EXEC_LIVE !== "1") {
    return "set AMADEUS_CODEX_EXEC_LIVE=1 to run live codex-exec E2E";
  }
  return null;
}

export function codexExecChildEnvironment(
  home: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): NodeJS.ProcessEnv {
  const isolated = buildChildEnvironment(env, CAPABILITY.environment);
  if (!isolated.ok) throw new Error(`Codex child environment rejected ${isolated.error.key}`);
  return {
    ...isolated.value,
    HOME: home,
    CODEX_HOME: home,
    ...(env.OPENAI_API_KEY === undefined ? {} : { OPENAI_API_KEY: env.OPENAI_API_KEY }),
  };
}

export interface CodexExecLiveRequirements {
  env: Readonly<Record<string, string | undefined>>;
  codexBin: string;
  distributionDir: string;
}

export function codexExecLiveRequirementsSkipReason({
  env,
  codexBin,
  distributionDir,
}: CodexExecLiveRequirements): string | null {
  const environmentReason = codexExecLiveSkipReason(env);
  if (environmentReason !== null) return environmentReason;

  const probeEnvironment = buildChildEnvironment(env, CAPABILITY.environment);
  const version = probeEnvironment.ok
      ? spawnSync(codexBin, ["--version"], {
        encoding: "utf-8",
        env: probeEnvironment.value,
        maxBuffer: 64 * 1024,
        timeout: 15_000,
      })
    : null;
  const match = (version?.stdout ?? "").match(/(\d+)\.(\d+)\.(\d+)/);
  if (
    version === null ||
    version.status !== 0 ||
    match === null ||
    (Number(match[1]) === 0 && Number(match[2]) < 139)
  ) {
    return `codex >= 0.139.0 not found (AMADEUS_CODEX_BIN=${codexBin})`;
  }
  if (!existsSync(distributionDir)) return `distributable missing: ${distributionDir}`;

  if (env.OPENAI_API_KEY === undefined || env.OPENAI_API_KEY === "") {
    return "set OPENAI_API_KEY to provide an isolated Codex credential lease";
  }
  return null;
}

export interface CodexExecHome {
  root: string;
  home: string;
  cleanup: () => void;
}

export function setupCodexExecHome(prefix: string): CodexExecHome {
  const root = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  const home = join(root, "codex-home");
  const cleanup = (): void => removeTreeVerified(root);
  return withRollback(cleanup, () => {
    mkdirSync(home, { recursive: true });
    return { root, home, cleanup };
  });
}

interface CodexExecHomeConfig {
  home: string;
  projectDir: string;
  model: string;
  trustConfig: string;
  rulesDir?: string;
}

function writeCodexExecHomeConfig({
  home,
  projectDir,
  model,
  trustConfig,
  rulesDir,
}: CodexExecHomeConfig): void {
  const lines = [
    `model = ${JSON.stringify(model)}`,
    `model_context_window = 1000000`,
    `model_reasoning_effort = "low"`,
    ``,
  ];
  if (rulesDir !== undefined) {
    lines.push(
      `[shell_environment_policy]`,
      `set = { AMADEUS_RULES_DIR = ${JSON.stringify(rulesDir)} }`,
      ``,
    );
  }
  lines.push(
    `[projects.${JSON.stringify(projectDir)}]`,
    `trust_level = "trusted"`,
    ``,
    trustConfig.trimEnd(),
  );
  writeFileSync(join(home, "config.toml"), lines.join("\n"), "utf-8");
}

function pathIsInside(parent: string, candidate: string): boolean {
  const pathFromParent = relative(realpathSync(parent), realpathSync(candidate));
  return (
    pathFromParent === "" ||
    (pathFromParent !== ".." &&
      !pathFromParent.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromParent))
  );
}

export interface InitializeCodexExecProjectOptions {
  projectDir: string;
  home: string;
  repositoryRoot: string;
  model: string;
  rulesDir?: string;
}

export function initializeCodexExecProject({
  projectDir,
  home,
  repositoryRoot,
  model,
  rulesDir,
}: InitializeCodexExecProjectOptions): void {
  if (pathIsInside(projectDir, home)) {
    throw new Error(`CODEX_HOME must be outside the project: ${home}`);
  }

  for (const args of [
    ["init", "-q"],
    ["add", "-A"],
    ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "install"],
  ]) {
    const result = spawnSync("git", args, { cwd: projectDir, encoding: "utf-8" });
    if (result.status !== 0) {
      throw new Error(`git ${args[0]} failed: ${result.stderr}`);
    }
  }

  const trust = spawnSync(
    "bun",
    [join(repositoryRoot, "scripts", "package.ts"), "codex", "trust", "--project", projectDir],
    { encoding: "utf-8", cwd: repositoryRoot },
  );
  if (trust.status !== 0) throw new Error(`trust emit failed: ${trust.stderr}`);
  writeCodexExecHomeConfig({
    home,
    projectDir,
    model,
    rulesDir,
    trustConfig: trust.stdout,
  });
}

export interface SetupCodexExecProjectOptions {
  prefix: string;
  distributionDir: string;
  repositoryRoot: string;
  model: string;
  rulesDir?: string;
  prepareProject?: (projectDir: string) => void;
}

export interface CodexExecProject extends CodexExecHome {
  proj: string;
}

export function setupCodexExecProject({
  prefix,
  distributionDir,
  repositoryRoot,
  model,
  rulesDir,
  prepareProject,
}: SetupCodexExecProjectOptions): CodexExecProject {
  const scratch = setupCodexExecHome(prefix);
  const proj = join(scratch.root, "proj");
  return withRollback(scratch.cleanup, () => {
    cpSync(join(distributionDir, ".codex"), join(proj, ".codex"), { recursive: true });
    cpSync(join(proj, ".codex", "config.toml.example"), join(proj, ".codex", "config.toml"));
    cpSync(join(proj, ".codex", "hooks.json.example"), join(proj, ".codex", "hooks.json"));
    cpSync(join(distributionDir, ".agents"), join(proj, ".agents"), { recursive: true });
    cpSync(join(distributionDir, "AGENTS.md"), join(proj, "AGENTS.md"));
    prepareProject?.(proj);
    initializeCodexExecProject({
      projectDir: proj,
      home: scratch.home,
      repositoryRoot,
      model,
      rulesDir,
    });
    return { ...scratch, proj };
  });
}
