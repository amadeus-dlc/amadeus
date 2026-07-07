import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type InstallerChangeScope =
  | "setup-package"
  | "installer-test"
  | "installer-docs"
  | "release-workflow"
  | "package-metadata"
  | "installer-ci"
  | "source-dist"
  | "self-install";

export type InstallerChangeRule = {
  id: string;
  pattern: string;
  scope: InstallerChangeScope;
  reason: string;
};

export type InstallerChangeSet = {
  files: string[];
  installerRelated: boolean;
  scopes: InstallerChangeScope[];
  matchedRules: Array<{ file: string; ruleId: string; scope: InstallerChangeScope }>;
};

export const INSTALLER_CHANGE_RULES: InstallerChangeRule[] = [
  { id: "setup-package", pattern: "packages/setup/", scope: "setup-package", reason: "setup package source changed" },
  { id: "installer-test-unit", pattern: "tests/unit/t20", scope: "installer-test", reason: "installer unit test changed" },
  { id: "installer-test-helpers", pattern: "tests/helpers/setup/", scope: "installer-test", reason: "installer test harness changed" },
  { id: "installer-test-runner", pattern: "tests/setup/", scope: "installer-test", reason: "installer CI runner changed" },
  { id: "installer-docs", pattern: "packages/setup/README.md", scope: "installer-docs", reason: "installer package docs changed" },
  { id: "release-workflow", pattern: ".github/workflows/", scope: "release-workflow", reason: "release or CI workflow changed" },
  { id: "package-metadata-root", pattern: "package.json", scope: "package-metadata", reason: "root package metadata changed" },
  { id: "package-metadata-setup", pattern: "packages/setup/package.json", scope: "package-metadata", reason: "setup package metadata changed" },
  { id: "installer-ci-maintainer", pattern: "packages/setup/src/maintainer/", scope: "installer-ci", reason: "installer maintainer gate changed" },
  { id: "installer-security", pattern: "packages/setup/security/", scope: "installer-ci", reason: "installer security policy changed" },
  { id: "source-core", pattern: "packages/framework/core/", scope: "source-dist", reason: "distribution source changed" },
  { id: "source-harness", pattern: "packages/framework/harness/", scope: "source-dist", reason: "harness source changed" },
  { id: "source-package-script", pattern: "scripts/package.ts", scope: "source-dist", reason: "package generator changed" },
  { id: "dist-tree", pattern: "dist/", scope: "source-dist", reason: "generated distribution changed" },
  { id: "self-install-claude", pattern: ".claude/", scope: "self-install", reason: "self-installed Claude tree changed" },
  { id: "self-install-codex", pattern: ".codex/", scope: "self-install", reason: "self-installed Codex tree changed" },
  { id: "self-install-agents", pattern: ".agents/", scope: "self-install", reason: "self-installed agents tree changed" },
  { id: "self-install-claude-md", pattern: "CLAUDE.md", scope: "self-install", reason: "self-installed CLAUDE.md changed" },
];

function normalizePath(file: string): string {
  return file.replace(/\\/g, "/").replace(/^\.\//, "");
}

function matchesRule(file: string, pattern: string): boolean {
  const normalized = normalizePath(file);
  if (pattern.endsWith("/")) {
    return normalized === pattern.slice(0, -1) || normalized.startsWith(pattern);
  }
  return normalized === pattern || normalized.startsWith(`${pattern}/`) || normalized.includes(`/${pattern}`);
}

export function classifyInstallerChange(files: string[]): InstallerChangeSet {
  const normalizedFiles = files.map(normalizePath).filter(Boolean);
  const matchedRules: InstallerChangeSet["matchedRules"] = [];
  const scopes = new Set<InstallerChangeScope>();

  for (const file of normalizedFiles) {
    for (const rule of INSTALLER_CHANGE_RULES) {
      if (matchesRule(file, rule.pattern)) {
        matchedRules.push({ file, ruleId: rule.id, scope: rule.scope });
        scopes.add(rule.scope);
      }
    }
  }

  return {
    files: normalizedFiles,
    installerRelated: matchedRules.length > 0,
    scopes: [...scopes],
    matchedRules,
  };
}

export function requiresDistDriftGates(changeSet: InstallerChangeSet): boolean {
  return changeSet.scopes.some((scope) => scope === "source-dist" || scope === "self-install");
}

export function requiresSecretScan(changeSet: InstallerChangeSet): boolean {
  return changeSet.installerRelated;
}

export function writeChangeSetReport(
  changeSet: InstallerChangeSet,
  reportPath: string,
): void {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(changeSet, null, 2)}\n`, "utf-8");
}

function parseArgs(argv: string[]): { files: string[]; report?: string } {
  const files: string[] = [];
  let report: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") {
      report = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--file") {
      files.push(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (!arg.startsWith("-")) {
      files.push(arg);
    }
  }
  return { files, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files, report } = parseArgs(process.argv.slice(2));
  const changeSet = classifyInstallerChange(files);
  if (report) {
    writeChangeSetReport(changeSet, resolve(report));
  }
  process.stdout.write(`${JSON.stringify(changeSet, null, 2)}\n`);
  process.exitCode = 0;
}
