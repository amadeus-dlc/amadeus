// covers: package:@amadeus-dlc/setup, installer:ci-gates, requirements:FR-016, stories:US-010

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyInstallerChange,
  INSTALLER_CHANGE_RULES,
  requiresDistDriftGates,
  requiresSecretScan,
} from "../../packages/setup/src/maintainer/change-detector.ts";
import { runInstallerCoverageGate } from "../../packages/setup/src/maintainer/coverage-gate.ts";
import {
  buildInstallerGatePlan,
  GATE_REGISTRY,
  runInstallerGatePlan,
} from "../../packages/setup/src/maintainer/gate-planner.ts";
import { runPackageDryRun } from "../../packages/setup/src/maintainer/package-dry-run.ts";
import {
  runDependencyAuditGate,
  runSecretScanGate,
  type DependencyFindingsFile,
  type SecretFindingsFile,
} from "../../packages/setup/src/maintainer/security-gate.ts";
import { INTEGRATION_COVERAGE_KEYS } from "../setup/run-installer-integration.ts";
import { runInstallerSmoke } from "../setup/run-installer-smoke.ts";

describe("U7 installer change detector", () => {
  test("classifies setup package paths as installer-related", () => {
    const changeSet = classifyInstallerChange(["packages/setup/src/cli/reporter.ts"]);
    expect(changeSet.installerRelated).toBe(true);
    expect(changeSet.scopes).toContain("setup-package");
    expect(changeSet.matchedRules.some((rule) => rule.ruleId === "setup-package")).toBe(true);
  });

  test("classifies unrelated paths as non-installer", () => {
    const changeSet = classifyInstallerChange(["README.md", "docs/reference/11-contributing.md"]);
    expect(changeSet.installerRelated).toBe(false);
    expect(changeSet.scopes).toEqual([]);
  });

  test("flags dist and self-install drift scopes", () => {
    const changeSet = classifyInstallerChange(["core/foo.ts", ".claude/settings.json"]);
    expect(requiresDistDriftGates(changeSet)).toBe(true);
    expect(requiresSecretScan(changeSet)).toBe(true);
  });

  test("change rules remain explicit and reviewable", () => {
    expect(INSTALLER_CHANGE_RULES.length).toBeGreaterThan(10);
    expect(INSTALLER_CHANGE_RULES.every((rule) => rule.pattern.length > 0 && rule.reason.length > 0)).toBe(true);
  });
});

describe("U7 gate registry and planner", () => {
  test("registry matches concrete gate execution contract", () => {
    const names = GATE_REGISTRY.map((gate) => gate.name);
    expect(names).toContain("package-metadata");
    expect(names).toContain("package-dry-run");
    expect(names).toContain("installer-smoke");
    expect(names).toContain("installer-integration");
    expect(names).toContain("coverage-registry");
    expect(names).toContain("scanner-findings");
    expect(names).toContain("dependency-audit");
    expect(names).toContain("secret-scan");
    expect(GATE_REGISTRY.every((gate) => gate.checkName.startsWith("installer /"))).toBe(true);
  });

  test("planner skips package-specific gates for unrelated PRs", () => {
    const plan = buildInstallerGatePlan(classifyInstallerChange(["README.md"]));
    expect(plan.status).toBe("skipped");
    expect(plan.gates).toEqual([]);
    expect(plan.skipReason).toContain("not installer-related");
  });

  test("planner requires full installer gate set for setup changes", () => {
    const plan = buildInstallerGatePlan(classifyInstallerChange(["packages/setup/package.json"]));
    expect(plan.status).toBe("required");
    expect(plan.gates.map((gate) => gate.name)).toEqual([
      "package-metadata",
      "package-dry-run",
      "installer-smoke",
      "installer-integration",
      "coverage-registry",
      "typecheck",
      "lint",
      "scanner-findings",
      "dependency-audit",
      "secret-scan",
    ]);
  });

  test("planner includes drift guards when source or dist changes", () => {
    const plan = buildInstallerGatePlan(classifyInstallerChange(["core/foo.ts"]));
    expect(plan.gates.map((gate) => gate.name)).toContain("dist-check");
    expect(plan.gates.map((gate) => gate.name)).toContain("promote-self-check");
  });

  test("gate runner skips unrelated PRs from change-set report", () => {
    const report = runInstallerGatePlan(classifyInstallerChange(["README.md"]));
    expect(report.status).toBe("skipped");
    expect(report.ok).toBe(true);
    expect(report.gates).toEqual([]);
  });
});

