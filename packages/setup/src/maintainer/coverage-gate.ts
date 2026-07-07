import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectSetupCoverageEntries,
  SETUP_TEST_FILES,
} from "../../../../tests/helpers/setup/coverage.ts";

const MUST_REQUIREMENTS = [
  "FR-001",
  "FR-002",
  "FR-003",
  "FR-004",
  "FR-005",
  "FR-006",
  "FR-007",
  "FR-008",
  "FR-009",
  "FR-010",
  "FR-011",
  "FR-012",
  "FR-013",
  "FR-014",
] as const;

export const INTEGRATION_COVERAGE_KEYS = [
  "integration:clean-install",
  "integration:manifest-first-upgrade-no-write",
  "integration:collision-no-write",
  "integration:archive-retry-failure",
  "integration:kiro-ambiguity",
  "integration:plan-report-snapshot",
] as const;

const IMPLICIT_REQUIREMENT_COVERAGE: Record<string, string[]> = {
  "FR-001": ["package:@amadeus-dlc/setup", "bin:amadeus-setup"],
  "FR-002": ["installer:test-harness"],
  "FR-003": ["package:@amadeus-dlc/setup"],
  "FR-004": ["cli:amadeus-setup:install", "cli:amadeus-setup:upgrade"],
};

export type InstallerCoverageRatchet = {
  coverageKeys: string[];
  requirements: string[];
  stories: string[];
  integrationKeys: string[];
  testFiles: string[];
};

export type CoverageGateResult = {
  ok: boolean;
  scope: "installer";
  staleRequirements: string[];
  missingIntegrationKeys: string[];
  staleStories: string[];
  missingTestFiles: string[];
  decreasedCoverageKeys: string[];
  addedCoverageKeys: string[];
  entries: ReturnType<typeof collectSetupCoverageEntries>;
  ratchet: InstallerCoverageRatchet;
};

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

function parseArgs(argv: string[]): {
  registry: string;
  ratchet: string;
  scope: string;
  report?: string;
  integrationReport?: string;
} {
  const readFlag = (name: string, fallback: string): string => {
    const index = argv.indexOf(name);
    return index >= 0 ? (argv[index + 1] ?? fallback) : fallback;
  };
  return {
    registry: readFlag("--registry", "tests/.coverage-registry.json"),
    ratchet: readFlag("--ratchet", "tests/.coverage-ratchet.json"),
    scope: readFlag("--scope", "installer"),
    report: argv.includes("--report") ? readFlag("--report", "") : undefined,
    integrationReport: argv.includes("--integration-report") ? readFlag("--integration-report", "") : undefined,
  };
}

function loadInstallerRatchet(path: string): InstallerCoverageRatchet {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as { installer?: InstallerCoverageRatchet };
  if (!raw.installer) {
    throw new Error(`ratchet file ${path} is missing installer baseline`);
  }
  return raw.installer;
}

function coveredRequirements(entries: ReturnType<typeof collectSetupCoverageEntries>): Set<string> {
  const covered = new Set<string>();
  const allCovers = entries.flatMap((entry) => entry.covers);
  for (const requirement of MUST_REQUIREMENTS) {
    if (allCovers.includes(`requirements:${requirement}`)) {
      covered.add(requirement);
      continue;
    }
    const implicit = IMPLICIT_REQUIREMENT_COVERAGE[requirement] ?? [];
    if (implicit.every((key) => allCovers.includes(key))) {
      covered.add(requirement);
    }
  }
  return covered;
}

function currentCoverageKeys(entries: ReturnType<typeof collectSetupCoverageEntries>): string[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    for (const cover of entry.covers) {
      keys.add(cover);
    }
  }
  return [...keys].sort();
}

function loadIntegrationKeys(root: string, integrationReportPath?: string): string[] {
  if (!integrationReportPath) {
    return [];
  }
  const absolute = join(root, integrationReportPath);
  if (!existsSync(absolute)) {
    return [];
  }
  const report = JSON.parse(readFileSync(absolute, "utf-8")) as { coverageKeys?: string[] };
  return report.coverageKeys ?? [];
}

export function runInstallerCoverageGate(options: {
  root?: string;
  ratchetPath: string;
  integrationReportPath?: string;
}): CoverageGateResult {
  const root = options.root ?? repoRoot();
  const ratchet = loadInstallerRatchet(join(root, options.ratchetPath));
  const missingTestFiles = SETUP_TEST_FILES.filter((file) => !existsSync(join(root, file)));
  const entries = collectSetupCoverageEntries();
  const covered = coveredRequirements(entries);
  const staleRequirements = MUST_REQUIREMENTS.filter((requirement) => !covered.has(requirement));
  const currentStories = new Set(entries.flatMap((entry) => entry.stories));
  const staleStories = ratchet.stories.filter((story) => !currentStories.has(story));
  const integrationKeys = loadIntegrationKeys(root, options.integrationReportPath);
  const coverageKeys = [...new Set([...currentCoverageKeys(entries), ...integrationKeys])].sort();
  const ratchetKeysToCompare =
    options.integrationReportPath === undefined
      ? ratchet.coverageKeys.filter((key) => !key.startsWith("integration:"))
      : ratchet.coverageKeys;
  const decreasedCoverageKeys = ratchetKeysToCompare.filter((key) => !coverageKeys.includes(key));
  const addedCoverageKeys = coverageKeys.filter((key) => !ratchet.coverageKeys.includes(key));
  const missingIntegration =
    options.integrationReportPath === undefined
      ? []
      : INTEGRATION_COVERAGE_KEYS.filter((key) => !integrationKeys.includes(key));

  const ok =
    missingTestFiles.length === 0 &&
    staleRequirements.length === 0 &&
    staleStories.length === 0 &&
    decreasedCoverageKeys.length === 0 &&
    missingIntegration.length === 0 &&
    entries.every((entry) => entry.covers.length > 0);

  return {
    ok,
    scope: "installer",
    staleRequirements,
    missingIntegrationKeys: [...missingIntegration],
    staleStories,
    missingTestFiles: [...missingTestFiles],
    decreasedCoverageKeys,
    addedCoverageKeys,
    entries,
    ratchet: {
      coverageKeys,
      requirements: [...covered],
      stories: [...currentStories].sort(),
      integrationKeys,
      testFiles: [...SETUP_TEST_FILES],
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.scope !== "installer") {
    process.stderr.write(`unsupported scope: ${args.scope}\n`);
    process.exitCode = 2;
  } else {
    try {
      const result = runInstallerCoverageGate({
        ratchetPath: args.ratchet,
        integrationReportPath: args.integrationReport,
      });
      if (args.report) {
        mkdirSync(dirname(resolve(args.report)), { recursive: true });
        writeFileSync(resolve(args.report), `${JSON.stringify(result, null, 2)}\n`, "utf-8");
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.ok ? 0 : 1;
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 2;
    }
  }
}
