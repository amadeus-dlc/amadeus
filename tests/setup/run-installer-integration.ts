import { existsSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ArchiveExtractor } from "../../packages/setup/src/adapters/archive-extractor.ts";
import { runRenderedSetupCommand } from "../helpers/setup/index.ts";
import { renderPlan } from "../../packages/setup/src/cli/reporter.ts";
import { detectTarget } from "../../packages/setup/src/domain/target-detector.ts";
import { planInstall } from "../../packages/setup/src/domain/operation-planner.ts";
import { INSTALLER_MANIFEST_PATH } from "../../packages/setup/src/domain/target-types.ts";
import {
  createTempWorkspace,
  distributionFile,
  fakeArchiveSource,
  fakePromptPort,
  fakeTagSource,
  FakeTargetFiles,
  installCommand,
  loadedDistribution,
  seedCodexDistributionDir,
  seedTargetFixture,
  stablePlanSnapshot,
} from "../helpers/setup/index.ts";

export const INTEGRATION_COVERAGE_KEYS = [
  "integration:clean-install",
  "integration:manifest-first-upgrade-no-write",
  "integration:collision-no-write",
  "integration:archive-retry-failure",
  "integration:kiro-ambiguity",
  "integration:plan-report-snapshot",
] as const;

type IntegrationCase = {
  id: (typeof INTEGRATION_COVERAGE_KEYS)[number];
  description: string;
  run: () => Promise<{ passed: boolean; reason?: string }>;
};

