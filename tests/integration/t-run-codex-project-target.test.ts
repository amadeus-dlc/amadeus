import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const RUN_CODEX = join(ROOT, "scripts", "run-codex.sh");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function writeExecutable(path: string, contents: string): void {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function createFixture() {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), "amadeus-run-codex-target-")));
  tempDirs.push(fixture);
  const currentProject = join(fixture, "current");
  const targetProject = join(fixture, "target");
  const secondTarget = join(fixture, "second-target");
  const missingProject = join(fixture, "missing");
  const home = join(fixture, "home");
  const binDir = join(home, ".agents", "bin");
  for (const project of [currentProject, targetProject, secondTarget]) {
    mkdirSync(join(project, ".codex", "tools"), { recursive: true });
    writeFileSync(join(project, ".codex", "tools", "amadeus-codex-hooks.ts"), "");
  }
  mkdirSync(binDir, { recursive: true });

  writeExecutable(
    join(binDir, "bun"),
    '#!/usr/bin/env bash\nset -eu\nprintf "%s\\n" "$@" >"$RUN_CODEX_ACTIVATE_LOG"\n',
  );
  writeExecutable(
    join(binDir, "codex"),
    `#!/usr/bin/env bash
set -eu
project="$PWD"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --cd|--cwd|-C)
      if [ "$#" -gt 1 ]; then
        project="$2"
        shift 2
        continue
      fi
      ;;
    --cd=*|--cwd=*)
      project="\${1#*=}"
      shift
      continue
      ;;
  esac
  shift
done
if [ -d "$project" ]; then
  project="$(cd "$project" && pwd)"
else
  project="$PWD"
fi
printf "%s\\n" "$project" >"$RUN_CODEX_SHIM_LOG"
`,
  );

  return {
    currentProject,
    targetProject,
    secondTarget,
    missingProject,
    home,
    activateLog: join(fixture, "activate.log"),
    shimLog: join(fixture, "shim.log"),
  };
}

function launch(args: string[]) {
  const fixture = createFixture();
  const expandedArgs = args.map((arg) =>
    arg
      .replace("$TARGET", fixture.targetProject)
      .replace("$SECOND", fixture.secondTarget)
      .replace("$MISSING", fixture.missingProject),
  );
  const result = Bun.spawnSync({
    cmd: ["bash", RUN_CODEX, ...expandedArgs],
    cwd: fixture.currentProject,
    env: {
      ...process.env,
      HOME: fixture.home,
      RUN_CODEX_ACTIVATE_LOG: fixture.activateLog,
      RUN_CODEX_SHIM_LOG: fixture.shimLog,
    },
    stderr: "pipe",
    stdout: "pipe",
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return {
    activation: readFileSync(fixture.activateLog, "utf8").trim().split("\n"),
    shimProject: readFileSync(fixture.shimLog, "utf8").trim(),
    fixture,
  };
}

describe("run-codex project targeting", () => {
  const cases: Array<{
    name: string;
    args: string[];
    expected: "currentProject" | "targetProject" | "secondTarget";
  }> = [
    { name: "uses the current project without a project option", args: [], expected: "currentProject" },
    { name: "supports -C with a separate value", args: ["-C", "$TARGET"], expected: "targetProject" },
    { name: "supports --cd with a separate value", args: ["--cd", "$TARGET"], expected: "targetProject" },
    { name: "supports --cwd with a separate value", args: ["--cwd", "$TARGET"], expected: "targetProject" },
    { name: "supports --cd=value", args: ["--cd=$TARGET"], expected: "targetProject" },
    { name: "supports --cwd=value", args: ["--cwd=$TARGET"], expected: "targetProject" },
    { name: "treats -C=value as unsupported", args: ["-C=$TARGET"], expected: "currentProject" },
    { name: "falls back for a missing directory", args: ["--cd", "$MISSING"], expected: "currentProject" },
    { name: "retains the current project when -C lacks a value", args: ["-C"], expected: "currentProject" },
    { name: "retains the current project when --cd lacks a value", args: ["--cd"], expected: "currentProject" },
    { name: "retains the current project when --cwd lacks a value", args: ["--cwd"], expected: "currentProject" },
    {
      name: "uses the last valid repeated project option",
      args: ["--cd", "$TARGET", "--cwd", "$SECOND"],
      expected: "secondTarget",
    },
    {
      name: "keeps the prior target when a repeated option lacks a value",
      args: ["--cd", "$TARGET", "--cwd"],
      expected: "targetProject",
    },
    {
      name: "falls back when the last repeated target is invalid",
      args: ["--cd", "$TARGET", "--cwd", "$MISSING"],
      expected: "currentProject",
    },
    {
      name: "uses a valid target after an invalid repeated target",
      args: ["--cd", "$MISSING", "--cwd", "$TARGET"],
      expected: "targetProject",
    },
  ];

  for (const testCase of cases) {
    test(testCase.name, () => {
      const { activation, shimProject, fixture } = launch(testCase.args);
      const expectedProject = fixture[testCase.expected];
      expect(activation).toEqual([
        join(expectedProject, ".codex", "tools", "amadeus-codex-hooks.ts"),
        "activate",
        "--project-dir",
        expectedProject,
      ]);
      expect(shimProject).toBe(expectedProject);
      expect(activation[3]).toBe(shimProject);
    });
  }
});
