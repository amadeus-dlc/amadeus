import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DependencyFindingsFile, SecretFindingsFile } from "./security-gate.ts";

const SECRET_PATTERNS: Array<{ ruleId: string; pattern: RegExp }> = [
  { ruleId: "aws-access-key", pattern: /AKIA[0-9A-Z]{16}/ },
  { ruleId: "github-pat", pattern: /ghp_[A-Za-z0-9]{20,}/ },
  { ruleId: "github-oauth", pattern: /gho_[A-Za-z0-9]{20,}/ },
  { ruleId: "private-key-header", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const SCAN_ROOTS = [
  "packages/setup",
  "tests/helpers/setup",
  "tests/setup",
  "tests/unit/t202-setup-package-shell.test.ts",
  "tests/unit/t203-setup-version-resolver.test.ts",
  "tests/unit/t204-setup-source-distribution.test.ts",
  "tests/unit/t205-setup-target-state.test.ts",
  "tests/unit/t206-setup-operation-planning.test.ts",
  "tests/unit/t207-setup-apply-verify-ux.test.ts",
  "tests/unit/t208-setup-test-harness.test.ts",
  "tests/unit/t209-setup-ci-gates.test.ts",
  "tests/unit/t210-setup-release-docs.test.ts",
];

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

function collectFiles(root: string, target: string, files: string[]): void {
  const absolute = join(root, target);
  if (!existsForScan(absolute)) {
    return;
  }
  const stat = statSync(absolute);
  if (stat.isFile()) {
    files.push(target.replace(/\\/g, "/"));
    return;
  }
  for (const entry of readdirSync(absolute)) {
    if (entry === "node_modules" || entry === ".git") {
      continue;
    }
    collectFiles(root, join(target, entry).replace(/\\/g, "/"), files);
  }
}

function existsForScan(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function scanSecrets(root: string): SecretFindingsFile {
  const files: string[] = [];
  for (const target of SCAN_ROOTS) {
    collectFiles(root, target, files);
  }
  const findings: SecretFindingsFile["findings"] = [];
  for (const file of files) {
    const content = readFileSync(join(root, file), "utf-8");
    const lines = content.split("\n");
    for (const [index, line] of lines.entries()) {
      for (const rule of SECRET_PATTERNS) {
        if (!rule.pattern.test(line)) {
          continue;
        }
        findings.push({
          id: `${rule.ruleId}:${file}:${index + 1}`,
          scanner: "builtin-regex",
          verified: !line.includes("example") && !line.includes("REDACTED"),
          fingerprint: `${rule.ruleId}:${file}:${index + 1}`,
          path: file,
          line: index + 1,
          ruleId: rule.ruleId,
        });
      }
    }
  }
  return {
    schemaVersion: 1,
    scanner: "builtin-regex",
    generatedAt: new Date().toISOString(),
    findings,
  };
}

function readPackageJson(path: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } {
  return JSON.parse(readFileSync(path, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

function scanDependencies(root: string): DependencyFindingsFile {
  const setupPackage = readPackageJson(join(root, "packages/setup/package.json"));
  const rootPackage = readPackageJson(join(root, "package.json"));
  const findings: DependencyFindingsFile["findings"] = [];

  for (const [packageName] of Object.entries(setupPackage.dependencies ?? {})) {
    findings.push({
      id: `runtime:${packageName}`,
      scanner: "package-json",
      packageName,
      advisoryId: "runtime-dependency-review-required",
      affectedRange: "*",
      severity: "medium",
      reachable: true,
      surface: "installer-runtime",
      fingerprint: `runtime:${packageName}`,
    });
  }

  for (const [packageName] of Object.entries(rootPackage.devDependencies ?? {})) {
    findings.push({
      id: `dev:${packageName}`,
      scanner: "package-json",
      packageName,
      advisoryId: "dev-dependency",
      affectedRange: "*",
      severity: "low",
      reachable: false,
      surface: "dev-only",
      fingerprint: `dev:${packageName}`,
    });
  }

  return {
    schemaVersion: 1,
    scanner: "package-json",
    generatedAt: new Date().toISOString(),
    findings,
  };
}

function parseArgs(argv: string[]): { mode?: string; dependencyOut?: string; secretOut?: string } {
  const values: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dependency-out") {
      values.dependencyOut = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--secret-out") {
      values.secretOut = argv[index + 1];
      index += 1;
      continue;
    }
    if (!arg.startsWith("-")) {
      values.mode = arg;
    }
  }
  return values;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  const dependency = scanDependencies(root);
  const secrets = scanSecrets(root);
  const dependencyOut = resolve(args.dependencyOut ?? ".amadeus-ci/setup/dependency-findings.json");
  const secretOut = resolve(args.secretOut ?? ".amadeus-ci/setup/secret-findings.json");
  mkdirSync(dirname(dependencyOut), { recursive: true });
  mkdirSync(dirname(secretOut), { recursive: true });
  writeFileSync(dependencyOut, `${JSON.stringify(dependency, null, 2)}\n`, "utf-8");
  writeFileSync(secretOut, `${JSON.stringify(secrets, null, 2)}\n`, "utf-8");
  process.stdout.write(
    `${JSON.stringify({ dependencyCount: dependency.findings.length, secretCount: secrets.findings.length }, null, 2)}\n`,
  );
}
