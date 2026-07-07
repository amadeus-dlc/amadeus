import type { InstallerChangeSet } from "./change-detector.ts";
import { requiresDistDriftGates, requiresSecretScan } from "./change-detector.ts";

export type GateName =
  | "package-metadata"
  | "package-dry-run"
  | "installer-smoke"
  | "installer-integration"
  | "coverage-registry"
  | "typecheck"
  | "lint"
  | "dist-check"
  | "promote-self-check"
  | "scanner-findings"
  | "dependency-audit"
  | "secret-scan";

export type GateCheck = {
  name: GateName;
  command: string;
  cwd: string;
  checkName: string;
  inputs: string[];
  outputArtifact?: string;
  blocking: true;
  dependsOn: GateName[];
  pathCondition: string;
  timeoutMinutes: number;
};

export const GATE_REGISTRY: GateCheck[] = [
  {
    name: "package-metadata",
    command: "bun packages/setup/src/maintainer/package-check.ts --report .amadeus-ci/setup/package-metadata.json",
    cwd: "repo root",
    checkName: "installer / package-metadata",
    inputs: ["packages/setup/package.json", "package.json"],
    outputArtifact: ".amadeus-ci/setup/package-metadata.json",
    blocking: true,
    dependsOn: [],
    pathCondition: "installer-related",
    timeoutMinutes: 2,
  },
  {
    name: "package-dry-run",
    command: "bun packages/setup/src/maintainer/package-dry-run.ts --report .amadeus-ci/setup/package-dry-run.json",
    cwd: "repo root",
    checkName: "installer / package-dry-run",
    inputs: ["packages/setup/**"],
    outputArtifact: ".amadeus-ci/setup/package-dry-run.json",
    blocking: true,
    dependsOn: ["package-metadata"],
    pathCondition: "installer-related",
    timeoutMinutes: 3,
  },
  {
    name: "installer-smoke",
    command: "bun tests/setup/run-installer-smoke.ts --report .amadeus-ci/setup/smoke.json",
    cwd: "repo root",
    checkName: "installer / smoke",
    inputs: ["packages/setup/**", "tests/helpers/setup/**"],
    outputArtifact: ".amadeus-ci/setup/smoke.json",
    blocking: true,
    dependsOn: ["package-metadata"],
    pathCondition: "installer-related",
    timeoutMinutes: 5,
  },
  {
    name: "installer-integration",
    command: "bun tests/setup/run-installer-integration.ts --report .amadeus-ci/setup/integration.json",
    cwd: "repo root",
    checkName: "installer / integration",
    inputs: ["tests/helpers/setup/**"],
    outputArtifact: ".amadeus-ci/setup/integration.json",
    blocking: true,
    dependsOn: ["package-metadata"],
    pathCondition: "installer-related",
    timeoutMinutes: 10,
  },
  {
    name: "coverage-registry",
    command:
      "bun packages/setup/src/maintainer/coverage-gate.ts --registry tests/.coverage-registry.json --ratchet tests/.coverage-ratchet.json --scope installer --integration-report .amadeus-ci/setup/integration.json --report .amadeus-ci/setup/coverage.json",
    cwd: "repo root",
    checkName: "installer / coverage-registry",
    inputs: ["tests/.coverage-registry.json", "tests/.coverage-ratchet.json"],
    outputArtifact: ".amadeus-ci/setup/coverage.json",
    blocking: true,
    dependsOn: ["installer-smoke", "installer-integration"],
    pathCondition: "installer-related",
    timeoutMinutes: 3,
  },
  {
    name: "typecheck",
    command: "bun run typecheck",
    cwd: "repo root",
    checkName: "installer / typecheck",
    inputs: ["tsconfig.json", "tsconfig.tests.json"],
    blocking: true,
    dependsOn: [],
    pathCondition: "installer-related",
    timeoutMinutes: 5,
  },
  {
    name: "lint",
    command: "bun run lint",
    cwd: "repo root",
    checkName: "installer / lint",
    inputs: ["packages/setup/", "tests/"],
    blocking: true,
    dependsOn: [],
    pathCondition: "installer-related",
    timeoutMinutes: 5,
  },
  {
    name: "dist-check",
    command: "bun run dist:check",
    cwd: "repo root",
    checkName: "installer / dist-check",
    inputs: ["packages/framework/core/**", "packages/framework/harness/**", "scripts/package.ts", "dist/**"],
    blocking: true,
    dependsOn: [],
    pathCondition: "installer-related or source/dist path changed",
    timeoutMinutes: 5,
  },
  {
    name: "promote-self-check",
    command: "bun run promote:self:check",
    cwd: "repo root",
    checkName: "installer / promote-self-check",
    inputs: ["dist/**", ".claude/**", ".codex/**", ".agents/**", "CLAUDE.md"],
    blocking: true,
    dependsOn: ["dist-check"],
    pathCondition: "installer-related or source/dist/self-install path changed",
    timeoutMinutes: 5,
  },
  {
    name: "scanner-findings",
    command: "bun packages/setup/src/maintainer/scanner-adapters.ts",
    cwd: "repo root",
    checkName: "installer / scanner-findings",
    inputs: ["packages/setup/**", ".github/workflows/**"],
    blocking: true,
    dependsOn: ["package-metadata"],
    pathCondition: "installer-related",
    timeoutMinutes: 3,
  },
  {
    name: "dependency-audit",
    command:
      "bun packages/setup/src/maintainer/security-gate.ts audit --findings .amadeus-ci/setup/dependency-findings.json --allowlist packages/setup/security/vulnerability-allowlist.json --report .amadeus-ci/setup/dependency-audit.json",
    cwd: "repo root",
    checkName: "installer / dependency-audit",
    inputs: [".amadeus-ci/setup/dependency-findings.json"],
    outputArtifact: ".amadeus-ci/setup/dependency-audit.json",
    blocking: true,
    dependsOn: ["scanner-findings"],
    pathCondition: "installer-related",
    timeoutMinutes: 5,
  },
  {
    name: "secret-scan",
    command:
      "bun packages/setup/src/maintainer/security-gate.ts secrets --findings .amadeus-ci/setup/secret-findings.json --report .amadeus-ci/setup/secret-scan.json",
    cwd: "repo root",
    checkName: "installer / secret-scan",
    inputs: [".amadeus-ci/setup/secret-findings.json"],
    outputArtifact: ".amadeus-ci/setup/secret-scan.json",
    blocking: true,
    dependsOn: ["scanner-findings"],
    pathCondition: "installer-related or workflow/config path changed",
    timeoutMinutes: 5,
  },
];

export type GatePlan = {
  changeSet: InstallerChangeSet;
  status: "required" | "skipped";
  gates: GateCheck[];
  skipReason?: string;
};

export function buildInstallerGatePlan(changeSet: InstallerChangeSet): GatePlan {
  if (!changeSet.installerRelated) {
    return {
      changeSet,
      status: "skipped",
      gates: [],
      skipReason: "PR is not installer-related; package-specific U7 gates skipped",
    };
  }

  const includeDist = requiresDistDriftGates(changeSet);
  const includeSecret = requiresSecretScan(changeSet);

  const gates = GATE_REGISTRY.filter((gate) => {
    if (gate.name === "dist-check" || gate.name === "promote-self-check") {
      return includeDist;
    }
    if (gate.name === "secret-scan") {
      return includeSecret;
    }
    return true;
  });

  return {
    changeSet,
    status: "required",
    gates,
  };
}