describe("U7 package and security gates", () => {
  test("package dry-run passes for current setup package layout", () => {
    const result = runPackageDryRun();
    expect(result.ok).toBe(true);
    expect(result.unexpected).toEqual([]);
    expect(result.entries.some((entry) => entry.path === "bin/amadeus-setup.js")).toBe(true);
  });

  test("dependency audit blocks reachable High findings without allowlist", () => {
    const temp = mkdtempSync(join(tmpdir(), "amadeus-setup-security-audit-"));
    const findingsPath = join(temp, "dependency-findings.json");
    const allowlistPath = join(temp, "allowlist.json");
    writeFileSync(
      findingsPath,
      `${JSON.stringify({
        schemaVersion: 1,
        scanner: "fixture",
        generatedAt: "2026-07-07T00:00:00.000Z",
        findings: [
          {
            id: "1",
            scanner: "fixture",
            packageName: "left-pad",
            advisoryId: "GHSA-1234",
            affectedRange: "<2.0.0",
            severity: "high",
            reachable: true,
            surface: "installer-runtime",
            fingerprint: "f1",
          },
        ],
      } satisfies DependencyFindingsFile, null, 2)}\n`,
    );
    writeFileSync(allowlistPath, `${JSON.stringify({ schemaVersion: 1, entries: [] }, null, 2)}\n`);
    const result = runDependencyAuditGate(findingsPath, allowlistPath);
    expect(result.ok).toBe(false);
    expect(result.blockingFindings.length).toBe(1);
    rmSync(temp, { recursive: true, force: true });
  });

  test("dependency audit allows valid allowlist exception", () => {
    const temp = mkdtempSync(join(tmpdir(), "amadeus-setup-security-allowlist-"));
    const findingsPath = join(temp, "dependency-findings.json");
    const allowlistPath = join(temp, "allowlist.json");
    writeFileSync(
      findingsPath,
      `${JSON.stringify({
        schemaVersion: 1,
        scanner: "fixture",
        generatedAt: "2026-07-07T00:00:00.000Z",
        findings: [
          {
            id: "1",
            scanner: "fixture",
            packageName: "left-pad",
            advisoryId: "GHSA-1234",
            affectedRange: "<2.0.0",
            severity: "critical",
            reachable: true,
            surface: "installer-runtime",
            fingerprint: "f1",
          },
        ],
      } satisfies DependencyFindingsFile, null, 2)}\n`,
    );
    writeFileSync(
      allowlistPath,
      `${JSON.stringify({
        schemaVersion: 1,
        entries: [
          {
            advisoryId: "GHSA-1234",
            packageName: "left-pad",
            affectedRange: "<2.0.0",
            reason: "transitive dev-only exposure with no runtime reachability",
            owner: "maintainer",
            expiresAt: "2099-12-31",
          },
        ],
      }, null, 2)}\n`,
    );
    const result = runDependencyAuditGate(findingsPath, allowlistPath);
    expect(result.ok).toBe(true);
    expect(result.exceptions.length).toBe(1);
    rmSync(temp, { recursive: true, force: true });
  });

  test("secret scan blocks verified findings and rejects malformed schema", () => {
    const temp = mkdtempSync(join(tmpdir(), "amadeus-setup-security-secrets-"));
    const findingsPath = join(temp, "secret-findings.json");
    writeFileSync(
      findingsPath,
      `${JSON.stringify({
        schemaVersion: 1,
        scanner: "fixture",
        generatedAt: "2026-07-07T00:00:00.000Z",
        findings: [
          {
            id: "1",
            scanner: "fixture",
            verified: true,
            fingerprint: "fp1",
            path: "packages/setup/src/example.ts",
            line: 1,
            ruleId: "github-pat",
          },
        ],
      } satisfies SecretFindingsFile, null, 2)}\n`,
    );
    const blocked = runSecretScanGate(findingsPath);
    expect(blocked.ok).toBe(false);
    writeFileSync(findingsPath, `${JSON.stringify({ schemaVersion: 1, scanner: "fixture" }, null, 2)}\n`);
    const invalid = runSecretScanGate(findingsPath);
    expect(invalid.ok).toBe(false);
    expect(invalid.invalidSchema?.length).toBeGreaterThan(0);
    rmSync(temp, { recursive: true, force: true });
  });
});

describe("U7 smoke and coverage gates", () => {
  test("installer smoke runner passes repository smoke cases", () => {
    const report = runInstallerSmoke();
    expect(report.ok).toBe(true);
    expect(report.cases.every((item) => item.status === "passed")).toBe(true);
  });

  test("installer coverage gate passes current registry and ratchet", () => {
    const result = runInstallerCoverageGate({ ratchetPath: "tests/.coverage-ratchet.json" });
    expect(result.ok).toBe(true);
    expect(result.staleRequirements).toEqual([]);
    expect(result.missingTestFiles).toEqual([]);
  });

  test("integration coverage keys remain stable", () => {
    expect(INTEGRATION_COVERAGE_KEYS).toHaveLength(6);
    expect(INTEGRATION_COVERAGE_KEYS).toContain("integration:collision-no-write");
  });
});

describe("U7 CI wiring artifacts", () => {
  test("vulnerability allowlist file exists with schemaVersion", () => {
    const path = join(process.cwd(), "packages/setup/security/vulnerability-allowlist.json");
    expect(existsSync(path)).toBe(true);
    const allowlist = JSON.parse(readFileSync(path, "utf-8")) as { schemaVersion: number; entries: unknown[] };
    expect(allowlist.schemaVersion).toBe(1);
    expect(Array.isArray(allowlist.entries)).toBe(true);
  });
});
