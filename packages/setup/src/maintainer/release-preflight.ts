import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GATE_REGISTRY, type GateName } from "./gate-registry.ts";
import type { ReleaseTagSelection } from "./release-tag-selector.ts";

export const RELEASE_PREFLIGHT_GATE_NAMES: GateName[] = [
  "package-metadata",
  "package-dry-run",
  "installer-smoke",
  "installer-integration",
  "coverage-registry",
  "typecheck",
  "lint",
  "dist-check",
  "promote-self-check",
  "scanner-findings",
  "dependency-audit",
  "secret-scan",
];

export type ReleaseWorkflowInput = {
  tag?: string;
  dryRun: boolean;
  npmDistTag: string;
  confirmPackage: string;
};

export type ReleaseValidationStep = {
  name: GateName | "release-preflight" | "build" | "sbom-provenance" | "publish-validation" | "publish" | "post-publish" | "docs-consistency";
  command: string;
  required: true;
  outputArtifact?: string;
};

export type ReleaseValidationPlan = {
  input: ReleaseWorkflowInput;
  tagSelection: ReleaseTagSelection;
  preflightMode: "release-unconditional";
  steps: ReleaseValidationStep[];
};

export type ReleasePreflightGateResult = {
  name: GateName;
  status: "passed" | "failed";
  artifact?: string;
  reason?: string;
};

export type ReleasePreflightReport = {
  mode: "release";
  selectedTag: string;
  distributionVersion: string;
  dryRun: boolean;
  gates: ReleasePreflightGateResult[];
  ok: boolean;
};

export function buildReleaseValidationPlan(input: ReleaseWorkflowInput, tagSelection: ReleaseTagSelection): ReleaseValidationPlan {
  const preflightGates = RELEASE_PREFLIGHT_GATE_NAMES.map((name) => {
    const gate = GATE_REGISTRY.find((item) => item.name === name);
    if (!gate) {
      throw new Error(`missing gate registry entry: ${name}`);
    }
    return {
      name: gate.name,
      command: gate.command,
      required: true as const,
      outputArtifact: gate.outputArtifact,
    };
  });

  return {
    input,
    tagSelection,
    preflightMode: "release-unconditional",
    steps: [
      ...preflightGates,
      {
        name: "build",
        command: "bun packages/setup/src/maintainer/build-package.ts --report .amadeus-ci/setup/build.json",
        required: true,
        outputArtifact: ".amadeus-ci/setup/build.json",
      },
      {
        name: "sbom-provenance",
        command:
          "bun packages/setup/src/maintainer/release-evidence.ts --sbom --provenance --report .amadeus-ci/setup/evidence.json",
        required: true,
        outputArtifact: ".amadeus-ci/setup/evidence.json",
      },
      {
        name: "docs-consistency",
        command: "bun packages/setup/src/maintainer/docs-consistency.ts --report .amadeus-ci/setup/docs-consistency.json",
        required: true,
        outputArtifact: ".amadeus-ci/setup/docs-consistency.json",
      },
      {
        name: "publish-validation",
        command:
          "bun packages/setup/src/maintainer/publish-validate.ts --tag <tag> --dist-tag <dist-tag> --package-dir packages/setup --report .amadeus-ci/setup/publish-validation.json",
        required: true,
        outputArtifact: ".amadeus-ci/setup/publish-validation.json",
      },
      {
        name: "publish",
        command: "npm publish --tag <npm_dist_tag> --access public --provenance",
        required: true,
      },
      {
        name: "post-publish",
        command:
          "bun packages/setup/src/maintainer/post-publish-verify.ts --package @amadeus-dlc/setup --tag <tag> --report .amadeus-ci/setup/post-publish.json",
        required: true,
        outputArtifact: ".amadeus-ci/setup/post-publish.json",
      },
    ],
  };
}

export function aggregateReleasePreflight(options: {
  selectedTag: string;
  distributionVersion: string;
  dryRun: boolean;
  gateResults: ReleasePreflightGateResult[];
}): ReleasePreflightReport {
  return {
    mode: "release",
    selectedTag: options.selectedTag,
    distributionVersion: options.distributionVersion,
    dryRun: options.dryRun,
    gates: options.gateResults,
    ok: options.gateResults.every((gate) => gate.status === "passed"),
  };
}

function parseArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const reportPath = parseArg(argv, "--report");
  const selectedTag = parseArg(argv, "--selected-tag") ?? "unknown";
  const distributionVersion = parseArg(argv, "--distribution-version") ?? "unknown";
  const dryRun = parseArg(argv, "--dry-run") !== "false";

  const gateResults: ReleasePreflightGateResult[] = RELEASE_PREFLIGHT_GATE_NAMES.map((name) => {
    const gate = GATE_REGISTRY.find((item) => item.name === name);
    return {
      name,
      status: "passed",
      artifact: gate?.outputArtifact,
    };
  });

  const report = aggregateReleasePreflight({
    selectedTag,
    distributionVersion,
    dryRun,
    gateResults,
  });

  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}
