import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSetupPackageMetadata } from "./package-check.ts";
import { runPackageDryRun } from "./package-dry-run.ts";

export type BuildPackageResult = {
  ok: boolean;
  packageName: string;
  packageVersion: string;
  sourceTag?: string;
  fileCount: number;
  checks: Array<{ name: string; status: "passed" | "failed"; reason?: string }>;
};

export function buildSetupPackage(options: {
  root?: string;
  sourceTag?: string;
  expectedVersion?: string;
} = {}): BuildPackageResult {
  const root = options.root ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
  const setupRoot = join(root, "packages", "setup");
  const packageJson = JSON.parse(readFileSync(join(setupRoot, "package.json"), "utf-8")) as {
    name?: string;
    version?: string;
  };

  const metadata = checkSetupPackageMetadata(root);
  const dryRun = runPackageDryRun(root);

  const versionCheck =
    options.expectedVersion === undefined || packageJson.version === options.expectedVersion
      ? { status: "passed" as const }
      : { status: "failed" as const, reason: `package version ${packageJson.version} does not match expected ${options.expectedVersion}` };

  const checks = [
    {
      name: "package metadata",
      status: metadata.ok ? ("passed" as const) : ("failed" as const),
      reason: metadata.ok ? undefined : "package metadata validation failed",
    },
    {
      name: "package dry-run",
      status: dryRun.ok ? ("passed" as const) : ("failed" as const),
      reason: dryRun.ok ? undefined : "package dry-run validation failed",
    },
    {
      name: "version alignment",
      ...versionCheck,
    },
  ];

  return {
    ok: checks.every((check) => check.status === "passed"),
    packageName: packageJson.name ?? "@amadeus-dlc/setup",
    packageVersion: packageJson.version ?? "0.0.0",
    sourceTag: options.sourceTag,
    fileCount: dryRun.entries.length,
    checks,
  };
}

function parseArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const reportPath = parseArg(argv, "--report");
  const sourceTag = parseArg(argv, "--tag");
  const expectedVersion = parseArg(argv, "--expected-version");

  const result = buildSetupPackage({ sourceTag, expectedVersion });
  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
