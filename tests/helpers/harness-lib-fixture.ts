import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const HARNESS_TOOL_SIBLINGS = [
  "amadeus-lib.ts",
  "amadeus-harness.ts",
  "amadeus-graph.ts",
  "amadeus-stage-schema.ts",
  "amadeus-version.ts",
] as const;

export function materializeHarnessLib(
  sourceTools: string,
  targetTools: string,
  options: {
    copyData?: boolean;
    descriptor?: { harnessDir: string; rulesSubdir: string };
  } = {},
): string {
  mkdirSync(targetTools, { recursive: true });
  for (const sibling of HARNESS_TOOL_SIBLINGS) {
    cpSync(join(sourceTools, sibling), join(targetTools, sibling));
  }
  if (options.copyData && existsSync(join(sourceTools, "data"))) {
    cpSync(join(sourceTools, "data"), join(targetTools, "data"), {
      recursive: true,
    });
  }
  if (options.descriptor) {
    mkdirSync(join(targetTools, "data"), { recursive: true });
    writeFileSync(
      join(targetTools, "data", "harness.json"),
      `${JSON.stringify(options.descriptor, null, 2)}\n`,
    );
  }
  return join(targetTools, "amadeus-lib.ts");
}

export function evalHarnessLib(
  libPath: string,
  expression: string,
  options: {
    cwd: string;
    env?: Record<string, string | undefined>;
  },
): string {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `import { detectHarnessType, harnessDir, resolveProjectDir, rulesSubdir } from ${JSON.stringify(libPath)}; console.log(${expression});`,
    ],
    {
      cwd: options.cwd,
      encoding: "utf-8",
      env: {
        ...process.env,
        AMADEUS_HARNESS_TYPE: undefined,
        AMADEUS_HARNESS_DIR: undefined,
        AMADEUS_RULES_SUBDIR: undefined,
        CLAUDECODE: undefined,
        CLAUDE_PROJECT_DIR: undefined,
        ...options.env,
      } as NodeJS.ProcessEnv,
    },
  );
  if (result.status !== 0) {
    throw new Error(`${result.stdout}\n${result.stderr}`);
  }
  return (result.stdout ?? "").trim();
}
