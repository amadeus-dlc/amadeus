import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type PackageCheck = {
  name: string;
  status: "passed" | "failed";
  reason?: string;
};

export type PackageCheckResult = {
  ok: boolean;
  checks: PackageCheck[];
};

type PackageJson = {
  name?: string;
  private?: boolean;
  license?: string;
  repository?: string | { type?: string; url?: string; directory?: string };
  bin?: string | Record<string, string>;
  files?: string[];
};

const EXPECTED_FILES = ["bin/", "src/", "README.md"];
const FORBIDDEN_FILES = ["amadeus", ".agents", ".claude", ".codex", "core", "dist", "harness", "scripts", "tests"];

function readJson(path: string): PackageJson {
  return JSON.parse(readFileSync(path, "utf-8")) as PackageJson;
}

function repositoryUrl(repository: PackageJson["repository"]): string {
  if (typeof repository === "string") {
    return repository;
  }
  return repository?.url ?? "";
}

function check(name: string, passed: boolean, reason?: string): PackageCheck {
  return passed ? { name, status: "passed" } : { name, status: "failed", reason };
}

export function checkSetupPackageMetadata(repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")): PackageCheckResult {
  const setupRoot = join(repoRoot, "packages", "setup");
  const setupPackagePath = join(setupRoot, "package.json");
  const rootPackagePath = join(repoRoot, "package.json");
  const setupPackage = readJson(setupPackagePath);
  const rootPackage = readJson(rootPackagePath);
  const files = setupPackage.files ?? [];
  const bin = typeof setupPackage.bin === "object" ? setupPackage.bin["amadeus-setup"] : undefined;
  const repository = repositoryUrl(setupPackage.repository);
  const checks: PackageCheck[] = [
    check("setup package exists under packages/setup", existsSync(setupPackagePath), "packages/setup/package.json is missing"),
    check("package name", setupPackage.name === "@amadeus-dlc/setup", "name must be @amadeus-dlc/setup"),
    check("bin exposes amadeus-setup", bin === "./bin/amadeus-setup.js", "bin.amadeus-setup must point at ./bin/amadeus-setup.js"),
    check("license metadata", setupPackage.license === "MIT OR Apache-2.0", "license must be MIT OR Apache-2.0"),
    check("repository metadata", repository.includes("amadeus-dlc/amadeus"), "repository must reference amadeus-dlc/amadeus"),
    check("files allowlist includes runtime package files", EXPECTED_FILES.every((entry) => files.includes(entry)), `files must include ${EXPECTED_FILES.join(", ")}`),
    check("files allowlist excludes workspace state", FORBIDDEN_FILES.every((entry) => !files.includes(entry) && !files.includes(`${entry}/`)), "files must not include repo workspace state or dev-only trees"),
    check("root package remains dev-only", rootPackage.private === true && rootPackage.name !== "@amadeus-dlc/setup", "root package.json must remain private and dev-only"),
    check("wrapper file exists", existsSync(join(setupRoot, "bin", "amadeus-setup.js")), "bin/amadeus-setup.js is missing"),
    check("bun entrypoint exists", existsSync(join(setupRoot, "src", "bin", "amadeus-setup.ts")), "src/bin/amadeus-setup.ts is missing"),
  ];
  return {
    ok: checks.every((item) => item.status === "passed"),
    checks,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = checkSetupPackageMetadata();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
