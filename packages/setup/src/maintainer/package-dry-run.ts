import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSetupPackageMetadata } from "./package-check.ts";

const FORBIDDEN_PREFIXES = [
  "amadeus/",
  ".agents/",
  ".claude/",
  ".codex/",
  "core/",
  "dist/",
  "harness/",
  "scripts/",
  "tests/",
  ".git/",
  "node_modules/",
];

const FORBIDDEN_EXACT = [
  "amadeus",
  ".agents",
  ".claude",
  ".codex",
  "core",
  "dist",
  "harness",
  "scripts",
  "tests",
  ".env",
  ".npmrc",
];

export type PackageDryRunEntry = {
  path: string;
  size: number;
};

export type PackageDryRunResult = {
  ok: boolean;
  packageName: string;
  entries: PackageDryRunEntry[];
  unexpected: string[];
  missing: string[];
  checks: Array<{ name: string; status: "passed" | "failed"; reason?: string }>;
};

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

function listPackageFiles(setupRoot: string, allowlist: string[]): string[] {
  const files: string[] = [];
  for (const entry of allowlist) {
    const target = join(setupRoot, entry);
    if (!existsSync(target)) {
      continue;
    }
    const stat = statSync(target);
    if (stat.isDirectory()) {
      collectDirectoryFiles(target, setupRoot, files);
      continue;
    }
    files.push(relative(setupRoot, target).replace(/\\/g, "/"));
  }
  return files.sort();
}

function collectDirectoryFiles(directory: string, setupRoot: string, files: string[]): void {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stat = statSync(absolute);
    const relativePath = relative(setupRoot, absolute).replace(/\\/g, "/");
    if (stat.isDirectory()) {
      collectDirectoryFiles(absolute, setupRoot, files);
      continue;
    }
    files.push(relativePath);
  }
}

function isUnexpected(path: string): string | undefined {
  for (const exact of FORBIDDEN_EXACT) {
    if (path === exact) {
      return `forbidden exact path: ${exact}`;
    }
  }
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (path.startsWith(prefix)) {
      return `forbidden prefix: ${prefix}`;
    }
  }
  if (path.includes("/..") || path.startsWith("..")) {
    return "path traversal segment";
  }
  return undefined;
}

export function runPackageDryRun(root = repoRoot()): PackageDryRunResult {
  const metadata = checkSetupPackageMetadata(root);
  const setupRoot = join(root, "packages", "setup");
  const packageJson = JSON.parse(readFileSync(join(setupRoot, "package.json"), "utf-8")) as {
    name?: string;
    files?: string[];
    bin?: Record<string, string>;
  };
  const allowlist = packageJson.files ?? [];
  const entries = listPackageFiles(setupRoot, allowlist).map((path) => ({
    path,
    size: statSync(join(setupRoot, path)).size,
  }));

  const unexpected = entries
    .map((entry) => ({ path: entry.path, reason: isUnexpected(entry.path) }))
    .filter((item): item is { path: string; reason: string } => Boolean(item.reason))
    .map((item) => `${item.path}: ${item.reason}`);

  const requiredBin = packageJson.bin?.["amadeus-setup"];
  const missing: string[] = [];
  if (!requiredBin || !existsSync(join(setupRoot, requiredBin.replace(/^\.\//, "")))) {
    missing.push(requiredBin ?? "bin/amadeus-setup.js");
  }

  const checks = [
    {
      name: "package metadata gate",
      status: metadata.ok ? ("passed" as const) : ("failed" as const),
      reason: metadata.ok ? undefined : "package metadata validation failed",
    },
    {
      name: "tarball allowlist",
      status: unexpected.length === 0 ? ("passed" as const) : ("failed" as const),
      reason: unexpected.length === 0 ? undefined : `${unexpected.length} unexpected paths`,
    },
    {
      name: "required bin entry",
      status: missing.length === 0 ? ("passed" as const) : ("failed" as const),
      reason: missing.length === 0 ? undefined : `missing ${missing.join(", ")}`,
    },
  ];

  return {
    ok: checks.every((check) => check.status === "passed"),
    packageName: packageJson.name ?? "@amadeus-dlc/setup",
    entries,
    unexpected,
    missing,
    checks,
  };
}

function parseReportArg(argv: string[]): string | undefined {
  const index = argv.indexOf("--report");
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runPackageDryRun();
  const reportPath = parseReportArg(process.argv.slice(2));
  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
