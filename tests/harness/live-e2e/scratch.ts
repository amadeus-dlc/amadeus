import { spawnSync } from "node:child_process";
import { sanitizeText } from "./contract.ts";
import { buildChildEnvironment, type EnvironmentDeclaration } from "./policy.ts";

/**
 * Commit the freshly installed distribution inside a scratch project so a live
 * journey starts from a clean tree. Global and system Git configuration are
 * pinned away from the developer's own so the scratch project can never inherit
 * user identity, hooks, or signing keys.
 */
export function initializeScratchGit(
  projectDir: string,
  homeDir: string,
  parentEnv: Readonly<Record<string, string | undefined>>,
  declaration: EnvironmentDeclaration,
): void {
  const base = buildChildEnvironment(parentEnv, declaration);
  if (!base.ok) throw new Error(`git environment rejected ${base.error.key}`);
  const env = {
    ...base.value,
    HOME: homeDir,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
  };
  for (const args of [
    ["init", "-q"],
    ["add", "-A"],
    [
      "-c", "user.email=live@example.invalid",
      "-c", "user.name=Amadeus Live",
      "-c", "commit.gpgsign=false",
      "-c", "core.hooksPath=",
      "commit", "-qm", "install",
    ],
  ]) {
    const result = spawnSync("git", args, { cwd: projectDir, encoding: "utf8", env, timeout: 30_000 });
    if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${sanitizeText(result.stderr)}`);
  }
}
