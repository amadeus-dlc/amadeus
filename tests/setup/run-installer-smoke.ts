import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createTempWorkspace } from "../helpers/setup/index.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BUN_ENTRYPOINT = join(REPO_ROOT, "packages", "setup", "src", "bin", "amadeus-setup.ts");
const WRAPPER = join(REPO_ROOT, "packages", "setup", "bin", "amadeus-setup.js");

type SmokeCase = {
  id: string;
  description: string;
  run: () => { status: number | null; stdout: string; stderr: string };
};

function nodeExecutable(): string {
  const result = spawnSync("bash", ["-lc", "command -v node"], { encoding: "utf-8" });
  return result.status === 0 && result.stdout.trim().length > 0 ? result.stdout.trim() : "node";
}

const SMOKE_CASES: SmokeCase[] = [
  {
    id: "help-bun-entrypoint",
    description: "Bun entrypoint exposes install and upgrade help",
    run: () => spawnSync(process.execPath, [BUN_ENTRYPOINT, "--help"], { encoding: "utf-8" }),
  },
  {
    id: "bun-required-wrapper",
    description: "Node wrapper reports bun-required without Bun on PATH",
    run: () => {
      const emptyPath = createTempWorkspace("amadeus-setup-smoke-empty-path-");
      try {
        return spawnSync(nodeExecutable(), [WRAPPER, "--help"], {
          encoding: "utf-8",
          env: { PATH: emptyPath.root },
        });
      } finally {
        emptyPath.cleanup();
      }
    },
  },
];

export type SmokeReport = {
  ok: boolean;
  cases: Array<{
    id: string;
    description: string;
    status: "passed" | "failed";
    reason?: string;
  }>;
};

export function runInstallerSmoke(): SmokeReport {
  const cases = SMOKE_CASES.map((testCase) => {
    const result = testCase.run();
    if (testCase.id === "help-bun-entrypoint") {
      const passed = result.status === 0 && result.stdout.includes("amadeus-setup install");
      return {
        id: testCase.id,
        description: testCase.description,
        status: passed ? ("passed" as const) : ("failed" as const),
        reason: passed ? undefined : "help output missing install command",
      };
    }
    const passed = result.status === 1 && result.stderr.includes("Bun is required");
    return {
      id: testCase.id,
      description: testCase.description,
      status: passed ? ("passed" as const) : ("failed" as const),
      reason: passed ? undefined : "wrapper did not report bun-required",
    };
  });
  return {
    ok: cases.every((item) => item.status === "passed"),
    cases,
  };
}

function parseReportArg(argv: string[]): string | undefined {
  const index = argv.indexOf("--report");
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = runInstallerSmoke();
  const reportPath = parseReportArg(process.argv.slice(2));
  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}
