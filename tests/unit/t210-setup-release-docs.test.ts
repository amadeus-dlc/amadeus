// covers: package:@amadeus-dlc/setup, installer:release-docs, requirements:FR-015, requirements:FR-017, stories:US-009, stories:US-011, stories:US-013

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDocsConsistencyCheck } from "../../packages/setup/src/maintainer/docs-consistency.ts";
import { buildSetupPackage } from "../../packages/setup/src/maintainer/build-package.ts";
import { generateReleaseEvidence } from "../../packages/setup/src/maintainer/release-evidence.ts";
import {
  aggregateReleasePreflight,
  buildReleaseValidationPlan,
  RELEASE_PREFLIGHT_GATE_NAMES,
} from "../../packages/setup/src/maintainer/release-preflight.ts";
import { selectReleaseTag } from "../../packages/setup/src/maintainer/release-tag-selector.ts";
import { validatePublishRequest } from "../../packages/setup/src/maintainer/publish-validate.ts";
import { verifyPostPublish } from "../../packages/setup/src/maintainer/post-publish-verify.ts";
import { GATE_REGISTRY } from "../../packages/setup/src/maintainer/gate-registry.ts";

describe("U8 release tag selector", () => {
  test("selects latest stable tag when input is empty", () => {
    const result = selectReleaseTag({
      npmDistTag: "latest",
      tags: ["v1.0.0", "v1.1.0", "1.1.0", "v2.0.0-rc.1"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sourceTag).toBe("v1.1.0");
      expect(result.value.distributionVersion).toBe("1.1.0");
      expect(result.value.explicit).toBe(false);
    }
  });

  test("requires non-latest dist-tag for prerelease publish", () => {
    const result = selectReleaseTag({
      inputTag: "v2.0.0-rc.1",
      npmDistTag: "latest",
      tags: ["v2.0.0-rc.1"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid-dist-tag");
    }
  });
});

describe("U8 release preflight plan", () => {
  test("requires all U7 gates unconditionally in release mode", () => {
    expect(RELEASE_PREFLIGHT_GATE_NAMES).toEqual([
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
    ]);
  });

  test("builds release validation plan with publish and docs steps", () => {
    const plan = buildReleaseValidationPlan(
      {
        tag: "v1.2.3",
        dryRun: true,
        npmDistTag: "latest",
        confirmPackage: "",
      },
      {
        sourceRepo: "https://github.com/amadeus-dlc/amadeus",
        sourceTag: "v1.2.3",
        distributionVersion: "1.2.3",
        explicit: true,
        prerelease: false,
        ignoredTags: [],
      },
    );

    expect(plan.preflightMode).toBe("release-unconditional");
    expect(plan.steps.map((step) => step.name)).toContain("docs-consistency");
    expect(plan.steps.map((step) => step.name)).toContain("publish-validation");
    expect(plan.steps.map((step) => step.name)).toContain("post-publish");
    expect(plan.steps.every((step) => step.required)).toBe(true);
  });

  test("aggregates release preflight without installerRelated skip", () => {
    const report = aggregateReleasePreflight({
      selectedTag: "v1.2.3",
      distributionVersion: "1.2.3",
      dryRun: true,
      gateResults: RELEASE_PREFLIGHT_GATE_NAMES.map((name) => ({
        name,
        status: "passed" as const,
        artifact: GATE_REGISTRY.find((gate) => gate.name === name)?.outputArtifact,
      })),
    });
    expect(report.mode).toBe("release");
    expect(report.ok).toBe(true);
    expect(report.gates).toHaveLength(RELEASE_PREFLIGHT_GATE_NAMES.length);
  });
});

describe("U8 publish and evidence wiring", () => {
  test("build package and evidence reports pass for current layout", () => {
    const build = buildSetupPackage();
    const evidence = generateReleaseEvidence({ includeSbom: true, includeProvenance: true });
    expect(build.ok).toBe(true);
    expect(evidence.ok).toBe(true);
    expect(evidence.sbom.components[0]?.files.length).toBeGreaterThan(0);
    expect(evidence.provenance.attestationReady).toBe(true);
  });

  test("publish validation blocks confirm_package mismatch on real publish", () => {
    const result = validatePublishRequest({
      tag: "v9.9.9",
      npmDistTag: "latest",
      confirmPackage: "wrong-package",
      dryRun: false,
      tags: ["v9.9.9"],
    });
    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.name === "confirm package")?.status).toBe("failed");
  });

  test("publish validation blocks existing npm version", () => {
    const blocked = validatePublishRequest({
      tag: "v0.0.0",
      npmDistTag: "latest",
      confirmPackage: "@amadeus-dlc/setup",
      dryRun: false,
      tags: ["v0.0.0"],
      registryManifest: { versions: { "0.0.0": { distTags: { latest: "0.0.0" } } } },
    });
    expect(blocked.versionAlreadyPublished).toBe(true);
    expect(blocked.checks.find((check) => check.name === "registry version conflict")?.status).toBe("failed");
    expect(blocked.ok).toBe(false);
  });

  test("post-publish verification accepts docs and dry-run alignment", () => {
    const result = verifyPostPublish({
      packageName: "@amadeus-dlc/setup",
      sourceTag: "v0.0.0",
      skipBunxHelp: true,
    });
    expect(result.checks.find((check) => check.name === "docs-consistency")?.status).toBe("passed");
    expect(result.checks.find((check) => check.name === "tarball-contents")?.status).toBe("passed");
  });
});

describe("U8 docs and workflow wiring", () => {
  test("docs consistency passes for repository README files", () => {
    const result = runDocsConsistencyCheck();
    expect(result.ok).toBe(true);
    expect(result.packageName).toBe("@amadeus-dlc/setup");
    expect(result.bin).toBe("amadeus-setup");
    expect(result.forbiddenHits).toEqual([]);
  });

  test("docs consistency fails when init command is documented", () => {
    const temp = mkdtempSync(join(tmpdir(), "amadeus-setup-docs-"));
    const setupDir = join(temp, "packages", "setup");
    mkdirSync(setupDir, { recursive: true });
    writeFileSync(join(temp, "README.md"), `${readFileSync(join(process.cwd(), "README.md"), "utf-8")}\namadeus-setup init\n`, "utf-8");
    writeFileSync(join(setupDir, "README.md"), readFileSync(join(process.cwd(), "packages/setup/README.md"), "utf-8"), "utf-8");
    const result = runDocsConsistencyCheck(temp);
    expect(result.ok).toBe(false);
    expect(result.forbiddenHits.length).toBeGreaterThan(0);
    rmSync(temp, { recursive: true, force: true });
  });

  test("release workflow uses workflow_dispatch and reuses U7 gate commands", () => {
    const workflowPath = join(process.cwd(), ".github/workflows/release-setup.yml");
    expect(existsSync(workflowPath)).toBe(true);
    const workflow = readFileSync(workflowPath, "utf-8");
    expect(workflow).toContain("workflow_dispatch");
    expect(workflow).toContain("release-tag-selector.ts");
    expect(workflow).toContain("package-check.ts");
    expect(workflow).toContain("package-dry-run.ts");
    expect(workflow).toContain("run-installer-smoke.ts");
    expect(workflow).toContain("run-installer-integration.ts");
    expect(workflow).toContain("coverage-gate.ts");
    expect(workflow).toContain("docs-consistency.ts");
    expect(workflow).toContain("publish-validate.ts");
    expect(workflow).toContain("npm publish --tag");
    expect(workflow).not.toMatch(/^\s*push:/m);
  });
});
