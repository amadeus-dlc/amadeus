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
  const steps: readonly { verb: string; args: readonly string[] }[] = [
    { verb: "init", args: ["init", "-q"] },
    { verb: "add", args: ["add", "-A"] },
    {
      verb: "commit",
      args: [
        "-c", "user.email=live@example.invalid",
        "-c", "user.name=Amadeus Live",
        "-c", "commit.gpgsign=false",
        "-c", "core.hooksPath=",
        "commit", "-qm", "install",
      ],
    },
  ];
  for (const step of steps) {
    const result = spawnSync("git", [...step.args], { cwd: projectDir, encoding: "utf8", env, timeout: 30_000 });
    if (result.status !== 0) throw new Error(`git ${step.verb} failed: ${sanitizeText(result.stderr)}`);
  }
}
