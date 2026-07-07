#!/usr/bin/env node
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const WRAPPER_PATH = fileURLToPath(import.meta.url);
const PACKAGE_ROOT = dirname(dirname(WRAPPER_PATH));
const BUN_ENTRYPOINT = join(PACKAGE_ROOT, "src", "bin", "amadeus-setup.ts");

function executableCandidates(directory, executableName, env, platform) {
  if (platform === "win32") {
    const extensions = (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
      .split(";")
      .filter(Boolean);
    return extensions.map((extension) => join(directory, `${executableName}${extension}`));
  }
  return [join(directory, executableName)];
}

function findOnPath(executableName, env = process.env, platform = process.platform) {
  const pathValue = env.PATH ?? "";
  for (const entry of pathValue.split(delimiter)) {
    if (entry.length === 0) {
      continue;
    }
    const directory = isAbsolute(entry) ? entry : join(process.cwd(), entry);
    for (const candidate of executableCandidates(directory, executableName, env, platform)) {
      const probe = spawnSync(candidate, ["--version"], {
        encoding: "utf-8",
        stdio: "ignore",
      });
      if (probe.error === undefined) {
        return candidate;
      }
    }
  }
  return null;
}

function renderBunRequired() {
  return [
    "amadeus-setup: Bun is required to run this installer.",
    "Next action: install Bun from https://bun.sh/ or run with bunx after Bun is available.",
    "No files were modified.",
  ].join("\n");
}

function runWrapper(argv = process.argv.slice(2), env = process.env) {
  const bunPath = findOnPath("bun", env);
  if (bunPath === null) {
    process.stderr.write(`${renderBunRequired()}\n`);
    return 1;
  }

  const delegated = spawnSync(bunPath, [BUN_ENTRYPOINT, ...argv], {
    env,
    stdio: "inherit",
  });
  if (delegated.error !== undefined) {
    process.stderr.write(`${renderBunRequired()}\n`);
    return 1;
  }
  if (delegated.signal !== null) {
    process.stderr.write(`amadeus-setup: delegated Bun process exited by signal ${delegated.signal}\n`);
    return 1;
  }
  return delegated.status ?? 1;
}

process.exitCode = runWrapper();