const CASES: IntegrationCase[] = [
  {
    id: "integration:clean-install",
    description: "clean install to temp target succeeds with fake ports",
    run: async () => {
      const source = createTempWorkspace("amadeus-setup-integration-source-");
      const target = createTempWorkspace("amadeus-setup-integration-target-");
      try {
        seedCodexDistributionDir(source.root);
        const result = await runRenderedSetupCommand(
          { command: "install", harness: "codex", target: target.root, version: undefined, yes: true, force: false },
          {
            tagSource: fakeTagSource(["v1.2.3"]),
            archiveSource: fakeArchiveSource({ archivePath: source.root }),
            archiveExtractor: new ArchiveExtractor(),
          },
        );
        const passed = result.code === 0 && existsSync(join(target.root, INSTALLER_MANIFEST_PATH));
        return { passed, reason: passed ? undefined : "clean install did not complete" };
      } finally {
        source.cleanup();
        target.cleanup();
      }
    },
  },
  {
    id: "integration:manifest-first-upgrade-no-write",
    description: "manifest-first upgrade stays no-write when already current",
    run: async () => {
      const source = createTempWorkspace("amadeus-setup-integration-upgrade-source-");
      const target = createTempWorkspace("amadeus-setup-integration-upgrade-target-");
      try {
        seedCodexDistributionDir(source.root);
        seedTargetFixture(target.root, "manifest-installed", { manifestVersion: "1.2.3" });
        const result = await runRenderedSetupCommand(
          { command: "upgrade", harness: "codex", target: target.root, version: undefined, yes: true, force: false },
          {
            tagSource: fakeTagSource(["v1.2.3"]),
            archiveSource: fakeArchiveSource({ archivePath: source.root }),
            archiveExtractor: new ArchiveExtractor(),
          },
        );
        const passed = result.code === 2 && result.stderr.includes("No files were modified.");
        return { passed, reason: passed ? undefined : "upgrade no-write guarantee missing" };
      } finally {
        source.cleanup();
        target.cleanup();
      }
    },
  },
  {
    id: "integration:collision-no-write",
    description: "non-interactive collision stays no-write without force",
    run: async () => {
      const source = createTempWorkspace("amadeus-setup-integration-collision-source-");
      const target = createTempWorkspace("amadeus-setup-integration-collision-target-");
      try {
        seedCodexDistributionDir(source.root);
        seedTargetFixture(target.root, "manual-or-unknown");
        const result = await runRenderedSetupCommand(
          { command: "install", harness: "codex", target: target.root, version: undefined, yes: true, force: false },
          {
            tagSource: fakeTagSource(["v1.2.3"]),
            archiveSource: fakeArchiveSource({ archivePath: source.root }),
            archiveExtractor: new ArchiveExtractor(),
          },
        );
        const passed = result.code === 2 && result.stderr.includes("No files were modified.");
        return { passed, reason: passed ? undefined : "collision no-write guarantee missing" };
      } finally {
        source.cleanup();
        target.cleanup();
      }
    },
  },
  {
    id: "integration:archive-retry-failure",
    description: "archive fetch failure after retry leaves target untouched",
    run: async () => {
      const target = createTempWorkspace("amadeus-setup-integration-fetch-target-");
      try {
        const result = await runRenderedSetupCommand(
          { command: "install", harness: "codex", target: target.root, version: undefined, yes: true, force: false },
          {
            tagSource: fakeTagSource(["v1.2.3"]),
            archiveSource: fakeArchiveSource({ archivePath: "/tmp/missing", mode: "failure" }),
            archiveExtractor: new ArchiveExtractor(),
          },
        );
        const passed = result.code === 2 && result.stderr.includes("No files were modified.");
        return { passed, reason: passed ? undefined : "archive failure no-write guarantee missing" };
      } finally {
        target.cleanup();
      }
    },
  },
  {
    id: "integration:kiro-ambiguity",
    description: "kiro and kiro-ide ambiguity is no-write unless prompt resolves harness",
    run: async () => {
      const files = new FakeTargetFiles();
      seedTargetFixture("/tmp/unused", "ambiguous-harness");
      for (const path of [".kiro", "AGENTS.md", "amadeus"]) {
        files.addExisting(join("/tmp/target", path), path === "AGENTS.md" ? "agents" : "");
      }
      const ambiguous = await detectTarget({
        targetPath: "/tmp/target",
        requestedHarness: undefined,
        promptsAllowed: false,
        manifestReader: {
          readManifestForDetection: () => ({
            status: "absent",
            diagnostics: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
          }),
        },
        files,
      });
      const resolved = await detectTarget({
        targetPath: "/tmp/target",
        requestedHarness: undefined,
        promptsAllowed: true,
        manifestReader: {
          readManifestForDetection: () => ({
            status: "absent",
            diagnostics: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
          }),
        },
        files,
        promptPort: fakePromptPort({ chooseHarness: () => "kiro-ide" }),
      });
      const passed =
        ambiguous.ok &&
        ambiguous.detection.state === "ambiguous-harness" &&
        resolved.ok &&
        resolved.detection.state === "manual-or-unknown" &&
        resolved.detection.inferredHarness === "kiro-ide";
      return { passed, reason: passed ? undefined : "kiro ambiguity handling failed" };
    },
  },
  {
    id: "integration:plan-report-snapshot",
    description: "plan and report output stay consistent through harness snapshot helper",
    run: async () => {
      const target = "/tmp/project";
      const file = distributionFile("AGENTS.md", { content: "agents" });
      const plan = planInstall({
        command: installCommand({ target, yes: true }),
        mode: "non-interactive",
        harness: "codex",
        target,
        distribution: loadedDistribution("/tmp/source", "codex", [file]),
        metadata: [file],
        targetDetection: {
          state: "none",
          target,
          diagnostics: {
            manifestRead: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
            sentinelMatches: [],
          },
        },
        targetSnapshot: {
          target,
          detection: {
            state: "none",
            target,
            diagnostics: {
              manifestRead: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
              sentinelMatches: [],
            },
          },
          existingFiles: [],
          diagnostics: { expectedFileCount: 0, unknownMd5Count: 0, unreadableFiles: [] },
        },
        operationTimestamp: new Date("2026-07-07T12:34:56.000Z"),
        backupPathExists: () => false,
      });
      const rendered = renderPlan(plan);
      const snapshot = stablePlanSnapshot(rendered);
      const passed = snapshot.includes("| add | 1 | AGENTS.md |") && !snapshot.includes("/tmp/project");
      return { passed, reason: passed ? undefined : "plan snapshot drifted" };
    },
  },
];

export type IntegrationReport = {
  ok: boolean;
  coverageKeys: string[];
  cases: Array<{
    id: string;
    description: string;
    status: "passed" | "failed";
    reason?: string;
  }>;
};

export async function runInstallerIntegration(): Promise<IntegrationReport> {
  const cases = [];
  for (const testCase of CASES) {
    const result = await testCase.run();
    cases.push({
      id: testCase.id,
      description: testCase.description,
      status: result.passed ? ("passed" as const) : ("failed" as const),
      reason: result.reason,
    });
  }
  const coverageKeys = cases.filter((item) => item.status === "passed").map((item) => item.id);
  return {
    ok: cases.every((item) => item.status === "passed"),
    coverageKeys,
    cases,
  };
}

function parseReportArg(argv: string[]): string | undefined {
  const index = argv.indexOf("--report");
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await runInstallerIntegration();
  const reportPath = parseReportArg(process.argv.slice(2));
  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}
