// covers: subcommand:amadeus-utility:doctor, script:scripts/promote-self.ts
// size: medium

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  handleDoctor,
  resolveDoctorContext,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
import { managedDirs } from "../../scripts/promote-self.ts";
import { scaleTestTime } from "../lib/test-time-factor.ts";
import {
  cleanupTestProject,
  setupIntegrationProject,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STAGE_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const RULES_DIR = join(REPO_ROOT, "packages", "framework", "core", "memory");
const PROJECTED_ROOTS = managedDirs.map(({ dst }) => dst);
const DRIFT_DIAGNOSTICS = [
  "MISSING: .claude/tools/missing.ts",
  "DIFFERS: .claude/tools/amadeus-version.ts",
  "ORPHAN: .claude/tools/orphan.ts",
  "MISPLACED: .codex/skills/amadeus-fixture/SKILL.md",
] as const;
const projects: string[] = [];
const savedEnv = {
  codexHome: process.env.CODEX_HOME,
  defaultScope: process.env.AMADEUS_DEFAULT_SCOPE,
  harness: process.env.AMADEUS_HARNESS_DIR,
  lockBase: process.env.AMADEUS_LOCK_BASE_DIR,
  migration: process.env.AMADEUS_MIGRATION_DOCTOR,
  nodeEnv: process.env.NODE_ENV,
  rules: process.env.AMADEUS_RULES_DIR,
  stageGraph: process.env.AMADEUS_STAGE_GRAPH,
};

function restoreEnv(name: keyof NodeJS.ProcessEnv, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function healthyProject(): string {
  const projectDir = setupIntegrationProject({ withState: "state-mid-ideation.md" });
  projects.push(projectDir);
  return projectDir;
}

function writePromoteSelfFixture(projectDir: string, body: string): void {
  const scriptsDir = join(projectDir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(join(scriptsDir, "promote-self.ts"), body, "utf-8");
}

function strictCheckFixture(exitCode: 0 | 1, diagnostics: readonly string[] = []): string {
  return [
    'const args = process.argv.slice(2);',
    'if (args.length !== 1 || args[0] !== "--check") {',
    '  console.error("UNEXPECTED_ARGS: " + JSON.stringify(args));',
    '  process.exit(2);',
    '}',
    ...diagnostics.map((diagnostic) => `console.error(${JSON.stringify(diagnostic)});`),
    `process.exit(${exitCode});`,
  ].join("\n");
}

function repositoryCheckFixture(): string {
  const promoteSelf = join(REPO_ROOT, "scripts", "promote-self.ts");
  return [
    `const result = Bun.spawnSync(["bun", ${JSON.stringify(promoteSelf)}, ...process.argv.slice(2)], {`,
    '  stdout: "inherit",',
    '  stderr: "inherit",',
    "});",
    "process.exit(result.exitCode);",
  ].join("\n");
}

function projectionDigest(): string {
  const hash = createHash("sha256");
  const visit = (path: string): void => {
    const entries = readdirSync(path, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const absolute = join(path, entry.name);
      const repositoryRelative = relative(REPO_ROOT, absolute).split("\\").join("/");
      hash.update(repositoryRelative);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isSymbolicLink()) {
        hash.update(readlinkSync(absolute));
      } else {
        hash.update(readFileSync(absolute));
      }
    }
  };
  for (const root of PROJECTED_ROOTS) visit(join(REPO_ROOT, root));
  return hash.digest("hex");
}

/**
 * Probe the checkout's own self-install projection. The final case below drives
 * the live `promote-self --check` and therefore only holds while the projection
 * is in sync; a local `bun run build` or a plugin compose can leave it dirty
 * (#3034), which is a property of the working tree, not of doctor's contract.
 *
 * Only detected drift earns the skip. `--check` exits 1 for reasons that are
 * NOT drift as well (a usage error, a failed build, a spawn that never ran), and
 * treating those as "not in sync" would silently retire the case — so anything
 * that is neither a clean run nor a drift report is reported as a failure.
 */
type LiveProjection =
  | { kind: "clean" }
  | { kind: "drift"; report: string }
  | { kind: "unusable"; report: string };

function liveSelfInstallCheck(): LiveProjection {
  const result = spawnSync("bun", [join(REPO_ROOT, "scripts", "promote-self.ts"), "--check"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  const report = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status === 0) return { kind: "clean" };
  // The drift verdict is the one `--check` prints per problem; every other
  // nonzero exit (including a spawn that produced no status at all) is a broken
  // probe, not a dirty projection.
  const drift = result.status === 1 && /^\s*(MISSING|DIFFERS|ORPHAN|MISPLACED):/m.test(report);
  return drift ? { kind: "drift", report } : { kind: "unusable", report };
}

// Evaluated once, before registration, so the runner can show the case as
// skipped rather than as a silently returning pass.
const liveProjection: LiveProjection = liveSelfInstallCheck();

function trackedStatus(): string {
  const result = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}

beforeAll(() => {
  process.env.AMADEUS_HARNESS_DIR = ".claude";
  process.env.AMADEUS_STAGE_GRAPH = STAGE_GRAPH;
  process.env.AMADEUS_RULES_DIR = RULES_DIR;
  delete process.env.AMADEUS_DEFAULT_SCOPE;
  delete process.env.AMADEUS_LOCK_BASE_DIR;
  delete process.env.AMADEUS_MIGRATION_DOCTOR;
  delete process.env.CODEX_HOME;
  process.env.NODE_ENV = "test";
});

afterAll(() => {
  while (projects.length > 0) cleanupTestProject(projects.pop());
  restoreEnv("CODEX_HOME", savedEnv.codexHome);
  restoreEnv("AMADEUS_DEFAULT_SCOPE", savedEnv.defaultScope);
  restoreEnv("AMADEUS_HARNESS_DIR", savedEnv.harness);
  restoreEnv("AMADEUS_LOCK_BASE_DIR", savedEnv.lockBase);
  restoreEnv("AMADEUS_MIGRATION_DOCTOR", savedEnv.migration);
  restoreEnv("NODE_ENV", savedEnv.nodeEnv);
  restoreEnv("AMADEUS_RULES_DIR", savedEnv.rules);
  restoreEnv("AMADEUS_STAGE_GRAPH", savedEnv.stageGraph);
});

describe("doctor self-install projection freshness", () => {
  test("should report one passing N/A line when scripts/promote-self.ts is absent", () => {
    const projectDir = healthyProject();

    const result = handleDoctor(resolveDoctorContext(projectDir));
    const applicabilityLines = result.output
      .split("\n")
      .filter((line) => line.includes("scripts/promote-self.ts") && /N\/A|非適用/.test(line));

    expect(result.exitCode).toBe(0);
    expect(applicabilityLines).toHaveLength(1);
    expect(applicabilityLines[0]).toStartWith("✓");
  });

  test("should use build-backed --check and fail for every projection drift diagnostic", () => {
    const projectDir = healthyProject();
    writePromoteSelfFixture(projectDir, strictCheckFixture(1, DRIFT_DIAGNOSTICS));

    const result = handleDoctor(resolveDoctorContext(projectDir));

    expect(result.output).not.toContain("UNEXPECTED_ARGS");
    for (const diagnostic of DRIFT_DIAGNOSTICS) {
      expect(result.output).toContain(diagnostic);
    }
    expect(result.exitCode).toBe(1);
  });

  test("should report a failed check when the subprocess exits nonzero without drift diagnostics", () => {
    const projectDir = healthyProject();
    writePromoteSelfFixture(projectDir, strictCheckFixture(1));

    const result = handleDoctor(resolveDoctorContext(projectDir));
    const failureLine = result.output
      .split("\n")
      .find((line) =>
        line.includes("Self-install projection freshness: scripts/promote-self.ts --check failed")
      );

    expect(failureLine).toStartWith("✗");
    expect(result.exitCode).toBe(1);
  });

  test("should keep a successful build-backed check green without drift diagnostics", () => {
    const projectDir = healthyProject();
    writePromoteSelfFixture(projectDir, strictCheckFixture(0));

    const result = handleDoctor(resolveDoctorContext(projectDir));

    expect(result.exitCode).toBe(0);
    expect(result.output).not.toContain("UNEXPECTED_ARGS");
    const doctorLines = result.output
      .split("\n")
      .filter((line) => line.startsWith("✓") || line.startsWith("✗"));
    for (const prefix of ["MISSING:", "DIFFERS:", "ORPHAN:", "MISPLACED:"]) {
      expect(doctorLines.every((line) => !line.includes(prefix))).toBe(true);
    }
  });

  test.skipIf(liveProjection.kind === "drift")(
    "should detect an older projected tool generation and leave repository surfaces unchanged",
    () => {
      if (liveProjection.kind === "unusable") {
        throw new Error(
          [
            "the live promote-self --check baseline could not be established:",
            "the probe neither passed nor reported projection drift.",
            liveProjection.report,
          ].join("\n"),
        );
      }
      const projectDir = healthyProject();
      writePromoteSelfFixture(projectDir, repositoryCheckFixture());
      for (const root of PROJECTED_ROOTS) {
        expect(existsSync(join(REPO_ROOT, root, "scripts", "promote-self.ts"))).toBe(false);
      }
      const projectedTool = join(REPO_ROOT, ".claude", "tools", "amadeus-version.ts");
      const currentBytes = readFileSync(projectedTool);
      const olderBytes = Buffer.from(
        currentBytes.toString("utf-8").replace(
          /export const AMADEUS_VERSION = "\d+\.\d+\.\d+";/,
          'export const AMADEUS_VERSION = "0.0.0";',
        ),
        "utf-8",
      );
      expect(olderBytes.equals(currentBytes)).toBe(false);
      const cleanDigest = projectionDigest();
      const cleanStatus = trackedStatus();

      const cleanResult = handleDoctor(resolveDoctorContext(projectDir));
      expect(cleanResult.exitCode).toBe(0);
      for (const diagnostic of DRIFT_DIAGNOSTICS) {
        expect(cleanResult.output).not.toContain(diagnostic);
      }
      expect(projectionDigest()).toBe(cleanDigest);
      expect(trackedStatus()).toBe(cleanStatus);

      writeFileSync(projectedTool, olderBytes);
      const staleDigest = projectionDigest();
      let result: ReturnType<typeof handleDoctor>;
      let digestAfterDoctor: string;
      let statusAfterDoctor: string;
      try {
        result = handleDoctor(resolveDoctorContext(projectDir));
        digestAfterDoctor = projectionDigest();
        statusAfterDoctor = trackedStatus();
      } finally {
        writeFileSync(projectedTool, currentBytes);
      }

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("DIFFERS: .claude/tools/amadeus-version.ts");
      expect(digestAfterDoctor).toBe(staleDigest);
      expect(statusAfterDoctor).toBe(cleanStatus);
      expect(projectionDigest()).toBe(cleanDigest);
      expect(trackedStatus()).toBe(cleanStatus);
    },
    scaleTestTime(300_000),
  );
});
